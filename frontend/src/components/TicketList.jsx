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
      
      // Check if wallet is connected
      if (!isConnected) {
        setTickets([]);
        return;
      }
      
      // Check if on correct network
      if (chainId !== 11155111 && chainId !== 1337) {
        setTickets([]);
        setError('Please switch to the Sepolia network to view your tickets');
        return;
      }
      
      // Check if contract is loaded
      if (!contract) {
        setError(contractError || 'Contract not initialized');
        return;
      }
      
      // Get transfer events to this address - this works for any ERC721 contract
      let tokenIds = [];
      
      try {
        // Get the block number to limit our search (last 100000 blocks ~ about 2 weeks)
        const currentBlock = await contract.provider.getBlockNumber();
        const fromBlock = Math.max(0, currentBlock - 100000);
        
        console.log('Searching from block:', fromBlock, 'to:', currentBlock);
        
        // Query Transfer events
        const filter = contract.filters.Transfer(null, account);
        const events = await contract.queryFilter(filter, fromBlock, 'latest');
        
        console.log('Found events:', events);
        
        // Extract token IDs from events
        tokenIds = events.map(event => event.args.tokenId.toNumber());
        console.log('Token IDs from events:', tokenIds);
        
        // Try to get token balance as a backup
        const balance = await contract.balanceOf(account);
        console.log('Account balance:', balance.toString());
        
        // If we have a balance but no events, we might need to check all tokens
        if (balance.gt(0) && tokenIds.length === 0) {
          console.log('Found balance but no events, checking all tokens...');
          const totalSupply = await contract._nextTokenId();
          
          for (let i = 0; i < totalSupply; i++) {
            try {
              const owner = await contract.ownerOf(i);
              if (owner.toLowerCase() === account.toLowerCase()) {
                tokenIds.push(i);
              }
            } catch (err) {
              // Skip invalid tokens
              console.log('Skipping token', i, ':', err.message);
            }
          }
        }
      } catch (err) {
        console.error('Error fetching events:', err);
        // Continue with empty tokenIds array
      }
      
      console.log('Final token IDs to check:', tokenIds);
      
      // Remove duplicates
      tokenIds = [...new Set(tokenIds)];
      
      // Verify ownership and get details for each token ID
      const userTickets = [];
      
      for (let tokenId of tokenIds) {
        try {
          // Check if the user is still the owner
          const owner = await contract.ownerOf(tokenId);
          if (owner.toLowerCase() === account.toLowerCase()) {
            // Get ticket details
            const details = await contract.getTicketDetails(tokenId);
            
            userTickets.push({
              tokenId,
              eventName: details[0],
              eventDate: new Date(details[1].toNumber() * 1000).toISOString(),
              venue: details[2],
              price: ethers.utils.formatEther(details[3]),
              isUsed: details[4]
            });
          }
        } catch (error) {
          console.error(`Error processing tokenId ${tokenId}:`, error);
          // Skip this token and continue
        }
      }
      
      console.log('User tickets:', userTickets);
      setTickets(userTickets);
    } catch (err) {
      console.error('Error fetching tickets:', err);
      setError(err.message || 'Failed to fetch tickets');
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    fetchTickets();
  }, [isConnected, chainId, account, contract]);
  
  const handleUseTicket = async (tokenId) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Check if contract is loaded
      if (!contract) {
        setError(contractError || 'Contract not initialized');
        return;
      }
      
      // Use ticket
      const tx = await contract.useTicket(tokenId);
      await tx.wait();
      
      // Success message
      setSuccess(`Ticket #${tokenId} used successfully!`);
      
      // Hide success message after 5 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 5000);
      
      // Refresh tickets
      await fetchTickets();
    } catch (err) {
      console.error('Error using ticket:', err);
      setError(err.message || 'Failed to use ticket');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };
  
  // Format time remaining until event
  const formatTimeRemaining = (eventDate, now) => {
    const diffMs = eventDate - now;
    
    if (diffMs <= 0) {
      return 'Event has started';
    }
    
    // Convert to days, hours, minutes
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
  };
  
  // Check if no tickets or not connected
  const renderNoTickets = () => {
    if (!isConnected) {
      return <p>Please connect your wallet to view your tickets</p>;
    }
    
    if (chainId !== 11155111 && chainId !== 1337) {
      return (
        <div>
          <p>Please switch to the Sepolia network to view your tickets</p>
        </div>
      );
    }
    
    if (isLoading) {
      return <p>Loading tickets...</p>;
    }
    
    return <p>You don't have any tickets yet</p>;
  };
  
  return (
    <div className="ticket-list">
      <div className="ticket-header">
        <h2>My Tickets</h2>
        <button 
          className="refresh-button" 
          onClick={fetchTickets}
          disabled={isLoading || !isConnected || contractLoading || !contract}
        >
          {isLoading ? 'Loading...' : 'Refresh'}
        </button>
      </div>
      
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
      
      {success && (
        <div className="success-message">
          {success}
        </div>
      )}
      
      {tickets.length === 0 ? (
        <div className="no-tickets">
          {renderNoTickets()}
        </div>
      ) : (
        <div className="tickets-container">
          {tickets.map(ticket => {
            // Check if event date has passed
            const eventDate = new Date(ticket.eventDate);
            const now = new Date();
            const eventStarted = eventDate <= now;
            
            return (
              <div key={ticket.tokenId} className="ticket-card">
                <h3>{ticket.eventName}</h3>
                <p><strong>Date:</strong> {formatDate(ticket.eventDate)}</p>
                <p><strong>Venue:</strong> {ticket.venue}</p>
                <p><strong>Price:</strong> {ticket.price} ETH</p>
                <p><strong>Status:</strong> {ticket.isUsed ? 'Used' : eventStarted ? 'Valid - Ready to Use' : 'Valid - Event not started yet'}</p>
                
                {!ticket.isUsed && eventStarted ? (
                  <button 
                    onClick={() => handleUseTicket(ticket.tokenId)}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Processing...' : 'Use Ticket'}
                  </button>
                ) : !ticket.isUsed && (
                  <div className="event-countdown">
                    <p className="countdown-text">This ticket can be used once the event starts</p>
                    <p className="time-remaining">Time remaining: {formatTimeRemaining(eventDate, now)}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TicketList; 