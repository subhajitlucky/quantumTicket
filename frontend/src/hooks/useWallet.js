import { useState, useEffect } from 'react';
import { ethers } from 'ethers';

// This hook provides wallet connection functionality using ethers.js
export function useWallet() {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [account, setAccount] = useState('');
  const [chainId, setChainId] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(null);

  // Check if the wallet is already connected on mount
  useEffect(() => {
    checkConnection();
    
    // Listen for account changes
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      }
    };
  }, []);

  // Check if the wallet is already connected
  const checkConnection = async () => {
    try {
      // Check if MetaMask is installed
      if (!window.ethereum) {
        console.log("MetaMask not installed");
        return;
      }

      // Request account access if not already granted
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      
      if (accounts.length > 0) {
        // Get the provider and signer
        const ethersProvider = new ethers.providers.Web3Provider(window.ethereum);
        const ethersSigner = ethersProvider.getSigner();
        const network = await ethersProvider.getNetwork();
        
        setProvider(ethersProvider);
        setSigner(ethersSigner);
        setAccount(accounts[0]);
        setChainId(network.chainId);
        setIsConnected(true);
      }
    } catch (err) {
      console.error("Error checking connection:", err);
      setError(err.message);
    }
  };

  // Handle account changes
  const handleAccountsChanged = (accounts) => {
    if (accounts.length === 0) {
      // User disconnected their wallet
      disconnectWallet();
    } else {
      // User switched accounts
      setAccount(accounts[0]);
    }
  };

  // Handle chain changes
  const handleChainChanged = () => {
    // Reload the page when the chain changes
    window.location.reload();
  };

  // Connect wallet
  const connectWallet = async () => {
    try {
      setIsConnecting(true);
      setError(null);

      if (!window.ethereum) {
        throw new Error("MetaMask not installed");
      }

      // Request account access
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      
      if (accounts.length > 0) {
        // Get the provider and signer
        const ethersProvider = new ethers.providers.Web3Provider(window.ethereum);
        const ethersSigner = ethersProvider.getSigner();
        const network = await ethersProvider.getNetwork();
        
        setProvider(ethersProvider);
        setSigner(ethersSigner);
        setAccount(accounts[0]);
        setChainId(network.chainId);
        setIsConnected(true);
      }
    } catch (err) {
      console.error("Error connecting wallet:", err);
      setError(err.message);
    } finally {
      setIsConnecting(false);
    }
  };

  // Disconnect wallet
  const disconnectWallet = () => {
    setProvider(null);
    setSigner(null);
    setAccount('');
    setChainId(null);
    setIsConnected(false);
  };

  // Format address for display (0x1234...5678)
  const formatAddress = (address) => {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  return {
    provider,
    signer,
    account,
    chainId,
    isConnected,
    isConnecting,
    error,
    connectWallet,
    disconnectWallet,
    formatAddress
  };
} 