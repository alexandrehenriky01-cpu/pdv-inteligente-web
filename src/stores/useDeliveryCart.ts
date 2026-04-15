/**
 * Store de Carrinho para o módulo de Delivery/Entregas.
 */

import { create } from 'zustand';
import { createCartStore, BaseCartItem } from './factories/createCartStore';
import { arredondar2 } from '../utils/formatters';

export interface DeliveryCartItem extends BaseCartItem {
  imagemUrl?: string;
  adicionais?: Array<{
    adicionalId: string;
    nome: string;
    quantidade: number;
    valorUnitario: number;
    valorTotal: number;
  }>;
  observacao?: string;
  tempoPreparo?: number;
}

export interface EnderecoEntrega {
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep?: string;
  referencia?: string;
  instrucoes?: string;
}

export interface DeliveryAdicionarItemPayload {
  produtoId: string;
  nome: string;
  quantidade: number;
  valorUnitario: number;
  imagemUrl?: string;
  adicionais?: Array<{
    adicionalId: string;
    nome: string;
    quantidade: number;
    valorUnitario: number;
  }>;
  observacao?: string;
  tempoPreparo?: number;
}

const useDeliveryCartBase = createCartStore<DeliveryCartItem>({
  name: 'delivery-cart',
  maxItens: 50,
  calcularValorTotalItem: (qtd, val) => arredondar2(qtd * val),
  onTotalChange: (valor) => console.log('[DeliveryCart] Total:', valor),
});

export const useDeliveryCart = useDeliveryCartBase;

interface DeliveryEnderecoState {
  endereco: EnderecoEntrega | null;
  taxaEntrega: number;
  tempoEstimadoEntrega: number;
  observacao?: string;
}

interface DeliveryEnderecoActions {
  definirEndereco: (endereco: EnderecoEntrega) => void;
  removerEndereco: () => void;
  definirTaxaEntrega: (taxa: number) => void;
  definirTempoEstimado: (tempo: number) => void;
  definirObservacao: (observacao: string) => void;
  limparEndereco: () => void;
}

type DeliveryEnderecoStore = DeliveryEnderecoState & DeliveryEnderecoActions;

const useDeliveryEnderecoBase = create<DeliveryEnderecoStore>()((set) => ({
  endereco: null,
  taxaEntrega: 0,
  tempoEstimadoEntrega: 0,
  observacao: undefined,
  definirEndereco: (endereco) => set({ endereco }),
  removerEndereco: () => set({ endereco: null }),
  definirTaxaEntrega: (taxa) => set({ taxaEntrega: taxa }),
  definirTempoEstimado: (tempo) => set({ tempoEstimadoEntrega: tempo }),
  definirObservacao: (observacao) => set({ observacao }),
  limparEndereco: () => set({ endereco: null, taxaEntrega: 0, tempoEstimadoEntrega: 0, observacao: undefined }),
}));

export const useDeliveryEndereco = useDeliveryEnderecoBase;

export function adicionarAoDeliveryCart(item: DeliveryAdicionarItemPayload): void {
  useDeliveryCart.getState().adicionarItem(item as Omit<DeliveryCartItem, 'idOperacao' | 'valorTotal'>);
}

export function incrementarDeliveryCartItem(idOperacao: string): void {
  useDeliveryCart.getState().alterarQuantidade(idOperacao, 1);
}

export function decrementarDeliveryCartItem(idOperacao: string): void {
  useDeliveryCart.getState().alterarQuantidade(idOperacao, -1);
}

export function removerDoDeliveryCart(idOperacao: string): void {
  useDeliveryCart.getState().removerItem(idOperacao);
}

export function limparDeliveryCart(): void {
  useDeliveryCart.getState().limparCarrinho();
  useDeliveryEndereco.getState().limparEndereco();
}

export function useDeliveryCartTotal(): number {
  return useDeliveryCart((state) => state.valorTotal);
}

export function useDeliveryEnderecoInfo(): EnderecoEntrega | null {
  return useDeliveryEndereco((state) => state.endereco);
}

export function useDeliveryTaxaEntrega(): number {
  return useDeliveryEndereco((state) => state.taxaEntrega);
}

export function deliveryCartParaPayload(): {
  itens: DeliveryCartItem[];
  endereco: EnderecoEntrega | null;
  taxaEntrega: number;
  observacao?: string;
} {
  return {
    itens: useDeliveryCart.getState().itens,
    endereco: useDeliveryEndereco.getState().endereco,
    taxaEntrega: useDeliveryEndereco.getState().taxaEntrega,
    observacao: useDeliveryEndereco.getState().observacao,
  };
}
