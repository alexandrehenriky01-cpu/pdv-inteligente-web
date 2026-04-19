import { useCallback, useEffect, useMemo, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { Flame, Loader2, Radio, UtensilsCrossed } from 'lucide-react';
import { api, resolveApiBaseUrl } from '../../services/api';
import { buildKdsSocketAuth } from '../../services/socket/kdsSocketAuth';
import { KdsOrderCard } from './components/KdsOrderCard';
import { extrairIdVendaPayload, vendaPayloadParaKdsPedido } from './kdsPedidoUtils';
import type { ColunaKds, KdsPedido } from './types';

const URGENCY_THRESHOLD_MS = 10 * 60 * 1000;

function tocarNotificacaoCurta(): void {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.value = 920;
    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.12);
    osc.onended = () => void ctx.close();
  } catch {
    /* ambiente sem áudio ou bloqueio de autoplay */
  }
}

function tocarAlertaPedidoNovo(): void {
  tocarNotificacaoCurta();
  try {
    const audio = new Audio('/sounds/alert.mp3');
    audio.volume = 0.7;
    audio.play().catch(() => {});
  } catch {
    /* áudio bloqueado pelo navegador */
  }
}

function isPedidoUrgente(recebidoEm: number, currentTime: number = Date.now()): boolean {
  return currentTime - recebidoEm > URGENCY_THRESHOLD_MS;
}

type SocketStatus = 'idle' | 'connecting' | 'connected' | 'error';

const COLUNAS: Array<{ id: ColunaKds; titulo: string; subtitulo: string }> = [
  { id: 'TODO', titulo: 'A fazer', subtitulo: 'Pedidos novos' },
  { id: 'PREPARANDO', titulo: 'Preparando', subtitulo: 'No fogo' },
  { id: 'PRONTO', titulo: 'Pronto', subtitulo: 'Aguardando retirada' },
];

export function KdsPage() {
  const [pedidos, setPedidos] = useState<KdsPedido[]>([]);
  const [socketStatus, setSocketStatus] = useState<SocketStatus>('idle');
  const [carregandoLista, setCarregandoLista] = useState(true);
  const [savingIds, setSavingIds] = useState<Set<string>>(() => new Set());
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const urgenciaPorPedido = useMemo(() => {
    const map = new Map<string, boolean>();
    for (const p of pedidos) {
      map.set(p.id, isPedidoUrgente(p.recebidoEm, now));
    }
    return map;
  }, [pedidos, now]);

  const pedidosPorColuna = useCallback(
    (col: ColunaKds) => {
      const filtered = pedidos.filter((p) => p.coluna === col);
      if (col === 'TODO') {
        return filtered.sort((a, b) => a.recebidoEm - b.recebidoEm);
      }
      return filtered.sort((a, b) => b.recebidoEm - a.recebidoEm);
    },
    [pedidos]
  );

  const aplicarPayloadVenda = useCallback((payload: unknown) => {
    const id = extrairIdVendaPayload(payload);
    if (!id) return;
    const pedido = vendaPayloadParaKdsPedido(payload);
    setPedidos((prev) => {
      if (pedido === null) return prev.filter((p) => p.id !== id);
      const idx = prev.findIndex((p) => p.id === pedido.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = pedido;
        return copy;
      }
      return [pedido, ...prev];
    });
  }, []);

  const onNovoPedidoCozinha = useCallback((payload: unknown) => {
    const pedido = vendaPayloadParaKdsPedido(payload);
    if (!pedido) return;
    setPedidos((prev) => {
      const novo = !prev.some((p) => p.id === pedido.id);
      if (novo) requestAnimationFrame(() => tocarAlertaPedidoNovo());
      const rest = prev.filter((p) => p.id !== pedido.id);
      return [...rest, pedido];
    });
  }, []);

  const avancar = useCallback(async (id: string) => {
    const p = pedidos.find((x) => x.id === id);
    if (!p) return;
    const next =
      p.coluna === 'TODO' ? 'PREPARANDO' : p.coluna === 'PREPARANDO' ? 'PRONTO' : null;
    if (!next) return;

    setSavingIds((s) => new Set(s).add(id));
    try {
      await api.patch(`/api/vendas/${id}/status-preparo`, { statusPreparo: next });
    } catch (e) {
      console.error('KDS: falha ao avançar status', e);
      window.alert('Não foi possível atualizar o status. Tente novamente.');
    } finally {
      setSavingIds((s) => {
        const n = new Set(s);
        n.delete(id);
        return n;
      });
    }
  }, [pedidos]);

  const concluir = useCallback(async (id: string) => {
    setSavingIds((s) => new Set(s).add(id));
    try {
      await api.patch(`/api/vendas/${id}/status-preparo`, { statusPreparo: 'ENTREGUE' });
    } catch (e) {
      console.error('KDS: falha ao concluir pedido', e);
      window.alert('Não foi possível marcar como entregue. Tente novamente.');
    } finally {
      setSavingIds((s) => {
        const n = new Set(s);
        n.delete(id);
        return n;
      });
    }
  }, []);

  useEffect(() => {
    let cancel = false;
    (async () => {
      setCarregandoLista(true);
      try {
        const { data } = await api.get<unknown[]>('/api/vendas/kds');
        if (cancel || !Array.isArray(data)) return;
        const list: KdsPedido[] = [];
        for (const row of data) {
          const pedido = vendaPayloadParaKdsPedido(row);
          if (pedido) list.push(pedido);
        }
        if (!cancel) setPedidos(list);
      } catch (e) {
        console.error('KDS: falha ao carregar pedidos', e);
      } finally {
        if (!cancel) setCarregandoLista(false);
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
    socket.on('novo-pedido-cozinha', onNovoPedidoCozinha);
    socket.on('status-pedido-atualizado', aplicarPayloadVenda);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      socket.off('novo-pedido-cozinha', onNovoPedidoCozinha);
      socket.off('status-pedido-atualizado', aplicarPayloadVenda);
      socket.disconnect();
    };
  }, [aplicarPayloadVenda, onNovoPedidoCozinha]);

  const statusLabel = useMemo(() => {
    switch (socketStatus) {
      case 'connecting':
        return 'Conectando…';
      case 'connected':
        return 'Ao vivo';
      case 'error':
        return 'Falha na conexão';
      default:
        return 'Desconectado';
    }
  }, [socketStatus]);

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#060816] text-white antialiased selection:bg-violet-500/30">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(139,92,246,0.12),transparent_50%)]" />

      <header className="relative z-10 flex shrink-0 items-center justify-between gap-4 border-b border-white/10 bg-[#08101f]/90 px-4 py-3 backdrop-blur-xl md:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06]">
            <Flame className="h-6 w-6 text-orange-300" />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight md:text-xl">KDS — Cozinha</h1>
            <p className="text-xs text-white/45">Kitchen Display · Aurya</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {carregandoLista && (
            <span className="hidden text-xs text-white/40 sm:inline">Sincronizando pedidos…</span>
          )}
          <div
            className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium ${
              socketStatus === 'connected'
                ? 'border-emerald-500/35 bg-emerald-500/15 text-emerald-200'
                : socketStatus === 'connecting'
                  ? 'border-amber-500/35 bg-amber-500/10 text-amber-100'
                  : 'border-red-500/30 bg-red-500/10 text-red-200'
            }`}
          >
            {socketStatus === 'connecting' ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Radio className="h-3.5 w-3.5" />
            )}
            {statusLabel}
          </div>
        </div>
      </header>

      <main className="relative z-10 grid min-h-0 flex-1 grid-cols-1 gap-3 p-3 md:grid-cols-3 md:gap-4 md:p-4">
        {COLUNAS.map((col) => (
          <section
            key={col.id}
            className="flex min-h-0 flex-col rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-md"
          >
            <div className="shrink-0 border-b border-white/10 px-4 py-3">
              <div className="flex items-center gap-2">
                <UtensilsCrossed className="h-4 w-4 text-violet-300/80" />
                <h2 className="font-semibold text-white">{col.titulo}</h2>
              </div>
              <p className="mt-0.5 text-xs text-white/45">{col.subtitulo}</p>
            </div>
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-3">
              {pedidosPorColuna(col.id).map((p) => (
                <KdsOrderCard
                  key={p.id}
                  pedido={p}
                  onAvancar={avancar}
                  onConcluir={concluir}
                  salvando={savingIds.has(p.id)}
                  urgente={urgenciaPorPedido.get(p.id) ?? false}
                />
              ))}
              {pedidosPorColuna(col.id).length === 0 && (
                <p className="py-8 text-center text-sm text-white/35">Nenhum pedido nesta etapa.</p>
              )}
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}
