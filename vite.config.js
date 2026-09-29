import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { resolve } from 'node:path'

// Compila el frontend React (static/js/src) a un único archivo que Django sirve
// como archivo estático: static/js/dist/app.js
export default defineConfig({
  plugins: [react()],
  publicDir: false,
  build: {
    outDir: 'static/js/dist',
    emptyOutDir: true,
    cssCodeSplit: false,
    rollupOptions: {
      input: resolve(import.meta.dirname, 'static/js/src/main.jsx'),
      output: {
        format: 'iife',
        entryFileNames: 'app.js',
      },
    },
  },
})
