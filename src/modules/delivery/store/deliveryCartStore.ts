import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartItem, TotemMockProduto } from '../../totem/types';
import type { AddressData } from '../../../hooks/useCep';
import {
  arredondar2,
  calcularSubtotalLinhaFood,
  validarLinhasCarrinhoFood,
} from '../../food/composition/foodItemComposition';

/** @deprecated use `validarLinhasCarrinhoFood` */
export const validarLinhasCarrinhoDelivery = validarLinhasCarrinhoFood;

/** @deprecated use `calcularSubtotalLinhaFood` */
export const calcularSubtotalLinhaDelivery = calcularSubtotalLinhaFood;

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
  itemCardapioTamanhoId?: string | null;
  partidoAoMeio?: boolean;
  saboresItemCardapioIds?: string[];
  subtotal: number;
}

interface DeliveryCartStore {
  carrinho: CartItem[];
  endereco: AddressData | null;
  adicionarAoCarrinho: (payload: PayloadAdicionarDelivery) => void;
  substituirLinhaCarrinho: (linhaId: string, payload: PayloadAdicionarDelivery) => void;
  removerDoCarrinho: (id: string) => void;
  alterarQuantidade: (id: string, delta: number) => void;
  limparCarrinho: () => void;
  setEndereco: (endereco: AddressData | null) => void;
}

export const useDeliveryCartStore = create<DeliveryCartStore>()(
  persist(
    (set) => ({
      carrinho: [],
      endereco: null,

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
              itemCardapioTamanhoId: payload.itemCardapioTamanhoId ?? null,
              partidoAoMeio: payload.partidoAoMeio === true,
              ...(payload.saboresItemCardapioIds && payload.saboresItemCardapioIds.length > 0
                ? { saboresItemCardapioIds: [...payload.saboresItemCardapioIds] }
                : {}),
              subtotal: arredondar2(payload.subtotal),
            },
          ],
        })),

      substituirLinhaCarrinho: (linhaId, payload) =>
        set((s) => ({
          carrinho: s.carrinho.map((item) => {
            if (item.id !== linhaId) return item;
            const next: CartItem = {
              id: linhaId,
              produto: payload.produto,
              quantidade: payload.quantidade,
              adicionais: { ...payload.adicionais },
              observacao: payload.observacao,
              itemCardapioTamanhoId: payload.itemCardapioTamanhoId ?? null,
              partidoAoMeio: payload.partidoAoMeio === true,
              subtotal: arredondar2(payload.subtotal),
            };
            if (payload.saboresItemCardapioIds && payload.saboresItemCardapioIds.length > 0) {
              next.saboresItemCardapioIds = [...payload.saboresItemCardapioIds];
            } else {
              delete next.saboresItemCardapioIds;
            }
            return next;
          }),
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
                subtotal: calcularSubtotalLinhaFood(
                  item.produto,
                  item.adicionais,
                  q,
                  item.itemCardapioTamanhoId,
                  item.saboresItemCardapioIds
                ),
              };
            })
            .filter((x): x is CartItem => x !== null);
          return { carrinho: next };
        }),

      limparCarrinho: () => set({ carrinho: [], endereco: null }),

      setEndereco: (endereco) => set({ endereco }),
    }),
    {
      name: 'delivery-cart',
      partialize: (state) => ({ carrinho: state.carrinho, endereco: state.endereco }),
    }
  )
);

export function selectTotalItensDelivery(s: DeliveryCartStore): number {
  return s.carrinho.reduce((acc, item) => acc + item.quantidade, 0);
}

export function selectValorSubtotalCarrinhoDelivery(s: DeliveryCartStore): number {
  return arredondar2(s.carrinho.reduce((acc, item) => acc + item.subtotal, 0));
}

export function selectEnderecoDelivery(s: DeliveryCartStore): AddressData | null {
  return s.endereco;
}
