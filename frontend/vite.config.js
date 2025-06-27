import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Use default esbuild minifier (faster and no extra dependencies)
    minify: 'esbuild',
    // Improve chunking for better caching
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ethers: ['ethers'],
        },
      },
    },
    // Set chunk size warning limit
    chunkSizeWarningLimit: 600,
  },
  // Define environment variables prefix
  envPrefix: 'VITE_',
})
