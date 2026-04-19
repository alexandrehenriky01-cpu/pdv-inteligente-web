/// <reference types="vite/client" />
import axios, { InternalAxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { AUTH_TOKEN_KEY, clearStoredAuth } from './authStorage';

export function resolveApiBaseUrl(): string {
  const fallback = 'https://pdv-inteligente-api.onrender.com';              
  const raw = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
  let base = raw && raw.length > 0 ? raw : fallback;
  base = base.replace(/\/+$/, '');
  /* Evita /api/api/... quando VITE_API_URL já inclui o sufixo /api */
  if (base.endsWith('/api')) {
    base = base.slice(0, -4);
  }
  return base;
}

export const api = axios.create({
  baseURL: resolveApiBaseUrl(),
});

function isLoginPostRequest(config: InternalAxiosRequestConfig | undefined): boolean {
  if (!config) return false;
  const method = (config.method || 'get').toLowerCase();
  if (method !== 'post') return false;
  const url = String(config.url || '');
  return url === '/api/auth/login' || url.endsWith('/api/auth/login');
}

// Injeta o Token salvo no LocalStorage em todas as chamadas
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    const url = config.url || '';

    if (url.includes('/ia/')) {
      console.log('[API] Enviando requisição para:', url);
    }

    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
      if (url.includes('/ia/')) {
        console.log('[API] Token anexado:', !!token, '| Header:', config.headers.Authorization?.substring(0, 20) + '...');
      }
    } else if (url.includes('/ia/')) {
      console.warn('[API] ATENÇÃO: Token NÃO encontrado para rota:', url);
    }

    return config;
  },
  (error: AxiosError) => Promise.reject(error)
);

api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      const url = String(error.config?.url || '');

      if (url.includes('/public/')) {
        return Promise.reject(error);
      }

      // Credenciais inválidas no POST /api/auth/login — não limpar sessão anterior nem forçar redirect
      if (isLoginPostRequest(error.config)) {
        return Promise.reject(error);
      }

      console.warn('⚠️ Sessão expirada ou token inválido. Executando logout de segurança...');

      clearStoredAuth();
      delete api.defaults.headers.common.Authorization;

      const hashRoute = window.location.hash.replace(/^#/, '') || '/';
      const rotasPublicas = ['/', '/login', '/menu', '/menu/', '/menu/'];
      const isRotaPublica = rotasPublicas.some(r => hashRoute === r || hashRoute.startsWith(r + '/'));
      if (!isRotaPublica && hashRoute !== '/' && hashRoute !== '/login') {
        window.location.hash = '#/login';
      }
    }

    return Promise.reject(error);
  }
);
