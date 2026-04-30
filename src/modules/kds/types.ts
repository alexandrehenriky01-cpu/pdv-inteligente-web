export type ColunaKds = 'TODO' | 'PREPARANDO' | 'PRONTO';

export type OrigemVendaKds = 'TOTEM' | 'DELIVERY' | 'MESA' | 'PDV' | string;

/** Pedidos do cardápio online (`origemVenda` DELIVERY): entrega ou retirada no balcão. */
export type TipoPedidoMenuKds = 'DELIVERY' | 'RETIRADA_BALCAO';

/** Tipo operacional exibido no KDS (derivado de origem + tipoPedido, sem mudar API). */
export type TipoAtendimentoKds = 'DELIVERY' | 'BALCAO' | 'MESA';

export interface KdsItemLinha {
  quantidade: number;
  nome: string;
  /** Congelado na venda quando o item tinha tamanhos cadastrados. */
  tamanho?: string;
  /** Pizza 2+ sabores: exibir linha “Sabores:” no card. */
  pizzaMultiSabores?: boolean;
  /** Nomes dos sabores (pizza multi), apenas snapshot. */
  saboresNomes?: string[];
  observacoes?: string;
  adicionais: string[];
  /** Bebida: exibir linha “(sem observações)” no KDS / gestão. */
  exibirSemObservacoes?: boolean;
}

export interface KdsPedido {
  id: string;
  senha: string;
  /** Número do pedido / venda para leitura rápida (campos já existentes no payload). */
  numeroPedidoExibicao: string;
  tipoAtendimento: TipoAtendimentoKds;
  origem: OrigemVendaKds;
  /** Nome do consumidor (balcão PDV, delivery, etc.) quando gravado na venda. */
  nomeCliente?: string;
  /** Preenchido quando `origem` é DELIVERY (menu online). */
  tipoPedidoMenu?: TipoPedidoMenuKds | null;
  observacoesGerais?: string;
  coluna: ColunaKds;
  itens: KdsItemLinha[];
  recebidoEm: number;
}
