import { isAxiosError, type AxiosError } from 'axios';
import { api } from '../api';
import type { CartItem } from '../../modules/totem/types';
import { validarLinhasCarrinhoDelivery } from '../../modules/delivery/store/deliveryCartStore';

function arredondar2(n: number): number {
  return Math.round(n * 100) / 100;
}

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

  const erroCarrinho = validarLinhasCarrinhoDelivery(carrinho);
  if (erroCarrinho) {
    throw new Error(erroCarrinho);
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
      .map(([id, quantidade]) => {
        const meta = line.produto.adicionais.find((a) => a.id === id);
        if (meta?.origem === 'CATALOGO') {
          return { itemCardapioAdicionalId: id, quantidade };
        }
        return { adicionalCardapioId: id, quantidade };
      });

    const precisaTam = (line.produto.tamanhos ?? []).filter((t) => t.ativo !== false).length > 0;
    const tid = line.itemCardapioTamanhoId?.trim();
    if (precisaTam && !tid) {
      throw new Error(`Selecione o tamanho para «${line.produto.nome}».`);
    }

    const pizzaMulti =
      line.produto.tipoItem === 'PIZZA' &&
      line.produto.permiteMultiplosSabores === true &&
      (line.saboresItemCardapioIds?.length ?? 0) > 0;

    itens.push({
      produtoId,
      quantidade: q,
      valorUnitario,
      itemCardapioId,
      ...(tid ? { itemCardapioTamanhoId: tid } : {}),
      ...(line.produto.tipoItem === 'COMIDA' && line.partidoAoMeio === true ? { partidoAoMeio: true } : {}),
      ...(pizzaMulti && line.saboresItemCardapioIds
        ? {
            sabores: line.saboresItemCardapioIds.map((id) => ({ itemCardapioId: id })),
          }
        : {}),
      ...(line.observacao.trim() !== '' &&
      line.produto.tipoItem !== 'BEBIDA'
        ? { observacoes: line.observacao.trim() }
        : {}),
      ...(adicionais.length > 0 ? { adicionais } : {}),
    });
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
