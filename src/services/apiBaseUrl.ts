/// <reference types="vite/client" />

/**
 * Resolve a base URL da API para o ambiente de execução atual.
 *
 * Lote RC1.4 — runtime detection.
 *
 * Regras (precedência decrescente):
 *
 *   1. Electron desktop (userAgent "Electron"):
 *        SEMPRE `http://127.0.0.1:3333`.
 *        Não há override por `VITE_API_URL` — o app desktop é local-first
 *        por contrato; configurar host alternativo é responsabilidade do
 *        backend (.env: PORT) ou do shell (env AURYA_BACKEND_URL afeta
 *        apenas healthcheck do Electron, não da SPA).
 *
 *   2. Browser carregado de loopback (`127.0.0.1` ou `localhost`):
 *        SEMPRE `http://127.0.0.1:3333`.
 *        Cobre o caso de operador acessar `http://localhost:3000` direto
 *        no Chrome/Edge num PC com Aurya instalado.
 *
 *   3. Browser público (tracking de delivery, QR codes):
 *        usa `VITE_API_URL` se definido, senão cai no fallback cloud
 *        `https://pdv-inteligente-api.onrender.com`.
 *
 * Em todos os casos, normaliza removendo trailing slash e o sufixo
 * `/api` (que é appendado pelos clientes axios via path relativo).
 */

const LOCAL_API = 'http://127.0.0.1:3333';
const CLOUD_FALLBACK = 'https://pdv-inteligente-api.onrender.com';

function normalize(base: string): string {
  let b = base.replace(/\/+$/, '');
  if (b.endsWith('/api')) {
    b = b.slice(0, -4);
  }
  return b;
}

function isElectronRuntime(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return /\bElectron\//i.test(ua);
}

function isLoopbackHost(hostname: string): boolean {
  return (
    hostname === '127.0.0.1' ||
    hostname === 'localhost' ||
    hostname === '0.0.0.0' ||
    hostname === '::1' ||
    hostname === '' // SSR / file://
  );
}

export function resolveApiBaseUrl(): string {
  // 1) Electron sempre local.
  if (isElectronRuntime()) {
    return normalize(LOCAL_API);
  }

  // 2) Browser loopback sempre local.
  const hostname =
    typeof window !== 'undefined' && window.location ? window.location.hostname : '';
  if (isLoopbackHost(hostname)) {
    return normalize(LOCAL_API);
  }

  // 3) Browser público (cliente final em delivery tracking) — usa env ou cloud.
  const envBase = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
  const base = envBase && envBase.length > 0 ? envBase : CLOUD_FALLBACK;
  return normalize(base);
}
