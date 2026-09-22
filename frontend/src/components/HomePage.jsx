import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useContract } from '../hooks/useContract';
import { fetchActiveEvents, getReadOnlyContract, invalidateEventsCache } from '../services/readOnlyProvider';

const HomePage = () => {
  const navigate = useNavigate();
  const { contract } = useContract();
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [readOnlyContract, setReadOnlyContract] = useState(null);
  const [stats, setStats] = useState({ events: null, tickets: null, active: null });

  const platformStats = [
    { number: stats.events ?? '—', label: "Events Created", icon: "🎫" },
    { number: stats.tickets ?? '—', label: "Tickets Minted", icon: "🎟️" },
    { number: stats.active ?? '—', label: "Active Events", icon: "📅" },
    { number: "Sepolia", label: "Testnet", icon: "⚡" }
  ];

  // Initialize read-only contract once
  useEffect(() => {
    const initReadOnlyContract = async () => {
      try {
        const { contract: roContract } = getReadOnlyContract();
        setReadOnlyContract(roContract);
      } catch (err) {
        console.error('Error initializing read-only contract:', err);
        setError('Unable to connect to the blockchain. Please check your connection and refresh.');
      }
    };

    initReadOnlyContract();
  }, []);

  // Fetch events with caching (shared across pages)
  const loadEvents = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { events: activeEvents } = await fetchActiveEvents();
      // Home page shows only the first 3 active events
      setEvents(activeEvents.slice(0, 3));
      setStats((previous) => ({ ...previous, active: activeEvents.length }));

      if (readOnlyContract) {
        try {
          const [totalEvents, totalTickets] = await Promise.all([
            readOnlyContract.getTotalEvents(),
            readOnlyContract.getTotalTickets()
          ]);
          setStats({
            events: totalEvents.toNumber(),
            tickets: totalTickets.toNumber(),
            active: activeEvents.length
          });
        } catch (statsError) {
          console.error('Error loading platform stats:', statsError);
        }
      }
    } catch (err) {
      console.error('Error loading events:', err);
      setError(err.message || 'Failed to load events. The contract may not be deployed correctly or the RPC is down.');
      setEvents([]); // Show empty state on error
    } finally {
      setIsLoading(false);
    }
  }, [readOnlyContract]);

  useEffect(() => {
    if (readOnlyContract) {
      loadEvents();
    }
  }, [readOnlyContract, loadEvents]);

  // When wallet contract changes, invalidate cache and refresh (avoids stale data)
  useEffect(() => {
    if (contract) {
      invalidateEventsCache();
      loadEvents();
    }
  }, [contract, loadEvents]);

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
    return new Date(event.date).getTime() <= Date.now();
  };

  return (
    <div className="homepage">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-container">
          <div className="hero-content">
            <h1 className="hero-title">
              The Future of Event Ticketing
            </h1>
            <p className="hero-subtitle">
              Create, mint, and manage NFT-based event tickets on the blockchain. 
              Secure, transparent ticketing with on-chain ownership.
            </p>
            
            <div className="hero-buttons">
              <button 
                className="btn btn-primary btn-lg hero-btn"
                onClick={() => navigate('/mint')}
              >
                Create Event
              </button>
              <button 
                className="btn btn-secondary btn-lg hero-btn"
                onClick={() => navigate('/tickets')}
              >
                View My Tickets
              </button>
            </div>
          </div>
          
          {/* Platform Stats */}
          <div className="hero-stats">
            {platformStats.map((stat, index) => (
              <div key={index} className="stat-card">
                <div className="stat-icon">{stat.icon}</div>
                <span className="stat-number">{stat.number}</span>
                <span className="stat-label">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Events Section */}
      <section className="featured-section">
        <div className="section-container">
          <div className="section-header">
            <h2 className="section-title">Featured Events</h2>
            <p className="section-subtitle">
              Discover amazing events happening near you
            </p>
          </div>
          
          {isLoading ? (
            <div className="events-grid">
              {[1, 2, 3].map((index) => (
                <div key={index} className="event-card">
                  <div className="event-image">
                    <div className="spinner"></div>
                  </div>
                  <div className="event-content">
                    <div className="skeleton-loader" style={{ height: '24px', marginBottom: '16px' }}></div>
                    <div className="skeleton-loader" style={{ height: '16px', marginBottom: '8px' }}></div>
                    <div className="skeleton-loader" style={{ height: '16px', marginBottom: '8px' }}></div>
                    <div className="skeleton-loader" style={{ height: '16px', marginBottom: '16px' }}></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <div className="skeleton-loader" style={{ height: '20px', width: '60px' }}></div>
                      <div className="skeleton-loader" style={{ height: '36px', width: '100px' }}></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="empty-state">
              <div className="empty-state-icon">⚠️</div>
              <h3 className="empty-state-title">Unable to Load Events</h3>
              <p className="empty-state-description">
                {error}
              </p>
              <button 
                className="btn btn-primary"
                onClick={loadEvents}
                style={{ marginTop: '20px' }}
              >
                Try Again
              </button>
            </div>
          ) : events.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🎫</div>
              <h3 className="empty-state-title">No Events Available</h3>
              <p className="empty-state-description">
                No active events are currently available. Check back later or create your own event!
              </p>
              <button 
                className="btn btn-primary"
                onClick={() => navigate('/mint')}
                style={{ marginTop: '20px' }}
              >
                Create Event
              </button>
            </div>
          ) : (
            <div className="events-grid">
              {events.map(event => (
                <div key={event.id} className="event-card">
                  <div className="event-image">
                    <span className="event-icon">🎫</span>
                    <div className="event-category">
                      {isEventSoldOut(event) ? 'Sold Out' : isEventStarted(event) ? 'Started' : 'Upcoming'}
                    </div>
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
                        <span>{event.price} ETH</span>
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
                      ) : (
                        <button 
                          className="btn btn-primary btn-sm"
                          onClick={() => navigate('/events')}
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
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <div className="section-container">
          <div className="section-header">
            <h2 className="section-title">Why Choose QuantumTicket?</h2>
            <p className="section-subtitle">
              Built on blockchain technology for maximum security and transparency
            </p>
          </div>
          
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">🔒</div>
              <h3 className="feature-title">On-chain Tickets</h3>
              <p className="feature-description">
                Ownership and validation are enforced by smart contracts, not a central database
              </p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">⚡</div>
              <h3 className="feature-title">Instant Verification</h3>
              <p className="feature-description">
                Smart contracts automatically verify ticket authenticity
              </p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">💎</div>
              <h3 className="feature-title">NFT Ownership</h3>
              <p className="feature-description">
                Your tickets are unique NFTs that you truly own
              </p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">🌍</div>
              <h3 className="feature-title">Wallet-native Access</h3>
              <p className="feature-description">
                Tickets live in your wallet, so there is no app account to lose
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="cta-container">
          <div className="cta-content">
            <h2 className="cta-title">Ready to Create Your Event?</h2>
            <p className="cta-subtitle">
              Launch your next event on the Sepolia testnet in a few minutes
            </p>
            <button 
              className="btn btn-primary btn-lg cta-button"
              onClick={() => navigate('/mint')}
            >
              Create Event Now
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage; 