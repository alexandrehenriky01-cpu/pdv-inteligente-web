import { describe, it, expect } from 'vitest';
import {
  kdsPollIntervalMs,
  KDS_POLL_FAST_MS,
  KDS_POLL_SAFETY_NET_MS,
  type SocketStatus,
} from './kdsPollUtils';

describe('kdsPollIntervalMs', () => {
  it('retorna safety-net (60s) quando socket está connected', () => {
    expect(kdsPollIntervalMs('connected')).toBe(KDS_POLL_SAFETY_NET_MS);
    expect(kdsPollIntervalMs('connected')).toBe(60_000);
  });

  it.each(['idle', 'connecting', 'error'] as SocketStatus[])(
    'retorna fast (10s) quando socket está %s',
    (status) => {
      expect(kdsPollIntervalMs(status)).toBe(KDS_POLL_FAST_MS);
      expect(kdsPollIntervalMs(status)).toBe(10_000);
    }
  );

  it('respeita overrides explícitos', () => {
    expect(kdsPollIntervalMs('connected', { safetyNetMs: 30_000 })).toBe(30_000);
    expect(kdsPollIntervalMs('idle', { fastMs: 5_000 })).toBe(5_000);
  });

  it('aplica override só do lado relevante', () => {
    // fastMs não afeta quando connected
    expect(kdsPollIntervalMs('connected', { fastMs: 1 })).toBe(KDS_POLL_SAFETY_NET_MS);
    // safetyNetMs não afeta quando disconnected
    expect(kdsPollIntervalMs('idle', { safetyNetMs: 999_999 })).toBe(KDS_POLL_FAST_MS);
  });
});
