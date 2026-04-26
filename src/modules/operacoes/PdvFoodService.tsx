import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { io, type Socket } from 'socket.io-client';
import { Layout } from '../../components/Layout';
import { api, resolveApiBaseUrl } from '../../services/api';
import { adicionarItensNaMesa, atualizarQuantidadeItemNaMesa } from '../../services/api/mesaContaApi';
import { buildKdsSocketAuth } from '../../services/socket/kdsSocketAuth';
import {
  getCaixaFiscalIdPdv,
  getEstacaoTrabalhoIdPdv,
  getModoPdvLocalFallback,
  getSessaoCaixaIdPdv,
  persistirModoPdvLocal,
} from '../../utils/estacaoWorkstationStorage';
import { 
  Search, ShoppingCart, CreditCard, Banknote, QrCode, 
  Trash2, Check, User, UtensilsCrossed, Monitor, 
  Bike, Plus, Minus, Tag, Coffee, Pizza, AlertCircle, RefreshCw,
  Users, Calculator, Bot, ShieldAlert, XCircle, Keyboard
} from 'lucide-react';
import { AxiosError } from 'axios';
import { toast } from 'react-toastify';
import {
  buildTotemCategoriasFromCardapio,
  getCardapioTotem,
  mapCardapioItemToTotemProduto,
  IMAGEM_FALLBACK_FOOD,
  slugTotemCategoria,
} from '../../services/api/cardapioTotemApi';
import type { ItemAdicionarNaMesaDto } from '../../services/api/mesaContaApi';
import { ProductModal } from '../totem/components/ProductModal';
import type { CartItem, TotemMockCategoria, TotemMockProduto } from '../totem/types';
import {
  arredondar2,
  calcularSubtotalLinhaFood,
  itemAdicionarNaMesaDtoFromFoodLine,
  itemFoodExigeModalComposicao,
  mapItemMesaParaLinhaVendaApi,
  itemMesaLinhaIncompletaParaVenda,
  montarLinhaVendaApiFromCartItem,
  nomesSaboresFromSnapshotJson,
  rotuloLinhaFood,
  saboresIdsFromSnapshotJson,
  validarLinhasCarrinhoFood,
  type CardapioMesaMetaVenda,
  type ItemMesaApiParaVendaInput,
} from '../food/composition/foodItemComposition';
import { getImagemItemFood } from '../food/imagemItemFood';
import {
  resolverSaborIdParaPizza,
  saborCandidatoParaPizzaMultiBase,
  saborDaPizzaSuportaTamanho,
} from '../food/pizzaUtils';
import {
  aguardarAutorizacaoTefHardware,
  tefCancelarAutorizacaoPendente,
  tefFalhaSalvarVendaCnc,
  tefPosVendaSucessoCnc,
} from '../../services/tefCncFlow';
import { getHardwareAgent } from '../../services/hardwareAgent';

type PdvFoodCartLine = CartItem & {
  itemMesaId?: string;
  nomeExibicaoSnapshot?: string | null;
  tamanhoNomeSnapshot?: string | null;
  saboresSnapshotJson?: unknown;
  /** Metadados do cardápio retornados em GET `/api/pdv/mesas` (validação / payload de venda). */
  mesaCardapioMeta?: CardapioMesaMetaVenda | null;
  adicionaisSnapshotJson?: unknown;
};

type ModoAtendimento = 'BALCAO' | 'MESA' | 'DELIVERY';
/** PDV Food: pagamento imediato vs. na retirada (balcão) / na entrega (delivery). */
type TimingCobrancaFood = 'AGORA' | 'POSTERIOR';
type StatusMesa = 'LIVRE' | 'OCUPADA' | 'FECHANDO';

/** Estado entre “Dividir sabor” e escolher próximo sabor no catálogo (PDV Food). */
interface PizzaComposicaoPdvState {
  produtoBase: TotemMockProduto;
  quantidade: number;
  adicionais: Record<string, number>;
  observacao: string;
  itemCardapioTamanhoId: string | null;
  saboresItemCardapioIds: string[];
}

interface IMesa {
  numero: number;
  status: StatusMesa;
  itens: PdvFoodCartLine[];
}

interface IPagamentoParcial {
  id: string;
  tipoPagamento: string;
  valor: number;
  transacaoTefId?: string;
  canalAdquirente?: 'POS' | 'TEF';
}

interface PacoteImpressaoPos {
  formato: string;
  payload: string;
}

const LS_PDV_FOOD_AUTO_PRINT = '@PDV_FOOD:autoPrint';

function isAutoPrintFoodEnabled(): boolean {
  const raw = localStorage.getItem(LS_PDV_FOOD_AUTO_PRINT);
  if (raw == null) return true;
  const v = raw.trim().toLowerCase();
  return v !== 'false' && v !== '0' && v !== 'off';
}

async function enviarPacoteImpressaoPosAoAgent(
  pacoteImpressaoPos: PacoteImpressaoPos
): Promise<boolean> {
  const agent = getHardwareAgent();
  const url = agent.getUrl ? agent.getUrl() : 'ws://localhost:8080';
  console.log('[PDV FOOD][PRINT][AGENT CONNECT]', { url });

  const connected = await agent.waitForOpen(3000);
  if (!connected) {
    console.error('[PDV FOOD][PRINT][AGENT ERROR]', 'Conexão não estabelecida');
    return false;
  }

  const comando = {
    acao: 'IMPRIMIR_CUPOM',
    formato: pacoteImpressaoPos.formato,
    payload: pacoteImpressaoPos.payload,
  };
  console.log('[PDV FOOD][PRINT][AGENT SEND]', comando);

  const enviado = agent.send(comando);
  if (!enviado) {
    console.error('[PDV FOOD][PRINT][AGENT ERROR]', 'Falha ao enviar');
    return false;
  }

  const resposta = await new Promise<boolean>((resolve) => {
    const timeout = setTimeout(() => {
      unsubscribe();
      console.warn('[PDV FOOD][PRINT][AGENT TIMEOUT]');
      resolve(true);
    }, 8000);

    const unsubscribe = agent.subscribe((msg) => {
      const tipo = msg.tipo;
      if (tipo === 'RESPOSTA_IMPRESSAO') {
        clearTimeout(timeout);
        unsubscribe();
        const sucesso = msg.sucesso;
        console.log('[PDV FOOD][PRINT][AGENT RESPONSE]', msg);
        if (sucesso === true) {
          resolve(true);
        } else {
          console.error('[PDV FOOD][PRINT][AGENT ERROR]', msg.mensagem || 'Falha na impressão');
          resolve(false);
        }
      }
    });
  });

  return resposta;
}

interface PdvMesaApiProduto {
  id: string;
  nome: string;
  codigo?: string | null;
  codigoBarras?: string | null;
  precoVenda: string | number;
}

interface PdvMesaApiLinha {
  id: string;
  produto: PdvMesaApiProduto;
  itemCardapio?: {
    id: string;
    nome?: string;
    tipoItem?: string;
    permiteMultiplosSabores?: boolean;
    maxSabores?: number | null;
    tamanhos?: Array<{ id: string }>;
  } | null;
  quantidade: string | number;
  valorTotal: string | number;
  valorUnitario?: string | number;
  observacao?: string | null;
  itemCardapioTamanhoId?: string | null;
  tamanhoNome?: string | null;
  tamanhoPreco?: string | number | null;
  saboresSnapshot?: unknown;
  nomeExibicaoSnapshot?: string | null;
  adicionaisSnapshot?: unknown;
}

interface PdvMesaApi {
  numero: number;
  status: string;
  itens: PdvMesaApiLinha[];
}

/** Resposta mínima de `/api/cadastros/produtos` para bipagem (fallback). */
interface ProdutoCadastroResumo {
  id: string;
  nome: string;
  codigo?: string;
  codigoBarras?: string;
  precoVenda: number;
  categoria?: string;
}

function totemStubCadastro(p: ProdutoCadastroResumo): TotemMockProduto {
  return {
    id: p.id,
    itemCardapioId: p.id,
    produtoId: p.id,
    categoriaId: slugTotemCategoria(p.categoria ?? 'Geral'),
    nome: p.nome,
    descricaoCurta: '',
    descricao: null,
    tipoItem: 'COMIDA',
    permiteMultiplosSabores: false,
    maxSabores: null,
    tamanhos: [],
    precoBase: Number(p.precoVenda),
    imagemUrl: '',
    adicionais: [],
    codigo: p.codigo,
    codigoBarras: p.codigoBarras,
  };
}

function mapTipoItemMesaApi(raw?: string): CardapioMesaMetaVenda['tipoItem'] {
  const u = String(raw ?? 'COMIDA').toUpperCase();
  if (u === 'BEBIDA') return 'BEBIDA';
  if (u === 'PIZZA') return 'PIZZA';
  return 'COMIDA';
}

function cardapioMetaFallbackDeTotem(p: TotemMockProduto): CardapioMesaMetaVenda {
  const tAtivos = (p.tamanhos ?? []).filter((t) => t.ativo !== false);
  return {
    tipoItem: p.tipoItem,
    permiteMultiplosSabores: p.permiteMultiplosSabores === true,
    maxSabores: p.maxSabores ?? null,
    exigeTamanho: tAtivos.length > 0,
  };
}

function mesaCartLineParaVendaInput(line: PdvFoodCartLine): ItemMesaApiParaVendaInput {
  const icId = (line.produto.itemCardapioId ?? line.produto.id).trim();
  const q = line.quantidade;
  const vu = q > 0 ? arredondar2(line.subtotal / q) : 0;
  return {
    produtoId: (line.produto.produtoId ?? line.produto.id).trim(),
    itemCardapioId: icId,
    quantidade: q,
    valorUnitario: vu,
    valorTotal: line.subtotal,
    observacao: line.observacao,
    itemCardapioTamanhoId: line.itemCardapioTamanhoId,
    saboresSnapshot: line.saboresSnapshotJson,
    adicionaisSnapshot: line.adicionaisSnapshotJson,
    cardapio: line.mesaCardapioMeta ?? cardapioMetaFallbackDeTotem(line.produto),
  };
}

function novoIdLinhaPdv(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `pdv-food-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function paraCartItemBase(line: PdvFoodCartLine): CartItem {
  return {
    id: line.id,
    produto: line.produto,
    quantidade: line.quantidade,
    adicionais: line.adicionais,
    observacao: line.observacao,
    itemCardapioTamanhoId: line.itemCardapioTamanhoId,
    partidoAoMeio: line.partidoAoMeio,
    saboresItemCardapioIds: line.saboresItemCardapioIds,
    subtotal: line.subtotal,
  };
}

function mesmaComposicaoFood(a: PdvFoodCartLine, b: PdvFoodCartLine): boolean {
  if (a.produto.id !== b.produto.id) return false;
  if ((a.observacao ?? '').trim() !== (b.observacao ?? '').trim()) return false;
  if ((a.itemCardapioTamanhoId ?? '') !== (b.itemCardapioTamanhoId ?? '')) return false;
  if ((a.partidoAoMeio ?? false) !== (b.partidoAoMeio ?? false)) return false;
  const sa = [...(a.saboresItemCardapioIds ?? [])].sort().join(',');
  const sb = [...(b.saboresItemCardapioIds ?? [])].sort().join(',');
  if (sa !== sb) return false;
  return JSON.stringify(a.adicionais) === JSON.stringify(b.adicionais);
}

function buildStubTotemFromMesaLinha(item: PdvMesaApiLinha): TotemMockProduto {
  const icId = item.itemCardapio?.id ?? item.produto.id;
  return {
    id: icId,
    itemCardapioId: icId,
    produtoId: item.produto.id,
    categoriaId: 'Geral',
    nome: item.itemCardapio?.nome?.trim() || item.produto.nome,
    descricaoCurta: '',
    descricao: null,
    tipoItem: 'COMIDA',
    permiteMultiplosSabores: false,
    maxSabores: null,
    tamanhos: [],
    precoBase: Number(item.valorUnitario ?? item.produto.precoVenda),
    imagemUrl: '',
    adicionais: [],
    codigo: item.produto.codigo ?? undefined,
    codigoBarras: item.produto.codigoBarras ?? undefined,
  };
}

function rotuloLinhaFoodPdv(line: PdvFoodCartLine): { titulo: string; subtitulo?: string } {
  if (line.nomeExibicaoSnapshot) {
    return rotuloLinhaFood({
      tipoItem: line.produto.tipoItem,
      permiteMultiplosSabores: line.produto.permiteMultiplosSabores,
      nomeCardapio: line.produto.nome,
      tamanhoNome: line.tamanhoNomeSnapshot,
      nomesSabores: nomesSaboresFromSnapshotJson(line.saboresSnapshotJson),
      nomeExibicaoSnapshot: line.nomeExibicaoSnapshot,
    });
  }
  const tNome = line.itemCardapioTamanhoId
    ? line.produto.tamanhos.find((t) => t.id === line.itemCardapioTamanhoId)?.nome
    : undefined;
  const nomesSabores = (line.saboresItemCardapioIds ?? [])
    .map((sid) => line.produto.saboresOpcoes?.find((s) => s.id === sid)?.nome.trim())
    .filter((n): n is string => Boolean(n && n.length > 0));
  return rotuloLinhaFood({
    tipoItem: line.produto.tipoItem,
    permiteMultiplosSabores: line.produto.permiteMultiplosSabores,
    nomeCardapio: line.produto.nome,
    tamanhoNome: tNome,
    nomesSabores: nomesSabores.length > 0 ? nomesSabores : undefined,
  });
}

/** Alinhado ao FrenteCaixa: não dispara atalho com foco em campo de edição. */
function isPdvFoodInputFocused(): boolean {
  const el = document.activeElement;
  if (el == null || el === document.body) return false;
  const tag = el.tagName.toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
  if (el instanceof HTMLElement && el.isContentEditable) return true;
  return false;
}

export function PdvFoodService() {
  // --- ESTADOS GERAIS ---
  const [modoAtendimento, setModoAtendimento] = useState<ModoAtendimento>('BALCAO');
  const [produtosTotem, setProdutosTotem] = useState<TotemMockProduto[]>([]);
  const [categoriasUi, setCategoriasUi] = useState<TotemMockCategoria[]>([{ id: 'Todas', nome: 'Todos' }]);
  const [categoriaAtiva, setCategoriaAtiva] = useState<string>('Todas');
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(false);
  const [recarregandoMesas, setRecarregandoMesas] = useState(false);

  const [produtoModal, setProdutoModal] = useState<TotemMockProduto | null>(null);
  const [modalProdutoAberto, setModalProdutoAberto] = useState(false);
  const [linhaEdicao, setLinhaEdicao] = useState<PdvFoodCartLine | null>(null);
  const [pizzaEmComposicao, setPizzaEmComposicao] = useState<PizzaComposicaoPdvState | null>(null);
  const preservarPizzaAoFecharModalRef = useRef(false);

  // --- ESTADOS DO CARRINHO ---
  const [carrinho, setCarrinho] = useState<PdvFoodCartLine[]>([]);
  const [clienteDelivery, setClienteDelivery] = useState({ nome: '', telefone: '', endereco: '' });

  // --- ESTADOS DE MESAS ---
  const [mesas, setMesas] = useState<IMesa[]>(
    Array.from({ length: 20 }, (_, i) => ({ numero: i + 1, status: 'LIVRE', itens: [] }))
  );
  const [mesaSelecionada, setMesaSelecionada] = useState<number | null>(null);

  const produtosTotemRef = useRef<TotemMockProduto[]>([]);
  useEffect(() => {
    produtosTotemRef.current = produtosTotem;
  }, [produtosTotem]);

  // --- ESTADOS DE PAGAMENTO (SPLIT BILL) ---
  const [modalPagamento, setModalPagamento] = useState(false);
  const [formaPagamentoAtual, setFormaPagamentoAtual] = useState('PIX');
  const [valorDigitado, setValorDigitado] = useState<string>('');
  const [pagamentosAdicionados, setPagamentosAdicionados] = useState<IPagamentoParcial[]>([]);
  const [dividirPor, setDividirPor] = useState<number>(1);
  const [timingCobrancaFood, setTimingCobrancaFood] = useState<TimingCobrancaFood>('AGORA');
  const [finalizando, setFinalizando] = useState(false);
  const [tefFoodBusy, setTefFoodBusy] = useState(false);
  const [mesaSyncBusy, setMesaSyncBusy] = useState(false);

  const cancelarModalPagamento = useCallback(() => {
    for (const p of pagamentosAdicionados) {
      if (p.transacaoTefId) {
        void tefCancelarAutorizacaoPendente(p.transacaoTefId).catch(() => undefined);
      }
    }
    setPagamentosAdicionados([]);
    setTimingCobrancaFood('AGORA');
    setModalPagamento(false);
  }, [pagamentosAdicionados]);

  const fecharModalSeSemPagamentosParciais = useCallback(() => {
    if (pagamentosAdicionados.length > 0) return;
    setModalPagamento(false);
  }, [pagamentosAdicionados.length]);

  const [perfilTerminalPdv, setPerfilTerminalPdv] = useState<{
    tipo: 'PDV' | 'TOTEM';
    modoPdv: 'NFCE' | 'CONSUMIDOR';
  } | null>(null);

  const perfilTerminalPdvRef = useRef(perfilTerminalPdv);
  useEffect(() => {
    perfilTerminalPdvRef.current = perfilTerminalPdv;
  }, [perfilTerminalPdv]);

  // 🚀 ESTADOS: ESCUDO FISCAL E AUTO-RETENTATIVA
  const [alertaAurya, setAlertaAurya] = useState<string | null>(null);
  const [aguardandoFoco, setAguardandoFoco] = useState(false);

  const foodUiBlockingRef = useRef({
    modalPagamento: false,
    modalProdutoAberto: false,
    alertaAurya: false,
    tefFoodBusy: false,
    finalizando: false,
  });
  useEffect(() => {
    foodUiBlockingRef.current = {
      modalPagamento,
      modalProdutoAberto,
      alertaAurya: Boolean(alertaAurya),
      tefFoodBusy,
      finalizando,
    };
  }, [modalPagamento, modalProdutoAberto, alertaAurya, tefFoodBusy, finalizando]);

  const carregarMesas = useCallback(async (catalogo?: TotemMockProduto[]) => {
    setRecarregandoMesas(true);
    try {
      const response = await api.get<PdvMesaApi[]>('/api/pdv/mesas');
      const mesasAtivas = response.data;
      const cat = catalogo?.length ? catalogo : produtosTotemRef.current;
      const porCardapio = new Map(cat.map((p) => [p.id, p]));

      const gridAtualizado = Array.from({ length: 20 }, (_, i) => {
        const numero = i + 1;
        const mesaBanco = mesasAtivas.find((m) => m.numero === numero);
        if (!mesaBanco) {
          return { numero, status: 'LIVRE' as const, itens: [] as PdvFoodCartLine[] };
        }

        const rawItens = Array.isArray(mesaBanco.itens) ? mesaBanco.itens : [];
        if (rawItens.length === 0) {
          return { numero, status: 'LIVRE' as const, itens: [] as PdvFoodCartLine[] };
        }

        const st = String(mesaBanco.status).toUpperCase();
        const statusUi: StatusMesa =
          st === 'FECHANDO' ? 'FECHANDO' : st === 'LIVRE' ? 'OCUPADA' : (mesaBanco.status as StatusMesa);

        return {
          numero,
          status: statusUi,
          itens: rawItens.map((item) => {
            const icId = item.itemCardapio?.id ?? item.produto.id;
            const produto = porCardapio.get(icId) ?? buildStubTotemFromMesaLinha(item);
            const sids = saboresIdsFromSnapshotJson(item.saboresSnapshot);
            const mesaCardapioMeta: CardapioMesaMetaVenda | null = item.itemCardapio
              ? {
                  tipoItem: mapTipoItemMesaApi(item.itemCardapio.tipoItem),
                  permiteMultiplosSabores: item.itemCardapio.permiteMultiplosSabores === true,
                  maxSabores: item.itemCardapio.maxSabores ?? null,
                  exigeTamanho:
                    Array.isArray(item.itemCardapio.tamanhos) &&
                    item.itemCardapio.tamanhos.length > 0,
                }
              : null;
            return {
              id: item.id,
              itemMesaId: item.id,
              produto,
              quantidade: Number(item.quantidade),
              adicionais: {},
              observacao: item.observacao ?? '',
              itemCardapioTamanhoId: item.itemCardapioTamanhoId ?? null,
              saboresItemCardapioIds: sids.length > 0 ? sids : undefined,
              subtotal: Number(item.valorTotal),
              nomeExibicaoSnapshot: item.nomeExibicaoSnapshot ?? null,
              tamanhoNomeSnapshot: item.tamanhoNome ?? null,
              saboresSnapshotJson: item.saboresSnapshot ?? undefined,
              mesaCardapioMeta,
              adicionaisSnapshotJson: item.adicionaisSnapshot ?? undefined,
            } satisfies PdvFoodCartLine;
          }),
        };
      });

      setMesas(gridAtualizado);
    } catch (error) {
      console.error("Erro ao carregar mesas", error);
    } finally {
      setRecarregandoMesas(false);
    }
  }, []);

  const carregarProdutos = useCallback(async () => {
    setLoading(true);
    try {
      const { itens } = await getCardapioTotem();
      const mapped = itens.map(mapCardapioItemToTotemProduto);
      setProdutosTotem(mapped);
      const cats = buildTotemCategoriasFromCardapio(itens);
      setCategoriasUi([{ id: 'Todas', nome: 'Todos' }, ...cats]);
      setCategoriaAtiva('Todas');
      await carregarMesas(mapped);
    } catch (error) {
      console.error('Erro ao carregar produtos', error);
    } finally {
      setLoading(false);
    }
  }, [carregarMesas]);

  useEffect(() => {
    void carregarProdutos();
  }, [carregarProdutos]);

  useEffect(() => {
    const estId = getEstacaoTrabalhoIdPdv()?.trim();
    if (!estId) {
      setPerfilTerminalPdv(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const { data } = await api.get<{
          success?: boolean;
          data?: { tipoTerminal?: string; modoPdv?: string };
        }>('/api/estacoes-trabalho/meu-terminal');
        if (cancelled) return;
        const row = data?.data;
        const tipo: 'PDV' | 'TOTEM' = row?.tipoTerminal === 'TOTEM' ? 'TOTEM' : 'PDV';
        const modoPdv: 'NFCE' | 'CONSUMIDOR' =
          row?.modoPdv === 'CONSUMIDOR' ? 'CONSUMIDOR' : 'NFCE';
        setPerfilTerminalPdv({ tipo, modoPdv });
        if (tipo === 'PDV') persistirModoPdvLocal(estId, modoPdv);
      } catch {
        if (cancelled) return;
        const fb = getModoPdvLocalFallback(estId);
        setPerfilTerminalPdv({ tipo: 'PDV', modoPdv: fb ?? 'NFCE' });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const alternarModoPdv = useCallback(async () => {
    const estId = getEstacaoTrabalhoIdPdv()?.trim();
    const p = perfilTerminalPdvRef.current;
    if (!estId || p?.tipo !== 'PDV') return;
    const next: 'NFCE' | 'CONSUMIDOR' = p.modoPdv === 'NFCE' ? 'CONSUMIDOR' : 'NFCE';
    try {
      await api.patch(`/api/estacoes-trabalho/${estId}/modo-pdv`, { modoPdv: next });
      persistirModoPdvLocal(estId, next);
      setPerfilTerminalPdv((cur) => (cur && cur.tipo === 'PDV' ? { ...cur, modoPdv: next } : cur));
      toast.info(next === 'NFCE' ? 'NFc' : 'Consumidor', {
        autoClose: 1400,
        position: 'bottom-center',
      });
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string; erro?: string; error?: string } } };
      const msg =
        ax.response?.data?.message ||
        ax.response?.data?.erro ||
        ax.response?.data?.error;
      toast.error(typeof msg === 'string' && msg ? msg : 'Não foi possível alterar o modo do documento.');
    }
  }, []);

  const alternarModoPdvRef = useRef(alternarModoPdv);
  useEffect(() => {
    alternarModoPdvRef.current = alternarModoPdv;
  }, [alternarModoPdv]);

  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key !== 'F9') return;
      if (isPdvFoodInputFocused()) return;
      const b = foodUiBlockingRef.current;
      if (b.modalPagamento || b.modalProdutoAberto || b.alertaAurya || b.tefFoodBusy || b.finalizando)
        return;
      e.preventDefault();
      void alternarModoPdvRef.current();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (modoAtendimento !== 'MESA') return;
    const auth = buildKdsSocketAuth();
    if (!auth?.token) return;

    const socket: Socket = io(resolveApiBaseUrl(), {
      auth,
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 8,
      reconnectionDelay: 1200,
    });

    const onConta = () => {
      void carregarMesas();
    };
    socket.on('mesa-conta-atualizada', onConta);
    socket.on('mesa-liberada', onConta);

    return () => {
      socket.off('mesa-conta-atualizada', onConta);
      socket.off('mesa-liberada', onConta);
      socket.disconnect();
    };
  }, [modoAtendimento, carregarMesas]);

  useEffect(() => {
    if (!modalPagamento) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [modalPagamento]);

  useEffect(() => {
    if (!modalPagamento || tefFoodBusy || finalizando) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (pagamentosAdicionados.length > 0) return;
      setModalPagamento(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [modalPagamento, tefFoodBusy, finalizando, pagamentosAdicionados.length]);

  // --- LÓGICA DE CARRINHO ---
  const getCarrinhoAtual = useCallback(() => {
    if (modoAtendimento === 'MESA' && mesaSelecionada) {
      return mesas.find(m => m.numero === mesaSelecionada)?.itens || [];
    }
    return carrinho;
  }, [modoAtendimento, mesaSelecionada, mesas, carrinho]);

  const mesaEdicaoBloqueada =
    modoAtendimento === 'MESA' &&
    mesaSelecionada != null &&
    mesas.find((m) => m.numero === mesaSelecionada)?.status === 'FECHANDO';

  const abrirModalProduto = useCallback((p: TotemMockProduto, edicao: PdvFoodCartLine | null = null) => {
    if (edicao) {
      setPizzaEmComposicao(null);
    }
    setLinhaEdicao(edicao);
    setProdutoModal(p);
    setModalProdutoAberto(true);
  }, []);

  const fecharModalProduto = useCallback(() => {
    const manterPizza = preservarPizzaAoFecharModalRef.current;
    preservarPizzaAoFecharModalRef.current = false;
    setModalProdutoAberto(false);
    setProdutoModal(null);
    setLinhaEdicao(null);
    if (!manterPizza) {
      setPizzaEmComposicao(null);
    }
  }, []);

  const rascunhoModalPdv = useMemo(() => {
    if (!modalProdutoAberto || !produtoModal || !pizzaEmComposicao) return null;
    if (pizzaEmComposicao.produtoBase.id !== produtoModal.id) return null;
    return {
      quantidade: pizzaEmComposicao.quantidade,
      adicionais: pizzaEmComposicao.adicionais,
      observacao: pizzaEmComposicao.observacao,
      itemCardapioTamanhoId: pizzaEmComposicao.itemCardapioTamanhoId,
      partidoAoMeio: false,
      saboresItemCardapioIds: pizzaEmComposicao.saboresItemCardapioIds,
    };
  }, [modalProdutoAberto, produtoModal?.id, pizzaEmComposicao]);

  const modoPizzaSequencialModal = useMemo(
    () =>
      Boolean(
        produtoModal?.tipoItem === 'PIZZA' &&
          produtoModal.permiteMultiplosSabores === true &&
          (produtoModal.saboresOpcoes?.length ?? 0) > 0
      ),
    [produtoModal]
  );

  const confirmarModalProduto = async (payload: {
    produto: TotemMockProduto;
    quantidade: number;
    adicionais: Record<string, number>;
    observacao: string;
    total: number;
    itemCardapioTamanhoId?: string | null;
    partidoAoMeio?: boolean;
    saboresItemCardapioIds?: string[];
    substituirLinhaId?: string;
    iniciarDivisaoSabores?: boolean;
  }) => {
    if (payload.iniciarDivisaoSabores === true) {
      preservarPizzaAoFecharModalRef.current = true;
      setPizzaEmComposicao({
        produtoBase: payload.produto,
        quantidade: payload.quantidade,
        adicionais: { ...payload.adicionais },
        observacao: payload.observacao,
        itemCardapioTamanhoId: payload.itemCardapioTamanhoId ?? null,
        saboresItemCardapioIds: [...(payload.saboresItemCardapioIds ?? [])],
      });
      return;
    }

    const subtotal = calcularSubtotalLinhaFood(
      payload.produto,
      payload.adicionais,
      payload.quantidade,
      payload.itemCardapioTamanhoId,
      payload.saboresItemCardapioIds
    );
    const base: PdvFoodCartLine = {
      id: payload.substituirLinhaId ?? novoIdLinhaPdv(),
      produto: payload.produto,
      quantidade: payload.quantidade,
      adicionais: { ...payload.adicionais },
      observacao: payload.observacao,
      itemCardapioTamanhoId: payload.itemCardapioTamanhoId ?? null,
      partidoAoMeio: payload.partidoAoMeio === true,
      ...(payload.saboresItemCardapioIds && payload.saboresItemCardapioIds.length > 0
        ? { saboresItemCardapioIds: [...payload.saboresItemCardapioIds] }
        : {}),
      subtotal,
    };

    const errCompose = validarLinhasCarrinhoFood([paraCartItemBase(base)]);
    if (errCompose) {
      toast.error(errCompose);
      return;
    }

    if (modoAtendimento === 'MESA' && mesaSelecionada) {
      const mesaRow = mesas.find((m) => m.numero === mesaSelecionada);
      if (mesaRow?.status === 'FECHANDO') {
        toast.error('Esta mesa está aguardando pagamento no caixa.');
        return;
      }
      if (payload.substituirLinhaId) {
        toast.info('Para alterar composição, remova a linha e adicione novamente.');
        fecharModalProduto();
        return;
      }
      setMesaSyncBusy(true);
      try {
        let dtoMesa: ItemAdicionarNaMesaDto;
        try {
          dtoMesa = itemAdicionarNaMesaDtoFromFoodLine(paraCartItemBase(base), base.produto.nome);
        } catch (e: unknown) {
          toast.error(e instanceof Error ? e.message : 'Não foi possível montar o item para a mesa.');
          return;
        }
        console.log('[PDV FOOD][MESA][ADD]', { itens: [dtoMesa] });
        if ((dtoMesa.sabores?.length ?? 0) >= 2) {
          console.log('[PDV FOOD][MESA][ADD MULTI SABOR]', dtoMesa);
        }
        await adicionarItensNaMesa(mesaSelecionada, [dtoMesa]);
        await carregarMesas();
        setPizzaEmComposicao(null);
        fecharModalProduto();
      } catch (err: unknown) {
        const ax = err as AxiosError<{ error?: string }>;
        toast.error(ax.response?.data?.error ?? 'Não foi possível lançar o item na mesa.');
        void carregarMesas();
      } finally {
        setMesaSyncBusy(false);
      }
      return;
    }

    if (payload.substituirLinhaId) {
      setCarrinho((prev) =>
        prev.map((it) => (it.id === payload.substituirLinhaId ? { ...base, id: payload.substituirLinhaId! } : it))
      );
    } else {
      setCarrinho((prev) => {
        const igual = prev.find((it) => mesmaComposicaoFood(it, base));
        if (igual) {
          return prev.map((it) =>
            it.id === igual.id
              ? {
                  ...it,
                  quantidade: it.quantidade + base.quantidade,
                  subtotal: calcularSubtotalLinhaFood(
                    it.produto,
                    it.adicionais,
                    it.quantidade + base.quantidade,
                    it.itemCardapioTamanhoId,
                    it.saboresItemCardapioIds
                  ),
                }
              : it
          );
        }
        return [...prev, base];
      });
    }
    setPizzaEmComposicao(null);
    fecharModalProduto();
  };

  const adicionarAoCarrinho = async (produto: TotemMockProduto) => {
    if (pizzaEmComposicao) {
      const base = pizzaEmComposicao.produtoBase;
      const novoSabor = saborCandidatoParaPizzaMultiBase(base, produto);
      if (!novoSabor) {
        toast.info('Termine ou cancele a montagem da pizza antes de adicionar outro item.');
        return;
      }
      const maxS = Math.min(20, Math.max(1, base.maxSabores ?? 1));
      const sabores = [...pizzaEmComposicao.saboresItemCardapioIds];
      if (sabores.includes(novoSabor)) {
        toast.info('Este sabor já está na pizza.');
        setLinhaEdicao(null);
        setProdutoModal(pizzaEmComposicao.produtoBase);
        setModalProdutoAberto(true);
        return;
      }
      if (sabores.length >= maxS) {
        toast.info(`No máximo ${maxS} sabores.`);
        return;
      }
      const tamanhoBaseId = String(pizzaEmComposicao.itemCardapioTamanhoId ?? '').trim();
      if (tamanhoBaseId && !saborDaPizzaSuportaTamanho(base, novoSabor, tamanhoBaseId)) {
        toast.error('Este sabor não possui o tamanho selecionado para a pizza.');
        setLinhaEdicao(null);
        setProdutoModal(pizzaEmComposicao.produtoBase);
        setModalProdutoAberto(true);
        return;
      }
      const next: PizzaComposicaoPdvState = {
        ...pizzaEmComposicao,
        saboresItemCardapioIds: [...sabores, novoSabor],
      };
      console.log('[PDV FOOD][PIZZA SEQ][PICK SABOR]', {
        baseId: base.id,
        candidatoId: produto.id,
        novoSabor,
        totalSabores: next.saboresItemCardapioIds.length,
      });
      setPizzaEmComposicao(next);
      setLinhaEdicao(null);
      setProdutoModal(next.produtoBase);
      setModalProdutoAberto(true);
      return;
    }

    if (itemFoodExigeModalComposicao(produto)) {
      abrirModalProduto(produto, null);
      return;
    }

    const tAtivos = produto.tamanhos.filter((t) => t.ativo !== false);
    const tamAuto = tAtivos.length === 1 ? tAtivos[0].id : null;
    const linhaRapida: PdvFoodCartLine = {
      id: novoIdLinhaPdv(),
      produto,
      quantidade: 1,
      adicionais: {},
      observacao: '',
      itemCardapioTamanhoId: tamAuto,
      subtotal: calcularSubtotalLinhaFood(produto, {}, 1, tamAuto, undefined),
    };

    if (modoAtendimento === 'MESA' && mesaSelecionada) {
      const mesaRow = mesas.find((m) => m.numero === mesaSelecionada);
      if (mesaRow?.status === 'FECHANDO') {
        toast.error('Esta mesa está aguardando pagamento no caixa.');
        return;
      }
      setMesaSyncBusy(true);
      try {
        const existente = mesaRow?.itens.find((it) => mesmaComposicaoFood(it, linhaRapida) && it.itemMesaId);
        if (existente?.itemMesaId) {
          await atualizarQuantidadeItemNaMesa(
            mesaSelecionada,
            existente.itemMesaId,
            existente.quantidade + 1
          );
        } else {
          let dtoRapido: ItemAdicionarNaMesaDto;
          try {
            dtoRapido = itemAdicionarNaMesaDtoFromFoodLine(paraCartItemBase(linhaRapida), linhaRapida.produto.nome);
          } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : 'Não foi possível montar o item para a mesa.');
            return;
          }
          console.log('[PDV FOOD][MESA][ADD]', { itens: [dtoRapido] });
          await adicionarItensNaMesa(mesaSelecionada, [dtoRapido]);
        }
        await carregarMesas();
      } catch (err: unknown) {
        const ax = err as AxiosError<{ error?: string }>;
        toast.error(ax.response?.data?.error ?? 'Não foi possível lançar o item na mesa.');
        void carregarMesas();
      } finally {
        setMesaSyncBusy(false);
      }
      return;
    }

    setCarrinho((prev) => {
      const igual = prev.find((it) => mesmaComposicaoFood(it, linhaRapida));
      if (igual) {
        return prev.map((it) =>
          it.id === igual.id
            ? {
                ...it,
                quantidade: it.quantidade + 1,
                subtotal: calcularSubtotalLinhaFood(
                  it.produto,
                  it.adicionais,
                  it.quantidade + 1,
                  it.itemCardapioTamanhoId,
                  it.saboresItemCardapioIds
                ),
              }
            : it
        );
      }
      return [...prev, linhaRapida];
    });
  };

  const alterarQuantidadeLinha = async (item: PdvFoodCartLine, delta: number) => {
    if (modoAtendimento !== 'MESA' || !mesaSelecionada) {
      setCarrinho((prev) =>
        prev
          .map((it) => {
            if (it.id === item.id && it.observacao === item.observacao) {
              const novaQtd = Math.max(0, it.quantidade + delta);
              return {
                ...it,
                quantidade: novaQtd,
                subtotal: calcularSubtotalLinhaFood(
                  it.produto,
                  it.adicionais,
                  novaQtd,
                  it.itemCardapioTamanhoId,
                  it.saboresItemCardapioIds
                ),
              };
            }
            return it;
          })
          .filter((it) => it.quantidade > 0)
      );
      return;
    }

    if (!item.itemMesaId) {
      toast.info('Sincronizando mesa…');
      await carregarMesas();
      return;
    }

    const novaQtd = item.quantidade + delta;
    setMesaSyncBusy(true);
    try {
      await atualizarQuantidadeItemNaMesa(mesaSelecionada, item.itemMesaId, Math.max(0, novaQtd));
      await carregarMesas();
    } catch (err: unknown) {
      const ax = err as AxiosError<{ error?: string }>;
      toast.error(ax.response?.data?.error ?? 'Não foi possível atualizar o item.');
    } finally {
      setMesaSyncBusy(false);
    }
  };

  const removerLinha = async (item: PdvFoodCartLine) => {
    if (modoAtendimento !== 'MESA' || !mesaSelecionada) {
      setCarrinho((prev) =>
        prev.filter((it) => !(it.id === item.id && it.observacao === item.observacao))
      );
      return;
    }
    if (!item.itemMesaId) {
      await carregarMesas();
      return;
    }
    setMesaSyncBusy(true);
    try {
      await atualizarQuantidadeItemNaMesa(mesaSelecionada, item.itemMesaId, 0);
      await carregarMesas();
    } catch (err: unknown) {
      const ax = err as AxiosError<{ error?: string }>;
      toast.error(ax.response?.data?.error ?? 'Não foi possível remover o item.');
    } finally {
      setMesaSyncBusy(false);
    }
  };


  // --- LÓGICA DE PAGAMENTO (SPLIT BILL) ---
  const totalCarrinho = useMemo(() => getCarrinhoAtual().reduce((acc, item) => acc + item.subtotal, 0), [getCarrinhoAtual]);
  
  const totalPago = useMemo(() => pagamentosAdicionados.reduce((acc, p) => acc + p.valor, 0), [pagamentosAdicionados]);
  const saldoDevedor = Math.max(0, totalCarrinho - totalPago);
  const troco = Math.max(0, totalPago - totalCarrinho);

  const cobrancaPosteriorAtiva =
    timingCobrancaFood === 'POSTERIOR' &&
    (modoAtendimento === 'BALCAO' || modoAtendimento === 'DELIVERY');
  const podeFinalizarCobranca = cobrancaPosteriorAtiva || saldoDevedor <= 0.01;
  
  const valorPorPessoa = useMemo(() => totalCarrinho / dividirPor, [totalCarrinho, dividirPor]);

  useEffect(() => {
    if (modalPagamento) {
      if (dividirPor > 1 && pagamentosAdicionados.length < dividirPor - 1) {
        setValorDigitado(valorPorPessoa.toFixed(2));
      } else {
        setValorDigitado(saldoDevedor.toFixed(2));
      }
    }
  }, [modalPagamento, saldoDevedor, dividirPor, valorPorPessoa, pagamentosAdicionados.length]);

  const adicionarPagamentoParcial = async () => {
    const valor = Number(valorDigitado.replace(',', '.'));
    if (valor <= 0) return;
    if (valor > saldoDevedor + 0.009) {
      alert(
        `O valor (R$ ${valor.toFixed(2)}) não pode ser maior que o saldo devedor (R$ ${saldoDevedor.toFixed(2)}).`
      );
      return;
    }

    if (formaPagamentoAtual === 'CREDITO_TEF' || formaPagamentoAtual === 'DEBITO_TEF') {
      setTefFoodBusy(true);
      try {
        const { transacaoTefId } = await aguardarAutorizacaoTefHardware({
          valor,
          tipoCartao: formaPagamentoAtual === 'CREDITO_TEF' ? 'CREDITO' : 'DEBITO',
          terminal: 'FOOD-SERVICE',
        });
        setPagamentosAdicionados((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            tipoPagamento: formaPagamentoAtual === 'CREDITO_TEF' ? 'CARTAO_CREDITO' : 'CARTAO_DEBITO',
            valor,
            transacaoTefId,
            canalAdquirente: 'TEF',
          },
        ]);
      } catch (e) {
        alert(e instanceof Error ? e.message : 'Falha na autorização TEF.');
      } finally {
        setTefFoodBusy(false);
      }
      return;
    }

    setPagamentosAdicionados((prev) => [
      ...prev,
      { id: Date.now().toString(), tipoPagamento: formaPagamentoAtual, valor },
    ]);
  };

  const removerPagamentoParcial = (id: string) => {
    const pag = pagamentosAdicionados.find((p) => p.id === id);
    if (pag?.transacaoTefId) {
      void tefCancelarAutorizacaoPendente(pag.transacaoTefId).catch(() => undefined);
    }
    setPagamentosAdicionados((prev) => prev.filter((p) => p.id !== id));
  };

  const abrirModalPagamento = () => {
    setPagamentosAdicionados([]);
    setDividirPor(1);
    setTimingCobrancaFood('AGORA');
    setModalPagamento(true);
  };

  useEffect(() => {
    if (timingCobrancaFood !== 'POSTERIOR') return;
    setPagamentosAdicionados((prev) => {
      for (const p of prev) {
        if (p.transacaoTefId) {
          void tefCancelarAutorizacaoPendente(p.transacaoTefId).catch(() => undefined);
        }
      }
      return [];
    });
  }, [timingCobrancaFood]);

  // --- FINALIZAÇÃO DE VENDA ---
  const finalizarVenda = useCallback(async () => {
    if (getCarrinhoAtual().length === 0) return;
    const pagPosteriorFood =
      timingCobrancaFood === 'POSTERIOR' &&
      (modoAtendimento === 'BALCAO' || modoAtendimento === 'DELIVERY');
    if (!pagPosteriorFood && saldoDevedor > 0.01) return;

    if (modoAtendimento === 'MESA') {
      for (const line of getCarrinhoAtual()) {
        const inc = itemMesaLinhaIncompletaParaVenda(mesaCartLineParaVendaInput(line));
        if (inc) {
          toast.error(inc);
          return;
        }
      }
    } else {
      const linhasVal = getCarrinhoAtual().map(paraCartItemBase);
      const errCarrinho = validarLinhasCarrinhoFood(linhasVal);
      if (errCarrinho) {
        toast.error(errCarrinho);
        return;
      }
    }

    setFinalizando(true);

    try {
      const pagamentosFinais = [...pagamentosAdicionados];
      if (!pagPosteriorFood && troco > 0) {
        const pagDinheiro = pagamentosFinais.find(p => p.tipoPagamento === 'DINHEIRO');
        if (pagDinheiro) pagDinheiro.valor -= troco;
      }

      const tefIdsSnapshot = pagPosteriorFood
        ? []
        : pagamentosFinais
            .map((p) => p.transacaoTefId)
            .filter((id): id is string => typeof id === 'string' && id.trim().length > 0);

      const estacaoId = getEstacaoTrabalhoIdPdv()?.trim();
      const sessaoId = getSessaoCaixaIdPdv()?.trim();
      const caixaFiscalId = getCaixaFiscalIdPdv()?.trim();

      const payload = {
        modo: modoAtendimento,
        modoAtendimento,
        tipoAtendimento: modoAtendimento,
        mesa: mesaSelecionada ?? undefined,
        mesaId: mesaSelecionada ?? undefined,
        mesaNumero: mesaSelecionada ?? undefined,
        clienteDelivery: modoAtendimento === 'DELIVERY' ? clienteDelivery : null,
        itens:
          modoAtendimento === 'MESA'
            ? getCarrinhoAtual().map((ln) => mapItemMesaParaLinhaVendaApi(mesaCartLineParaVendaInput(ln)))
            : getCarrinhoAtual().map((i) => montarLinhaVendaApiFromCartItem(paraCartItemBase(i))),
        valorTotal: totalCarrinho,
        pagamentos: pagPosteriorFood
          ? [{ tipoPagamento: 'CREDIARIO' as const, valor: totalCarrinho }]
          : pagamentosFinais.map((p) => ({
              tipoPagamento: p.tipoPagamento,
              valor: p.valor,
              ...(p.transacaoTefId
                ? { transacaoTefId: p.transacaoTefId, canalAdquirente: 'TEF' as const }
                : p.tipoPagamento === 'CARTAO_CREDITO' || p.tipoPagamento === 'CARTAO_DEBITO'
                  ? { canalAdquirente: 'POS' as const }
                  : {}),
            })),
        ...(pagPosteriorFood ? { pagamentoPosterior: true } : {}),
        ...(estacaoId ? { estacaoTrabalhoId: estacaoId } : {}),
        ...(sessaoId ? { sessaoCaixaId: sessaoId } : {}),
        ...(caixaFiscalId ? { caixaFiscalId } : {}),
      };
      if (modoAtendimento === 'MESA') {
        console.log('[PDV FOOD][MESA][POST VENDAS]', {
          modo: payload.modo,
          modoAtendimento,
          tipoAtendimento: payload.modo,
          mesa: payload.mesa,
          mesaId: payload.mesa,
          mesaNumero: payload.mesa,
          itens: payload.itens,
        });
      }

      if (modoAtendimento === 'MESA') {
        console.log(
          '[PDV FOOD][MESA][VENDA PAYLOAD]',
          payload.itens.map((row) => ({
            itemCardapioId: row.itemCardapioId,
            itemCardapioTamanhoId: row.itemCardapioTamanhoId,
          }))
        );
      }

      const resVenda = await api.post<{
        venda?: { id: string };
        id?: string;
        pacoteImpressaoPos?: PacoteImpressaoPos | null;
        auryaCorrecoesTributarias?: { nomeProduto: string; cstAnterior: string; csosnNovo: string }[];
      }>('/api/vendas', payload, {
        headers: {
          'Idempotency-Key': crypto.randomUUID(),
        },
      });

      if (tefIdsSnapshot.length > 0) {
        try {
          await tefPosVendaSucessoCnc(tefIdsSnapshot, {
            vendaId: resVenda.data.venda?.id ?? '',
            contextoFood:
              modoAtendimento === 'MESA' && mesaSelecionada != null
                ? { modo: 'MESA', mesa: mesaSelecionada }
                : modoAtendimento === 'DELIVERY'
                  ? { modo: 'DELIVERY' }
                  : undefined,
          });
        } catch (tefErr) {
          console.error(tefErr);
          toast.error('Venda gravada, mas a confirmação TEF falhou. Verifique a maquininha e o ERP.');
        }
      }

      const correcoes = resVenda.data.auryaCorrecoesTributarias ?? [];
      for (const c of correcoes) {
        toast.success(
          `Aurya: CST do produto ${c.nomeProduto} corrigido automaticamente para Simples Nacional`,
          { autoClose: 4500 }
        );
      }

      const pacoteImpressaoPos = resVenda.data?.pacoteImpressaoPos;
      const vendaIdLog = resVenda.data?.venda?.id ?? resVenda.data?.id ?? null;
      console.log('[PDV FOOD][PRINT]', {
        vendaId: vendaIdLog,
        temPacote: Boolean(pacoteImpressaoPos),
      });
      const autoPrint = isAutoPrintFoodEnabled();
      if (autoPrint) {
        if (!pacoteImpressaoPos) {
          console.warn('[PDV FOOD][PRINT] pacoteImpressaoPos não retornado');
        } else {
          try {
            const enviado = await enviarPacoteImpressaoPosAoAgent(pacoteImpressaoPos);
            if (!enviado) {
              toast.error('Erro na impressão, mas venda concluída.');
            }
          } catch (err) {
            console.error('[PDV FOOD][PRINT ERROR]', err);
            toast.error('Erro na impressão, mas venda concluída.');
          }
        }
      }

      alert(
        modoAtendimento === 'MESA'
          ? '✅ Venda finalizada com sucesso! Mesa liberada.'
          : pagPosteriorFood
            ? '✅ Pedido registrado. Pagamento pendente na retirada/entrega; cozinha notificada.'
            : '✅ Venda finalizada com sucesso!'
      );
      
      if (modoAtendimento === 'MESA' && mesaSelecionada) {
        setMesas(prev => prev.map(m => m.numero === mesaSelecionada ? { ...m, status: 'LIVRE', itens: [] } : m));
        setMesaSelecionada(null);
        carregarMesas();
      } else {
        setCarrinho([]);
        setClienteDelivery({ nome: '', telefone: '', endereco: '' });
      }
      setModalPagamento(false);

    } catch (err) {
      const error = err as AxiosError<{error?: string}>;
      const mensagemErro = error.response?.data?.error || 'Erro desconhecido ao finalizar venda.';

      const tefIdsRollback = pagamentosAdicionados
        .map((p) => p.transacaoTefId)
        .filter((id): id is string => typeof id === 'string' && id.trim().length > 0);
      if (tefIdsRollback.length > 0) {
        void tefFalhaSalvarVendaCnc(tefIdsRollback).catch(() => undefined);
      }

      if (mensagemErro.includes('Rejeição Sefaz Evitada')) {
        setAlertaAurya(mensagemErro);
      } else {
        alert(`❌ Erro ao finalizar: ${mensagemErro}`);
      }
    } finally {
      setFinalizando(false);
    }
  }, [
    getCarrinhoAtual,
    saldoDevedor,
    troco,
    pagamentosAdicionados,
    timingCobrancaFood,
    modoAtendimento,
    mesaSelecionada,
    clienteDelivery,
    totalCarrinho,
    carregarMesas,
  ]);

  // ============================================================================
  // 🚀 MÁGICA DA AURYA: AUTO-RETENTATIVA APÓS CORREÇÃO EM OUTRA ABA
  // ============================================================================
  
  const finalizarVendaRef = useRef(finalizarVenda);
  useEffect(() => {
    finalizarVendaRef.current = finalizarVenda;
  }, [finalizarVenda]);

  useEffect(() => {
    const handleFocus = () => {
      if (aguardandoFoco && alertaAurya) {
        setAguardandoFoco(false);
        setAlertaAurya(null);
        
        setTimeout(() => {
          finalizarVendaRef.current();
        }, 800);
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [aguardandoFoco, alertaAurya]);

  const matchProduto = alertaAurya?.match(/O produto "(.*?)" possui/);
  const nomeProdutoErro = matchProduto ? matchProduto[1] : null;
  const produtoComErro = getCarrinhoAtual().find((item) => item.produto.nome === nomeProdutoErro);
  const idProdutoErro = produtoComErro?.produto.produtoId ?? produtoComErro?.produto.id;

  const abrirEdicaoProduto = () => {
    setAguardandoFoco(true);
    if (idProdutoErro) {
      window.open(`/produtos?edit=${idProdutoErro}`, '_blank');
    } else {
      window.open('/produtos', '_blank');
    }
  };

  const abrirEdicaoLoja = () => {
    setAguardandoFoco(true);
    window.open('/configuracoes', '_blank');
  };

  // ============================================================================
  // 🚀 LÓGICA DE BUSCA INTELIGENTE E ENTER
  // ============================================================================

  const produtosFiltrados = produtosTotem.filter((p) => {
    const matchCategoria = categoriaAtiva === 'Todas' || p.categoriaId === categoriaAtiva;
    const q = busca.toLowerCase();
    const matchBusca =
      p.nome.toLowerCase().includes(q) ||
      (p.codigoBarras?.includes(busca) ?? false) ||
      (p.codigo?.toLowerCase().includes(q) ?? false);
    return matchCategoria && matchBusca;
  });

  // 🚀 Bipagem rápida / Digitar código e dar Enter
  const handleKeyDownBusca = async (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && busca.trim().length > 0) {
      e.preventDefault();
      
      if (produtosFiltrados.length === 1) {
        await adicionarAoCarrinho(produtosFiltrados[0]);
        setBusca('');
        return;
      }

      // Procura match exato na lista carregada
      const matchExato = produtosTotem.find(
        (p) => p.codigo === busca || p.codigoBarras === busca
      );

      if (matchExato) {
        await adicionarAoCarrinho(matchExato);
        setBusca('');
      } else {
        // Se não achou, tenta bater na API (Fallback de segurança)
        try {
          const response = await api.get<ProdutoCadastroResumo[]>(
            `/api/cadastros/produtos?busca=${encodeURIComponent(busca)}`
          );
          const matchExatoApi = response.data.find(
            (p) => p.codigo === busca || p.codigoBarras === busca
          );

          if (matchExatoApi) {
            await adicionarAoCarrinho(totemStubCadastro(matchExatoApi));
            setBusca('');
          } else if (response.data.length === 1) {
            await adicionarAoCarrinho(totemStubCadastro(response.data[0]));
            setBusca('');
          } else {
            alert(`Nenhum produto encontrado com o código "${busca}".`);
            setBusca('');
          }
        } catch (err) {
          console.error("Erro na busca forçada:", err);
        }
      }
    }
  };

  const nomesFormasPagamento: Record<string, string> = {
    DINHEIRO: 'Dinheiro',
    PIX: 'PIX',
    CARTAO_CREDITO: 'Crédito (POS)',
    CARTAO_DEBITO: 'Débito (POS)',
    CREDITO_TEF: 'CREDITO TEF',
    DEBITO_TEF: 'DEBITO TEF',
  };

  const rotuloPagamento = (pag: IPagamentoParcial) => {
    if (pag.transacaoTefId) {
      if (pag.tipoPagamento === 'CARTAO_CREDITO') return 'CREDITO TEF';
      if (pag.tipoPagamento === 'CARTAO_DEBITO') return 'DEBITO TEF';
    }
    return nomesFormasPagamento[pag.tipoPagamento] || pag.tipoPagamento;
  };

  return (
    <Layout>
      <div className="flex h-[calc(100vh-80px)] flex-col gap-2">
        {perfilTerminalPdv?.tipo === 'PDV' ? (
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/10 bg-[#08101f]/80 px-3 py-2 text-[11px] text-slate-400 backdrop-blur-xl">
            <div className="flex items-center gap-2">
              <span
                className="rounded-md border border-white/15 bg-[#0b1324] px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-slate-300"
                title="Modo de documento deste PDV (F9)"
              >
                {perfilTerminalPdv.modoPdv === 'CONSUMIDOR' ? 'Consumidor' : 'NFc'}
              </span>
              <span className="hidden sm:inline text-slate-500">Documento da venda</span>
            </div>
            <span className="hidden items-center gap-1.5 md:inline-flex">
              <Keyboard className="w-3.5 h-3.5 shrink-0" aria-hidden />
              <span>
                <strong className="text-slate-400">F9</strong> NFc / Consumidor
              </span>
            </span>
          </div>
        ) : null}

        <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row">
        {/* LADO ESQUERDO: CATÁLOGO / MESAS */}
        <div className="flex-1 flex flex-col gap-4 bg-[#08101f]/90 backdrop-blur-xl rounded-[30px] border border-white/10 p-4 shadow-[0_25px_60px_rgba(0,0,0,0.35)] overflow-hidden">
          
          {/* SELETOR DE MODO DE ATENDIMENTO */}
          <div className="flex p-1 bg-[#0b1324] rounded-xl border border-white/10 shrink-0">
            <button 
              onClick={() => { setModoAtendimento('BALCAO'); setMesaSelecionada(null); }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold transition-all ${modoAtendimento === 'BALCAO' ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-[0_0_15px_rgba(139,92,246,0.30)]' : 'text-slate-400 hover:bg-white/5'}`}
            >
              <Monitor className="w-4 h-4" /> Balcão Rápido
            </button>
            <button 
              onClick={() => { setModoAtendimento('MESA'); carregarMesas(); }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold transition-all ${modoAtendimento === 'MESA' ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-[0_0_15px_rgba(139,92,246,0.30)]' : 'text-slate-400 hover:bg-white/5'}`}
            >
              <UtensilsCrossed className="w-4 h-4" /> Controle de Mesas
            </button>
            <button 
              onClick={() => { setModoAtendimento('DELIVERY'); setMesaSelecionada(null); }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold transition-all ${modoAtendimento === 'DELIVERY' ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-[0_0_15px_rgba(139,92,246,0.30)]' : 'text-slate-400 hover:bg-white/5'}`}
            >
              <Bike className="w-4 h-4" /> Delivery
            </button>
          </div>

          {/* ÁREA DINÂMICA: PRODUTOS OU MAPA DE MESAS */}
          {modoAtendimento === 'MESA' && !mesaSelecionada ? (
            // MAPA DE MESAS
            <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-black flex items-center gap-2">
                  <UtensilsCrossed className="w-5 h-5 text-violet-300"/> Mapa do Salão
                </h3>
                <button 
                  onClick={() => void carregarMesas()}
                  className="flex items-center gap-2 text-xs font-bold text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg border border-white/10 transition-all"
                >
                  <RefreshCw className={`w-3 h-3 ${recarregandoMesas ? 'animate-spin text-fuchsia-400' : ''}`} />
                  Atualizar Pedidos
                </button>
              </div>

              <div className="grid grid-cols-4 md:grid-cols-5 gap-4">
                {mesas.map(mesa => {
                  const statusClass = {
                    LIVRE: 'bg-emerald-500/10 border-emerald-500/30 text-slate-300 hover:border-emerald-400/60 hover:shadow-[0_0_20px_rgba(46,204,113,0.25)]',
                    OCUPADA: 'bg-rose-500/15 border-rose-500/40 text-white shadow-[0_0_15px_rgba(231,76,60,0.25)]',
                    FECHANDO: 'bg-amber-500/20 border-amber-500/40 text-amber-200 shadow-[0_0_15px_rgba(241,196,15,0.25)]',
                  }[mesa.status] || 'bg-slate-700/30 border-white/10 text-slate-400';
                  
                  const label = mesa.status === 'LIVRE' ? 'Livre' : mesa.status === 'OCUPADA' ? `R$ ${mesa.itens.reduce((a, b) => a + b.subtotal, 0).toFixed(2)}` : 'Conta';
                  
                  return (
                    <button
                      key={mesa.numero}
                      onClick={() => {
                        setMesaSelecionada(mesa.numero);
                        void carregarMesas();
                      }}
                      className={`aspect-square rounded-2xl flex flex-col items-center justify-center gap-2 border-2 transition-all hover:scale-105 active:scale-95 cursor-pointer ${statusClass}`}
                    >
                      <span className="text-2xl font-black">{mesa.numero}</span>
                      <span className="text-[10px] font-bold uppercase tracking-widest">{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            // CATÁLOGO DE PRODUTOS
            <div className="flex-1 flex flex-col overflow-hidden">
              {pizzaEmComposicao ? (
                <div className="mb-3 flex shrink-0 flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-500/35 bg-amber-500/10 px-3 py-2">
                  <p className="text-xs font-medium text-amber-100/95">
                    Montando pizza com vários sabores: toque em outro sabor no cardápio ou cancele a montagem.
                  </p>
                  <button
                    type="button"
                    onClick={() => setPizzaEmComposicao(null)}
                    className="shrink-0 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-white/10"
                  >
                    Cancelar
                  </button>
                </div>
              ) : null}
              {modoAtendimento === 'MESA' && mesaSelecionada && (
                <div className="flex items-center justify-between bg-violet-500/10 border border-violet-500/20 p-3 rounded-xl mb-4 shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-violet-500/15 rounded-lg flex items-center justify-center text-violet-300 font-black border border-violet-500/20">
                      {mesaSelecionada}
                    </div>
                    <div>
                      <p className="text-white font-bold text-sm">Mesa {mesaSelecionada}</p>
                      <p className="text-violet-300 text-xs">Aguardando Pagamento / Novos Itens</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setMesaSelecionada(null);
                      void carregarMesas();
                    }}
                    className="text-sm font-bold text-slate-300 hover:text-white px-3 py-1 bg-white/5 border border-white/10 rounded-lg"
                  >
                    Voltar ao Mapa
                  </button>
                </div>
              )}

              <div className="flex flex-col gap-3 mb-4 shrink-0">
                <div className="relative">
                  <Search className="w-5 h-5 text-violet-300 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input 
                    type="text" 
                    placeholder="Buscar produto por nome, código curto ou cód. barras..." // 🚀 ATUALIZADO
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    onKeyDown={handleKeyDownBusca} // 🚀 ADICIONADO: Motor de busca rápida
                    className="w-full bg-[#0b1324] border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-violet-500/40 focus:ring-2 focus:ring-violet-500/20"
                  />
                </div>
                
                <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-2">
                  {categoriasUi.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategoriaAtiva(cat.id)}
                      className={`whitespace-nowrap px-4 py-2 rounded-xl text-sm font-bold border transition-all ${
                        categoriaAtiva === cat.id
                          ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 border-violet-500/30 text-white shadow-[0_0_15px_rgba(139,92,246,0.30)]'
                          : 'bg-[#0b1324] border-white/10 text-slate-400 hover:bg-white/5'
                      }`}
                    >
                      {cat.nome}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {produtosFiltrados.map((produto) => {
                    const thumbUrl = getImagemItemFood({
                      produto,
                      catalogo: produtosTotem,
                      saborIdsPrioridade: [resolverSaborIdParaPizza(produto)],
                    });
                    const usaFallbackThumb = !thumbUrl || thumbUrl === IMAGEM_FALLBACK_FOOD;
                    return (
                    <button
                      type="button"
                      key={produto.id}
                      disabled={mesaSyncBusy || Boolean(mesaEdicaoBloqueada)}
                      onClick={() => void adicionarAoCarrinho(produto)}
                      className="bg-[#0b1324]/70 border border-white/10 rounded-2xl p-3 flex flex-col items-center text-center hover:bg-white/5 hover:border-violet-500/20 transition-all group disabled:opacity-45 disabled:pointer-events-none"
                    >
                      <div className="w-12 h-12 bg-[#08101f] rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-inner border border-white/10 overflow-hidden">
                        {usaFallbackThumb ? (
                          produto.tipoItem === 'BEBIDA' ? (
                            <Coffee className="w-6 h-6 text-violet-300" />
                          ) : (
                            <Pizza className="w-6 h-6 text-amber-300" />
                          )
                        ) : (
                          <img src={thumbUrl} alt="" className="h-full w-full object-cover" />
                        )}
                      </div>
                      <span className="text-white text-sm font-bold line-clamp-2 leading-tight mb-1">
                        {produto.codigo ? <span className="text-violet-400 font-mono mr-1">[{produto.codigo}]</span> : ''}
                        {produto.nome}
                      </span>
                      <span className="text-emerald-300 text-sm font-black mt-auto">R$ {Number(produto.precoBase).toFixed(2)}</span>
                    </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* LADO DIREITO: CARRINHO E PAGAMENTO */}
        <div className="w-full lg:w-[400px] flex flex-col bg-[#08101f]/90 backdrop-blur-xl rounded-[30px] border border-white/10 shadow-[0_25px_60px_rgba(0,0,0,0.35)] overflow-hidden shrink-0">
          
          <div className="bg-[#0b1324] p-5 border-b border-white/10 flex items-center justify-between gap-2 flex-wrap">
            <div className="flex flex-col gap-1">
              <div className="inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-violet-300 w-fit">
                Food Service Intelligence
              </div>
            </div>
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-violet-300" /> Pedido Atual
            </h2>
            <span className="bg-violet-500/10 text-violet-300 text-xs font-bold px-3 py-1 rounded-full border border-violet-500/20">
              {getCarrinhoAtual().length} itens
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {getCarrinhoAtual().length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-3">
                <ShoppingCart className="w-12 h-12 opacity-20" />
                <p className="text-sm font-medium">Nenhum item no pedido</p>
              </div>
            ) : (
              getCarrinhoAtual().map((item) => {
                const rot = rotuloLinhaFoodPdv(item);
                return (
                <div key={item.itemMesaId ?? `${item.id}-${item.observacao || ''}`} className="bg-[#0b1324]/70 border border-white/10 rounded-xl p-3 flex flex-col gap-2">
                  <div className="flex justify-between items-start">
                    <span className="text-white font-bold text-sm leading-tight pr-4">
                      {item.produto.codigo ? (
                        <span className="text-violet-400 font-mono mr-1">[{item.produto.codigo}]</span>
                      ) : (
                        ''
                      )}
                      {rot.titulo}
                    </span>
                    <button
                      type="button"
                      disabled={mesaSyncBusy || Boolean(mesaEdicaoBloqueada)}
                      onClick={() => void removerLinha(item)}
                      className="text-slate-500 hover:text-red-300 transition-colors disabled:opacity-40"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  {rot.subtitulo ? (
                    <p className="text-xs text-slate-400 font-medium leading-snug">{rot.subtitulo}</p>
                  ) : null}
                  {item.observacao ? (
                    <p className="text-xs text-violet-300 italic">OBS: {item.observacao}</p>
                  ) : null}
                  <div className="flex justify-between items-center mt-1">
                    <div className="flex items-center bg-[#08101f] rounded-lg border border-white/10 overflow-hidden">
                      <button type="button" disabled={mesaSyncBusy || Boolean(mesaEdicaoBloqueada)} onClick={() => void alterarQuantidadeLinha(item, -1)} className="p-1.5 text-slate-400 hover:text-white hover:bg-white/5 disabled:opacity-40"><Minus className="w-3 h-3" /></button>
                      <span className="w-8 text-center text-sm font-bold text-white">{item.quantidade}</span>
                      <button type="button" disabled={mesaSyncBusy || Boolean(mesaEdicaoBloqueada)} onClick={() => void alterarQuantidadeLinha(item, 1)} className="p-1.5 text-slate-400 hover:text-white hover:bg-white/5 disabled:opacity-40"><Plus className="w-3 h-3" /></button>
                    </div>
                    <span className="text-emerald-300 font-black text-sm">R$ {item.subtotal.toFixed(2)}</span>
                  </div>
                </div>
              );
              })
            )}
          </div>

          <div className="bg-[#0b1324] p-5 border-t border-white/10 shrink-0">
            <div className="flex justify-between items-end mb-4">
              <span className="text-slate-400 text-sm font-bold uppercase tracking-widest">Total a Pagar</span>
              <span className="text-3xl font-black text-emerald-400">R$ {totalCarrinho.toFixed(2)}</span>
            </div>
            
            <button 
              onClick={abrirModalPagamento}
              disabled={getCarrinhoAtual().length === 0}
              className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-500 text-white rounded-xl font-black text-lg shadow-[0_0_20px_rgba(16,185,129,0.30)] transition-all disabled:opacity-50 disabled:transform-none transform hover:-translate-y-1"
            >
              COBRAR PEDIDO
            </button>
          </div>
        </div>

        </div>
      </div>

      {/* MODAL DE PAGAMENTO (SPLIT BILL) — portal + viewport fixo para não herdar layout do painel */}
      {modalPagamento &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="pdv-food-modal-cobranca-titulo"
            className="fixed inset-0 z-[200] flex items-center justify-center p-2 sm:p-4 bg-[#020617]/88 backdrop-blur-md"
            onClick={() => fecharModalSeSemPagamentosParciais()}
          >
            {tefFoodBusy && (
              <div
                className="fixed inset-0 z-[210] flex flex-col items-center justify-center gap-3 bg-[#020617]/90 px-6 text-center"
                role="status"
                aria-live="polite"
              >
                <CreditCard className="h-10 w-10 text-violet-400 animate-pulse" aria-hidden />
                <p className="text-sm font-bold text-white">CREDITO TEF / DEBITO TEF — aguarde o PinPad (CNC).</p>
              </div>
            )}
            <div
              className="relative w-full max-w-2xl max-h-[calc(100vh-1rem)] overflow-y-auto rounded-[28px] border border-violet-500/15 bg-[#08101f] shadow-[0_0_60px_rgba(139,92,246,0.14),0_25px_80px_rgba(0,0,0,0.55)] flex flex-col md:flex-row md:max-h-[min(92vh,880px)]"
              onClick={(e) => e.stopPropagation()}
            >
            
            {/* Lado Esquerdo do Modal: Calculadora e Formas de Pagamento */}
            <div className="flex-1 p-6 border-b md:border-b-0 md:border-r border-white/10">
              <h2 id="pdv-food-modal-cobranca-titulo" className="text-xl font-black text-white mb-6 flex items-center gap-2">
                <Calculator className="w-5 h-5 text-violet-300" /> Detalhes do Pagamento
              </h2>

              {modoAtendimento !== 'MESA' && (modoAtendimento === 'BALCAO' || modoAtendimento === 'DELIVERY') ? (
                <div className="mb-6 space-y-2">
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Cobrança</span>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setTimingCobrancaFood('AGORA')}
                      className={`rounded-xl border px-4 py-2.5 text-xs font-bold uppercase transition-colors ${
                        timingCobrancaFood === 'AGORA'
                          ? 'border-violet-500/40 bg-violet-500/15 text-violet-200'
                          : 'border-white/10 bg-[#0b1324]/70 text-slate-400 hover:border-white/20'
                      }`}
                    >
                      Pagar agora
                    </button>
                    <button
                      type="button"
                      onClick={() => setTimingCobrancaFood('POSTERIOR')}
                      className={`rounded-xl border px-4 py-2.5 text-xs font-bold uppercase transition-colors ${
                        timingCobrancaFood === 'POSTERIOR'
                          ? 'border-amber-500/40 bg-amber-500/15 text-amber-100'
                          : 'border-white/10 bg-[#0b1324]/70 text-slate-400 hover:border-white/20'
                      }`}
                    >
                      {modoAtendimento === 'BALCAO' ? 'Pagar na retirada' : 'Pagar na entrega'}
                    </button>
                  </div>
                </div>
              ) : null}

              {cobrancaPosteriorAtiva ? (
                <div className="mb-6 rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4 text-sm leading-relaxed text-amber-50/95">
                  O valor fica <strong>pendente</strong> no financeiro. O pedido segue para a cozinha; o cliente paga na{' '}
                  {modoAtendimento === 'BALCAO' ? 'retirada' : 'entrega'}.
                </div>
              ) : null}

              {/* Calculadora de Divisão de Conta */}
              {!cobrancaPosteriorAtiva ? (
              <>
              <div className="mb-6 bg-[#0b1324]/70 rounded-2xl p-4 border border-white/10">
                <div className="flex justify-between items-center mb-3">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Users className="w-4 h-4" /> Dividir Conta (Pessoas)
                  </label>
                  <div className="flex items-center bg-slate-900 rounded-lg border border-slate-700 overflow-hidden">
                    <button onClick={() => setDividirPor(Math.max(1, dividirPor - 1))} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5"><Minus className="w-3 h-3" /></button>
                    <span className="w-10 text-center text-sm font-bold text-white">{dividirPor}</span>
                    <button onClick={() => setDividirPor(dividirPor + 1)} className="w-8 h-8 flex items-center justify-center text-indigo-400 hover:text-white hover:bg-white/5"><Plus className="w-3 h-3" /></button>
                  </div>
                </div>
                {dividirPor > 1 && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-400">Total por pessoa:</span>
                    <span className="text-indigo-400 font-bold">R$ {valorPorPessoa.toFixed(2)}</span>
                  </div>
                )}
              </div>

              {/* Seleção de Forma de Pagamento */}
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Forma de Pagamento</label>
              <div className="grid grid-cols-2 gap-3 mb-6">
                {[
                  { id: 'PIX', label: 'PIX', icon: QrCode },
                  { id: 'CREDITO_TEF', label: 'CREDITO TEF', icon: CreditCard },
                  { id: 'DEBITO_TEF', label: 'DEBITO TEF', icon: CreditCard },
                  { id: 'CARTAO_CREDITO', label: 'Crédito (POS)', icon: CreditCard },
                  { id: 'CARTAO_DEBITO', label: 'Débito (POS)', icon: CreditCard },
                  { id: 'DINHEIRO', label: 'Dinheiro', icon: Banknote },
                ].map(forma => {
                  const Icon = forma.icon;
                  return (
                    <button
                      key={forma.id}
                      onClick={() => {
                        setFormaPagamentoAtual(forma.id);
                        setValorDigitado(saldoDevedor.toFixed(2));
                      }}
                      className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                        formaPagamentoAtual === forma.id 
                          ? 'bg-violet-500/15 border-violet-500/30 text-violet-300 shadow-[0_0_15px_rgba(139,92,246,0.20)]' 
                          : 'bg-[#0b1324]/70 border-white/10 text-slate-400 hover:border-white/20'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-[10px] font-bold uppercase">{forma.label}</span>
                    </button>
                  )
                })}
              </div>

              {/* Input de Valor para Adicionar */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">R$</span>
                  <input 
                    type="number" 
                    value={valorDigitado}
                    onChange={e => setValorDigitado(e.target.value)}
                    className="w-full bg-[#0b1324] border border-white/10 rounded-xl p-4 pl-12 text-white font-bold text-lg focus:border-violet-500/40 focus:ring-2 focus:ring-violet-500/20 outline-none"
                  />
                </div>
                <button 
                  onClick={() => void adicionarPagamentoParcial()}
                  disabled={tefFoodBusy || Number(valorDigitado) <= 0 || saldoDevedor <= 0}
                  className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white rounded-xl px-6 font-bold disabled:opacity-50 transition-colors"
                >
                  {tefFoodBusy ? 'PinPad…' : 'Adicionar'}
                </button>
              </div>
              </>
              ) : null}
            </div>

            {/* Lado Direito do Modal: Resumo Financeiro */}
            <div className="flex-1 bg-[#0b1324]/80 p-6 flex flex-col">
              <div className="flex justify-between items-end mb-6 pb-4 border-b border-white/10">
                <span className="text-slate-400 text-sm font-bold uppercase tracking-widest">Total do Pedido</span>
                <span className="text-2xl font-black text-white">R$ {totalCarrinho.toFixed(2)}</span>
              </div>

              {/* Lista de Pagamentos Adicionados */}
              <div className="flex-1 overflow-y-auto mb-6 pr-2 custom-scrollbar">
                {pagamentosAdicionados.length === 0 ? (
                  <div className="flex h-full items-center justify-center px-4 text-center text-sm text-slate-600">
                    {cobrancaPosteriorAtiva
                      ? 'Pagamento na retirada/entrega: nada a lançar agora; finalize para gerar o pendente e enviar à cozinha.'
                      : 'Nenhum pagamento lançado.'}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {pagamentosAdicionados.map(pag => (
                      <div key={pag.id} className="flex justify-between items-center bg-[#08101f] border border-white/10 rounded-lg p-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-300 uppercase bg-white/5 border border-white/10 px-2 py-1 rounded">
                            {rotuloPagamento(pag)}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-emerald-300 font-bold text-sm">R$ {pag.valor.toFixed(2)}</span>
                          <button onClick={() => removerPagamentoParcial(pag.id)} className="text-slate-500 hover:text-red-400">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Status Final: Saldo ou Troco */}
              <div
                className={`mb-6 rounded-xl border p-4 ${
                  cobrancaPosteriorAtiva
                    ? 'border-amber-500/25 bg-amber-500/10'
                    : saldoDevedor > 0
                      ? 'border-amber-500/20 bg-amber-500/10'
                      : 'border-emerald-500/20 bg-emerald-500/10'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-sm font-bold uppercase tracking-widest ${
                      cobrancaPosteriorAtiva || saldoDevedor > 0 ? 'text-amber-300' : 'text-emerald-300'
                    }`}
                  >
                    {cobrancaPosteriorAtiva
                      ? 'Pagamento posterior'
                      : saldoDevedor > 0
                        ? 'Falta Pagar'
                        : troco > 0
                          ? 'Troco a Devolver'
                          : 'Conta Paga'}
                  </span>
                  <span
                    className={`text-2xl font-black ${
                      cobrancaPosteriorAtiva || saldoDevedor > 0 ? 'text-amber-300' : 'text-emerald-300'
                    }`}
                  >
                    R${' '}
                    {(cobrancaPosteriorAtiva ? totalCarrinho : saldoDevedor > 0 ? saldoDevedor : troco).toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="flex gap-3 mt-auto">
                <button 
                  type="button"
                  onClick={cancelarModalPagamento}
                  className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold border border-white/10 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="button"
                  onClick={finalizarVenda}
                  disabled={finalizando || !podeFinalizarCobranca}
                  className="flex-[2] py-4 bg-gradient-to-r from-emerald-600 to-teal-500 text-white rounded-xl font-black shadow-[0_0_20px_rgba(16,185,129,0.30)] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {finalizando ? <span className="animate-spin border-2 border-white border-t-transparent rounded-full w-5 h-5"></span> : <Check className="w-5 h-5" />}
                  {finalizando ? 'Processando...' : 'FINALIZAR'}
                </button>
              </div>
            </div>
          </div>
        </div>,
          document.body
        )}

      {/* 🚀 MODAL DO ESCUDO FISCAL DA AURYA */}
      {alertaAurya && (
        <div className="fixed inset-0 z-[220] flex items-center justify-center p-4 bg-[#020617]/90 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#08101f] border border-violet-500/30 rounded-[30px] w-full max-w-lg overflow-hidden shadow-[0_25px_80px_rgba(0,0,0,0.60)] animate-in zoom-in-95">
            
            {/* Header Aurya */}
            <div className="bg-gradient-to-r from-violet-900/30 to-[#0b1324] p-5 border-b border-violet-500/20 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-violet-500/15 border border-violet-500/30 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(139,92,246,0.25)]">
                <Bot className="w-6 h-6 text-violet-300" />
              </div>
              <div>
                <h2 className="text-xl font-black text-white flex items-center gap-2">
                  Aurya <span className="bg-violet-500 text-white text-[10px] px-2 py-0.5 rounded-full uppercase tracking-[0.18em]">Escudo Fiscal</span>
                </h2>
                <p className="text-violet-300 text-xs">Ação bloqueada para evitar multas.</p>
              </div>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                <ShieldAlert className="w-6 h-6 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-red-400 font-bold text-sm uppercase tracking-widest mb-1">Risco Detectado</h3>
                  <p className="text-slate-300 text-sm leading-relaxed">
                    {alertaAurya.replace('Rejeição Sefaz Evitada: ', '')}
                  </p>
                </div>
              </div>

              <div className="bg-[#0b1324] rounded-xl p-4 border border-white/10">
                <h4 className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-2">Como resolver:</h4>
                <ul className="text-sm text-slate-300 space-y-2 list-disc list-inside pl-2">
                  <li>Se sua loja <strong>É</strong> do Simples Nacional: Vá nas configurações da loja e ajuste o Regime Tributário.</li>
                  <li>Se sua loja <strong>NÃO É</strong> do Simples Nacional: Clique em "Editar Produto" abaixo e altere o CSOSN para o CST correto (ex: 00, 40).</li>
                </ul>
              </div>
            </div>

            {/* Footer com Ações Diretas */}
            <div className="p-5 border-t border-slate-800 bg-slate-950 flex flex-col sm:flex-row gap-3 justify-end">
              
              {/* Botão Dinâmico: Edita exatamente o produto que deu erro */}
              <button 
                onClick={abrirEdicaoProduto}
                className="px-4 py-2.5 bg-violet-500/10 hover:bg-violet-500/20 text-violet-300 border border-violet-500/30 rounded-xl font-bold transition-colors flex items-center gap-2"
              >
                <Tag className="w-4 h-4" /> Editar {nomeProdutoErro ? `"${nomeProdutoErro}"` : 'Produtos'}
              </button>

              <button 
                onClick={abrirEdicaoLoja}
                className="px-4 py-2.5 bg-violet-500/10 hover:bg-violet-500/20 text-violet-300 border border-violet-500/30 rounded-xl font-bold transition-colors flex items-center gap-2"
              >
                <Monitor className="w-4 h-4" /> Configuração da Loja
              </button>

              <button 
                onClick={() => { setAlertaAurya(null); setAguardandoFoco(false); }}
                className="px-6 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl font-bold transition-colors flex items-center gap-2 sm:ml-4"
              >
                <XCircle className="w-5 h-5" /> Fechar Aviso
              </button>
            </div>

          </div>
        </div>
      )}

      <ProductModal
        produto={produtoModal}
        aberto={modalProdutoAberto}
        onFechar={fecharModalProduto}
        presentation="sheet"
        modoPizzaSequencial={modoPizzaSequencialModal}
        catalogoImagens={produtosTotem}
        sheetMaxWidthClass="max-w-xl sm:max-w-2xl"
        rascunhoComposicao={rascunhoModalPdv}
        linhaCarrinhoParaEdicao={
          linhaEdicao &&
          produtoModal &&
          linhaEdicao.produto.id === produtoModal.id &&
          modoAtendimento !== 'MESA'
            ? linhaEdicao
            : null
        }
        onAdicionarAoPedido={(payload) => {
          void confirmarModalProduto({
            produto: payload.produto,
            quantidade: payload.quantidade,
            adicionais: payload.adicionais,
            observacao: payload.observacao,
            total: payload.total,
            itemCardapioTamanhoId: payload.itemCardapioTamanhoId,
            partidoAoMeio: payload.partidoAoMeio,
            saboresItemCardapioIds: payload.saboresItemCardapioIds,
            substituirLinhaId: payload.substituirLinhaId,
            iniciarDivisaoSabores: payload.iniciarDivisaoSabores,
          });
        }}
      />

    </Layout>
  );
}