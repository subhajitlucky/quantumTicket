import React from 'react';
import { ConnectButton as RKConnectButton } from '@rainbow-me/rainbowkit';

// Thin wrapper so other parts of the app keep importing the same component
const ConnectButton = () => {
  return <RKConnectButton />;
};

export default ConnectButton;