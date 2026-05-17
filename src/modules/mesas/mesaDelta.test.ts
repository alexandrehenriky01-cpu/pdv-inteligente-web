import { describe, it, expect } from 'vitest';
import { extractMesaDelta, applyMesaDelta } from './mesaDelta';
import type { MesaApi } from './types';

const mesaBase = (overrides?: Partial<MesaApi>): MesaApi => ({
  id: `id-${overrides?.numero ?? 1}`,
  numero: 1,
  status: 'LIVRE',
  itens: [],
  ...overrides,
});

const itemSample = {
  id: 'it-1',
  quantidade: 2,
  valorTotal: 25,
  observacao: null,
  produto: { id: 'p1', nome: 'Pizza' },
};

describe('extractMesaDelta', () => {
  it('retorna null quando payload é null/undefined', () => {
    expect(extractMesaDelta(null)).toBeNull();
    expect(extractMesaDelta(undefined)).toBeNull();
  });

  it('retorna null quando payload não tem `mesa`', () => {
    expect(extractMesaDelta({ lojaId: 'x', numeroMesa: 1, motivo: 'adicionar' })).toBeNull();
  });

  it('retorna null quando mesa.numero não é número', () => {
    expect(extractMesaDelta({ mesa: { numero: 'foo' } })).toBeNull();
    expect(extractMesaDelta({ mesa: {} })).toBeNull();
  });

  it('parseia mesa rica corretamente', () => {
    const delta = extractMesaDelta({
      mesa: {
        id: 'id-1',
        numero: 5,
        status: 'OCUPADA',
        itens: [itemSample],
        pendenciaFechamento: null,
      },
    });
    expect(delta).toEqual({
      numero: 5,
      status: 'OCUPADA',
      itens: [itemSample],
      pendenciaFechamento: null,
    });
  });

  it('mantém `undefined` para campos ausentes (não sobrescreve)', () => {
    const delta = extractMesaDelta({ mesa: { numero: 3 } });
    expect(delta).toEqual({
      numero: 3,
      status: undefined,
      itens: undefined,
      pendenciaFechamento: undefined,
    });
  });
});

describe('applyMesaDelta', () => {
  it('faz merge correto quando mesa já está na lista', () => {
    const prev = [mesaBase({ numero: 1 }), mesaBase({ id: 'id-2', numero: 2 })];
    const { next, needsRefetch } = applyMesaDelta(prev, {
      numero: 2,
      status: 'OCUPADA',
      itens: [itemSample],
    });
    expect(needsRefetch).toBe(false);
    expect(next[0]).toBe(prev[0]); // mesa 1 inalterada (mesma ref)
    expect(next[1]).toEqual({
      id: 'id-2',
      numero: 2,
      status: 'OCUPADA',
      itens: [itemSample],
    });
  });

  it('preserva campos não-presentes no delta (status undefined)', () => {
    const prev = [mesaBase({ numero: 1, status: 'OCUPADA', itens: [itemSample] })];
    const { next } = applyMesaDelta(prev, { numero: 1, pendenciaFechamento: null });
    expect(next[0].status).toBe('OCUPADA');
    expect(next[0].itens).toEqual([itemSample]);
  });

  it('sinaliza refetch quando mesa não está na lista', () => {
    const prev = [mesaBase({ numero: 1 })];
    const result = applyMesaDelta(prev, { numero: 99, status: 'OCUPADA' });
    expect(result.needsRefetch).toBe(true);
    expect(result.next).toBe(prev); // ref inalterada
  });

  it('aplica pendenciaFechamento=null (limpeza)', () => {
    const prev = [
      mesaBase({
        numero: 1,
        pendenciaFechamento: {
          subtotal: 100, taxaServico: 0, incluiTaxaServico: false,
          total: 100, pessoas: 1, valorPorPessoa: 100,
          solicitadoEm: '2026-05-17', itens: [],
        },
      }),
    ];
    const { next } = applyMesaDelta(prev, { numero: 1, pendenciaFechamento: null });
    expect(next[0].pendenciaFechamento).toBeNull();
  });
});
