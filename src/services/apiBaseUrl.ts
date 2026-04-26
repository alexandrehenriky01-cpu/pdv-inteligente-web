/// <reference types="vite/client" />

/** Base URL da API sem barra final e sem duplicar `/api`. */
export function resolveApiBaseUrl(): string {
  const fallback = 'https://pdv-inteligente-api.onrender.com';
  const raw = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
  let base = raw && raw.length > 0 ? raw : fallback;
  base = base.replace(/\/+$/, '');
  if (base.endsWith('/api')) {
    base = base.slice(0, -4);
  }
  return base;
}
