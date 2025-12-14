import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useWallet } from '../hooks/useWallet';
import { useContract } from '../hooks/useContract';
import { ethers } from 'ethers';
import { invalidateTicketCache } from '../services/ticketIndexer';
import { fetchActiveEvents, getReadOnlyContract, invalidateEventsCache } from '../services/readOnlyProvider';

const MAX_PER_WALLET = 5; // Matches contract constant

const Events = () => {
  const { isConnected, chainId, account } = useWallet();
  const { contract, error: contractError } = useContract();
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [ticketData, setTicketData] = useState({
    tokenURI: 'ipfs://your-ticket-metadata-uri-here'
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [readOnlyContract, setReadOnlyContract] = useState(null);
  const [userTicketCounts, setUserTicketCounts] = useState({}); // Track purchases per event
  const successTimeoutRef = useRef(null);
  const lastSeenTxRef = useRef(null);

  // Centralized success helper so we never miss surfacing a confirmation
  const showSuccess = useCallback((message) => {
    setSuccess(message);
    setError(null);

    if (successTimeoutRef.current) {
      clearTimeout(successTimeoutRef.current);
    }
    successTimeoutRef.current = setTimeout(() => setSuccess(null), 5000);
  }, []);

  // Clean up pending timeout when component unmounts
  useEffect(() => {
    return () => {
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current);
      }
    };
  }, []);

  // Initialize read-only contract once (shared provider)
  useEffect(() => {
    const initReadOnlyContract = async () => {
      try {
        const { contract: roContract } = getReadOnlyContract();
        setReadOnlyContract(roContract);
        console.log('Read-only contract initialized successfully.');
      } catch (err) {
        console.error('Error initializing read-only contract:', err);
        setError('Unable to connect to the blockchain. Please check your connection and refresh.');
      }
    };

    initReadOnlyContract();
  }, []);

  // Fetch user's ticket counts per event (for purchase limit display)
  const fetchUserTicketCounts = useCallback(async () => {
    if (!contract || !account || !events.length) return;

    try {
      const counts = {};
      for (const event of events) {
        const count = await contract.ticketsBought(event.id, account);
        counts[event.id] = count.toNumber();
      }
      setUserTicketCounts(counts);
    } catch (err) {
      console.warn('Error fetching ticket counts:', err);
    }
  }, [contract, account, events]);

  useEffect(() => {
    if (isConnected && contract && events.length > 0) {
      fetchUserTicketCounts();
    }
  }, [isConnected, contract, events, fetchUserTicketCounts]);

  const loadEvents = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const { events: activeEvents } = await fetchActiveEvents();

      console.log('Loaded and filtered active events:', activeEvents);
      setEvents(activeEvents);

    } catch (err) {
      console.error('Error loading events:', err);
      setError(err.message || 'Failed to load events. The contract may not be deployed correctly or the RPC is down.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (readOnlyContract) {
      loadEvents();
    }
  }, [readOnlyContract, loadEvents]);

  useEffect(() => {
    if (contract && isConnected) {
      invalidateEventsCache();
      loadEvents();
    }
  }, [contract, isConnected, loadEvents]);

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

    // Check purchase limit
    const currentCount = userTicketCounts[eventId] || 0;
    if (currentCount >= MAX_PER_WALLET) {
      setError(`You've reached the maximum of ${MAX_PER_WALLET} tickets for this event`);
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
      lastSeenTxRef.current = tx.hash;

      // Invalidate ticket cache so My Tickets updates immediately
      if (account && chainId) {
        invalidateTicketCache(account, chainId);
      }

      showSuccess('Ticket purchased successfully! View it in "My Tickets"');
      setSelectedEvent(null);
      setTicketData({
        tokenURI: 'ipfs://your-ticket-metadata-uri-here'
      });

      // Refresh events and ticket counts
      invalidateEventsCache(); // ensure next fetch pulls fresh data
      loadEvents();
      fetchUserTicketCounts();
    } catch (err) {
      console.error('Error buying ticket:', err);

      // Parse common errors
      if (err.message.includes('Purchase limit reached')) {
        setError(`Maximum ${MAX_PER_WALLET} tickets per wallet reached for this event`);
      } else if (err.message.includes('Event is sold out')) {
        setError('This event is sold out');
      } else {
        setError(err.message || 'Failed to buy ticket');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Listen for TicketMinted events so success is shown even if the UI misses the callback
  useEffect(() => {
    if (!contract || !account) return;

    const onTicketMinted = (to, tokenId, eventId, event) => {
      if (!to || to.toLowerCase() !== account.toLowerCase()) return;

      // Avoid duplicating the message for the transaction we just initiated
      if (lastSeenTxRef.current && event?.transactionHash === lastSeenTxRef.current) {
        return;
      }

      showSuccess(`Ticket minted successfully! Token #${tokenId.toString()} is ready in "My Tickets".`);

      if (account && chainId) {
        invalidateTicketCache(account, chainId);
      }
    };

    contract.on('TicketMinted', onTicketMinted);
    return () => {
      contract.off('TicketMinted', onTicketMinted);
    };
  }, [account, chainId, contract, showSuccess]);

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

  const getRemainingPurchases = (eventId) => {
    const current = userTicketCounts[eventId] || 0;
    return MAX_PER_WALLET - current;
  };

  return (
    <div className="events-page">
      <div className="page-container">
        <div className="section-header" style={{ marginBottom: 'var(--space-6)' }}>
          <h2 className="section-title">
            Browse Events
          </h2>
          <p className="section-subtitle">
            Discover and purchase tickets for amazing events
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
            {events.map(event => {
              const remaining = getRemainingPurchases(event.id);

              return (
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
                      ) : remaining <= 0 ? (
                        <span className="status-badge status-used">Limit Reached</span>
                      ) : (
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => setSelectedEvent(event)}
                        >
                          Buy Ticket
                        </button>
                      )}
                    </div>

                    {/* Purchase limit info */}
                    {isConnected && !isEventSoldOut(event) && !isEventStarted(event) && (
                      <div style={{
                        fontSize: '0.75rem',
                        color: 'var(--text-secondary)',
                        marginTop: 'var(--space-2)',
                        textAlign: 'right'
                      }}>
                        {remaining > 0
                          ? `You can buy ${remaining} more`
                          : 'Purchase limit reached'}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
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
                <strong>Event: {selectedEvent.name}</strong><br />
                {formatDate(selectedEvent.date)}<br />
                {selectedEvent.venue}<br />
                {selectedEvent.price} ETH + 0.0001 ETH platform fee
              </div>

              {/* Anti-scalping notice */}
              <div style={{
                fontSize: '0.875rem',
                color: 'var(--text-secondary)',
                marginBottom: 'var(--space-4)'
              }}>
                📋 Max {MAX_PER_WALLET} tickets per wallet • Tickets locked until after event
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