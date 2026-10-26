import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { writeFileSync } from 'fs'

const BUILD_VERSION = Date.now().toString()

// Aggiorna qui prima di ogni commit che va in produzione
const RELEASE_NOTES = [
  'Lezioni Hybrid: in home scegli Strength o Hybrid, il giorno della settimana ricorda cosa hai fatto',
  'Hybrid: conti le stazioni partendo da quella libera, scegli l\'alternativa e togli un clic sbagliato con il meno',
  'Riepilogo Hybrid con stazioni, giri, sforzo complessivo e record',
  'Statistiche, wrap, calendario e programma mostrano anche le lezioni Hybrid',
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
