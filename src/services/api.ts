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
    let token = localStorage.getItem(AUTH_TOKEN_KEY);
    const url = config.url || '';

    if (token) {
      token = token.trim();
      if (token.startsWith('"') && token.endsWith('"')) {
        token = token.slice(1, -1);
        console.warn('[API] Token tinha aspas extras, removendo');
      }

      if (token.length > 0 && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
        if (url.includes('/contabilidade/') || url.includes('/dashboard/')) {
          console.log('[API Token enviado para:', url, '| Prefix:', token.substring(0, 30) + '...');
        }
      } else {
        console.warn('[API] Token vazio após trim para rota:', url);
      }
    } else {
      console.warn('[API] ATENÇÃO: Token NÃO encontrado no localStorage para rota:', url);
    }

    return config;
  },
  (error: AxiosError) => Promise.reject(error)
);

api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => {
    const status = error.response?.status;
    const url = String(error.config?.url || '');

    if (status === 401) {
      if (url.includes('/public/')) {
        return Promise.reject(error);
      }

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

    if (status === 403) {
      const errorData = error.response?.data as { error?: string; message?: string } | undefined;
      const errorCode = errorData?.error;

      if (errorCode === 'MODULE_NOT_LICENSED') {
        console.error('🚫 Módulo não contratado:', errorData?.message);
        alert(errorData?.message || 'Módulo não contratado para esta loja.');
      }
    }

    return Promise.reject(error);
  }
);
