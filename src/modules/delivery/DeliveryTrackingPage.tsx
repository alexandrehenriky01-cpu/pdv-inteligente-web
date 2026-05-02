import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useOutletContext, useParams } from 'react-router-dom';
import { io, type Socket } from 'socket.io-client';
import {
  ArrowLeft,
  Bell,
  ChefHat,
  Check,
  CheckCircle2,
  Loader2,
  MapPin,
  Package,
  Radio,
  Receipt,
  ShoppingBag,
  Store,
  Truck,
  type LucideIcon,
} from 'lucide-react';
import { resolveApiBaseUrl } from '../../services/api';
import {
  getDeliveryPedidoTracking,
  type DeliveryPedidoTrackingDTO,
  type TipoPedidoTracking,
  type TrackingStatusCliente,
} from '../../services/api/deliveryTrackingApi';
import { buildDeliveryTrackingSocketAuth } from '../../services/socket/deliveryTrackingSocketAuth';
import type { DeliveryOutletContext } from './deliveryOutletContext';

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function formatBrl(n: number): string {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatSenha(np: number | null | undefined, nv?: number): string {
  if (np != null && Number.isFinite(Number(np))) {
    return String(np).padStart(3, '0').slice(-3);
  }
  return String((nv ?? 0) % 1000).padStart(3, '0');
}

function ehRetiradaPedido(tipo: TipoPedidoTracking | string | null | undefined): boolean {
  return String(tipo ?? 'DELIVERY').toUpperCase() === 'RETIRADA_BALCAO';
}

function getCustomerTrackingStatus(
  statusEntrega: string | null | undefined,
  statusPreparo: string | null | undefined,
  explicitTrackingStatus: string | null | undefined,
  tipoPedido: TipoPedidoTracking | string | null | undefined
): TrackingStatusCliente {
  const explicit = String(explicitTrackingStatus ?? '').toUpperCase().trim();
  const validExplicit = new Set([
    'RECEBIDO',
    'NA_COZINHA',
    'SAIU_PARA_ENTREGA',
    'ENTREGUE',
    'PRONTO_PARA_RETIRADA',
    'RETIRADO',
    'CANCELADO_LOJA',
  ]);
  if (validExplicit.has(explicit)) {
    return explicit as TrackingStatusCliente;
  }

  const entrega = String(statusEntrega ?? '').toUpperCase().trim();
  const preparo = String(statusPreparo ?? '').toUpperCase().trim();
  if (preparo === 'CANCELADO') {
    return 'CANCELADO_LOJA';
  }
  if (entrega === 'CANCELADO') {
    return 'CANCELADO_LOJA';
  }

  if (ehRetiradaPedido(tipoPedido)) {
    if (entrega === 'ENTREGUE' || preparo === 'ENTREGUE') return 'RETIRADO';
    if (preparo === 'PRONTO') return 'PRONTO_PARA_RETIRADA';
    if (preparo === 'PREPARANDO') return 'NA_COZINHA';
    return 'RECEBIDO';
  }

  if (entrega === 'ENTREGUE') return 'ENTREGUE';
  if (entrega === 'EM_ROTA' || entrega === 'SAIU_PARA_ENTREGA' || entrega === 'SAIU_ENTREGA') {
    return 'SAIU_PARA_ENTREGA';
  }
  if (preparo === 'PREPARANDO' || preparo === 'PRONTO') return 'NA_COZINHA';
  return 'RECEBIDO';
}

function stepIndexFromTrackingStatus(status: TrackingStatusCliente, retirada: boolean): number {
  if (retirada) {
    if (status === 'RETIRADO') return 3;
    if (status === 'PRONTO_PARA_RETIRADA') return 2;
    if (status === 'NA_COZINHA') return 1;
    return 0;
  }
  if (status === 'ENTREGUE') return 3;
  if (status === 'SAIU_PARA_ENTREGA') return 2;
  if (status === 'NA_COZINHA') return 1;
  return 0;
}

const STEPS_DELIVERY = [
  { id: 'recebido', titulo: 'Recebido', subtitulo: 'Pendente' },
  { id: 'cozinha', titulo: 'Em preparo', subtitulo: 'Preparando / aguardando entrega' },
  { id: 'rota', titulo: 'Saiu p/ entrega', subtitulo: 'Em rota' },
  { id: 'entregue', titulo: 'Entregue', subtitulo: 'Concluído' },
] as const;

const STEPS_RETIRADA = [
  { id: 'recebido', titulo: 'Recebido', subtitulo: 'Pendente' },
  { id: 'cozinha', titulo: 'Em preparo', subtitulo: 'Preparando' },
  { id: 'pronto', titulo: 'Pronto p/ retirada', subtitulo: 'Compare ao balcão' },
  { id: 'retirado', titulo: 'Retirado', subtitulo: 'Concluído' },
] as const;

const STEP_ICONS: Record<string, LucideIcon> = {
  recebido: Receipt,
  cozinha: ChefHat,
  rota: Truck,
  entregue: CheckCircle2,
  pronto: Bell,
  retirado: CheckCircle2,
};

const STATUS_LABEL: Record<TrackingStatusCliente, string> = {
  RECEBIDO: 'Pedido recebido',
  NA_COZINHA: 'Em preparo',
  SAIU_PARA_ENTREGA: 'Saiu para entrega',
  ENTREGUE: 'Pedido entregue',
  PRONTO_PARA_RETIRADA: 'Pronto para retirada',
  RETIRADO: 'Pedido retirado',
  CANCELADO_LOJA: 'Cancelado',
};

type SocketStatus = 'idle' | 'connecting' | 'connected' | 'error';

export function DeliveryTrackingPage() {
  const { lojaPublicKey: lojaKeyCtx, loja } = useOutletContext<DeliveryOutletContext>();
  const { slug: slugParam, pedidoId: pedidoIdParam } = useParams<{
    slug: string;
    pedidoId: string;
  }>();

  const lojaPublicKey = (slugParam ?? lojaKeyCtx ?? '').trim();
  const idLojaParaChecagem = loja?.id ?? (UUID.test(lojaPublicKey) ? lojaPublicKey : '');
  const pedidoId = (pedidoIdParam ?? '').trim();

  const [pedido, setPedido] = useState<DeliveryPedidoTrackingDTO | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [socketStatus, setSocketStatus] = useState<SocketStatus>('idle');

  const aplicarPayloadStatus = useCallback(
    (payload: unknown) => {
      if (!payload || typeof payload !== 'object') return;
      const p = payload as Record<string, unknown>;
      if (String(p.id ?? '') !== pedidoId) return;
      const st = p.statusPreparo;
      setPedido((prev) => {
        if (!prev) return prev;
        const trackingFromPayload =
          p.trackingStatus != null
            ? (String(p.trackingStatus) as DeliveryPedidoTrackingDTO['trackingStatus'])
            : undefined;
        const mensagemCliente =
          typeof p.mensagemCliente === 'string' && p.mensagemCliente.trim() !== ''
            ? p.mensagemCliente.trim()
            : undefined;
        const motivoRes =
          typeof p.motivoResumido === 'string' && p.motivoResumido.trim() !== ''
            ? p.motivoResumido.trim()
            : typeof p.motivoCancelamentoResumo === 'string' && p.motivoCancelamentoResumo.trim() !== ''
              ? p.motivoCancelamentoResumo.trim()
              : undefined;
        return {
          ...prev,
          statusEntrega: p.statusEntrega != null ? String(p.statusEntrega) : prev.statusEntrega,
          statusPreparo: st != null ? String(st) : prev.statusPreparo,
          trackingStatus: trackingFromPayload,
          ...(mensagemCliente ? { mensagemCliente } : {}),
          ...(motivoRes ? { motivoCancelamentoResumo: motivoRes } : {}),
          ...(typeof p.numeroPedido === 'number' ? { numeroPedido: p.numeroPedido } : {}),
          ...(p.tipoPedido != null && String(p.tipoPedido).trim() !== ''
            ? { tipoPedido: String(p.tipoPedido) as TipoPedidoTracking }
            : {}),
        };
      });
    },
    [pedidoId]
  );

  useEffect(() => {
    if (!pedidoId) {
      setCarregando(false);
      setErro('Pedido não informado.');
      return;
    }

    let ativo = true;
    (async () => {
      setCarregando(true);
      setErro(null);
      try {
        const data = await getDeliveryPedidoTracking(pedidoId);
        if (!ativo) return;
        if (idLojaParaChecagem && data.lojaId !== idLojaParaChecagem) {
          setErro('Este pedido não pertence a este link de loja.');
          setPedido(null);
          return;
        }
        setPedido(data);
      } catch {
        if (ativo) {
          setPedido(null);
          setErro('Não foi possível carregar o pedido.');
        }
      } finally {
        if (ativo) setCarregando(false);
      }
    })();

    return () => {
      ativo = false;
    };
  }, [pedidoId, idLojaParaChecagem]);

  useEffect(() => {
    if (!pedidoId || !idLojaParaChecagem || !pedido || erro) return;

    setSocketStatus('connecting');
    const auth = buildDeliveryTrackingSocketAuth(idLojaParaChecagem, pedidoId);
    const socket: Socket = io(resolveApiBaseUrl(), {
      auth,
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    const onConnect = () => setSocketStatus('connected');
    const onDisconnect = () => setSocketStatus('idle');
    const onConnectError = () => setSocketStatus('error');

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);
    socket.on('status-pedido-atualizado', aplicarPayloadStatus);
    socket.on('pedido-cancelado', aplicarPayloadStatus);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      socket.off('status-pedido-atualizado', aplicarPayloadStatus);
      socket.off('pedido-cancelado', aplicarPayloadStatus);
      socket.disconnect();
    };
  }, [pedidoId, idLojaParaChecagem, pedido, erro, aplicarPayloadStatus]);

  const ehRetirada = useMemo(() => ehRetiradaPedido(pedido?.tipoPedido), [pedido?.tipoPedido]);

  const trackingStatus = useMemo(
    () =>
      getCustomerTrackingStatus(
        pedido?.statusEntrega ?? null,
        pedido?.statusPreparo ?? null,
        pedido?.trackingStatus ?? null,
        pedido?.tipoPedido ?? 'DELIVERY'
      ),
    [pedido?.statusEntrega, pedido?.statusPreparo, pedido?.trackingStatus, pedido?.tipoPedido]
  );

  const pedidoCanceladoPelaLoja = trackingStatus === 'CANCELADO_LOJA';

  const stepAtivo = useMemo(
    () => stepIndexFromTrackingStatus(trackingStatus, ehRetirada),
    [trackingStatus, ehRetirada]
  );

  const steps = ehRetirada ? STEPS_RETIRADA : STEPS_DELIVERY;

  if (carregando) {
    return (
      <div className="flex flex-col items-center justify-center gap-5 px-6 py-24">
        <Loader2 className="h-12 w-12 animate-spin text-accent-purple" />
        <p className="text-center text-sm font-medium text-text-secondary">Carregando seu pedido…</p>
      </div>
    );
  }

  if (erro || !pedido) {
    return (
      <div className="px-6 py-16 text-center">
        <div className="mx-auto max-w-xs rounded-card border border-bg-border bg-bg-surface p-6 shadow-card">
          <p className="text-sm text-text-secondary">{erro ?? 'Pedido não encontrado.'}</p>
          <Link
            to={`/menu/${encodeURIComponent(lojaPublicKey)}`}
            className="mt-4 inline-flex items-center gap-1.5 rounded-pill border-2 border-accent-magenta px-4 py-2 text-sm font-bold uppercase tracking-wide text-text-primary transition hover:bg-accent-magenta/10"
          >
            Voltar ao cardápio
          </Link>
        </div>
      </div>
    );
  }

  const senha = formatSenha(pedido.numeroPedido, pedido.numeroVenda);
  const textoCancelamento =
    pedido.mensagemCliente?.trim() || 'Seu pedido foi cancelado pela loja';
  const statusLabel = STATUS_LABEL[trackingStatus] ?? 'Pedido em andamento';
  const HeroIcon = ehRetirada ? Store : ShoppingBag;

  const scrollTimelineToView = () => {
    if (typeof document === 'undefined') return;
    const el = document.getElementById('tracking-timeline');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="px-4 pb-28 pt-3">
      <header className="mb-5 flex items-center justify-between gap-3">
        <Link
          to={`/menu/${encodeURIComponent(lojaPublicKey)}`}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-bg-raised text-text-secondary transition hover:text-text-primary active:scale-95"
          aria-label="Voltar"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="min-w-0 flex-1 px-2 text-center">
          <h1 className="truncate font-bold text-text-primary">Pedido confirmado</h1>
          <p className="truncate text-xs text-text-muted">#{senha}</p>
        </div>
        <div
          className={`flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${
            socketStatus === 'connected'
              ? 'bg-price/15 text-price'
              : socketStatus === 'connecting'
                ? 'bg-amber-500/12 text-amber-100'
                : 'bg-bg-raised text-text-muted'
          }`}
        >
          {socketStatus === 'connected' ? (
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-price opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-price" />
            </span>
          ) : (
            <Radio className="h-3 w-3" />
          )}
          {socketStatus === 'connected' ? 'Ao vivo' : socketStatus === 'connecting' ? 'Conectando' : 'Offline'}
        </div>
      </header>

      {loja && (
        <div className="mb-4 flex items-center gap-3 rounded-card border border-bg-border bg-bg-surface p-3 shadow-card">
          <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-bg-raised ring-1 ring-bg-border">
            {loja.logoUrl ? (
              <img src={loja.logoUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <Store className="h-5 w-5 text-text-secondary" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold uppercase text-text-primary">{loja.nome}</p>
            <p className="text-xs text-text-muted">Pedido #{senha}</p>
          </div>
        </div>
      )}

      {/* HERO: Acompanhamento do pedido — senha + status badge + ícone à direita + total */}
      <div className="relative mb-5 overflow-hidden rounded-card border border-accent-magenta/30 bg-bg-surface p-5 shadow-glow-pink">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-accent-magenta/25 blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute -bottom-20 -left-10 h-40 w-40 rounded-full bg-accent-purple/25 blur-3xl" aria-hidden />
        <div className="relative flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-accent-magenta">
              Acompanhamento do pedido
            </p>
            <p className="mt-1 text-6xl font-black leading-none tabular-nums tracking-tight text-text-primary">
              {senha}
            </p>
            <p className="mt-1 text-[11px] uppercase tracking-wider text-text-muted">Senha do pedido</p>
            {!pedidoCanceladoPelaLoja && (
              <span className="mt-3 inline-flex items-center gap-1.5 rounded-pill bg-cta px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow-cta">
                {statusLabel}
              </span>
            )}
          </div>
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-pill bg-bg-raised ring-2 ring-accent-magenta/40">
            <HeroIcon className="h-9 w-9 text-accent-magenta" strokeWidth={2} />
          </div>
        </div>
        <div className="relative mt-4 flex items-end justify-between border-t border-bg-border pt-3">
          <span className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">Total</span>
          <span className="text-2xl font-black tabular-nums text-price">{formatBrl(pedido.valorTotal)}</span>
        </div>
      </div>

      {pedidoCanceladoPelaLoja && (
        <div className="mb-5 rounded-card border border-danger/45 bg-danger/15 p-4" role="alert">
          <p className="text-sm font-bold uppercase leading-snug text-danger">{textoCancelamento}</p>
          {pedido.motivoCancelamentoResumo && (
            <p className="mt-2 text-xs leading-relaxed text-text-secondary">
              Motivo informado: {pedido.motivoCancelamentoResumo}
            </p>
          )}
        </div>
      )}

      {/* TIMELINE HORIZONTAL: 4 etapas com ícones, linha de progresso conectando */}
      {!pedidoCanceladoPelaLoja && (
        <section
          id="tracking-timeline"
          className="mb-5 rounded-card border border-bg-border bg-bg-surface p-5 shadow-card"
        >
          <h2 className="mb-5 text-xs font-semibold uppercase tracking-wider text-text-secondary">
            Acompanhe o status
          </h2>
          <div className="relative">
            <div
              className="absolute left-[12.5%] right-[12.5%] top-5 h-[2px] rounded-pill bg-bg-border"
              aria-hidden
            />
            <div
              className="absolute left-[12.5%] top-5 h-[2px] rounded-pill bg-progress transition-all duration-700"
              style={{
                width: steps.length > 1 ? `${(stepAtivo / (steps.length - 1)) * 75}%` : '0%',
              }}
              aria-hidden
            />
            <ol className="relative flex items-start justify-between">
              {steps.map((step, index) => {
                const concluido = index < stepAtivo;
                const atual = index === stepAtivo;
                const Icon = STEP_ICONS[step.id] ?? Check;
                return (
                  <li key={step.id} className="flex flex-1 flex-col items-center px-1">
                    <div
                      className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-all duration-500 ease-out ${
                        concluido
                          ? 'bg-cta text-white shadow-cta'
                          : atual
                            ? 'scale-110 bg-cta text-white shadow-glow-pink ring-2 ring-accent-magenta'
                            : 'border-2 border-bg-border bg-bg-raised text-text-muted'
                      }`}
                    >
                      {concluido ? (
                        <Check className="h-5 w-5" strokeWidth={3} />
                      ) : (
                        <Icon className="h-4 w-4" strokeWidth={2.4} />
                      )}
                      {atual && (
                        <span
                          className="pointer-events-none absolute inset-0 animate-ping rounded-full bg-accent-magenta/30"
                          aria-hidden
                        />
                      )}
                    </div>
                    <p
                      className={`mt-2 max-w-[6rem] text-center text-[10px] font-bold uppercase leading-tight tracking-wider ${
                        atual
                          ? 'text-accent-magenta'
                          : concluido
                            ? 'text-text-primary'
                            : 'text-text-muted'
                      }`}
                    >
                      {step.titulo}
                    </p>
                  </li>
                );
              })}
            </ol>
          </div>
          <p className="mt-4 text-center text-[11px] text-text-muted">
            Atualizamos automaticamente quando a loja avança o status.
          </p>
        </section>
      )}

      {!pedidoCanceladoPelaLoja && (
        <div className="mb-5 flex items-start gap-3 rounded-card border border-price/30 bg-price/[0.08] p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-pill bg-price">
            <Check className="h-5 w-5 text-bg-base" strokeWidth={3} />
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <p className="text-sm font-black uppercase text-price">Recebemos seu pedido!</p>
            <p className="mt-0.5 text-xs leading-snug text-text-secondary">
              {ehRetirada
                ? 'Estamos preparando tudo com muito carinho — venha retirar quando estiver pronto.'
                : 'Estamos preparando tudo com muito carinho.'}
            </p>
          </div>
        </div>
      )}

      <section className="mb-4 rounded-card border border-bg-border bg-bg-surface p-5 shadow-card">
        <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-text-secondary">
          <Package className="h-3.5 w-3.5 text-accent-purple" />
          Seu pedido
        </h3>
        <ul className="space-y-0 text-sm">
          {pedido.itens.map((it, i) => (
            <li
              key={i}
              className={`flex flex-col gap-1 py-3 ${
                i < pedido.itens.length - 1 ? 'border-b border-bg-border' : ''
              }`}
            >
              <span className="flex min-w-0 items-start gap-2">
                <span className="inline-flex h-6 min-w-[1.75rem] shrink-0 items-center justify-center rounded-pill bg-accent-purple/15 px-1.5 text-[12px] font-black tabular-nums text-accent-purple">
                  {it.quantidade}×
                </span>
                <span className="font-semibold uppercase leading-snug text-text-primary">{it.nome}</span>
              </span>
              {it.descricao && (
                <span className="ml-9 text-[11px] italic leading-snug text-text-muted">
                  {it.descricao}
                </span>
              )}
            </li>
          ))}
        </ul>
      </section>

      {ehRetiradaPedido(pedido.tipoPedido) && (
        <section className="mb-4 rounded-card border border-bg-border bg-bg-surface p-5 shadow-card">
          <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-text-secondary">
            <MapPin className="h-3.5 w-3.5 text-accent-purple" />
            Retirada
          </h3>
          <p className="text-sm leading-relaxed text-text-secondary">
            Retirada no balcão — endereço não se aplica.
          </p>
        </section>
      )}
      {!ehRetiradaPedido(pedido.tipoPedido) && pedido.enderecoEntrega && (
        <section className="mb-4 rounded-card border border-bg-border bg-bg-surface p-5 shadow-card">
          <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-text-secondary">
            <MapPin className="h-3.5 w-3.5 text-price" />
            Endereço de entrega
          </h3>
          <p className="text-sm leading-relaxed text-text-secondary">{pedido.enderecoEntrega}</p>
        </section>
      )}

      <div className="mt-6 flex flex-col gap-3">
        {!pedidoCanceladoPelaLoja && (
          <button
            type="button"
            onClick={scrollTimelineToView}
            className="flex min-h-[3.25rem] w-full items-center justify-center gap-2 rounded-pill bg-cta px-4 text-base font-bold uppercase tracking-wide text-white shadow-cta transition-all duration-200 hover:bg-cta-hover active:scale-[0.98]"
          >
            <Package className="h-5 w-5" />
            Acompanhar pedido
          </button>
        )}
        <Link
          to={`/menu/${encodeURIComponent(lojaPublicKey)}`}
          className="flex min-h-[3rem] w-full items-center justify-center gap-2 rounded-pill border-2 border-accent-magenta px-4 text-sm font-bold uppercase tracking-wide text-text-primary transition hover:bg-accent-magenta/10 active:scale-[0.99]"
        >
          Fazer outro pedido
        </Link>
      </div>
    </div>
  );
}
