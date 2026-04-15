import { create } from 'zustand';
import type { CartItem, TotemMockProduto } from '../../totem/types';
import { calcularSubtotalLinhaDelivery } from '../../delivery/store/deliveryCartStore';

function arredondar2(n: number): number {
  return Math.round(n * 100) / 100;
}

function novoIdCarrinho(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `grc-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export interface PayloadAdicionarGarcom {
  produto: TotemMockProduto;
  quantidade: number;
  adicionais: Record<string, number>;
  observacao: string;
  subtotal: number;
}

interface GarcomCartStore {
  mesaNumero: number | null;
  carrinho: CartItem[];
  setMesaNumero: (n: number | null) => void;
  adicionarAoCarrinho: (payload: PayloadAdicionarGarcom) => void;
  removerDoCarrinho: (id: string) => void;
  alterarQuantidade: (id: string, delta: number) => void;
  limparCarrinho: () => void;
}

export const useGarcomCartStore = create<GarcomCartStore>((set) => ({
  mesaNumero: null,
  carrinho: [],

  setMesaNumero: (n) => set({ mesaNumero: n }),

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

export function selectTotalItensGarcom(s: GarcomCartStore): number {
  return s.carrinho.reduce((acc, item) => acc + item.quantidade, 0);
}

export function selectValorSubtotalGarcom(s: GarcomCartStore): number {
  return arredondar2(s.carrinho.reduce((acc, item) => acc + item.subtotal, 0));
}
