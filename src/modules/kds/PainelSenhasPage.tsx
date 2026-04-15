import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { Loader2, Radio } from 'lucide-react';
import { api, resolveApiBaseUrl } from '../../services/api';
import { buildKdsSocketAuth } from '../../services/socket/kdsSocketAuth';
import {
  extrairIdVendaPayload,
  extrairSenhaPedido,
  statusPreparoParaPainel,
} from './kdsPedidoUtils';

interface TicketPainel {
  id: string;
  senha: string;
  lado: 'prep' | 'pronto';
}

function tocarDingDong(): void {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const playTone = (freq: number, start: number, dur: number, vol: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(vol, start);
      gain.gain.exponentialRampToValueAtTime(0.01, start + dur);
      osc.start(start);
      osc.stop(start + dur);
    };
    const t0 = ctx.currentTime;
    playTone(659.25, t0, 0.18, 0.1);
    playTone(880, t0 + 0.22, 0.22, 0.09);
    window.setTimeout(() => void ctx.close(), 600);
  } catch {
    /* sem áudio */
  }
}

function payloadParaTicket(payload: unknown): TicketPainel | null {
  if (!payload || typeof payload !== 'object') return null;
  const raw = payload as Record<string, unknown>;
  const id = raw.id != null ? String(raw.id) : '';
  if (!id) return null;
  const lado = statusPreparoParaPainel(String(raw.statusPreparo ?? ''));
  if (lado === null) return null;
  return {
    id,
    senha: extrairSenhaPedido(raw),
    lado,
  };
}

type SocketStatus = 'idle' | 'connecting' | 'connected' | 'error';

export function PainelSenhasPage() {
  const [tickets, setTickets] = useState<TicketPainel[]>([]);
  const [socketStatus, setSocketStatus] = useState<SocketStatus>('idle');
  const [carregando, setCarregando] = useState(true);
  const [blinkIds, setBlinkIds] = useState<Set<string>>(() => new Set());
  const statusAnteriorRef = useRef<Map<string, string>>(new Map());

  const aplicarPayload = useCallback(
    (payload: unknown, opts: { realtime: boolean }) => {
      const id = extrairIdVendaPayload(payload);
      if (!id) return;

      const ticket = payloadParaTicket(payload);
      const st = String(
        payload && typeof payload === 'object' && 'statusPreparo' in payload
          ? (payload as Record<string, unknown>).statusPreparo ?? ''
          : ''
      ).toUpperCase();

      const anterior = statusAnteriorRef.current.get(id);
      if (st) statusAnteriorRef.current.set(id, st);

      if (opts.realtime && st === 'PRONTO' && anterior !== undefined && anterior !== 'PRONTO') {
        tocarDingDong();
        setBlinkIds((s) => new Set(s).add(id));
        window.setTimeout(() => {
          setBlinkIds((s) => {
            const n = new Set(s);
            n.delete(id);
            return n;
          });
        }, 2800);
      }

      setTickets((prev) => {
        const rest = prev.filter((t) => t.id !== id);
        if (!ticket) return rest;
        return [...rest, ticket];
      });
    },
    []
  );

  const onNovoPedido = useCallback(
    (payload: unknown) => {
      aplicarPayload(payload, { realtime: true });
    },
    [aplicarPayload]
  );

  const onStatusAtualizado = useCallback(
    (payload: unknown) => {
      aplicarPayload(payload, { realtime: true });
    },
    [aplicarPayload]
  );

  useEffect(() => {
    let cancel = false;
    (async () => {
      setCarregando(true);
      try {
        const { data } = await api.get<unknown[]>('/api/vendas/kds');
        if (cancel || !Array.isArray(data)) return;
        const map = new Map<string, string>();
        const list: TicketPainel[] = [];
        for (const row of data) {
          const t = payloadParaTicket(row);
          if (!t) continue;
          list.push(t);
          if (row && typeof row === 'object' && 'statusPreparo' in row) {
            const st = String((row as Record<string, unknown>).statusPreparo ?? '').toUpperCase();
            if (st) map.set(t.id, st);
          }
        }
        statusAnteriorRef.current = map;
        if (!cancel) setTickets(list);
      } catch (e) {
        console.error('Painel senhas: falha ao carregar', e);
      } finally {
        if (!cancel) setCarregando(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, []);

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

    const onConnect = () => setSocketStatus('connected');
    const onDisconnect = () => setSocketStatus('idle');
    const onConnectError = () => setSocketStatus('error');

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);
    socket.on('novo-pedido-cozinha', onNovoPedido);
    socket.on('status-pedido-atualizado', onStatusAtualizado);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      socket.off('novo-pedido-cozinha', onNovoPedido);
      socket.off('status-pedido-atualizado', onStatusAtualizado);
      socket.disconnect();
    };
  }, [onNovoPedido, onStatusAtualizado]);

  const preparando = useMemo(
    () => tickets.filter((t) => t.lado === 'prep').sort((a, b) => a.senha.localeCompare(b.senha, undefined, { numeric: true })),
    [tickets]
  );
  const prontos = useMemo(
    () =>
      tickets
        .filter((t) => t.lado === 'pronto')
        .sort((a, b) => a.senha.localeCompare(b.senha, undefined, { numeric: true })),
    [tickets]
  );

  const statusLabel =
    socketStatus === 'connecting'
      ? 'Conectando…'
      : socketStatus === 'connected'
        ? 'Ao vivo'
        : socketStatus === 'error'
          ? 'Sem conexão'
          : 'Desconectado';

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#0a0c10] text-white">
      <header className="flex shrink-0 items-center justify-between border-b border-white/10 px-6 py-3">
        <h1 className="text-lg font-semibold tracking-tight md:text-xl">Senhas — Retirada</h1>
        <div className="flex items-center gap-3 text-sm text-white/60">
          {carregando && (
            <span className="flex items-center gap-1">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
            </span>
          )}
          <span
            className={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${
              socketStatus === 'connected'
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
                : 'border-white/15 bg-white/5 text-white/50'
            }`}
          >
            <Radio className="h-3.5 w-3.5" />
            {statusLabel}
          </span>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-2">
        <section className="flex min-h-0 flex-col border-b border-white/10 bg-[#12141a] md:border-b-0 md:border-r md:border-white/10">
          <div className="shrink-0 px-6 py-4">
            <h2 className="text-2xl font-bold text-white/90 md:text-3xl">Preparando</h2>
            <p className="text-sm text-white/40">Pedidos em produção</p>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6 md:px-6">
            <ul className="flex flex-wrap content-start gap-4 md:gap-6">
              {preparando.map((t) => (
                <li
                  key={t.id}
                  className="flex min-w-[7rem] items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-8 md:min-w-[9rem] md:px-8 md:py-10"
                >
                  <span className="text-5xl font-black tabular-nums tracking-tight text-white md:text-7xl lg:text-8xl">
                    {t.senha}
                  </span>
                </li>
              ))}
            </ul>
            {preparando.length === 0 && (
              <p className="py-16 text-center text-xl text-white/30">Nenhuma senha nesta fila</p>
            )}
          </div>
        </section>

        <section className="relative flex min-h-0 flex-col overflow-hidden bg-[#0c1412]">
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_70%_30%,rgba(16,185,129,0.22),transparent_55%)]"
            aria-hidden
          />
          <div className="relative shrink-0 px-6 py-4">
            <h2 className="text-2xl font-bold text-emerald-100 md:text-3xl">Pronto para retirada</h2>
            <p className="text-sm text-emerald-200/50">Retire seu pedido no balcão</p>
          </div>
          <div className="relative min-h-0 flex-1 overflow-y-auto px-4 pb-6 md:px-6">
            <ul className="flex flex-wrap content-start gap-4 md:gap-6">
              {prontos.map((t) => (
                <li
                  key={t.id}
                  className={`flex min-w-[7rem] items-center justify-center rounded-2xl border border-emerald-400/35 bg-emerald-500/10 px-6 py-8 shadow-[0_0_40px_rgba(16,185,129,0.12)] md:min-w-[9rem] md:px-8 md:py-10 ${
                    blinkIds.has(t.id) ? 'animate-pulse ring-4 ring-emerald-400/60' : ''
                  }`}
                >
                  <span className="text-5xl font-black tabular-nums tracking-tight text-emerald-50 md:text-7xl lg:text-8xl">
                    {t.senha}
                  </span>
                </li>
              ))}
            </ul>
            {prontos.length === 0 && (
              <p className="py-16 text-center text-xl text-emerald-200/25">Aguardando pedidos prontos</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
