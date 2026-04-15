/**
 * Store de Carrinho para o módulo Totem de Autoatendimento.
 */

import { createCartStore, BaseCartItem, CarrinhoStore } from './factories/createCartStore';
import { arredondar2 } from '../utils/formatters';

export interface TotemCartItem extends BaseCartItem {
  imagemUrl?: string;
  peso?: number;
  informacoesNutricionais?: string;
  categoria?: string;
  disponibilidade?: 'disponivel' | 'indisponivel' | 'sob_consulta';
  tempoPreparo?: number;
}

export interface TotemAdicionarItemPayload {
  produtoId: string;
  nome: string;
  quantidade: number;
  valorUnitario: number;
  imagemUrl?: string;
  peso?: number;
  informacoesNutricionais?: string;
  categoria?: string;
  disponibilidade?: 'disponivel' | 'indisponivel' | 'sob_consulta';
  tempoPreparo?: number;
  observacao?: string;
}

const useTotemCartBase = createCartStore<TotemCartItem>({
  name: 'totem-cart',
  maxItens: 30,
  calcularValorTotalItem: (qtd, val) => arredondar2(qtd * val),
  onTotalChange: (valor) => console.log('[TotemCart] Total:', valor),
});

export const useTotemCart = useTotemCartBase;

export function adicionarAoTotemCart(item: TotemAdicionarItemPayload): void {
  useTotemCart.getState().adicionarItem(item);
}

export function incrementarTotemCartItem(idOperacao: string): void {
  useTotemCart.getState().alterarQuantidade(idOperacao, 1);
}

export function decrementarTotemCartItem(idOperacao: string): void {
  useTotemCart.getState().alterarQuantidade(idOperacao, -1);
}

export function removerDoTotemCart(idOperacao: string): void {
  useTotemCart.getState().removerItem(idOperacao);
}

export function limparTotemCart(): void {
  useTotemCart.getState().limparCarrinho();
}

export function useTotemCartTotal(): number {
  return useTotemCart((state) => state.valorTotal);
}

export function useTotemCartQuantidade(): number {
  return useTotemCart((state) => state.quantidadeTotalItens);
}

export function useTotemCartVazio(): boolean {
  return useTotemCart((state) => state.itens.length === 0);
}

export function TotemCartParaPayload(): TotemCartItem[] {
  return useTotemCart.getState().itens;
}
