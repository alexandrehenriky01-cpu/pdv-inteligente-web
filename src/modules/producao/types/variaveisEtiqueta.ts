/**
 * Catálogo de variáveis dinâmicas para o Construtor de Etiquetas.
 * Placeholders no layout seguem {{chave}} — a chave interna deve bater com mockData na API (ZplRendererService).
 */

export type VariavelEtiquetaTipo =
  | 'texto'
  | 'texto_longo'
  | 'preco'
  | 'peso'
  | 'data'
  | 'hora'
  | 'codigo_barras'
  | 'qrcode_valor'
  | 'texto_estatico'
  | 'forma'
  | 'imagem';

export interface VariavelEtiquetaDef {
  id: string;
  label: string;
  tipo: VariavelEtiquetaTipo;
  /** Para tipo forma: qual subtipo inserir */
  formaId?: 'linha' | 'retangulo';
}

export interface VariavelEtiquetaSecao {
  id: string;
  titulo: string;
  itens: VariavelEtiquetaDef[];
}

export const VARIAVEIS_ETIQUETA_SECOES: VariavelEtiquetaSecao[] = [
  {
    id: 'dados_produto',
    titulo: 'Dados do Produto',
    itens: [
      { id: 'produto.nome', label: 'Nome do Produto', tipo: 'texto' },
      { id: 'produto.codigo', label: 'Código Interno', tipo: 'texto' },
      { id: 'produto.codigoBarras', label: 'Cód. Barras (EAN)', tipo: 'codigo_barras' },
      { id: 'produto.ean', label: 'EAN (campo fiscal)', tipo: 'codigo_barras' },
      { id: 'produto.descricao', label: 'Descrição', tipo: 'texto_longo' },
      { id: 'produto.precoVenda', label: 'Preço de Venda', tipo: 'preco' },
      { id: 'produto.precoCusto', label: 'Preço de Custo', tipo: 'preco' },
      { id: 'produto.precoAtacado', label: 'Preço Atacado', tipo: 'preco' },
      { id: 'produto.unidadeMedida', label: 'UN / KG', tipo: 'texto' },
      { id: 'produto.marca', label: 'Marca', tipo: 'texto' },
      { id: 'categoria.nome', label: 'Categoria', tipo: 'texto' },
      { id: 'fornecedor.nome', label: 'Fornecedor padrão', tipo: 'texto' },
      { id: 'produto.ncm', label: 'NCM', tipo: 'texto' },
      { id: 'produto.cest', label: 'CEST', tipo: 'texto' },
      { id: 'produto.pesoLiquido', label: 'Peso líquido (cadastro)', tipo: 'peso' },
      { id: 'produto.pesoBruto', label: 'Peso bruto (cadastro)', tipo: 'peso' },
      { id: 'produto.diasValidade', label: 'Dias de validade (cadastro)', tipo: 'texto' },
      { id: 'produto.tipoConservacao', label: 'Tipo de conservação', tipo: 'texto' },
      { id: 'produto.pesavel', label: 'Produto pesável (S/N)', tipo: 'texto' },
      { id: 'producao.ingredientes', label: 'Ingredientes', tipo: 'texto_longo' },
      { id: 'producao.alergenicos', label: 'Alergênicos', tipo: 'texto_longo' },
      {
        id: 'producao.informacaoNutricional',
        label: 'Informação nutricional',
        tipo: 'texto_longo',
      },
      { id: 'producao.descricaoEtiqueta', label: 'Descrição para rótulo', tipo: 'texto_longo' },
      { id: 'producao.descricaoMinisterio', label: 'Descrição ministério', tipo: 'texto_longo' },
      { id: 'producao.registroRotuloPGA', label: 'Registro rótulo PGA', tipo: 'texto' },
      { id: 'producao.embalagemPrimaria', label: 'Embalagem primária', tipo: 'texto' },
      { id: 'producao.embalagemSecundaria', label: 'Embalagem secundária', tipo: 'texto' },
      { id: 'producao.gtin14', label: 'GTIN-14', tipo: 'codigo_barras' },
      {
        id: 'rastreabilidade.qrPayload',
        label: 'QR Code (Rastreabilidade)',
        tipo: 'qrcode_valor',
      },
    ],
  },
  {
    id: 'pesagem_producao',
    titulo: 'Pesagem e Produção',
    itens: [
      { id: 'pesagem.tara', label: 'Tara da embalagem', tipo: 'peso' },
      { id: 'pesagem.pesoLiquido', label: 'Peso líquido (balança)', tipo: 'peso' },
      { id: 'pesagem.pesoBruto', label: 'Peso bruto (balança)', tipo: 'peso' },
      { id: 'peso', label: 'Peso (legado)', tipo: 'peso' },
      { id: 'producao.dataFabricacao', label: 'Data de fabricação', tipo: 'data' },
      { id: 'producao.dataValidade', label: 'Data de validade', tipo: 'data' },
      { id: 'validade', label: 'Validade (legado)', tipo: 'data' },
      { id: 'producao.lote', label: 'Lote', tipo: 'texto' },
      { id: 'lote', label: 'Lote (legado)', tipo: 'texto' },
      { id: 'dataProducao', label: 'Data produção (legado)', tipo: 'data' },
      { id: 'op', label: 'Ordem de produção', tipo: 'texto' },
      { id: 'quantidadePecas', label: 'Qtd. peças', tipo: 'texto' },
      { id: 'producao.diasValidade', label: 'Dias validade (produção)', tipo: 'texto' },
      { id: 'producao.tipoConservacao', label: 'Conservação (produção)', tipo: 'texto' },
      { id: 'producao.taraPrimaria', label: 'Tara primária (kg)', tipo: 'peso' },
      { id: 'producao.taraSecundaria', label: 'Tara secundária (kg)', tipo: 'peso' },
      { id: 'producao.pesoPadrao', label: 'Peso padrão', tipo: 'peso' },
      { id: 'producao.pesoMedioPeca', label: 'Peso médio peça', tipo: 'peso' },
      { id: 'producao.temperaturaInicial', label: 'Temperatura inicial (°C)', tipo: 'texto' },
      { id: 'producao.temperaturaFinal', label: 'Temperatura final (°C)', tipo: 'texto' },
      { id: 'dataAtual', label: 'Data atual', tipo: 'data' },
      { id: 'horaAtual', label: 'Hora atual', tipo: 'hora' },
      { id: 'produto', label: 'Nome produto (legado)', tipo: 'texto' },
      { id: 'codigoBarras', label: 'Cód. barras (legado)', tipo: 'codigo_barras' },
      { id: 'produto.qrPayload', label: 'QR Code (texto/URL)', tipo: 'qrcode_valor' },
    ],
  },
  {
    id: 'elementos_estaticos',
    titulo: 'Elementos estáticos',
    itens: [
      { id: 'estatico.texto', label: 'Texto livre', tipo: 'texto_estatico' },
      { id: 'estatico.linha', label: 'Linha divisória', tipo: 'forma', formaId: 'linha' },
      { id: 'estatico.retangulo', label: 'Retângulo / moldura', tipo: 'forma', formaId: 'retangulo' },
      { id: 'estatico.imagem', label: 'Logomarca / imagem estática', tipo: 'imagem' },
    ],
  },
];

export function variavelIdParaPlaceholder(id: string): string {
  return `{{${id.trim()}}}`;
}

export function placeholderParaVariavelId(placeholder: string): string | undefined {
  const m = /^\{\{\s*([^}]+?)\s*\}\}$/.exec(placeholder.trim());
  return m ? m[1].trim() : undefined;
}

const TEXTO_EXEMPLO_POR_ID: Record<string, string> = {
  'produto.nome': 'NOME DO PRODUTO AQUI',
  produto: 'NOME DO PRODUTO AQUI',
  'produto.codigo': '000123',
  'produto.codigoBarras': '7891234567890',
  codigoBarras: '7891234567890',
  'produto.ean': '7891234567890',
  'produto.descricao': 'Descrição comercial do item para o rótulo.',
  'produto.precoVenda': 'R$ 99,90',
  'produto.precoCusto': 'R$ 45,00',
  'produto.precoAtacado': 'R$ 79,90',
  'produto.unidadeMedida': 'KG',
  'produto.marca': 'MARCA EXEMPLO',
  'categoria.nome': 'Frios e laticínios',
  'fornecedor.nome': 'Fornecedor XYZ Ltda',
  'produto.ncm': '2106.90.90',
  'produto.cest': '17.019.00',
  'produto.pesoLiquido': '1,250 kg',
  'produto.pesoBruto': '1,280 kg',
  'produto.diasValidade': '7 dias',
  'produto.tipoConservacao': 'Refrigerado',
  'produto.pesavel': 'Sim',
  'producao.ingredientes': 'Farinha, água, sal…',
  'producao.alergenicos': 'Contém glúten. Pode conter leite.',
  'producao.informacaoNutricional':
    'Porção 30g | Calorias 120 kcal | Carboidratos 22g…',
  'producao.descricaoEtiqueta': 'Texto oficial do rótulo cadastrado em produção.',
  'producao.descricaoMinisterio': 'Denominação conforme MAPA.',
  'producao.registroRotuloPGA': 'SIF 1234',
  'producao.embalagemPrimaria': 'Bandeja PET',
  'producao.embalagemSecundaria': 'Caixa coletora',
  'producao.gtin14': '01234567890128',
  'pesagem.tara': 'Tara: 0,020 kg',
  'pesagem.pesoLiquido': '0,480 kg',
  'pesagem.pesoBruto': '0,500 kg',
  peso: '0,485 kg',
  'producao.dataFabricacao': 'FAB: 01/04/2026',
  'producao.dataValidade': 'VAL: 31/12/2026',
  validade: 'VAL: 31/12/2026',
  'producao.lote': 'Lote: 2026-A-0042',
  lote: 'Lote: 2026-A-0042',
  dataProducao: '01/04/2026',
  op: 'OP-2026-0088',
  quantidadePecas: '12 un',
  'producao.diasValidade': '15 dias',
  'producao.tipoConservacao': 'Congelado',
  'producao.taraPrimaria': 'Tara prim.: 0,015 kg',
  'producao.taraSecundaria': 'Tara sec.: 0,080 kg',
  'producao.pesoPadrao': 'Peso padrão: 0,500 kg',
  'producao.pesoMedioPeca': 'Média: 0,120 kg/un',
  'producao.temperaturaInicial': '-2 °C',
  'producao.temperaturaFinal': '4 °C',
  dataAtual: '11/04/2026',
  horaAtual: '14:35',
  'produto.qrPayload': 'https://exemplo.com/rastreio/ABC123',
  'rastreabilidade.qrPayload': 'https://rastreabilidade.agricultura.gov.br/…',
};

export function textoExemploParaVariavel(id: string): string {
  return TEXTO_EXEMPLO_POR_ID[id] ?? `[${id}]`;
}

export function textoExemploParaPlaceholder(placeholder: string): string {
  const id = placeholderParaVariavelId(placeholder);
  if (id) return textoExemploParaVariavel(id);
  return placeholder;
}
