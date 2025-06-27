// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract QuantumTicket is ERC721URIStorage, Ownable, ReentrancyGuard {
    uint256 private _nextTokenId;
    uint256 private _nextEventId;
    
    // Fixed platform fee: 10 cents in wei (0.0001 ETH)
    uint256 public constant PLATFORM_FEE = 0.0001 ether;

    struct Event {
        uint256 eventId;
        string eventName;
        uint256 eventDate;
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
    
    event EventCreated(uint256 indexed eventId, string eventName, address indexed organizer, uint256 ticketPrice);
    event TicketMinted(address indexed to, uint256 indexed tokenId, uint256 indexed eventId);
    event TicketUsed(uint256 indexed tokenId, uint256 indexed eventId);
    event EventDeactivated(uint256 indexed eventId);
    event RefundIssued(address indexed to, uint256 amount);

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

    // Create a new event (anyone can create events)
    function createEvent(
        string memory eventName,
        uint256 eventDate,
        string memory venue,
        uint256 ticketPrice,
        uint256 maxTickets,
        string memory metadataURI
    ) public returns (uint256) {
        require(bytes(eventName).length > 0, "Event name cannot be empty");
        require(eventDate > block.timestamp, "Event date must be in the future");
        require(ticketPrice > 0, "Ticket price must be greater than 0");
        require(maxTickets > 0, "Max tickets must be greater than 0");
        require(maxTickets <= 100000, "Max tickets cannot exceed 100,000");
        
        uint256 eventId = _nextEventId++;
        
        events[eventId] = Event({
            eventId: eventId,
            eventName: eventName,
            eventDate: eventDate,
            venue: venue,
            ticketPrice: ticketPrice,
            organizer: msg.sender,
            maxTickets: maxTickets,
            ticketsSold: 0,
            isActive: true,
            metadataURI: metadataURI
        });
        
        emit EventCreated(eventId, eventName, msg.sender, ticketPrice);
        return eventId;
    }

    // Buy a ticket for an event
    function buyTicket(uint256 eventId, string memory tokenURI) 
        public 
        payable 
        validEventId(eventId) 
        nonReentrant 
        returns (uint256) 
    {
        Event storage eventData = events[eventId];
        
        require(eventData.isActive, "Event is not active");
        require(eventData.ticketsSold < eventData.maxTickets, "Event is sold out");
        require(eventData.eventDate > block.timestamp, "Event has already passed");
        
        uint256 totalRequired = eventData.ticketPrice + PLATFORM_FEE;
        require(msg.value >= totalRequired, "Insufficient payment for ticket and platform fee");
        
        // Refund excess payment (user protection priority)
        uint256 excess = msg.value - totalRequired;
        if (excess > 0) {
            payable(msg.sender).transfer(excess);
            emit RefundIssued(msg.sender, excess);
        }
        
        // Direct transfer to organizer (no separate balance tracking)
        payable(eventData.organizer).transfer(eventData.ticketPrice);
        // Platform fee stays in contract for owner withdrawal
        
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

    // Use/validate a ticket at the event
    function useTicket(uint256 tokenId) public {
        require(_ownerOf(tokenId) != address(0), "Ticket does not exist");
        require(ownerOf(tokenId) == msg.sender || getApproved(tokenId) == msg.sender, "Not ticket owner or approved");
        
        Ticket storage ticket = tickets[tokenId];
        Event storage eventData = events[ticket.eventId];
        
        require(!ticket.isUsed, "Ticket already used");
        require(block.timestamp >= eventData.eventDate, "Event has not started yet");
        
        ticket.isUsed = true;
        emit TicketUsed(tokenId, ticket.eventId);
    }
    
    // Platform owner withdraws platform fees
    function withdrawPlatformFees() public onlyOwner nonReentrant {
        uint256 balance = address(this).balance;
        require(balance > 0, "No platform fees to withdraw");
        payable(owner()).transfer(balance);
    }
    
    // Emergency function to deactivate an event
    function deactivateEvent(uint256 eventId) public validEventId(eventId) onlyEventOrganizer(eventId) {
        events[eventId].isActive = false;
        emit EventDeactivated(eventId);
    }

    // View functions
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

    // Get user's NFTs from this platform
    function getUserTickets(address user) public view returns (uint256[] memory) {
        uint256 tokenCount = balanceOf(user);
        uint256[] memory ownedTokens = new uint256[](tokenCount);
        
        uint256 currentIndex = 0;
        for (uint256 i = 0; i < _nextTokenId; i++) {
            if (_ownerOf(i) == user) {
                ownedTokens[currentIndex] = i;
                currentIndex++;
            }
        }
        
        return ownedTokens;
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
} 