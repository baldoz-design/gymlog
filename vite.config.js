import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { writeFileSync } from 'fs'

const BUILD_VERSION = Date.now().toString()

// Aggiorna qui prima di ogni commit che va in produzione
const RELEASE_NOTES = [
  'Running: terzo tipo di lezione in home, segni la presenza e lo sforzo a fine allenamento',
  'Calendario: tocca un giorno passato per aggiungere una sessione Strength, Hybrid o Running',
  'Corretti lo splash iniziale e le schede degli esercizi che non si aprivano',
  'Statistiche, wrap e programma mostrano anche il Running',
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
