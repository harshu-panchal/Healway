import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'fs'
import path from 'path'

/**
 * Vite plugin: generates public/firebase-messaging-sw.js from the template,
 * injecting VITE_FIREBASE_* env vars so credentials never live in source control.
 */
function firebaseSwPlugin() {
  return {
    name: 'firebase-sw-inject',
    configResolved(config) {
      const templatePath = path.resolve(config.root, 'firebase-messaging-sw.template.js')
      const outputPath = path.resolve(config.root, 'public/firebase-messaging-sw.js')

      if (!fs.existsSync(templatePath)) return

      let content = fs.readFileSync(templatePath, 'utf-8')

      const keys = [
        'VITE_FIREBASE_API_KEY',
        'VITE_FIREBASE_AUTH_DOMAIN',
        'VITE_FIREBASE_PROJECT_ID',
        'VITE_FIREBASE_STORAGE_BUCKET',
        'VITE_FIREBASE_MESSAGING_SENDER_ID',
        'VITE_FIREBASE_APP_ID',
        'VITE_FIREBASE_MEASUREMENT_ID',
      ]

      for (const key of keys) {
        const value = config.env[key] || ''
        content = content.replaceAll(`__${key}__`, value)
      }

      fs.writeFileSync(outputPath, content, 'utf-8')
      console.log('✅ firebase-messaging-sw.js generated from template')
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
  plugins: [firebaseSwPlugin(), react(), tailwindcss()],
  server: {
    host: '0.0.0.0',
    port: 3000,
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
  }
})
