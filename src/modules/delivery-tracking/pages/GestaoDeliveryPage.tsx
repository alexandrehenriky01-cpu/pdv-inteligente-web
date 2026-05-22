import { useCallback, useEffect, useState, useRef, useMemo } from 'react';
import { io, type Socket } from 'socket.io-client';
import { QRCodeSVG } from 'qrcode.react';
import {
  MapPin,
  Phone,
  Truck,
  Rocket,
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw,
  Radio,
  Zap,
  Printer,
  Wifi,
  WifiOff,
  Circle,
  QrCode,
  Share2,
  Layers,
  X,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { Layout } from '../../../components/Layout';
import { api, resolveApiBaseUrl } from '../../../services/api';
import { buildKdsSocketAuth } from '../../../services/socket/kdsSocketAuth';
import { abrirRotaDelivery } from '../../delivery-tracking/utils/googleMapsUtils';
import { useDeliveryPrint } from '../../delivery-tracking/hooks/useDeliveryPrint';
import { useRouteManifestPrint } from '../../delivery-tracking/hooks/useRouteManifestPrint';
import { dispararImpressaoDireta, type CupomPedidoData, criarRomaneio } from '../../delivery-tracking/services/cupomTemplateService';
import { DeliveryRow } from '../components/DeliveryRow';

const SOCKET_URL = resolveApiBaseUrl();

let globalSocketInstance: Socket | null = null;

interface PedidoDelivery {
  id: string;
  numeroPedido: number | null;
  numeroVenda: number;
  nomeCliente: string | null;
  telefoneCliente?: string | null;
  enderecoEntrega: string | null;
  valorTotal: number;
  statusPreparo: string;
  statusEntrega: string;
  /** Status operacional da venda (ex.: CANCELADO após KDS). */
  status?: string;
  createdAt: string;
  observacoes?: string | null;
  pagamentos?: { tipoPagamento: string; valor: number }[];
  origemVenda?: string;
  tipoPedido?: string | null;
  updatedAt?: string;
  estornoFinanceiroPendente?: boolean;
  cancelamentoFiscalPendente?: boolean;
  /** RC2.8 — região de entrega resolvida (DELIVERY com regiões cadastradas). */
  regiaoEntregaId?: string | null;
  regiaoEntrega?: { id: string; nome: string; taxaEntrega: number } | null;
}

interface PedidoAtualizado {
  id: string;
  numeroPedido: number | null;
  statusEntrega: string;
  statusPreparo: string;
  nomeCliente: string | null;
  enderecoEntrega: string | null;
  valorTotal: number;
  tipoPedido?: string | null;
  updatedAt: string;
}

function isRetiradaBalcaoGestao(tipo: string | null | undefined): boolean {
  return String(tipo ?? '').toUpperCase() === 'RETIRADA_BALCAO';
}

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function badgeStatusEntrega(status: string | null | undefined): { label: string; className: string } {
  const u = String(status ?? 'PENDENTE').toUpperCase();
  if (u === 'CANCELADO' || u === 'CANCELADA') {
    return { label: 'CANCELADO', className: 'bg-red-500/15 text-red-200 border border-red-500/35' };
  }
  if (u === 'SAIU_ENTREGA') {
    return { label: 'SAIU PARA ENTREGA', className: 'bg-amber-500/15 text-amber-300 border border-amber-500/35' };
  }
  if (u === 'ENTREGUE') {
    return { label: 'ENTREGUE', className: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/35' };
  }
  return { label: 'PENDENTE', className: 'bg-slate-500/15 text-slate-300 border border-slate-500/35' };
}

type FilterStatus = 'TODOS' | 'PRONTO' | 'SAIU_ENTREGA' | 'ENTREGUE';
type DeliveryListagemAba = 'operacao' | 'cancelados';
type SocketStatus = 'idle' | 'connecting' | 'connected' | 'error';

const SOCKET_EVENTS = {
  PEDIDO_SAIU_ENTREGA: 'delivery:pedido-saiu-entrega',
  PEDIDO_ENTREGUE: 'delivery:pedido-entregue',
  PEDIDO_ATUALIZADO: 'delivery:pedido-atualizado',
  ROTA_CALCULADA: 'delivery:rota-calculada',
  NOVO_PEDIDO: 'delivery:novo-pedido',
} as const;

export function GestaoDeliveryPage() {
  const [pedidos, setPedidos] = useState<PedidoDelivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('TODOS');
  const [deliveryListagemAba, setDeliveryListagemAba] = useState<DeliveryListagemAba>('operacao');
  const deliveryListagemAbaRef = useRef<DeliveryListagemAba>('operacao');
  deliveryListagemAbaRef.current = deliveryListagemAba;
  const [socketStatus, setSocketStatus] = useState<SocketStatus>('idle');
  const [realtimeActive, setRealtimeActive] = useState(false);
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const socketRef = useRef<Socket | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [printingIds, setPrintingIds] = useState<Set<string>>(new Set());
  const [printingRomaneio, setPrintingRomaneio] = useState(false);
  const [lojaAberta, setLojaAberta] = useState<boolean | null>(null);
  const [impressaoAutomatica, setImpressaoAutomatica] = useState<boolean | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [loadingImpressao, setLoadingImpressao] = useState(false);
  const [loadingAtualizacao, setLoadingAtualizacao] = useState(false);
  const loadingStatusRef = useRef(false);
  const loadingImpressaoRef = useRef(false);
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [showQrModal, setShowQrModal] = useState(false);
  const [selectedToken, setSelectedToken] = useState('');
  // RC2.8 — modal de romaneios automáticos por região
  const [showRomaneiosRegiaoModal, setShowRomaneiosRegiaoModal] = useState(false);
  const [criandoRomaneiosRegiao, setCriandoRomaneiosRegiao] = useState(false);
  // RC2.8.1 — quais grupos o gestor escolheu romanear (default: todos)
  const [gruposSelecionados, setGruposSelecionados] = useState<Set<string>>(new Set());

  const { imprimindo, agentOnline, imprimirCupom } = useDeliveryPrint();
  const { imprimindo: imprimindoRomaneioHook, agentOnline: agenteOnlineRomaneio, imprimirRomaneio } = useRouteManifestPrint();

  const impressaoAutomaticaRef = useRef(impressaoAutomatica);
  const agentOnlineRef = useRef(agentOnline);
  impressaoAutomaticaRef.current = impressaoAutomatica;
  agentOnlineRef.current = agentOnline;

  const imprimirPedidoAutomatico = useCallback(
    async (pedido: CupomPedidoData, lojaNome: string) => {
      if (impressaoAutomaticaRef.current && agentOnlineRef.current) {
        console.log('[ImpressaoAutomatica] Imprimindo automaticamente o pedido:', {
          id: pedido.id,
          numeroPedido: pedido.numeroPedido,
          nomeCliente: pedido.nomeCliente,
          valorTotal: pedido.valorTotal,
          itens: pedido.itens?.length || 0,
          endereco: pedido.enderecoEntrega,
        });

        toast.info(`Imprimindo pedido #${pedido.numeroPedido || pedido.numeroVenda} automaticamente...`);

        try {
          const resultado = await dispararImpressaoDireta(pedido, lojaNome);
          if (resultado.sucesso) {
            console.log('[ImpressaoAutomatica] Impresso com sucesso na impressora:', resultado.impressora);
          } else {
            console.error('[ImpressaoAutomatica] Falha ao imprimir:', resultado.mensagem);
            toast.error(`Falha ao imprimir pedido #${pedido.numeroPedido}`);
          }
        } catch (e) {
          console.error('[ImpressaoAutomatica] Erro ao imprimir pedido:', e);
          toast.error('Erro ao imprimir automaticamente');
        }
      }
    },
    []
  );

  const carregarPedidos = useCallback(async () => {
    try {
      setLoadingAtualizacao(true);
      const abaApi = deliveryListagemAba === 'cancelados' ? 'cancelados' : 'ativos';
      const [pedidosRes, lojaRes] = await Promise.all([
        api.get<PedidoDelivery[]>('/api/vendas/gestao-food', {
          params: { aba: abaApi, escopo: 'entrega' },
        }),
        api.get<{ nome?: string; nomeFantasia?: string }>('/api/lojas/minha-loja').catch(() => ({ data: { nome: 'Restaurante', nomeFantasia: undefined } as { nome?: string; nomeFantasia?: string } })),
      ]);

      const deliveryPedidos = (Array.isArray(pedidosRes.data) ? pedidosRes.data : []).filter(
        (p) => String(p.origemVenda || '').toUpperCase() === 'DELIVERY'
      );

      const lojaNome = lojaRes.data?.nomeFantasia || lojaRes.data?.nome || 'Restaurante';

      setPedidos((prev) => {
        const previousIds = new Set(prev.map((p) => p.id));
        const novosPedidos = deliveryPedidos.filter((p) => !previousIds.has(p.id));
        if (
          deliveryListagemAba === 'operacao' &&
          novosPedidos.length > 0 &&
          previousIds.size > 0
        ) {
          novosPedidos.forEach((novo) => {
            void imprimirPedidoAutomatico(novo as CupomPedidoData, lojaNome);
          });
        }
        return deliveryPedidos;
      });

      setLastUpdate(new Date());
    } catch (e) {
      console.error('Gestão Delivery: falha ao listar', e);
    } finally {
      setLoadingAtualizacao(false);
      setLoading(false);
    }
  }, [deliveryListagemAba, imprimirPedidoAutomatico]);

  const toggleStatusLoja = useCallback(async () => {
    if (loadingStatusRef.current) return;
    const statusAnterior = lojaAberta;
    loadingStatusRef.current = true;
    setLoadingStatus(true);
    try {
      const { data } = await api.patch<{
        sucesso: boolean;
        aberto: boolean;
        mensagem?: string;
      }>('/api/lojas/status');
      if (data.sucesso) {
        setLojaAberta(data.aberto);
        toast.success(data.mensagem || (data.aberto ? 'Loja aberta!' : 'Loja fechada!'));
      } else {
        setLojaAberta(statusAnterior);
        toast.error('Falha ao atualizar status.');
      }
    } catch (e) {
      console.error('Gestão Delivery: falha ao toggle status', e);
      setLojaAberta(statusAnterior);
      toast.error('Falha ao atualizar status da loja.');
    } finally {
      loadingStatusRef.current = false;
      setLoadingStatus(false);
    }
  }, []);

  const toggleImpressaoAutomatica = useCallback(async () => {
    if (loadingImpressaoRef.current) return;
    const statusAnterior = impressaoAutomatica;
    loadingImpressaoRef.current = true;
    setLoadingImpressao(true);
    try {
      const { data } = await api.put<{
        sucesso: boolean;
        impressaoAutomatica: boolean;
        mensagem?: string;
      }>('/api/entregas/config/impressao-automatica', {
        impressaoAutomatica: !(statusAnterior ?? false),
      });
      if (data.sucesso) {
        setImpressaoAutomatica(data.impressaoAutomatica);
        toast.success(data.mensagem || (data.impressaoAutomatica ? 'Impressão automática ativada!' : 'Impressão automática desativada.'));
      } else {
        setImpressaoAutomatica(statusAnterior);
        toast.error('Falha ao atualizar impressão automática.');
      }
    } catch (e) {
      console.error('Gestão Delivery: falha ao toggle impressão automática', e);
      setImpressaoAutomatica(statusAnterior);
      toast.error('Falha ao atualizar impressão automática.');
    } finally {
      loadingImpressaoRef.current = false;
      setLoadingImpressao(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const carregarConfigLoja = async () => {
      if (!isMounted) return;

      try {
        const [statusLojaRes, configImpressaoRes] = await Promise.all([
          api
            .get<{ aberto: boolean }>('/api/lojas/minha-loja')
            .catch(() => ({ data: { aberto: true } })),
          api
            .get<{ impressaoAutomatica: boolean }>('/api/entregas/config')
            .catch(() => ({ data: { impressaoAutomatica: false } })),
        ]);

        if (!isMounted) return;

        setLojaAberta(statusLojaRes.data?.aberto ?? null);
        setImpressaoAutomatica(configImpressaoRes.data?.impressaoAutomatica ?? null);
      } catch (e) {
        console.error('Gestão Delivery: falha ao carregar dados iniciais', e);
      }
    };

    void carregarConfigLoja();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    void carregarPedidos();
  }, [carregarPedidos]);

  useEffect(() => {
    if (deliveryListagemAba === 'cancelados') {
      setFilterStatus('TODOS');
    }
  }, [deliveryListagemAba]);

  const socketOptions = useMemo(
    () => ({
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
      transports: ['websocket'],
    }),
    []
  );

  useEffect(() => {
    const auth = buildKdsSocketAuth();
    if (!auth?.token) {
      setSocketStatus('error');
      return;
    }

    const initSocket = () => {
      if (globalSocketInstance?.connected) {
        socketRef.current = globalSocketInstance;
        console.log('[Delivery] Reutilizando socket global existente');
        setSocketStatus('connected');
        setRealtimeActive(true);
        return;
      }

      setSocketStatus('connecting');

      const socket: Socket = io(SOCKET_URL, {
        auth,
        ...socketOptions,
      });

      globalSocketInstance = socket;
      socketRef.current = socket;

      socket.on('connect', () => {
        console.log('✅ Socket Conectado:', socket.id);
        setSocketStatus('connected');
        setRealtimeActive(true);
      });

      socket.on('disconnect', () => {
        console.log('❌ Socket Desconectado');
        setSocketStatus('idle');
        setRealtimeActive(false);
      });

      socket.on('connect_error', (err) => {
        console.error('[Delivery] Socket connect_error:', err.message);
        setSocketStatus('error');
        setRealtimeActive(false);

        setTimeout(() => {
          if (socketRef.current?.connected) return;
          console.log('[Delivery] Tentando reconectar após erro...');
          socket.connect();
        }, 500);
      });

      socket.on(SOCKET_EVENTS.PEDIDO_ATUALIZADO, (payload: PedidoAtualizado) => {
        if (!socketRef.current?.connected) {
          console.warn('[Delivery] Evento ignorado - socket não conectado');
          return;
        }
        console.log('[Delivery] Pedido atualizado via Socket:', payload);
        setLastUpdate(new Date());
        setPedidos((prev) => {
          const exists = prev.find((p) => p.id === payload.id);
          if (exists) {
            return prev.map((p) =>
              p.id === payload.id
                ? {
                    ...p,
                    statusEntrega: payload.statusEntrega,
                    statusPreparo: payload.statusPreparo,
                    updatedAt: payload.updatedAt,
                    ...(payload.tipoPedido != null ? { tipoPedido: payload.tipoPedido } : {}),
                  }
                : p
            );
          }
          return prev;
        });
        toast.info(`Pedido #${payload.numeroPedido || payload.id.slice(0, 6)} atualizado!`, {
          autoClose: 3000,
        });
      });

      socket.on(SOCKET_EVENTS.PEDIDO_SAIU_ENTREGA, (payload: PedidoAtualizado) => {
        if (!socketRef.current?.connected) {
          console.warn('[Delivery] Evento ignorado - socket não conectado');
          return;
        }
        console.log('[Delivery] Pedido saiu para entrega via Socket:', payload);
        setLastUpdate(new Date());
        toast.success(`🚴 Pedido #${payload.numeroPedido || '?'} saiu para entrega!`, {
          autoClose: 3000,
        });
      });

      socket.on(SOCKET_EVENTS.PEDIDO_ENTREGUE, (payload: PedidoAtualizado) => {
        if (!socketRef.current?.connected) {
          console.warn('[Delivery] Evento ignorado - socket não conectado');
          return;
        }
        console.log('[Delivery] Pedido entregue via Socket:', payload);
        setLastUpdate(new Date());
        toast.success(`✅ Pedido #${payload.numeroPedido || '?'} entregue!`, {
          autoClose: 3000,
        });
      });

      socket.on(SOCKET_EVENTS.NOVO_PEDIDO, async (payload: PedidoDelivery) => {
        if (!socketRef.current?.connected) {
          console.warn('[Delivery] Evento ignorado - socket não conectado');
          return;
        }
        console.log('[Delivery] Novo pedido via Socket:', payload);
        setLastUpdate(new Date());
        setPedidos((prev) => {
          if (deliveryListagemAbaRef.current !== 'operacao') return prev;
          const exists = prev.find((p) => p.id === payload.id);
          if (exists) return prev;
          return [payload, ...prev];
        });
        toast.success(`🆕 Novo pedido #${payload.numeroPedido || payload.numeroVenda}!`, {
          autoClose: 5000,
        });

        if (impressaoAutomatica && agentOnline) {
          const lojaRes = await api.get<{ nome?: string; nomeFantasia?: string }>('/api/lojas/minha-loja').catch(() => ({ data: { nome: 'Restaurante', nomeFantasia: undefined } as { nome?: string; nomeFantasia?: string } }));
          const lojaNome = lojaRes.data?.nomeFantasia || lojaRes.data?.nome || 'Restaurante';
          await imprimirPedidoAutomatico(payload as CupomPedidoData, lojaNome);
        }
      });
    };

    if (globalSocketInstance?.connected) {
      initSocket();
    } else {
      setTimeout(initSocket, 500);
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.off(SOCKET_EVENTS.PEDIDO_ATUALIZADO);
        socketRef.current.off(SOCKET_EVENTS.PEDIDO_SAIU_ENTREGA);
        socketRef.current.off(SOCKET_EVENTS.PEDIDO_ENTREGUE);
        socketRef.current.off(SOCKET_EVENTS.NOVO_PEDIDO);
      }
    };
  }, [socketOptions, impressaoAutomatica, agentOnline, imprimirPedidoAutomatico]);

  // RC2.5x — PR-7: callbacks via useCallback estabilizam refs para que o
  // React.memo do DeliveryRow funcione (linhas que não mudaram não re-rendam).
  const sairParaEntrega = useCallback(async (id: string, endereco: string) => {
    void endereco;
    setSavingIds((s) => new Set(s).add(id));
    try {
      await api.post(`/api/entregas/${id}/sair-entrega`);
      toast.success('Motoboy saiu para entrega!');
      await carregarPedidos();
    } catch (e) {
      console.error('Gestão Delivery: sair para entrega', e);
      const msg =
        e && typeof e === 'object' && 'response' in e
          ? String((e as { response?: { data?: { error?: string } } }).response?.data?.error ?? '')
          : 'Não foi possível atualizar o status de entrega.';
      toast.error(msg);
    } finally {
      setSavingIds((s) => {
        const n = new Set(s);
        n.delete(id);
        return n;
      });
    }
  }, [carregarPedidos]);

  const confirmarEntrega = useCallback(async (id: string) => {
    setSavingIds((s) => new Set(s).add(id));
    try {
      await api.post(`/api/entregas/${id}/confirmar-entrega`);
      toast.success('Entrega confirmada!');
      await carregarPedidos();
    } catch (e) {
      console.error('Gestão Delivery: confirmar entrega', e);
      toast.error('Não foi possível confirmar a entrega.');
    } finally {
      setSavingIds((s) => {
        const n = new Set(s);
        n.delete(id);
        return n;
      });
    }
  }, [carregarPedidos]);

  const verRota = useCallback((endereco: string) => {
    if (!endereco) {
      toast.error('Endereço não disponível para calcular rota.');
      return;
    }
    abrirRotaDelivery('Loja', endereco);
  }, []);

  const handleImprimirCupomRow = useCallback(async (id: string) => {
    setPrintingIds((s) => new Set(s).add(id));
    try {
      await imprimirCupom(id, true);
    } finally {
      setPrintingIds((s) => {
        const n = new Set(s);
        n.delete(id);
        return n;
      });
    }
  }, [imprimirCupom]);

  /** RC2.8 — preview do agrupamento de pedidos PENDENTE por regiaoEntregaId. */
  const pedidosPendentesPorRegiao = useMemo(() => {
    type Grupo = {
      key: string;
      regiaoNome: string;
      pedidos: PedidoDelivery[];
      totalValor: number;
    };
    const grupos = new Map<string, Grupo>();
    for (const p of pedidos) {
      if (p.statusEntrega !== 'PENDENTE') continue;
      if (isRetiradaBalcaoGestao(p.tipoPedido)) continue;
      const key = p.regiaoEntregaId ?? '__sem_regiao__';
      const regiaoNome = p.regiaoEntrega?.nome ?? 'Sem região';
      const g = grupos.get(key) ?? { key, regiaoNome, pedidos: [], totalValor: 0 };
      g.pedidos.push(p);
      g.totalValor += Number(p.valorTotal) || 0;
      grupos.set(key, g);
    }
    // Sem região por último; demais alfabéticos
    return Array.from(grupos.values()).sort((a, b) => {
      if (a.key === '__sem_regiao__') return 1;
      if (b.key === '__sem_regiao__') return -1;
      return a.regiaoNome.localeCompare(b.regiaoNome, 'pt-BR');
    });
  }, [pedidos]);

  const handleGerarRomaneiosPorRegiao = useCallback(async () => {
    const gruposEscolhidos = pedidosPendentesPorRegiao.filter((g) =>
      gruposSelecionados.has(g.key)
    );
    if (gruposEscolhidos.length === 0) {
      toast.warning('Selecione ao menos uma região para gerar romaneios.');
      return;
    }

    setCriandoRomaneiosRegiao(true);
    try {
      const regiaoEntregaIds = gruposEscolhidos
        .filter((g) => g.key !== '__sem_regiao__')
        .map((g) => g.key);
      const incluirSemRegiao = gruposEscolhidos.some((g) => g.key === '__sem_regiao__');

      const { data } = await api.post<{
        ok?: boolean;
        sucesso?: boolean;
        message?: string;
        romaneios?: Array<{
          romaneioId: string;
          uuid: string;
          regiaoNome: string;
          totalPedidos: number;
          totalValor: number;
        }>;
        error?: string;
      }>('/api/entregas/romaneios/auto-por-regiao', {
        regiaoEntregaIds,
        incluirSemRegiao,
      });

      if (data.sucesso === false || data.ok === false) {
        toast.error(data.error || data.message || 'Falha ao gerar romaneios.');
        return;
      }

      const romaneios = data.romaneios ?? [];
      if (romaneios.length === 0) {
        toast.info(data.message || 'Nenhum pedido pendente para romanear.');
        setShowRomaneiosRegiaoModal(false);
        return;
      }

      // Otimista: marca como SAIU_ENTREGA na lista (apenas os grupos romaneados)
      const idsRomaneados = new Set(
        gruposEscolhidos.flatMap((g) => g.pedidos.map((p) => p.id))
      );
      setPedidos((prev) =>
        prev.map((p) =>
          idsRomaneados.has(p.id) ? { ...p, statusEntrega: 'SAIU_ENTREGA' as const } : p
        )
      );

      toast.success(
        `${romaneios.length} romaneio(s) criado(s) — ` +
          romaneios.map((r) => `${r.regiaoNome} (${r.totalPedidos})`).join(', ')
      );
      setShowRomaneiosRegiaoModal(false);
      setSelectedOrderIds(new Set());
      setFilterStatus('SAIU_ENTREGA');
    } catch (e) {
      console.error('[romaneios-auto-por-regiao] erro', e);
      const err = e as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || 'Erro ao gerar romaneios automáticos.');
    } finally {
      setCriandoRomaneiosRegiao(false);
    }
  }, [pedidosPendentesPorRegiao, gruposSelecionados]);

  // Ao abrir o modal, pré-seleciona TODOS os grupos disponíveis
  useEffect(() => {
    if (showRomaneiosRegiaoModal) {
      setGruposSelecionados(new Set(pedidosPendentesPorRegiao.map((g) => g.key)));
    }
  }, [showRomaneiosRegiaoModal, pedidosPendentesPorRegiao]);

  const toggleGrupoRegiao = useCallback((key: string) => {
    setGruposSelecionados((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const handleImprimirRomaneio = async () => {
    // Determina os pedidos elegíveis para entrar no romaneio.
    // Regras:
    //  - PENDENTE de entrega
    //  - Não retirada no balcão
    let pedidoIds: string[] = [];

    if (selectedOrderIds.size > 0) {
      const elegiveis = pedidos.filter(
        (p) =>
          selectedOrderIds.has(p.id) &&
          p.statusEntrega === 'PENDENTE' &&
          !isRetiradaBalcaoGestao(p.tipoPedido)
      );
      const ignorados = selectedOrderIds.size - elegiveis.length;

      if (elegiveis.length === 0) {
        toast.warning(
          'Nenhum dos pedidos selecionados está apto para romaneio. Apenas pedidos PENDENTE de entrega podem ser incluídos.'
        );
        return;
      }
      if (ignorados > 0) {
        toast.info(
          `${ignorados} pedido(s) ignorado(s) por já estarem em rota, entregues ou serem retirada no balcão.`
        );
      }
      pedidoIds = elegiveis.map((p) => p.id);
    } else {
      // Sem seleção explícita → monta romaneio com todos os pendentes da loja
      pedidoIds = pedidos
        .filter(
          (p) =>
            p.statusEntrega === 'PENDENTE' && !isRetiradaBalcaoGestao(p.tipoPedido)
        )
        .map((p) => p.id);

      if (pedidoIds.length === 0) {
        toast.warning('Nenhum pedido pendente para criar romaneio.');
        return;
      }
    }

    setPrintingRomaneio(true);
    try {
      const resultado = await criarRomaneio(pedidoIds);

      if (!resultado.sucesso) {
        toast.error(resultado.error || 'Falha ao criar romaneio.');
        return;
      }

      if (resultado.texto && agenteOnlineRomaneio) {
        await imprimirRomaneio({
          uuid: resultado.uuid!,
          lojaNome: resultado.romaneioData?.lojaNome || 'Restaurante',
          horaSaida: resultado.romaneioData?.horaSaida,
          dataRota: resultado.romaneioData?.dataRota,
          paradas: (resultado.romaneioData?.paradas || []).map((p) => ({
            pedidoId: p.pedidoId,
            numeroPedido: p.numeroPedido,
            clienteNome: p.clienteNome,
            clienteTelefone: p.clienteTelefone,
            endereco: p.endereco,
            valorReceber: p.valorReceber,
          })),
        });
      }

      toast.success(`Romaneio #${resultado.uuid} criado com ${pedidoIds.length} pedidos!`);

      const linkToken =
        resultado.token ||
        (resultado.uuid ? `rom_${String(resultado.uuid).replace(/^rom_/i, '').toLowerCase()}` : '');
      setSelectedToken(linkToken);
      setShowQrModal(true);

      setPedidos((prev) =>
        prev.map((p) =>
          pedidoIds.includes(p.id)
            ? { ...p, statusEntrega: 'SAIU_ENTREGA' as const }
            : p
        )
      );

      setSelectedOrderIds(new Set());
      setFilterStatus('SAIU_ENTREGA');
    } catch (e) {
      console.error('[handleImprimirRomaneio] Erro:', e);
      toast.error('Erro ao gerar romaneio.');
    } finally {
      setPrintingRomaneio(false);
    }
  };

  const handleShareWhatsApp = async () => {
    if (!trackingPublicUrl) {
      toast.warning('Romaneio sem token válido — gere o romaneio antes de compartilhar.');
      return;
    }
    const text = `🔔 Rastreie seu delivery!\n\nSiga o link para acompanhar sua entrega em tempo real:\n${trackingPublicUrl}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Rastreamento Delivery',
          text: text,
        });
        return;
      } catch {
      }
    }

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, '_blank');
  };

  const toggleSelectOrder = useCallback((id: string) => {
    setSelectedOrderIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleSelectAll = () => {
    const pendentes = filteredPedidos
      .filter((p) => p.statusEntrega === 'PENDENTE' && !isRetiradaBalcaoGestao(p.tipoPedido))
      .map((p) => p.id);
    if (selectedOrderIds.size === pendentes.length) {
      setSelectedOrderIds(new Set());
    } else {
      setSelectedOrderIds(new Set(pendentes));
    }
  };

  const filteredPedidos = pedidos.filter((p) => {
    if (deliveryListagemAba === 'cancelados') return true;
    if (filterStatus === 'TODOS') return true;
    if (filterStatus === 'PRONTO') return p.statusEntrega === 'PENDENTE';
    return p.statusEntrega === filterStatus;
  });

  const contagem = {
    total: pedidos.length,
    pendente: pedidos.filter((p) => p.statusEntrega === 'PENDENTE').length,
    emRota: pedidos.filter((p) => p.statusEntrega === 'SAIU_ENTREGA').length,
    entregue: pedidos.filter((p) => p.statusEntrega === 'ENTREGUE').length,
  };

  /**
   * Pedidos atualmente selecionados que são elegíveis para entrar num romaneio:
   * - statusEntrega === 'PENDENTE' (não saiu, não foi entregue)
   * - tipoPedido !== 'RETIRADA_BALCAO' (cliente busca no balcão; não vai pra rota)
   */
  const selectedPendentes = useMemo(
    () =>
      pedidos.filter(
        (p) =>
          selectedOrderIds.has(p.id) &&
          p.statusEntrega === 'PENDENTE' &&
          !isRetiradaBalcaoGestao(p.tipoPedido)
      ),
    [pedidos, selectedOrderIds]
  );

  /**
   * Define se o botão "Romaneio" deve estar habilitado.
   * - Com seleção: precisa de pelo menos 1 elegível.
   * - Sem seleção: usa todos os pendentes da loja (modo "todos").
   * Não bloqueia por agente offline — o romaneio digital (QR) funciona sem impressora física.
   */
  const podeMontarRomaneio =
    selectedOrderIds.size > 0 ? selectedPendentes.length > 0 : contagem.pendente > 0;

  const totalRomaneio =
    selectedOrderIds.size > 0 ? selectedPendentes.length : contagem.pendente;

  /**
   * URL pública usada no QR Code e no link compartilhado por WhatsApp.
   * Prioridade:
   *  1. `VITE_DELIVERY_TRACKING_BASE_URL` (configurar para domínio público em produção
   *     ou IP da máquina dev — `http://192.168.x.x:5173` — para QR funcionar no celular).
   *  2. `window.location.origin` (fallback). Em dev este valor é `http://localhost:5173`,
   *     que não funciona quando o QR é escaneado por outro dispositivo.
   * O token já vem com prefixo `rom_` quando reconstruído a partir do uuid.
   */
  const trackingPublicUrl = useMemo(() => {
    if (!selectedToken) return '';
    const base = (
      import.meta.env.VITE_DELIVERY_TRACKING_BASE_URL || window.location.origin
    ).replace(/\/+$/, '');
    return `${base}/#/entregas/mobile/${selectedToken}`;
  }, [selectedToken]);

  const socketLabel =
    socketStatus === 'connected'
      ? 'Ao vivo'
      : socketStatus === 'connecting'
        ? 'Conectando…'
        : socketStatus === 'error'
          ? 'Socket indisponível'
          : 'Desconectado';

  return (
    <Layout>
      <div className="min-h-[calc(100vh-4rem)] bg-[#060816] text-white p-4 sm:p-6">
        <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(139,92,246,0.12),transparent_50%)]" />
        <div className="relative z-10 max-w-[1400px] mx-auto space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
                  <Truck className="w-8 h-8 text-sky-400 shrink-0" />
                  Gestão Delivery / Pedidos
                </h1>
                <p className="text-slate-400 text-sm mt-1">
                  Controle de entregas e rastreamento em tempo real.
                </p>
              </div>
              {lojaAberta !== null && (
                <button
                  type="button"
                  disabled={loadingStatus}
                  onClick={() => void toggleStatusLoja()}
                  className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 font-black text-sm uppercase tracking-wide transition-all shadow-lg hover:scale-[1.02] ${
                    lojaAberta
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white border border-emerald-400/50 shadow-emerald-500/25'
                      : 'bg-gradient-to-r from-red-600 to-rose-600 text-white border border-red-400/50 shadow-red-500/25'
                  } disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100`}
                >
                  {loadingStatus ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : lojaAberta ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    <XCircle className="w-5 h-5" />
                  )}
                  <span>{lojaAberta ? 'Recebendo Pedidos' : 'Loja Fechada'}</span>
                </button>
              )}
              {impressaoAutomatica !== null && (
                <button
                  type="button"
                  disabled={loadingImpressao}
                  onClick={() => void toggleImpressaoAutomatica()}
                  className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 font-black text-sm uppercase tracking-wide transition-all shadow-lg hover:scale-[1.02] ${
                    impressaoAutomatica
                      ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white border border-violet-400/50 shadow-violet-500/25'
                      : 'bg-slate-700/80 text-slate-300 border border-slate-600/50'
                  } disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100`}
                >
                  {loadingImpressao ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Printer className="w-5 h-5" />
                  )}
                  <span>Impressão: {impressaoAutomatica ? 'ON' : 'OFF'}</span>
                </button>
              )}
              {impressaoAutomatica === true && !agentOnline && (
                <div className="flex items-center gap-1.5 rounded-xl border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-xs font-bold text-amber-200 animate-pulse">
                  <WifiOff className="w-3.5 h-3.5" />
                  <span>Impressora Offline</span>
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex rounded-xl border border-white/10 bg-[#08101f] p-1">
                <button
                  type="button"
                  onClick={() => setDeliveryListagemAba('operacao')}
                  className={`rounded-lg px-3 py-2 text-xs font-black uppercase tracking-wide transition-all ${
                    deliveryListagemAba === 'operacao'
                      ? 'bg-teal-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Em operação
                </button>
                <button
                  type="button"
                  onClick={() => setDeliveryListagemAba('cancelados')}
                  className={`rounded-lg px-3 py-2 text-xs font-black uppercase tracking-wide transition-all ${
                    deliveryListagemAba === 'cancelados'
                      ? 'bg-red-600/90 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Cancelados
                </button>
              </div>
              <div
                className={`flex rounded-xl border border-white/10 bg-[#08101f] p-1 ${
                  deliveryListagemAba === 'cancelados' ? 'opacity-40 pointer-events-none' : ''
                }`}
              >
                {(['TODOS', 'PRONTO', 'SAIU_ENTREGA', 'ENTREGUE'] as FilterStatus[]).map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setFilterStatus(status)}
                    className={`rounded-lg px-3 py-2 text-xs font-black uppercase tracking-wide transition-all ${
                      filterStatus === status
                        ? status === 'TODOS'
                          ? 'bg-violet-600 text-white'
                          : status === 'PRONTO'
                            ? 'bg-amber-500/90 text-black'
                            : status === 'SAIU_ENTREGA'
                              ? 'bg-orange-500/90 text-white'
                              : 'bg-emerald-500/90 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {status === 'TODOS' ? 'Todos' : status === 'SAIU_ENTREGA' ? 'Em Rota' : status === 'ENTREGUE' ? 'Entregues' : 'Prontos'}
                  </button>
                ))}
              </div>
              <div
                className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold ${
                  socketStatus === 'connected'
                    ? 'border-emerald-500/35 bg-emerald-500/10 text-emerald-200'
                    : socketStatus === 'connecting'
                      ? 'border-amber-500/35 bg-amber-500/10 text-amber-100'
                      : 'border-red-500/30 bg-red-500/10 text-red-200'
                }`}
              >
                {socketStatus === 'connecting' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Radio className="w-3.5 h-3.5" />
                )}
                {socketLabel}
              </div>
              <div
                className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold ${
                  agentOnline
                    ? 'border-sky-500/35 bg-sky-500/10 text-sky-200'
                    : 'border-slate-500/30 bg-slate-500/10 text-slate-400'
                }`}
              >
                {agentOnline ? (
                  <Wifi className="w-3.5 h-3.5 text-sky-400" />
                ) : (
                  <WifiOff className="w-3.5 h-3.5" />
                )}
                {agentOnline ? 'Impressora Online' : 'Impressora Offline'}
              </div>
              {realtimeActive && (
                <div className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-200 animate-pulse">
                  <Zap className="w-3.5 h-3.5" />
                  Realtime
                </div>
              )}
              {lastUpdate && (
                <span className="text-[10px] text-slate-500">
                  Atualizado {formatTime(lastUpdate.toISOString())}
                </span>
              )}
              <button
                type="button"
                disabled={loadingAtualizacao}
                onClick={() => void carregarPedidos()}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-bold text-slate-200 hover:bg-white/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`w-4 h-4 ${loadingAtualizacao ? 'animate-spin' : ''}`} />
                {loadingAtualizacao ? 'Atualizando...' : 'Atualizar'}
              </button>
              <button
                type="button"
                disabled={printingRomaneio || imprimindoRomaneioHook || !podeMontarRomaneio}
                onClick={() => void handleImprimirRomaneio()}
                title={
                  !agenteOnlineRomaneio
                    ? 'Agente de impressão offline — o romaneio digital com QR Code será gerado mesmo assim.'
                    : undefined
                }
                className="inline-flex items-center gap-2 rounded-xl border border-sky-500/35 bg-sky-500/10 px-4 py-2.5 text-sm font-bold text-sky-200 hover:bg-sky-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {printingRomaneio || imprimindoRomaneioHook ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Printer className="w-4 h-4" />
                )}
                Romaneio ({totalRomaneio})
              </button>
              <button
                type="button"
                disabled={criandoRomaneiosRegiao || pedidosPendentesPorRegiao.length === 0}
                onClick={() => setShowRomaneiosRegiaoModal(true)}
                title={
                  pedidosPendentesPorRegiao.length === 0
                    ? 'Nenhum pedido pendente para romanear'
                    : 'Cria N romaneios agrupando pedidos pendentes por região'
                }
                className="inline-flex items-center gap-2 rounded-xl border border-violet-500/35 bg-violet-500/10 px-4 py-2.5 text-sm font-bold text-violet-200 hover:bg-violet-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Layers className="w-4 h-4" />
                Por região ({pedidosPendentesPorRegiao.length})
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-white/10 bg-[#08101f]/90 p-4 text-center">
              <p className="text-3xl font-black text-white">{contagem.total}</p>
              <p className="text-xs text-slate-400 uppercase tracking-wider mt-1">Total</p>
            </div>
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-center">
              <p className="text-3xl font-black text-amber-300">{contagem.pendente}</p>
              <p className="text-xs text-amber-400 uppercase tracking-wider mt-1">Pendentes</p>
            </div>
            <div className="rounded-2xl border border-orange-500/20 bg-orange-500/10 p-4 text-center">
              <p className="text-3xl font-black text-orange-300">{contagem.emRota}</p>
              <p className="text-xs text-orange-400 uppercase tracking-wider mt-1">Em Rota</p>
            </div>
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-center">
              <p className="text-3xl font-black text-emerald-300">{contagem.entregue}</p>
              <p className="text-xs text-emerald-400 uppercase tracking-wider mt-1">Entregues</p>
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-[#08101f]/90 backdrop-blur-xl shadow-[0_25px_60px_rgba(0,0,0,0.35)] overflow-hidden relative">
            {lojaAberta === false && (
              <div className="absolute inset-0 z-20 bg-red-950/60 backdrop-blur-[2px] flex flex-col items-center justify-center gap-4 pointer-events-none">
                <XCircle className="w-16 h-16 text-red-400 opacity-80" />
                <div className="text-center">
                  <p className="text-2xl font-black text-red-200 uppercase tracking-wide">Loja Fechada</p>
                  <p className="text-sm text-red-300/70 mt-1">Novos pedidos não serão recebidos até a reabertura</p>
                </div>
                <button
                  type="button"
                  disabled={loadingStatus}
                  onClick={() => void toggleStatusLoja()}
                  className="mt-2 flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-3 font-black text-white shadow-lg hover:scale-[1.02] transition-all disabled:opacity-50 pointer-events-auto"
                >
                  {loadingStatus ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <CheckCircle className="w-5 h-5" />
                  )}
                  Reabrir Loja
                </button>
              </div>
            )}
            {loading && filteredPedidos.length === 0 ? (
              <div className="flex justify-center py-24">
                <Loader2 className="w-10 h-10 text-sky-400 animate-spin" />
              </div>
            ) : filteredPedidos.length === 0 ? (
              <p className="text-center text-slate-500 py-16 px-6">
                Nenhum pedido de delivery encontrado com este filtro.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm min-w-[1000px]">
                  <thead>
                    <tr className="border-b border-white/10 text-[10px] font-black uppercase tracking-widest text-slate-500">
                      <th className="px-2 py-4 w-10">
                        <input
                          type="checkbox"
                          checked={
                            selectedOrderIds.size > 0 &&
                            filteredPedidos.filter(
                              (p) => p.statusEntrega === 'PENDENTE' && !isRetiradaBalcaoGestao(p.tipoPedido)
                            ).length === selectedOrderIds.size &&
                            filteredPedidos
                              .filter((p) => p.statusEntrega === 'PENDENTE' && !isRetiradaBalcaoGestao(p.tipoPedido))
                              .every((p) => selectedOrderIds.has(p.id))
                          }
                          onChange={toggleSelectAll}
                          className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-sky-500 focus:ring-sky-500"
                        />
                      </th>
                      <th className="px-4 py-4">Pedido</th>
                      <th className="px-4 py-4">Cliente</th>
                      <th className="px-4 py-4">Endereço</th>
                      <th className="px-4 py-4">Status Entrega</th>
                      <th className="px-4 py-4 text-right">Total</th>
                      <th className="px-4 py-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPedidos.map((row) => (
                      <DeliveryRow
                        key={row.id}
                        row={row}
                        busy={savingIds.has(row.id)}
                        isPrinting={printingIds.has(row.id)}
                        isSelected={selectedOrderIds.has(row.id)}
                        agentOnline={agentOnline}
                        onToggleSelect={toggleSelectOrder}
                        onImprimirCupom={handleImprimirCupomRow}
                        onSairParaEntrega={sairParaEntrega}
                        onConfirmarEntrega={confirmarEntrega}
                        onVerRota={verRota}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowQrModal(false)}
          />
          <div className="relative z-10 w-full max-w-md rounded-3xl border border-white/10 bg-[#08101f] p-8 text-center shadow-2xl">
            <button
              type="button"
              onClick={() => setShowQrModal(false)}
              className="absolute right-4 top-4 rounded-full p-2 text-slate-400 hover:bg-white/10 hover:text-white transition-all"
            >
              <XCircle className="w-6 h-6" />
            </button>

            <div className="flex justify-center mb-6">
              <div className="rounded-2xl border border-sky-500/35 bg-white p-4">
                <QRCodeSVG
                  value={trackingPublicUrl}
                  size={256}
                  level="H"
                  includeMargin
                />
              </div>
            </div>

            <h3 className="text-xl font-black text-white mb-2">
              Romaneio #{selectedToken.slice(0, 8).toUpperCase()}
            </h3>
            <p className="text-sm text-slate-400 mb-3">
              Escaneie para acompanhar a entrega
            </p>

            {trackingPublicUrl && (
              <p className="mb-6 break-all rounded-lg border border-white/5 bg-[#0b1324] px-3 py-2 text-[11px] font-mono text-violet-200/85">
                {trackingPublicUrl}
              </p>
            )}

            <button
              type="button"
              onClick={() => void handleShareWhatsApp()}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-3 font-black text-white shadow-lg hover:scale-[1.02] transition-all"
            >
              <Share2 className="w-5 h-5" />
              Enviar p/ WhatsApp
            </button>
          </div>
        </div>
      )}

      {/* RC2.8 — Modal: preview de romaneios automáticos por região */}
      {showRomaneiosRegiaoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => !criandoRomaneiosRegiao && setShowRomaneiosRegiaoModal(false)}
          />
          <div className="relative z-10 w-full max-w-lg rounded-3xl border border-white/10 bg-[#08101f] p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h3 className="flex items-center gap-2 text-lg font-bold text-white">
                  <Layers className="w-5 h-5 text-violet-400" />
                  Romaneios por região
                </h3>
                <p className="mt-1 text-xs text-slate-400">
                  Será criado <strong>um romaneio por região</strong> com os pedidos pendentes
                  abaixo. Pedidos sem região formam um grupo separado.
                </p>
              </div>
              <button
                type="button"
                disabled={criandoRomaneiosRegiao}
                onClick={() => setShowRomaneiosRegiaoModal(false)}
                className="rounded-full p-1 text-slate-400 hover:bg-white/10 hover:text-white transition disabled:opacity-50"
                aria-label="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {pedidosPendentesPorRegiao.length === 0 ? (
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6 text-center text-sm text-slate-400">
                Nenhum pedido pendente para romanear.
              </div>
            ) : (
              <>
                <div className="mb-2 flex items-center justify-between px-1">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                    Marque as regiões que quer romanear
                  </p>
                  <div className="flex gap-2 text-[11px] font-bold">
                    <button
                      type="button"
                      onClick={() =>
                        setGruposSelecionados(
                          new Set(pedidosPendentesPorRegiao.map((g) => g.key))
                        )
                      }
                      className="text-violet-300 hover:text-violet-200 transition"
                    >
                      Marcar todas
                    </button>
                    <span className="text-slate-600">|</span>
                    <button
                      type="button"
                      onClick={() => setGruposSelecionados(new Set())}
                      className="text-slate-400 hover:text-slate-200 transition"
                    >
                      Limpar
                    </button>
                  </div>
                </div>
                <ul className="max-h-72 overflow-y-auto divide-y divide-white/5 rounded-xl border border-white/10 bg-white/[0.02]">
                  {pedidosPendentesPorRegiao.map((g) => {
                    const selecionado = gruposSelecionados.has(g.key);
                    return (
                      <li key={g.key}>
                        <label
                          className={`flex cursor-pointer items-center justify-between gap-3 px-4 py-3 transition ${
                            selecionado ? 'bg-violet-500/5' : 'hover:bg-white/[0.03]'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <input
                              type="checkbox"
                              checked={selecionado}
                              onChange={() => toggleGrupoRegiao(g.key)}
                              disabled={criandoRomaneiosRegiao}
                              className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-violet-500 focus:ring-violet-500"
                            />
                            <div className="min-w-0">
                              <p className="font-bold text-white truncate">
                                {g.regiaoNome}
                                {g.key === '__sem_regiao__' && (
                                  <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide text-amber-300">
                                    legado
                                  </span>
                                )}
                              </p>
                              <p className="text-xs text-slate-400">
                                {g.pedidos.length} pedido{g.pedidos.length === 1 ? '' : 's'} ·{' '}
                                {formatCurrency(g.totalValor)}
                              </p>
                            </div>
                          </div>
                          <span
                            className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-black uppercase ${
                              selecionado
                                ? 'bg-violet-500/20 text-violet-200'
                                : 'bg-slate-500/15 text-slate-400'
                            }`}
                          >
                            → 1 romaneio
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                disabled={criandoRomaneiosRegiao}
                onClick={() => setShowRomaneiosRegiaoModal(false)}
                className="rounded-xl border border-white/10 px-4 py-2 text-sm font-bold text-slate-300 hover:bg-white/5 transition disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={criandoRomaneiosRegiao || gruposSelecionados.size === 0}
                onClick={() => void handleGerarRomaneiosPorRegiao()}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2 text-sm font-black text-white shadow hover:scale-[1.02] transition disabled:opacity-50"
              >
                {criandoRomaneiosRegiao ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Layers className="w-4 h-4" />
                )}
                Gerar {gruposSelecionados.size} romaneio
                {gruposSelecionados.size === 1 ? '' : 's'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
