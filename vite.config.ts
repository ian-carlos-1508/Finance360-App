/* File: vite.config.ts */

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  
  server: {
    host: '0.0.0.0', // Keeps your existing setting
    port: 5173,      // Keeps your existing setting
    
    // ⬇️ ADD THIS PROXY BLOCK ⬇️
    proxy: {
      // Any request starting with /api is forwarded to the Backend Server
      '/api': {
        target: 'http://localhost:3000', // Must match your server/index.ts port
        changeOrigin: true,
        secure: false,
      },
    },
  }
})