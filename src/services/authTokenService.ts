import axios, { isAxiosError } from 'axios';
import { resolveApiBaseUrl } from './apiBaseUrl';
import { AUTH_REFRESH_TOKEN_KEY, AUTH_TOKEN_KEY, clearStoredAuth } from './authStorage';
import { getJwtExpiryMs } from './jwtExpiry';

export type RefreshResult =
  | { ok: true }
  | { ok: false; reason: 'no_refresh_token' | 'network' | 'invalid_session' | 'no_access_in_response' };

const bareClient = axios.create({ baseURL: resolveApiBaseUrl() });

let memoryAccessToken: string | null = null;
let memoryAccessExpiresAtMs: number | null = null;

let refreshPromise: Promise<RefreshResult> | null = null;

function normalizeStoredToken(raw: string | null): string | null {
  if (raw == null) return null;
  let t = raw.trim();
  if (t.startsWith('"') && t.endsWith('"')) {
    t = t.slice(1, -1).trim();
  }
  return t.length > 0 ? t : null;
}

function logRefresh(sucesso: boolean): void {
  console.warn('[AUTH][REFRESH]', { sucesso, timestamp: new Date().toISOString() });
}

type RefreshApiBody = {
  token?: string;
  accessToken?: string;
  refreshToken?: string;
};

export function getAccessToken(): string | null {
  if (memoryAccessToken) {
    return memoryAccessToken;
  }
  const fromStore = normalizeStoredToken(localStorage.getItem(AUTH_TOKEN_KEY));
  if (!fromStore) return null;
  memoryAccessToken = fromStore;
  memoryAccessExpiresAtMs = getJwtExpiryMs(fromStore);
  return fromStore;
}

export function setAccessToken(token: string, persist: boolean): void {
  const t = normalizeStoredToken(token);
  if (!t) {
    memoryAccessToken = null;
    memoryAccessExpiresAtMs = null;
    if (persist) {
      localStorage.removeItem(AUTH_TOKEN_KEY);
    }
    return;
  }
  memoryAccessToken = t;
  memoryAccessExpiresAtMs = getJwtExpiryMs(t);
  if (persist) {
    localStorage.setItem(AUTH_TOKEN_KEY, t);
  }
}

export function getRefreshToken(): string | null {
  return normalizeStoredToken(localStorage.getItem(AUTH_REFRESH_TOKEN_KEY));
}

export function setRefreshToken(token: string | null): void {
  if (!token || !normalizeStoredToken(token)) {
    localStorage.removeItem(AUTH_REFRESH_TOKEN_KEY);
    return;
  }
  localStorage.setItem(AUTH_REFRESH_TOKEN_KEY, token.trim());
}

export function syncAuthTokensFromStorage(): void {
  memoryAccessToken = null;
  memoryAccessExpiresAtMs = null;
  getAccessToken();
}

export function clearSessionTokens(): void {
  memoryAccessToken = null;
  memoryAccessExpiresAtMs = null;
  clearStoredAuth();
}

export function accessTokenExpiraEmMenosDe(ms: number): boolean {
  const token = getAccessToken();
  const exp = memoryAccessExpiresAtMs ?? (token ? getJwtExpiryMs(token) : null);
  if (exp == null) return false;
  return exp - Date.now() < ms;
}

async function executeRefresh(): Promise<RefreshResult> {
  const rt = getRefreshToken();
  if (!rt) {
    return { ok: false, reason: 'no_refresh_token' };
  }

  try {
    const { data } = await bareClient.post<RefreshApiBody>('/api/auth/refresh', {
      refreshToken: rt,
    });

    const newAccessRaw = data.accessToken ?? data.token;
    const newAccess = typeof newAccessRaw === 'string' ? newAccessRaw.trim() : '';
    if (!newAccess) {
      logRefresh(false);
      return { ok: false, reason: 'no_access_in_response' };
    }

    setAccessToken(newAccess, true);
    if (typeof data.refreshToken === 'string' && data.refreshToken.trim().length > 0) {
      setRefreshToken(data.refreshToken.trim());
    }

    logRefresh(true);
    return { ok: true };
  } catch (err: unknown) {
    logRefresh(false);
    if (isAxiosError(err) && err.response == null) {
      return { ok: false, reason: 'network' };
    }
    return { ok: false, reason: 'invalid_session' };
  }
}

/** Uma única renovação por vez; chamadas concorrentes aguardam a mesma Promise. */
export function refreshAccessToken(): Promise<RefreshResult> {
  if (refreshPromise) {
    return refreshPromise;
  }
  refreshPromise = executeRefresh().finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
}
