import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': resolve(__dirname, './src') },
  },
  build: {
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) return 'react-vendor'
          if (id.includes('node_modules/react-router-dom/')) return 'router'
          if (id.includes('node_modules/zustand/') || id.includes('node_modules/@tanstack/')) return 'state'
          if (id.includes('node_modules/recharts/') || id.includes('node_modules/d3-')) return 'charts'
          if (id.includes('node_modules/date-fns/')) return 'utils'
          if (id.includes('node_modules/@supabase/')) return 'supabase'
        },
      },
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'zustand', 'recharts', 'date-fns'],
  },
})
