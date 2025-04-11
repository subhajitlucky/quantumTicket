import React, { useState, useEffect } from 'react';
import { useContract } from '../hooks/useContract';
import { useWallet } from '../hooks/useWallet';
import { ethers } from 'ethers';

const OwnerInfo = () => {
  const { contract, isOwner } = useContract();
  const { account, formatAddress } = useWallet();
  const [ownerAddress, setOwnerAddress] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newOwnerAddress, setNewOwnerAddress] = useState('');
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferSuccess, setTransferSuccess] = useState(false);

  useEffect(() => {
    const getOwner = async () => {
      if (!contract) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        const owner = await contract.owner();
        setOwnerAddress(owner);
      } catch (err) {
        console.error('Error fetching owner:', err);
        setError('Failed to fetch owner address');
      } finally {
        setIsLoading(false);
      }
    };

    getOwner();
  }, [contract, transferSuccess]);

  const handleTransferOwnership = async (e) => {
    e.preventDefault();
    
    if (!newOwnerAddress || !ethers.utils.isAddress(newOwnerAddress)) {
      setError('Please enter a valid Ethereum address');
      return;
    }
    
    try {
      setIsTransferring(true);
      setError(null);
      
      const tx = await contract.transferOwnership(newOwnerAddress);
      await tx.wait();
      
      setTransferSuccess(true);
      setNewOwnerAddress('');
      
      // Reset success message after 5 seconds
      setTimeout(() => {
        setTransferSuccess(false);
      }, 5000);
    } catch (err) {
      console.error('Error transferring ownership:', err);
      setError(err.message || 'Failed to transfer ownership');
    } finally {
      setIsTransferring(false);
    }
  };

  if (isLoading) {
    return <p><strong>Contract Owner:</strong> Loading...</p>;
  }

  if (error) {
    return (
      <div>
        <p><strong>Contract Owner:</strong> Error: {error}</p>
      </div>
    );
  }

  if (!ownerAddress) {
    return <p><strong>Contract Owner:</strong> Not available</p>;
  }

  return (
    <div>
      <p>
        <strong>Contract Owner:</strong> {formatAddress(ownerAddress)}
        {account && account.toLowerCase() === ownerAddress.toLowerCase() && (
          <span className="owner-badge">You are the owner!</span>
        )}
      </p>
      
      {isOwner && (
        <div className="transfer-ownership">
          <h4>Transfer Ownership</h4>
          {transferSuccess && (
            <div className="success-message">
              Ownership successfully transferred!
            </div>
          )}
          <form onSubmit={handleTransferOwnership}>
            <div className="form-group">
              <input
                type="text"
                placeholder="New owner address (0x...)"
                value={newOwnerAddress}
                onChange={(e) => setNewOwnerAddress(e.target.value)}
                disabled={isTransferring}
              />
            </div>
            <button 
              type="submit" 
              disabled={isTransferring || !newOwnerAddress}
            >
              {isTransferring ? 'Transferring...' : 'Transfer Ownership'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default OwnerInfo; 