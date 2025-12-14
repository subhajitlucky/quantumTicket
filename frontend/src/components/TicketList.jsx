/**
 * TicketList Component
 * 
 * Displays user's tickets using client-side event indexing.
 * Uses ticketIndexer service to build ticket list from blockchain events
 * instead of calling the removed getUserTickets() function.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useWallet } from '../hooks/useWallet';
import { useContract } from '../hooks/useContract';
import {
  buildTicketIndex,
  getTicketsWithDetails,
  invalidateTicketCache
} from '../services/ticketIndexer';

const TicketList = () => {
  const { isConnected, chainId, account } = useWallet();
  const { contract, error: contractError } = useContract();
  const [tickets, setTickets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const fetchTickets = useCallback(async (forceRefresh = false) => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('[TicketList] Fetching tickets for account:', account);

      if (!isConnected) {
        console.log('[TicketList] Wallet not connected');
        setTickets([]);
        return;
      }

      if (chainId !== 11155111 && chainId !== 1337) {
        console.log('[TicketList] Wrong network, chainId:', chainId);
        setTickets([]);
        setError('Please switch to the Sepolia network to view your tickets');
        return;
      }

      if (!contract) {
        console.log('[TicketList] Contract not available:', contractError);
        setError(contractError || 'Contract not initialized');
        return;
      }

      // Use the ticket indexer service to build ticket list from events
      const tokenIds = await buildTicketIndex(contract, account, chainId, forceRefresh);
      console.log('[TicketList] Found token IDs:', tokenIds);

      if (tokenIds.length === 0) {
        setTickets([]);
        return;
      }

      // Fetch full details for each ticket
      const ticketsWithDetails = await getTicketsWithDetails(contract, tokenIds);
      console.log('[TicketList] Tickets with details:', ticketsWithDetails);

      setTickets(ticketsWithDetails);

    } catch (err) {
      console.error('[TicketList] Error fetching tickets:', err);
      setError(err.message || 'Failed to fetch tickets. Please try refreshing the page.');
    } finally {
      setIsLoading(false);
    }
  }, [account, chainId, contract, contractError, isConnected]);

  // Refresh tickets on mount and when dependencies change
  useEffect(() => {
    if (isConnected && contract && account) {
      fetchTickets();

      // Set up interval to refresh every 60 seconds (less aggressive)
      const interval = setInterval(() => {
        fetchTickets();
      }, 60000);

      return () => clearInterval(interval);
    } else {
      setTickets([]);
      setIsLoading(false);
    }
  }, [account, contract, fetchTickets, isConnected]);

  // Clear tickets immediately when wallet disconnects
  useEffect(() => {
    if (!isConnected) {
      console.log('[TicketList] Wallet disconnected - clearing state');
      setTickets([]);
      setError(null);
      setSuccess(null);
      setIsLoading(false);
    }
  }, [isConnected]);

  const handleUseTicket = async (tokenId) => {
    try {
      setIsLoading(true);
      setError(null);

      if (!contract) {
        setError(contractError || 'Contract not initialized');
        return;
      }

      console.log('[TicketList] Validating ticket:', tokenId);
      const tx = await contract.useTicket(tokenId);
      console.log('[TicketList] Transaction:', tx.hash);

      await tx.wait();
      console.log('[TicketList] Transaction confirmed');

      setSuccess('Ticket validated successfully! Entry granted.');

      setTimeout(() => setSuccess(null), 5000);

      // Refresh tickets after validation
      await fetchTickets(true);
    } catch (err) {
      console.error('[TicketList] Error validating ticket:', err);
      // Parse common errors
      if (err.message.includes('Entry not yet open')) {
        setError('Entry is not yet open. Please wait until the entry time.');
      } else if (err.message.includes('Ticket already used')) {
        setError('This ticket has already been used.');
      } else {
        setError(err.message || 'Failed to validate ticket');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    // Invalidate cache and force refresh
    if (account && chainId) {
      invalidateTicketCache(account, chainId);
    }
    fetchTickets(true);
  };

  // Format date for display
  const formatDate = (timestamp) => {
    if (!timestamp) return 'Invalid Date';
    try {
      const ts = typeof timestamp === 'object' && timestamp.toNumber
        ? timestamp.toNumber()
        : parseInt(timestamp);
      const date = new Date(ts * 1000);
      return date.toLocaleString();
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid Date';
    }
  };

  // Calculate time remaining until event
  const formatTimeRemaining = (eventDate) => {
    try {
      const ts = typeof eventDate === 'object' && eventDate.toNumber
        ? eventDate.toNumber()
        : parseInt(eventDate);
      const eventTime = new Date(ts * 1000);
      const now = Date.now();
      const diffMs = eventTime - now;

      if (diffMs <= 0) {
        return 'Event has started';
      }

      const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

      if (days > 0) {
        return `${days}d ${hours}h`;
      } else if (hours > 0) {
        return `${hours}h ${minutes}m`;
      } else {
        return `${minutes}m`;
      }
    } catch (error) {
      console.error('Error calculating time remaining:', error);
      return 'Unknown';
    }
  };

  // Check if entry is open (based on entryOpenTime, not eventDate)
  const isEntryOpen = (ticket) => {
    try {
      const entryOpenTime = ticket.eventDetails?.entryOpenTime;
      if (!entryOpenTime) return false;

      const ts = typeof entryOpenTime === 'object' && entryOpenTime.toNumber
        ? entryOpenTime.toNumber()
        : parseInt(entryOpenTime);

      return Date.now() >= ts * 1000;
    } catch (error) {
      return false;
    }
  };

  // Get status badge for ticket
  const getStatusBadge = (ticket) => {
    if (ticket.isUsed) {
      return <span className="status-badge status-used">✓ Validated</span>;
    }

    if (isEntryOpen(ticket)) {
      return <span className="status-badge status-warning">Ready for Entry</span>;
    }

    return <span className="status-badge status-active">Active</span>;
  };

  // Get time until entry opens
  const getEntryTimeInfo = (ticket) => {
    try {
      const entryOpenTime = ticket.eventDetails?.entryOpenTime;
      if (!entryOpenTime) return null;

      const ts = typeof entryOpenTime === 'object' && entryOpenTime.toNumber
        ? entryOpenTime.toNumber()
        : parseInt(entryOpenTime);

      const entryTime = new Date(ts * 1000);
      const now = Date.now();

      if (now >= ts * 1000) {
        return { open: true, text: 'Entry is open' };
      }

      const diffMs = entryTime - now;
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

      return {
        open: false,
        text: `Entry opens in ${hours > 0 ? hours + 'h ' : ''}${minutes}m`,
        time: entryTime.toLocaleString()
      };
    } catch (error) {
      return null;
    }
  };

  return (
    <div className="my-tickets-page">
      <div className="page-container">
        <div className="section-header">
          <h2 className="section-title">
            My Tickets
          </h2>
          <p className="section-subtitle">
            Your NFT tickets — present at the venue for entry
          </p>
        </div>

        {/* Alert Messages */}
        {error && (
          <div className="alert alert-error">
            {error}
          </div>
        )}

        {/* Header with refresh */}
        <div className="tickets-header">
          <h3 className="tickets-title">
            Your Tickets ({isConnected ? tickets.length : 0})
          </h3>
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className={`btn btn-secondary btn-sm ${!isConnected ? 'btn-disabled' : ''}`}
            title={!isConnected ? "Connect wallet to refresh" : "Refresh tickets"}
          >
            {isLoading ? (
              <>
                <div className="spinner"></div>
                Refreshing...
              </>
            ) : (
              <>↻ Refresh</>
            )}
          </button>
        </div>

        {/* Content based on wallet connection status */}
        {!isConnected ? (
          <div className="empty-state">
            <div className="empty-state-icon">🔌</div>
            <h3 className="empty-state-title">Connect Your Wallet</h3>
            <p className="empty-state-description">
              Please connect your wallet to view your NFT tickets
            </p>
          </div>
        ) : isConnected && chainId !== 11155111 && chainId !== 1337 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🌐</div>
            <h3 className="empty-state-title">Wrong Network</h3>
            <p className="empty-state-description">
              Please switch to the Sepolia network to view your tickets
            </p>
          </div>
        ) : (
          <>
            {/* Loading State */}
            {isLoading && tickets.length === 0 && (
              <div className="empty-state">
                <div className="empty-state-icon">
                  <div className="spinner"></div>
                </div>
                <h3 className="empty-state-title">Loading Your Tickets...</h3>
                <p className="empty-state-description">
                  Scanning blockchain for your NFT tickets
                </p>
              </div>
            )}

            {/* Empty State */}
            {!isLoading && tickets.length === 0 && (
              <div className="empty-state">
                <div className="empty-state-icon">🎟️</div>
                <h3 className="empty-state-title">No Tickets Found</h3>
                <p className="empty-state-description">
                  You don't have any tickets yet. Browse events to purchase tickets!
                </p>
              </div>
            )}

            {/* Tickets Grid */}
            {tickets.length > 0 && (
              <div className="ticket-grid">
                {tickets.map((ticket) => {
                  const entryInfo = getEntryTimeInfo(ticket);
                  const canValidate = !ticket.isUsed && isEntryOpen(ticket);

                  return (
                    <div key={ticket.tokenId} className="ticket-card">
                      {/* Ticket Header - Friendly name, de-emphasize tokenId */}
                      <div className="ticket-header">
                        <h4 className="ticket-title">
                          {ticket.eventDetails?.eventName || `Event`}
                        </h4>
                        <div className="ticket-badge" style={{ fontSize: '0.75rem', opacity: 0.7, color: '#ffffff' }}>
                          Ticket
                        </div>
                        <div style={{
                          marginTop: '6px',
                          display: 'inline-block',
                          padding: '4px 8px',
                          borderRadius: '12px',
                          background: 'rgba(0,0,0,0.25)',
                          color: '#ffffff',
                          fontSize: '0.75rem',
                          fontWeight: 600
                        }}>
                          Token ID: {ticket.tokenId}
                        </div>
                      </div>

                      {/* Ticket Details */}
                      <div className="ticket-details">
                        <div className="ticket-detail">
                          <span className="ticket-detail-label">📍 Venue</span>
                          <span className="ticket-detail-value">
                            {ticket.eventDetails?.venue || 'TBA'}
                          </span>
                        </div>

                        <div className="ticket-detail">
                          <span className="ticket-detail-label">📅 Event Date</span>
                          <span className="ticket-detail-value">
                            {ticket.eventDetails?.eventDate ? formatDate(ticket.eventDetails.eventDate) : 'TBA'}
                          </span>
                        </div>

                        {/* Entry Time Info */}
                        {entryInfo && (
                          <div className="ticket-detail">
                            <span className="ticket-detail-label">🚪 Entry</span>
                            <span className="ticket-detail-value" style={{
                              color: entryInfo.open ? 'var(--success-500)' : 'var(--warning-500)'
                            }}>
                              {entryInfo.text}
                            </span>
                          </div>
                        )}

                        {!ticket.isUsed && ticket.eventDetails?.eventDate && (
                          <div className="ticket-detail">
                            <span className="ticket-detail-label">⏱️ Time Until Event</span>
                            <span className="ticket-detail-value">
                              {formatTimeRemaining(ticket.eventDetails.eventDate)}
                            </span>
                          </div>
                        )}

                        {/* Status Badge */}
                        <div className="ticket-detail">
                          <span className="ticket-detail-label">Status</span>
                          <span className="ticket-detail-value">
                            {getStatusBadge(ticket)}
                          </span>
                        </div>
                      </div>

                      {/* Ticket Actions */}
                      <div className="ticket-actions">
                        {ticket.isUsed ? (
                          <div className="ticket-used-notice" style={{
                            padding: '12px',
                            background: 'var(--success-500/10)',
                            borderRadius: '8px',
                            textAlign: 'center',
                            color: 'var(--success-500)'
                          }}>
                            ✓ Entry Granted
                          </div>
                        ) : canValidate ? (
                          <button
                            onClick={() => handleUseTicket(ticket.tokenId)}
                            disabled={isLoading}
                            className="ticket-action-btn primary"
                            style={{ width: '100%' }}
                          >
                            {isLoading ? (
                              <>
                                <div className="spinner"></div>
                                Validating...
                              </>
                            ) : (
                              '🎫 Validate Ticket'
                            )}
                          </button>
                        ) : (
                          <div className="ticket-waiting-notice" style={{
                            padding: '12px',
                            background: 'var(--warning-500/10)',
                            borderRadius: '8px',
                            textAlign: 'center',
                            color: 'var(--text-secondary)',
                            fontSize: '0.875rem'
                          }}>
                            ⏳ {entryInfo?.text || 'Waiting for entry time'}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* Success messages are shown after the tickets to keep focus on content */}
        {success && (
          <div className="alert alert-success" style={{ marginTop: 'var(--space-4)' }}>
            {success}
          </div>
        )}
      </div>
    </div>
  );
};

export default TicketList;