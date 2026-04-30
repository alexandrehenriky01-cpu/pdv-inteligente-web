import React, { FormEvent, useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { Layout } from '../../../components/Layout';
import { api } from '../../../services/api';
import { resolveCardapioImageUrl } from '../../../utils/resolveCardapioImageUrl';
import { Sparkles, ImageIcon, X, Upload, AlertCircle, Loader2 } from 'lucide-react';

function normalizarDecimal(valor: number | string | null | undefined): number {
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : 0;
  if (typeof valor !== 'string') return 0;
  const limpo = valor.trim().replace(',', '.');
  const parsed = Number(limpo);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseUuidList(text: string): string[] {
  return text
    .split(/[,;\s]+/)
    .map((s) => s.trim())
    .filter((s) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s));
}

type Produto = { id: string; nome: string; codigo?: string | null; precoVenda?: number };
type Ingrediente = { produtoId: string; quantidade: number };
type Adicional = { nome: string; produtoId: string; quantidade: number; precoExtra: number };
type AdicionalGestaoApi = Adicional & {
  origem?: 'LEGADO' | 'CATALOGO';
  itemAdicionalId?: string;
  maxQuantidade?: number | null;
};
type TipoItemCardapioUi = 'COMIDA' | 'BEBIDA' | 'PIZZA';
type TamanhoEdicao = { id?: string; nome: string; preco: number | string; ativo: boolean; ordem: number | string };
type VinculoCatalogoEdicao = {
  itemAdicionalId: string;
  precoOverride?: number | null;
  maxQuantidade?: number | null;
  ativo?: boolean;
};
type ItemAdicionalCatalogo = {
  id: string;
  nome: string;
  precoBase: number;
  tipoItem: string;
  ativo: boolean;
};
type ItemCardapio = {
  id: string;
  nome: string;
  categoria: string;
  precoVenda: number;
  ativo: boolean;
  tipoItem?: TipoItemCardapioUi;
  permiteMultiplosSabores?: boolean;
  maxSabores?: number | null;
  saboresPermitidosIds?: string[] | null;
  tamanhos?: TamanhoEdicao[];
  ingredientes: Ingrediente[];
  adicionais: AdicionalGestaoApi[];
  imagemUrl?: string;
  descricao?: string;
};

type ApiData<T> = { sucesso: boolean; dados?: T; erro?: string };

type AuryaSugestoes = {
  imagens: string[];
  imageOptions?: Array<{ url: string; provider: string; score: number }>;
  fallbacks: string[];
  descricao: string;
  categoria: string;
  fallbackUsado?: boolean;
  avisoFallback?: string;
  /** Provedor retornado pela API (google-imagen, google-gemini, huggingface, pexels, unsplash, placeholder). */
  provider?: string;
};

function resolveOrigemImagemBanner(
  provider: string | undefined,
  fallback: boolean,
  aviso?: string
): { text: string; tipo: 'info' | 'warning' } {
  if (provider === 'pexels' || provider === 'unsplash') {
    return {
      text: aviso || 'Imagem IA indisponível; usando imagem de banco gratuito.',
      tipo: 'warning',
    };
  }
  if (provider === 'placeholder') {
    return {
      text: aviso || 'Imagem temporária — envie uma foto ou tente novamente.',
      tipo: 'warning',
    };
  }
  if (
    provider === 'huggingface' ||
    provider === 'google-imagen' ||
    provider === 'google-gemini'
  ) {
    return { text: 'Imagem gerada por IA', tipo: 'info' };
  }
  if (!fallback) {
    return { text: 'Imagem gerada por IA', tipo: 'info' };
  }
  return { text: aviso || 'Imagem IA indisponível.', tipo: 'warning' };
}

export function GestaoCardapioPage() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [itens, setItens] = useState<ItemCardapio[]>([]);
  const [catalogoAdicionais, setCatalogoAdicionais] = useState<ItemAdicionalCatalogo[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [itemEdicaoId, setItemEdicaoId] = useState<string | null>(null);
  const [showImportRevenda, setShowImportRevenda] = useState(false);
  const [showAuryaModal, setShowAuryaModal] = useState(false);
  const [novo, setNovo] = useState({
    nome: '',
    categoria: '',
    precoVenda: '',
    tipoItem: 'COMIDA' as TipoItemCardapioUi,
    permiteMultiplosSabores: false,
    maxSabores: '',
    saboresPermitidosTexto: '',
    ingredienteProdutoId: '',
    ingredienteQuantidade: 1,
    imagemUrl: '',
    descricao: '',
  });
  const [edicao, setEdicao] = useState({
    nome: '',
    categoria: '',
    precoVenda: '',
    ativo: true,
    tipoItem: 'COMIDA' as TipoItemCardapioUi,
    permiteMultiplosSabores: false,
    maxSabores: '',
    saboresPermitidosTexto: '',
    tamanhos: [] as TamanhoEdicao[],
    vinculosCatalogo: [] as VinculoCatalogoEdicao[],
    adicionaisLegacy: [] as Adicional[],
    ingredientes: [] as Ingrediente[],
    imagemUrl: '',
    descricao: '',
  });
  const [catalogNovo, setCatalogNovo] = useState({
    nome: '',
    precoBase: '',
    tipoItem: 'COMIDA' as TipoItemCardapioUi,
  });

  const categorias = useMemo(() => {
    const setCategorias = new Set<string>();
    for (const item of itens) setCategorias.add(item.categoria);
    return Array.from(setCategorias).sort((a, b) => a.localeCompare(b));
  }, [itens]);

  const itemEmEdicao = useMemo(
    () => itens.find((item) => item.id === itemEdicaoId) ?? null,
    [itens, itemEdicaoId]
  );

  async function carregar() {
    setLoading(true);
    setErro(null);
    try {
      const [resItens, resProdutos, resCatalogo] = await Promise.all([
        api.get<ApiData<{ itens: ItemCardapio[] }>>('/api/cardapio/gestao'),
        api.get<Produto[]>('/api/cadastros/produtos'),
        api.get<ApiData<{ itens: ItemAdicionalCatalogo[] }>>('/api/cardapio/adicionais-catalogo'),
      ]);
      setItens(resItens.data.dados?.itens ?? []);
      setProdutos(resProdutos.data);
      setCatalogoAdicionais(resCatalogo.data.dados?.itens ?? []);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Falha ao carregar dados do cardápio.';
      setErro(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void carregar();
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!novo.ingredienteProdutoId) {
      setErro('Selecione ao menos um produto-base para o item.');
      return;
    }

    try {
      console.log('[Frontend] Enviando item para criar:', { nome: novo.nome, imagemUrl: novo.imagemUrl });
      
      const saboresIdsNovo = parseUuidList(novo.saboresPermitidosTexto);
      const response = await api.post<ApiData<ItemCardapio>>('/api/cardapio', {
        nome: novo.nome,
        categoria: novo.categoria,
        precoVenda: normalizarDecimal(novo.precoVenda),
        tipoItem: novo.tipoItem,
        permiteMultiplosSabores: novo.permiteMultiplosSabores === true,
        ...(novo.permiteMultiplosSabores === true
          ? {
              maxSabores: Math.trunc(normalizarDecimal(novo.maxSabores || '2')),
              ...(saboresIdsNovo.length > 0 ? { saboresPermitidosIds: saboresIdsNovo } : {}),
            }
          : {}),
        ingredientes: [
          {
            produtoId: novo.ingredienteProdutoId,
            quantidade: Number(novo.ingredienteQuantidade),
          },
        ],
        adicionais: [],
        imagemUrl: novo.imagemUrl,
        descricao: novo.descricao,
      });
      
      console.log('[Frontend] Resposta do servidor:', response.data);
      
      if (response.data.sucesso && response.data.dados?.imagemUrl) {
        console.log('[Frontend] Imagem salva localmente:', response.data.dados.imagemUrl);
      }
      
      setSucesso(`Item "${novo.nome}" criado com sucesso!`);
      setTimeout(() => setSucesso(null), 3000);
      
      setNovo({
        nome: '',
        categoria: '',
        precoVenda: '',
        tipoItem: 'COMIDA',
        permiteMultiplosSabores: false,
        maxSabores: '',
        saboresPermitidosTexto: '',
        ingredienteProdutoId: '',
        ingredienteQuantidade: 1,
        imagemUrl: '',
        descricao: '',
      });
      setImagensComErro(new Set());
      await carregar();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Falha ao criar item de cardápio.';
      setErro(msg);
    }
  }

  function iniciarEdicao(item: ItemCardapio) {
    setItemEdicaoId(item.id);
    const adds = item.adicionais ?? [];
    const adicionaisLegacy: Adicional[] = adds
      .filter((a) => a.origem !== 'CATALOGO')
      .map((a) => ({
        nome: a.nome,
        produtoId: a.produtoId,
        quantidade: Number(a.quantidade),
        precoExtra: Number(a.precoExtra),
      }));
    const vinculosCatalogo: VinculoCatalogoEdicao[] = adds
      .filter((a) => a.origem === 'CATALOGO' && a.itemAdicionalId)
      .map((a) => ({
        itemAdicionalId: String(a.itemAdicionalId),
        precoOverride: Number(a.precoExtra),
        maxQuantidade: a.maxQuantidade ?? null,
        ativo: true,
      }));
    const tamanhos: TamanhoEdicao[] = (item.tamanhos ?? []).map((t, idx) => ({
      id: t.id,
      nome: t.nome,
      preco: String(Number(t.preco).toFixed(2)).replace('.', ','),
      ativo: t.ativo !== false,
      ordem: typeof t.ordem === 'number' ? t.ordem : idx,
    }));
    const idsPerm = Array.isArray(item.saboresPermitidosIds) ? item.saboresPermitidosIds : [];
    setEdicao({
      nome: item.nome,
      categoria: item.categoria,
      precoVenda: String(Number(item.precoVenda).toFixed(2)).replace('.', ','),
      ativo: item.ativo,
      tipoItem:
        item.tipoItem === 'BEBIDA' ? 'BEBIDA' : item.tipoItem === 'PIZZA' ? 'PIZZA' : 'COMIDA',
      permiteMultiplosSabores: item.permiteMultiplosSabores === true,
      maxSabores: item.maxSabores != null ? String(item.maxSabores) : '',
      saboresPermitidosTexto: idsPerm.join(', '),
      tamanhos,
      vinculosCatalogo,
      adicionaisLegacy,
      ingredientes: item.ingredientes?.map((i) => ({ produtoId: i.produtoId, quantidade: Number(i.quantidade) })) ?? [],
      imagemUrl: item.imagemUrl ?? '',
      descricao: item.descricao ?? '',
    });
  }

  function adicionarIngredienteEdicao() {
    if (!produtos[0]) return;
    setEdicao((old) => ({
      ...old,
      ingredientes: [...old.ingredientes, { produtoId: produtos[0].id, quantidade: 1 }],
    }));
  }

  function atualizarIngredienteEdicao(index: number, patch: Partial<Ingrediente>) {
    setEdicao((old) => ({
      ...old,
      ingredientes: old.ingredientes.map((ingrediente, i) => (i === index ? { ...ingrediente, ...patch } : ingrediente)),
    }));
  }

  function removerIngredienteEdicao(index: number) {
    setEdicao((old) => ({
      ...old,
      ingredientes: old.ingredientes.filter((_, i) => i !== index),
    }));
  }

  async function salvarEdicao() {
    if (!itemEdicaoId) return;
    if (edicao.ingredientes.length === 0) {
      setErro('A ficha técnica precisa ter pelo menos 1 ingrediente.');
      return;
    }
    try {
      const saboresIdsEd = parseUuidList(edicao.saboresPermitidosTexto);
      const payload = {
        nome: edicao.nome,
        categoria: edicao.categoria,
        precoVenda: normalizarDecimal(edicao.precoVenda),
        ativo: edicao.ativo,
        tipoItem: edicao.tipoItem,
        permiteMultiplosSabores: edicao.permiteMultiplosSabores === true,
        ...(edicao.permiteMultiplosSabores === true
          ? {
              maxSabores: Math.trunc(normalizarDecimal(edicao.maxSabores || '2')),
              ...(saboresIdsEd.length > 0 ? { saboresPermitidosIds: saboresIdsEd } : {}),
            }
          : { maxSabores: null, saboresPermitidosIds: null }),
        tamanhos: edicao.tamanhos.map((t, idx) => ({
          ...(t.id ? { id: t.id } : {}),
          nome: t.nome,
          preco: normalizarDecimal(t.preco),
          ativo: t.ativo,
          ordem: Math.max(0, Math.trunc(normalizarDecimal(t.ordem ?? idx))),
        })),
        vinculosAdicionaisCatalogo: edicao.vinculosCatalogo.map((v) => ({
          itemAdicionalId: v.itemAdicionalId,
          precoOverride: v.precoOverride ?? null,
          maxQuantidade: v.maxQuantidade ?? null,
          ativo: v.ativo ?? true,
        })),
        adicionais: edicao.adicionaisLegacy,
        ingredientes: edicao.ingredientes,
        imagemUrl: edicao.imagemUrl,
        descricao: edicao.descricao,
      };
      console.log('[CARDAPIO_PAYLOAD_UPDATE]', payload);
      await api.put(`/api/cardapio/${itemEdicaoId}`, payload);
      setItemEdicaoId(null);
      await carregar();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Falha ao salvar item.';
      setErro(msg);
    }
  }

  async function importarProdutoRevenda(produto: Produto) {
    try {
      const categoriaInferida = produto.nome.toLowerCase().includes('refri')
        ? 'Bebidas'
        : produto.nome.toLowerCase().includes('agua')
          ? 'Bebidas'
          : 'Revenda';
      await api.post<ApiData<ItemCardapio>>('/api/cardapio', {
        nome: produto.nome,
        categoria: categoriaInferida,
        precoVenda: Number(produto.precoVenda ?? 0),
        tipoItem: categoriaInferida === 'Bebidas' ? 'BEBIDA' : 'COMIDA',
        ingredientes: [{ produtoId: produto.id, quantidade: 1 }],
        adicionais: [],
      });
      setShowImportRevenda(false);
      await carregar();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Falha ao importar produto de revenda.';
      setErro(msg);
    }
  }

  async function toggleAtivo(item: ItemCardapio) {
    try {
      await api.put(`/api/cardapio/${item.id}`, { ativo: !item.ativo });
      await carregar();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Falha ao atualizar status do item.';
      setErro(msg);
    }
  }

  const [gerandoAurya, setGerandoAurya] = useState(false);
  const [sugestoesAurya, setSugestoesAurya] = useState<AuryaSugestoes | null>(null);
  const [imagemSelecionada, setImagemSelecionada] = useState<string | null>(null);
  const [modoAurya, setModoAurya] = useState<'novo' | 'edicao'>('novo');
  const [imagensComErro, setImagensComErro] = useState<Set<string>>(new Set());
  const [imagensLoading, setImagensLoading] = useState<Set<string>>(new Set());
  const [erroGeracao, setErroGeracao] = useState<string | null>(null);
  const [mensagemOrigemImagem, setMensagemOrigemImagem] = useState<string | null>(null);
  const [tipoMensagemOrigem, setTipoMensagemOrigem] = useState<'info' | 'warning'>('warning');
  const loadingTimeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const SEM_FOTO_URL = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCIgZm9jdXNpbmc9Im5vbmUiPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9IiMzMzMiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEyIiBmaWxsPSIjNTU1IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5Tb20gZm90by90ZXh0PjwvdGV4dD48L3N2Zz4=';

  const handleImagemErro = useCallback((url: string) => {
    setImagensComErro((prev) => {
      if (prev.has(url)) return prev;
      const next = new Set(prev);
      next.add(url);
      return next;
    });
    setImagensLoading((prev) => {
      const next = new Set(prev);
      next.delete(url);
      return next;
    });
    const timeout = loadingTimeoutsRef.current.get(url);
    if (timeout) {
      clearTimeout(timeout);
      loadingTimeoutsRef.current.delete(url);
    }
  }, []);

  const handleImagemCarregou = useCallback((url: string) => {
    setImagensLoading((prev) => {
      if (!prev.has(url)) return prev;
      const next = new Set(prev);
      next.delete(url);
      return next;
    });
    const timeout = loadingTimeoutsRef.current.get(url);
    if (timeout) {
      clearTimeout(timeout);
      loadingTimeoutsRef.current.delete(url);
    }
  }, []);

  const handleImagemTimeout = useCallback((url: string) => {
    setImagensComErro((prev) => {
      if (prev.has(url)) return prev;
      const next = new Set(prev);
      next.add(url);
      return next;
    });
    setImagensLoading((prev) => {
      const next = new Set(prev);
      next.delete(url);
      return next;
    });
  }, []);

  const ImagePreview = React.memo(function ImagePreview({ src, alt, className }: { src?: string | null; alt: string; className?: string }) {
    const resolvedSrc = resolveCardapioImageUrl(src);
    
    if (!resolvedSrc) {
      return (
        <div className={`bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-500 ${className}`}>
          <ImageIcon size={16} />
        </div>
      );
    }
    if (imagensComErro.has(resolvedSrc)) {
      return (
        <img
          src={SEM_FOTO_URL}
          alt={alt}
          className={className}
        />
      );
    }
    const isLoading = imagensLoading.has(resolvedSrc);
    return (
      <div className="relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-800 z-10">
            <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
          </div>
        )}
        <img
          src={resolvedSrc}
          alt={alt}
          className={className}
          onLoad={() => handleImagemCarregou(resolvedSrc)}
          onError={() => handleImagemErro(resolvedSrc)}
        />
      </div>
    );
  });

  const auryaTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const STOPWORDS = new Set(['de', 'da', 'do', 'com', 'o', 'a', 'os', 'as', 'um', 'uma', 'e', 'em', 'no', 'na', 'ao', 'à']);

  const TERM_TRANSLATIONS: Record<string, string> = {
    'frango': 'chicken',
    'carne': 'beef',
    'suco': 'juice',
    'refrigerante': 'soda',
    'refri': 'soda',
    'agua': 'water',
    'água': 'water',
    'queijo': 'cheese',
    'bacon': 'bacon',
    'salada': 'salad',
    'tomate': 'tomato',
    'alface': 'lettuce',
    'cebola': 'onion',
    'batata': 'fries',
    'fritas': 'fries',
    'chocolate': 'chocolate',
    'morango': 'strawberry',
    'baiano': 'spicy',
    'calabresa': 'sausage',
    'marguerita': 'margherita',
    'portuguesa': 'portuguese',
    'americana': 'american',
    'brasileira': 'brazilian',
    'gourmet': 'gourmet',
    'especial': 'special',
    'tudo': 'everything',
    'big': 'big',
    'medio': 'medium',
    'pequeno': 'small',
  };

  const CATEGORY_TAGS: Record<string, string[]> = {
    default: ['food'],
    bebidas: ['beverage', 'drink', 'soda', 'refreshment'],
    lanches: ['burger', 'sandwich', 'fastfood', 'delicious'],
    pizzas: ['pizza', 'italian', 'cheese'],
    sobremesas: ['dessert', 'sweet', 'cake', 'gourmet'],
    salgados: ['snack', 'pastry', 'fried', 'savory'],
    sorvetes: ['icecream', 'frozen', 'dessert'],
    massas: ['pasta', 'italian', 'spaghetti'],
    combos: ['combo', 'meal', 'platter'],
  };

  function getSearchTerms(nome: string, categoria: string): { tags: string[]; slotUrls: string[][]; placeholderKey: string } {
    const catLower = categoria.toLowerCase().trim();
    let tagKey = 'default';

    if (/bebida|refri|refrigerante|coca|guarana|suco|sprite|fanta|pepsi|agua|água/i.test(catLower)) {
      tagKey = 'bebidas';
    } else if (/lanche|sanduiche|x[\s-]|burger|hamburguer/i.test(nome) || /lanche/i.test(catLower)) {
      tagKey = 'lanches';
    } else if (/pizza/i.test(catLower) || /pizza/i.test(nome)) {
      tagKey = 'pizzas';
    } else if (/sobremesa|sorvete|açaí|açaí|doce|bolo|gelado/i.test(catLower + nome)) {
      tagKey = 'sobremesas';
    } else if (/salgado|frito/i.test(catLower + nome)) {
      tagKey = 'salgados';
    } else if (/sorvete|gelado/i.test(nome)) {
      tagKey = 'sorvetes';
    } else if (/massa|macarrao|espaguete/i.test(nome)) {
      tagKey = 'massas';
    }

    const categoryTags = CATEGORY_TAGS[tagKey] || CATEGORY_TAGS.default;

    const words = nome
      .replace(/x[\s-]*/gi, 'X ')
      .replace(/[^a-zA-Z0-9À-ÿ\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 0 && !STOPWORDS.has(w.toLowerCase()));

    const translatedWords = words.map(w => {
      const lower = w.toLowerCase().replace(/x\s*$/i, '');
      return TERM_TRANSLATIONS[lower] || w.toLowerCase();
    });

    const mainIngredient = translatedWords.find(w => ['chicken', 'beef', 'cheese', 'bacon', 'sausage', 'ham'].includes(w)) || translatedWords[0] || 'food';

    const slot1Terms = ['food', ...categoryTags.slice(0, 2), ...translatedWords].filter(Boolean);
    const slot2Terms = ['food', ...categoryTags.slice(0, 3)];
    const slot3Terms = ['food', 'appetizing', mainIngredient];
    const slot4Terms = ['food', 'delicious', 'gourmet'];

    return {
      tags: categoryTags,
      slotUrls: [slot1Terms, slot2Terms, slot3Terms, slot4Terms],
      placeholderKey: tagKey,
    };
  }

  async function gerarSugestoesAurya() {
    if (auryaTimerRef.current) {
      clearTimeout(auryaTimerRef.current);
      auryaTimerRef.current = null;
    }

    setGerandoAurya(true);
    setErroGeracao(null);
    setMensagemOrigemImagem(null);
    setImagensComErro(new Set());

    try {
      const sourceNome = (modoAurya === 'novo' ? novo.nome : edicao.nome) || '';
      const sourceCategoria = (modoAurya === 'novo' ? novo.categoria : edicao.categoria) || '';
      const sourceDescricao = (modoAurya === 'novo' ? novo.descricao : edicao.descricao) || '';

      if (!sourceNome || !sourceCategoria) {
        setErroGeracao('Por favor, preencha o nome e a categoria antes de gerar a imagem.');
        setGerandoAurya(false);
        return;
      }

      const response = await api.post<{
        sucesso: boolean;
        dados?: {
          imagemUrl?: string;
          imageUrl?: string;
          imageBase64?: string;
          fallback?: boolean;
          fallbackUsed?: boolean;
          provider?: string;
          imageOptions?: Array<{ url: string; provider: string; score: number }>;
          aviso?: string;
          motivoFallback?: string;
        };
        erro?: string;
      }>(
        '/api/ia/gerar-imagem',
        {
          nome: sourceNome,
          categoria: sourceCategoria,
          descricao: sourceDescricao,
        }
      );

      const dados = response.data.dados;
      const rawBase64 = dados?.imageBase64?.trim();
      const rawUrl = dados?.imagemUrl ?? dados?.imageUrl;
      const imageSource =
        rawBase64 && rawBase64.length > 0
          ? rawBase64.startsWith('data:')
            ? rawBase64
            : `data:image/png;base64,${rawBase64}`
          : rawUrl
            ? resolveCardapioImageUrl(rawUrl)
            : '';

      if (response.data.sucesso && imageSource) {
        const fallbackUsado = !!(dados?.fallbackUsed ?? dados?.fallback);
        const provider = dados?.provider;
        const banner = resolveOrigemImagemBanner(provider, fallbackUsado, dados?.aviso);
        setMensagemOrigemImagem(banner.text);
        setTipoMensagemOrigem(banner.tipo);

        const optionsResolved = (dados?.imageOptions ?? [])
          .map((opt) => ({
            ...opt,
            url: resolveCardapioImageUrl(opt.url),
          }))
          .filter((opt) => !!opt.url);

        const imagensSugeridas = optionsResolved.length > 0
          ? optionsResolved.map((opt) => opt.url)
          : [imageSource];

        setSugestoesAurya({
          imagens: imagensSugeridas,
          imageOptions: optionsResolved,
          fallbacks: [],
          descricao: `${sourceNome} - Deliciosa opção preparada com ingredientes selecionados.`,
          categoria: sourceCategoria,
          fallbackUsado,
          avisoFallback: dados?.aviso || dados?.motivoFallback,
          provider,
        });
        setImagemSelecionada(imageSource);
      } else {
        setErroGeracao(response.data.erro || 'Erro ao gerar imagem.');
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erro de conexão ao gerar imagem.';
      setErroGeracao(msg);
    } finally {
      setGerandoAurya(false);
    }
  }

  function aplicarSugestoesAurya() {
    if (!sugestoesAurya || !imagemSelecionada) return;
    const newErrors = new Set(imagensComErro);
    newErrors.delete(imagemSelecionada);
    setImagensComErro(newErrors);
    
    if (modoAurya === 'novo') {
      setNovo((old) => ({
        ...old,
        imagemUrl: imagemSelecionada,
        descricao: sugestoesAurya.descricao,
        categoria: old.categoria || sugestoesAurya.categoria,
      }));
    } else {
      setEdicao((old) => ({
        ...old,
        imagemUrl: imagemSelecionada,
        descricao: sugestoesAurya.descricao,
        categoria: old.categoria || sugestoesAurya.categoria,
      }));
    }
    setShowAuryaModal(false);
    setSugestoesAurya(null);
    setImagemSelecionada(null);
  }

  function handleUploadImagem(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      setImagemSelecionada(base64);
    };
    reader.readAsDataURL(file);
  }

function fecharModalAurya() {
    if (auryaTimerRef.current) {
      clearTimeout(auryaTimerRef.current);
      auryaTimerRef.current = null;
    }
    setShowAuryaModal(false);
    setSugestoesAurya(null);
    setImagemSelecionada(null);
    setImagensComErro(new Set());
    setGerandoAurya(false);
    setErroGeracao(null);
    setMensagemOrigemImagem(null);
    loadingTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
    loadingTimeoutsRef.current.clear();
  }

  async function remover(itemId: string) {
    try {
      await api.delete(`/api/cardapio/${itemId}`);
      await carregar();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Falha ao remover item do cardápio.';
      setErro(msg);
    }
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-black">Gestao de Cardapio</h1>
          <p className="text-sm text-slate-400">Gerencie categorias e itens Food Service por loja.</p>
          <button
            type="button"
            onClick={() => setShowImportRevenda(true)}
            className="mt-3 rounded bg-emerald-600 px-3 py-2 text-sm font-bold text-white"
          >
            Importar Produto de Revenda
          </button>
        </div>

        <form onSubmit={onSubmit} className="grid grid-cols-1 gap-3 rounded-xl border border-slate-700 p-4 md:grid-cols-7">
          <div className="flex gap-2 md:col-span-2">
            <input
              className="flex-1 rounded border border-slate-600 bg-slate-900 p-2"
              placeholder="Nome do item"
              value={novo.nome}
              onChange={(e) => setNovo((old) => ({ ...old, nome: e.target.value }))}
              required
            />
            <button
              type="button"
              onClick={() => { setModoAurya('novo'); setShowAuryaModal(true); }}
              className="flex items-center gap-1 rounded bg-violet-600 px-3 py-2 text-sm font-bold text-white"
              title="Completar com Aurya"
            >
              <Sparkles className="h-4 w-4" />
            </button>
          </div>
          <input
            className="rounded border border-slate-600 bg-slate-900 p-2"
            list="categorias-existentes"
            placeholder="Categoria"
            value={novo.categoria}
            onChange={(e) => setNovo((old) => ({ ...old, categoria: e.target.value }))}
            required
          />
          <input
            className="rounded border border-slate-600 bg-slate-900 p-2"
            type="text"
            inputMode="decimal"
            placeholder="Preco"
            value={novo.precoVenda}
            onChange={(e) => setNovo((old) => ({ ...old, precoVenda: e.target.value }))}
            required
          />
          <select
            className="rounded border border-slate-600 bg-slate-900 p-2 text-sm"
            value={novo.tipoItem}
            onChange={(e) => {
              const v = e.target.value;
              setNovo((old) => ({
                ...old,
                tipoItem: v === 'BEBIDA' ? 'BEBIDA' : v === 'PIZZA' ? 'PIZZA' : 'COMIDA',
                ...(v !== 'PIZZA'
                  ? { permiteMultiplosSabores: false, maxSabores: '', saboresPermitidosTexto: '' }
                  : {}),
              }));
            }}
          >
            <option value="COMIDA">Comida</option>
            <option value="BEBIDA">Bebida</option>
            <option value="PIZZA">Pizza</option>
          </select>
          <select
            className="rounded border border-slate-600 bg-slate-900 p-2"
            value={novo.ingredienteProdutoId}
            onChange={(e) => setNovo((old) => ({ ...old, ingredienteProdutoId: e.target.value }))}
            required
          >
            <option value="">Produto base</option>
            {produtos.map((produto) => (
              <option key={produto.id} value={produto.id}>
                {produto.codigo ? `[${produto.codigo}] ` : ''}
                {produto.nome}
              </option>
            ))}
          </select>
          <button type="submit" className="rounded bg-violet-600 px-4 py-2 font-bold text-white">
            Adicionar
          </button>
          <input
            className="rounded border border-slate-600 bg-slate-900 p-2 md:col-span-4"
            placeholder="Descricao (auto)"
            value={novo.descricao}
            onChange={(e) => setNovo((old) => ({ ...old, descricao: e.target.value }))}
          />
          {novo.tipoItem === 'PIZZA' && (
            <div className="col-span-full grid gap-2 rounded border border-slate-700 bg-slate-900/40 p-3 md:grid-cols-3">
              <label className="flex items-center gap-2 text-sm text-slate-200 md:col-span-1">
                <input
                  type="checkbox"
                  checked={novo.permiteMultiplosSabores}
                  onChange={(e) =>
                    setNovo((old) => ({ ...old, permiteMultiplosSabores: e.target.checked }))
                  }
                />
                Multi-sabores
              </label>
              <input
                className="rounded border border-slate-600 bg-slate-900 p-2 text-sm"
                placeholder="Max sabores (ex: 2)"
                value={novo.maxSabores}
                onChange={(e) => setNovo((old) => ({ ...old, maxSabores: e.target.value }))}
                disabled={!novo.permiteMultiplosSabores}
              />
              <input
                className="rounded border border-slate-600 bg-slate-900 p-2 text-sm md:col-span-1"
                placeholder="UUIDs sabores permitidos (opcional)"
                value={novo.saboresPermitidosTexto}
                onChange={(e) => setNovo((old) => ({ ...old, saboresPermitidosTexto: e.target.value }))}
                disabled={!novo.permiteMultiplosSabores}
              />
            </div>
          )}
          {novo.imagemUrl && !imagensComErro.has(resolveCardapioImageUrl(novo.imagemUrl)) && (
            <div className="col-span-full flex items-center gap-4 mt-2 p-3 bg-slate-900/50 border border-slate-700 rounded-xl">
              <ImagePreview
                src={novo.imagemUrl}
                alt="Preview"
                className="w-16 h-16 object-cover rounded-lg shadow-md border border-slate-600"
              />
              <div className="flex flex-col">
                <span className="text-sm font-bold text-emerald-400">Imagem carregada com sucesso</span>
                <button type="button" onClick={() => { setModoAurya('novo'); setShowAuryaModal(true); }} className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1 mt-1">
                  <Sparkles size={12} /> Trocar Imagem / Refazer Aurya
                </button>
              </div>
            </div>
          )}
          {novo.imagemUrl && imagensComErro.has(resolveCardapioImageUrl(novo.imagemUrl)) && (
            <div className="col-span-full flex items-center gap-4 mt-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
              <div className="w-16 h-16 rounded-lg bg-slate-800 border border-red-500/30 flex items-center justify-center text-red-400">
                <AlertCircle size={20} />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-red-400">Erro ao carregar imagem</span>
                <button type="button" onClick={() => { setModoAurya('novo'); setShowAuryaModal(true); }} className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1 mt-1">
                  <Sparkles size={12} /> Tentar novamente
                </button>
              </div>
            </div>
          )}
          <datalist id="categorias-existentes">
            {categorias.map((cat) => (
              <option key={cat} value={cat} />
            ))}
          </datalist>
        </form>

        <div className="rounded-xl border border-slate-700 bg-slate-900/30 p-4 space-y-3">
          <h2 className="text-lg font-black text-slate-100">Catálogo de adicionais (loja)</h2>
          <p className="text-xs text-slate-500">Cadastre bacon, borda etc. Depois vincule ao item na edição da ficha.</p>
          <form
            className="flex flex-wrap items-end gap-2"
            onSubmit={async (e) => {
              e.preventDefault();
              setErro(null);
              try {
                await api.post('/api/cardapio/adicionais-catalogo', {
                  nome: catalogNovo.nome.trim(),
                  precoBase: normalizarDecimal(catalogNovo.precoBase),
                  tipoItem: catalogNovo.tipoItem,
                });
                setCatalogNovo({ nome: '', precoBase: '', tipoItem: 'COMIDA' });
                await carregar();
              } catch (err: unknown) {
                setErro(err instanceof Error ? err.message : 'Falha ao criar adicional.');
              }
            }}
          >
            <input
              className="rounded border border-slate-600 bg-slate-900 p-2 min-w-[10rem]"
              placeholder="Nome"
              value={catalogNovo.nome}
              onChange={(e) => setCatalogNovo((o) => ({ ...o, nome: e.target.value }))}
              required
            />
            <input
              type="text"
              inputMode="decimal"
              className="w-28 rounded border border-slate-600 bg-slate-900 p-2"
              value={catalogNovo.precoBase}
              onChange={(e) => setCatalogNovo((o) => ({ ...o, precoBase: e.target.value }))}
            />
            <select
              className="rounded border border-slate-600 bg-slate-900 p-2 text-sm"
              value={catalogNovo.tipoItem}
              onChange={(e) =>
                setCatalogNovo((o) => ({
                  ...o,
                  tipoItem: e.target.value === 'BEBIDA' ? 'BEBIDA' : 'COMIDA',
                }))
              }
            >
              <option value="COMIDA">Comida</option>
              <option value="BEBIDA">Bebida</option>
            </select>
            <button type="submit" className="rounded bg-emerald-600 px-3 py-2 text-sm font-bold text-white">
              + Adicional catálogo
            </button>
          </form>
          {catalogoAdicionais.length > 0 && (
            <ul className="flex flex-wrap gap-2 text-xs text-slate-400">
              {catalogoAdicionais.map((c) => (
                <li key={c.id} className="rounded border border-slate-700 px-2 py-1">
                  {c.nome} — R$ {Number(c.precoBase).toFixed(2)} ({String(c.tipoItem)})
                </li>
              ))}
            </ul>
          )}
        </div>

        {erro && <div className="rounded border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">{erro}</div>}
        {sucesso && <div className="rounded border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-300">{sucesso}</div>}

        {itemEmEdicao && (
          <div className="space-y-3 rounded-xl border border-violet-500/30 bg-violet-500/5 p-4">
            <h2 className="text-lg font-black">Ficha Tecnica / Ingredientes</h2>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-5">
              <div className="flex gap-2 md:col-span-2">
                <input
                  className="flex-1 rounded border border-slate-600 bg-slate-900 p-2"
                  value={edicao.nome}
                  onChange={(e) => setEdicao((old) => ({ ...old, nome: e.target.value }))}
                  placeholder="Nome"
                />
                <button
                  type="button"
                  onClick={() => { setModoAurya('edicao'); setShowAuryaModal(true); }}
                  className="p-2 bg-violet-600 text-white rounded"
                  title="Completar com Aurya"
                >
                  <Sparkles size={20} />
                </button>
              </div>
              <input
                className="rounded border border-slate-600 bg-slate-900 p-2"
                value={edicao.categoria}
                onChange={(e) => setEdicao((old) => ({ ...old, categoria: e.target.value }))}
                placeholder="Categoria"
              />
              <input
                type="text"
                inputMode="decimal"
                className="rounded border border-slate-600 bg-slate-900 p-2"
                value={edicao.precoVenda}
                onChange={(e) => setEdicao((old) => ({ ...old, precoVenda: e.target.value }))}
                placeholder="Preco"
              />
              <select
                className="rounded border border-slate-600 bg-slate-900 p-2 text-sm"
                value={edicao.tipoItem}
                onChange={(e) => {
                  const v = e.target.value;
                  setEdicao((old) => ({
                    ...old,
                    tipoItem: v === 'BEBIDA' ? 'BEBIDA' : v === 'PIZZA' ? 'PIZZA' : 'COMIDA',
                    vinculosCatalogo: [],
                    ...(v !== 'PIZZA'
                      ? { permiteMultiplosSabores: false, maxSabores: '', saboresPermitidosTexto: '' }
                      : {}),
                  }));
                }}
              >
                <option value="COMIDA">Comida</option>
                <option value="BEBIDA">Bebida</option>
                <option value="PIZZA">Pizza</option>
              </select>
              <label className="flex items-center gap-2 rounded border border-slate-600 bg-slate-900 p-2 text-sm md:col-span-5">
                <input
                  type="checkbox"
                  checked={edicao.ativo}
                  onChange={(e) => setEdicao((old) => ({ ...old, ativo: e.target.checked }))}
                />
                Item ativo
              </label>
            </div>
            {edicao.tipoItem === 'PIZZA' && (
              <div className="grid gap-2 rounded border border-slate-700 bg-slate-900/40 p-3 md:grid-cols-3">
                <label className="flex items-center gap-2 text-sm text-slate-200">
                  <input
                    type="checkbox"
                    checked={edicao.permiteMultiplosSabores}
                    onChange={(e) =>
                      setEdicao((old) => ({ ...old, permiteMultiplosSabores: e.target.checked }))
                    }
                  />
                  Multi-sabores
                </label>
                <input
                  className="rounded border border-slate-600 bg-slate-900 p-2 text-sm"
                  placeholder="Max sabores"
                  value={edicao.maxSabores}
                  onChange={(e) => setEdicao((old) => ({ ...old, maxSabores: e.target.value }))}
                  disabled={!edicao.permiteMultiplosSabores}
                />
                <input
                  className="rounded border border-slate-600 bg-slate-900 p-2 text-sm"
                  placeholder="UUIDs sabores (opcional)"
                  value={edicao.saboresPermitidosTexto}
                  onChange={(e) => setEdicao((old) => ({ ...old, saboresPermitidosTexto: e.target.value }))}
                  disabled={!edicao.permiteMultiplosSabores}
                />
              </div>
            )}
            <div className="rounded border border-slate-700 bg-slate-900/40 p-3 space-y-2">
              <h3 className="text-sm font-bold text-slate-200">Tamanhos (por item)</h3>
              <p className="text-xs text-slate-500">Vazio = apenas preço do item. Com cadastro, o menu obriga escolher tamanho.</p>
              {edicao.tamanhos.map((t, ti) => (
                <div key={`tam-${ti}`} className="grid grid-cols-1 gap-2 md:grid-cols-6">
                  <label className="text-xs text-slate-300 md:col-span-2">
                    Nome do tamanho
                    <input
                      className="mt-1 w-full rounded border border-slate-600 bg-slate-900 p-2"
                      placeholder="FAMILIA"
                      value={t.nome}
                      onChange={(e) =>
                        setEdicao((old) => ({
                          ...old,
                          tamanhos: old.tamanhos.map((x, j) => (j === ti ? { ...x, nome: e.target.value } : x)),
                        }))
                      }
                    />
                  </label>
                  <label className="text-xs text-slate-300">
                    Preço
                    <input
                      type="text"
                      inputMode="decimal"
                      className="mt-1 w-full rounded border border-slate-600 bg-slate-900 p-2"
                      placeholder="65,80"
                      value={String(t.preco ?? '')}
                      onChange={(e) =>
                        setEdicao((old) => ({
                          ...old,
                          tamanhos: old.tamanhos.map((x, j) =>
                            j === ti ? { ...x, preco: e.target.value } : x
                          ),
                        }))
                      }
                    />
                  </label>
                  <label className="text-xs text-slate-300">
                    Ordem
                    <input
                      type="number"
                      min={0}
                      className="mt-1 w-full rounded border border-slate-600 bg-slate-900 p-2"
                      placeholder="0"
                      value={t.ordem}
                      onChange={(e) =>
                        setEdicao((old) => ({
                          ...old,
                          tamanhos: old.tamanhos.map((x, j) =>
                            j === ti ? { ...x, ordem: Number(e.target.value) } : x
                          ),
                        }))
                      }
                    />
                  </label>
                  <label className="flex items-center gap-2 text-xs text-slate-300">
                    <input
                      type="checkbox"
                      checked={t.ativo}
                      onChange={(e) =>
                        setEdicao((old) => ({
                          ...old,
                          tamanhos: old.tamanhos.map((x, j) =>
                            j === ti ? { ...x, ativo: e.target.checked } : x
                          ),
                        }))
                      }
                    />
                    Ativo
                  </label>
                  <button
                    type="button"
                    className="rounded border border-red-500/40 px-2 py-1 text-xs text-red-300"
                    onClick={() =>
                      setEdicao((old) => ({
                        ...old,
                        tamanhos: old.tamanhos.filter((_, j) => j !== ti),
                      }))
                    }
                  >
                    Remover
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="rounded border border-slate-600 px-2 py-1 text-xs"
                onClick={() =>
                  setEdicao((old) => ({
                    ...old,
                    tamanhos: [
                      ...old.tamanhos,
                      { nome: '', preco: 0, ativo: true, ordem: old.tamanhos.length },
                    ],
                  }))
                }
              >
                + Tamanho
              </button>
            </div>
            <div className="rounded border border-slate-700 bg-slate-900/40 p-3 space-y-2">
              <h3 className="text-sm font-bold text-slate-200">Adicionais do catálogo (mesmo tipo do item)</h3>
              <div className="flex flex-wrap gap-3">
                {catalogoAdicionais
                  .filter((c) => {
                    const t = String(c.tipoItem).toUpperCase();
                    const alvo = edicao.tipoItem;
                    if (alvo === 'PIZZA') return (t === 'PIZZA' || t === 'COMIDA') && c.ativo;
                    return t === alvo && c.ativo;
                  })
                  .map((c) => {
                    const marcado = edicao.vinculosCatalogo.some((v) => v.itemAdicionalId === c.id);
                    return (
                      <label key={c.id} className="flex items-center gap-2 text-sm text-slate-200">
                        <input
                          type="checkbox"
                          checked={marcado}
                          onChange={(e) => {
                            const on = e.target.checked;
                            setEdicao((old) => ({
                              ...old,
                              vinculosCatalogo: on
                                ? [...old.vinculosCatalogo, { itemAdicionalId: c.id, precoOverride: null, maxQuantidade: null, ativo: true }]
                                : old.vinculosCatalogo.filter((v) => v.itemAdicionalId !== c.id),
                            }));
                          }}
                        />
                        {c.nome} (R$ {Number(c.precoBase).toFixed(2)})
                      </label>
                    );
                  })}
              </div>
            </div>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              <input
                className="rounded border border-slate-600 bg-slate-900 p-2"
                value={edicao.descricao}
                onChange={(e) => setEdicao((old) => ({ ...old, descricao: e.target.value }))}
                placeholder="Descricao"
              />
            </div>
            {edicao.imagemUrl && !imagensComErro.has(resolveCardapioImageUrl(edicao.imagemUrl)) && (
              <div className="flex items-center gap-4 p-3 bg-slate-900/50 border border-slate-700 rounded-xl">
                <ImagePreview
                  src={edicao.imagemUrl}
                  alt="Preview"
                  className="w-16 h-16 object-cover rounded-lg shadow-md border border-slate-600"
                />
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-emerald-400">Imagem carregada com sucesso</span>
                  <button type="button" onClick={() => { setModoAurya('edicao'); setShowAuryaModal(true); }} className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1 mt-1">
                    <Sparkles size={12} /> Trocar Imagem / Refazer Aurya
                  </button>
                </div>
              </div>
            )}
            {edicao.imagemUrl && imagensComErro.has(resolveCardapioImageUrl(edicao.imagemUrl)) && (
              <div className="flex items-center gap-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
                <div className="w-16 h-16 rounded-lg bg-slate-800 border border-red-500/30 flex items-center justify-center text-red-400">
                  <AlertCircle size={20} />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-red-400">Erro ao carregar imagem</span>
                  <button type="button" onClick={() => { setModoAurya('edicao'); setShowAuryaModal(true); }} className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1 mt-1">
                    <Sparkles size={12} /> Tentar novamente
                  </button>
                </div>
              </div>
            )}
            <div className="space-y-2">
              {edicao.ingredientes.map((ingrediente, index) => (
                <div key={`ing-${index}`} className="grid grid-cols-1 gap-2 md:grid-cols-5">
                  <select
                    className="rounded border border-slate-600 bg-slate-900 p-2 md:col-span-3"
                    value={ingrediente.produtoId}
                    onChange={(e) => atualizarIngredienteEdicao(index, { produtoId: e.target.value })}
                  >
                    {produtos.map((produto) => (
                      <option key={produto.id} value={produto.id}>
                        {produto.codigo ? `[${produto.codigo}] ` : ''}
                        {produto.nome}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min={0.001}
                    step="0.001"
                    className="rounded border border-slate-600 bg-slate-900 p-2"
                    value={ingrediente.quantidade}
                    onChange={(e) => atualizarIngredienteEdicao(index, { quantidade: Number(e.target.value) })}
                  />
                  <button
                    type="button"
                    className="rounded border border-red-500/40 px-2 py-1 text-red-300"
                    onClick={() => removerIngredienteEdicao(index)}
                  >
                    Remover
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={adicionarIngredienteEdicao} className="rounded border border-slate-600 px-3 py-1">
                + Ingrediente
              </button>
              <button type="button" onClick={() => void salvarEdicao()} className="rounded bg-violet-600 px-3 py-1 font-bold">
                Salvar Ficha
              </button>
              <button type="button" onClick={() => setItemEdicaoId(null)} className="rounded border border-slate-600 px-3 py-1">
                Cancelar
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-sm text-slate-400">Carregando cardapio...</div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-700">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-900">
                <tr>
                  <th className="p-3 text-left">Categoria</th>
                  <th className="p-3 text-left">Item</th>
                  <th className="p-3 text-left">Tipo</th>
                  <th className="p-3 text-left">Preco</th>
                  <th className="p-3 text-left">Status</th>
                  <th className="p-3 text-left">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {itens.map((item) => (
                  <tr key={item.id} className="border-t border-slate-800">
                    <td className="p-3">{item.categoria}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <ImagePreview
                          src={item.imagemUrl}
                          alt={item.nome}
                          className="w-10 h-10 rounded-lg object-cover border border-slate-700 shadow-sm"
                        />
                        <span className="font-semibold text-slate-200">{item.nome}</span>
                      </div>
                    </td>
                    <td className="p-3 text-xs uppercase text-slate-400">
                      {item.tipoItem === 'BEBIDA' ? 'Bebida' : item.tipoItem === 'PIZZA' ? 'Pizza' : 'Comida'}
                    </td>
                    <td className="p-3">R$ {Number(item.precoVenda).toFixed(2)}</td>
                    <td className="p-3">{item.ativo ? 'Ativo' : 'Inativo'}</td>
                    <td className="p-3">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => void toggleAtivo(item)}
                          className="rounded border border-slate-600 px-2 py-1"
                        >
                          {item.ativo ? 'Desativar' : 'Ativar'}
                        </button>
                        <button
                          type="button"
                          onClick={() => iniciarEdicao(item)}
                          className="rounded border border-violet-500/40 px-2 py-1 text-violet-200"
                        >
                          Editar ficha
                        </button>
                        <button
                          type="button"
                          onClick={() => void remover(item.id)}
                          className="rounded border border-red-500/40 px-2 py-1 text-red-300"
                        >
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {showAuryaModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <div className="max-h-[85vh] w-full max-w-2xl overflow-hidden rounded-xl border border-slate-700 bg-slate-950 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 p-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-violet-400" />
                  <h3 className="text-lg font-black">Completar com Aurya</h3>
                </div>
                <button type="button" onClick={fecharModalAurya} className="rounded border border-slate-700 p-1 hover:bg-slate-800">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="overflow-y-auto p-6">
                {!sugestoesAurya ? (
                  <div className="text-center">
                    <p className="mb-6 text-sm text-slate-400">
                      A IA Aurya vai gerar uma imagem profissional exclusiva para o seu produto com base no nome e categoria.
                    </p>
                    {erroGeracao && (
                      <div className="mb-4 rounded border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
                        {erroGeracao}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={gerarSugestoesAurya}
                      disabled={gerandoAurya}
                      className="flex w-full items-center justify-center gap-2 rounded bg-gradient-to-r from-violet-600 to-purple-600 px-6 py-4 font-bold text-white transition-all hover:from-violet-500 hover:to-purple-500 disabled:opacity-50"
                    >
                      {gerandoAurya ? (
                        <>
                          <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          <span>Gerando imagem com IA...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-5 w-5" />
                          <span>Gerar Imagem com IA</span>
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {mensagemOrigemImagem && (
                      <div
                        className={
                          tipoMensagemOrigem === 'info'
                            ? 'rounded border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-200'
                            : 'rounded border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-200'
                        }
                      >
                        {mensagemOrigemImagem}
                      </div>
                    )}
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-4">
                        <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                          Categoria Sugerida
                        </label>
                        <div className="flex items-center gap-2">
                          <span className="rounded bg-violet-500/20 px-3 py-1.5 text-sm font-bold text-violet-300">
                            {sugestoesAurya.categoria}
                          </span>
                        </div>
                      </div>
                      <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-4">
                        <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                          Descricao Sugerida
                        </label>
                        <p className="text-sm leading-relaxed text-slate-300">
                          {sugestoesAurya.descricao}
                        </p>
                      </div>
                    </div>

                    <div>
                      <label className="mb-3 block text-xs font-bold uppercase tracking-wider text-slate-500">
                        Imagem Gerada pela IA
                      </label>
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        {sugestoesAurya.imagens.map((img, index) => {
                          return (
                            <button
                              key={index}
                              type="button"
                              onClick={() => setImagemSelecionada(img)}
                              className={`relative overflow-hidden rounded-lg border-2 transition-all ${
                                imagemSelecionada === img
                                  ? 'border-4 border-violet-500 ring-2 ring-violet-500/50 shadow-lg shadow-violet-500/20'
                                  : 'border-slate-700 hover:border-slate-500'
                              }`}
                            >
                              <img
                                src={img}
                                alt={`Imagem gerada ${index + 1}`}
                                className="w-full h-48 object-cover"
                              />
                              {imagemSelecionada === img && (
                                <div className="absolute inset-0 flex items-center justify-center bg-violet-500/40">
                                  <Sparkles className="h-8 w-8 text-white drop-shadow-lg" />
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                      {!!sugestoesAurya.imageOptions && sugestoesAurya.imageOptions.length > 0 && (
                        <div className="mt-3 flex items-center gap-2">
                          {sugestoesAurya.imageOptions.map((opt, idx) => (
                            <button
                              key={`${opt.url}-${idx}`}
                              type="button"
                              onClick={() => setImagemSelecionada(opt.url)}
                              className={`overflow-hidden rounded-md border ${
                                imagemSelecionada === opt.url
                                  ? 'border-violet-500 ring-2 ring-violet-500/40'
                                  : 'border-slate-700'
                              }`}
                              title={`${opt.provider} • score ${opt.score}`}
                            >
                              <img
                                src={opt.url}
                                alt={`Opcao ${idx + 1}`}
                                className="h-14 w-14 object-cover"
                              />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="border-t border-slate-700 my-4" />

                    <div>
                      <p className="mb-3 text-xs text-slate-500">Ou envie sua propria foto:</p>
                      <div className="flex items-center gap-3">
                        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-slate-600 bg-slate-900/50 px-4 py-3 text-sm text-slate-400 transition-colors hover:border-violet-500/50 hover:text-violet-400">
                          <Upload className="h-4 w-4" />
                          <span>Escolher arquivo</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleUploadImagem}
                          />
                        </label>
                        {imagemSelecionada && imagemSelecionada.startsWith('data:') && (
                          <div className="relative overflow-hidden rounded-lg border-2 border-violet-500 ring-2 ring-violet-500/50">
                            <img
                              src={imagemSelecionada}
                              alt="Upload preview"
                              className="h-12 w-16 object-cover"
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-violet-500/20">
                              <Sparkles className="h-4 w-4 text-white" />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setSugestoesAurya(null);
                          setImagemSelecionada(null);
                          setMensagemOrigemImagem(null);
                        }}
                        className="flex-1 rounded border border-slate-600 px-4 py-3 font-bold transition-colors hover:bg-slate-800"
                      >
                        Gerar Novamente
                      </button>
                      <button
                        type="button"
                        onClick={aplicarSugestoesAurya}
                        disabled={!imagemSelecionada}
                        className="flex-1 rounded bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-3 font-bold text-white transition-all hover:from-emerald-500 hover:to-teal-500 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Aplicar Sugestoes
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {showImportRevenda && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <div className="max-h-[80vh] w-full max-w-2xl overflow-hidden rounded-xl border border-slate-700 bg-slate-950">
              <div className="flex items-center justify-between border-b border-slate-800 p-4">
                <h3 className="text-lg font-black">Importar Produto de Revenda</h3>
                <button type="button" onClick={() => setShowImportRevenda(false)} className="rounded border border-slate-700 px-2 py-1">
                  Fechar
                </button>
              </div>
              <div className="max-h-[65vh] overflow-y-auto p-4">
                <div className="grid grid-cols-1 gap-2">
                  {produtos.map((produto) => (
                    <button
                      key={produto.id}
                      type="button"
                      onClick={() => void importarProdutoRevenda(produto)}
                      className="flex items-center justify-between rounded border border-slate-700 bg-slate-900 px-3 py-2 text-left hover:border-emerald-500/40"
                    >
                      <span>
                        {produto.codigo ? `[${produto.codigo}] ` : ''}
                        {produto.nome}
                      </span>
                      <span className="text-xs text-emerald-300">Criar 1:1</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
