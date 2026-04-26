import { api } from './api';
import { AUTH_USER_KEY } from './authStorage';
import {
  clearSessionTokens,
  getAccessToken,
  setAccessToken,
  setRefreshToken,
  syncAuthTokensFromStorage,
} from './authTokenService';
import { stopSessionRefreshScheduler } from './sessionRefreshScheduler';

/**
 * Reaplica o Bearer no cliente Axios a partir do localStorage (ex.: após F5).
 */
export function syncAxiosAuthorizationFromStorage(): void {
  syncAuthTokensFromStorage();
  const token = getAccessToken();
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
}

export function clearAuthSessionAndAxios(): void {
  stopSessionRefreshScheduler();
  clearSessionTokens();
  delete api.defaults.headers.common.Authorization;
}

export type PersistSessionResult =
  | { ok: true; usuario: Record<string, unknown> }
  | { ok: false; reason: string };

/**
 * Normaliza contratos comuns (token / accessToken / user / usuario) e persiste sessão segura para o JSON.
 */
export function persistSessionFromApiData(data: unknown): PersistSessionResult {
  if (!data || typeof data !== 'object') {
    return { ok: false, reason: 'Resposta inválida do servidor.' };
  }

  const d = data as Record<string, unknown>;
  const tokenRaw = d.token ?? d.accessToken ?? d.access_token;
  const token = typeof tokenRaw === 'string' && tokenRaw.length > 0 ? tokenRaw.trim() : undefined;

  const refreshRaw = d.refreshToken ?? d.refresh_token;
  const refreshTokenValue =
    typeof refreshRaw === 'string' && refreshRaw.trim().length > 0 ? refreshRaw.trim() : null;

  const usuarioRaw = d.usuario ?? d.user;
  if (!token) {
    return { ok: false, reason: 'Token não retornado pelo servidor.' };
  }
  if (!usuarioRaw || typeof usuarioRaw !== 'object') {
    return { ok: false, reason: 'Dados do usuário não retornados pelo servidor.' };
  }

  const u = usuarioRaw as Record<string, unknown>;
  const usuarioArmazenado: Record<string, unknown> = {
    id: u.id,
    nome: u.nome,
    email: u.email,
    role: u.role,
    lojaId: u.lojaId,
    codigo: u.codigo,
    username: u.username,
    ativo: u.ativo,
    permissoes: u.permissoes,
    permissions: u.permissions,
    modulosAtivos: u.modulosAtivos,
    featuresAtivas: u.featuresAtivas,
    statusLicenca: u.statusLicenca,
  };

  if (u.loja !== undefined) {
    usuarioArmazenado.loja = u.loja;
  }

  try {
    JSON.stringify(usuarioArmazenado);
  } catch {
    return { ok: false, reason: 'Dados do usuário não puderam ser serializados.' };
  }

  try {
    setRefreshToken(refreshTokenValue);
    setAccessToken(token, true);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(usuarioArmazenado));
  } catch {
    return { ok: false, reason: 'Não foi possível salvar a sessão localmente.' };
  }

  api.defaults.headers.common.Authorization = `Bearer ${token}`;

  return { ok: true, usuario: usuarioArmazenado };
}
