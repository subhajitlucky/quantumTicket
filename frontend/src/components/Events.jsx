import React, { useState, useEffect } from 'react';
import { useWallet } from '../hooks/useWallet';
import { useContract } from '../hooks/useContract';
import { ethers } from 'ethers';
import QuantumTicketABI from '../contracts/QuantumTicket.json';

// Contract addresses for different networks
const CONTRACT_ADDRESSES = {
  11155111: import.meta.env.VITE_CONTRACT_ADDRESS || '0x3D08c28d26DfDa846283008E9715F07bF4871dF0', // Sepolia
  80001: import.meta.env.VITE_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000',   // Mumbai
  1337: 'localhost' // Local development
};

const Events = () => {
  const { isConnected, chainId, account } = useWallet();
  const { contract, isLoading: contractLoading, error: contractError } = useContract();
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [ticketData, setTicketData] = useState({
    tokenURI: 'ipfs://your-ticket-metadata-uri-here'
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [readOnlyContract, setReadOnlyContract] = useState(null);

  // Initialize read-only contract for fetching events without wallet
  useEffect(() => {
    const initReadOnlyContract = async () => {
      try {
        // Use a reliable public RPC endpoint directly.
        const provider = new ethers.providers.JsonRpcProvider('https://sepolia.drpc.org');
        const contractAddress = CONTRACT_ADDRESSES[11155111];

        const readContract = new ethers.Contract(
          contractAddress,
          QuantumTicketABI.abi,
          provider
        );

        // Test connection by fetching total events, which should not revert even if 0.
        await readContract.getTotalEvents();
        setReadOnlyContract(readContract);
        console.log('Read-only contract initialized successfully.');
      } catch (err) {
        console.error('Error initializing read-only contract:', err);
        setError('Unable to connect to the blockchain. Please check your connection and refresh.');
      }
    };

    initReadOnlyContract();
  }, []);

  const loadEvents = async () => {
    const contractToUse = readOnlyContract || contract;
    if (!contractToUse) {
      setError("Contract not available. Please connect your wallet or refresh the page.");
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      const totalEvents = await contractToUse.getTotalEvents();
      console.log('Total events found:', totalEvents.toString());
      
      if (totalEvents.isZero()) {
        setEvents([]);
        setIsLoading(false);
        return;
      }

      const eventPromises = [];
      for (let i = 0; i < totalEvents; i++) {
        eventPromises.push(contractToUse.getEventDetails(i));
      }
      
      const allEventDetails = await Promise.all(eventPromises);
      
      const activeEvents = allEventDetails
        .map((eventDetails, i) => ({
          id: i,
          name: eventDetails.eventName,
          date: new Date(eventDetails.eventDate.toNumber() * 1000),
          venue: eventDetails.venue,
          price: ethers.utils.formatEther(eventDetails.ticketPrice),
          soldTickets: eventDetails.ticketsSold.toNumber(),
          maxTickets: eventDetails.maxTickets.toNumber(),
          organizer: eventDetails.organizer,
          isActive: eventDetails.isActive,
        }))
        .filter(event => event.isActive);

      console.log('Loaded and filtered active events:', activeEvents);
      setEvents(activeEvents);

    } catch (err) {
      console.error('Error loading events:', err);
      setError(err.message || 'Failed to load events. The contract may not be deployed correctly or the RPC is down.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (readOnlyContract) {
      loadEvents();
    }
  }, [readOnlyContract]);

  // Reload events when wallet-connected contract changes (for real-time updates after purchase)
  useEffect(() => {
    if (contract && isConnected) {
      loadEvents();
    }
  }, [contract, isConnected]);

  const handleTicketDataChange = (e) => {
    const { name, value } = e.target;
    setTicketData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleBuyTicket = async (eventId) => {
    if (!isConnected) {
      setError('Please connect your wallet to purchase tickets');
      return;
    }

    if (chainId !== 11155111 && chainId !== 1337) {
      setError('Please switch to the Sepolia network to purchase tickets');
      return;
    }

    if (!contract) {
      setError(contractError || 'Contract not initialized. Please connect your wallet.');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const eventDetails = await contract.getEventDetails(eventId);
      const ticketPrice = eventDetails.ticketPrice;
      const platformFee = await contract.PLATFORM_FEE();
      const totalRequired = ticketPrice.add(platformFee);

      const tx = await contract.buyTicket(
        eventId,
        ticketData.tokenURI,
        { value: totalRequired }
      );

      await tx.wait();

      setSuccess('Ticket purchased successfully!');
      setSelectedEvent(null);
      setTicketData({
        tokenURI: 'ipfs://your-ticket-metadata-uri-here'
      });

      setTimeout(() => setSuccess(null), 5000);
      loadEvents(); // Refresh events
    } catch (err) {
      console.error('Error buying ticket:', err);
      setError(err.message || 'Failed to buy ticket');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (date) => {
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const isEventSoldOut = (event) => {
    return event.soldTickets >= event.maxTickets;
  };

  const isEventStarted = (event) => {
    return new Date() >= event.date;
  };

  return (
    <div className="events-page">
      <div className="page-container">
        <div className="section-header" style={{marginBottom: 'var(--space-6)'}}>
          <h2 className="section-title">
            Browse Events
          </h2>
          <p className="section-subtitle">
            Discover and purchase tickets for amazing events happening near you
            {!isConnected && (
              <span style={{ display: 'block', color: 'var(--warning-500)', fontSize: 'var(--text-sm)', marginTop: 'var(--space-2)' }}>
                Connect your wallet to purchase tickets
              </span>
            )}
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

        {/* Events List */}
        {isLoading ? (
          <div className="empty-state">
            <div className="spinner"></div>
            <h3 className="empty-state-title">Loading Events...</h3>
          </div>
        ) : events.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🎟️</div>
            <h3 className="empty-state-title">No Events Available</h3>
            <p className="empty-state-description">
              No active events are currently available. Check back later or create your own event!
            </p>
          </div>
        ) : (
          <div className="events-grid">
            {events.map(event => (
              <div key={event.id} className="event-card">
                <div className="event-image">
                  <span className="event-icon">🎫</span>
                  <div className="event-category">Live Event</div>
                </div>
                
                <div className="event-content">
                  <h3 className="event-title">{event.name}</h3>
                  <div className="event-details">
                    <div className="event-detail">
                      <span className="detail-icon">📅</span>
                      <span>{formatDate(event.date)}</span>
                    </div>
                    <div className="event-detail">
                      <span className="detail-icon">📍</span>
                      <span>{event.venue}</span>
                    </div>
                    <div className="event-detail">
                      <span className="detail-icon">💎</span>
                      <span>{event.price} ETH + 0.0001 ETH fee</span>
                    </div>
                    <div className="event-detail">
                      <span className="detail-icon">👤</span>
                      <span>By: {event.organizer.slice(0, 8)}...</span>
                    </div>
                  </div>
                  
                  <div className="event-footer">
                    <div className="tickets-left">
                      <span className="tickets-count">{event.maxTickets - event.soldTickets}</span>
                      <span className="tickets-label">tickets left</span>
                    </div>
                    
                    {isEventStarted(event) ? (
                      <span className="status-badge status-warning">Event Started</span>
                    ) : isEventSoldOut(event) ? (
                      <span className="status-badge status-used">Sold Out</span>
                    ) : !isConnected ? (
                      <button 
                        className="btn btn-secondary btn-sm"
                        onClick={() => setError('Please connect your wallet to purchase tickets')}
                      >
                        Connect Wallet
                      </button>
                    ) : (
                      <button 
                        className="btn btn-primary btn-sm"
                        onClick={() => setSelectedEvent(event)}
                      >
                        Buy Ticket
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Purchase Modal */}
        {selectedEvent && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <div className="card" style={{ 
              width: '90%', 
              maxWidth: '500px', 
              margin: 0,
              position: 'relative'
            }}>
              <div className="card-header">
                <h3 className="card-title">Purchase Ticket</h3>
                <button 
                  onClick={() => setSelectedEvent(null)}
                  style={{
                    position: 'absolute',
                    top: '1rem',
                    right: '1rem',
                    background: 'none',
                    border: 'none',
                    color: 'white',
                    fontSize: '1.5rem',
                    cursor: 'pointer'
                  }}
                >
                  ×
                </button>
              </div>

              <div className="alert alert-info">
                <strong>Event: {selectedEvent.name}</strong><br/>
                {formatDate(selectedEvent.date)}<br/>
                {selectedEvent.venue}<br/>
                {selectedEvent.price} ETH + 0.0001 ETH platform fee
              </div>

              <form onSubmit={(e) => {
                e.preventDefault();
                handleBuyTicket(selectedEvent.id);
              }} className="form-grid">
                <div className="form-group">
                  <label htmlFor="tokenURI" className="form-label">Ticket Metadata URI</label>
                  <input
                    type="text"
                    id="tokenURI"
                    name="tokenURI"
                    className="form-input"
                    value={ticketData.tokenURI}
                    onChange={handleTicketDataChange}
                    placeholder="ipfs://your-ticket-metadata-uri-here"
                    required
                    disabled={isLoading}
                  />
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button 
                    type="button"
                    onClick={() => setSelectedEvent(null)}
                    className="btn btn-secondary"
                    style={{ flex: 1 }}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="btn btn-success"
                    disabled={isLoading || !isConnected}
                    style={{ flex: 1 }}
                  >
                    {isLoading ? <span className="spinner"></span> : 'Purchase'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Events; 