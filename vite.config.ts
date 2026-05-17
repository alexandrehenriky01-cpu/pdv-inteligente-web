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
    proxy: {
      '/api': {
        target: 'http://localhost:3333',
        changeOrigin: true,
      },
    },
  },
  build: {
    // RC2.5x — PR-10 perf audit: manualChunks separa libs grandes do
    // app bundle. Reduz o chunk gigante (~2.7MB) em pedaços cacháveis
    // independentes — vendor JS muda raramente, app JS muda em todo
    // deploy. Conversão de imports → lazy() fica para outro PR (escopo
    // grande: 98 imports em App.tsx).
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-icons': ['lucide-react'],
          'vendor-socket': ['socket.io-client'],
          'vendor-misc': ['qrcode.react', 'react-toastify'],
        },
      },
    },
    // O warning "chunks larger than 500 kB" some quando manualChunks
    // separa as libs; mantém o limit padrão.
  },
});
