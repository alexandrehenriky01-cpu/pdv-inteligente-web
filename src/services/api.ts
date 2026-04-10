/// <reference types="vite/client" />
import axios, { InternalAxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';

export const api = axios.create({
  // 🚀 Com a referência na linha 1, o TypeScript agora reconhece o import.meta.env nativamente!
  baseURL: import.meta.env.VITE_API_URL || 'https://pdv-inteligente-api.onrender.com/api', 
});

// 🚀 INTERCEPTOR DE REQUISIÇÃO (Request)
// Injeta o Token salvo no LocalStorage em TODAS as chamadas automaticamente
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('@PDVToken'); 
    
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// 🛡️ INTERCEPTOR DE RESPOSTA (Response) - UPGRADE ENTERPRISE
// Proteção global contra Tokens expirados ou inválidos (Logout Automático)
api.interceptors.response.use(
  (response: AxiosResponse) => {
    // Se a requisição deu certo, apenas repassa a resposta para o componente
    return response; 
  },
  (error: AxiosError) => {
    // Se o backend responder com 401 (Unauthorized), significa que o Token morreu
    if (error.response && error.response.status === 401) {
      console.warn('⚠️ Sessão expirada ou Token inválido. Executando logout de segurança...');
      
      // 1. Limpa os vestígios da sessão morta
      localStorage.removeItem('@PDVToken');
      localStorage.removeItem('@PDVUsuario');
      
      // 2. Redireciona para a tela de Login
      if (window.location.pathname !== '/') {
        window.location.href = '/';
      }
    }
    
    // Repassa o erro para o bloco catch() do componente que fez a chamada
    return Promise.reject(error);
  }
);