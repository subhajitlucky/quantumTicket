import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useWallet } from './useWallet';
import QuantumTicketABI from '../contracts/QuantumTicket.json';

const SEPOLIA_CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS;

// Contract addresses for different networks
const CONTRACT_ADDRESSES = {
  11155111: SEPOLIA_CONTRACT_ADDRESS, // Sepolia (required)
  80001: import.meta.env.VITE_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000',   // Mumbai (placeholder)
};

export function useContract() {
  const [contract, setContract] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isOwner, setIsOwner] = useState(false);
  
  const { signer, account, chainId, isConnected } = useWallet();

  useEffect(() => {
    const initializeContract = async () => {
      try {
        setIsLoading(true);
        setError(null);

        if (!isConnected || !signer || !chainId) {
          setContract(null);
          setIsLoading(false);
          return;
        }

        // Check if we're on a supported network
        if (!CONTRACT_ADDRESSES[chainId]) {
          throw new Error(`Unsupported network. Please switch to Sepolia or Mumbai testnet.`);
        }
        if (chainId === 11155111 && !SEPOLIA_CONTRACT_ADDRESS) {
          throw new Error('VITE_CONTRACT_ADDRESS (Sepolia) is not set');
        }

        const contractAddress = CONTRACT_ADDRESSES[chainId];
        const contractInstance = new ethers.Contract(
          contractAddress,
          QuantumTicketABI.abi,
          signer
        );

        setContract(contractInstance);

        // Check if the current account is the owner
        if (account) {
          const owner = await contractInstance.owner();
          setIsOwner(owner.toLowerCase() === account.toLowerCase());
        }
      } catch (err) {
        console.error('Error initializing contract:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    initializeContract();
  }, [signer, account, chainId, isConnected]);

  // Function to test if the contract is working properly
  const testContractDeployment = async () => {
    if (!contract) {
      throw new Error('Contract not initialized');
    }

    // Call a simple read-only function to test if contract is deployed correctly
    try {
      const owner = await contract.owner();
      return {
        owner,
        isOwner: owner.toLowerCase() === account?.toLowerCase()
      };
    } catch (err) {
      console.error('Error testing contract:', err);
      throw new Error(err.message || 'Failed to test contract');
    }
  };

  // Function to mint a ticket
  const mintNewTicket = async (eventName, eventDate, venue, price, uri) => {
    if (!contract) {
      throw new Error('Contract not initialized');
    }

    if (!isOwner) {
      throw new Error('Only the contract owner can mint tickets');
    }

    try {
      // Validate the timestamp is in the future
      const now = Math.floor(Date.now() / 1000);
      if (eventDate <= now) {
        throw new Error('Event date must be in the future');
      }

      // Call the mintTicket function with the account address as the recipient
      const tx = await contract.mintTicket(
        account,
        eventName,
        eventDate,
        venue,
        price,
        uri
      );

      // Wait for the transaction to be mined
      await tx.wait();
      return tx;
    } catch (err) {
      console.error('Error minting ticket:', err);
      throw new Error(err.message || 'Failed to mint ticket');
    }
  };

  return {
    contract,
    isLoading,
    error,
    isOwner,
    testContractDeployment,
    mintNewTicket
  };
} 