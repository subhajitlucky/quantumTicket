import React from 'react';

const HomePage = ({ setCurrentPage }) => {
  // Dummy data for featured events
  const featuredEvents = [
    {
      id: 1,
      name: "TechCon 2024",
      date: "Dec 15, 2024",
      venue: "San Francisco Convention Center",
      price: "0.05",
      image: "🎯",
      category: "Technology",
      ticketsLeft: 47
    },
    {
      id: 2,
      name: "Crypto Music Festival",
      date: "Jan 20, 2025",
      venue: "Miami Beach Arena",
      price: "0.08",
      image: "🎵",
      category: "Music",
      ticketsLeft: 123
    },
    {
      id: 3,
      name: "NFT Art Exhibition",
      date: "Feb 5, 2025",
      venue: "New York Gallery District",
      price: "0.03",
      image: "🎨",
      category: "Art",
      ticketsLeft: 89
    }
  ];

  const platformStats = [
    { number: "10,000+", label: "Events Created", icon: "🎪" },
    { number: "50,000+", label: "Tickets Sold", icon: "🎫" },
    { number: "5,000+", label: "Happy Users", icon: "😊" },
    { number: "99.9%", label: "Uptime", icon: "⚡" }
  ];

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
                onClick={() => setCurrentPage('mint')}
              >
                🚀 Create Event
              </button>
              <button 
                className="btn btn-secondary btn-lg hero-btn"
                onClick={() => setCurrentPage('tickets')}
              >
                🎟️ View My Tickets
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
            <h2 className="section-title">🔥 Featured Events</h2>
            <p className="section-subtitle">
              Discover amazing events happening near you
            </p>
          </div>
          
          <div className="events-grid">
            {featuredEvents.map(event => (
              <div key={event.id} className="event-card">
                <div className="event-image">
                  <span className="event-icon">{event.image}</span>
                  <div className="event-category">{event.category}</div>
                </div>
                
                <div className="event-content">
                  <h3 className="event-title">{event.name}</h3>
                  <div className="event-details">
                    <div className="event-detail">
                      <span className="detail-icon">📅</span>
                      <span>{event.date}</span>
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
                      <span className="tickets-count">{event.ticketsLeft}</span>
                      <span className="tickets-label">tickets left</span>
                    </div>
                    <button 
                      className="btn btn-primary btn-sm"
                      onClick={() => setCurrentPage('events')}
                    >
                      Buy Ticket
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
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
              onClick={() => setCurrentPage('mint')}
            >
              🎫 Create Event Now
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage; 