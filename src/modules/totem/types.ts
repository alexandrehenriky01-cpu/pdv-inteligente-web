/** Alinhado ao backend (`TipoConsumo`): Comer aqui, levar ou entrega (delivery). */
export type TotemTipoConsumo = 'LOCAL' | 'VIAGEM' | 'ENTREGA';

export interface TotemMockAdicional {
  id: string;
  nome: string;
  preco: number;
}

export interface TotemMockProduto {
  id: string;
  /**
   * `Produto` da loja usado na linha fiscal/CMV (primeiro insumo da ficha vindo do GET /api/cardapio).
   * O `id` da UI é sempre o `ItemCardapio`.
   */
  produtoId?: string;
  /** Mesmo valor que `id` — enviado ao `realizarVenda` para explosão de ficha. */
  itemCardapioId?: string;
  categoriaId: string;
  nome: string;
  descricaoCurta: string;
  /** Ingredientes (descrição do itemCardapio) para exibição no cardápio delivery. */
  descricao?: string | null;
  precoBase: number;
  imagemUrl: string;
  adicionais: TotemMockAdicional[];
}

export interface TotemMockCategoria {
  id: string;
  nome: string;
}

/** Linha do carrinho do totem (id gerado no front, ex. crypto.randomUUID). */
export interface CartItem {
  id: string;
  produto: TotemMockProduto;
  quantidade: number;
  adicionais: Record<string, number>;
  observacao: string;
  subtotal: number;
}
