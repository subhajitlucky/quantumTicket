// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title QuantumTicket
 * @dev NFT-based event ticketing platform with security enhancements
 * 
 * Security Features:
 * - Pull payment pattern for organizer withdrawals (prevents transfer failures)
 * - Scanner role for ticket validation at events
 * - Per-wallet purchase limits (anti-scalping)
 * - Transfer locks before event date (anti-scalping)
 * - Emergency pause functionality
 * - Refund mechanism for cancelled events
 */
contract QuantumTicket is ERC721URIStorage, Ownable, ReentrancyGuard, Pausable {
    uint256 private _nextTokenId;
    uint256 private _nextEventId;
    
    // Fixed platform fee: 10 cents in wei (0.0001 ETH)
    uint256 public constant PLATFORM_FEE = 0.0001 ether;
    
    // Anti-scalping: max tickets per wallet per event
    uint256 public constant MAX_PER_WALLET = 5;

    // Ticket validation stays open this long after the event start time
    uint256 public constant VALIDATION_WINDOW = 24 hours;

    struct Event {
        uint256 eventId;
        string eventName;
        uint256 eventDate;
        uint256 entryOpenTime;  // When entry/scanning can begin
        string venue;
        uint256 ticketPrice;
        address organizer;
        uint256 maxTickets;
        uint256 ticketsSold;
        bool isActive;
        string metadataURI;
    }
    
    struct Ticket {
        uint256 eventId;
        bool isUsed;
    }

    mapping(uint256 => Event) public events;
    mapping(uint256 => Ticket) public tickets;
    
    // Pull payment: organizer balances (Issue #1)
    mapping(address => uint256) public organizerBalances;
    
    // Per-event escrow: ticket sales stay locked until the event date,
    // so pre-event refunds are always funded.
    mapping(uint256 => uint256) public eventEscrow;
    mapping(address => uint256[]) private _organizerEventIds;
    
    // Platform fees are tracked separately from organizer escrow
    uint256 public platformFeeBalance;
    
    // Scanner role per event (Issue #2)
    mapping(uint256 => mapping(address => bool)) public scanners;
    
    // Anti-scalping: tickets bought per wallet per event (Issue #4)
    mapping(uint256 => mapping(address => uint256)) public ticketsBought;
    
    event EventCreated(uint256 indexed eventId, string eventName, address indexed organizer, uint256 ticketPrice);
    event TicketMinted(address indexed to, uint256 indexed tokenId, uint256 indexed eventId);
    event TicketUsed(uint256 indexed tokenId, uint256 indexed eventId);
    event EventDeactivated(uint256 indexed eventId);
    event RefundIssued(address indexed to, uint256 amount);
    event ScannerUpdated(uint256 indexed eventId, address indexed scanner, bool allowed);
    event OrganizerWithdrawal(address indexed organizer, uint256 amount);
    event PlatformWithdrawal(address indexed owner, uint256 amount);

    constructor() ERC721("QuantumTicket", "QTKT") Ownable(msg.sender) {
        // Simplified quantum ticketing platform
    }
    
    modifier validEventId(uint256 eventId) {
        require(eventId < _nextEventId, "Event does not exist");
        _;
    }
    
    modifier onlyEventOrganizer(uint256 eventId) {
        require(events[eventId].organizer == msg.sender, "Not event organizer");
        _;
    }

    // ============ Emergency Controls (Issue #9) ============
    
    function pause() external onlyOwner {
        _pause();
    }
    
    function unpause() external onlyOwner {
        _unpause();
    }

    // ============ Event Management ============

    /**
     * @dev Create a new event (anyone can create events)
     * @param eventName Name of the event
     * @param eventDate Unix timestamp of event start
     * @param entryOpenTime Unix timestamp when entry opens (0 = 2 hours before event)
     * @param venue Event venue
     * @param ticketPrice Price per ticket in wei
     * @param maxTickets Maximum number of tickets
     * @param metadataURI IPFS URI for event metadata
     */
    function createEvent(
        string memory eventName,
        uint256 eventDate,
        uint256 entryOpenTime,
        string memory venue,
        uint256 ticketPrice,
        uint256 maxTickets,
        string memory metadataURI
    ) public whenNotPaused returns (uint256) {
        require(bytes(eventName).length > 0, "Event name cannot be empty");
        require(eventDate > block.timestamp, "Event date must be in the future");
        require(ticketPrice > 0, "Ticket price must be greater than 0");
        require(maxTickets > 0, "Max tickets must be greater than 0");
        require(maxTickets <= 100000, "Max tickets cannot exceed 100,000");
        
        // Default entry time: 2 hours before event
        uint256 finalEntryTime = entryOpenTime;
        if (entryOpenTime == 0 || entryOpenTime >= eventDate) {
            require(
                eventDate >= block.timestamp + 2 hours,
                "Event must start at least 2 hours from now"
            );
            finalEntryTime = eventDate - 2 hours;
        }
        require(finalEntryTime > block.timestamp, "Entry time must be in the future");
        
        uint256 eventId = _nextEventId++;
        
        events[eventId] = Event({
            eventId: eventId,
            eventName: eventName,
            eventDate: eventDate,
            entryOpenTime: finalEntryTime,
            venue: venue,
            ticketPrice: ticketPrice,
            organizer: msg.sender,
            maxTickets: maxTickets,
            ticketsSold: 0,
            isActive: true,
            metadataURI: metadataURI
        });
        _organizerEventIds[msg.sender].push(eventId);
        
        emit EventCreated(eventId, eventName, msg.sender, ticketPrice);
        return eventId;
    }

    // ============ Scanner Management (Issue #2) ============

    /**
     * @dev Set scanner authorization for an event
     * @param eventId Event ID
     * @param scanner Address of the scanner
     * @param allowed Whether the scanner is allowed to validate tickets
     */
    function setScanner(
        uint256 eventId,
        address scanner,
        bool allowed
    ) external validEventId(eventId) onlyEventOrganizer(eventId) {
        scanners[eventId][scanner] = allowed;
        emit ScannerUpdated(eventId, scanner, allowed);
    }

    // ============ Ticket Purchase ============

    /**
     * @dev Buy a ticket for an event
     * @param eventId Event ID
     * @param tokenURI IPFS URI for ticket metadata
     */
    function buyTicket(uint256 eventId, string memory tokenURI) 
        public 
        payable 
        validEventId(eventId) 
        nonReentrant 
        whenNotPaused
        returns (uint256) 
    {
        Event storage eventData = events[eventId];
        
        require(eventData.isActive, "Event is not active");
        require(eventData.ticketsSold < eventData.maxTickets, "Event is sold out");
        require(eventData.eventDate > block.timestamp, "Event has already passed");
        
        // Anti-scalping: enforce per-wallet limit (Issue #4)
        require(
            ticketsBought[eventId][msg.sender] < MAX_PER_WALLET,
            "Purchase limit reached"
        );
        
        uint256 totalRequired = eventData.ticketPrice + PLATFORM_FEE;
        require(msg.value >= totalRequired, "Insufficient payment for ticket and platform fee");
        
        // Refund excess payment (user protection priority)
        uint256 excess = msg.value - totalRequired;
        if (excess > 0) {
            (bool refundOk,) = msg.sender.call{value: excess}("");
            require(refundOk, "Excess refund failed");
            emit RefundIssued(msg.sender, excess);
        }
        
        // Pull payment: accumulate balance for later withdrawal (Issue #1).
        // Funds stay escrowed per event until the event date passes, so
        // pre-event refunds are always funded.
        organizerBalances[eventData.organizer] += eventData.ticketPrice;
        eventEscrow[eventId] += eventData.ticketPrice;
        // Platform fee is tracked separately so the owner can never withdraw
        // organizer escrow.
        platformFeeBalance += PLATFORM_FEE;
        
        // Update anti-scalping counter
        ticketsBought[eventId][msg.sender]++;
        
        // Mint the ticket
        uint256 tokenId = _nextTokenId++;
        
        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, tokenURI);
        
        tickets[tokenId] = Ticket({
            eventId: eventId,
            isUsed: false
        });
        
        eventData.ticketsSold++;
        
        emit TicketMinted(msg.sender, tokenId, eventId);
        return tokenId;
    }

    // ============ Ticket Validation (Issues #2, #10) ============

    /**
     * @dev Use/validate a ticket at the event
     * @param tokenId Token ID of the ticket
     * 
     * Can be called by:
     * - Ticket owner
     * - Authorized scanner for the event
     */
    function useTicket(uint256 tokenId) public whenNotPaused {
        require(_ownerOf(tokenId) != address(0), "Ticket does not exist");
        
        Ticket storage ticket = tickets[tokenId];
        Event storage eventData = events[ticket.eventId];
        
        // Authorization: owner or scanner (Issue #2)
        require(
            ownerOf(tokenId) == msg.sender || scanners[ticket.eventId][msg.sender],
            "Not ticket owner or scanner"
        );
        
        require(!ticket.isUsed, "Ticket already used");
        
        // Use entryOpenTime instead of eventDate (Issue #10)
        require(block.timestamp >= eventData.entryOpenTime, "Entry not yet open");
        require(
            block.timestamp <= eventData.eventDate + VALIDATION_WINDOW,
            "Validation window closed"
        );
        
        ticket.isUsed = true;
        emit TicketUsed(tokenId, ticket.eventId);
    }

    // ============ Organizer Withdrawal (Issue #1) ============

    /**
     * @dev Total organizer funds that can be withdrawn right now.
     * Ticket sales unlock per event once the event date has passed.
     */
    function getWithdrawableOrganizerFunds(address organizer) public view returns (uint256 total) {
        uint256[] storage eventIds = _organizerEventIds[organizer];
        for (uint256 i = 0; i < eventIds.length; i++) {
            uint256 eventId = eventIds[i];
            if (events[eventId].eventDate < block.timestamp) {
                total += eventEscrow[eventId];
            }
        }
    }

    /**
     * @dev Organizer withdraws ticket sales from events that have already started.
     * Pre-event funds stay escrowed so refunds cannot be drained.
     */
    function withdrawOrganizerFunds() external nonReentrant {
        uint256 total;
        uint256[] storage eventIds = _organizerEventIds[msg.sender];

        for (uint256 i = 0; i < eventIds.length; i++) {
            uint256 eventId = eventIds[i];
            if (events[eventId].eventDate < block.timestamp && eventEscrow[eventId] > 0) {
                total += eventEscrow[eventId];
                eventEscrow[eventId] = 0;
            }
        }

        require(total > 0, "Nothing to withdraw");
        
        organizerBalances[msg.sender] -= total;
        
        (bool ok,) = msg.sender.call{value: total}("");
        require(ok, "Withdraw failed");
        
        emit OrganizerWithdrawal(msg.sender, total);
    }
    
    // ============ Platform Fee Withdrawal (Issue #8) ============

    /**
     * @dev Platform owner withdraws only the accumulated platform fees.
     * Organizer escrow is never touched.
     */
    function withdrawPlatformFees() public onlyOwner nonReentrant {
        uint256 amount = platformFeeBalance;
        require(amount > 0, "No platform fees to withdraw");
        
        platformFeeBalance = 0;
        
        // Safe withdrawal using call (Issue #8)
        (bool ok,) = owner().call{value: amount}("");
        require(ok, "Platform withdrawal failed");
        
        emit PlatformWithdrawal(owner(), amount);
    }

    // ============ Refund Mechanism (Issue #7) ============

    /**
     * @dev Refund a ticket (organizer only, for cancelled events)
     * @param tokenId Token ID to refund
     */
    function refundTicket(uint256 tokenId)
        external
        nonReentrant
    {
        require(_ownerOf(tokenId) != address(0), "Ticket does not exist");
        
        Ticket storage ticket = tickets[tokenId];
        uint256 eventId = ticket.eventId;
        Event storage eventData = events[eventId];
        
        require(eventData.organizer == msg.sender, "Not event organizer");
        require(!ticket.isUsed, "Ticket already used");
        require(block.timestamp < eventData.eventDate, "Refunds closed after event");
        
        address ticketOwner = ownerOf(tokenId);
        uint256 price = eventData.ticketPrice;
        
        // Refunds are paid from this event's escrow, which cannot be
        // withdrawn until the event date passes.
        require(eventEscrow[eventId] >= price, "Refund escrow unavailable");
        eventEscrow[eventId] -= price;
        organizerBalances[msg.sender] -= price;
        
        // Decrease tickets sold counter
        eventData.ticketsSold--;
        
        // Burn the ticket
        _burn(tokenId);
        delete tickets[tokenId];
        
        // Send refund to ticket owner
        (bool ok,) = ticketOwner.call{value: price}("");
        require(ok, "Refund failed");
        
        emit RefundIssued(ticketOwner, price);
    }
    
    // ============ Event Management ============

    /**
     * @dev Emergency function to deactivate an event
     */
    function deactivateEvent(uint256 eventId) public validEventId(eventId) onlyEventOrganizer(eventId) {
        events[eventId].isActive = false;
        emit EventDeactivated(eventId);
    }

    // ============ Transfer Lock (Issue #5 - Option B) ============

    /**
     * @dev Override _update to implement transfer lock before event
     * Transfers are blocked until after the event date to prevent scalping
     */
    function _update(address to, uint256 tokenId, address auth)
        internal
        override
        returns (address)
    {
        address from = _ownerOf(tokenId);
        
        // Allow minting (from == 0) and burning (to == 0)
        if (from != address(0) && to != address(0)) {
            // Block transfers before event
            uint256 eventId = tickets[tokenId].eventId;
            require(
                block.timestamp > events[eventId].eventDate,
                "Transfers disabled before event"
            );
        }
        
        return super._update(to, tokenId, auth);
    }

    // ============ View Functions ============

    function getEventDetails(uint256 eventId) public view validEventId(eventId) returns (Event memory) {
        return events[eventId];
    }

    function getTicketDetails(uint256 tokenId) public view returns (
        uint256 eventId,
        bool isUsed,
        Event memory eventDetails
    ) {
        require(_ownerOf(tokenId) != address(0), "Ticket does not exist");
        Ticket memory ticket = tickets[tokenId];
        Event memory eventData = events[ticket.eventId];
        
        return (
            ticket.eventId,
            ticket.isUsed,
            eventData
        );
    }
    
    function getTotalEvents() public view returns (uint256) {
        return _nextEventId;
    }
    
    function getTotalTickets() public view returns (uint256) {
        return _nextTokenId;
    }
    
    // getUserTickets() removed (Issue #6 - Option B)
    // Use The Graph / indexer for off-chain queries

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}