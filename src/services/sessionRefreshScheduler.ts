import { accessTokenExpiraEmMenosDe, getAccessToken, getRefreshToken, refreshAccessToken } from './authTokenService';

const PROACTIVE_WINDOW_MS = 2 * 60 * 1000;
const TICK_MS = 60 * 1000;

export const AUTH_SESSION_EXPIRED_EVENT = 'aurya-auth-session-expired';

/** ID do timer no browser (number); evita conflito com tipagem Node `Timeout`. */
let intervalId: number | null = null;

function dispatchSessionExpired(): void {
  window.dispatchEvent(new CustomEvent(AUTH_SESSION_EXPIRED_EVENT));
}

export function startSessionRefreshScheduler(): void {
  stopSessionRefreshScheduler();
  intervalId = window.setInterval(() => {
    if (!getRefreshToken()) return;
    if (!getAccessToken()) return;
    if (!accessTokenExpiraEmMenosDe(PROACTIVE_WINDOW_MS)) return;

    void refreshAccessToken().then((result) => {
      if (!result.ok && (result.reason === 'invalid_session' || result.reason === 'no_access_in_response')) {
        dispatchSessionExpired();
      }
    });
  }, TICK_MS);
}

export function stopSessionRefreshScheduler(): void {
  if (intervalId != null) {
    clearInterval(intervalId);
    intervalId = null;
  }
}
