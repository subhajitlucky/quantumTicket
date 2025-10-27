import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

import '@rainbow-me/rainbowkit/styles.css';
import { getDefaultWallets, RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { configureChains, createConfig, WagmiConfig } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { publicProvider } from 'wagmi/providers/public';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Debug logging
console.log('Environment Check:', {
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID,
  contractAddress: import.meta.env.VITE_CONTRACT_ADDRESS,
  mode: import.meta.env.MODE,
  dev: import.meta.env.DEV,
  prod: import.meta.env.PROD
});

// Create a query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});

const { chains, publicClient, webSocketPublicClient } = configureChains(
  [sepolia],
  [publicProvider()]
);

const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID';

if (!import.meta.env.VITE_WALLETCONNECT_PROJECT_ID) {
  console.warn('⚠️ VITE_WALLETCONNECT_PROJECT_ID is not set! Using fallback.');
}

const { connectors } = getDefaultWallets({
  appName: 'QuantumTicket',
  projectId,
  chains
});

console.log('Connectors initialized:', connectors.length);

const wagmiConfig = createConfig({
  autoConnect: true,
  connectors,
  publicClient,
  webSocketPublicClient,
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <WagmiConfig config={wagmiConfig}>
    <QueryClientProvider client={queryClient}>
      <RainbowKitProvider chains={chains}>
        <App />
      </RainbowKitProvider>
    </QueryClientProvider>
  </WagmiConfig>
)
