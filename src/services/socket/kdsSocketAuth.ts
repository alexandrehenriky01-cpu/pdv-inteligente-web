import { AUTH_TOKEN_KEY, AUTH_USER_KEY } from '../authStorage';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Auth do handshake Socket.io alinhado ao `socketAuthMiddleware` do backend.
 * Envia `lojaSalaId` sempre que houver `lojaId` válido no usuário (não só SUPER_ADMIN),
 * para ingressar na sala correta e receber `novo-pedido-cozinha` / `status-pedido-atualizado`.
 */
export function buildKdsSocketAuth(): { token: string; lojaSalaId?: string } | null {
  const token = localStorage.getItem(AUTH_TOKEN_KEY)?.trim();
  if (!token) return null;

  let lojaSalaId: string | undefined;

  try {
    const raw = localStorage.getItem(AUTH_USER_KEY);
    if (raw) {
      const u = JSON.parse(raw) as { role?: string; lojaId?: string | null };
      const lid = u.lojaId?.trim();
      if (lid && UUID_RE.test(lid)) {
        lojaSalaId = lid;
      }
      if (u.role === 'SUPER_ADMIN' && !lojaSalaId) {
        const env = (import.meta.env.VITE_KDS_LOJA_SALA_ID as string | undefined)?.trim();
        if (env && UUID_RE.test(env)) lojaSalaId = env;
      }
    }
  } catch {
    /* ignore */
  }

  return lojaSalaId ? { token, lojaSalaId } : { token };
}
