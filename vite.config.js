import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/gymlog/',   // GitHub Pages: https://baldoz-design.github.io/gymlog/
  server: {
    host: true,   // ascolta su 0.0.0.0 → accessibile da mobile sulla stessa rete
    port: 5173,
  },
})
