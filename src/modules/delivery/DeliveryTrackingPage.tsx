import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useOutletContext, useParams } from 'react-router-dom';
import { io, type Socket } from 'socket.io-client';
import { Check, Loader2, MapPin, Package, Radio, Store } from 'lucide-react';
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
  { id: 'cozinha', titulo: 'Na cozinha', subtitulo: 'Preparando / aguardando entrega' },
  { id: 'rota', titulo: 'Saiu para entrega', subtitulo: 'Em rota' },
  { id: 'entregue', titulo: 'Entregue', subtitulo: 'Concluído' },
] as const;

const STEPS_RETIRADA = [
  { id: 'recebido', titulo: 'Recebido', subtitulo: 'Pendente' },
  { id: 'cozinha', titulo: 'Na cozinha', subtitulo: 'Preparando' },
  { id: 'pronto', titulo: 'Pronto para retirada', subtitulo: 'Compare ao balcão' },
  { id: 'retirado', titulo: 'Retirado', subtitulo: 'Concluído' },
] as const;

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
      <div className="flex flex-col items-center justify-center gap-4 px-6 py-20">
        <Loader2 className="h-12 w-12 animate-spin text-violet-400" />
        <p className="text-center text-white/65">Carregando seu pedido…</p>
      </div>
    );
  }

  if (erro || !pedido) {
    return (
      <div className="px-6 py-16 text-center">
        <p className="text-white/65">{erro ?? 'Pedido não encontrado.'}</p>
        <Link
          to={`/menu/${encodeURIComponent(lojaPublicKey)}`}
          className="mt-4 inline-block text-violet-300 underline"
        >
          Voltar ao cardápio
        </Link>
      </div>
    );
  }

  const senha = formatSenha(pedido.numeroPedido, pedido.numeroVenda);
  const textoCancelamento =
    pedido.mensagemCliente?.trim() || 'Seu pedido foi cancelado pela loja';

  return (
    <div className="px-4 pb-24 pt-2">
      {/* Header com branding da loja */}
      {loja && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-violet-500/30 bg-[#0b1324]">
            {loja.logoUrl ? (
              <img src={loja.logoUrl} alt="" className="h-full w-full object-cover rounded-full" />
            ) : (
              <Store className="h-5 w-5 text-violet-300" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">{loja.nome}</p>
            <p className="text-xs text-white/50">Pedido #{senha}</p>
          </div>
        </div>
      )}

      <div className="mb-2 flex items-center justify-between gap-2">
        <Link
          to={`/menu/${encodeURIComponent(lojaPublicKey)}`}
          className="text-sm text-violet-300/90 underline"
        >
          Cardápio
        </Link>
        <div
          className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${
            socketStatus === 'connected'
              ? 'border-emerald-500/35 bg-emerald-500/12 text-emerald-200'
              : socketStatus === 'connecting'
                ? 'border-amber-500/30 bg-amber-500/10 text-amber-100'
                : 'border-white/15 bg-white/[0.06] text-white/45'
          }`}
        >
          <Radio className="h-3 w-3" />
          {socketStatus === 'connected'
            ? 'Ao vivo'
            : socketStatus === 'connecting'
              ? 'Conectando…'
              : 'Offline'}
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-white/10 bg-white/[0.05] p-4">
        <p className="text-xs font-medium uppercase tracking-wider text-white/40">Senha do pedido</p>
        <p className="mt-1 text-4xl font-black tabular-nums tracking-tight text-white">{senha}</p>
        <p className="mt-2 text-sm text-white/50">Total {formatBrl(pedido.valorTotal)}</p>
      </div>

      {pedidoCanceladoPelaLoja && (
        <div
          className="mb-6 rounded-2xl border border-red-500/40 bg-red-950/40 p-4 text-red-50"
          role="alert"
        >
          <p className="text-sm font-semibold leading-snug">{textoCancelamento}</p>
          {pedido.motivoCancelamentoResumo && (
            <p className="mt-2 text-xs leading-relaxed text-red-100/85">
              Motivo informado: {pedido.motivoCancelamentoResumo}
            </p>
          )}
        </div>
      )}

      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-white/45">
        Acompanhe o status
      </h2>

      {/* Stepper: timeline vertical com animação no passo atual */}
      {!pedidoCanceladoPelaLoja && (
      <div className="relative mb-8 pl-2">
               <div
          className="absolute bottom-4 left-[1.15rem] top-4 w-px bg-gradient-to-b from-violet-500/50 via-white/15 to-emerald-500/40"
          aria-hidden
        />
        <ol className="relative space-y-6">
          {steps.map((step, index) => {
            const concluido = index < stepAtivo;
            const atual = index === stepAtivo;
            const futuro = index > stepAtivo;

            return (
              <li key={step.id} className="relative flex gap-4 pl-1">
                <div
                  className={`relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-500 ease-out ${
                    concluido
                      ? 'border-emerald-400/70 bg-emerald-500/25 text-emerald-100'
                      : atual
                        ? 'scale-110 border-violet-400/80 bg-violet-500/30 text-white shadow-[0_0_24px_rgba(139,92,246,0.45)] ring-2 ring-violet-400/50 ring-offset-2 ring-offset-[#060816]'
                        : 'border-white/15 bg-[#0a1020]/90 text-white/35'
                  }`}
                >
                  {concluido ? (
                    <Check className="h-4 w-4" strokeWidth={2.5} />
                  ) : (
                    <span className="text-sm font-bold tabular-nums">{index + 1}</span>
                  )}
                </div>
                <div
                  className={`min-w-0 pt-0.5 transition-opacity duration-300 ${
                    futuro ? 'opacity-45' : 'opacity-100'
                  }`}
                >
                  <p
                    className={`font-semibold ${
                      atual ? 'text-violet-100' : concluido ? 'text-white' : 'text-white/55'
                    }`}
                  >
                    {step.titulo}
                  </p>
                  <p className="text-sm text-white/45">{step.subtitulo}</p>
                  {atual && (
                    <p className="mt-1.5 animate-pulse text-xs font-medium text-violet-300/90">
                      Etapa atual — atualizamos automaticamente
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
      )}

      <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white/80">
          <Package className="h-4 w-4 text-violet-300" />
          Itens do pedido
        </h3>
        <ul className="space-y-0 text-sm">
          {pedido.itens.map((it, i) => (
            <li
              key={i}
              className={`flex flex-col justify-between gap-1 py-2.5 text-white/85 ${
                i < pedido.itens.length - 1 ? 'border-b border-white/5' : ''
              }`}
            >
              <span className="min-w-0 flex items-start gap-2">
                <span className="font-semibold tabular-nums text-violet-200">{it.quantidade}×</span>
                <span className="leading-tight">{it.nome}</span>
              </span>
              {it.descricao && (
                <span className="text-[10px] italic leading-tight text-slate-400 ml-6 mt-0.5">
                  {it.descricao}
                </span>
              )}
            </li>
          ))}
        </ul>
      </section>

      {ehRetiradaPedido(pedido.tipoPedido) && (
        <section className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-white/80">
            <MapPin className="h-4 w-4 text-violet-300" />
            Retirada
          </h3>
          <p className="text-sm leading-relaxed text-white/70">Retirada no balcão — endereço não se aplica.</p>
        </section>
      )}
      {!ehRetiradaPedido(pedido.tipoPedido) && pedido.enderecoEntrega && (
        <section className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-white/80">
            <MapPin className="h-4 w-4 text-emerald-300" />
            Entrega
          </h3>
          <p className="text-sm leading-relaxed text-white/70">{pedido.enderecoEntrega}</p>
        </section>
      )}
    </div>
  );
}
