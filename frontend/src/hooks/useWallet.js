import { useEffect, useState } from 'react';
import { useAccount, useConnect, useDisconnect, useNetwork } from 'wagmi';
import { ethers } from 'ethers';

// Wrap wagmi hooks while keeping the same surface used elsewhere in the app.
export function useWallet() {
  const { address, isConnected } = useAccount();
  const { connectAsync, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { chain } = useNetwork();

  const [error, setError] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);

  useEffect(() => {
    // Rebuild ethers instances when connection state changes
    if (isConnected && typeof window !== 'undefined' && window.ethereum) {
      const ethersProvider = new ethers.providers.Web3Provider(window.ethereum, 'any');
      setProvider(ethersProvider);
      setSigner(ethersProvider.getSigner());
    } else {
      setProvider(null);
      setSigner(null);
    }
  }, [isConnected, address]);

  useEffect(() => {
    // Clear errors when wallet context updates
    setError(null);
  }, [address, chain?.id]);

  const connectWallet = async () => {
    try {
      setIsConnecting(true);
      setError(null);

      if (!connectors || connectors.length === 0) {
        throw new Error('No wallet connectors available');
      }

      const preferred = connectors.find((c) => c.id === 'injected') || connectors[0];
      const result = await connectAsync({ connector: preferred });

      return result.account;
    } catch (err) {
      console.error('Error connecting wallet:', err);
      const message = err?.message || String(err);
      setError(message);
      throw err;
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = async () => {
    try {
      await disconnect();
    } catch (err) {
      console.error('Error disconnecting wallet:', err);
      setError(err?.message || String(err));
    }
  };

  const formatAddress = (value) => {
    if (!value) return '';
    return `${value.slice(0, 6)}...${value.slice(-4)}`;
  };

  return {
    provider,
    signer,
    account: address || '',
    chainId: chain?.id || null,
    isConnected: Boolean(isConnected),
    isConnecting,
    error,
    connectWallet,
    disconnectWallet,
    formatAddress
  };
}