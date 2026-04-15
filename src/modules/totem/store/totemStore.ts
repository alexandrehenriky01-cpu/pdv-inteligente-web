import { create } from 'zustand';
import type { CartItem, TotemMockProduto, TotemTipoConsumo } from '../types';

function arredondar2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function calcularSubtotalLinha(
  produto: TotemMockProduto,
  adicionais: Record<string, number>,
  quantidade: number
): number {
  const extras = produto.adicionais.reduce((acc, ad) => {
    const q = adicionais[ad.id] ?? 0;
    return acc + ad.preco * q;
  }, 0);
  return arredondar2((produto.precoBase + extras) * quantidade);
}

function novoIdCarrinho(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `totem-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export interface PayloadAdicionarCarrinho {
  produto: TotemMockProduto;
  quantidade: number;
  adicionais: Record<string, number>;
  observacao: string;
  /** Total da linha (base + extras) × quantidade — mesmo cálculo do ProductModal. */
  subtotal: number;
}

interface TotemStore {
  tipoConsumo: TotemTipoConsumo | null;
  setTipoConsumo: (t: TotemTipoConsumo) => void;
  fluxoIniciado: boolean;
  setFluxoIniciado: (v: boolean) => void;

  carrinho: CartItem[];
  adicionarAoCarrinho: (payload: PayloadAdicionarCarrinho) => void;
  removerDoCarrinho: (id: string) => void;
  alterarQuantidade: (id: string, delta: number) => void;
  limparCarrinho: () => void;

  resetSessaoTotem: () => void;
}

export const useTotemStore = create<TotemStore>((set) => ({
  tipoConsumo: null,
  setTipoConsumo: (t) => set({ tipoConsumo: t }),
  fluxoIniciado: false,
  setFluxoIniciado: (v) => set({ fluxoIniciado: v }),

  carrinho: [],

  adicionarAoCarrinho: (payload) =>
    set((s) => ({
      carrinho: [
        ...s.carrinho,
        {
          id: novoIdCarrinho(),
          produto: payload.produto,
          quantidade: payload.quantidade,
          adicionais: { ...payload.adicionais },
          observacao: payload.observacao,
          subtotal: arredondar2(payload.subtotal),
        },
      ],
    })),

  removerDoCarrinho: (id) =>
    set((s) => ({
      carrinho: s.carrinho.filter((item) => item.id !== id),
    })),

  alterarQuantidade: (id, delta) =>
    set((s) => {
      const next = s.carrinho
        .map((item) => {
          if (item.id !== id) return item;
          const q = item.quantidade + delta;
          if (q <= 0) return null;
          return {
            ...item,
            quantidade: q,
            subtotal: calcularSubtotalLinha(item.produto, item.adicionais, q),
          };
        })
        .filter((x): x is CartItem => x !== null);
      return { carrinho: next };
    }),

  limparCarrinho: () => set({ carrinho: [] }),

  resetSessaoTotem: () =>
    set({
      tipoConsumo: null,
      fluxoIniciado: false,
      carrinho: [],
    }),
}));

/** Soma das quantidades de todas as linhas do carrinho. */
export function selectTotalItens(s: TotemStore): number {
  return s.carrinho.reduce((acc, item) => acc + item.quantidade, 0);
}

/** Soma dos subtotais (valor total do pedido no carrinho). */
export function selectValorTotalCarrinho(s: TotemStore): number {
  return arredondar2(s.carrinho.reduce((acc, item) => acc + item.subtotal, 0));
}
