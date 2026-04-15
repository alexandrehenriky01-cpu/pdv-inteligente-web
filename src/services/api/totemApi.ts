import { isAxiosError, type AxiosError } from 'axios';
import { api } from '../api';
import { getEstacaoTrabalhoIdPdv } from '../../utils/estacaoWorkstationStorage';
import type { CartItem, TotemTipoConsumo } from '../../modules/totem/types';

export type FormaPagamentoTotem = 'CARTAO_CREDITO' | 'CARTAO_DEBITO' | 'PIX';

function arredondar2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Corpo enviado ao POST /api/vendas (lojaId é injetado pelo backend a partir do JWT). */
export interface NovaVendaTotemBody {
  itens: Array<{
    produtoId: string;
    quantidade: number;
    valorUnitario: number;
    itemCardapioId: string;
    observacoes?: string;
    adicionais?: Array<{ adicionalCardapioId: string; quantidade: number }>;
  }>;
  pagamentos: Array<{
    tipoPagamento: FormaPagamentoTotem;
    valor: number;
    canalAdquirente?: 'POS' | 'TEF';
    transacaoTefId?: string;
  }>;
  valorTotal: number;
  origemVenda: 'TOTEM';
  tipoConsumo: TotemTipoConsumo;
  origem?: string;
  estacaoTrabalhoId?: string;
  terminal?: string;
  observacoes?: string;
}

export interface VendaApiResposta {
  id: string;
  numeroPedido?: number | null;
  numeroVenda?: number;
}

export interface FinalizarPedidoTotemResultado {
  mensagem: string;
  venda: VendaApiResposta;
  comprovantesTef?: string[];
}

/** Uma linha de pagamento no totem (permite misto: ex. parte PIX + parte TEF). */
export interface LinhaPagamentoTotem {
  formaPagamento: FormaPagamentoTotem;
  valor: number;
  /** Após `aguardarAutorizacaoTefHardware` — obrigatório para cartão TEF. */
  transacaoTefId?: string;
}

export interface FinalizarPedidoTotemParams {
  carrinho: CartItem[];
  tipoConsumo: TotemTipoConsumo;
  /** Soma dos valores deve igualar o total do carrinho (tolerância 2 centavos). */
  pagamentos: LinhaPagamentoTotem[];
  /** Observações gerais do pedido (campo `observacoes` da venda no backend). */
  observacoesPedido?: string;
}

/**
 * Monta o payload alinhado ao `NovaVendaDTO` / `VendaController.realizarVenda`.
 */
export function montarPayloadVendaTotem(params: FinalizarPedidoTotemParams): NovaVendaTotemBody {
  const { carrinho, tipoConsumo, pagamentos: linhasPagamento, observacoesPedido } = params;

  if (carrinho.length === 0) {
    throw new Error('Carrinho vazio. Adicione itens antes de finalizar.');
  }
  if (!linhasPagamento || linhasPagamento.length === 0) {
    throw new Error('Informe ao menos uma linha de pagamento.');
  }

  const itens: NovaVendaTotemBody['itens'] = [];

  for (const line of carrinho) {
    const itemCardapioId = line.produto.itemCardapioId?.trim();
    if (!itemCardapioId) {
      throw new Error(
        `O item «${line.produto.nome}» não possui itemCardapioId. Cadastre o vínculo com o cardápio no totem (env/API) para acionar a ficha técnica.`
      );
    }

    const produtoId = (line.produto.produtoId ?? line.produto.id).trim();
    if (!produtoId) {
      throw new Error(`Produto «${line.produto.nome}» sem identificador para o ERP.`);
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

  const valorTotal = arredondar2(carrinho.reduce((acc, i) => acc + i.subtotal, 0));

  const somaPag = arredondar2(linhasPagamento.reduce((s, p) => s + p.valor, 0));
  if (Math.abs(somaPag - valorTotal) > 0.02) {
    throw new Error(
      `Soma dos pagamentos (R$ ${somaPag.toFixed(2)}) difere do total do pedido (R$ ${valorTotal.toFixed(2)}).`
    );
  }

  const pagamentos: NovaVendaTotemBody['pagamentos'] = linhasPagamento.map((p) => {
    const tid = p.transacaoTefId?.trim();
    return {
      tipoPagamento: p.formaPagamento,
      valor: arredondar2(p.valor),
      ...(p.formaPagamento !== 'PIX'
        ? {
            canalAdquirente: tid ? ('TEF' as const) : ('POS' as const),
            ...(tid ? { transacaoTefId: tid } : {}),
          }
        : {}),
    };
  });

  const estacaoTrabalhoId = getEstacaoTrabalhoIdPdv()?.trim();

  return {
    itens,
    pagamentos,
    valorTotal,
    origemVenda: 'TOTEM',
    tipoConsumo,
    origem: 'FOOD',
    ...(estacaoTrabalhoId ? { estacaoTrabalhoId } : {}),
    ...(observacoesPedido?.trim() ? { observacoes: observacoesPedido.trim() } : {}),
  };
}

export function extrairSenhaPedidoTotem(venda: VendaApiResposta): string {
  if (venda.numeroPedido != null && Number.isFinite(venda.numeroPedido)) {
    return String(venda.numeroPedido).padStart(3, '0').slice(-3);
  }
  const nv = venda.numeroVenda ?? 0;
  return String(nv % 1000).padStart(3, '0');
}

export function mensagemErroTotemApi(erro: unknown): string {
  if (isAxiosError(erro)) {
    const ax = erro as AxiosError<{ error?: string }>;
    const msg = ax.response?.data?.error;
    if (typeof msg === 'string' && msg.trim() !== '') return msg;
    if (ax.message) return ax.message;
  }
  if (erro instanceof Error) return erro.message;
  return 'Não foi possível concluir o pedido. Verifique a conexão e tente novamente.';
}

/**
 * POST `/api/vendas` — transação ACID no `VendaService.realizarVenda` (origemVenda TOTEM).
 */
export async function finalizarPedidoTotem(
  params: FinalizarPedidoTotemParams
): Promise<FinalizarPedidoTotemResultado> {
  const body = montarPayloadVendaTotem(params);
  const { data } = await api.post<{
    mensagem: string;
    venda: VendaApiResposta;
    comprovantesTef?: string[];
  }>('/api/vendas', body);

  return {
    mensagem: data.mensagem,
    venda: data.venda,
    comprovantesTef: data.comprovantesTef,
  };
}
