/**
 * RC2.5x — PR-5 perf audit: gate de polling KDS baseado no estado do
 * Socket.io. Quando o WS está conectado, polling cai pra safety net
 * (catches missed events sem floodar /api/vendas/kds). Quando down,
 * mantém o ritmo rápido pra UX responsiva.
 *
 * Helper puro para facilitar teste e padronizar entre KdsPage e
 * KdsChamadaBalcaoPage.
 */

export type SocketStatus = 'idle' | 'connecting' | 'connected' | 'error';

export const KDS_POLL_FAST_MS = 10_000;
export const KDS_POLL_SAFETY_NET_MS = 60_000;

export function kdsPollIntervalMs(
  socketStatus: SocketStatus,
  opts?: { fastMs?: number; safetyNetMs?: number }
): number {
  const fast = opts?.fastMs ?? KDS_POLL_FAST_MS;
  const safetyNet = opts?.safetyNetMs ?? KDS_POLL_SAFETY_NET_MS;
  return socketStatus === 'connected' ? safetyNet : fast;
}
