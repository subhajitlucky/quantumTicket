import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { sepolia } from 'wagmi/chains';

// Get WalletConnect Project ID from environment
const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;

// Debug logging for production troubleshooting
if (!projectId) {
  console.error('❌ VITE_WALLETCONNECT_PROJECT_ID is not set!');
} else {
  console.log('✅ WalletConnect Project ID loaded:', projectId.substring(0, 8) + '...');
}

export const config = getDefaultConfig({
  appName: 'QuantumTicket - NFT Ticketing Platform',
  projectId: projectId,
  chains: [sepolia],
  ssr: false, // Not using server-side rendering
});
