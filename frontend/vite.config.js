import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Set base path - use root for Vercel
  base: '/',
  build: {
    // Use default esbuild minifier (faster and no extra dependencies)
    minify: 'esbuild',
    // Target modern browsers that support import attributes
    target: 'esnext',
    // Improve chunking for better caching
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ethers: ['ethers'],
          rainbowkit: ['@rainbow-me/rainbowkit', 'wagmi'],
        },
      },
    },
    // Set chunk size warning limit
    chunkSizeWarningLimit: 600,
    // Ensure source maps for debugging
    sourcemap: true,
  },
  // Define environment variables prefix
  envPrefix: 'VITE_',
  // Optimize dependencies
  optimizeDeps: {
    include: ['@rainbow-me/rainbowkit', 'wagmi', 'viem', '@tanstack/react-query'],
    esbuildOptions: {
      target: 'esnext',
    },
  },
})
