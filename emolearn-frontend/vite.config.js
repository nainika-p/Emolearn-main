import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/analyze': 'http://localhost:5000',
      '/correct': 'http://localhost:5000',
      '/confirm': 'http://localhost:5000',
      '/history': 'http://localhost:5000',
      '/stats': 'http://localhost:5000',
      '/dashboard': 'http://localhost:5000',
      '/chat':     'http://localhost:5000',
    }
  }
})