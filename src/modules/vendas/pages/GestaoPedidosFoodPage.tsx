import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { io, type Socket } from 'socket.io-client';
import {
  Bell,
  CreditCard,
  DollarSign,
  ImageIcon,
  Loader2,
  Map,
  PackageSearch,
  Printer,
  Radio,
  RefreshCw,
  Rocket,
  Smartphone,
  Truck,
  UtensilsCrossed,
  X,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { Layout } from '../../../components/Layout';
import { api, resolveApiBaseUrl } from '../../../services/api';
import { buildKdsSocketAuth } from '../../../services/socket/kdsSocketAuth';
import { extrairSenhaPedido, vendaItensParaLinhasKds } from '../../kds/kdsPedidoUtils';
import {
  CupomImpressaoFood,
  type CupomClienteBloco,
  type CupomImpressaoFoodProps,
  type CupomItemLinha,
} from '../components/CupomImpressaoFood';
import { num, subtotalMesa, type MesaApi } from '../../mesas/types';
import { abrirRotaDelivery } from '../../delivery-tracking/utils/googleMapsUtils';

interface LojaResumoApi {
  nome?: string | null;
  nomeFantasia?: string | null;
  endereco?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  uf?: string | null;
}

interface PagamentoApi {
  tipoPagamento?: string;
  valor?: unknown;
}

interface ItemCardapioComImagem {
  id: string;
  nome: string;
  imagemUrl: string | null;
}

interface ItemPedidoExibicao {
  nome: string;
  quantidade: number;
  imagemUrl: string | null;
  sincronizado: boolean;
}

export interface VendaGestaoFoodApi {
  id: string;
  createdAt?: string;
  origemVenda?: string;
  statusPreparo?: string | null;
  statusEntrega?: string | null;
  numeroPedido?: number | null;
  numeroVenda?: number;
  nomeCliente?: string | null;
  observacoes?: string | null;
  enderecoEntrega?: string | null;
  taxaEntrega?: unknown;
  valorTotal?: unknown;
  itens?: unknown;
  pagamentos?: PagamentoApi[];
  loja?: LojaResumoApi | null;
}

function numDec(v: unknown): number {
  if (v === null || v === undefined) return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function fmtDataHora(iso: string | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

function fmtBrl(n: number): string {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function parseObservacoesDelivery(obs: string): { whatsapp?: string; obsPedido?: string } {
  const whatsappM = obs.match(/WhatsApp:\s*([^\n\r]+)/i);
  const obsPedidoM = obs.match(/Obs\.\s*pedido:\s*([\s\S]+)$/im);
  return {
    whatsapp: whatsappM?.[1]?.trim(),
    obsPedido: obsPedidoM?.[1]?.trim(),
  };
}

function nomeClienteDeVenda(v: VendaGestaoFoodApi, obs: string): string | undefined {
  const direto = v.nomeCliente != null ? String(v.nomeCliente).trim() : '';
  if (direto) return direto;
  const m = obs.match(/^Cliente:\s*([^\n\r]+)/im);
  return m?.[1]?.trim();
}

function statusPreparoLabel(s: string | null | undefined): string {
  const u = String(s ?? 'NENHUM').toUpperCase();
  const map: Record<string, string> = {
    NENHUM: '—',
    RECEBIDO: 'Recebido',
    PREPARANDO: 'Preparando',
    PRONTO: 'Pronto',
    ENTREGUE: 'Entregue',
  };
  return map[u] ?? u;
}

function badgeOrigem(origem: string): { label: string; className: string } {
  const u = origem.toUpperCase();
  if (u === 'TOTEM') {
    return {
      label: 'Totem',
      className: 'bg-amber-500/15 text-amber-300 border border-amber-500/35',
    };
  }
  if (u === 'DELIVERY') {
    return {
      label: 'Delivery',
      className: 'bg-sky-500/15 text-sky-300 border border-sky-500/35',
    };
  }
  return {
    label: origem,
    className: 'bg-slate-500/15 text-slate-300 border border-white/15',
  };
}

function badgeStatus(status: string | null | undefined): string {
  const u = String(status ?? '').toUpperCase();
  if (u === 'ENTREGUE') return 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/35';
  if (u === 'PRONTO') return 'bg-violet-500/15 text-violet-200 border border-violet-500/35';
  if (u === 'PREPARANDO') return 'bg-orange-500/15 text-orange-200 border border-orange-500/35';
  if (u === 'RECEBIDO') return 'bg-slate-500/15 text-slate-300 border border-white/15';
  return 'bg-slate-600/20 text-slate-400 border border-white/10';
}

function badgeStatusEntrega(status: string | null | undefined): { label: string; className: string } | null {
  const u = String(status ?? 'PENDENTE').toUpperCase();
  if (u === 'SAIU_ENTREGA') {
    return {
      label: 'SAIU PARA ENTREGA',
      className: 'bg-amber-500/15 text-amber-300 border border-amber-500/35',
    };
  }
  if (u === 'ENTREGUE') {
    return {
      label: 'ENTREGUE',
      className: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/35',
    };
  }
  return null;
}

function vendaParaCupomProps(v: VendaGestaoFoodApi): CupomImpressaoFoodProps {
  const loja = v.loja;
  const lojaNome =
    (loja?.nomeFantasia != null && String(loja.nomeFantasia).trim()) ||
    (loja?.nome != null && String(loja.nome).trim()) ||
    'Loja';

  const raw = v as unknown as Record<string, unknown>;
  const senha = extrairSenhaPedido(raw);
  const origem = String(v.origemVenda ?? '').toUpperCase();
  const obs = v.observacoes != null ? String(v.observacoes) : '';
  const { whatsapp, obsPedido } = parseObservacoesDelivery(obs);
  const nome = nomeClienteDeVenda(v, obs);

  let cliente: CupomClienteBloco | null = null;
  if (origem === 'DELIVERY') {
    cliente = {
      nome: nome || undefined,
      whatsapp: whatsapp || undefined,
      endereco: v.enderecoEntrega != null ? String(v.enderecoEntrega).trim() : undefined,
      obsPedido: obsPedido || undefined,
    };
  }

  const itens: CupomItemLinha[] = vendaItensParaLinhasKds(v.itens).map((l) => ({
    quantidade: l.quantidade,
    nome: l.nome,
    adicionais: l.adicionais,
    observacoes: l.observacoes,
  }));

  const total = numDec(v.valorTotal);
  const taxa = numDec(v.taxaEntrega);
  const subtotal = Math.max(0, Math.round((total - taxa) * 100) / 100);

  const pagamentos: Array<{ tipo: string; valor: number }> = Array.isArray(v.pagamentos)
    ? v.pagamentos.map((p) => ({
        tipo: String(p.tipoPagamento ?? ''),
        valor: numDec(p.valor),
      }))
    : [];

  return {
    lojaNome,
    dataHoraTexto: fmtDataHora(v.createdAt),
    senha,
    origemLabel: origem,
    cliente,
    itens,
    subtotal,
    taxaEntrega: taxa,
    total,
    pagamentos,
  };
}

export function imprimirCupomFood(v: VendaGestaoFoodApi): void {
  const w = window.open('', '_blank', 'noopener,noreferrer,width=360,height=720');
  if (!w) {
    toast.error('Permita pop-ups para imprimir o cupom.');
    return;
  }

  w.document.open();
  w.document.write(
    '<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Cupom</title></head><body style="margin:0;background:#fff;"><div id="cupom-root"></div></body></html>'
  );
  w.document.close();

  const el = w.document.getElementById('cupom-root');
  if (!el) {
    w.close();
    toast.error('Falha ao montar a janela de impressão.');
    return;
  }

  const root = createRoot(el);
  root.render(<CupomImpressaoFood {...vendaParaCupomProps(v)} />);

  const rodarPrint = () => {
    try {
      w.focus();
      w.print();
    } catch {
      /* ignore */
    }
  };

  w.onload = () => {
    window.setTimeout(rodarPrint, 200);
  };
  window.setTimeout(rodarPrint, 400);
}

type SocketStatus = 'idle' | 'connecting' | 'connected' | 'error';

type FormaPagamentoMesaCaixa = 'DINHEIRO' | 'PIX' | 'CARTAO_CREDITO';

function tocarAlertaMesaFechamento(): void {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const beep = (freq: number, t0: number) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = freq;
      o.connect(g);
      g.connect(ctx.destination);
      g.gain.setValueAtTime(0.12, t0);
      g.gain.exponentialRampToValueAtTime(0.01, t0 + 0.18);
      o.start(t0);
      o.stop(t0 + 0.18);
    };
    beep(880, ctx.currentTime);
    beep(660, ctx.currentTime + 0.22);
  } catch {
    /* ignore */
  }
}

export function GestaoPedidosFoodPage() {
  const [pedidos, setPedidos] = useState<VendaGestaoFoodApi[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [socketStatus, setSocketStatus] = useState<SocketStatus>('idle');
  const [savingIds, setSavingIds] = useState<Set<string>>(() => new Set());
  const refetchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [aba, setAba] = useState<'pedidos' | 'mesas'>('pedidos');
  const [mesasAguardando, setMesasAguardando] = useState<MesaApi[]>([]);
  const [carregandoMesas, setCarregandoMesas] = useState(false);
  const [mesaDetalhe, setMesaDetalhe] = useState<MesaApi | null>(null);
  const mesaDetalheRef = useRef<MesaApi | null>(null);
  mesaDetalheRef.current = mesaDetalhe;

  const [formaPagamentoMesa, setFormaPagamentoMesa] = useState<FormaPagamentoMesaCaixa>('DINHEIRO');
  const [liberandoMesa, setLiberandoMesa] = useState(false);
  const [isentarTaxaServico, setIsentarTaxaServico] = useState(false);
  const [cardapioProdutos, setCardapioProdutos] = useState<ItemCardapioComImagem[]>([]);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const { data } = await api.get<VendaGestaoFoodApi[]>('/api/vendas/gestao-food');
      setPedidos(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Gestão food: falha ao listar', e);
      toast.error('Não foi possível carregar os pedidos do dia.');
    } finally {
      setCarregando(false);
    }
  }, []);

  const agendarRecarga = useCallback(() => {
    if (refetchDebounce.current) clearTimeout(refetchDebounce.current);
    refetchDebounce.current = setTimeout(() => {
      void carregar();
    }, 320);
  }, [carregar]);

  const carregarMesas = useCallback(async () => {
    setCarregandoMesas(true);
    try {
      const token = localStorage.getItem('token');
      const { data } = await api.get<MesaApi[]>('/api/pdv/mesas', {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const list = Array.isArray(data) ? data : [];
      setMesasAguardando(
        list.filter((m) => String(m.status).toUpperCase() === 'FECHANDO')
      );
    } catch (e) {
      console.error('Gestão food: falha ao listar mesas', e);
      toast.error('Não foi possível carregar mesas aguardando pagamento.');
    } finally {
      setCarregandoMesas(false);
    }
  }, []);

  const carregarCardapio = useCallback(async () => {
    try {
      const { data } = await api.get<{ dados?: { itens?: Array<{ id: string; nome: string; imagemUrl?: string | null }> } }>('/api/cardapio/gestao');
      const itens = data?.dados?.itens ?? [];
      setCardapioProdutos(itens.map((item) => ({
        id: item.id,
        nome: item.nome,
        imagemUrl: item.imagemUrl ?? null,
      })));
    } catch {
      console.error('Gestão food: falha ao carregar cardápio');
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  useEffect(() => {
    void carregarCardapio();
  }, [carregarCardapio]);

  useEffect(() => {
    if (aba === 'mesas') void carregarMesas();
  }, [aba, carregarMesas]);

  useEffect(() => {
    if (mesaDetalhe) {
      setFormaPagamentoMesa('DINHEIRO');
      setIsentarTaxaServico(false);
    }
  }, [mesaDetalhe?.id]);

  const resumoPagamentoModal = useMemo(() => {
    const m = mesaDetalhe;
    if (!m) return null;
    const p = m.pendenciaFechamento;
    const subtotal =
      p != null && Number.isFinite(Number(p.subtotal))
        ? round2(Number(p.subtotal))
        : subtotalMesa(m);
    const taxa =
      p?.incluiTaxaServico && Number(p.taxaServico) > 0 ? round2(Number(p.taxaServico)) : 0;
    const temTaxa = taxa > 0 && p?.incluiTaxaServico === true;
    return { subtotal, taxa, temTaxa, pessoas: p?.pessoas ?? 1 };
  }, [mesaDetalhe]);

  const totalPagarModal = useMemo(() => {
    if (!resumoPagamentoModal) return 0;
    const { subtotal, taxa, temTaxa } = resumoPagamentoModal;
    if (!temTaxa) return subtotal;
    return isentarTaxaServico ? subtotal : round2(subtotal + taxa);
  }, [resumoPagamentoModal, isentarTaxaServico]);

  const valorPorPessoaModal = useMemo(() => {
    if (!resumoPagamentoModal) return 0;
    const n = Math.max(1, Math.floor(Number(resumoPagamentoModal.pessoas)) || 1);
    return round2(totalPagarModal / n);
  }, [resumoPagamentoModal, totalPagarModal]);

  const cardapioMap = useMemo(() => {
    const map = new window.Map<string, ItemCardapioComImagem>();
    for (const p of cardapioProdutos) {
      map.set(p.nome.toLowerCase().trim(), p);
    }
    return map;
  }, [cardapioProdutos]);

  function obterItensComImagens(itensRaw: unknown): ItemPedidoExibicao[] {
    if (!Array.isArray(itensRaw)) return [];
    return itensRaw.map((item: Record<string, unknown>) => {
      const nome = String(item.nome ?? '').toLowerCase().trim();
      const match = cardapioMap.get(nome);
      const quantidade = num(item.quantidade);
      return {
        nome: String(item.nome ?? ''),
        quantidade,
        imagemUrl: match?.imagemUrl ?? null,
        sincronizado: !!match?.imagemUrl,
      };
    });
  }

  useEffect(() => {
    const auth = buildKdsSocketAuth();
    if (!auth?.token) {
      setSocketStatus('error');
      return;
    }

    setSocketStatus('connecting');
    const socket: Socket = io(resolveApiBaseUrl(), {
      auth,
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 8,
      reconnectionDelay: 1200,
    });

    const onNovo = (payload: unknown) => {
      const o =
        payload && typeof payload === 'object'
          ? String((payload as Record<string, unknown>).origemVenda ?? '').toUpperCase()
          : '';
      if (o === 'TOTEM' || o === 'DELIVERY') agendarRecarga();
    };

    const onStatus = () => {
      agendarRecarga();
    };

    const onMesaFechamento = (payload: unknown) => {
      const rec =
        payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : null;
      const n = rec?.numeroMesa != null ? Number(rec.numeroMesa) : NaN;
      tocarAlertaMesaFechamento();
      toast.info(Number.isFinite(n) ? `Mesa ${n} pediu a conta!` : 'Uma mesa pediu a conta!');
      void carregarMesas();
    };

    const onMesaLiberada = (payload: unknown) => {
      void carregarMesas();
      const rec =
        payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : null;
      const n = rec?.numeroMesa != null ? Number(rec.numeroMesa) : NaN;
      const aberto = mesaDetalheRef.current;
      if (aberto && Number.isFinite(n) && aberto.numero === n) {
        setMesaDetalhe(null);
      }
    };

    const onConnect = () => setSocketStatus('connected');
    const onDisconnect = () => setSocketStatus('idle');
    const onConnectError = () => setSocketStatus('error');

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);
    socket.on('novo-pedido-cozinha', onNovo);
    socket.on('status-pedido-atualizado', onStatus);
    socket.on('mesa-fechamento-solicitado', onMesaFechamento);
    socket.on('mesa-liberada', onMesaLiberada);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      socket.off('novo-pedido-cozinha', onNovo);
      socket.off('status-pedido-atualizado', onStatus);
      socket.off('mesa-fechamento-solicitado', onMesaFechamento);
      socket.off('mesa-liberada', onMesaLiberada);
      socket.disconnect();
      if (refetchDebounce.current) clearTimeout(refetchDebounce.current);
    };
  }, [agendarRecarga, carregarMesas]);

  useEffect(() => {
    const POLLING_INTERVAL = 10000;
    const interval = setInterval(() => {
      if (aba === 'pedidos' && !carregando) {
        void carregar();
      }
    }, POLLING_INTERVAL);
    return () => clearInterval(interval);
  }, [aba, carregando, carregar]);

  const despachar = async (id: string) => {
    setSavingIds((s) => new Set(s).add(id));
    try {
      await api.patch(`/api/vendas/${id}/status-preparo`, { statusPreparo: 'ENTREGUE' });
      toast.success('Pedido marcado como entregue.');
      await carregar();
    } catch (e) {
      console.error('Gestão food: despacho', e);
      toast.error('Não foi possível despachar o pedido.');
    } finally {
      setSavingIds((s) => {
        const n = new Set(s);
        n.delete(id);
        return n;
      });
    }
  };

  const sairParaEntrega = async (id: string, endereco: string) => {
    setSavingIds((s) => new Set(s).add(id));
    try {
      await api.post(`/api/entregas/${id}/sair-entrega`);
      toast.success('Motoboy saiu para entrega!');
      await carregar();
    } catch (e) {
      console.error('Gestão food: sair para entrega', e);
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
      await carregar();
    } catch (e) {
      console.error('Gestão food: confirmar entrega', e);
      const msg =
        e && typeof e === 'object' && 'response' in e
          ? String((e as { response?: { data?: { error?: string } } }).response?.data?.error ?? '')
          : 'Não foi possível confirmar a entrega.';
      toast.error(msg);
    } finally {
      setSavingIds((s) => {
        const n = new Set(s);
        n.delete(id);
        return n;
      });
    }
  };

  const verRotaDelivery = (endereco: string) => {
    if (!endereco) {
      toast.error('Endereço não disponível para calcular rota.');
      return;
    }
    const loja = pedidos.find((p) => p.loja);
    const lojaData = loja?.loja;
    const origem = 'endereco' in (lojaData || {})
      ? String((lojaData as Record<string, unknown>).endereco || 'Loja')
      : `${lojaData?.logradouro || ''} ${lojaData?.numero || ''}, ${lojaData?.bairro || ''}, ${lojaData?.cidade || ''} ${lojaData?.uf || ''}`.trim() || 'Loja';
    abrirRotaDelivery(origem, endereco);
  };

  const confirmarPagamentoLiberarMesa = async () => {
    const m = mesaDetalheRef.current;
    if (!m) return;
    setLiberandoMesa(true);
    try {
      await api.post(`/api/pdv/mesas/${m.numero}/liberar`, {
        tipoPagamento: formaPagamentoMesa,
        isentarTaxaServico,
      });
      toast.success('Pagamento registrado e mesa liberada.');
      setMesaDetalhe(null);
      void carregarMesas();
    } catch (e) {
      console.error('Gestão food: liberar mesa', e);
      const msg =
        e && typeof e === 'object' && 'response' in e
          ? String((e as { response?: { data?: { error?: string } } }).response?.data?.error ?? '')
          : '';
      toast.error(msg || 'Não foi possível liberar a mesa.');
    } finally {
      setLiberandoMesa(false);
    }
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
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
                <PackageSearch className="w-8 h-8 text-violet-400 shrink-0" />
                Gestão de pedidos Food
              </h1>
              <p className="text-slate-400 text-sm mt-1">
                Totem e delivery do dia — impressão no caixa e despacho para o motoboy.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex rounded-xl border border-white/10 bg-[#08101f] p-1">
                <button
                  type="button"
                  onClick={() => setAba('pedidos')}
                  className={`rounded-lg px-3 py-2 text-xs font-black uppercase tracking-wide transition-all ${
                    aba === 'pedidos'
                      ? 'bg-violet-600 text-white shadow-[0_0_12px_rgba(139,92,246,0.35)]'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Pedidos
                </button>
                <button
                  type="button"
                  onClick={() => setAba('mesas')}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-black uppercase tracking-wide transition-all ${
                    aba === 'mesas'
                      ? 'bg-amber-500/90 text-[#060816] shadow-[0_0_12px_rgba(245,158,11,0.35)]'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <UtensilsCrossed className="w-3.5 h-3.5" />
                  Mesas (pagamento)
                </button>
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
              <button
                type="button"
                onClick={() => {
                  void carregar();
                  if (aba === 'mesas') void carregarMesas();
                }}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-bold text-slate-200 hover:bg-white/10 transition-all"
              >
                <RefreshCw
                  className={`w-4 h-4 ${carregando || (aba === 'mesas' && carregandoMesas) ? 'animate-spin' : ''}`}
                />
                Atualizar
              </button>
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-[#08101f]/90 backdrop-blur-xl shadow-[0_25px_60px_rgba(0,0,0,0.35)] overflow-hidden">
            {aba === 'mesas' ? (
              <>
                {carregandoMesas && mesasAguardando.length === 0 ? (
                  <div className="flex justify-center py-24">
                    <Loader2 className="w-10 h-10 text-amber-400 animate-spin" />
                  </div>
                ) : mesasAguardando.length === 0 ? (
                  <p className="text-center text-slate-500 py-16 px-6">
                    Nenhuma mesa aguardando pagamento no momento.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm min-w-[720px]">
                      <thead>
                        <tr className="border-b border-white/10 text-[10px] font-black uppercase tracking-widest text-slate-500">
                          <th className="px-4 py-4">Mesa</th>
                          <th className="px-4 py-4">Total</th>
                          <th className="px-4 py-4">Racha-conta</th>
                          <th className="px-4 py-4">Solicitado</th>
                          <th className="px-4 py-4 text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {mesasAguardando.map((m) => {
                          const p = m.pendenciaFechamento;
                          const total = p?.total ?? subtotalMesa(m);
                          const quando = p?.solicitadoEm
                            ? fmtDataHora(p.solicitadoEm)
                            : '—';
                          return (
                            <tr
                              key={m.id}
                              className="border-b border-white/5 hover:bg-amber-500/[0.06] transition-colors align-top"
                            >
                              <td className="px-4 py-4">
                                <div className="flex items-center gap-2">
                                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/15 text-amber-200">
                                    <UtensilsCrossed className="w-4 h-4" />
                                  </span>
                                  <span className="text-xl font-black text-white">{m.numero}</span>
                                </div>
                              </td>
                              <td className="px-4 py-4 font-mono font-bold text-emerald-300">
                                {fmtBrl(total)}
                              </td>
                              <td className="px-4 py-4 text-slate-300">
                                {p ? (
                                  <div className="space-y-1">
                                    <div className="font-bold text-white">
                                      {p.pessoas} x {fmtBrl(p.valorPorPessoa)}
                                    </div>
                                    <div className="text-[10px] text-slate-500">
                                      Subtotal {fmtBrl(p.subtotal)}
                                      {p.incluiTaxaServico
                                        ? ` · Taxa ${fmtBrl(p.taxaServico)}`
                                        : ''}
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-slate-500 text-xs">Sem snapshot</span>
                                )}
                              </td>
                              <td className="px-4 py-4 text-xs text-slate-400">{quando}</td>
                              <td className="px-4 py-4 text-right">
                                <button
                                  type="button"
                                  onClick={() => setMesaDetalhe(m)}
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-xs font-black uppercase tracking-wide text-amber-100 hover:bg-amber-500/20 transition-all"
                                >
                                  <Bell className="w-3.5 h-3.5" />
                                  Ver conta
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            ) : carregando && pedidos.length === 0 ? (
              <div className="flex justify-center py-24">
                <Loader2 className="w-10 h-10 text-violet-400 animate-spin" />
              </div>
            ) : pedidos.length === 0 ? (
              <p className="text-center text-slate-500 py-16 px-6">
                Nenhum pedido Totem/Delivery hoje nesta loja.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm min-w-[900px]">
                  <thead>
                    <tr className="border-b border-white/10 text-[10px] font-black uppercase tracking-widest text-slate-500">
                      <th className="px-4 py-4">Senha / ID</th>
                      <th className="px-4 py-4">Origem</th>
                      <th className="px-4 py-4">Cliente / endereço</th>
                      <th className="px-4 py-4">Itens</th>
                      <th className="px-4 py-4">Status</th>
                      <th className="px-4 py-4 text-right">Total</th>
                      <th className="px-4 py-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pedidos.map((row) => {
                      const raw = row as unknown as Record<string, unknown>;
                      const senha = extrairSenhaPedido(raw);
                      const origem = String(row.origemVenda ?? '').toUpperCase();
                      const ob = badgeOrigem(origem);
                      const st = String(row.statusPreparo ?? '').toUpperCase();
                      const total = numDec(row.valorTotal);
                      const obs = row.observacoes != null ? String(row.observacoes) : '';
                      const nome = nomeClienteDeVenda(row, obs);
                      const endereco =
                        row.enderecoEntrega != null ? String(row.enderecoEntrega).trim() : '';
                      const podeDespachar = origem === 'DELIVERY' && st === 'PRONTO';
                      const statusEntrega = badgeStatusEntrega(row.statusEntrega);
                      const podeSairEntrega = origem === 'DELIVERY' && st === 'PRONTO' && row.statusEntrega !== 'SAIU_ENTREGA' && row.statusEntrega !== 'ENTREGUE';
                      const podeConfirmarEntrega = origem === 'DELIVERY' && row.statusEntrega === 'SAIU_ENTREGA';
                      const busy = savingIds.has(row.id);

                      return (
                        <tr
                          key={row.id}
                          className="border-b border-white/5 hover:bg-white/[0.03] transition-colors align-top"
                        >
                          <td className="px-4 py-4">
                            <div className="font-black text-lg text-white tracking-tight">{senha}</div>
                            <div className="text-[10px] text-slate-500 font-mono mt-1">{row.id.slice(0, 8)}…</div>
                          </td>
                          <td className="px-4 py-4">
                            <span
                              className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-black uppercase tracking-wide ${ob.className}`}
                            >
                              {ob.label}
                            </span>
                          </td>
                          <td className="px-4 py-4 max-w-[340px]">
                            {origem === 'DELIVERY' ? (
                              <>
                                <div className="font-bold text-white">{nome || '—'}</div>
                                {endereco ? (
                                  <div className="text-xs text-slate-400 mt-1 whitespace-pre-wrap leading-snug">
                                    {endereco}
                                  </div>
                                ) : (
                                  <div className="text-xs text-slate-500 mt-1">Sem endereço</div>
                                )}
                              </>
                            ) : (
                              <span className="text-slate-500 text-xs">Retirada no balcão (Totem)</span>
                            )}
                          </td>
                          <td className="px-4 py-4">
                            {(() => {
                              const itensExibicao = obterItensComImagens(row.itens);
                              if (itensExibicao.length === 0) {
                                return <span className="text-slate-500 text-xs">Sem itens</span>;
                              }
                              return (
                                <div className="flex flex-wrap gap-1.5 max-w-[180px]">
                                  {itensExibicao.slice(0, 4).map((item, idx) => (
                                    <div key={idx} className="relative">
                                      {item.imagemUrl ? (
                                        <div className="relative">
                                          <img
                                            src={item.imagemUrl}
                                            alt={item.nome}
                                            className="w-12 h-12 rounded-lg border border-white/10 object-cover shadow-sm"
                                            onError={(e) => {
                                              (e.target as HTMLImageElement).style.display = 'none';
                                            }}
                                          />
                                          {item.sincronizado && (
                                            <span className="absolute -top-1 -right-1 text-[8px] bg-emerald-600/20 text-emerald-400 px-1 py-0.5 rounded-full border border-emerald-500/30">
                                              Sinc
                                            </span>
                                          )}
                                        </div>
                                      ) : (
                                        <div className="w-12 h-12 rounded-lg bg-slate-800 border border-white/10 flex items-center justify-center">
                                          <ImageIcon size={14} className="text-slate-500" />
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                  {itensExibicao.length > 4 && (
                                    <div className="w-12 h-12 rounded-lg bg-slate-800/80 border border-white/10 flex items-center justify-center">
                                      <span className="text-[10px] text-slate-400 font-bold">+{itensExibicao.length - 4}</span>
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                          </td>
                          <td className="px-4 py-4">
                            <span
                              className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-black uppercase tracking-wide ${badgeStatus(row.statusPreparo)}`}
                            >
                              {statusPreparoLabel(row.statusPreparo)}
                            </span>
                            {origem === 'DELIVERY' && statusEntrega && (
                              <span
                                className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-black uppercase tracking-wide mt-1 ${statusEntrega.className}`}
                              >
                                {statusEntrega.label}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-4 text-right font-mono font-bold text-emerald-300">
                            {fmtBrl(total)}
                          </td>
                          <td className="px-4 py-4 text-right">
                            <div className="flex flex-wrap justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => imprimirCupomFood(row)}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-black uppercase tracking-wide text-slate-200 hover:bg-white/10 transition-all"
                              >
                                <Printer className="w-3.5 h-3.5" />
                                Imprimir
                              </button>
                              {podeSairEntrega ? (
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => void sairParaEntrega(row.id, endereco)}
                                  className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-600 to-orange-600 px-3 py-2 text-xs font-black uppercase tracking-wide text-white shadow-[0_0_16px_rgba(245,158,11,0.35)] hover:scale-[1.02] transition-all disabled:opacity-50"
                                >
                                  {busy ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <Rocket className="w-3.5 h-3.5" />
                                  )}
                                  Sair p/ entrega
                                </button>
                              ) : null}
                              {podeConfirmarEntrega ? (
                                <>
                                  <button
                                    type="button"
                                    disabled={busy}
                                    onClick={() => verRotaDelivery(endereco)}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-sky-500/35 bg-sky-500/10 px-3 py-2 text-xs font-black uppercase tracking-wide text-sky-100 hover:bg-sky-500/20 transition-all"
                                  >
                                    <Map className="w-3.5 h-3.5" />
                                    Ver rota
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
                                      <Truck className="w-3.5 h-3.5" />
                                    )}
                                    Confirmar
                                  </button>
                                </>
                              ) : null}
                              {podeDespachar && !podeSairEntrega ? (
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => void despachar(row.id)}
                                  className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 px-3 py-2 text-xs font-black uppercase tracking-wide text-white shadow-[0_0_16px_rgba(16,185,129,0.35)] hover:scale-[1.02] transition-all disabled:opacity-50"
                                >
                                  {busy ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <Truck className="w-3.5 h-3.5" />
                                  )}
                                  Despachar
                                </button>
                              ) : null}
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

          {mesaDetalhe ? (
            <div className="fixed inset-0 z-[100] flex items-end justify-center bg-[#020617]/80 backdrop-blur-sm sm:items-center p-4">
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="gestao-pedidos-mesa-titulo"
                className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-[28px] border border-amber-500/25 bg-[#08101f] shadow-[0_25px_80px_rgba(0,0,0,0.6)]"
              >
                <div className="flex shrink-0 items-start justify-between gap-3 border-b border-white/10 p-5">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-amber-400">
                      Aguardando pagamento
                    </p>
                    <h2
                      id="gestao-pedidos-mesa-titulo"
                      className="mt-1 text-2xl font-black text-white"
                    >
                      Mesa {mesaDetalhe.numero}
                    </h2>
                    {mesaDetalhe.pendenciaFechamento ? (
                      <p className="text-sm text-slate-400 mt-2">
                        Split (total atual):{' '}
                        <span className="text-white font-bold">
                          {Math.max(1, Math.floor(Number(mesaDetalhe.pendenciaFechamento.pessoas)) || 1)} x{' '}
                          {fmtBrl(valorPorPessoaModal)}
                        </span>{' '}
                        · {fmtBrl(totalPagarModal)}
                      </p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => setMesaDetalhe(null)}
                    className="rounded-full border border-white/10 bg-white/5 p-2 text-slate-300 hover:text-white"
                    aria-label="Fechar"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="p-5 overflow-y-auto flex-1 space-y-4">
                  <p className="text-xs text-slate-500 leading-relaxed">
                    A venda será gerada para NFC-e com o total abaixo. A taxa de serviço entra como item fiscal
                    dedicado, salvo se isenta.
                  </p>

                  {resumoPagamentoModal ? (
                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 space-y-2">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                        Resumo para pagamento
                      </p>
                      <div className="flex justify-between text-sm text-slate-300">
                        <span>Subtotal</span>
                        <span className="font-mono font-bold text-white">
                          {fmtBrl(resumoPagamentoModal.subtotal)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm text-slate-300">
                        <span>Taxa de serviço (10%)</span>
                        <span
                          className={`font-mono font-bold ${
                            resumoPagamentoModal.temTaxa && isentarTaxaServico
                              ? 'text-slate-500 line-through'
                              : 'text-amber-200/90'
                          }`}
                        >
                          {resumoPagamentoModal.temTaxa ? fmtBrl(resumoPagamentoModal.taxa) : fmtBrl(0)}
                        </span>
                      </div>
                      <div className="flex justify-between border-t border-white/10 pt-3 text-base font-black text-white">
                        <span>Total a pagar</span>
                        <span className="font-mono text-emerald-300">{fmtBrl(totalPagarModal)}</span>
                      </div>
                    </div>
                  ) : null}

                  {resumoPagamentoModal?.temTaxa ? (
                    <label className="flex cursor-pointer items-center gap-4 rounded-2xl border border-amber-500/35 bg-amber-500/10 px-4 py-3">
                      <input
                        type="checkbox"
                        checked={isentarTaxaServico}
                        onChange={(e) => setIsentarTaxaServico(e.target.checked)}
                        className="h-5 w-5 shrink-0 accent-amber-400"
                      />
                      <div>
                        <p className="text-sm font-black text-amber-100">Isentar taxa de serviço</p>
                        <p className="text-[11px] text-amber-200/70 mt-0.5">
                          Cliente recusou pagar os 10% — o total cai para o subtotal e a NFC-e não incluirá a linha da
                          taxa.
                        </p>
                      </div>
                    </label>
                  ) : null}

                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">
                      Forma de pagamento
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {(
                        [
                          { id: 'DINHEIRO' as const, label: 'Dinheiro', Icon: DollarSign },
                          { id: 'PIX' as const, label: 'PIX', Icon: Smartphone },
                          { id: 'CARTAO_CREDITO' as const, label: 'Cartão', Icon: CreditCard },
                        ] as const
                      ).map(({ id, label, Icon }) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => setFormaPagamentoMesa(id)}
                          className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-3 text-[11px] font-black uppercase tracking-wide transition-all ${
                            formaPagamentoMesa === id
                              ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-100'
                              : 'border-white/10 bg-white/5 text-slate-400 hover:border-white/20'
                          }`}
                        >
                          <Icon className="w-5 h-5" />
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <ul className="divide-y divide-white/10 rounded-2xl border border-white/10">
                    {(mesaDetalhe.pendenciaFechamento?.itens?.length
                      ? mesaDetalhe.pendenciaFechamento.itens
                      : (mesaDetalhe.itens ?? []).map((it) => ({
                          nome: it.itemCardapio?.nome ?? it.produto.nome,
                          quantidade: num(it.quantidade),
                          valorTotal: num(it.valorTotal),
                        }))
                    ).map((it, idx) => (
                      <li key={`${it.nome}-${idx}`} className="flex gap-3 px-3 py-3 text-sm">
                        <span className="font-bold text-slate-400">{it.quantidade}x</span>
                        <span className="flex-1 text-white">{it.nome}</span>
                        <span className="font-mono text-emerald-200">{fmtBrl(it.valorTotal)}</span>
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    disabled={liberandoMesa}
                    onClick={() => void confirmarPagamentoLiberarMesa()}
                    className="w-full rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 py-4 text-sm font-black uppercase tracking-wide text-white shadow-[0_0_24px_rgba(16,185,129,0.35)] transition-all active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {liberandoMesa ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : null}
                    Confirmar pagamento e liberar mesa
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </Layout>
  );
}
