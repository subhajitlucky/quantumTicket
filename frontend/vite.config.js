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
    // Improve chunking for better caching
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          rainbowkit: ['@rainbow-me/rainbowkit', 'wagmi', 'viem'],
          query: ['@tanstack/react-query'],
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
      // Node.js global to browser globalThis
      define: {
        global: 'globalThis'
      }
    }
  },
  // Add resolve configuration for better module resolution
  resolve: {
    alias: {
      // Add any aliases if needed in the future
    }
  },
  // Server configuration for development
  server: {
    port: 5173,
    strictPort: false,
  }
})
