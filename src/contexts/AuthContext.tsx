import { type ReactNode } from 'react';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { toast } from 'react-toastify';
import {
  clearAuthSessionAndAxios,
  persistSessionFromApiData,
  type PersistSessionResult,
  syncAxiosAuthorizationFromStorage,
} from '../services/authSession';
import { AUTH_USER_KEY } from '../services/authStorage';
import {
  AUTH_SESSION_EXPIRED_EVENT,
  startSessionRefreshScheduler,
  stopSessionRefreshScheduler,
} from '../services/sessionRefreshScheduler';

export type UsuarioSessao = Record<string, unknown> | null;

type AuthContextValue = {
  usuario: UsuarioSessao;
  /** Consome o JSON bruto da API de login e atualiza storage + Axios + estado. */
  signInFromApiResponse: (data: unknown) => PersistSessionResult;
  logout: () => void;
  reloadUsuarioFromStorage: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<UsuarioSessao>(null);

  const reloadUsuarioFromStorage = useCallback(() => {
    syncAxiosAuthorizationFromStorage();
    const raw = localStorage.getItem(AUTH_USER_KEY);
    if (!raw) {
      setUsuario(null);
      return;
    }
    try {
      setUsuario(JSON.parse(raw) as Record<string, unknown>);
    } catch {
      clearAuthSessionAndAxios();
      setUsuario(null);
    }
  }, []);

  const logout = useCallback(() => {
    clearAuthSessionAndAxios();
    setUsuario(null);
  }, []);

  const signInFromApiResponse = useCallback((data: unknown) => {
    if (import.meta.env.DEV && data && typeof data === 'object') {
      const d = data as Record<string, unknown>;
      // eslint-disable-next-line no-console
      console.log('[Auth] Login OK', {
        hasUsuario: d.usuario != null || d.user != null,
        hasAccessToken: d.token != null || d.accessToken != null || d.access_token != null,
        hasRefreshToken: d.refreshToken != null || d.refresh_token != null,
      });
    }
    const result = persistSessionFromApiData(data);
    if (result.ok) {
      setUsuario(result.usuario);
    }
    return result;
  }, []);

  useEffect(() => {
    reloadUsuarioFromStorage();
  }, [reloadUsuarioFromStorage]);

  useEffect(() => {
    if (usuario) {
      startSessionRefreshScheduler();
    } else {
      stopSessionRefreshScheduler();
    }
  }, [usuario]);

  useEffect(() => {
    const onExpired = (): void => {
      toast.error('Sessão expirada. Faça login novamente.');
      logout();
    };
    window.addEventListener(AUTH_SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(AUTH_SESSION_EXPIRED_EVENT, onExpired);
  }, [logout]);

  const value = useMemo<AuthContextValue>(
    () => ({
      usuario,
      signInFromApiResponse,
      logout,
      reloadUsuarioFromStorage,
    }),
    [usuario, signInFromApiResponse, logout, reloadUsuarioFromStorage]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider.');
  }
  return ctx;
}
