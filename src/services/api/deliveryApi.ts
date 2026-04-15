import { isAxiosError, type AxiosError } from 'axios';
import { api } from '../api';
import type { CartItem } from '../../modules/totem/types';

function arredondar2(n: number): number {
  return Math.round(n * 100) / 100;
}

export type FormaPagamentoDelivery = 'NA_ENTREGA' | 'PIX';

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
    adicionais?: Array<{ adicionalCardapioId: string; quantidade: number }>;
  }>;
  pagamentos: Array<{
    tipoPagamento: 'DINHEIRO' | 'CARTAO_DEBITO' | 'CARTAO_CREDITO' | 'PIX';
    valor: number;
    canalAdquirente?: 'POS' | 'TEF';
  }>;
  valorTotal: number;
  origemVenda: 'DELIVERY';
  tipoConsumo: 'ENTREGA';
  origem?: string;
  taxaEntrega: number;
  enderecoEntrega: string;
  observacoes: string;
  nomeCliente?: string;
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
  enderecoEntrega: string;
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
    observacoesVenda,
    nomeCliente,
    formaPagamento,
    enderecoEntrega,
  } = params;

  if (carrinho.length === 0) {
    throw new Error('Carrinho vazio.');
  }

  const itens: NovaVendaDeliveryBody['itens'] = [];

  for (const line of carrinho) {
    const itemCardapioId = line.produto.itemCardapioId?.trim();
    if (!itemCardapioId) {
      throw new Error(`Item «${line.produto.nome}» sem vínculo de cardápio.`);
    }
    const produtoId = (line.produto.produtoId ?? line.produto.id).trim();
    if (!produtoId) {
      throw new Error(`Produto «${line.produto.nome}» sem identificador.`);
    }
    const q = line.quantidade;
    if (q <= 0) continue;
    const valorUnitario = arredondar2(line.subtotal / q);
    const adicionais = Object.entries(line.adicionais)
      .filter(([, n]) => n > 0)
      .map(([adicionalCardapioId, quantidade]) => ({ adicionalCardapioId, quantidade }));

    itens.push({
      produtoId,
      quantidade: q,
      valorUnitario,
      itemCardapioId,
      ...(line.observacao.trim() !== '' ? { observacoes: line.observacao.trim() } : {}),
      ...(adicionais.length > 0 ? { adicionais } : {}),
    });
  }

  const totalComTaxa = arredondar2(subtotalItens + taxaEntrega);

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

  return {
    lojaId: lojaId.trim(),
    ...(estacaoTrabalhoId?.trim() ? { estacaoTrabalhoId: estacaoTrabalhoId.trim() } : {}),
    itens,
    pagamentos,
    valorTotal: totalComTaxa,
    origemVenda: 'DELIVERY',
    tipoConsumo: 'ENTREGA',
    origem: 'FOOD',
    taxaEntrega,
    enderecoEntrega: enderecoEntrega.trim(),
    observacoes: observacoesVenda.trim(),
    nomeCliente: nomeCliente.trim(),
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
  const { data } = await api.post<{
    mensagem: string;
    venda: VendaDeliveryResposta;
  }>('/api/public/delivery/pedido', body);

  return { mensagem: data.mensagem, venda: data.venda };
}
