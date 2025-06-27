import React, { useState, useEffect, useRef } from 'react'
import './App.css'
import './styles/main.css'
import ConnectButton from './components/ConnectButton'
import MintTicket from './components/MintTicket'
import TicketList from './components/TicketList'
import HomePage from './components/HomePage'
import Events from './components/Events'

function App() {
  const [currentPage, setCurrentPage] = useState('home') // 'home', 'mint', 'events', 'tickets'
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const navRef = useRef(null)
  const hamburgerRef = useRef(null)

  const renderCurrentPage = () => {
    switch(currentPage) {
      case 'home':
        return <HomePage setCurrentPage={setCurrentPage} />
      case 'mint':
        return <MintTicket />
      case 'events':
        return <Events />
      case 'tickets':
        return <TicketList />
      default:
        return <HomePage setCurrentPage={setCurrentPage} />
    }
  }

  const handlePageChange = (page) => {
    setCurrentPage(page)
    setIsMenuOpen(false)
  }

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (hamburgerRef.current && hamburgerRef.current.contains(event.target)) {
        return;
      }
      if (navRef.current && !navRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className={`app-container ${isMenuOpen ? 'menu-open' : ''}`}>
      {/* Transparent Navigation Bar */}
      <header className="navbar">
        <div className="navbar-container">
          {/* Logo */}
          <div 
            className="navbar-logo" 
            onClick={() => handlePageChange('home')}
          >
            <span className="logo-icon">⚡</span>
            <span className="logo-text">QuantumTicket</span>
          </div>
          
          {/* Navigation Links */}
          <nav className={`navbar-nav ${isMenuOpen ? 'open' : ''}`} ref={navRef}>
            <button 
              className={`nav-link ${currentPage === 'home' ? 'active' : ''}`}
              onClick={() => handlePageChange('home')}
            >
              <span className="nav-icon">🏠</span> Home
            </button>
            <button 
              className={`nav-link ${currentPage === 'mint' ? 'active' : ''}`}
              onClick={() => handlePageChange('mint')}
            >
              <span className="nav-icon">🎫</span> Create Event
            </button>
            <button 
              className={`nav-link ${currentPage === 'events' ? 'active' : ''}`}
              onClick={() => handlePageChange('events')}
            >
              <span className="nav-icon">🎪</span> Events
            </button>
            <button 
              className={`nav-link ${currentPage === 'tickets' ? 'active' : ''}`}
              onClick={() => handlePageChange('tickets')}
            >
              <span className="nav-icon">🎟️</span> My Tickets
            </button>
          </nav>
          
          {/* Connect Wallet and Hamburger Menu */}
          <div className="navbar-actions">
            <ConnectButton />
            <button 
              className="hamburger-menu"
              ref={hamburgerRef}
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="Toggle menu"
            >
              <div className={`hamburger-icon ${isMenuOpen ? 'open' : ''}`}>
                <span></span>
                <span></span>
                <span></span>
              </div>
            </button>
          </div>
        </div>
      </header>
      
      {/* Main Content Area */}
      <main className="main-container">
        {renderCurrentPage()}
      </main>
      
      {/* Footer */}
      <footer className="footer">
        <div className="footer-content">
          <p>© 2024 QuantumTicket - Revolutionizing Event Ticketing with Blockchain Technology</p>
        </div>
      </footer>
    </div>
  )
}

export default App
