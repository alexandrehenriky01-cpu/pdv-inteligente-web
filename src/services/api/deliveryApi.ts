import { isAxiosError, type AxiosError } from 'axios';
import { api } from '../api';
import type { CartItem } from '../../modules/totem/types';
import {
  arredondar2,
  montarLinhaVendaApiFromCartItem,
  validarLinhasCarrinhoFood,
} from '../../modules/food/composition/foodItemComposition';

export type FormaPagamentoDelivery = 'NA_ENTREGA' | 'PIX';

export type TipoPedidoDelivery = 'DELIVERY' | 'RETIRADA_BALCAO';

/** Corpo enviado ao POST /api/public/delivery/pedido */
export interface NovaVendaDeliveryBody {
  /** UUID da loja ou slug público (o servidor resolve para o id interno). */
  lojaId: string;
  estacaoTrabalhoId?: string;
  itens: Array<{
    produtoId: string;
    quantidade: number;
    valorUnitario: number;
    itemCardapioId: string;
    observacoes?: string;
    itemCardapioTamanhoId?: string;
    partidoAoMeio?: boolean;
    sabores?: Array<{ itemCardapioId: string }>;
    adicionais?: Array<
      | { adicionalCardapioId: string; quantidade: number }
      | { itemCardapioAdicionalId: string; quantidade: number }
    >;
  }>;
  pagamentos: Array<{
    tipoPagamento: 'DINHEIRO' | 'CARTAO_DEBITO' | 'CARTAO_CREDITO' | 'PIX';
    valor: number;
    canalAdquirente?: 'POS' | 'TEF';
  }>;
  valorTotal: number;
  origemVenda: 'DELIVERY';
  tipoConsumo: 'ENTREGA' | 'VIAGEM';
  origem?: string;
  taxaEntrega: number;
  cidade?: string;
  enderecoEntrega?: string;
  tipoPedido: TipoPedidoDelivery;
  observacoes: string;
  nomeCliente?: string;
  /** Chave de idempotência para evitar duplicação de pedidos. */
  idempotencyKey?: string;
}

export interface VendaDeliveryResposta {
  id: string;
  numeroPedido?: number | null;
  numeroVenda?: number;
}

export interface FinalizarPedidoDeliveryParams {
  lojaId: string;
  estacaoTrabalhoId?: string;
  carrinho: CartItem[];
  subtotalItens: number;
  taxaEntrega: number;
  cidade?: string;
  enderecoEntrega?: string;
  tipoPedido: TipoPedidoDelivery;
  /** Texto único: cliente, WhatsApp, observações do pedido (vai para `observacoes` da venda). */
  observacoesVenda: string;
  nomeCliente: string;
  formaPagamento: FormaPagamentoDelivery;
}

export function montarPayloadVendaDelivery(params: FinalizarPedidoDeliveryParams): NovaVendaDeliveryBody {
  const {
    lojaId,
    estacaoTrabalhoId,
    carrinho,
    subtotalItens,
    taxaEntrega,
    cidade,
    observacoesVenda,
    nomeCliente,
    formaPagamento,
    enderecoEntrega,
    tipoPedido,
  } = params;

  if (carrinho.length === 0) {
    throw new Error('Carrinho vazio.');
  }

  const erroCarrinho = validarLinhasCarrinhoFood(carrinho);
  if (erroCarrinho) {
    throw new Error(erroCarrinho);
  }

  const itens: NovaVendaDeliveryBody['itens'] = [];

  for (const line of carrinho) {
    itens.push(montarLinhaVendaApiFromCartItem(line));
  }

  const taxaFinal = tipoPedido === 'RETIRADA_BALCAO' ? 0 : taxaEntrega;
  const totalComTaxa = arredondar2(subtotalItens + taxaFinal);

  let tipoPagamento: 'DINHEIRO' | 'PIX' = 'DINHEIRO';
  let canal: 'POS' | undefined = 'POS';

  if (formaPagamento === 'PIX') {
    tipoPagamento = 'PIX';
    canal = undefined;
  } else {
    tipoPagamento = 'DINHEIRO';
    canal = 'POS';
  }

  const pagamentos: NovaVendaDeliveryBody['pagamentos'] = [
    {
      tipoPagamento,
      valor: totalComTaxa,
      ...(canal ? { canalAdquirente: canal } : {}),
    },
  ];

  const base: NovaVendaDeliveryBody = {
    lojaId: lojaId.trim(),
    ...(estacaoTrabalhoId?.trim() ? { estacaoTrabalhoId: estacaoTrabalhoId.trim() } : {}),
    itens,
    pagamentos,
    valorTotal: totalComTaxa,
    origemVenda: 'DELIVERY',
    tipoConsumo: tipoPedido === 'RETIRADA_BALCAO' ? 'VIAGEM' : 'ENTREGA',
    origem: 'FOOD',
    taxaEntrega: taxaFinal,
    tipoPedido,
    observacoes: observacoesVenda.trim(),
    nomeCliente: nomeCliente.trim(),
    idempotencyKey: `delivery-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
  };

  if (tipoPedido === 'DELIVERY') {
    return {
      ...base,
      cidade: (cidade ?? '').trim(),
      enderecoEntrega: (enderecoEntrega ?? '').trim(),
    };
  }

  const cidadeTrim = (cidade ?? '').trim();
  return {
    ...base,
    ...(cidadeTrim !== '' ? { cidade: cidadeTrim } : {}),
  };
}

export function mensagemErroDeliveryApi(erro: unknown): string {
  if (isAxiosError(erro)) {
    const ax = erro as AxiosError<{ error?: string }>;
    const msg = ax.response?.data?.error;
    if (typeof msg === 'string' && msg.trim() !== '') return msg;
    if (ax.message) return ax.message;
  }
  if (erro instanceof Error) return erro.message;
  return 'Não foi possível enviar o pedido. Tente novamente.';
}

export async function finalizarPedidoDelivery(
  body: NovaVendaDeliveryBody
): Promise<{ mensagem: string; venda: VendaDeliveryResposta }> {
  console.log('PAYLOAD COMPLETO:', JSON.stringify(body, null, 2));
  const { data } = await api.post<{
    mensagem: string;
    venda: VendaDeliveryResposta;
  }>('/api/public/delivery/pedido', body);

  return { mensagem: data.mensagem, venda: data.venda };
}
