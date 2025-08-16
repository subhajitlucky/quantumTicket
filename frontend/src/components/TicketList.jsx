import React, { useState, useEffect } from 'react';
import { useWallet } from '../hooks/useWallet';
import { useContract } from '../hooks/useContract';
import { ethers } from 'ethers';

const TicketList = () => {
  const { isConnected, chainId, account } = useWallet();
  const { contract, isLoading: contractLoading, error: contractError } = useContract();
  const [tickets, setTickets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  const fetchTickets = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('Fetching tickets for account:', account);
      console.log('Chain ID:', chainId);
      console.log('Contract:', contract);
      
      if (!isConnected) {
        console.log('Wallet not connected');
        setTickets([]);
        return;
      }
      
      if (chainId !== 11155111 && chainId !== 1337) {
        console.log('Wrong network, chainId:', chainId);
        setTickets([]);
        setError('Please switch to the Sepolia network to view your tickets');
        return;
      }
      
      if (!contract) {
        console.log('Contract not available:', contractError);
        setError(contractError || 'Contract not initialized');
        return;
      }
      
      try {
        // Check if getUserTickets function exists
        if (typeof contract.getUserTickets !== 'function') {
          console.log('getUserTickets function not found, trying alternative approach');
          
          // Alternative: Get balance and iterate through token IDs
        const balance = await contract.balanceOf(account);
          console.log('User balance:', balance.toString());
          
          if (balance.eq(0)) {
            console.log('User has no tickets');
            setTickets([]);
            return;
          }
          
          const userTickets = [];
          for (let i = 0; i < balance.toNumber(); i++) {
            try {
              const tokenId = await contract.tokenOfOwnerByIndex(account, i);
              console.log('Processing token ID:', tokenId.toString());
              
              const details = await contract.getTicketDetails(tokenId);
              console.log('Ticket details:', details);
              
              // Get full event details using the event ID
              const eventDetails = await contract.getEventDetails(details.eventId);
              console.log('Event details for event ID', details.eventId.toString(), ':', eventDetails);
              
              userTickets.push({
                tokenId: tokenId.toNumber(),
                eventId: details.eventId.toNumber(),
                isUsed: details.isUsed,
                eventDetails: {
                  name: eventDetails.eventName,
                  eventName: eventDetails.eventName,
                  venue: eventDetails.venue,
                  location: eventDetails.venue,
                  eventDate: eventDetails.eventDate,
                  ticketPrice: eventDetails.ticketPrice,
                  maxTickets: eventDetails.maxTickets,
                  organizer: eventDetails.organizer,
                  isActive: eventDetails.isActive
                }
              });
            } catch (error) {
              console.error(`Error processing token at index ${i}:`, error);
            }
          }
          
          setTickets(userTickets);
          return;
        }
        
        // Use the optimized getUserTickets function from the contract
        console.log('Calling getUserTickets...');
        const tokenIds = await contract.getUserTickets(account);
        console.log('User token IDs:', tokenIds);
        
        if (!tokenIds || tokenIds.length === 0) {
          console.log('No tickets found for user');
          setTickets([]);
          return;
        }
        
      const userTickets = [];
      
      for (let tokenId of tokenIds) {
        try {
            console.log('Getting details for token ID:', tokenId.toString());
            // Get ticket details
            const details = await contract.getTicketDetails(tokenId);
            console.log('Ticket details for token', tokenId.toString(), ':', details);
            
            // Get full event details using the event ID
            const eventDetails = await contract.getEventDetails(details.eventId);
            console.log('Event details for event ID', details.eventId.toString(), ':', eventDetails);
            
            userTickets.push({
              tokenId: tokenId.toNumber(),
              eventId: details.eventId.toNumber(),
              isUsed: details.isUsed,
              eventDetails: {
                name: eventDetails.eventName,
                eventName: eventDetails.eventName,
                venue: eventDetails.venue,
                location: eventDetails.venue,
                eventDate: eventDetails.eventDate,
                ticketPrice: eventDetails.ticketPrice,
                maxTickets: eventDetails.maxTickets,
                organizer: eventDetails.organizer,
                isActive: eventDetails.isActive
              }
            });
          } catch (error) {
            console.error(`Error processing tokenId ${tokenId}:`, error);
          }
        }
        
        console.log('Final user tickets:', userTickets);
        setTickets(userTickets);
        
      } catch (contractError) {
        console.error('Contract call error:', contractError);
        
        // Try alternative approach if main method fails
        try {
          const balance = await contract.balanceOf(account);
          console.log('Fallback: User balance:', balance.toString());
          
          if (balance.eq(0)) {
            setTickets([]);
            return;
          }
          
          // Get all Transfer events for this user
          const filter = contract.filters.Transfer(null, account, null);
          const events = await contract.queryFilter(filter);
          console.log('Transfer events:', events);
          
          const userTickets = [];
          for (let event of events) {
            try {
              const tokenId = event.args.tokenId;
              const currentOwner = await contract.ownerOf(tokenId);
              
              // Only include if still owned by the user
              if (currentOwner.toLowerCase() === account.toLowerCase()) {
                const details = await contract.getTicketDetails(tokenId);
                
                // Get full event details using the event ID
                const eventDetails = await contract.getEventDetails(details.eventId);
                
                userTickets.push({
                  tokenId: tokenId.toNumber(),
                  eventId: details.eventId.toNumber(),
                  isUsed: details.isUsed,
                  eventDetails: {
                    name: eventDetails.eventName,
                    eventName: eventDetails.eventName,
                    venue: eventDetails.venue,
                    location: eventDetails.venue,
                    eventDate: eventDetails.eventDate,
                    ticketPrice: eventDetails.ticketPrice,
                    maxTickets: eventDetails.maxTickets,
                    organizer: eventDetails.organizer,
                    isActive: eventDetails.isActive
                  }
            });
          }
        } catch (error) {
              console.error('Error processing transfer event:', error);
            }
          }
          
          setTickets(userTickets);
        } catch (fallbackError) {
          console.error('Fallback method also failed:', fallbackError);
          throw contractError; // Throw original error
        }
      }
      
    } catch (err) {
      console.error('Error fetching tickets:', err);
      setError(err.message || 'Failed to fetch tickets. Please try refreshing the page.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Refresh tickets periodically
  useEffect(() => {
    if (isConnected && contract && account) {
      fetchTickets();
      
      // Set up interval to refresh every 30 seconds
      const interval = setInterval(() => {
    fetchTickets();
      }, 30000);
      
      return () => clearInterval(interval);
    } else {
      setTickets([]);
      setIsLoading(false);
    }
  }, [isConnected, chainId, account, contract]);

  // Clear tickets immediately when wallet state changes to disconnected
  useEffect(() => {
    if (!isConnected) {
      console.log('Wallet disconnected - clearing tickets state');
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
      
      console.log('Using ticket:', tokenId);
      const tx = await contract.useTicket(tokenId);
      console.log('Use ticket transaction:', tx.hash);
      
      await tx.wait();
      console.log('Transaction confirmed');
      
      setSuccess(`Ticket #${tokenId} used successfully!`);
      
      setTimeout(() => {
        setSuccess(null);
      }, 5000);
      
      // Refresh tickets after using one
      await fetchTickets();
    } catch (err) {
      console.error('Error using ticket:', err);
      setError(err.message || 'Failed to use ticket');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleRefresh = () => {
    fetchTickets();
  };
  
  const formatDate = (timestamp) => {
    if (!timestamp) return 'Invalid Date';
    try {
      const date = new Date(timestamp.toNumber() * 1000);
    return date.toLocaleString();
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid Date';
    }
  };
  
  const formatTimeRemaining = (eventDate, now) => {
    try {
      const eventTime = new Date(eventDate.toNumber() * 1000);
      const diffMs = eventTime - now;
    
    if (diffMs <= 0) {
      return 'Event has started';
    }
    
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) {
      return `${days} day${days !== 1 ? 's' : ''}, ${hours} hour${hours !== 1 ? 's' : ''}`;
    } else if (hours > 0) {
      return `${hours} hour${hours !== 1 ? 's' : ''}, ${minutes} minute${minutes !== 1 ? 's' : ''}`;
    } else {
      return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
      }
    } catch (error) {
      console.error('Error calculating time remaining:', error);
      return 'Unknown';
    }
  };
  
  const getStatusBadge = (ticket) => {
    if (ticket.isUsed) {
      return <span className="status-badge status-used">Used</span>;
    }
    
    try {
      const now = Date.now();
      const eventTime = new Date(ticket.eventDetails.eventDate.toNumber() * 1000);
      
      if (eventTime <= now) {
        return <span className="status-badge status-warning">Ready to Use</span>;
      }
      
      return <span className="status-badge status-active">Active</span>;
    } catch (error) {
      console.error('Error determining status:', error);
      return <span className="status-badge status-active">Active</span>;
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
            View and manage your NFT tickets from this platform
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

        {/* Always show header and refresh - but disable refresh when disconnected */}
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
              <>
                Refresh
              </>
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
            Fetching your NFT tickets from the blockchain
          </p>
        </div>
      )}
      
      {/* Empty State */}
      {!isLoading && tickets.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">🎟️</div>
          <h3 className="empty-state-title">No Tickets Found</h3>
          <p className="empty-state-description">
            You don't have any tickets yet. Purchase tickets from the Mint Tickets section to get started!
          </p>
        </div>
      )}
      
      {/* Tickets Grid */}
      {tickets.length > 0 && (
        <div className="ticket-grid">
          {tickets.map((ticket) => (
            <div key={ticket.tokenId} className="ticket-card">
              {/* Ticket Header */}
              <div className="ticket-header">
                <h4 className="ticket-title">
                  {ticket.eventDetails?.name || `Event #${ticket.eventId}`}
                </h4>
                <div className="ticket-id">
                  #{ticket.tokenId}
                </div>
              </div>
              
              {/* Ticket Details */}
              <div className="ticket-details">
                <div className="ticket-detail">
                  <span className="ticket-detail-label">Event ID</span>
                  <span className="ticket-detail-value">#{ticket.eventId}</span>
                </div>
                
                <div className="ticket-detail">
                  <span className="ticket-detail-label">Location</span>
                  <span className="ticket-detail-value">
                    {ticket.eventDetails?.venue || ticket.eventDetails?.location || 'TBA'}
                  </span>
                </div>
                
                <div className="ticket-detail">
                  <span className="ticket-detail-label">Event Date</span>
                  <span className="ticket-detail-value">
                    {ticket.eventDetails?.eventDate ? formatDate(ticket.eventDetails.eventDate) : 'TBA'}
                  </span>
                </div>
                
                <div className="ticket-detail">
                  <span className="ticket-detail-label">Price Paid</span>
                  <span className="ticket-detail-value">
                    {ticket.eventDetails?.ticketPrice ? ethers.utils.formatEther(ticket.eventDetails.ticketPrice) : '0'} ETH
                  </span>
                </div>
                
                <div className="ticket-detail">
                  <span className="ticket-detail-label">Max Tickets</span>
                  <span className="ticket-detail-value">
                    {ticket.eventDetails?.maxTickets ? ticket.eventDetails.maxTickets.toString() : 'N/A'}
                  </span>
                </div>
                
                {!ticket.isUsed && ticket.eventDetails?.eventDate && (
                  <div className="ticket-detail">
                    <span className="ticket-detail-label">Time Until Event</span>
                    <span className="ticket-detail-value">
                      {formatTimeRemaining(ticket.eventDetails.eventDate, Date.now())}
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
              {!ticket.isUsed && new Date(ticket.eventDetails.eventDate.toNumber() * 1000) <= new Date() && (
                <div className="ticket-actions">
                  <button 
                    onClick={() => handleUseTicket(ticket.tokenId)}
                    disabled={isLoading}
                    className="ticket-action-btn primary"
                  >
                    {isLoading ? (
                      <>
                        <div className="spinner"></div>
                        Using Ticket...
                      </>
                    ) : (
                      'Use Ticket'
                    )}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
         </>
       )}
      </div>
    </div>
  );
};

export default TicketList; 