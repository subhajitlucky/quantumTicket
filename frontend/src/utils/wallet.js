import { ethers } from 'ethers';

// State for keeping track of wallet connection
let currentAccount = null;
let currentProvider = null;
let currentSigner = null;
let isConnected = false;
let chainId = null;

// Sepolia chain ID
const SEPOLIA_CHAIN_ID = '0xaa36a7'; // 11155111 in decimal
const SEPOLIA_RPC_URL = import.meta.env.VITE_SEPOLIA_RPC_URL;

// Event handlers
const eventHandlers = {
  accountsChanged: [],
  chainChanged: [],
  connect: [],
  disconnect: []
};

/**
 * Check if MetaMask is installed
 * @returns {boolean} True if MetaMask is installed
 */
export const isMetaMaskInstalled = () => {
  return window.ethereum !== undefined;
};

/**
 * Connect to the wallet
 * @returns {Promise<string>} The connected account address
 */
export const connectWallet = async () => {
  if (!isMetaMaskInstalled()) {
    throw new Error('MetaMask is not installed');
  }

  try {
    // Request account access
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    
    // Get the current chain ID
    chainId = await window.ethereum.request({ method: 'eth_chainId' });
    
    // Set up provider and signer
    currentProvider = new ethers.providers.Web3Provider(window.ethereum);
    currentSigner = currentProvider.getSigner();
    currentAccount = accounts[0];
    isConnected = true;
    
    // Notify event handlers
    notifyEventHandlers('connect', { account: currentAccount, chainId });
    
    // Set up event listeners
    setupEventListeners();
    
    return currentAccount;
  } catch (error) {
    console.error('Failed to connect wallet:', error);
    throw error;
  }
};

/**
 * Disconnect from the wallet
 */
export const disconnectWallet = () => {
  currentAccount = null;
  currentSigner = null;
  isConnected = false;
  
  // MetaMask doesn't support programmatic disconnect
  // Just notify our app that user has disconnected
  notifyEventHandlers('disconnect', {});
};

/**
 * Switch to Sepolia network
 */
export const switchToSepoliaNetwork = async () => {
  if (!isMetaMaskInstalled()) {
    throw new Error('MetaMask is not installed');
  }

  if (!SEPOLIA_RPC_URL) {
    throw new Error('VITE_SEPOLIA_RPC_URL is not set');
  }

  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: SEPOLIA_CHAIN_ID }]
    });
  } catch (error) {
    // If the chain is not added, add it
    if (error.code === 4902) {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: SEPOLIA_CHAIN_ID,
          chainName: 'Sepolia Testnet',
          nativeCurrency: {
            name: 'Sepolia ETH',
            symbol: 'ETH',
            decimals: 18
          },
          rpcUrls: [SEPOLIA_RPC_URL],
          blockExplorerUrls: ['https://sepolia.etherscan.io']
        }]
      });
    } else {
      console.error('Error switching to Sepolia network:', error);
      throw error;
    }
  }
};

/**
 * Check if wallet is connected to Sepolia network
 * @returns {boolean} True if connected to Sepolia
 */
export const isSepoliaNetwork = () => {
  return chainId === SEPOLIA_CHAIN_ID;
};

/**
 * Get current account
 * @returns {string|null} The current account address or null if not connected
 */
export const getAccount = () => {
  return currentAccount;
};

/**
 * Get current provider
 * @returns {ethers.providers.Web3Provider|null} The current provider or null if not connected
 */
export const getProvider = () => {
  return currentProvider;
};

/**
 * Get current signer
 * @returns {ethers.Signer|null} The current signer or null if not connected
 */
export const getSigner = () => {
  return currentSigner;
};

/**
 * Check if wallet is connected
 * @returns {boolean} True if wallet is connected
 */
export const getIsConnected = () => {
  return isConnected;
};

/**
 * Listen for wallet events
 * @param {string} event The event to listen for (accountsChanged, chainChanged, connect, disconnect)
 * @param {Function} handler The event handler
 */
export const onWalletEvent = (event, handler) => {
  if (eventHandlers[event]) {
    eventHandlers[event].push(handler);
  }
};

/**
 * Remove wallet event listener
 * @param {string} event The event to remove listener for
 * @param {Function} handler The event handler to remove
 */
export const offWalletEvent = (event, handler) => {
  if (eventHandlers[event]) {
    eventHandlers[event] = eventHandlers[event].filter(h => h !== handler);
  }
};

/**
 * Set up event listeners for wallet events
 */
const setupEventListeners = () => {
  // Handle accountsChanged event
  window.ethereum.on('accountsChanged', (accounts) => {
    if (accounts.length === 0) {
      // User disconnected their wallet
      currentAccount = null;
      currentSigner = null;
      isConnected = false;
      notifyEventHandlers('disconnect', {});
    } else {
      // User switched accounts
      currentAccount = accounts[0];
      currentSigner = currentProvider.getSigner();
      notifyEventHandlers('accountsChanged', { account: currentAccount });
    }
  });

  // Handle chainChanged event
  window.ethereum.on('chainChanged', (newChainId) => {
    chainId = newChainId;
    // Reload the page as recommended by MetaMask
    window.location.reload();
  });
};

/**
 * Notify event handlers of an event
 * @param {string} event The event to notify
 * @param {Object} data The event data
 */
const notifyEventHandlers = (event, data) => {
  if (eventHandlers[event]) {
    eventHandlers[event].forEach(handler => handler(data));
  }
}; 