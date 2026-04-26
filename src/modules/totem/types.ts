/** Alinhado ao backend (`TipoConsumo`): Comer aqui, levar ou entrega (delivery). */
export type TotemTipoConsumo = 'LOCAL' | 'VIAGEM' | 'ENTREGA';

export type TotemTipoItem = 'COMIDA' | 'BEBIDA' | 'PIZZA';

export interface TotemMockTamanho {
  id: string;
  nome: string;
  preco: number;
  ordem: number;
  ativo: boolean;
}

export interface TotemSaborOpcao {
  id: string;
  nome: string;
  precoVenda: number;
  tamanhos: TotemMockTamanho[];
}

export interface TotemMockAdicional {
  id: string;
  nome: string;
  preco: number;
  /** `CATALOGO` = `ItemCardapioAdicional.id` na API; `LEGADO` = `AdicionalCardapio.id`. */
  origem: 'LEGADO' | 'CATALOGO';
  maxQuantidade?: number | null;
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
  tipoItem: TotemTipoItem;
  permiteMultiplosSabores?: boolean;
  maxSabores?: number | null;
  saboresOpcoes?: TotemSaborOpcao[];
  /** Tamanhos ativos do item; vazio = preço único (`precoBase`). */
  tamanhos: TotemMockTamanho[];
  precoBase: number;
  imagemUrl: string;
  /** Código curto do produto ERP (quando o cardápio expõe). */
  codigo?: string;
  codigoBarras?: string;
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
  /** Obrigatório quando `produto.tamanhos.length > 0`. */
  itemCardapioTamanhoId?: string | null;
  partidoAoMeio?: boolean;
  /** Pizza multi-sabor: ids `ItemCardapio` dos sabores (1..maxSabores). */
  saboresItemCardapioIds?: string[];
  subtotal: number;
}
