  import { defineConfig } from 'vite'
  import react from '@vitejs/plugin-react'

  // Isso "liga a mágica" do React moderno no nosso projeto!
  export default defineConfig({
    plugins: [react()],
    server: {
      port: 5173, // Fixamos a porta para facilitar a integração com o backend
    }
  })