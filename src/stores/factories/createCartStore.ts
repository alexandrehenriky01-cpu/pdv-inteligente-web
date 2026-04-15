/**
 * Factory para criação de stores de carrinho com Zustand.
 * Implementa o padrão Factory com Generics para permitir customização por tipo de item.
 * 
 * Cada store gerada é completamente isolada em memória (estado próprio).
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { arredondar2, novoIdCarrinho } from '../../utils/formatters';

// ==========================================
// TIPOS BASE
// ==========================================

export interface BaseCartItem {
  idOperacao: string;
  produtoId: string;
  nome: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
  observacao?: string;
}

export interface CartItemFiltro {
  produtoId?: string;
  texto?: string;
}

// ==========================================
// TIPOS DO ESTADO
// ==========================================

export interface CarrinhoEstado<T extends BaseCartItem> {
  itens: T[];
  observacaoGeral?: string;
  cupomDesconto?: string;
  valorDesconto: number;
  valorSubtotal: number;
  valorTotal: number;
  quantidadeTotalItens: number;
}

export interface CarrinhoAcoes<T extends BaseCartItem> {
  adicionarItem: (item: Omit<T, 'idOperacao' | 'valorTotal'>) => void;
  removerItem: (idOperacao: string) => void;
  limparCarrinho: () => void;
  alterarQuantidade: (idOperacao: string, delta: number) => void;
  definirQuantidade: (idOperacao: string, quantidade: number) => void;
  adicionarObservacaoItem: (idOperacao: string, observacao: string) => void;
  aplicarCupom: (codigo: string, percentual: number) => void;
  removerCupom: () => void;
  definirObservacaoGeral: (observacao: string) => void;
  obterItem: (idOperacao: string) => T | undefined;
  obterItensFiltrados: (filtro: CartItemFiltro) => T[];
  estaVazio: () => boolean;
  obterQuantidadeTotal: () => number;
  recalcularValores: () => void;
}

export type CarrinhoStore<T extends BaseCartItem> = CarrinhoEstado<T> & CarrinhoAcoes<T>;

// ==========================================
// CONFIGURAÇÕES
// ==========================================

export interface CartStoreConfig<T extends BaseCartItem> {
  name: string;
  onTotalChange?: (valorTotal: number) => void;
  maxItens?: number;
  devtools?: boolean;
  calcularValorTotalItem?: (quantidade: number, valorUnitario: number) => number;
}

// ==========================================
// FACTORY
// ==========================================

type StoreCreator<T extends BaseCartItem> = () => CarrinhoStore<T>;

export function createCartStore<T extends BaseCartItem>(
  config: CartStoreConfig<T>
): StoreCreator<T> {
  const {
    name,
    onTotalChange,
    maxItens = 50,
    devtools: enableDevtools = process.env.NODE_ENV !== 'production',
    calcularValorTotalItem,
  } = config;

  const calcularValorTotal = calcularValorTotalItem ?? ((qtd, val) => arredondar2(qtd * val));

  const initialState = {
    itens: [],
    observacaoGeral: undefined,
    cupomDesconto: undefined,
    valorDesconto: 0,
    valorSubtotal: 0,
    valorTotal: 0,
    quantidadeTotalItens: 0,
  };

  if (enableDevtools) {
    return create(
      devtools(
        (set, get) => ({
          ...initialState,

          adicionarItem: (item) => {
            const state = get();
            
            if (state.itens.length >= maxItens) {
              console.warn(`[${name}] Limite máximo de ${maxItens} itens atingido.`);
              return;
            }

            const itemExistente = state.itens.find((i) => i.produtoId === item.produtoId);

            if (itemExistente) {
              const novaQuantidade = itemExistente.quantidade + item.quantidade;
              const novoValorTotal = calcularValorTotal(novaQuantidade, itemExistente.valorUnitario);

              set((s) => ({
                itens: s.itens.map((i) =>
                  i.idOperacao === itemExistente.idOperacao
                    ? { ...i, quantidade: novaQuantidade, valorTotal: novoValorTotal }
                    : i
                ),
              }));
            } else {
              const idOperacao = novoIdCarrinho();
              const valorTotal = calcularValorTotal(item.quantidade, item.valorUnitario);
              const novoItem = { ...item, idOperacao, valorTotal } as T;

              set((s) => ({
                itens: [...s.itens, novoItem],
              }));
            }

            get().recalcularValores();
          },

          removerItem: (idOperacao) => {
            set((s) => ({
              itens: s.itens.filter((item) => item.idOperacao !== idOperacao),
            }));
            get().recalcularValores();
          },

          limparCarrinho: () => {
            set({ ...initialState });
          },

          alterarQuantidade: (idOperacao, delta) => {
            const item = get().itens.find((i) => i.idOperacao === idOperacao);
            if (!item) return;

            const novaQuantidade = item.quantidade + delta;
            if (novaQuantidade <= 0) {
              get().removerItem(idOperacao);
              return;
            }

            const novoValorTotal = calcularValorTotal(novaQuantidade, item.valorUnitario);
            set((s) => ({
              itens: s.itens.map((i) =>
                i.idOperacao === idOperacao
                  ? { ...i, quantidade: novaQuantidade, valorTotal: novoValorTotal }
                  : i
              ),
            }));
            get().recalcularValores();
          },

          definirQuantidade: (idOperacao, quantidade) => {
            if (quantidade <= 0) {
              get().removerItem(idOperacao);
              return;
            }

            const item = get().itens.find((i) => i.idOperacao === idOperacao);
            if (!item) return;

            const novoValorTotal = calcularValorTotal(quantidade, item.valorUnitario);
            set((s) => ({
              itens: s.itens.map((i) =>
                i.idOperacao === idOperacao
                  ? { ...i, quantidade, valorTotal: novoValorTotal }
                  : i
              ),
            }));
            get().recalcularValores();
          },

          adicionarObservacaoItem: (idOperacao, observacao) => {
            set((s) => ({
              itens: s.itens.map((i) =>
                i.idOperacao === idOperacao ? { ...i, observacao } : i
              ),
            }));
          },

          aplicarCupom: (codigo, percentual) => {
            const state = get();
            const desconto = arredondar2(state.valorSubtotal * (percentual / 100));
            const valorTotal = arredondar2(state.valorSubtotal - desconto);
            set({ cupomDesconto: codigo, valorDesconto: desconto, valorTotal });
            onTotalChange?.(valorTotal);
          },

          removerCupom: () => {
            const state = get();
            set({ cupomDesconto: undefined, valorDesconto: 0, valorTotal: state.valorSubtotal });
            onTotalChange?.(state.valorSubtotal);
          },

          definirObservacaoGeral: (observacao) => {
            set({ observacaoGeral: observacao });
          },

          obterItem: (idOperacao) => {
            return get().itens.find((i) => i.idOperacao === idOperacao);
          },

          obterItensFiltrados: (filtro) => {
            return get().itens.filter((item) => {
              if (filtro.produtoId && item.produtoId !== filtro.produtoId) return false;
              if (filtro.texto) {
                const textoLower = filtro.texto.toLowerCase();
                return item.nome.toLowerCase().includes(textoLower);
              }
              return true;
            });
          },

          estaVazio: () => get().itens.length === 0,

          obterQuantidadeTotal: () => {
            return get().itens.reduce((acc, item) => acc + item.quantidade, 0);
          },

          recalcularValores: () => {
            const state = get();
            const valorSubtotal = state.itens.reduce((acc, item) => acc + item.valorTotal, 0);
            const quantidadeTotalItens = state.itens.reduce((acc, item) => acc + item.quantidade, 0);
            let valorTotal = valorSubtotal;
            if (state.cupomDesconto) {
              valorTotal = arredondar2(valorSubtotal - state.valorDesconto);
            }
            set({
              valorSubtotal: arredondar2(valorSubtotal),
              valorTotal: arredondar2(valorTotal),
              quantidadeTotalItens,
            });
            onTotalChange?.(arredondar2(valorTotal));
          },
        }),
        { name }
      )
    ) as StoreCreator<T>;
  }

  return create((set, get) => ({
    ...initialState,

    adicionarItem: (item) => {
      const state = get();
      
      if (state.itens.length >= maxItens) {
        console.warn(`[${name}] Limite máximo de ${maxItens} itens atingido.`);
        return;
      }

      const itemExistente = state.itens.find((i) => i.produtoId === item.produtoId);

      if (itemExistente) {
        const novaQuantidade = itemExistente.quantidade + item.quantidade;
        const novoValorTotal = calcularValorTotal(novaQuantidade, itemExistente.valorUnitario);

        set((s) => ({
          itens: s.itens.map((i) =>
            i.idOperacao === itemExistente.idOperacao
              ? { ...i, quantidade: novaQuantidade, valorTotal: novoValorTotal }
              : i
          ),
        }));
      } else {
        const idOperacao = novoIdCarrinho();
        const valorTotal = calcularValorTotal(item.quantidade, item.valorUnitario);
        const novoItem = { ...item, idOperacao, valorTotal } as T;

        set((s) => ({
          itens: [...s.itens, novoItem],
        }));
      }

      get().recalcularValores();
    },

    removerItem: (idOperacao) => {
      set((s) => ({
        itens: s.itens.filter((item) => item.idOperacao !== idOperacao),
      }));
      get().recalcularValores();
    },

    limparCarrinho: () => {
      set({ ...initialState });
    },

    alterarQuantidade: (idOperacao, delta) => {
      const item = get().itens.find((i) => i.idOperacao === idOperacao);
      if (!item) return;

      const novaQuantidade = item.quantidade + delta;
      if (novaQuantidade <= 0) {
        get().removerItem(idOperacao);
        return;
      }

      const novoValorTotal = calcularValorTotal(novaQuantidade, item.valorUnitario);
      set((s) => ({
        itens: s.itens.map((i) =>
          i.idOperacao === idOperacao
            ? { ...i, quantidade: novaQuantidade, valorTotal: novoValorTotal }
            : i
        ),
      }));
      get().recalcularValores();
    },

    definirQuantidade: (idOperacao, quantidade) => {
      if (quantidade <= 0) {
        get().removerItem(idOperacao);
        return;
      }

      const item = get().itens.find((i) => i.idOperacao === idOperacao);
      if (!item) return;

      const novoValorTotal = calcularValorTotal(quantidade, item.valorUnitario);
      set((s) => ({
        itens: s.itens.map((i) =>
          i.idOperacao === idOperacao
            ? { ...i, quantidade, valorTotal: novoValorTotal }
            : i
        ),
      }));
      get().recalcularValores();
    },

    adicionarObservacaoItem: (idOperacao, observacao) => {
      set((s) => ({
        itens: s.itens.map((i) =>
          i.idOperacao === idOperacao ? { ...i, observacao } : i
        ),
      }));
    },

    aplicarCupom: (codigo, percentual) => {
      const state = get();
      const desconto = arredondar2(state.valorSubtotal * (percentual / 100));
      const valorTotal = arredondar2(state.valorSubtotal - desconto);
      set({ cupomDesconto: codigo, valorDesconto: desconto, valorTotal });
      onTotalChange?.(valorTotal);
    },

    removerCupom: () => {
      const state = get();
      set({ cupomDesconto: undefined, valorDesconto: 0, valorTotal: state.valorSubtotal });
      onTotalChange?.(state.valorSubtotal);
    },

    definirObservacaoGeral: (observacao) => {
      set({ observacaoGeral: observacao });
    },

    obterItem: (idOperacao) => {
      return get().itens.find((i) => i.idOperacao === idOperacao);
    },

    obterItensFiltrados: (filtro) => {
      return get().itens.filter((item) => {
        if (filtro.produtoId && item.produtoId !== filtro.produtoId) return false;
        if (filtro.texto) {
          const textoLower = filtro.texto.toLowerCase();
          return item.nome.toLowerCase().includes(textoLower);
        }
        return true;
      });
    },

    estaVazio: () => get().itens.length === 0,

    obterQuantidadeTotal: () => {
      return get().itens.reduce((acc, item) => acc + item.quantidade, 0);
    },

    recalcularValores: () => {
      const state = get();
      const valorSubtotal = state.itens.reduce((acc, item) => acc + item.valorTotal, 0);
      const quantidadeTotalItens = state.itens.reduce((acc, item) => acc + item.quantidade, 0);
      let valorTotal = valorSubtotal;
      if (state.cupomDesconto) {
        valorTotal = arredondar2(valorSubtotal - state.valorDesconto);
      }
      set({
        valorSubtotal: arredondar2(valorSubtotal),
        valorTotal: arredondar2(valorTotal),
        quantidadeTotalItens,
      });
      onTotalChange?.(arredondar2(valorTotal));
    },
  })) as StoreCreator<T>;
}
