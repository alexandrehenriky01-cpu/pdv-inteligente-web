/** Lê `exp` do JWT (segundo payload) sem validar assinatura — apenas dica de expiração no cliente. */
export function getJwtExpiryMs(token: string): number | null {
  const trimmed = token.trim();
  if (!trimmed) return null;
  const parts = trimmed.split('.');
  if (parts.length < 2) return null;
  try {
    const payload = parts[1];
    const b64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const pad = (4 - (b64.length % 4)) % 4;
    const padded = b64 + '='.repeat(pad);
    const json = JSON.parse(atob(padded)) as { exp?: unknown };
    if (typeof json.exp !== 'number' || !Number.isFinite(json.exp)) return null;
    return json.exp * 1000;
  } catch {
    return null;
  }
}
