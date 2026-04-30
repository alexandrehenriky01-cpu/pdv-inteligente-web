import { resolveApiBaseUrl } from '../services/apiBaseUrl';

/**
 * URL absoluta para exibir imagem do cardápio no browser.
 * - `data:` inalterado.
 * - `/uploads/...` → base da API (`VITE_API_URL` / `resolveApiBaseUrl`).
 * - `http(s)://.../uploads/...` (qualquer host, ex.: legado `localhost:3333`) → mesma API atual
 *   (evita ERR_CONNECTION_REFUSED e mixed content em HTTPS).
 * - Demais URLs http(s) (Pexels, etc.) permanecem.
 */
export function resolveCardapioImageUrl(url: string | null | undefined): string {
  if (url == null) return '';
  const raw = String(url).trim();
  if (!raw) return '';

  if (raw.startsWith('data:')) return raw;

  const base = resolveApiBaseUrl().replace(/\/$/, '');

  if (raw.startsWith('/uploads/')) {
    if (raw.includes('..')) return '';
    return `${base}${raw}`;
  }

  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    try {
      const u = new URL(raw);
      if (u.pathname.startsWith('/uploads/') && !u.pathname.includes('..')) {
        return `${base}${u.pathname}${u.search}${u.hash}`;
      }
    } catch {
      return raw;
    }
    // Upgrade http → https to prevent mixed-content errors in production.
    if (raw.startsWith('http://')) {
      return raw.replace(/^http:\/\//, 'https://');
    }
    return raw;
  }

  const normalized = raw.replace(/^\/+/, '');
  return `${base}/${normalized}`;
}
