// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract EventTicket is ERC721URIStorage, Ownable {
    uint256 private _nextTokenId;

    struct Ticket {
        string eventName;
        uint256 eventDate;
        string venue;
        uint256 price;
        bool isUsed;
    }

    mapping(uint256 => Ticket) public tickets;
    mapping(string => bool) public eventExists;

    event TicketMinted(address indexed to, uint256 indexed tokenId, string eventName);
    event TicketUsed(uint256 indexed tokenId);

    constructor() ERC721("EventTicket", "ETKT") Ownable(msg.sender) {}

    function mintTicket(
        address to,
        string memory eventName,
        uint256 eventDate,
        string memory venue,
        uint256 price,
        string memory uri
    ) public onlyOwner returns (uint256) {
        require(!eventExists[eventName], "Event already exists");
        require(eventDate > block.timestamp, "Event date must be in the future");
        
        uint256 tokenId = _nextTokenId++;
        
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
        
        tickets[tokenId] = Ticket({
            eventName: eventName,
            eventDate: eventDate,
            venue: venue,
            price: price,
            isUsed: false
        });
        
        eventExists[eventName] = true;
        
        emit TicketMinted(to, tokenId, eventName);
        return tokenId;
    }

    function useTicket(uint256 tokenId) public {
        require(ownerOf(tokenId) == _msgSender() || getApproved(tokenId) == _msgSender(), "Not ticket owner or approved");
        require(!tickets[tokenId].isUsed, "Ticket already used");
        require(block.timestamp >= tickets[tokenId].eventDate, "Event has not started yet");
        
        tickets[tokenId].isUsed = true;
        emit TicketUsed(tokenId);
    }

    function getTicketDetails(uint256 tokenId) public view returns (
        string memory eventName,
        uint256 eventDate,
        string memory venue,
        uint256 price,
        bool isUsed
    ) {
        require(_ownerOf(tokenId) != address(0), "Ticket does not exist");
        Ticket memory ticket = tickets[tokenId];
        return (
            ticket.eventName,
            ticket.eventDate,
            ticket.venue,
            ticket.price,
            ticket.isUsed
        );
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