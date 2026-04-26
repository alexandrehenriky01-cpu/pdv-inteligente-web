export type ColunaKds = 'TODO' | 'PREPARANDO' | 'PRONTO';

export type OrigemVendaKds = 'TOTEM' | 'DELIVERY' | 'MESA' | 'PDV' | string;

/** Pedidos do cardápio online (`origemVenda` DELIVERY): entrega ou retirada no balcão. */
export type TipoPedidoMenuKds = 'DELIVERY' | 'RETIRADA_BALCAO';

export interface KdsItemLinha {
  quantidade: number;
  nome: string;
  /** Congelado na venda quando o item tinha tamanhos cadastrados. */
  tamanho?: string;
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
  origem: OrigemVendaKds;
  /** Preenchido quando `origem` é DELIVERY (menu online). */
  tipoPedidoMenu?: TipoPedidoMenuKds | null;
  observacoesGerais?: string;
  coluna: ColunaKds;
  itens: KdsItemLinha[];
  recebidoEm: number;
}
