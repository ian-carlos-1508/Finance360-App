import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  
  // ⬅️ ADD THIS BLOCK ⬅️
  server: {
    host: '0.0.0.0', // This allows connections from external IPs (like Serveo/ngrok)
    port: 5173      // Optional: Explicitly set your port for clarity
  }
})