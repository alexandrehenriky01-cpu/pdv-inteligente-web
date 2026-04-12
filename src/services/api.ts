/// <reference types="vite/client" />
import axios, { InternalAxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { AUTH_TOKEN_KEY, clearStoredAuth } from './authStorage';

function resolveApiBaseUrl(): string {
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
  return url === '/api/login' || url.endsWith('/api/login');
}

// Injeta o Token salvo no LocalStorage em todas as chamadas
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);

    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error: AxiosError) => Promise.reject(error)
);

api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Credenciais inválidas no POST /api/login — não limpar sessão anterior nem forçar redirect
      if (isLoginPostRequest(error.config)) {
        return Promise.reject(error);
      }

      console.warn('⚠️ Sessão expirada ou token inválido. Executando logout de segurança...');

      clearStoredAuth();
      delete api.defaults.headers.common.Authorization;

      const path = window.location.pathname;
      if (path !== '/' && path !== '/login') {
        window.location.href = '/';
      }
    }

    return Promise.reject(error);
  }
);
