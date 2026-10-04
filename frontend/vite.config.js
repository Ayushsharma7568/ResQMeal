import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: [
      'lucide-react',
      'framer-motion',
      'leaflet',
      'react-leaflet',
      'recharts',
      'react-router-dom',
      'axios'
    ]
  }
})

