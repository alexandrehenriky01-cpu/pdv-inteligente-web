import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartItem, TotemMockProduto } from '../../totem/types';
import type { AddressData } from '../../../hooks/useCep';

function arredondar2(n: number): number {
  return Math.round(n * 100) / 100;
}

function precoSaborComTamanhoRef(
  sabor: NonNullable<TotemMockProduto['saboresOpcoes']>[number],
  tamanhoNomeRef: string | undefined
): number {
  const ref = tamanhoNomeRef?.trim().toLowerCase();
  const ativos = sabor.tamanhos.filter((t) => t.ativo !== false);
  if (ativos.length > 0 && ref) {
    const hit = ativos.find((t) => t.nome.trim().toLowerCase() === ref);
    if (hit) return hit.preco;
  }
  if (ativos.length > 0) return ativos[0].preco;
  return sabor.precoVenda;
}

/** Valida pizza multi-sabor antes de montar payload ou finalizar. */
export function validarLinhasCarrinhoDelivery(carrinho: CartItem[]): string | null {
  for (const line of carrinho) {
    const p = line.produto;
    if (p.tipoItem === 'PIZZA' && p.permiteMultiplosSabores === true && (p.saboresOpcoes?.length ?? 0) > 0) {
      const n = line.saboresItemCardapioIds?.length ?? 0;
      if (n < 1) {
        return `Escolha ao menos um sabor para «${p.nome}».`;
      }
      const maxS = Math.min(20, Math.max(1, p.maxSabores ?? 1));
      if (n > maxS) {
        return `No máximo ${maxS} sabores para «${p.nome}».`;
      }
    }
  }
  return null;
}

export function calcularSubtotalLinhaDelivery(
  produto: TotemMockProduto,
  adicionais: Record<string, number>,
  quantidade: number,
  itemCardapioTamanhoId?: string | null,
  saboresItemCardapioIds?: string[]
): number {
  const tamanhosAtivos = produto.tamanhos.filter((t) => t.ativo !== false);
  const tNome =
    tamanhosAtivos.length > 0 && itemCardapioTamanhoId
      ? tamanhosAtivos.find((t) => t.id === itemCardapioTamanhoId)?.nome
      : undefined;

  let base = produto.precoBase;
  if (tamanhosAtivos.length > 0 && itemCardapioTamanhoId) {
    const tam = tamanhosAtivos.find((t) => t.id === itemCardapioTamanhoId);
    if (tam) base = tam.preco;
  }

  const multi =
    produto.tipoItem === 'PIZZA' &&
    produto.permiteMultiplosSabores === true &&
    (produto.saboresOpcoes?.length ?? 0) > 0 &&
    (saboresItemCardapioIds?.length ?? 0) > 0;

  if (multi && saboresItemCardapioIds) {
    const opcoes = produto.saboresOpcoes ?? [];
    let maxP = 0;
    for (const sid of saboresItemCardapioIds) {
      const s = opcoes.find((o) => o.id === sid);
      if (!s) continue;
      maxP = Math.max(maxP, precoSaborComTamanhoRef(s, tNome));
    }
    if (maxP > 0) base = maxP;
  }

  const extras = produto.adicionais.reduce((acc, ad) => {
    const q = adicionais[ad.id] ?? 0;
    return acc + ad.preco * q;
  }, 0);
  return arredondar2((base + extras) * quantidade);
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
                subtotal: calcularSubtotalLinhaDelivery(
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
