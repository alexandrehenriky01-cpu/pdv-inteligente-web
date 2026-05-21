export interface LojaDeliveryPublic {
  id: string;
  nome: string;
  nomeLegal?: string;
  logoUrl: string | null;
  telefoneContato: string | null;
  endereco: string | null;
  aberto: boolean;
  taxaEntregaPadrao: number;
  chavePix: string | null;
  /** RC2.7+1 — true se a loja tem ao menos uma região de entrega ativa cadastrada. */
  temRegioesEntrega?: boolean;
  /** RC2.7+1 — quando true, endereço fora das regiões cadastradas rejeita o pedido. */
  bloquearForaDaArea?: boolean;
}

export interface DeliveryOutletContext {
  /** Slug amigável ou UUID (legado) na URL pública `/delivery/:slug`. */
  lojaPublicKey: string;
  loja: LojaDeliveryPublic | null;
  carregandoLoja: boolean;
  erroLoja: string | null;
  estacaoTrabalhoId?: string;
}
