/// <reference types="vitest/config" />
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

// En Docker el backend se llama `backend`; fuera de Docker, localhost.
const backend = process.env.VITE_BACKEND_URL ?? 'http://localhost:8000'

export default defineConfig({
  plugins: [
    // Rutas por archivos en src/routes (genera src/routeTree.gen.ts). Va antes de react().
    tanstackRouter({ target: 'react', autoCodeSplitting: true }),
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    tailwindcss(),
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    // Mismo origen para la API y el WebSocket: sin CORS en desarrollo.
    proxy: {
      '/api': backend,
      '/media': backend,
      '/ws': { target: backend, ws: true },
    },
    fs: { allow: ['..'] }, // brand/ está fuera de frontend/
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
})
