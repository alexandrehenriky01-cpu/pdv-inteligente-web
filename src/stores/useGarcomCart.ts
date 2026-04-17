/**
 * Store de Carrinho para o módulo Garçom/Comandas.
 */

import { create } from 'zustand';
import { createCartStore, BaseCartItem } from './factories/createCartStore';
import { arredondar2 } from '../utils/formatters';

export interface GarcomCartItem extends BaseCartItem {
  observacao?: string;
  comandaId?: string;
}

export interface MesaInfo {
  id: string;
  numero: number;
  nome?: string;
  capacidade?: number;
}

export interface GarcomAdicionarItemPayload {
  produtoId: string;
  nome: string;
  quantidade: number;
  valorUnitario: number;
  observacao?: string;
  comandaId?: string;
}

const useGarcomCartBase = createCartStore<GarcomCartItem>({
  name: 'garcom-cart',
  maxItens: 100,
  calcularValorTotalItem: (qtd, val) => arredondar2(qtd * val),
  onTotalChange: (valor) => console.log('[GarcomCart] Total:', valor),
});

export const useGarcomCart = useGarcomCartBase;

interface GarcomMesaState {
  mesaAtual: MesaInfo | null;
  garcomResponsavelId: string | null;
  garcomResponsavelNome: string | null;
  horaAbertura: Date | null;
  observacoesGerais: string[];
}

interface GarcomMesaActions {
  definirMesa: (mesa: MesaInfo) => void;
  removerMesa: () => void;
  definirGarcom: (id: string, nome: string) => void;
  adicionarObservacaoGeral: (observacao: string) => void;
  removerObservacaoGeral: (index: number) => void;
  limparMesa: () => void;
}

type GarcomMesaStore = GarcomMesaState & GarcomMesaActions;

const useGarcomMesaBase = create<GarcomMesaStore>()((set) => ({
  mesaAtual: null,
  garcomResponsavelId: null,
  garcomResponsavelNome: null,
  horaAbertura: null,
  observacoesGerais: [],
  definirMesa: (mesa) => set({ mesaAtual: mesa, horaAbertura: new Date() }),
  removerMesa: () => set({ mesaAtual: null }),
  definirGarcom: (id, nome) => set({ garcomResponsavelId: id, garcomResponsavelNome: nome }),
  adicionarObservacaoGeral: (observacao) => set((state) => ({
    observacoesGerais: [...state.observacoesGerais, observacao],
  })),
  removerObservacaoGeral: (index) => set((state) => ({
    observacoesGerais: state.observacoesGerais.filter((_, i) => i !== index),
  })),
  limparMesa: () => set({
    mesaAtual: null,
    garcomResponsavelId: null,
    garcomResponsavelNome: null,
    horaAbertura: null,
    observacoesGerais: [],
  }),
}));

export const useGarcomMesa = useGarcomMesaBase;

interface ComandaInfo {
  id: string;
  numero: number;
  status: 'aberta' | 'fechada' | 'cancelada';
  valorTotal: number;
  horaAbertura: Date;
  horaFechamento?: Date;
}

interface GarcomComandasState {
  comandas: ComandaInfo[];
  comandaAtivaId: string | null;
}

interface GarcomComandasActions {
  abrirComanda: (numero: number) => string;
  fecharComanda: (id: string) => void;
  cancelarComanda: (id: string) => void;
  definirComandaAtiva: (id: string) => void;
  atualizarValorComanda: (id: string, valor: number) => void;
  limparComandas: () => void;
}

type GarcomComandasStore = GarcomComandasState & GarcomComandasActions;

const useGarcomComandasBase = create<GarcomComandasStore>()((set) => ({
  comandas: [],
  comandaAtivaId: null,
  abrirComanda: (numero) => {
    const id = `comanda-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const novaComanda: ComandaInfo = {
      id,
      numero,
      status: 'aberta',
      valorTotal: 0,
      horaAbertura: new Date(),
    };
    set((state) => ({
      comandas: [...state.comandas, novaComanda],
      comandaAtivaId: id,
    }));
    return id;
  },
  fecharComanda: (id) => set((state) => ({
    comandas: state.comandas.map((c) =>
      c.id === id ? { ...c, status: 'fechada' as const, horaFechamento: new Date() } : c
    ),
    comandaAtivaId: state.comandaAtivaId === id ? null : state.comandaAtivaId,
  })),
  cancelarComanda: (id) => set((state) => ({
    comandas: state.comandas.map((c) =>
      c.id === id ? { ...c, status: 'cancelada' as const } : c
    ),
    comandaAtivaId: state.comandaAtivaId === id ? null : state.comandaAtivaId,
  })),
  definirComandaAtiva: (id) => set({ comandaAtivaId: id }),
  atualizarValorComanda: (id, valor) => set((state) => ({
    comandas: state.comandas.map((c) =>
      c.id === id ? { ...c, valorTotal: valor } : c
    ),
  })),
  limparComandas: () => set({ comandas: [], comandaAtivaId: null }),
}));

export const useGarcomComandas = useGarcomComandasBase;

export function adicionarAoGarcomCart(item: GarcomAdicionarItemPayload): void {
  useGarcomCart.getState().adicionarItem(item as Omit<GarcomCartItem, 'idOperacao' | 'valorTotal'>);
}

export function incrementarGarcomCartItem(idOperacao: string): void {
  useGarcomCart.getState().alterarQuantidade(idOperacao, 1);
}

export function decrementarGarcomCartItem(idOperacao: string): void {
  useGarcomCart.getState().alterarQuantidade(idOperacao, -1);
}

export function removerDoGarcomCart(idOperacao: string): void {
  useGarcomCart.getState().removerItem(idOperacao);
}

export function limparGarcomCart(): void {
  useGarcomCart.getState().limparCarrinho();
  useGarcomMesa.getState().limparMesa();
}

export function abrirNovaComanda(numero: number): string {
  return useGarcomComandas.getState().abrirComanda(numero);
}

export function fecharComandaAtiva(): void {
  const { comandaAtivaId } = useGarcomComandas.getState();
  if (comandaAtivaId) {
    useGarcomComandas.getState().fecharComanda(comandaAtivaId);
  }
}

export function useGarcomCartTotal(): number {
  return useGarcomCart((state: GarcomCartItem[]) => state.reduce((acc, item) => acc + item.valorTotal, 0));
}

export function useGarcomMesaInfo(): MesaInfo | null {
  return useGarcomMesa((state) => state.mesaAtual);
}

export function useGarcomResponsavel(): string | null {
  return useGarcomMesa((state) => state.garcomResponsavelNome);
}

export function garcomCartParaPayload(): {
  itens: GarcomCartItem[];
  mesa?: MesaInfo;
  garcomId?: string;
  observacoes?: string[];
} {
  return {
    itens: useGarcomCart.getState().itens,
    mesa: useGarcomMesa.getState().mesaAtual ?? undefined,
    garcomId: useGarcomMesa.getState().garcomResponsavelId ?? undefined,
    observacoes: useGarcomMesa.getState().observacoesGerais.length > 0
      ? useGarcomMesa.getState().observacoesGerais
      : undefined,
  };
}
