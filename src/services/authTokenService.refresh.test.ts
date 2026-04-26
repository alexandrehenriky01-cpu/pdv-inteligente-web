import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { postMock } = vi.hoisted(() => ({ postMock: vi.fn() }));

vi.mock('axios', async (importOriginal) => {
  const mod = await importOriginal<typeof import('axios')>();
  return {
    ...mod,
    default: Object.assign(mod.default, {
      create: vi.fn(() => ({ post: postMock })),
    }),
  };
});

import { clearSessionTokens, refreshAccessToken, setAccessToken, setRefreshToken } from './authTokenService';

function createMemoryStorage(): Storage {
  const memory: Record<string, string> = {};
  return {
    get length() {
      return Object.keys(memory).length;
    },
    clear(): void {
      for (const k of Object.keys(memory)) delete memory[k];
    },
    getItem(key: string): string | null {
      return memory[key] ?? null;
    },
    key(index: number): string | null {
      return Object.keys(memory)[index] ?? null;
    },
    removeItem(key: string): void {
      delete memory[key];
    },
    setItem(key: string, value: string): void {
      memory[key] = value;
    },
  };
}

describe('refreshAccessToken', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createMemoryStorage());
    postMock.mockReset();
    postMock.mockResolvedValue({ data: { accessToken: 'novo-access', refreshToken: 'novo-refresh' } });
    setRefreshToken('refresh-inicial');
    setAccessToken('access-inicial', true);
  });

  afterEach(() => {
    clearSessionTokens();
    vi.unstubAllGlobals();
  });

  it('serializa chamadas concorrentes em um único POST /refresh', async () => {
    const results = await Promise.all([refreshAccessToken(), refreshAccessToken(), refreshAccessToken()]);
    expect(results.every((r) => r.ok)).toBe(true);
    expect(postMock).toHaveBeenCalledTimes(1);
    expect(postMock).toHaveBeenCalledWith('/api/auth/refresh', { refreshToken: 'refresh-inicial' });
  });
});
