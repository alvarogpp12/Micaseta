import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// La SPA se sirve bajo /app/ y compila a public/app (la sirve la CDN/Fastify)
export default defineConfig({
  plugins: [react()],
  base: '/app/',
  build: { outDir: '../public/app', emptyOutDir: true },
  server: { proxy: { '/gapi': 'http://localhost:3000', '/papi': 'http://localhost:3000', '/api': 'http://localhost:3000', '/qr.png': 'http://localhost:3000' } },
});
