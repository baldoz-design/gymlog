import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { writeFileSync } from 'fs'

const BUILD_VERSION = Date.now().toString()

// Aggiorna qui prima di ogni commit che va in produzione
const RELEASE_NOTES = [
  'Riepilogo di fine allenamento con i miglioramenti rispetto alla volta scorsa',
  'Cambia esercizio: solo per oggi o da oggi nel programma',
  'Statistiche in home come infografica e animazioni più fluide',
  'Esercizi: filtro Tutti e salti di carico evidenziati nello storico',
]

function versionPlugin() {
  return {
    name: 'version-file',
    writeBundle() {
      writeFileSync(
        'dist/version.json',
        JSON.stringify({ v: BUILD_VERSION, notes: RELEASE_NOTES })
      )
    },
  }
}

export default defineConfig({
  plugins: [react(), versionPlugin()],
  define: {
    __APP_VERSION__: JSON.stringify(BUILD_VERSION),
  },
  base: process.env.NODE_ENV === 'production' ? '/gymlog/' : '/',
  server: {
    host: true,
    port: 5173,
  },
})
