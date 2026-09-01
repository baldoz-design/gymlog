import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: process.env.NODE_ENV === 'production' ? '/gymlog/' : '/',
  server: {
    host: true,   // ascolta su 0.0.0.0 → accessibile da mobile sulla stessa rete
    port: 5173,
  },
})
