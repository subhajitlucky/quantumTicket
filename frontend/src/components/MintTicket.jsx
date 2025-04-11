import React, { useState } from 'react';
import { useWallet } from '../hooks/useWallet';
import { useContract } from '../hooks/useContract';
import { ethers } from 'ethers';
import '../components.css';

// Helper function to get a future date (tomorrow) in ISO format
const getTomorrowDate = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(12, 0, 0, 0); // Set to noon
  return tomorrow.toISOString().slice(0, 16); // Format as YYYY-MM-DDTHH:MM
};

const MintTicket = () => {
  const { isConnected, chainId, account } = useWallet();
  const { contract, isLoading: contractLoading, error: contractError, isOwner, mintNewTicket } = useContract();
  
  const [formData, setFormData] = useState({
    eventName: '',
    eventDate: getTomorrowDate(),
    venue: '',
    price: '0.00001',
    uri: 'ipfs://your-metadata-uri-here' // Default URI
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Check if wallet is connected
    if (!isConnected) {
      setError('Please connect your wallet first');
      return;
    }
    
    // Check if on the correct network (Sepolia = chainId 11155111)
    if (chainId !== 11155111 && chainId !== 1337) {
      setError('Please switch to the Sepolia network');
      return;
    }
    
    // Check if contract is loaded
    if (!contract) {
      setError(contractError || 'Contract not initialized');
      return;
    }
    
    // Check if user is the contract owner
    if (!isOwner) {
      setError('Only the contract owner can mint tickets');
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Get current timestamp and convert form date to timestamp
      const now = Math.floor(Date.now() / 1000);
      const eventDate = new Date(formData.eventDate);
      const timestamp = Math.floor(eventDate.getTime() / 1000);
      
      console.log('Current time:', new Date(now * 1000).toLocaleString());
      console.log('Selected event time:', eventDate.toLocaleString());
      console.log('Current timestamp:', now);
      console.log('Event timestamp:', timestamp);
      
      // Validate that the date is in the future
      if (timestamp <= now) {
        setError(`Event date must be in the future. Current time: ${new Date(now * 1000).toLocaleString()}, Selected time: ${eventDate.toLocaleString()}`);
        setIsLoading(false);
        return;
      }
      
      // Convert price to wei
      const priceInWei = ethers.utils.parseEther(formData.price);
      
      // Mint the ticket using our helper function
      await mintNewTicket(
        formData.eventName,
        timestamp,
        formData.venue,
        priceInWei,
        formData.uri
      );
      
      setSuccess(true);
      setFormData({
        eventName: '',
        eventDate: getTomorrowDate(),
        venue: '',
        price: '0.00001',
        uri: 'ipfs://your-metadata-uri-here'
      });
      
      // Hide success message after 5 seconds
      setTimeout(() => {
        setSuccess(false);
      }, 5000);
    } catch (err) {
      console.error('Error minting ticket:', err);
      setError(err.message || 'Failed to mint ticket');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="mint-ticket">
      <h2>Mint New Ticket</h2>
      
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
      
      {success && (
        <div className="success-message">
          Ticket minted successfully!
        </div>
      )}
      
      {!isOwner && isConnected && (
        <div className="error-message">
          You are not the contract owner. Only the owner can mint tickets.
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="eventName">Event Name</label>
          <input
            type="text"
            id="eventName"
            name="eventName"
            value={formData.eventName}
            onChange={handleChange}
            required
            disabled={isLoading || !isOwner}
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="eventDate">Event Date</label>
          <input
            type="datetime-local"
            id="eventDate"
            name="eventDate"
            value={formData.eventDate}
            onChange={handleChange}
            min={getTomorrowDate()}
            required
            disabled={isLoading || !isOwner}
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="venue">Venue</label>
          <input
            type="text"
            id="venue"
            name="venue"
            value={formData.venue}
            onChange={handleChange}
            required
            disabled={isLoading || !isOwner}
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="price">Price (ETH)</label>
          <input
            type="number"
            id="price"
            name="price"
            value={formData.price}
            onChange={handleChange}
            step="0.001"
            min="0"
            required
            disabled={isLoading || !isOwner}
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="uri">Metadata URI</label>
          <input
            type="text"
            id="uri"
            name="uri"
            value={formData.uri}
            onChange={handleChange}
            placeholder="ipfs://"
            disabled={isLoading || !isOwner}
          />
          <small>Default URI is already provided.</small>
        </div>
        
        <button
          type="submit"
          disabled={isLoading || !isConnected || contractLoading || !contract || !isOwner}
        >
          {isLoading ? 'Minting...' : 'Mint Ticket'}
        </button>
      </form>
    </div>
  );
};

export default MintTicket;