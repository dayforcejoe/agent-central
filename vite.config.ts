import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Use './' so all asset paths are relative — works for both
  // a root GitHub Pages site (username.github.io) and a
  // project site (username.github.io/repo-name)
  base: './',
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react':  ['react', 'react-dom', 'react-router-dom'],
          'vendor-charts': ['recharts'],
          'vendor-icons':  ['lucide-react'],
        },
      },
    },
  },
})
