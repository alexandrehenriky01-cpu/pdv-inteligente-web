import { type ReactNode } from 'react';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  clearAuthSessionAndAxios,
  persistSessionFromApiData,
  type PersistSessionResult,
  syncAxiosAuthorizationFromStorage,
} from '../services/authSession';
import { AUTH_USER_KEY } from '../services/authStorage';

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

  useEffect(() => {
    reloadUsuarioFromStorage();
  }, [reloadUsuarioFromStorage]);

  const signInFromApiResponse = useCallback((data: unknown) => {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.log('Resposta da API no Login:', data);
    }
    const result = persistSessionFromApiData(data);
    if (result.ok) {
      setUsuario(result.usuario);
    }
    return result;
  }, []);

  const logout = useCallback(() => {
    clearAuthSessionAndAxios();
    setUsuario(null);
  }, []);

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
