import React, { useState, useEffect } from 'react';
import {
  connectWallet,
  disconnectWallet,
  getAccount,
  getIsConnected,
  isMetaMaskInstalled,
  onWalletEvent,
  offWalletEvent,
  isSepoliaNetwork,
  switchToSepoliaNetwork
} from '../utils/wallet';

const WalletConnect = () => {
  const [address, setAddress] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [onCorrectNetwork, setOnCorrectNetwork] = useState(true);

  useEffect(() => {
    // Initialize wallet state
    if (getIsConnected()) {
      setAddress(getAccount());
      setIsConnected(true);
      setOnCorrectNetwork(isSepoliaNetwork());
    }

    // Set up event listeners
    const handleConnect = (data) => {
      setAddress(data.account);
      setIsConnected(true);
      setOnCorrectNetwork(isSepoliaNetwork());
    };

    const handleDisconnect = () => {
      setAddress(null);
      setIsConnected(false);
    };

    const handleAccountsChanged = (data) => {
      setAddress(data.account);
    };

    onWalletEvent('connect', handleConnect);
    onWalletEvent('disconnect', handleDisconnect);
    onWalletEvent('accountsChanged', handleAccountsChanged);

    // Clean up event listeners
    return () => {
      offWalletEvent('connect', handleConnect);
      offWalletEvent('disconnect', handleDisconnect);
      offWalletEvent('accountsChanged', handleAccountsChanged);
    };
  }, []);

  const handleConnect = async () => {
    if (!isMetaMaskInstalled()) {
      setError('MetaMask is not installed. Please install MetaMask to continue.');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const account = await connectWallet();
      setAddress(account);
      setIsConnected(true);
      setOnCorrectNetwork(isSepoliaNetwork());
    } catch (err) {
      console.error('Connection error:', err);
      setError('Failed to connect wallet. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = () => {
    try {
      disconnectWallet();
      setAddress(null);
      setIsConnected(false);
    } catch (err) {
      console.error('Disconnect error:', err);
      setError('Failed to disconnect wallet. Please try again.');
    }
  };

  const handleSwitchNetwork = async () => {
    try {
      setIsLoading(true);
      setError(null);
      await switchToSepoliaNetwork();
      setOnCorrectNetwork(true);
    } catch (err) {
      console.error('Network switch error:', err);
      setError('Failed to switch network. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Format address for display
  const formatAddress = (addr) => {
    if (!addr) return '';
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  return (
    <div className="wallet-connect-container">
      {error && (
        <div style={{ color: 'red', marginBottom: '10px' }}>
          {error}
        </div>
      )}
      
      {isConnected ? (
        <div>
          <p>
            Connected: {formatAddress(address)}
            {!onCorrectNetwork && (
              <span style={{ color: 'orange', marginLeft: '10px' }}>
                (Wrong Network)
              </span>
            )}
          </p>
          
          {!onCorrectNetwork && (
            <button 
              onClick={handleSwitchNetwork}
              disabled={isLoading}
              style={{ marginRight: '10px' }}
            >
              Switch to Sepolia
            </button>
          )}
          
          <button 
            onClick={handleDisconnect}
            disabled={isLoading}
          >
            Disconnect Wallet
          </button>
        </div>
      ) : (
        <button 
          onClick={handleConnect}
          disabled={isLoading}
        >
          {isLoading ? 'Connecting...' : 'Connect Wallet'}
        </button>
      )}
    </div>
  );
};

export default WalletConnect;