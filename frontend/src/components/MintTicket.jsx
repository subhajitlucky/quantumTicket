import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  const { isConnected, chainId, account } = useWallet();
  const { contract, error: contractError } = useContract();

  // Event creation form data with entryOpenTime
  const [eventData, setEventData] = useState({
    eventName: '',
    eventDate: getTomorrowDate(),
    entryOpenTime: '', // Empty = use default (2 hours before)
    venue: '',
    ticketPrice: '0.001',
    maxTickets: '100',
    metadataURI: 'ipfs://your-metadata-uri-here'
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const successTimeoutRef = useRef(null);
  const lastSeenTxRef = useRef(null);

  // Centralized success helper so confirmations are reliable
  const showSuccess = useCallback((message) => {
    setSuccess(message);
    setError(null);

    if (successTimeoutRef.current) {
      clearTimeout(successTimeoutRef.current);
    }
    successTimeoutRef.current = setTimeout(() => setSuccess(false), 5000);
  }, []);

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current);
      }
    };
  }, []);

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
      const eventTimestamp = Math.floor(eventDate.getTime() / 1000);

      if (eventTimestamp <= now) {
        setError(`Event date must be in the future`);
        setIsLoading(false);
        return;
      }

      // Calculate entryOpenTime: if not provided, pass 0 to use contract default
      let entryTimestamp = 0;
      if (eventData.entryOpenTime) {
        const entryDate = new Date(eventData.entryOpenTime);
        entryTimestamp = Math.floor(entryDate.getTime() / 1000);

        // Validate entry time is before event and in the future
        if (entryTimestamp >= eventTimestamp) {
          setError('Entry open time must be before event start');
          setIsLoading(false);
          return;
        }
        if (entryTimestamp <= now) {
          setError('Entry open time must be in the future');
          setIsLoading(false);
          return;
        }
      }

      const ticketPriceInWei = ethers.utils.parseEther(eventData.ticketPrice);

      // Updated createEvent call with entryOpenTime parameter
      const tx = await contract.createEvent(
        eventData.eventName,
        eventTimestamp,
        entryTimestamp, // 0 = use default (2 hours before event)
        eventData.venue,
        ticketPriceInWei,
        parseInt(eventData.maxTickets),
        eventData.metadataURI
      );

      await tx.wait();
      lastSeenTxRef.current = tx.hash;

      showSuccess('Event created successfully!');
      setEventData({
        eventName: '',
        eventDate: getTomorrowDate(),
        entryOpenTime: '',
        venue: '',
        ticketPrice: '0.001',
        maxTickets: '100',
        metadataURI: 'ipfs://your-metadata-uri-here'
      });

    } catch (err) {
      console.error('Error creating event:', err);
      setError(err.message || 'Failed to create event');
    } finally {
      setIsLoading(false);
    }
  };

  // Listen for EventCreated so success shows even if the form flow is interrupted
  useEffect(() => {
    if (!contract || !isConnected || !chainId || !account) return;

    const onEventCreated = (eventId, eventName, organizer, ticketPrice, event) => {
      if (!organizer || organizer.toLowerCase() !== account.toLowerCase()) {
        return;
      }

      // Avoid duplicate toast for the tx we initiated
      if (lastSeenTxRef.current && event?.transactionHash === lastSeenTxRef.current) {
        return;
      }

      showSuccess(`Event "${eventName}" created successfully! ID #${eventId.toString()}`);
    };

    contract.on('EventCreated', onEventCreated);
    return () => {
      contract.off('EventCreated', onEventCreated);
    };
  }, [account, chainId, contract, isConnected, showSuccess]);

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

            {/* New: Entry Open Time field */}
            <div className="form-group">
              <label htmlFor="entryOpenTime" className="form-label">
                Entry Opens At
                <span style={{
                  fontWeight: 'normal',
                  fontSize: '0.875em',
                  color: 'var(--text-secondary)',
                  marginLeft: '8px'
                }}>
                  (optional, defaults to 2 hours before event)
                </span>
              </label>
              <input
                type="datetime-local"
                id="entryOpenTime"
                name="entryOpenTime"
                className="form-input"
                value={eventData.entryOpenTime}
                onChange={handleEventDataChange}
                placeholder="Leave empty for default"
                disabled={isLoading}
              />
              <small style={{ color: 'var(--text-secondary)', marginTop: '4px', display: 'block' }}>
                When venue entry and ticket validation will be allowed
              </small>
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
              step="0.0001"
                min="0"
              placeholder="0.0001"
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

            {/* Info about anti-scalping */}
            <div className="alert alert-info" style={{ marginBottom: 'var(--space-4)' }}>
              <strong>📋 Event Features:</strong>
              <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
                <li>Maximum 5 tickets per wallet (anti-scalping)</li>
                <li>Tickets cannot be transferred before the event</li>
                <li>You can assign scanners to validate tickets</li>
              </ul>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={isLoading}
            >
              {isLoading ? <span className="spinner"></span> : 'Create Event'}
            </button>
            {/* Success shown immediately beneath the action for better UX feedback */}
            {success && (
              <div className="alert alert-success" style={{ marginTop: 'var(--space-3)' }}>
                {success}
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default MintTicket;