import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import {
  clearSessionTokens,
  getAccessToken,
  getRefreshToken,
  refreshAccessToken,
} from './authTokenService';
import { resolveApiBaseUrl } from './apiBaseUrl';
import { AUTH_SESSION_EXPIRED_EVENT } from './sessionRefreshScheduler';

export { resolveApiBaseUrl } from './apiBaseUrl';

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

function isAuthRefreshRequest(config: InternalAxiosRequestConfig | undefined): boolean {
  if (!config) return false;
  const url = String(config.url || '');
  return url === '/api/auth/refresh' || url.endsWith('/api/auth/refresh');
}

function redirectToLoginIfNeeded(): void {
  const hashRoute = window.location.hash.replace(/^#/, '') || '/';
  const rotasPublicas = ['/', '/login', '/menu', '/menu/', '/menu/'];
  const isRotaPublica = rotasPublicas.some((r) => hashRoute === r || hashRoute.startsWith(r + '/'));
  if (!isRotaPublica && hashRoute !== '/' && hashRoute !== '/login') {
    window.location.hash = '#/login';
  }
}

function notifySessionExpired(): void {
  window.dispatchEvent(new CustomEvent(AUTH_SESSION_EXPIRED_EVENT));
}

function performUnauthorizedLogout(): void {
  clearSessionTokens();
  delete api.defaults.headers.common.Authorization;
  notifySessionExpired();
  redirectToLoginIfNeeded();
}

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    } else if (import.meta.env.DEV && !token && config.url && !String(config.url).includes('/public/')) {
      console.warn('[API] Requisição sem access token:', config.url);
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error)
);

api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const status = error.response?.status;
    const originalRequest = error.config;

    if (status === 403) {
      const errorData = error.response?.data as { error?: string; message?: string } | undefined;
      const errorCode = errorData?.error;

      if (errorCode === 'MODULE_NOT_LICENSED') {
        console.error('Módulo não contratado:', errorData?.message);
        alert(errorData?.message || 'Módulo não contratado para esta loja.');
      }
    }

    if (status !== 401) {
      return Promise.reject(error);
    }

    if (!originalRequest) {
      return Promise.reject(error);
    }

    const url = String(originalRequest.url || '');

    if (url.includes('/public/')) {
      return Promise.reject(error);
    }

    if (isLoginPostRequest(originalRequest)) {
      return Promise.reject(error);
    }

    if (isAuthRefreshRequest(originalRequest)) {
      performUnauthorizedLogout();
      return Promise.reject(error);
    }

    if (originalRequest._retry) {
      performUnauthorizedLogout();
      return Promise.reject(error);
    }

    if (!getRefreshToken()) {
      performUnauthorizedLogout();
      return Promise.reject(error);
    }

    originalRequest._retry = true;
    const refresh = await refreshAccessToken();

    if (refresh.ok) {
      const token = getAccessToken();
      if (originalRequest.headers && token) {
        originalRequest.headers.Authorization = `Bearer ${token}`;
      }
      if (token) {
        api.defaults.headers.common.Authorization = `Bearer ${token}`;
      }
      return api(originalRequest);
    }

    if (refresh.reason === 'network') {
      originalRequest._retry = false;
      return Promise.reject(error);
    }

    performUnauthorizedLogout();
    return Promise.reject(error);
  }
);
