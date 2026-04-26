/** Chaves e helpers mínimos — sem importar `api` (evita dependência circular). */

export const AUTH_TOKEN_KEY = '@PDVToken';
export const AUTH_REFRESH_TOKEN_KEY = '@PDVRefreshToken';
export const AUTH_USER_KEY = '@PDVUsuario';

export function clearStoredAuth(): void {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_REFRESH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
}
