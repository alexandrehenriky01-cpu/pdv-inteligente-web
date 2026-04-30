/**
 * Tipos do PDV Food (Mesa, Balcão, Entrega) — alinhados ao payload de `/api/vendas` e ao KDS.
 */
import type { ItemVendaLinhaFoodDto } from '../food/composition/foodItemComposition';

/** Linha de snapshot de sabor persistida na mesa / ecoada no KDS. */
export interface ComposicaoSaborSnapshot {
  nome: string;
  preco?: number;
  itemCardapioId: string;
}

/** Metadados de composição de um item (pizza, tamanho, sabores, observação). */
export interface ComposicaoItem {
  itemCardapioTamanhoId: string | null;
  saboresItemCardapioIds?: string[];
  saboresSnapshotJson?: ComposicaoSaborSnapshot[] | null;
  adicionaisSnapshotJson?: unknown;
  observacao: string;
}

/** Formas aceitas em `pagamentos[].tipoPagamento` (espelha API / Menu Online). */
export type FormaPagamentoFood =
  | 'DINHEIRO'
  | 'PIX'
  | 'CARTAO_CREDITO'
  | 'CARTAO_DEBITO'
  | 'CREDIARIO'
  | 'CHEQUE'
  | 'BOLETO';

/** Endereço estruturado (UI PDV Food entrega) — mapeado para `enderecoEntrega` da API. */
export interface EnderecoEntregaPdv {
  cep: string;
  rua: string;
  numero: string;
  bairro: string;
  cidade: string;
  uf: string;
  complemento: string;
}

/** Cliente + endereço no fluxo entrega PDV (padrão Menu Online). */
export interface ClienteEntregaPdv {
  nomeCompleto: string;
  whatsapp: string;
  endereco: EnderecoEntregaPdv;
  observacaoPedido: string;
}

/**
 * @deprecated Preferir `ClienteEntregaPdv`. Mantido para leitura de legado.
 */
export interface Entrega {
  nome: string;
  telefone: string;
  endereco: string;
}

/** Visão de pedido entrega no PDV (documentação / composição de tela). */
export interface PedidoEntregaPdv {
  cliente: ClienteEntregaPdv;
  timingCobranca: 'AGORA' | 'POSTERIOR';
  /** Obrigatório quando `timingCobranca === 'POSTERIOR'`. */
  formaPagamentoPrevista?: FormaPagamentoFood;
  taxaEntregaReais: number;
  valorItens: number;
  valorTotal: number;
  itens: ItemVendaLinhaFoodDto[];
}

/** Identificação do cliente no balcão (PDV Food). */
export interface ClientePedidoBalcao {
  nomeCliente: string;
  telefoneCliente?: string;
}

export interface ItemPedido extends ComposicaoItem {
  produtoId: string;
  itemCardapioId: string;
  quantidade: number;
  valorUnitario: number;
}

/** Pagamento parcial no modal de cobrança (espelha corpo da venda). */
export interface PagamentoLinhaPedidoFood {
  tipoPagamento: string;
  valor: number;
  transacaoTefId?: string;
  canalAdquirente?: 'POS' | 'TEF';
}

/** Endereço no formato da API (RealizarVendaSchema.enderecoEntrega). */
export type EnderecoEntregaApiBody = {
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
};

/** Payload enviado em POST `/api/vendas` pelo PDV Food (campos principais). */
export interface Pedido {
  modo: 'BALCAO' | 'MESA' | 'DELIVERY';
  modoAtendimento: 'BALCAO' | 'MESA' | 'DELIVERY';
  tipoAtendimento: 'BALCAO' | 'MESA' | 'DELIVERY';
  mesa?: number;
  mesaId?: number;
  mesaNumero?: number;
  clienteDelivery: Entrega | null;
  nomeCliente?: string;
  telefoneCliente?: string;
  itens: ItemVendaLinhaFoodDto[];
  valorTotal: number;
  pagamentos: PagamentoLinhaPedidoFood[];
  pagamentoPosterior?: boolean;
  observacoes?: string;
  estacaoTrabalhoId?: string;
  sessaoCaixaId?: string;
  caixaFiscalId?: string;
  enderecoEntrega?: EnderecoEntregaApiBody;
  taxaEntrega?: number;
  cidade?: string;
  formaPagamento?: string;
}

/** Corpo tipado da finalização Food (subset usado pelo front ao montar POST `/api/vendas`). */
export interface PayloadFinalizacaoFood {
  modo: 'BALCAO' | 'MESA' | 'DELIVERY';
  modoAtendimento: 'BALCAO' | 'MESA' | 'DELIVERY';
  tipoAtendimento: 'BALCAO' | 'MESA' | 'DELIVERY';
  mesa?: number;
  mesaId?: number;
  mesaNumero?: number;
  clienteDelivery: { nome?: string; telefone?: string; endereco?: string } | null;
  nomeCliente?: string;
  telefoneCliente?: string;
  itens: ItemVendaLinhaFoodDto[];
  valorTotal: number;
  pagamentos: PagamentoLinhaPedidoFood[];
  pagamentoPosterior?: boolean;
  observacoes?: string;
  estacaoTrabalhoId?: string;
  sessaoCaixaId?: string;
  caixaFiscalId?: string;
  enderecoEntrega?: EnderecoEntregaApiBody;
  taxaEntrega?: number;
  cidade?: string;
  formaPagamento?: string;
}

/** Extensão explícita para entrega PDV (mesmo POST `/api/vendas`). */
export type PayloadFinalizacaoEntregaPdv = PayloadFinalizacaoFood & {
  modo: 'DELIVERY';
  modoAtendimento: 'DELIVERY';
  tipoAtendimento: 'DELIVERY';
  enderecoEntrega: EnderecoEntregaApiBody;
  taxaEntrega: number;
  cidade: string;
  nomeCliente: string;
  telefoneCliente: string;
  observacoes: string;
  formaPagamento: string;
};

/** Pacote retornado pela API para impressão no agente local. */
export interface PacoteImpressaoPosPdv {
  formato: string;
  payload: string;
}

/** Item de GET `/api/vendas/pendentes-recebimento-balcao` (balcão, pagamento posterior pendente). */
export interface PendenteRecebimentoBalcaoPdv {
  id: string;
  nomeCliente: string | null;
  telefoneCliente: string | null;
  valorTotal: number;
  saldoPendente: number;
  createdAt: string;
  statusPreparo: string | null;
  qtdItens: number;
  numeroPedido: number | null;
  numeroVenda: number | null;
}

/** Metadados de impressão local (agente hardware). */
export interface PayloadImpressao extends PacoteImpressaoPosPdv {}

/** Dados enfileirados no outbox para emissão ao KDS (espelha payload interno). */
export interface PayloadKds {
  lojaId: string;
  vendaId: string;
  emitirKdsCozinha: boolean;
  origemVenda: string;
  mesaId?: string | number | null;
  mesaNumero?: string | number | null;
  nomeCliente?: string | null;
  /** WhatsApp / telefone quando disponível na venda. */
  telefoneCliente?: string | null;
  tipoAtendimento?: 'BALCAO' | 'MESA' | 'DELIVERY' | string | null;
}
