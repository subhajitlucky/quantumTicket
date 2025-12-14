import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/',
  build: {
    minify: 'esbuild',
    target: 'esnext',
    sourcemap: false,
    chunkSizeWarningLimit: 2000,
    // Simplify rollup options to minimize memory usage
    rollupOptions: {
      output: {
        // Use default chunking - splitting creates overhead
        compact: true,
      },
      treeshake: false, // Disable tree-shaking to save memory (trade-off: larger bundle)
    },
  },
  envPrefix: 'VITE_',
})
