import React, { useState, useEffect, useRef } from 'react'
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom'
import './App.css'
import './styles/main.css'
import ConnectButton from './components/ConnectButton'
import MintTicket from './components/MintTicket'
import TicketList from './components/TicketList'
import HomePage from './components/HomePage'
import Events from './components/Events'

function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const navRef = useRef(null)
  const hamburgerRef = useRef(null)
  const location = useLocation()

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

  const isActive = (path) => location.pathname === path

  return (
    <header className="navbar">
      <div className="navbar-container">
        {/* Logo */}
        <Link to="/" className="navbar-logo">
          <span className="logo-icon">⚡</span>
          <span className="logo-text">QuantumTicket</span>
        </Link>
        
        {/* Navigation Links */}
        <nav className={`navbar-nav ${isMenuOpen ? 'open' : ''}`} ref={navRef}>
          <Link 
            to="/" 
            className={`nav-link ${isActive('/') ? 'active' : ''}`}
            onClick={() => setIsMenuOpen(false)}
          >
            <span className="nav-icon">🏠</span> Home
          </Link>
          <Link 
            to="/mint" 
            className={`nav-link ${isActive('/mint') ? 'active' : ''}`}
            onClick={() => setIsMenuOpen(false)}
          >
            <span className="nav-icon">🎫</span> Create Event
          </Link>
          <Link 
            to="/events" 
            className={`nav-link ${isActive('/events') ? 'active' : ''}`}
            onClick={() => setIsMenuOpen(false)}
          >
            <span className="nav-icon">🎪</span> Events
          </Link>
          <Link 
            to="/tickets" 
            className={`nav-link ${isActive('/tickets') ? 'active' : ''}`}
            onClick={() => setIsMenuOpen(false)}
          >
            <span className="nav-icon">🎟️</span> My Tickets
          </Link>
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
  )
}

function App() {
  return (
    <Router>
      <div className="app-container">
        <Navbar />
        
        <main className="main-container">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/mint" element={<MintTicket />} />
            <Route path="/events" element={<Events />} />
            <Route path="/tickets" element={<TicketList />} />
          </Routes>
        </main>
        
        <footer className="footer">
          <div className="footer-content">
            <p>© 2024 QuantumTicket - Revolutionizing Event Ticketing with Blockchain Technology</p>
          </div>
        </footer>
      </div>
    </Router>
  )
}

export default App
