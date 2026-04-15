export type ColunaKds = 'TODO' | 'PREPARANDO' | 'PRONTO';

export type OrigemVendaKds = 'TOTEM' | 'DELIVERY' | 'MESA' | 'PDV' | string;

export interface KdsItemLinha {
  quantidade: number;
  nome: string;
  observacoes?: string;
  adicionais: string[];
}

export interface KdsPedido {
  id: string;
  senha: string;
  origem: OrigemVendaKds;
  observacoesGerais?: string;
  coluna: ColunaKds;
  itens: KdsItemLinha[];
  recebidoEm: number;
}
