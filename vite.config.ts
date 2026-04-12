import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base relativo: necessário para Electron (file://) e assets em dist/
export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    port: 5173,
  },
});
