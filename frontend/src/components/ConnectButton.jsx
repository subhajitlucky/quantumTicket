import React from 'react';
import { useWallet } from '../hooks/useWallet';
// import '../components.css';

const ConnectButton = () => {
  const { isConnected, account, connectWallet, disconnectWallet, formatAddress } = useWallet();

  const handleClick = async () => {
    if (isConnected) {
      await disconnectWallet();
    } else {
      await connectWallet();
    }
  };

  return (
    <button 
      className="connect-button" 
      onClick={handleClick}
    >
      {isConnected ? `Connected: ${formatAddress(account)}` : 'Connect Wallet'}
    </button>
  );
};

export default ConnectButton; 