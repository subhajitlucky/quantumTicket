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

  // Platform statistics - these could be fetched from a backend or contract in the future
  const platformStats = [
    { number: "10,000+", label: "Events Created", icon: "🎫" },
    { number: "50,000+", label: "Tickets Sold", icon: "🎟️" },
    { number: "5,000+", label: "Happy Users", icon: "😊" },
    { number: "99.9%", label: "Uptime", icon: "⚡" }
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

    } catch (err) {
      console.error('Error loading events:', err);
      setError(err.message || 'Failed to load events. The contract may not be deployed correctly or the RPC is down.');
      setEvents([]); // Show empty state on error
    } finally {
      setIsLoading(false);
    }
  }, []);

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
              Secure, transparent, and fraud-proof ticketing for the modern world.
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
                        <span>{event.price} ETH</span>
                      </div>
                    </div>
                    
                    <div className="event-footer">
                      <div className="tickets-left">
                        <span className="tickets-count">{event.maxTickets - event.soldTickets}</span>
                        <span className="tickets-label">tickets left</span>
                      </div>
                      <button 
                        className="btn btn-primary btn-sm"
                        onClick={() => navigate('/events')}
                      >
                        {isEventSoldOut(event) ? 'Sold Out' : 'Buy Ticket'}
                      </button>
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
              <h3 className="feature-title">100% Secure</h3>
              <p className="feature-description">
                Blockchain-based tickets prevent fraud and unauthorized resale
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
              <h3 className="feature-title">Global Access</h3>
              <p className="feature-description">
                Buy and sell tickets anywhere in the world, 24/7
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
              Join thousands of event organizers using QuantumTicket
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