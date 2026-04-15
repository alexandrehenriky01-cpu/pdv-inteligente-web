import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Base relativa obrigatória no Electron: `loadFile(dist/index.html)` resolve assets como `./assets/...`,
 * não `/assets/...` (raiz do disco em file://).
 */
export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    port: 5173,
  },
});
