export interface LojaDeliveryPublic {
  id: string;
  nome: string;
  nomeLegal?: string;
  logoUrl: string | null;
  telefoneContato: string | null;
  aberto: boolean;
}

export interface DeliveryOutletContext {
  /** Slug amigável ou UUID (legado) na URL pública `/delivery/:slug`. */
  lojaPublicKey: string;
  loja: LojaDeliveryPublic | null;
  carregandoLoja: boolean;
  erroLoja: string | null;
  estacaoTrabalhoId?: string;
}
