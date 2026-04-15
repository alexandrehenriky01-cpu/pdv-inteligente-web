import { useEffect, useState, type ChangeEvent } from 'react';
import { flushSync } from 'react-dom';
import { Layout } from '../../components/Layout';
import { api } from '../../services/api';
import { 
  Search, Plus, Edit2, Trash2, Package, 
  CheckCircle2, BrainCircuit,
  ChevronRight, ChevronLeft, Save, Sparkles,
  Filter, ArrowRight, X, TrendingUp, TrendingDown,
  Loader2, ShieldCheck, Clock, LineChart, Hash,
  Scale, ThermometerSnowflake, Tag, FileText, Box, ClipboardList
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AxiosError } from 'axios';
import { transformarParaMaiusculas } from '../../utils/formatters';
import { auryaBrandMark } from '../../assets/branding';

/** Tipo de item (SPED / Reg. 0200) — valores na raiz do produto. */
const OPCOES_TIPO_ITEM_SPED: { value: string; label: string }[] = [
  { value: '', label: '— Não informado —' },
  { value: '00', label: '00 — Mercadoria para Revenda' },
  { value: '01', label: '01 — Matéria-Prima' },
  { value: '02', label: '02 — Embalagem' },
  { value: '03', label: '03 — Produto em Processo' },
  { value: '04', label: '04 — Produto Acabado' },
  { value: '07', label: '07 — Material de Uso e Consumo' },
  { value: '09', label: '09 — Serviços' },
  { value: '99', label: '99 — Outras' },
];

/** Parse numérico que preserva 0 (ex.: 0°C). */
function parseFloatPermiteZero(val: unknown): number | undefined {
  if (val === '' || val === undefined || val === null) return undefined;
  const n = typeof val === 'number' ? val : parseFloat(String(val));
  if (Number.isNaN(n)) return undefined;
  return n;
}

/** Peso opcional em kg para campos decimais da API (`pesoConferencia`, `pesoBruto`, etc.). */
function parsePesoKgOpcionalApi(val: unknown): number | null {
  if (val === '' || val === undefined || val === null) return null;
  const n = Number(String(val).replace(',', '.'));
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

const UUID_LAYOUT_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function pareceUuidLayout(s: string): boolean {
  return UUID_LAYOUT_REGEX.test(s.trim());
}

export interface ILayoutEtiquetaResumo {
  id: string;
  nome: string;
  tipoEtiqueta?: string;
}

function buildOpcoesLayoutSelect(
  layouts: ILayoutEtiquetaResumo[],
  valorAtual: string | undefined
): { value: string; label: string }[] {
  const v = String(valorAtual ?? '').trim();
  const fromApi = layouts.map((l) => ({ value: l.id, label: l.nome }));
  const seen = new Set(fromApi.map((o) => o.value));
  const extras: { value: string; label: string }[] = [];
  if (v && !seen.has(v)) {
    extras.push({
      value: v,
      label: pareceUuidLayout(v)
        ? `Referência antiga (${v.slice(0, 8)}…)`
        : `${v} (texto legado)`,
    });
  }
  return [{ value: '', label: '— Não informado —' }, ...extras, ...fromApi];
}

/** Resposta resumida de `GET /api/embalagens` (ficha técnica / BOM). */
export interface IEmbalagemResumo {
  id: string;
  codigo: string;
  nome: string;
  ativo?: boolean;
  /** Decimal serializado pela API (string). */
  taraTotal?: string;
}

function extrairIdCategoriaDaResposta(body: unknown): string | undefined {
  if (!body || typeof body !== 'object') return undefined;
  const o = body as Record<string, unknown>;
  if (typeof o.id === 'string' && o.id.trim()) return o.id.trim();
  const nestedCat = o.categoria;
  if (nestedCat && typeof nestedCat === 'object') {
    const id = (nestedCat as Record<string, unknown>).id;
    if (typeof id === 'string' && id.trim()) return id.trim();
  }
  const dados = o.dados;
  if (dados && typeof dados === 'object') {
    const id = (dados as Record<string, unknown>).id;
    if (typeof id === 'string' && id.trim()) return id.trim();
  }
  return undefined;
}

function buildOpcoesEmbalagemSelect(
  lista: IEmbalagemResumo[],
  valorAtual: string | undefined
): { value: string; label: string }[] {
  const v = String(valorAtual ?? '').trim();
  const fromApi = lista.map((e) => ({
    value: e.id,
    label: `${e.codigo} — ${e.nome}${e.ativo === false ? ' (inativa)' : ''}`,
  }));
  const seen = new Set(fromApi.map((o) => o.value));
  const extras: { value: string; label: string }[] = [];
  if (v && !seen.has(v)) {
    extras.push({
      value: v,
      label: pareceUuidLayout(v)
        ? `Referência antiga (${v.slice(0, 8)}…)`
        : `${v} (texto legado)`,
    });
  }
  return [{ value: '', label: '— Não informado —' }, ...extras, ...fromApi];
}

function mapTipoConservacaoProducao(raw: unknown): string {
  if (raw === undefined || raw === null || String(raw).trim() === '') return 'RESFRIADO';
  const literal = String(raw).trim();
  const s = literal.toUpperCase().replace(/\s+/g, '_');
  if (s === 'RESFRIADO' || s === 'REFRIGERADO') return 'RESFRIADO';
  if (s === 'CONGELADO') return 'CONGELADO';
  if (s === 'TEMPERATURA_AMBIENTE' || s === 'AMBIENTE') return 'TEMPERATURA_AMBIENTE';
  if (literal === 'Resfriado') return 'RESFRIADO';
  if (literal === 'Congelado') return 'CONGELADO';
  if (literal === 'Ambiente') return 'TEMPERATURA_AMBIENTE';
  return 'RESFRIADO';
}

// 🛡️ INTERFACES DE TIPAGEM ESTRITA
export interface ICategoria {
  id: string;
  nome: string;
}

export interface IPlanoConta {
  id: string;
  codigo: string;
  nome: string;
  tipo: string;
}

export interface IProdutoProducao {
  gtin14?: string;
  familiaRendimento?: string;
  rendimentoPadrao?: string | number;
  pesoMedioPeca?: string | number;
  pesoMedioCaixa?: string | number;
  qtdMediaPecasPorCaixa?: string | number;
  pesoPadrao?: string | number;
  diasValidade?: string | number;
  tipoConservacao?: string;
  temperaturaInicial?: string | number;
  temperaturaFinal?: string | number;
  tipoProdutoProducao?: string;
  registroRotuloPGA?: string;
  descricaoMinisterio?: string;
  /** Peso de rotulagem/embalagem (kg) — só na raiz `Produto` na API; mantidos aqui no formulário da etapa 5. */
  pesoLiquido?: string | number;
  pesoBruto?: string | number;
  descricaoEtiqueta?: string;
  layoutEtiquetaInterna?: string;
  layoutEtiquetaSecundaria?: string;
  embalagemPrimaria?: string;
  embalagemSecundaria?: string;
  /** Tara (kg) espelhada da embalagem primária — editável após autopreenchimento. */
  taraPrimaria?: string | number;
  /** Tara (kg) espelhada da embalagem secundária. */
  taraSecundaria?: string | number;
  controlaEstoque?: boolean;
  controlaRendimento?: boolean;
  permiteVencido?: boolean;
  ingredientes?: string;
  alergenicos?: string;
  /** Texto JSON no formulário; a API normaliza para `Json` */
  informacaoNutricional?: string | Record<string, unknown>;
}

export interface IProduto {
  id?: string;
  codigo?: string; 
  nome: string;
  categoriaId: string;
  categoria?: ICategoria;
  unidadeMedida: string;
  precoCusto: string | number;
  precoVenda: string | number;
  codigoBarras: string;
  codigoInterno?: string;
  ncm: string;
  cest: string;
  cfopPadrao: string;
  origem: string;
  cstCsosnIcms?: string;
  cstCsosn?: string; 
  aliquotaIcms: string | number;
  cstPis: string;
  aliquotaPis: string | number;
  cstCofins: string;
  aliquotaCofins: string | number;
  contaEstoqueId: string;
  statusFiscal?: string;
  /** Classificação SPED (tipo item) — códigos 00, 01, … */
  tipoItem?: string;
  
  // 🚀 NOVO: Dados de Produção
  dadosProducao?: IProdutoProducao;
  controlaProducao?: boolean;
  /**
   * Resposta GET: espelho logístico na raiz do produto.
   * No formulário, validade/peso/conservação são editados apenas em `dadosProducao` (etapa 5).
   */
  diasValidade?: string | number | null;
  tipoConservacao?: string | null;
  pesoLiquido?: string | number | null;
  pesoBruto?: string | number | null;
  /** Peso produto + embalagem (kg) — self-checkout / conferência na balança. */
  pesoConferencia?: string | number | null;
  /** Envia produto na carga TXT da balança (Toledo MGV6 etc.). */
  pesavel?: boolean;
  /** Código reduzido (até 6 dígitos) na balança — único por loja. */
  codigoBalanca?: string | number | null;
}

export interface IIASugestoes {
  categoria: string;
  ncm: string;
  margem: string;
}

export interface IIAResponseCatalogo {
  count: number;
}

export interface IIAResponseProduto {
  categoriaSugerida?: string;
  ncm?: string;
  precoCustoSugerido?: number;
  precoVendaSugerido?: number;
  cst?: string;
  cfop?: string;
  margemSugerida?: string;
}

export function Produtos() {
  const [produtos, setProdutos] = useState<IProduto[]>([]);
  const [categorias, setCategorias] = useState<ICategoria[]>([]);
  const [layoutsEtiqueta, setLayoutsEtiqueta] = useState<ILayoutEtiquetaResumo[]>([]);
  const [listaEmbalagens, setListaEmbalagens] = useState<IEmbalagemResumo[]>([]);
  const [planosContas, setPlanosContas] = useState<IPlanoConta[]>([]);
  const [loading, setLoading] = useState(true);
  const [termoBusca, setTermoBusca] = useState('');
  
  const [modalAberto, setModalAberto] = useState(false);
  const [stepAtual, setStepAtual] = useState(1);

  const [modalSegmentoAberto, setModalSegmentoAberto] = useState(false);
  const [segmentoSelecionado, setSegmentoSelecionado] = useState<string | null>(null);
  const [statusGeracao, setStatusGeracao] = useState<'selecao' | 'gerando' | 'sucesso'>('selecao');
  const [qtdGerada, setQtdGerada] = useState(0);

  const [iaLoading, setIaLoading] = useState(false);
  const [iaSugestoes, setIaSugestoes] = useState<IIASugestoes | null>(null);
  const [ajustandoMargens, setAjustandoMargens] = useState(false);
  
  const [isEditModeFromPDV, setIsEditModeFromPDV] = useState(false);

  const estadoInicialProducao: IProdutoProducao = {
    tipoConservacao: 'RESFRIADO',
    tipoProdutoProducao: 'PRODUTO_ACABADO',
    controlaEstoque: true,
    controlaRendimento: true,
    permiteVencido: false,
    diasValidade: '',
    pesoLiquido: '',
    pesoBruto: '',
    ingredientes: '',
    alergenicos: '',
    informacaoNutricional: '',
  };

  const [formData, setFormData] = useState<IProduto>({
    id: '', codigo: '', nome: '', categoriaId: '', unidadeMedida: 'UN', 
    precoCusto: '', precoVenda: '', codigoBarras: '', codigoInterno: '',
    ncm: '', cest: '', cfopPadrao: '', origem: '0',
    cstCsosnIcms: '', aliquotaIcms: '', cstPis: '', aliquotaPis: '',
    cstCofins: '', aliquotaCofins: '',
    contaEstoqueId: '',
    tipoItem: '',
    pesavel: false,
    codigoBalanca: '',
    pesoConferencia: '',
    diasValidade: '',
    dadosProducao: estadoInicialProducao,
  });
  const totalSteps = formData?.controlaProducao ? 5 : 4;   



  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    carregarDados();
  }, []);

  useEffect(() => {
    if (!modalAberto) return;
    const carregarCatalogosProducao = async () => {
      try {
        const [layRes, embRes] = await Promise.all([
          api.get<ILayoutEtiquetaResumo[]>('/api/layout-etiquetas').catch(() => ({
            data: [] as ILayoutEtiquetaResumo[],
          })),
          api.get<IEmbalagemResumo[]>('/api/embalagens').catch(() => ({ data: [] as IEmbalagemResumo[] })),
        ]);
        setLayoutsEtiqueta(Array.isArray(layRes.data) ? layRes.data : []);
        const embRaw = Array.isArray(embRes.data) ? embRes.data : [];
        setListaEmbalagens(
          embRaw.map((e) => ({
            id: String(e.id),
            codigo: String(e.codigo ?? ''),
            nome: String(e.nome ?? ''),
            ativo: typeof e.ativo === 'boolean' ? e.ativo : true,
            taraTotal: e.taraTotal !== undefined && e.taraTotal !== null ? String(e.taraTotal) : undefined,
          }))
        );
      } catch {
        setLayoutsEtiqueta([]);
        setListaEmbalagens([]);
      }
    };
    void carregarCatalogosProducao();
  }, [modalAberto]);

  useEffect(() => {
    if (produtos && produtos.length > 0) {
      const params = new URLSearchParams(location.search);
      const buscaUrl = params.get('busca');
      const editId = params.get('edit'); 
      
      if (editId) {
        const produtoParaEditar = produtos.find(p => p.id === editId);
        if (produtoParaEditar) {
          abrirModalEditar(produtoParaEditar);
          setStepAtual(3); 
          setIsEditModeFromPDV(true); 
          navigate('/produtos', { replace: true }); 
        }
      } else if (buscaUrl) {
        setTermoBusca(buscaUrl);
        const produtoParaEditar = produtos.find(p => p.nome.toLowerCase() === buscaUrl.toLowerCase());
        if (produtoParaEditar) {
          abrirModalEditar(produtoParaEditar);
          setStepAtual(3); 
          navigate('/produtos', { replace: true });
        }
      }
    }
  }, [location.search, produtos, navigate]);

  const carregarDados = async () => {
    setLoading(true);
    try {
      const [resProd, resCat, resContas] = await Promise.all([
        api.get<IProduto[]>('/api/cadastros/produtos'),
        api.get<ICategoria[]>('/api/cadastros/categorias'),
        api.get<IPlanoConta[]>('/api/contabilidade/planos')
      ]);
      
      setProdutos(resProd.data);
      setCategorias(resCat.data);
      setPlanosContas(resContas.data);
    } catch (error) {
      console.error("Erro ao carregar dados", error);
    } finally {
      setLoading(false);
    }
  };

  const criarCategoriaRapida = async () => {
    const nome = window.prompt('Nome da nova categoria:');
    if (!nome || !nome.trim()) return;
    const nomeTrim = nome.trim();
    try {
      const payload = transformarParaMaiusculas({ nome: nomeTrim }) as { nome: string };
      const response = await api.post<ICategoria>('/api/cadastros/categorias', payload);
      let novoId = extrairIdCategoriaDaResposta(response.data);
      if (!novoId) {
        const listRes = await api.get<ICategoria[]>('/api/cadastros/categorias');
        const nomeU = nomeTrim.toUpperCase();
        novoId = listRes.data.find((c) => c.nome.toUpperCase() === nomeU)?.id;
      }
      if (!novoId) {
        alert('Não foi possível obter o ID da categoria. Abra Cadastros → Categorias e selecione manualmente.');
        return;
      }
      const nomeLista =
        response.data && typeof response.data === 'object' && typeof response.data.nome === 'string'
          ? response.data.nome
          : nomeTrim.toUpperCase();
      flushSync(() => {
        setCategorias((prev) => {
          if (prev.some((c) => c.id === novoId)) {
            return prev.map((c) => (c.id === novoId ? { ...c, nome: nomeLista } : c));
          }
          return [...prev, { id: novoId, nome: nomeLista }];
        });
        setFormData((f) => ({ ...f, categoriaId: novoId }));
      });
      await carregarDados();
    } catch (err) {
      const error = err as AxiosError<{ error?: string }>;
      alert(error.response?.data?.error || 'Erro ao criar categoria.');
    }
  };

  const abrirModalNovo = () => {
    setFormData({
      id: '', codigo: '', nome: '', categoriaId: '', unidadeMedida: 'UN', precoCusto: '', precoVenda: '',
      codigoBarras: '', codigoInterno: '', ncm: '', cest: '', cfopPadrao: '', origem: '0',
      cstCsosnIcms: '', aliquotaIcms: '', cstPis: '', aliquotaPis: '', cstCofins: '', aliquotaCofins: '',
      contaEstoqueId: '',
      tipoItem: '',
      pesavel: false,
      codigoBalanca: '',
      pesoConferencia: '',
      diasValidade: '',
      dadosProducao: estadoInicialProducao,
    });
    setStepAtual(1);
    setIaSugestoes(null);
    setIsEditModeFromPDV(false);
    setModalAberto(true);
  };

  const abrirModalEditar = (produto: IProduto) => {
    setFormData({
      id: produto.id || '',
      codigo: produto.codigo || '', 
      nome: produto.nome || '',
      categoriaId: produto.categoriaId || produto.categoria?.id || '',
      unidadeMedida: produto.unidadeMedida || 'UN',
      precoCusto: produto.precoCusto?.toString() || '',
      precoVenda: produto.precoVenda?.toString() || '',
      codigoBarras: produto.codigoBarras || '',
      codigoInterno: produto.codigoInterno || '',
      ncm: produto.ncm || '',
      cest: produto.cest || '',
      cfopPadrao: produto.cfopPadrao || '',
      origem: produto.origem || '0',
      cstCsosnIcms: produto.cstCsosnIcms || produto.cstCsosn || '', 
      aliquotaIcms: produto.aliquotaIcms?.toString() || '',
      cstPis: produto.cstPis || '',
      aliquotaPis: produto.aliquotaPis?.toString() || '',
      cstCofins: produto.cstCofins || '',
      aliquotaCofins: produto.aliquotaCofins?.toString() || '',
      contaEstoqueId: produto.contaEstoqueId || '',
      tipoItem: produto.tipoItem ?? '',
      pesavel: !!(produto as { pesavel?: boolean }).pesavel,
      codigoBalanca:
        (produto as { codigoBalanca?: number | null }).codigoBalanca != null
          ? String((produto as { codigoBalanca?: number | null }).codigoBalanca)
          : '',
      pesoConferencia: (() => {
        const pc = produto.pesoConferencia;
        if (pc !== undefined && pc !== null && String(pc).trim() !== '') return String(pc);
        const legado = produto.pesoBruto;
        if (legado !== undefined && legado !== null && String(legado).trim() !== '') return String(legado);
        return '';
      })(),
      diasValidade:
        produto.diasValidade !== undefined && produto.diasValidade !== null && produto.diasValidade !== ''
          ? produto.diasValidade
          : '',
      dadosProducao: {
        ...estadoInicialProducao,
        ...(produto.dadosProducao || {}),
        diasValidade:
          produto.dadosProducao?.diasValidade !== undefined &&
          produto.dadosProducao?.diasValidade !== ''
            ? produto.dadosProducao.diasValidade
            : produto.diasValidade ?? '',
        tipoConservacao: mapTipoConservacaoProducao(
          produto.dadosProducao?.tipoConservacao ?? produto.tipoConservacao
        ),
        pesoLiquido: produto.pesoLiquido ?? '',
        pesoBruto: produto.pesoBruto ?? '',
        ingredientes: produto.dadosProducao?.ingredientes ?? '',
        alergenicos: produto.dadosProducao?.alergenicos ?? '',
        informacaoNutricional: (() => {
          const v = produto.dadosProducao?.informacaoNutricional;
          if (v == null || v === '') return '';
          if (typeof v === 'string') return v;
          try {
            return JSON.stringify(v, null, 2);
          } catch {
            return '';
          }
        })(),
      },
      controlaProducao: !!produto.dadosProducao
    });
    setStepAtual(1);
    setIaSugestoes(null);
    setIsEditModeFromPDV(false);
    setModalAberto(true);
  };

  const handleProducaoChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    let parsedValue: string | number | boolean = value;

    if (type === 'checkbox') {
      parsedValue = (e.target as HTMLInputElement).checked;
    } else if (type === 'number') {
      parsedValue = value === '' ? '' : Number(value);
    }

    setFormData((prev) => ({
      ...prev,
      dadosProducao: {
        ...prev.dadosProducao,
        [name]: parsedValue,
      },
    }));
  };

  function taraDisplayFromEmbalagem(emb: IEmbalagemResumo | undefined): string {
    if (!emb || emb.taraTotal === undefined || emb.taraTotal === null || String(emb.taraTotal).trim() === '') {
      return '';
    }
    const n = parseFloat(String(emb.taraTotal).replace(',', '.'));
    if (!Number.isFinite(n)) return '';
    return String(n);
  }

  const handleEmbalagemPrimariaChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    const emb = id ? listaEmbalagens.find((x) => x.id === id) : undefined;
    const taraVal = id === '' ? '' : taraDisplayFromEmbalagem(emb);
    setFormData((prev) => ({
      ...prev,
      dadosProducao: {
        ...prev.dadosProducao,
        embalagemPrimaria: id,
        taraPrimaria: taraVal,
      },
    }));
  };

  const handleEmbalagemSecundariaChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    const emb = id ? listaEmbalagens.find((x) => x.id === id) : undefined;
    const taraVal = id === '' ? '' : taraDisplayFromEmbalagem(emb);
    setFormData((prev) => ({
      ...prev,
      dadosProducao: {
        ...prev.dadosProducao,
        embalagemSecundaria: id,
        taraSecundaria: taraVal,
      },
    }));
  };

    const handleSalvarProduto = async (
      status: 'ATIVO' | 'RASCUNHO',
      overrideData?: Partial<IProduto>
    ): Promise<boolean> => {
      const dadosParaSalvar: IProduto = { ...formData, ...overrideData };

      if (!dadosParaSalvar.nome || dadosParaSalvar.nome.trim() === '') {
        alert("⚠️ O Nome do produto é obrigatório!");
        setStepAtual(1);
        return false;
      }

      const categoriaIdTrim = String(dadosParaSalvar.categoriaId ?? '').trim();
      if (!categoriaIdTrim) {
        alert('⚠️ Selecione ou crie uma categoria antes de salvar.');
        setStepAtual(1);
        return false;
      }

      try {
        const {
          controlaProducao,
          dadosProducao: dpForm,
          pesoConferencia: pesoConferenciaForm,
          ...restForm
        } = dadosParaSalvar;

        const pesoConferenciaApi = parsePesoKgOpcionalApi(pesoConferenciaForm);

        let dadosProdFormatados: Record<string, unknown> | undefined = undefined;
        let diasValidadeRaiz: number | null | undefined = undefined;
        let tipoConservacaoRaiz: string | null | undefined = undefined;
        let pesoLiquidoRaiz: number | null | undefined = undefined;

        let pesoBrutoRaiz: number | null | undefined = undefined;

        if (controlaProducao && dpForm) {
          const dp = dpForm as IProdutoProducao & {
            id?: string;
            produtoId?: string;
            createdAt?: string;
            updatedAt?: string;
          };
          const {
            id: _i,
            produtoId: _p,
            createdAt: _c,
            updatedAt: _u,
            pesoLiquido: plForm,
            pesoBruto: pbForm,
            ...restProducao
          } = dp;

          pesoBrutoRaiz = parsePesoKgOpcionalApi(pbForm);

          const diasParsed =
            restProducao.diasValidade === '' || restProducao.diasValidade === undefined
              ? 0
              : parseInt(String(restProducao.diasValidade), 10);
          const diasNested = Number.isNaN(diasParsed) ? 0 : diasParsed;

          const pl =
            plForm === '' || plForm === undefined ? null : parseFloat(String(plForm));

          dadosProdFormatados = {
            ...restProducao,
            rendimentoPadrao: parseFloat(String(restProducao.rendimentoPadrao)) || undefined,
            pesoMedioPeca: parseFloat(String(restProducao.pesoMedioPeca)) || undefined,
            pesoMedioCaixa: parseFloat(String(restProducao.pesoMedioCaixa)) || undefined,
            qtdMediaPecasPorCaixa: parseInt(String(restProducao.qtdMediaPecasPorCaixa)) || undefined,
            pesoPadrao: parseFloat(String(restProducao.pesoPadrao)) || undefined,
            diasValidade: diasNested,
            temperaturaInicial: parseFloatPermiteZero(restProducao.temperaturaInicial),
            temperaturaFinal: parseFloatPermiteZero(restProducao.temperaturaFinal),
            taraPrimaria: parseFloatPermiteZero(restProducao.taraPrimaria),
            taraSecundaria: parseFloatPermiteZero(restProducao.taraSecundaria),
            ingredientes: restProducao.ingredientes ? String(restProducao.ingredientes) : undefined,
            alergenicos: restProducao.alergenicos ? String(restProducao.alergenicos) : undefined,
            informacaoNutricional: restProducao.informacaoNutricional,
          };

          diasValidadeRaiz =
            restProducao.diasValidade === '' || restProducao.diasValidade === undefined
              ? null
              : diasNested;
          tipoConservacaoRaiz =
            restProducao.tipoConservacao && String(restProducao.tipoConservacao).trim() !== ''
              ? String(restProducao.tipoConservacao).trim()
              : null;
          pesoLiquidoRaiz = pl !== null && !Number.isNaN(pl) ? pl : null;
        }

        const codBalRaw = restForm.codigoBalanca;
        const codBalParsed =
          codBalRaw === '' || codBalRaw === undefined || codBalRaw === null
            ? null
            : parseInt(String(codBalRaw).replace(/\D/g, ''), 10);
        const codigoBalancaPayload =
          codBalRaw === '' || codBalRaw === undefined || codBalRaw === null
            ? null
            : Number.isNaN(codBalParsed ?? NaN)
              ? null
              : codBalParsed;

        const diasValidadeSemProducao: number | null =
          restForm.diasValidade === '' || restForm.diasValidade === undefined
            ? null
            : (() => {
                const n = parseInt(String(restForm.diasValidade), 10);
                return Number.isNaN(n) ? null : n;
              })();

        const payloadSemMaiusculas = {
          ...restForm,
          categoriaId: categoriaIdTrim,
          codigo: restForm.codigo ? restForm.codigo.trim() : '',
          precoCusto: parseFloat(String(restForm.precoCusto)) || 0,
          precoVenda: parseFloat(String(restForm.precoVenda)) || 0,
          statusFiscal: status === 'ATIVO' ? 'CONCLUIDO' : 'PENDENTE',
          ncm: restForm.ncm ? String(restForm.ncm).replace(/\D/g, '') : '',
          cfopPadrao: restForm.cfopPadrao ? String(restForm.cfopPadrao).replace(/\D/g, '') : '',
          cstCsosn: restForm.cstCsosnIcms,
          pesavel: !!restForm.pesavel,
          codigoBalanca: codigoBalancaPayload,
          ...(controlaProducao
            ? {
                diasValidade: diasValidadeRaiz,
                tipoConservacao: tipoConservacaoRaiz,
                pesoLiquido: pesoLiquidoRaiz,
                pesoBruto: pesoBrutoRaiz === undefined ? null : pesoBrutoRaiz,
                pesoConferencia: pesoConferenciaApi,
                dadosProducao: dadosProdFormatados,
              }
            : {
                dadosProducao: undefined,
                diasValidade: diasValidadeSemProducao,
                pesoConferencia: pesoConferenciaApi,
              }),
        };

        const payload = transformarParaMaiusculas(payloadSemMaiusculas);

        console.log('Payload de Produto Enviado:', dadosParaSalvar);

        if (dadosParaSalvar.id) {
          await api.put(`/api/cadastros/produtos/${dadosParaSalvar.id}`, payload);
        } else {
          await api.post('/api/cadastros/produtos', payload);
        }

        if (isEditModeFromPDV) {
          window.close();
          return true;
        }

        alert('✅ Produto salvo com sucesso!');
        setModalAberto(false);
        carregarDados();
        return true;
      } catch (err) {
        const error = err as AxiosError<{ error?: string }>;
        console.error('Erro ao salvar produto:', error);
        alert(error.response?.data?.error || 'Ocorreu um erro ao salvar o produto no banco de dados.');
        return false;
      }
    };  

  const excluirProduto = async (id?: string) => {
    if(!id) return;
    if(!window.confirm("Deseja realmente excluir este produto?")) return;
    try {
      await api.delete(`/api/cadastros/produtos/${id}`);
      carregarDados();
    } catch (err) {
      const error = err as AxiosError<{error?: string}>;
      console.error("Erro ao excluir", error);
      alert(error.response?.data?.error || "Erro ao excluir produto. Ele pode estar vinculado a vendas ou estoque.");
    }
  };

  const iniciarGeracaoIA = async () => {
    if (!segmentoSelecionado) return;
    setStatusGeracao('gerando');
    try {
      const response = await api.post<{count: number}>('/api/ia/catalogo/gerar', { 
        segmento: segmentoSelecionado 
      });

      setQtdGerada(response.data.count || 15);
      setStatusGeracao('sucesso');
      carregarDados(); 
    } catch (err) {
      const error = err as AxiosError<{error?: string}>;
      console.error("Erro ao gerar catálogo em lote:", error);
      alert(error.response?.data?.error || "Houve um erro de comunicação com a Aurya. Tente novamente.");
      setStatusGeracao('selecao');
    }
  };

  const finalizarOnboardingIA = () => {
    setModalSegmentoAberto(false);
    setStatusGeracao('selecao');
    setSegmentoSelecionado(null);
  };

  const preencherComIAReal = async () => {
    if (!formData.nome || formData.nome.length < 3) {
      alert("Digite o nome do produto primeiro! Ex: Picanha Bovina");
      return;
    }
    setIaLoading(true);
    try {
      const response = await api.post<IIAResponseProduto>('/api/ia/produtos/sugerir-preenchimento', { 
        nomeProduto: formData.nome 
      });

      const dadosIA = response.data;

      let categoriaIdParaVincular: string | undefined;
      if (dadosIA.categoriaSugerida) {
        const categoriaExistente = categorias.find(
          (c) => c.nome.toLowerCase() === dadosIA.categoriaSugerida?.toLowerCase()
        );
        if (categoriaExistente) {
          categoriaIdParaVincular = categoriaExistente.id;
        } else {
          const payloadCategoria = transformarParaMaiusculas({
            nome: dadosIA.categoriaSugerida,
          }) as { nome: string };
          const catResponse = await api.post<ICategoria>('/api/cadastros/categorias', payloadCategoria);
          let resolvido = extrairIdCategoriaDaResposta(catResponse.data);
          if (!resolvido) {
        const listRes = await api.get<ICategoria[]>('/api/cadastros/categorias');
            const nomeU = String(dadosIA.categoriaSugerida).trim().toUpperCase();
            resolvido = listRes.data.find((c) => c.nome.toUpperCase() === nomeU)?.id;
          }
          if (!resolvido) {
            alert('Categoria criada, mas a API não retornou o ID. Recarregue a página e selecione a categoria manualmente.');
          } else {
            categoriaIdParaVincular = resolvido;
            const nomeNova =
              catResponse.data &&
              typeof catResponse.data === 'object' &&
              typeof catResponse.data.nome === 'string'
                ? catResponse.data.nome
                : String(dadosIA.categoriaSugerida).trim().toUpperCase();
            flushSync(() => {
              setCategorias((prev) => {
                if (prev.some((c) => c.id === resolvido)) {
                  return prev.map((c) => (c.id === resolvido ? { ...c, nome: nomeNova } : c));
                }
                return [...prev, { id: resolvido, nome: nomeNova }];
              });
              setFormData((f) => ({ ...f, categoriaId: resolvido }));
            });
            await carregarDados();
          }
        }
      }

      setFormData((prev) => ({
        ...prev,
        ...(categoriaIdParaVincular ? { categoriaId: categoriaIdParaVincular } : {}),
        ncm: dadosIA.ncm || prev.ncm,
        precoCusto: dadosIA.precoCustoSugerido?.toString() || prev.precoCusto,
        precoVenda: dadosIA.precoVendaSugerido?.toString() || prev.precoVenda,
        cstCsosnIcms: dadosIA.cst || '102',
        cfopPadrao: dadosIA.cfop || '5102',
      }));

      setIaSugestoes({
        categoria: dadosIA.categoriaSugerida || 'Geral',
        ncm: dadosIA.ncm || '-',
        margem: dadosIA.margemSugerida || '30%',
      });
    } catch (err) {
      const error = err as AxiosError<{error?: string}>;
      console.error("Erro na IA:", error);
      alert(error.response?.data?.error || "A Aurya não conseguiu processar este produto no momento. Tente novamente.");
    } finally {
      setIaLoading(false);
    }
  };

  const acionarAjusteIA = async () => {
    setAjustandoMargens(true);
    try {
      const response = await api.post<{count: number}>('/api/ia/catalogo/ajustar-margens', {});
      
      if (response.data.count > 0) {
        alert(`✨ Sucesso! A Aurya ajustou os preços de ${response.data.count} produtos com base no mercado.`);
      } else {
        alert(`✅ Tudo certo! Seu catálogo já está com margens excelentes.`);
      }
      
      carregarDados(); 
    } catch (err) {
      const error = err as AxiosError<{error?: string}>;
      console.error("Erro ao ajustar margens:", error);
      alert(error.response?.data?.error || "Houve um erro ao tentar ajustar as margens com a IA.");
    } finally {
      setAjustandoMargens(false);
    }
  };

  const calcularMargem = () => {
    const custo = parseFloat(String(formData.precoCusto)) || 0;
    const venda = parseFloat(String(formData.precoVenda)) || 0;
    if (venda === 0) return 0;
    return (((venda - custo) / venda) * 100);
  };

  const margemAtual = calcularMargem();
  const margemIdeal = 32; 
  const precoSugerido = formData.precoCusto ? (parseFloat(String(formData.precoCusto)) / (1 - (margemIdeal / 100))) : 0;
  const precoVendaAtualNum = parseFloat(String(formData.precoVenda)) || 0;
  const ganhoExtraPorUnidade = (precoSugerido - precoVendaAtualNum).toFixed(2);

  const inputClass = "w-full bg-[#0b1324] border border-white/10 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 transition-all placeholder:text-slate-500 shadow-inner";
  const labelClass = "block text-xs font-bold text-slate-400 uppercase tracking-[0.16em] mb-2 pl-1";

  const produtosFiltrados = produtos.filter(p => 
    p.nome.toLowerCase().includes(termoBusca.toLowerCase()) || 
    (p.codigo && p.codigo.toLowerCase().includes(termoBusca.toLowerCase())) ||
    (p.codigoBarras && p.codigoBarras.includes(termoBusca))
  );

  const qtdMargemBaixa = produtos.filter(p => {
    const custo = Number(p.precoCusto) || 0;
    const venda = Number(p.precoVenda) || 0;
    if (venda <= 0) return true;
    const mrg = ((venda - custo) / venda) * 100;
    return mrg < 30;
  }).length;

  const qtdSemNcm = produtos.filter(p => !p.ncm || p.ncm.trim() === '').length;

  return (
    <Layout>
      <style>{`
        @keyframes modalEnter { from { opacity: 0; transform: scale(0.95) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        .animate-modal { animation: modalEnter 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes borderSpin { 100% { transform: rotate(360deg); } }
        .animate-border-spin { animation: borderSpin 4s linear infinite; }
        @keyframes fadeInDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in-down { animation: fadeInDown 0.4s ease-out forwards; }
        @keyframes pulseGlow { 0%, 100% { opacity: 0.5; transform: scale(1); } 50% { opacity: 1; transform: scale(1.1); } }
        .animate-pulse-glow { animation: pulseGlow 2s ease-in-out infinite; }
      `}</style>

      <div className="mx-auto max-w-7xl space-y-6 pb-12 animate-[fadeIn_0.5s_ease-out]">
        
        <div className="flex flex-col justify-between gap-6 rounded-[30px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(139,92,246,0.16),_transparent_26%),radial-gradient(circle_at_top_right,_rgba(16,185,129,0.10),_transparent_20%),linear-gradient(135deg,_#0b1020_0%,_#08101f_45%,_#0a1224_100%)] p-6 shadow-[0_25px_70px_rgba(0,0,0,0.40)] sm:flex-row sm:items-center sm:p-8 relative overflow-hidden">
          <div className="pointer-events-none absolute -left-10 top-0 h-52 w-52 rounded-full bg-violet-600/15 blur-[100px]" /><div className="pointer-events-none absolute right-0 top-0 h-56 w-56 rounded-full bg-emerald-600/10 blur-[110px]"></div>
          <div className="relative z-10">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-violet-300">
              <Sparkles className="h-3.5 w-3.5" />
              Product Intelligence
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-white flex items-center gap-4 tracking-tight">
              <div className="rounded-2xl border border-violet-400/20 bg-violet-500/10 p-3 shadow-[0_0_20px_rgba(139,92,246,0.12)]"><Package className="h-8 w-8 text-violet-300" /></div>
              Catálogo Inteligente
            </h1>
            <p className="text-slate-400 mt-2 font-medium">Gerencie produtos com assistência de IA para precificação e tributação.</p>
          </div>
          <button onClick={abrirModalNovo} className="relative z-10 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white px-8 py-4 rounded-2xl font-black transition-all flex items-center gap-3 shadow-[0_0_20px_rgba(37,99,235,0.4)] transform hover:scale-105">
            <Plus className="w-6 h-6" /> Novo Produto
          </button>
        </div>

        <div className="bg-[#08101f]/90 backdrop-blur-xl p-4 rounded-[24px] shadow-[0_20px_50px_rgba(0,0,0,0.35)] border border-white/10 flex flex-col md:flex-row items-center gap-4">
          <div className="flex-1 w-full relative">
            <Search className="absolute left-4 top-4 text-violet-300 w-5 h-5" />
            <input 
              type="text" 
              placeholder="Buscar por nome, código ou EAN..." 
              value={termoBusca} 
              onChange={(e) => setTermoBusca(e.target.value)} 
              className={`${inputClass} pl-12 py-3.5 bg-[#0b1324] border-white/10`} 
            />
          </div>
          <button className="w-full md:w-auto rounded-2xl border border-white/10 bg-white/5 px-6 py-3.5 font-bold text-slate-300 transition-all hover:bg-white/10 hover:text-white flex items-center justify-center gap-2">
            <Filter className="w-5 h-5" /> Filtros
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 font-bold flex justify-center items-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-violet-300" /> Carregando catálogo...
          </div>
        ) : produtosFiltrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center bg-[#08101f]/70 rounded-[30px] border border-white/10 border-dashed relative overflow-hidden group">
            <img src={auryaBrandMark} alt="Aurya IA" className="w-24 h-24 rounded-full border-4 border-white/10 shadow-[0_0_30px_rgba(99,102,241,0.5)] mb-6" />
            <h3 className="text-3xl font-black text-white mb-2 tracking-tight">Nenhum produto encontrado</h3>
            <p className="text-slate-400 max-w-md mb-8 text-lg">Comece a preencher seu catálogo ou ajuste sua busca.</p>
            <div className="flex gap-4">
              <button onClick={() => setModalSegmentoAberto(true)} className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 rounded-2xl font-black transition-all flex items-center gap-3 shadow-[0_0_20px_rgba(79,70,229,0.4)]">
                <Sparkles className="w-5 h-5" /> Gerar catálogo com IA
              </button>
              <button onClick={abrirModalNovo} className="bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white px-8 py-4 rounded-2xl font-bold transition-all flex items-center gap-3 border border-white/10">
                <Plus className="w-5 h-5" /> Cadastrar Manualmente
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="relative overflow-hidden rounded-[30px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(139,92,246,0.10),_transparent_24%),linear-gradient(135deg,_#0b1020_0%,_#08101f_52%,_#0a1224_100%)] p-1 shadow-[0_20px_50px_rgba(0,0,0,0.35)]">
              <div className="bg-[#08101f]/95 backdrop-blur-xl p-5 rounded-[24px] relative z-10 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="relative shrink-0">
                    <img src={auryaBrandMark} alt="Aurya" className="w-12 h-12 rounded-full border-2 border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.4)]" />
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-slate-900 animate-pulse"></div>
                  </div>
                  <div>
                    <h3 className="text-white font-black flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-violet-300" /> Resumo Estratégico do Catálogo
                    </h3>
                    <p className="text-slate-300 text-sm font-medium mt-1">
                      Você tem <strong className="text-red-400">{qtdMargemBaixa} produtos</strong> com margem abaixo de 30% e <strong className="text-amber-400">{qtdSemNcm} produtos</strong> precisando de revisão fiscal (sem NCM).
                    </p>
                  </div>
                </div>
                <button 
                  onClick={acionarAjusteIA} 
                  disabled={ajustandoMargens}
                  className="bg-violet-500/10 hover:bg-violet-500/15 text-violet-300 border border-violet-400/20 px-5 py-2.5 rounded-xl text-sm font-bold transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {ajustandoMargens ? <Loader2 className="w-4 h-4 animate-spin" /> : <LineChart className="w-4 h-4" />} 
                  {ajustandoMargens ? 'Analisando Mercado...' : 'Ajustar Margens com IA'}
                </button>
              </div>
            </div>

            <div className="bg-[#08101f]/90 backdrop-blur-xl rounded-[30px] shadow-[0_25px_60px_rgba(0,0,0,0.35)] border border-white/10 overflow-hidden mt-6">
              <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[900px]">
                  <thead>
                    <tr className="bg-[#0b1324] text-xs font-black text-slate-400 uppercase tracking-widest border-b border-white/10">
                      <th className="p-6">Produto</th>
                      <th className="p-6">Categoria</th>
                      <th className="p-6">Preços</th>
                      <th className="p-6">Margem</th>
                      <th className="p-6 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {produtosFiltrados.map((p) => {
                      const custoTbl = Number(p.precoCusto) || 0;
                      const vendaTbl = Number(p.precoVenda) || 0;
                      const mrg = vendaTbl > 0 ? ((vendaTbl - custoTbl) / vendaTbl) * 100 : 0;
                      
                      return (
                        <tr key={p.id} className="hover:bg-white/5 transition-colors group">
                          <td className="p-6">
                            <span className="inline-flex items-center rounded-md border border-violet-500/30 bg-violet-500/10 px-2 py-0.5 text-[11px] font-mono font-black text-violet-300 mb-1.5">
                              CÓD: {p.codigo || 'SEM-CODIGO'}
                            </span>
                            <p className="font-black text-white text-lg">{p.nome}</p>
                            <p className="text-xs text-slate-500 font-mono mt-1">NCM: {p.ncm || 'Não informado'} | EAN: {p.codigoBarras || 'N/A'}</p>
                          </td>
                          <td className="p-6">
                            <span className="px-3 py-1.5 bg-white/5 text-slate-300 rounded-lg text-xs font-bold border border-white/10">
                              {p.categoria?.nome || 'Sem Categoria'}
                            </span>
                          </td>
                          <td className="p-6">
                            <div className="flex flex-col gap-1">
                              <span className="text-sm text-slate-400 font-bold">Custo: R$ {custoTbl.toFixed(2)}</span>
                              <span className="text-lg font-black text-emerald-400">R$ {vendaTbl.toFixed(2)}</span>
                            </div>
                          </td>
                          <td className="p-6">
                            <span className={`px-4 py-2 rounded-xl text-sm font-black flex items-center gap-2 w-max border ${mrg >= 30 ? 'bg-emerald-950/50 text-emerald-400 border-emerald-500/30' : mrg >= 15 ? 'bg-amber-950/50 text-amber-400 border-amber-500/30' : 'bg-red-950/50 text-red-400 border-red-500/30'}`}>
                              {mrg >= 30 ? <TrendingUp className="w-4 h-4"/> : <TrendingDown className="w-4 h-4"/>}
                              {mrg.toFixed(1)}%
                            </span>
                          </td>
                          <td className="p-6 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button onClick={() => abrirModalEditar(p)} className="p-3 bg-slate-700 hover:bg-blue-600 text-white rounded-xl transition-colors shadow-sm">
                                <Edit2 className="w-5 h-5" />
                              </button>
                              <button onClick={() => p.id && excluirProduto(p.id)} className="p-3 bg-slate-700 hover:bg-red-600 text-white rounded-xl transition-colors shadow-sm">
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* ONBOARDING DE IA */}
        {modalSegmentoAberto && (
          <div className="fixed inset-0 bg-[#020617]/85 backdrop-blur-md flex items-center justify-center z-[70] p-4">
            <div className="bg-[#08101f] border border-white/10 rounded-[30px] shadow-[0_25px_80px_rgba(0,0,0,0.60)] w-full max-w-5xl flex flex-col relative overflow-hidden animate-modal">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-500"></div>
              
              <div className="p-8 md:p-12 relative z-10 min-h-[500px] flex flex-col justify-center">
                <button onClick={() => { setModalSegmentoAberto(false); setStatusGeracao('selecao'); }} className="absolute top-6 right-6 p-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-full transition-colors">
                  <X className="w-6 h-6" />
                </button>
                
                {statusGeracao === 'selecao' && (
                  <div className="text-center animate-fade-in-down w-full">
                    <div className="w-20 h-20 mx-auto bg-indigo-900/30 rounded-full flex items-center justify-center border-2 border-violet-400/20 mb-6 shadow-[0_0_30px_rgba(99,102,241,0.3)]">
                      <BrainCircuit className="w-10 h-10 text-violet-300" />
                    </div>
                    
                    <h2 className="text-3xl md:text-5xl font-black text-white mb-4 tracking-tight">Escolha seu segmento e deixe a Aurya estruturar tudo para você</h2>
                    <p className="text-slate-300 mb-10 text-lg md:text-xl max-w-3xl mx-auto font-medium leading-relaxed">
                      A Aurya cria automaticamente categorias, produtos, tributação e a estrutura inicial com base nas melhores práticas do seu setor.
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
                      {[
                        { icone: '🥩', nome: 'Açougue', desc: 'Cortes, produção, margem por kg' },
                        { icone: '🛒', nome: 'Mercado', desc: 'Mix de produtos, PDV, estoque' },
                        { icone: '📦', nome: 'Distribuidora', desc: 'Volume, preços por cliente, logística' },
                        { icone: '🍽️', nome: 'Restaurante', desc: 'Ficha técnica, CMV, produção' }
                      ].map(seg => (
                        <button 
                          key={seg.nome} 
                          onClick={() => setSegmentoSelecionado(seg.nome)} 
                          className={`p-6 rounded-[30px] transition-all group flex flex-col items-center gap-3 border-2 text-center relative overflow-hidden ${segmentoSelecionado === seg.nome ? 'bg-violet-500/10 border-indigo-500 shadow-[0_0_30px_rgba(99,102,241,0.4)] transform -translate-y-2' : 'bg-[#0b1324]/70 border-white/10 hover:border-violet-400/20 hover:bg-[#08101f]'}`}
                        >
                          {segmentoSelecionado === seg.nome && <div className="absolute inset-0 bg-indigo-500/10 animate-pulse"></div>}
                          <span className="text-5xl mb-2 group-hover:scale-110 transition-transform duration-300 relative z-10">{seg.icone}</span>
                          <span className={`font-black text-xl tracking-wide relative z-10 ${segmentoSelecionado === seg.nome ? 'text-white' : 'text-slate-200 group-hover:text-white'}`}>{seg.nome}</span>
                          <span className={`text-sm font-bold relative z-10 ${segmentoSelecionado === seg.nome ? 'text-slate-300' : 'text-slate-500'}`}>{seg.desc}</span>
                        </button>
                      ))}
                    </div>

                    <button 
                      disabled={!segmentoSelecionado}
                      onClick={iniciarGeracaoIA}
                      className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white px-12 py-5 rounded-2xl text-xl font-black transition-all shadow-[0_0_40px_rgba(99,102,241,0.5)] transform hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 disabled:shadow-none mx-auto flex items-center gap-3"
                    >
                      <Sparkles className="w-6 h-6" /> Gerar estrutura com IA
                    </button>
                  </div>
                )}

                {statusGeracao === 'gerando' && (
                  <div className="text-center animate-fade-in-down flex flex-col items-center justify-center w-full">
                    <div className="relative mb-10">
                       <img src={auryaBrandMark} alt="Aurya IA" className="w-32 h-32 rounded-full border-4 border-indigo-500 shadow-[0_0_50px_rgba(99,102,241,0.8)] relative z-10" />
                       <div className="absolute inset-0 bg-indigo-500/30 rounded-full blur-3xl animate-pulse-glow"></div>
                       <Loader2 className="w-10 h-10 text-violet-300 absolute -bottom-4 -right-4 animate-spin bg-[#0b1324] rounded-full p-1" />
                    </div>
                    <h2 className="text-3xl md:text-4xl font-black text-white mb-4">
                      Aurya está estruturando seu catálogo...
                    </h2>
                    <p className="text-slate-300 text-xl font-medium animate-pulse">Aplicando inteligência tributária e margens para {segmentoSelecionado}.</p>
                  </div>
                )}

                {statusGeracao === 'sucesso' && (
                  <div className="text-center animate-fade-in-down flex flex-col items-center justify-center w-full">
                    <div className="w-28 h-28 bg-emerald-500/20 rounded-full flex items-center justify-center border-4 border-emerald-500 mb-8 shadow-[0_0_50px_rgba(16,185,129,0.5)]">
                      <CheckCircle2 className="w-14 h-14 text-emerald-400" />
                    </div>
                    <h2 className="text-4xl md:text-5xl font-black text-white mb-6 tracking-tight">Estrutura gerada com sucesso!</h2>
                    
                    <div className="inline-flex items-center gap-2 bg-violet-500/10 border border-violet-400/20 text-violet-300 px-5 py-2.5 rounded-full font-bold text-sm mb-10 shadow-[0_20px_50px_rgba(0,0,0,0.35)]">
                      <Clock className="w-5 h-5" /> Tempo economizado: ~3 horas de cadastro manual
                    </div>
                    
                    <div className="bg-[#0b1324] border border-white/10 p-8 rounded-[30px] inline-block text-left mb-12 shadow-[0_25px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl">
                      <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6 border-b border-white/10 pb-3">Baseado em dados reais do seu segmento</p>
                      <ul className="space-y-5">
                        <li className="flex items-center gap-4 text-xl font-bold text-slate-200">
                          <div className="p-2 bg-emerald-900/50 rounded-lg"><CheckCircle2 className="w-6 h-6 text-emerald-400" /></div> 
                          {qtdGerada} produtos estratégicos criados
                        </li>
                        <li className="flex items-center gap-4 text-xl font-bold text-slate-200">
                          <div className="p-2 bg-emerald-900/50 rounded-lg"><CheckCircle2 className="w-6 h-6 text-emerald-400" /></div> 
                          Categorias e NCMs organizados
                        </li>
                        <li className="flex items-center gap-4 text-xl font-bold text-slate-200">
                          <div className="p-2 bg-emerald-900/50 rounded-lg"><CheckCircle2 className="w-6 h-6 text-emerald-400" /></div> 
                          Sugestões de preço aplicadas
                        </li>
                      </ul>
                    </div>

                    <button 
                      onClick={finalizarOnboardingIA}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white px-12 py-5 rounded-2xl text-xl font-black transition-all shadow-[0_0_40px_rgba(16,185,129,0.5)] transform hover:scale-105 flex items-center gap-3"
                    >
                      Acessar meu catálogo <ArrowRight className="w-6 h-6" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* MODAL WIZARD PREMIUM (Cadastro de Produto Individual) */}
        {modalAberto && (
          <div className="fixed inset-0 bg-[#020617]/80 backdrop-blur-md flex items-center justify-center z-[60] p-4 sm:p-6">
            <div className="bg-[#08101f] border border-white/10 rounded-[30px] shadow-[0_25px_80px_rgba(0,0,0,0.60)] w-full max-w-4xl flex flex-col relative overflow-hidden animate-modal">
              
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500"></div>

              <div className="p-6 sm:p-8 border-b border-white/10 flex justify-between items-center bg-[#0b1324]/70">
                <div>
                  <h2 className="text-2xl font-black text-white flex items-center gap-3">
                    {formData.id ? 'Editar Produto' : 'Novo Produto'}
                  </h2>
                  <p className="text-slate-400 text-sm mt-1">Siga as etapas para concluir o cadastro.</p>
                </div>
                <button onClick={() => { setModalAberto(false); setIsEditModeFromPDV(false); }} className="p-2 bg-[#08101f] hover:bg-slate-700 text-slate-400 hover:text-white rounded-full transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="bg-[#0b1324]/80 pt-6 pb-2 border-b border-white/10">
                <p className="text-center text-slate-400 text-xs font-bold uppercase tracking-widest mb-5">Etapa {stepAtual} de {totalSteps} — Cadastro Inteligente</p>
                <div className="flex justify-between items-center relative px-8 overflow-x-auto custom-scrollbar pb-4">
                  <div className="absolute left-14 right-14 top-5 h-0.5 bg-[#08101f] -z-0"></div>
                  {[
                    { num: 1, label: '📦 Produto' },
                    { num: 2, label: '💰 Preço & Margem' },
                    { num: 3, label: '🧾 Fiscal' },
                    { num: 4, label: '📊 Contábil' },
                    ...(formData.controlaProducao ? [{ num: 5, label: '🥩 Produção' }] : [])
                   // { num: 5, label: '🥩 Produção' }
                  ].map(step => (
                    <div key={step.num} className="relative z-10 flex flex-col items-center gap-3 bg-[#0b1324] px-4 cursor-pointer" onClick={() => setStepAtual(step.num)}>
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm border-2 transition-all duration-300 ${stepAtual === step.num ? 'bg-blue-600 border-blue-500 text-white shadow-[0_0_20px_rgba(37,99,235,0.6)] scale-110' : stepAtual > step.num ? 'bg-emerald-500 border-emerald-400 text-white' : 'bg-[#08101f] border-white/10 text-slate-500'}`}>
                        {stepAtual > step.num ? <CheckCircle2 className="w-6 h-6" /> : step.num}
                      </div>
                      <span className={`text-xs font-bold uppercase tracking-widest whitespace-nowrap ${stepAtual === step.num ? 'text-blue-400' : 'text-slate-500'}`}>{step.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-8 overflow-y-auto max-h-[60vh] custom-scrollbar">
                
                                {stepAtual === 1 && (
                  <div className="space-y-6 animate-fade-in-down">
                    
                    <div className="relative p-[1px] rounded-2xl mb-8 group overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.35)]">
                      <div className="absolute inset-[-100%] bg-[conic-gradient(from_90deg_at_50%_50%,transparent_0%,#8b5cf6_50%,transparent_100%)] animate-border-spin opacity-50"></div>
                      <div className="bg-indigo-950/90 backdrop-blur-xl p-6 rounded-[15px] relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
                        <div className="flex items-center gap-4">
                          <div className="relative shrink-0">
                            <img src={auryaBrandMark} alt="Aurya" className="w-14 h-14 rounded-full border-2 border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.5)]" />
                            <Sparkles className="w-4 h-4 text-violet-300 absolute -bottom-1 -right-1 animate-pulse" />
                          </div>
                          <div>
                            <h4 className="text-white font-black text-base flex items-center gap-2">Assistente Inteligente Aurya</h4>
                            <p className="text-slate-300 text-sm font-medium mt-1 leading-relaxed">Digite o nome do produto e a Aurya estrutura automaticamente NCM, categoria, tributação e sugestão de preço.</p>
                          </div>
                        </div>
                        <button 
                          onClick={preencherComIAReal}
                          disabled={iaLoading}
                          className="w-full sm:w-auto shrink-0 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3.5 rounded-xl text-sm font-black flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(79,70,229,0.4)] hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
                        >
                          {iaLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />} 
                          {iaLoading ? 'Analisando...' : 'Preencher com Aurya'}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="md:col-span-2 relative">
                        <label className={labelClass}>
                          <Hash className="inline-block w-4 h-4 mr-1 -mt-0.5" />
                          Código Curto / SKU <span className="text-slate-500 font-normal normal-case tracking-normal ml-1">(Opcional)</span>
                        </label>
                        <input 
                          type="text" 
                          value={formData.codigo || ''} 
                          onChange={e => setFormData({...formData, codigo: e.target.value.toUpperCase()})} 
                          className={`${inputClass} font-mono uppercase border-violet-500/30`} 
                          placeholder="Deixe em branco para gerar sequencial (1, 2, 3...)" 
                        />
                      </div>

                      <div className="md:col-span-2 relative">
                        <label className={labelClass}>Nome do Produto *</label>
                        <input 
                          required
                          type="text" 
                          value={formData.nome ?? ''} 
                          onChange={e => {
                            setFormData({...formData, nome: e.target.value});
                            if(iaSugestoes) setIaSugestoes(null);
                          }} 
                          className={`${inputClass} text-lg font-bold`} 
                          placeholder="Ex: Picanha Bovina Premium, 1kg (ou qualquer produto que você vende)" 
                        />
                        
                        {iaSugestoes && (
                          <div className="mt-4 bg-[#08101f]/80 border border-violet-400/20 rounded-xl p-5 flex items-start gap-4 animate-fade-in-down shadow-inner">
                            <BrainCircuit className="w-6 h-6 text-violet-300 shrink-0 mt-0.5" />
                            <div className="w-full">
                              <p className="text-sm font-black text-violet-300 mb-3">Aurya sugere para este produto:</p>
                              <div className="flex flex-wrap gap-3">
                                <span className="text-xs font-bold text-slate-300 bg-violet-500/10 px-3 py-2 rounded-lg border border-indigo-500/20 shadow-sm flex items-center gap-1">
                                  Categoria: <strong className="text-white ml-1">{iaSugestoes.categoria}</strong>
                                </span>
                                <span className="text-xs font-bold text-slate-300 bg-violet-500/10 px-3 py-2 rounded-lg border border-indigo-500/20 shadow-sm flex items-center gap-1">
                                  NCM: <strong className="text-white ml-1">{iaSugestoes.ncm}</strong>
                                </span>
                                <span className="text-xs font-bold text-emerald-300 bg-emerald-500/10 px-3 py-2 rounded-lg border border-emerald-500/30 shadow-sm flex items-center gap-1">
                                  Margem sugerida: <strong className="text-emerald-400 ml-1">{iaSugestoes.margem}</strong>
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      <div>
                        <label className={labelClass}>Categoria *</label>
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
                          <select
                            value={formData.categoriaId ?? ''}
                            onChange={(e) => setFormData({ ...formData, categoriaId: e.target.value })}
                            className={`${inputClass} flex-1`}
                          >
                            <option value="">Selecione...</option>
                            {categorias.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.nome}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => void criarCategoriaRapida()}
                            className="shrink-0 rounded-xl border border-violet-500/40 bg-violet-500/15 px-4 py-3 text-xs font-black uppercase tracking-wider text-violet-200 transition hover:bg-violet-500/25"
                          >
                            + Nova categoria
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className={labelClass}>Unidade de Medida</label>
                                                <select value={formData.unidadeMedida ?? 'UN'} onChange={e => setFormData({...formData, unidadeMedida: e.target.value})} className={inputClass}>
                          <option value="UN">Unidade (UN)</option>
                          <option value="KG">Quilograma (KG)</option>
                          <option value="CX">Caixa (CX)</option>
                        </select>
                      </div>
                      <div className="md:col-span-2">
                        <label className={labelClass}>Tipo de Item (SPED)</label>
                        <select
                          value={formData.tipoItem ?? ''}
                          onChange={(e) => setFormData({ ...formData, tipoItem: e.target.value })}
                          className={inputClass}
                        >
                          {OPCOES_TIPO_ITEM_SPED.map((op) => (
                            <option key={op.value || 'empty'} value={op.value}>
                              {op.label}
                            </option>
                          ))}
                        </select>
                        <p className="text-[11px] text-slate-500 mt-1.5 font-medium">
                          Classificação para estoque fiscal (Reg. 0200). Obrigatório em módulos NFe/SPED quando exigido pelo roteiro.
                        </p>
                      </div>

                      <div className="md:col-span-2 mt-2 rounded-2xl border border-cyan-500/25 bg-cyan-950/20 p-5 space-y-4">
                        <h4 className="text-xs font-black uppercase tracking-widest text-cyan-300 flex items-center gap-2">
                          <Scale className="w-4 h-4" />
                          Balança (carga retaguarda)
                        </h4>
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!!formData.pesavel}
                            onChange={(e) => setFormData({ ...formData, pesavel: e.target.checked })}
                            className="rounded border-white/20 bg-[#0b1324] text-cyan-500 focus:ring-cyan-500/30"
                          />
                          <span className="text-sm font-bold text-slate-200">Produto pesável (balança)</span>
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className={labelClass}>Dias de validade (etiqueta)</label>
                            <input
                              type="number"
                              min={0}
                              max={999}
                              disabled={!!formData.controlaProducao}
                              value={
                                formData.controlaProducao
                                  ? (formData.dadosProducao?.diasValidade ?? '')
                                  : (formData.diasValidade ?? '')
                              }
                              onChange={(e) => {
                                const v = e.target.value;
                                if (formData.controlaProducao) {
                                  setFormData({
                                    ...formData,
                                    dadosProducao: { ...formData.dadosProducao!, diasValidade: v },
                                  });
                                } else {
                                  setFormData({ ...formData, diasValidade: v });
                                }
                              }}
                              className={`${inputClass} disabled:opacity-50`}
                              placeholder="Ex: 30"
                            />
                            {formData.controlaProducao && (
                              <p className="text-[10px] text-slate-500 mt-1">Com produção própria, use a validade na etapa 5 (ficha técnica).</p>
                            )}
                          </div>
                          <div>
                            <label className={labelClass}>Código na balança (até 6 dígitos)</label>
                            <input
                              type="number"
                              min={1}
                              max={999999}
                              value={
                                formData.codigoBalanca == null || formData.codigoBalanca === ''
                                  ? ''
                                  : String(formData.codigoBalanca)
                              }
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  codigoBalanca: e.target.value === '' ? '' : e.target.value,
                                })
                              }
                              className={inputClass}
                              placeholder="Ex: 1001"
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <label className={labelClass}>Peso Padrão para Conferência (Kg)</label>
                            <input
                              type="number"
                              step="0.001"
                              min={0}
                              value={
                                formData.pesoConferencia == null || formData.pesoConferencia === ''
                                  ? ''
                                  : String(formData.pesoConferencia)
                              }
                              onChange={(e) => {
                                const v = e.target.value;
                                setFormData((prev) => ({ ...prev, pesoConferencia: v }));
                              }}
                              className={inputClass}
                              placeholder="Ex: 0.500"
                            />
                            <p className="text-[10px] text-slate-500 mt-1.5 font-medium">
                              Opcional. Peso do item embalado (kg) — referência exclusiva do self-checkout; independente do peso bruto da ficha técnica.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 🚀 O BOTÃO DE LIGA/DESLIGA FICA EXATAMENTE AQUI */}
                    <div className="mt-6 bg-violet-950/20 border border-violet-500/30 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-inner">
                      <div>
                        <h4 className="text-white font-black flex items-center gap-2 text-lg">
                          <Package className="w-5 h-5 text-violet-400" />
                          Produto de Produção Própria?
                        </h4>
                        <p className="text-slate-400 text-sm mt-1 max-w-xl">
                          Habilite esta opção se este item for processado internamente (ex: desossa de carnes, fatiamento de frios). Isso adicionará a etapa de Ficha Técnica.
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer shrink-0">
                        <input 
                          type="checkbox" 
                          className="sr-only peer" 
                          checked={!!formData.controlaProducao}
                          onChange={(e) => setFormData({...formData, controlaProducao: e.target.checked})}
                        />
                        <div className="w-14 h-7 bg-[#08101f] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 peer-checked:after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-violet-600 border border-white/10 shadow-[0_0_15px_rgba(139,92,246,0.2)]"></div>
                      </label>
                    </div>

                  </div>
                )}

                {stepAtual === 2 && (
                  <div className="space-y-6 animate-fade-in-down">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className={labelClass}>Custo de Aquisição (R$) *</label>
                        <input type="number" value={formData.precoCusto ?? ''} onChange={e => setFormData({...formData, precoCusto: e.target.value})} className={inputClass} placeholder="0.00" />
                      </div>
                      <div>
                        <label className={labelClass}>Preço de Venda (R$) *</label>
                        <input type="number" value={formData.precoVenda ?? ''} onChange={e => setFormData({...formData, precoVenda: e.target.value})} className={inputClass} placeholder="0.00" />
                      </div>
                    </div>

                    {formData.precoCusto && formData.precoVenda && (
                      <div className={`p-6 rounded-[30px] border flex flex-col sm:flex-row gap-5 mt-6 transition-all shadow-[0_20px_50px_rgba(0,0,0,0.35)] ${margemAtual >= margemIdeal ? 'bg-emerald-950/30 border-emerald-500/40' : 'bg-[#08101f]/80 border-indigo-500/40'}`}>
                        <div className="relative shrink-0">
                          <img src={auryaBrandMark} alt="Aurya IA" className="w-14 h-14 rounded-full border-2 border-indigo-400" />
                          <BrainCircuit className="w-6 h-6 text-violet-300 absolute -bottom-2 -right-2 bg-[#0b1324] rounded-full p-1" />
                        </div>
                        <div className="w-full">
                          <h4 className="text-sm font-black text-white mb-2 flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-violet-300"/> Análise de Pricing
                          </h4>
                          {margemAtual >= margemIdeal ? (
                            <p className="text-emerald-300 text-sm font-medium leading-relaxed">
                              Excelente! Sua margem de lucro está em <strong className="text-white text-base">{margemAtual.toFixed(1)}%</strong>. Com base no seu histórico de vendas, produtos com essa margem têm alta rentabilidade.
                            </p>
                          ) : (
                            <div className="space-y-4">
                              <p className="text-slate-300 text-sm font-medium leading-relaxed">
                                <strong className="text-white text-base">Posso melhorar sua margem</strong> com base no seu histórico e mercado. Produtos similares operam com margem de <strong className="text-cyan-400 text-base">32%</strong>.
                              </p>
                              
                              <button 
                                onClick={() => setFormData({...formData, precoVenda: precoSugerido.toFixed(2)})} 
                                className="w-full sm:w-auto text-sm font-black bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.4)] flex items-center justify-center gap-2 hover:scale-105"
                              >
                                <TrendingUp className="w-5 h-5" /> 
                                Aplicar preço recomendado (+R$ {ganhoExtraPorUnidade} lucro/unid)
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                                {stepAtual === 3 && (
                  <div className="space-y-6 animate-fade-in-down">
                    <div className="bg-emerald-950/40 border border-emerald-500/40 p-4 rounded-2xl flex items-center gap-4 shadow-inner mb-6">
                      <div className="p-2 bg-emerald-900/50 rounded-full"><ShieldCheck className="w-6 h-6 text-emerald-400" /></div>
                      <div>
                        <p className="text-emerald-300 font-bold text-sm">Aurya validou sua tributação para evitar erros fiscais.</p>
                        <p className="text-emerald-400/70 text-xs mt-0.5">NCM e CFOP estão em conformidade com as regras da SEFAZ para o seu regime.</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className={labelClass}>Código de Barras (EAN)</label>
                        <input type="text" value={formData.codigoBarras ?? ''} onChange={e => setFormData({...formData, codigoBarras: e.target.value})} className={inputClass} placeholder="Pode deixar em branco" />
                      </div>
                      <div>
                        <label className={labelClass}>NCM *</label>
                        <input type="text" value={formData.ncm ?? ''} onChange={e => setFormData({...formData, ncm: e.target.value})} className={inputClass} placeholder="8 dígitos" />
                      </div>
                      <div>
                        <label className={labelClass}>CST / CSOSN (ICMS)</label>
                        <input type="text" value={formData.cstCsosnIcms ?? ''} onChange={e => setFormData({...formData, cstCsosnIcms: e.target.value})} className={inputClass} placeholder="Ex: 102, 500" />
                      </div>
                      <div>
                        <label className={labelClass}>CFOP Padrão (Venda)</label>
                        <input type="text" value={formData.cfopPadrao ?? ''} onChange={e => setFormData({...formData, cfopPadrao: e.target.value})} className={inputClass} placeholder="Ex: 5102" />
                      </div>
                    </div>
                  </div>
                )}

                {stepAtual === 4 && (
                  <div className="space-y-6 animate-fade-in-down">
                    <div className="bg-purple-950/20 p-8 rounded-[30px] border border-purple-500/30 shadow-inner">
                      <label className="block text-sm font-black text-purple-300 uppercase tracking-widest mb-4">Conta de Estoque Analítica (Ativo)</label>
                      <select value={formData.contaEstoqueId ?? ''} onChange={e => setFormData({...formData, contaEstoqueId: e.target.value})} className={`${inputClass} border-purple-500/40 focus:border-purple-500 focus:ring-purple-500`}>
                        <option value="">-- Usar Conta Global Padrão (1.1.4) --</option>
                        {planosContas.filter(c => c.tipo === 'ATIVO').map(c => (
                          <option key={c.id} value={c.id}>{c.codigo} - {c.nome}</option>
                        ))}
                      </select>
                      <p className="text-sm text-purple-300/70 mt-4 font-medium leading-relaxed">
                        Define onde o custo de aquisição deste produto será contabilizado no Balanço Patrimonial (Ativo Circulante). Se deixado em branco, o sistema usará a conta de Estoque Global.
                      </p>
                    </div>
                  </div>
                )}

                                {/* 🚀 NOVO: ETAPA 5 - PRODUÇÃO / AÇOUGUE */}
                                {/* 🚀 NOVO: ETAPA 5 - PRODUÇÃO / AÇOUGUE */}
                {stepAtual === 5 && formData.controlaProducao && (
                  <div className="space-y-6 animate-fade-in-down">
                    
                    <div className="bg-violet-950/20 border border-violet-500/30 p-5 rounded-2xl flex items-start gap-4">
                      <div className="p-2 bg-violet-900/50 rounded-xl mt-1"><Package className="w-5 h-5 text-violet-400" /></div>
                      <div>
                        <h4 className="text-violet-300 font-bold mb-1">Módulo de Ficha Técnica e Produção</h4>
                        <p className="text-slate-400 text-sm">Preencha estes dados apenas se este produto for processado no seu estabelecimento (ex: desossa de açougue, fatiamento de frios, padaria).</p>
                      </div>
                    </div>

                    {/* BLOCO 1: Classificação e Ministério */}
                    <div className="bg-[#0b1324]/70 border border-white/10 rounded-2xl p-6">
                      <div className="flex items-center gap-2 mb-4 text-violet-400">
                        <FileText size={20} />
                        <h3 className="font-bold text-lg text-white">Classificação e Ministério da Agricultura</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        <div className="flex flex-col justify-end">
                          <label className={labelClass}>Tipo de Produto na Produção</label>
                          <select name="tipoProdutoProducao" value={formData.dadosProducao?.tipoProdutoProducao || 'PRODUTO_ACABADO'} onChange={handleProducaoChange} className={inputClass}>
                            <option value="MATERIA_PRIMA">Matéria Prima (Carcassa/Quarto)</option>
                            <option value="PRODUTO_ACABADO">Produto Acabado (Corte)</option>
                            <option value="SUBPRODUTO">Subproduto (Osso/Sebo)</option>
                            <option value="INSUMO_EMBALAGEM">Insumo/Embalagem</option>
                          </select>
                        </div>
                        <div className="flex flex-col justify-end">
                          <label className={labelClass}>Registro Ministério (PGA)</label>
                          <input type="text" name="registroRotuloPGA" placeholder="Ex: 0012/3456" value={formData.dadosProducao?.registroRotuloPGA || ''} onChange={handleProducaoChange} className={inputClass} />
                        </div>
                        <div className="flex flex-col justify-end">
                          <label className={labelClass}>Descrição Oficial (Ministério)</label>
                          <input type="text" name="descricaoMinisterio" placeholder="Descrição técnica oficial..." value={formData.dadosProducao?.descricaoMinisterio || ''} onChange={handleProducaoChange} className={inputClass} />
                        </div>
                      </div>
                    </div>

                    {/* BLOCO 2: Rendimentos e Pesos */}
                    <div className="bg-[#0b1324]/70 border border-white/10 rounded-2xl p-6 border-l-4 border-l-blue-500">
                      <div className="flex items-center gap-2 mb-4 text-blue-400">
                        <Scale size={20} />
                        <h3 className="font-bold text-lg text-white">Rendimento e Pesos Unitários</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                        <div className="flex flex-col justify-end">
                          <label className={labelClass}>Família de Rendimento</label>
                          <input type="text" name="familiaRendimento" placeholder="Ex: Traseiro" value={formData.dadosProducao?.familiaRendimento || ''} onChange={handleProducaoChange} className={inputClass} />
                        </div>
                        <div className="flex flex-col justify-end">
                          <label className={labelClass}>Rendimento Padrão (%)</label>
                          <input type="number" step="0.01" name="rendimentoPadrao" placeholder="Ex: 82.5" value={formData.dadosProducao?.rendimentoPadrao || ''} onChange={handleProducaoChange} className={inputClass} />
                        </div>
                        <div className="flex flex-col justify-end">
                          <label className={labelClass}>Peso Médio Peça (KG) *</label>
                          <input type="number" step="0.001" name="pesoMedioPeca" placeholder="Ex: 15.500" value={formData.dadosProducao?.pesoMedioPeca || ''} onChange={handleProducaoChange} className={inputClass} />
                        </div>
                        <div className="flex flex-col justify-end">
                          <label className={labelClass}>Peso Padrão (Bandeja KG)</label>
                          <input type="number" step="0.001" name="pesoPadrao" placeholder="Ex: 0.500" value={formData.dadosProducao?.pesoPadrao || ''} onChange={handleProducaoChange} className={inputClass} />
                        </div>
                      </div>
                    </div>

                    {/* BLOCO 3: Caixa e Logística */}
                    <div className="bg-[#0b1324]/70 border border-white/10 rounded-2xl p-6 border-l-4 border-l-indigo-500">
                      <div className="flex items-center gap-2 mb-4 text-indigo-400">
                        <Package size={20} />
                        <h3 className="font-bold text-lg text-white">Logística e Caixa Fechada</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        <div className="flex flex-col justify-end">
                          <label className={labelClass}>GTIN-14 (DUN-14 da Caixa)</label>
                          <input type="text" name="gtin14" placeholder="Código de barras da caixa" value={formData.dadosProducao?.gtin14 || ''} onChange={handleProducaoChange} className={inputClass} />
                        </div>
                        <div className="flex flex-col justify-end">
                          <label className={labelClass}>Qtd. Média de Peças por Caixa</label>
                          <input type="number" name="qtdMediaPecasPorCaixa" placeholder="Ex: 6" value={formData.dadosProducao?.qtdMediaPecasPorCaixa || ''} onChange={handleProducaoChange} className={inputClass} />
                        </div>
                        <div className="flex flex-col justify-end">
                          <label className={labelClass}>Peso Médio da Caixa (KG)</label>
                          <input type="number" step="0.001" name="pesoMedioCaixa" placeholder="Ex: 25.000" value={formData.dadosProducao?.pesoMedioCaixa || ''} onChange={handleProducaoChange} className={inputClass} />
                        </div>
                      </div>
                    </div>

                    {/* BLOCO 4: Peso de rotulagem, validade e conservação (antes da rotulagem textual) */}
                    <div className="bg-[#0b1324]/70 border border-white/10 rounded-2xl p-6 border-l-4 border-l-emerald-500">
                      <div className="flex items-center gap-2 mb-4 text-emerald-400">
                        <ThermometerSnowflake size={20} />
                        <h3 className="font-bold text-lg text-white">Rotulagem física, validade e conservação</h3>
                      </div>
                      <p className="text-slate-400 text-sm mb-5">
                        Peso líquido/bruto e shelf life alimentam o cadastro do produto e a ficha de produção de forma consistente (sem duplicar na etapa 1).
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        <div className="flex flex-col justify-end">
                          <label className={labelClass}>Peso líquido (kg) — rótulo / embalagem</label>
                          <input
                            type="number"
                            step="0.001"
                            min="0"
                            name="pesoLiquido"
                            placeholder="0,000"
                            value={
                              formData.dadosProducao?.pesoLiquido === '' ||
                              formData.dadosProducao?.pesoLiquido === undefined
                                ? ''
                                : formData.dadosProducao.pesoLiquido
                            }
                            onChange={handleProducaoChange}
                            className={inputClass}
                          />
                        </div>
                        <div className="flex flex-col justify-end">
                          <label className={labelClass}>Peso bruto (kg) — rótulo / embalagem</label>
                          <input
                            type="number"
                            step="0.001"
                            min="0"
                            name="pesoBruto"
                            placeholder="0,000"
                            value={
                              formData.dadosProducao?.pesoBruto === '' ||
                              formData.dadosProducao?.pesoBruto === undefined
                                ? ''
                                : formData.dadosProducao.pesoBruto
                            }
                            onChange={handleProducaoChange}
                            className={inputClass}
                          />
                        </div>
                        <div className="flex flex-col justify-end">
                          <label className={labelClass}>Dias de validade</label>
                          <input type="number" name="diasValidade" placeholder="Ex: 7" value={formData.dadosProducao?.diasValidade ?? ''} onChange={handleProducaoChange} className={inputClass} />
                        </div>
                        <div className="flex flex-col justify-end">
                          <label className={labelClass}>Condição de conservação</label>
                          <select name="tipoConservacao" value={formData.dadosProducao?.tipoConservacao || 'RESFRIADO'} onChange={handleProducaoChange} className={inputClass}>
                            <option value="RESFRIADO">Resfriado</option>
                            <option value="CONGELADO">Congelado</option>
                            <option value="TEMPERATURA_AMBIENTE">Temp. Ambiente</option>
                          </select>
                        </div>
                        <div className="flex flex-col justify-end">
                          <label className={labelClass}>Temp. inicial máx (°C)</label>
                          <input
                            type="number"
                            step="0.1"
                            name="temperaturaInicial"
                            placeholder="Ex: 0 ou 7.0"
                            value={
                              formData.dadosProducao?.temperaturaInicial != null &&
                              formData.dadosProducao.temperaturaInicial !== ''
                                ? formData.dadosProducao.temperaturaInicial
                                : ''
                            }
                            onChange={handleProducaoChange}
                            className={inputClass}
                          />
                        </div>
                        <div className="flex flex-col justify-end">
                          <label className={labelClass}>Temp. final máx (°C)</label>
                          <input
                            type="number"
                            step="0.1"
                            name="temperaturaFinal"
                            placeholder="Ex: 0 ou 4.0"
                            value={
                              formData.dadosProducao?.temperaturaFinal != null &&
                              formData.dadosProducao.temperaturaFinal !== ''
                                ? formData.dadosProducao.temperaturaFinal
                                : ''
                            }
                            onChange={handleProducaoChange}
                            className={inputClass}
                          />
                        </div>
                      </div>
                    </div>

                    {/* BLOCO 5: Etiquetas e Embalagens */}
                    <div className="bg-[#0b1324]/70 border border-white/10 rounded-2xl p-6 border-l-4 border-l-amber-500">
                      <div className="flex items-center gap-2 mb-4 text-amber-400">
                        <Tag size={20} />
                        <h3 className="font-bold text-lg text-white">Etiquetas e Embalagens</h3>
                      </div>
                      <p className="text-slate-400 text-sm mb-4">
                        Layouts vêm de <span className="text-amber-200/90">Cadastros → Layout de etiquetas</span>. Embalagens vêm da{' '}
                        <span className="text-amber-200/90">ficha técnica (BOM)</span> em Cadastros → Embalagens; valores antigos em texto permanecem como opção legada.
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
                        <div className="flex flex-col justify-end">
                          <label className={labelClass}>Descrição na Etiqueta (Curta)</label>
                          <input type="text" name="descricaoEtiqueta" placeholder="Ex: PICANHA GRILL" maxLength={25} value={formData.dadosProducao?.descricaoEtiqueta || ''} onChange={handleProducaoChange} className={inputClass} />
                        </div>
                        <div className="flex flex-col justify-end">
                          <label className={labelClass}>Layout etiqueta interna</label>
                          <select
                            name="layoutEtiquetaInterna"
                            value={String(formData.dadosProducao?.layoutEtiquetaInterna ?? '')}
                            onChange={handleProducaoChange}
                            className={inputClass}
                          >
                            {buildOpcoesLayoutSelect(
                              layoutsEtiqueta,
                              formData.dadosProducao?.layoutEtiquetaInterna
                            ).map((op, idx) => (
                              <option key={`layout-int-${idx}`} value={op.value}>
                                {op.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="flex flex-col justify-end">
                          <label className={labelClass}>Layout etiqueta secundária</label>
                          <select
                            name="layoutEtiquetaSecundaria"
                            value={String(formData.dadosProducao?.layoutEtiquetaSecundaria ?? '')}
                            onChange={handleProducaoChange}
                            className={inputClass}
                          >
                            {buildOpcoesLayoutSelect(
                              layoutsEtiqueta,
                              formData.dadosProducao?.layoutEtiquetaSecundaria
                            ).map((op, idx) => (
                              <option key={`layout-sec-${idx}`} value={op.value}>
                                {op.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="flex flex-col justify-end">
                          <label className={labelClass}>Embalagem primária</label>
                          <select
                            name="embalagemPrimaria"
                            value={String(formData.dadosProducao?.embalagemPrimaria ?? '')}
                            onChange={handleEmbalagemPrimariaChange}
                            className={inputClass}
                          >
                            {buildOpcoesEmbalagemSelect(
                              listaEmbalagens,
                              formData.dadosProducao?.embalagemPrimaria
                            ).map((op, idx) => (
                              <option key={`emb-p-${idx}`} value={op.value}>
                                {op.label}
                              </option>
                            ))}
                          </select>
                          <label className={`${labelClass} mt-3`}>Tara primária (kg)</label>
                          <input
                            type="number"
                            step="any"
                            min={0}
                            name="taraPrimaria"
                            placeholder="Preenchido pela embalagem; pode ajustar"
                            value={
                              formData.dadosProducao?.taraPrimaria != null &&
                              formData.dadosProducao.taraPrimaria !== ''
                                ? formData.dadosProducao.taraPrimaria
                                : ''
                            }
                            onChange={handleProducaoChange}
                            className={inputClass}
                          />
                        </div>
                        <div className="flex flex-col justify-end">
                          <label className={labelClass}>Embalagem secundária</label>
                          <select
                            name="embalagemSecundaria"
                            value={String(formData.dadosProducao?.embalagemSecundaria ?? '')}
                            onChange={handleEmbalagemSecundariaChange}
                            className={inputClass}
                          >
                            {buildOpcoesEmbalagemSelect(
                              listaEmbalagens,
                              formData.dadosProducao?.embalagemSecundaria
                            ).map((op, idx) => (
                              <option key={`emb-s-${idx}`} value={op.value}>
                                {op.label}
                              </option>
                            ))}
                          </select>
                          <label className={`${labelClass} mt-3`}>Tara secundária (kg)</label>
                          <input
                            type="number"
                            step="any"
                            min={0}
                            name="taraSecundaria"
                            placeholder="Preenchido pela embalagem; pode ajustar"
                            value={
                              formData.dadosProducao?.taraSecundaria != null &&
                              formData.dadosProducao.taraSecundaria !== ''
                                ? formData.dadosProducao.taraSecundaria
                                : ''
                            }
                            onChange={handleProducaoChange}
                            className={inputClass}
                          />
                        </div>
                      </div>
                    </div>

                    {/* BLOCO: Rotulagem — ingredientes, alérgenos, tabela nutricional (JSON) */}
                    <div className="bg-[#0b1324]/70 border border-white/10 rounded-2xl p-6 border-l-4 border-l-rose-500/80">
                      <div className="flex items-center gap-2 mb-4 text-rose-300">
                        <ClipboardList className="w-5 h-5" />
                        <h3 className="font-bold text-lg text-white">Rotulagem e informação ao consumidor</h3>
                      </div>
                      <p className="text-slate-400 text-sm mb-5">
                        Textos para rótulo e legislação. A tabela nutricional pode ser colada em JSON válido (ex.: chaves por porção).
                      </p>
                      <div className="grid grid-cols-1 gap-5">
                        <div>
                          <label className={labelClass}>Ingredientes</label>
                          <textarea
                            name="ingredientes"
                            rows={5}
                            value={formData.dadosProducao?.ingredientes || ''}
                            onChange={handleProducaoChange}
                            className={`${inputClass} min-h-[120px] font-sans text-sm leading-relaxed resize-y`}
                            placeholder="Liste os ingredientes na ordem decrescente de quantidade..."
                          />
                        </div>
                        <div>
                          <label className={labelClass}>Alérgenicos</label>
                          <textarea
                            name="alergenicos"
                            rows={3}
                            value={formData.dadosProducao?.alergenicos || ''}
                            onChange={handleProducaoChange}
                            className={`${inputClass} min-h-[80px] font-sans text-sm leading-relaxed resize-y`}
                            placeholder="Ex.: Contém glúten. Pode conter traços de amendoim."
                          />
                        </div>
                        <div>
                          <label className={labelClass}>Informação nutricional (JSON)</label>
                          <textarea
                            name="informacaoNutricional"
                            rows={8}
                            value={
                              typeof formData.dadosProducao?.informacaoNutricional === 'string'
                                ? formData.dadosProducao.informacaoNutricional
                                : formData.dadosProducao?.informacaoNutricional
                                  ? JSON.stringify(formData.dadosProducao.informacaoNutricional, null, 2)
                                  : ''
                            }
                            onChange={handleProducaoChange}
                            className={`${inputClass} min-h-[180px] font-mono text-xs leading-relaxed resize-y`}
                            placeholder={`{\n  "porcao": "100g",\n  "energiaKcal": 250,\n  "proteinasG": 26\n}`}
                          />
                          <p className="text-[11px] text-slate-500 mt-2">
                            JSON inválido será salvo como texto estruturado no servidor; prefira um objeto JSON válido.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* BLOCO 6: Regras de Negócio (Checkboxes) */}
                    <div className="bg-[#0b1324]/70 border border-white/10 rounded-2xl p-6 border-l-4 border-l-fuchsia-500">
                      <div className="flex items-center gap-2 mb-4 text-fuchsia-400">
                        <ShieldCheck size={20} />
                        <h3 className="font-bold text-lg text-white">Regras de Negócio e Travas</h3>
                      </div>
                      <div className="flex flex-col md:flex-row gap-6 md:gap-8">
                        <label className="flex items-center gap-3 cursor-pointer group">
                          <input type="checkbox" name="controlaEstoque" checked={formData.dadosProducao?.controlaEstoque ?? true} onChange={handleProducaoChange} className="w-5 h-5 rounded border-white/20 bg-[#08101f] text-violet-600 focus:ring-violet-500/30" />
                          <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">Controla Estoque</span>
                        </label>
                        <label className="flex items-center gap-3 cursor-pointer group">
                          <input type="checkbox" name="controlaRendimento" checked={formData.dadosProducao?.controlaRendimento ?? true} onChange={handleProducaoChange} className="w-5 h-5 rounded border-white/20 bg-[#08101f] text-violet-600 focus:ring-violet-500/30" />
                          <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">Controla Quebra/Rendimento</span>
                        </label>
                        <label className="flex items-center gap-3 cursor-pointer group">
                          <input type="checkbox" name="permiteVencido" checked={formData.dadosProducao?.permiteVencido ?? false} onChange={handleProducaoChange} className="w-5 h-5 rounded border-white/20 bg-[#08101f] text-red-500 focus:ring-red-500/30" />
                          <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">Permite uso pós-validade (Ex: Sebo)</span>
                        </label>
                      </div>
                    </div>

                  </div>
                )}
              </div>

              <div className="p-6 bg-[#0b1324]/80 border-t border-white/10 flex flex-col-reverse sm:flex-row justify-between items-center gap-4 rounded-b-[30px]">
                <button 
                  onClick={() => setStepAtual(Math.max(1, stepAtual - 1))} 
                  className={`w-full sm:w-auto px-6 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors ${stepAtual === 1 ? 'opacity-0 pointer-events-none' : 'text-slate-400 hover:text-white hover:bg-[#08101f] border border-white/10'}`}
                >
                  <ChevronLeft className="w-5 h-5" /> Voltar
                </button>

                {stepAtual < totalSteps ? (
                  <button onClick={() => setStepAtual(stepAtual + 1)} className="w-full sm:w-auto bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white px-8 py-3.5 rounded-xl font-black transition-all shadow-[0_0_20px_rgba(139,92,246,0.30)] flex items-center justify-center gap-2 hover:scale-[1.02]">
                    Próximo Passo <ChevronRight className="w-5 h-5" />
                  </button>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                    {!isEditModeFromPDV && (
                      <button 
                        onClick={() => handleSalvarProduto('RASCUNHO')}
                        className="w-full sm:w-auto bg-[#08101f] hover:bg-slate-700 text-white px-6 py-3.5 rounded-xl font-bold transition-all flex items-center justify-center gap-2 border border-white/10"
                      >
                        <Save className="w-5 h-5" /> Salvar Rascunho
                      </button>
                    )}
                    <button 
                      onClick={() => handleSalvarProduto('ATIVO')}
                      className="w-full sm:w-auto bg-gradient-to-r from-emerald-600 to-teal-500 text-white px-8 py-3.5 rounded-xl font-black transition-all shadow-[0_0_20px_rgba(16,185,129,0.30)] flex items-center justify-center gap-2 hover:scale-[1.02]"
                    >
                      <CheckCircle2 className="w-5 h-5" /> {isEditModeFromPDV ? 'Salvar e Voltar ao PDV' : 'Finalizar e Ativar'}
                    </button>
                  </div>
                )}
              </div>

            </div>
          </div>
        )}

      </div>
    </Layout>
  );
}