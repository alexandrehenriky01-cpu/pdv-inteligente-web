import { describe, expect, it } from 'vitest';
import { getJwtExpiryMs } from './jwtExpiry';

function b64urlFromJson(obj: Record<string, unknown>): string {
  const json = JSON.stringify(obj);
  return Buffer.from(json, 'utf8').toString('base64url');
}

function fakeJwt(expSeconds: number): string {
  return `hdr.${b64urlFromJson({ exp: expSeconds })}.sig`;
}

describe('getJwtExpiryMs', () => {
  it('converte exp em milissegundos', () => {
    const exp = 1_700_000_000;
    expect(getJwtExpiryMs(fakeJwt(exp))).toBe(exp * 1000);
  });

  it('retorna null para token inválido', () => {
    expect(getJwtExpiryMs('')).toBeNull();
    expect(getJwtExpiryMs('not-a-jwt')).toBeNull();
  });
});
