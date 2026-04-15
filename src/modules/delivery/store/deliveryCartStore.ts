import { create } from 'zustand';
import type { CartItem, TotemMockProduto } from '../../totem/types';

function arredondar2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function calcularSubtotalLinhaDelivery(
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
  return `dlv-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export interface PayloadAdicionarDelivery {
  produto: TotemMockProduto;
  quantidade: number;
  adicionais: Record<string, number>;
  observacao: string;
  subtotal: number;
}

interface DeliveryCartStore {
  carrinho: CartItem[];
  adicionarAoCarrinho: (payload: PayloadAdicionarDelivery) => void;
  removerDoCarrinho: (id: string) => void;
  alterarQuantidade: (id: string, delta: number) => void;
  limparCarrinho: () => void;
}

export const useDeliveryCartStore = create<DeliveryCartStore>((set) => ({
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
            subtotal: calcularSubtotalLinhaDelivery(item.produto, item.adicionais, q),
          };
        })
        .filter((x): x is CartItem => x !== null);
      return { carrinho: next };
    }),

  limparCarrinho: () => set({ carrinho: [] }),
}));

export function selectTotalItensDelivery(s: DeliveryCartStore): number {
  return s.carrinho.reduce((acc, item) => acc + item.quantidade, 0);
}

export function selectValorSubtotalCarrinhoDelivery(s: DeliveryCartStore): number {
  return arredondar2(s.carrinho.reduce((acc, item) => acc + item.subtotal, 0));
}
