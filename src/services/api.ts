// src/services/api.ts
import axios from 'axios';

export const api = axios.create({
  // Em produção, isso virá do arquivo .env (ex: import.meta.env.VITE_API_URL)
   baseURL: 'https://pdv-inteligente-api.onrender.com', 
});

// Interceptor: Pega o Token salvo no LocalStorage e injeta em TODAS as requisições
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('@SeuApp:token'); // Ajuste para a chave que você usa
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  return config;
});
