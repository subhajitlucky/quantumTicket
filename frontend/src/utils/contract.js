import { ethers } from 'ethers';
import { getSigner } from './wallet';

// Contract address from environment variables
const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS;

// ABI for the EventTicket contract
const CONTRACT_ABI = [
  "function mintTicket(address to, string memory eventName, uint256 eventDate, string memory venue, uint256 price, string memory uri) public returns (uint256)",
  "function getTicketDetails(uint256 tokenId) public view returns (string memory eventName, uint256 eventDate, string memory venue, uint256 price, bool isUsed)",
  "function useTicket(uint256 tokenId) public",
  "function ownerOf(uint256 tokenId) public view returns (address)",
  "function balanceOf(address owner) public view returns (uint256)",
  "function tokenOfOwnerByIndex(address owner, uint256 index) public view returns (uint256)"
];

/**
 * Get the contract instance
 * @returns {ethers.Contract} The contract instance
 * @throws {Error} If signer is not available
 */
export const getContract = () => {
  const signer = getSigner();
  
  if (!signer) {
    throw new Error('Wallet not connected');
  }
  
  return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
};

/**
 * Mint a new ticket
 * @param {Object} ticketData The ticket data
 * @param {string} ticketData.eventName The event name
 * @param {string} ticketData.eventDate The event date (ISO string)
 * @param {string} ticketData.venue The venue
 * @param {string} ticketData.price The price in ETH
 * @param {string} ticketData.uri The metadata URI
 * @returns {Promise<Object>} The transaction receipt
 */
export const mintTicket = async (ticketData) => {
  const contract = getContract();
  const signer = getSigner();
  
  if (!signer) {
    throw new Error('Wallet not connected');
  }
  
  const { eventName, eventDate, venue, price, uri } = ticketData;
  
  // Convert date to timestamp
  const timestamp = Math.floor(new Date(eventDate).getTime() / 1000);
  
  // Convert price to wei
  const priceInWei = ethers.utils.parseEther(price.toString());
  
  // Get the signer's address
  const address = await signer.getAddress();
  
  // Call the mintTicket function
  const tx = await contract.mintTicket(
    address,
    eventName,
    timestamp,
    venue,
    priceInWei,
    uri
  );
  
  // Wait for the transaction to be mined
  const receipt = await tx.wait();
  
  return receipt;
};

/**
 * Get ticket details
 * @param {number} tokenId The token ID
 * @returns {Promise<Object>} The ticket details
 */
export const getTicketDetails = async (tokenId) => {
  const contract = getContract();
  
  const details = await contract.getTicketDetails(tokenId);
  
  return {
    eventName: details[0],
    eventDate: new Date(details[1].toNumber() * 1000).toISOString(),
    venue: details[2],
    price: ethers.utils.formatEther(details[3]),
    isUsed: details[4]
  };
};

/**
 * Use a ticket
 * @param {number} tokenId The token ID
 * @returns {Promise<Object>} The transaction receipt
 */
export const useTicket = async (tokenId) => {
  const contract = getContract();
  
  const tx = await contract.useTicket(tokenId);
  const receipt = await tx.wait();
  
  return receipt;
};

/**
 * Get all tickets owned by the connected wallet
 * @returns {Promise<Array>} An array of ticket objects
 */
export const getMyTickets = async () => {
  const contract = getContract();
  const signer = getSigner();
  
  if (!signer) {
    throw new Error('Wallet not connected');
  }
  
  // Get the signer's address
  const address = await signer.getAddress();
  
  // Get the number of tickets owned by the address
  const balance = await contract.balanceOf(address);
  const tickets = [];
  
  // Get the details of each ticket
  for (let i = 0; i < balance.toNumber(); i++) {
    const tokenId = await contract.tokenOfOwnerByIndex(address, i);
    const details = await getTicketDetails(tokenId.toNumber());
    
    tickets.push({
      tokenId: tokenId.toNumber(),
      ...details
    });
  }
  
  return tickets;
};