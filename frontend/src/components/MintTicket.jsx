import React, { useState } from 'react';
import { useWallet } from '../hooks/useWallet';
import { useContract } from '../hooks/useContract';
import { ethers } from 'ethers';

// Helper function to get a future date (tomorrow) in ISO format
const getTomorrowDate = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(12, 0, 0, 0); // Set to noon
  return tomorrow.toISOString().slice(0, 16); // Format as YYYY-MM-DDTHH:MM
};

const MintTicket = () => {
  const { isConnected, chainId } = useWallet();
  const { contract, error: contractError } = useContract();
  
  // Event creation form data
  const [eventData, setEventData] = useState({
    eventName: '',
    eventDate: getTomorrowDate(),
    venue: '',
    ticketPrice: '0.001',
    maxTickets: '100',
    metadataURI: 'ipfs://your-metadata-uri-here'
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  
  const handleEventDataChange = (e) => {
    const { name, value } = e.target;
    setEventData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  

  
  const handleCreateEvent = async (e) => {
    e.preventDefault();
    
    if (!isConnected) {
      setError('Please connect your wallet first');
      return;
    }
    
    if (chainId !== 11155111 && chainId !== 1337) {
      setError('Please switch to the Sepolia network');
      return;
    }
    
    if (!contract) {
      setError(contractError || 'Contract not initialized');
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      const now = Math.floor(Date.now() / 1000);
      const eventDate = new Date(eventData.eventDate);
      const timestamp = Math.floor(eventDate.getTime() / 1000);
      
      if (timestamp <= now) {
        setError(`Event date must be in the future`);
        setIsLoading(false);
        return;
      }
      
      const ticketPriceInWei = ethers.utils.parseEther(eventData.ticketPrice);
      
      const tx = await contract.createEvent(
        eventData.eventName,
        timestamp,
        eventData.venue,
        ticketPriceInWei,
        parseInt(eventData.maxTickets),
        eventData.metadataURI
      );
      
      await tx.wait();
      
      setSuccess('Event created successfully!');
      setEventData({
        eventName: '',
        eventDate: getTomorrowDate(),
        venue: '',
        ticketPrice: '0.001',
        maxTickets: '100',
        metadataURI: 'ipfs://your-metadata-uri-here'
      });
      
      setTimeout(() => setSuccess(false), 5000);
    } catch (err) {
      console.error('Error creating event:', err);
      setError(err.message || 'Failed to create event');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Show connection prompt if not connected
  if (!isConnected) {
    return (
      <div className="create-event-page">
        <div className="page-container">
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">
                Create Event
              </h2>
              <p className="card-description">
                Create new events with our secure blockchain infrastructure
              </p>
            </div>
            <div className="empty-state">
              <div className="empty-state-icon">🔌</div>
              <h3 className="empty-state-title">Connect Your Wallet</h3>
              <p className="empty-state-description">
                Please connect your wallet to create events
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="create-event-page">
      <div className="page-container">
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">
              Create Event
            </h2>
            <p className="card-description">
              Create new events with our secure blockchain infrastructure
            </p>
          </div>
      
      {/* Alert Messages */}
      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}
      
      {success && (
        <div className="alert alert-success">
          {success}
        </div>
      )}
      
      {/* Create Event Form */}
      <form onSubmit={handleCreateEvent} className="form-grid">
          <div className="form-group">
            <label htmlFor="eventName" className="form-label">Event Name</label>
            <input
              type="text"
              id="eventName"
              name="eventName"
              className="form-input"
              value={eventData.eventName}
              onChange={handleEventDataChange}
              placeholder="Enter event name"
              required
              disabled={isLoading}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="eventDate" className="form-label">Event Date & Time</label>
            <input
              type="datetime-local"
              id="eventDate"
              name="eventDate"
              className="form-input"
              value={eventData.eventDate}
              onChange={handleEventDataChange}
              min={getTomorrowDate()}
              required
              disabled={isLoading}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="venue" className="form-label">Venue Location</label>
            <input
              type="text"
              id="venue"
              name="venue"
              className="form-input"
              value={eventData.venue}
              onChange={handleEventDataChange}
              placeholder="Enter venue location"
              required
              disabled={isLoading}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="ticketPrice" className="form-label">Ticket Price (ETH)</label>
            <input
              type="number"
              id="ticketPrice"
              name="ticketPrice"
              className="form-input"
              value={eventData.ticketPrice}
              onChange={handleEventDataChange}
              step="0.001"
              min="0"
              placeholder="0.001"
              required
              disabled={isLoading}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="maxTickets" className="form-label">Maximum Tickets</label>
            <input
              type="number"
              id="maxTickets"
              name="maxTickets"
              className="form-input"
              value={eventData.maxTickets}
              onChange={handleEventDataChange}
              min="1"
              max="100000"
              placeholder="100"
              required
              disabled={isLoading}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="metadataURI" className="form-label">Metadata URI</label>
            <input
              type="text"
              id="metadataURI"
              name="metadataURI"
              className="form-input"
              value={eventData.metadataURI}
              onChange={handleEventDataChange}
              placeholder="ipfs://your-metadata-uri-here"
              required
              disabled={isLoading}
            />
          </div>
          
          <button 
            type="submit" 
            className="btn btn-primary btn-lg"
            disabled={isLoading}
          >
            {isLoading ? <span className="spinner"></span> : 'Create Event'}
          </button>
        </form>
        </div>
      </div>
    </div>
  );
};

export default MintTicket;