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
} from 'lucide-react';
import { toast } from 'react-toastify';
import { Layout } from '../../../components/Layout';
import { api, resolveApiBaseUrl } from '../../../services/api';
import { buildKdsSocketAuth } from '../../../services/socket/kdsSocketAuth';
import { abrirRotaDelivery } from '../../delivery-tracking/utils/googleMapsUtils';
import { useDeliveryPrint } from '../../delivery-tracking/hooks/useDeliveryPrint';
import { useRouteManifestPrint } from '../../delivery-tracking/hooks/useRouteManifestPrint';
import { dispararImpressaoDireta, type CupomPedidoData, criarRomaneio } from '../../delivery-tracking/services/cupomTemplateService';

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
  createdAt: string;
  observacoes?: string | null;
  pagamentos?: { tipoPagamento: string; valor: number }[];
  origemVenda?: string;
  tipoPedido?: string | null;
  updatedAt?: string;
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
  if (u === 'SAIU_ENTREGA') {
    return { label: 'SAIU PARA ENTREGA', className: 'bg-amber-500/15 text-amber-300 border border-amber-500/35' };
  }
  if (u === 'ENTREGUE') {
    return { label: 'ENTREGUE', className: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/35' };
  }
  return { label: 'PENDENTE', className: 'bg-slate-500/15 text-slate-300 border border-slate-500/35' };
}

type FilterStatus = 'TODOS' | 'PRONTO' | 'SAIU_ENTREGA' | 'ENTREGUE';
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
      const [pedidosRes, lojaRes] = await Promise.all([
        api.get<PedidoDelivery[]>('/api/vendas/gestao-food'),
        api.get<{ nome?: string; nomeFantasia?: string }>('/api/lojas/minha-loja').catch(() => ({ data: { nome: 'Restaurante', nomeFantasia: undefined } as { nome?: string; nomeFantasia?: string } })),
      ]);

      const deliveryPedidos = (Array.isArray(pedidosRes.data) ? pedidosRes.data : []).filter(
        (p) => String(p.origemVenda || '').toUpperCase() === 'DELIVERY'
      );

      const lojaNome = lojaRes.data?.nomeFantasia || lojaRes.data?.nome || 'Restaurante';

      const previousIds = new Set(pedidos.map((p) => p.id));
      setPedidos((prev) => {
        const novosPedidos = deliveryPedidos.filter((p) => !previousIds.has(p.id));
        if (novosPedidos.length > 0 && previousIds.size > 0) {
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
    }
  }, [impressaoAutomatica, agentOnline, imprimirPedidoAutomatico]);

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

    const carregarDadosIniciais = async () => {
      if (!isMounted) return;

      try {
        const [pedidosRes, lojaRes, statusLojaRes, configImpressaoRes] = await Promise.all([
          api.get<PedidoDelivery[]>('/api/vendas/gestao-food'),
          api
            .get<{ nome?: string; nomeFantasia?: string }>('/api/lojas/minha-loja')
            .catch(() => ({ data: { nome: 'Restaurante', nomeFantasia: undefined } })),
          api
            .get<{ aberto: boolean }>('/api/lojas/minha-loja')
            .catch(() => ({ data: { aberto: true } })),
          api
            .get<{ impressaoAutomatica: boolean }>('/api/entregas/config')
            .catch(() => ({ data: { impressaoAutomatica: false } })),
        ]);

        if (!isMounted) return;

        const deliveryPedidos = (Array.isArray(pedidosRes.data) ? pedidosRes.data : []).filter(
          (p) => String(p.origemVenda || '').toUpperCase() === 'DELIVERY'
        );

        const previousIds = new Set(pedidos.map((p) => p.id));
        setPedidos((prev) => {
          const novosPedidos = deliveryPedidos.filter((p) => !previousIds.has(p.id));
          if (novosPedidos.length > 0 && previousIds.size > 0) {
            const lojaNome = lojaRes.data?.nomeFantasia || lojaRes.data?.nome || 'Restaurante';
            novosPedidos.forEach((novo) => {
              void imprimirPedidoAutomatico(novo as CupomPedidoData, lojaNome);
            });
          }
          return deliveryPedidos;
        });

        setLojaAberta(statusLojaRes.data?.aberto ?? null);
        setImpressaoAutomatica(configImpressaoRes.data?.impressaoAutomatica ?? null);
        setLoading(false);
      } catch (e) {
        console.error('Gestão Delivery: falha ao carregar dados iniciais', e);
        setLoading(false);
      }
    };

    carregarDadosIniciais();

    return () => {
      isMounted = false;
    };
  }, []);

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

  const sairParaEntrega = async (id: string, endereco: string) => {
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
  };

  const confirmarEntrega = async (id: string) => {
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
  };

  const verRota = (endereco: string) => {
    if (!endereco) {
      toast.error('Endereço não disponível para calcular rota.');
      return;
    }
    abrirRotaDelivery('Loja', endereco);
  };

  const handleImprimirRomaneio = async () => {
    if (selectedOrderIds.size === 0) {
      toast.warning('Selecione ao menos um pedido para montar a rota.');
      return;
    }

    const pedidoIds = Array.from(selectedOrderIds);

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

      setSelectedToken(resultado.uuid || '');
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
    const trackingUrl = `https://delivery.seusite.com.br/track/${selectedToken}`;
    const text = `🔔 Rastreie seu delivery!\n\nSiga o link para acompanhar sua entrega em tempo real:\n${trackingUrl}`;

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

  const toggleSelectOrder = (id: string) => {
    setSelectedOrderIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

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
                disabled={printingRomaneio || imprimindoRomaneioHook || !agenteOnlineRomaneio || contagem.pendente === 0}
                onClick={() => void handleImprimirRomaneio()}
                className="inline-flex items-center gap-2 rounded-xl border border-sky-500/35 bg-sky-500/10 px-4 py-2.5 text-sm font-bold text-sky-200 hover:bg-sky-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {printingRomaneio || imprimindoRomaneioHook ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Printer className="w-4 h-4" />
                )}
                Romaneio ({selectedOrderIds.size > 0 ? selectedOrderIds.size : contagem.pendente})
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
                    {filteredPedidos.map((row) => {
                      const busy = savingIds.has(row.id);
                      const isPrinting = printingIds.has(row.id);
                      const statusBadge = badgeStatusEntrega(row.statusEntrega);
                      const retirada = isRetiradaBalcaoGestao(row.tipoPedido);
                      const podeSairEntrega = row.statusEntrega === 'PENDENTE' && !retirada;
                      const podeConfirmar = row.statusEntrega === 'SAIU_ENTREGA' && !retirada;
                      const preparoU = String(row.statusPreparo ?? '').toUpperCase();
                      const podeConcluirRetirada =
                        retirada && row.statusEntrega === 'PENDENTE' && preparoU === 'PRONTO';
                      const cupomPendente = row.statusEntrega === 'PENDENTE' && (podeSairEntrega || retirada);
                      const isRecentlyUpdated = row.updatedAt && new Date(row.updatedAt).getTime() > Date.now() - 5000;

                      const handleImprimirCupom = async () => {
                        setPrintingIds((s) => new Set(s).add(row.id));
                        try {
                          await imprimirCupom(row.id, true);
                        } finally {
                          setPrintingIds((s) => {
                            const n = new Set(s);
                            n.delete(row.id);
                            return n;
                          });
                        }
                      };

                      return (
                        <tr
                          key={row.id}
                          className={`border-b border-white/5 transition-colors ${isRecentlyUpdated ? 'bg-emerald-500/5' : 'hover:bg-white/[0.03]'}`}
                        >
                          <td className="px-2 py-4">
                            {podeSairEntrega ? (
                              <input
                                type="checkbox"
                                checked={selectedOrderIds.has(row.id)}
                                onChange={() => toggleSelectOrder(row.id)}
                                className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-sky-500 focus:ring-sky-500"
                              />
                            ) : null}
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2">
                              {isRecentlyUpdated && (
                                <Zap className="w-4 h-4 text-emerald-400 animate-pulse" />
                              )}
                              <div className={`font-black text-lg ${isRecentlyUpdated ? 'text-emerald-300' : 'text-white'}`}>
                                #{row.numeroPedido || row.numeroVenda}
                              </div>
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono mt-1">
                              {formatTime(row.createdAt)}
                            </div>
                            <div className="mt-2">
                              <span
                                className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${
                                  retirada
                                    ? 'border border-violet-500/40 bg-violet-500/15 text-violet-200'
                                    : 'border border-sky-500/40 bg-sky-500/15 text-sky-200'
                                }`}
                              >
                                {retirada ? 'Retirada' : 'Entrega'}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="font-bold text-white">{row.nomeCliente || '—'}</div>
                            {row.telefoneCliente && (
                              <div className="flex items-center gap-1 mt-1">
                                <Phone className="w-3 h-3 text-slate-400" />
                                <span className="text-xs text-slate-400">{row.telefoneCliente}</span>
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-4 max-w-[300px]">
                            <div className="flex items-start gap-2">
                              <MapPin className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                              <span className="text-xs text-slate-300 whitespace-pre-wrap leading-snug">
                                {retirada ? 'Retirada no balcão' : row.enderecoEntrega || 'Sem endereço'}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <span
                              className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-black uppercase tracking-wide ${statusBadge.className}`}
                            >
                              {statusBadge.label}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-right font-mono font-bold text-emerald-300">
                            {formatCurrency(row.valorTotal)}
                          </td>
                          <td className="px-4 py-4 text-right">
                            <div className="flex flex-wrap justify-end gap-2">
                              {cupomPendente && (
                                <button
                                  type="button"
                                  disabled={isPrinting || !agentOnline}
                                  onClick={() => void handleImprimirCupom()}
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-sky-500/35 bg-sky-500/10 px-3 py-2 text-xs font-black uppercase tracking-wide text-sky-100 hover:bg-sky-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {isPrinting ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <Printer className="w-3.5 h-3.5" />
                                  )}
                                  Cupom
                                </button>
                              )}
                              {podeSairEntrega && (
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => void sairParaEntrega(row.id, row.enderecoEntrega || '')}
                                  className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-600 to-orange-600 px-3 py-2 text-xs font-black uppercase tracking-wide text-white shadow-[0_0_16px_rgba(245,158,11,0.35)] hover:scale-[1.02] transition-all disabled:opacity-50"
                                >
                                  {busy ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <Rocket className="w-3.5 h-3.5" />
                                  )}
                                  Sair p/ Entrega
                                </button>
                              )}
                              {podeConcluirRetirada && (
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => void confirmarEntrega(row.id)}
                                  className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 px-3 py-2 text-xs font-black uppercase tracking-wide text-white shadow-[0_0_16px_rgba(16,185,129,0.35)] hover:scale-[1.02] transition-all disabled:opacity-50"
                                >
                                  {busy ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <CheckCircle className="w-3.5 h-3.5" />
                                  )}
                                  Concluir retirada
                                </button>
                              )}
                              {podeConfirmar && (
                                <>
                                  <button
                                    type="button"
                                    disabled={isPrinting || !agentOnline}
                                    onClick={() => void handleImprimirCupom()}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-sky-500/35 bg-sky-500/10 px-3 py-2 text-xs font-black uppercase tracking-wide text-sky-100 hover:bg-sky-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    {isPrinting ? (
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                      <Printer className="w-3.5 h-3.5" />
                                    )}
                                    Cupom
                                  </button>
                                  <button
                                    type="button"
                                    disabled={busy}
                                    onClick={() => verRota(row.enderecoEntrega || '')}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-sky-500/35 bg-sky-500/10 px-3 py-2 text-xs font-black uppercase tracking-wide text-sky-100 hover:bg-sky-500/20 transition-all"
                                  >
                                    <MapPin className="w-3.5 h-3.5" />
                                    Ver Rota
                                  </button>
                                  <button
                                    type="button"
                                    disabled={busy}
                                    onClick={() => void confirmarEntrega(row.id)}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 px-3 py-2 text-xs font-black uppercase tracking-wide text-white shadow-[0_0_16px_rgba(16,185,129,0.35)] hover:scale-[1.02] transition-all disabled:opacity-50"
                                  >
                                    {busy ? (
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                      <CheckCircle className="w-3.5 h-3.5" />
                                    )}
                                    Confirmar
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
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
                  value={`https://delivery.seusite.com.br/track/${selectedToken}`}
                  size={256}
                  level="H"
                  includeMargin
                />
              </div>
            </div>

            <h3 className="text-xl font-black text-white mb-2">
              Romaneio #{selectedToken.slice(0, 8).toUpperCase()}
            </h3>
            <p className="text-sm text-slate-400 mb-6">
              Escaneie para acompanhar a entrega
            </p>

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
    </Layout>
  );
}
