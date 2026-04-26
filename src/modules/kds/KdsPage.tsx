import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { AlarmClock, Flame, Loader2, Radio, Volume2, VolumeX } from 'lucide-react';
import { api, resolveApiBaseUrl } from '../../services/api';
import { buildKdsSocketAuth } from '../../services/socket/kdsSocketAuth';
import { KdsOrderCard } from './components/KdsOrderCard';
import { KdsCancelarPedidoModal } from './components/KdsCancelarPedidoModal';
import { AuryaBranding } from '../../components/AuryaBranding';
import {
  colunaKdsPermiteCancelar,
  extrairIdVendaPayload,
  mergeKdsPedidoNaLista,
  vendaPayloadParaKdsPedido,
} from './kdsPedidoUtils';
import {
  getKdsSharedAudioContext,
  tocarKdsSomAtrasado,
  tocarKdsSomFinalizado,
  tocarKdsSomNovo,
  unlockKdsAudio,
} from './kdsProAudio';
import type { ColunaKds, KdsPedido } from './types';

const URGENCY_THRESHOLD_MS = 10 * 60 * 1000;
const LS_SOM_KEY = 'kds-pro-som-ativo';
const LS_AUDIO_UNLOCK_KEY = 'kds-pro-audio-unlocked';
const POLL_INTERVAL_MS = 10_000;

type KdsSomEvento = 'novo' | 'atrasado' | 'finalizado';

function isPedidoUrgente(recebidoEm: number, currentTime: number = Date.now()): boolean {
  return currentTime - recebidoEm > URGENCY_THRESHOLD_MS;
}

type SocketStatus = 'idle' | 'connecting' | 'connected' | 'error';

const COLUNAS: Array<{ id: ColunaKds; titulo: string; subtitulo: string }> = [
  { id: 'TODO', titulo: 'Novos pedidos', subtitulo: 'Aguardando início' },
  { id: 'PREPARANDO', titulo: 'Em preparo', subtitulo: 'Produção' },
  { id: 'PRONTO', titulo: 'Prontos', subtitulo: 'Retirada / entrega' },
];

export function KdsPage() {
  const [pedidos, setPedidos] = useState<KdsPedido[]>([]);
  const [socketStatus, setSocketStatus] = useState<SocketStatus>('idle');
  const [carregandoLista, setCarregandoLista] = useState(true);
  const [savingIds, setSavingIds] = useState<Set<string>>(() => new Set());
  const [now, setNow] = useState(() => Date.now());
  const [sonsLigados, setSonsLigados] = useState(() => {
    try {
      const v = localStorage.getItem(LS_SOM_KEY);
      return v !== '0';
    } catch {
      return true;
    }
  });
  const [audioDesbloqueado, setAudioDesbloqueado] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<KdsPedido | null>(null);

  const somEmitido = useRef(new Set<string>());
  const colunaAnterior = useRef(new Map<string, KdsPedido['coluna']>());
  const somNovoLiberadoRef = useRef(false);
  const tentarSomRef = useRef<(pid: string, t: KdsSomEvento) => void>(() => {});

  const chaveSom = (pedidoId: string, tipo: KdsSomEvento) => `${pedidoId}:${tipo}`;

  const tentarSom = useCallback(
    (pedidoId: string, tipo: KdsSomEvento) => {
      if (!sonsLigados) {
        if (import.meta.env.DEV) console.info('[KDS_AUDIO] ignorado (sons desligados)', tipo, pedidoId);
        return;
      }
      if (!audioDesbloqueado) {
        if (import.meta.env.DEV) console.info('[KDS_AUDIO] ignorado (use “Ativar sons”)', tipo, pedidoId);
        return;
      }
      const ctx = getKdsSharedAudioContext();
      if (!ctx || ctx.state !== 'running') {
        if (import.meta.env.DEV) console.warn('[KDS_AUDIO] contexto não está running', ctx?.state);
        return;
      }
      const k = chaveSom(pedidoId, tipo);
      if (somEmitido.current.has(k)) return;
      somEmitido.current.add(k);
      if (tipo === 'novo') tocarKdsSomNovo(ctx);
      else if (tipo === 'atrasado') tocarKdsSomAtrasado(ctx);
      else tocarKdsSomFinalizado(ctx);
    },
    [sonsLigados, audioDesbloqueado]
  );

  tentarSomRef.current = tentarSom;

  const ativarSons = useCallback(async () => {
    const ok = await unlockKdsAudio();
    setAudioDesbloqueado(ok);
    if (ok) {
      try {
        localStorage.setItem(LS_AUDIO_UNLOCK_KEY, '1');
      } catch {
        /* ignore */
      }
      setSonsLigados(true);
      if (import.meta.env.DEV) console.info('[KDS_AUDIO] preferência: sons ligados após ativação');
    }
  }, []);

  useEffect(() => {
    try {
      if (localStorage.getItem(LS_AUDIO_UNLOCK_KEY) === '1') {
        void unlockKdsAudio().then((ok) => {
          setAudioDesbloqueado(ok);
          if (import.meta.env.DEV) {
            console.info('[KDS_AUDIO] reabrir contexto após reload', ok ? 'running' : 'pendente');
          }
        });
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!carregandoLista) {
      somNovoLiberadoRef.current = true;
    }
  }, [carregandoLista]);

  useEffect(() => {
    try {
      localStorage.setItem(LS_SOM_KEY, sonsLigados ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [sonsLigados]);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
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
        return [...filtered].sort((a, b) => a.recebidoEm - b.recebidoEm);
      }
      return [...filtered].sort((a, b) => b.recebidoEm - a.recebidoEm);
    },
    [pedidos]
  );

  useEffect(() => {
    if (!sonsLigados || !audioDesbloqueado) return;
    for (const p of pedidos) {
      if (isPedidoUrgente(p.recebidoEm, now)) tentarSom(p.id, 'atrasado');
    }
  }, [pedidos, now, sonsLigados, audioDesbloqueado, tentarSom]);

  useEffect(() => {
    const currIds = new Set(pedidos.map((p) => p.id));

    for (const p of pedidos) {
      const prev = colunaAnterior.current.get(p.id);
      if (prev === 'PREPARANDO' && p.coluna === 'PRONTO') tentarSom(p.id, 'finalizado');
      colunaAnterior.current.set(p.id, p.coluna);
    }

    for (const id of [...colunaAnterior.current.keys()]) {
      if (currIds.has(id)) continue;
      const ultima = colunaAnterior.current.get(id);
      colunaAnterior.current.delete(id);
      if (ultima === 'PRONTO') tentarSom(id, 'finalizado');
    }

    for (const k of somEmitido.current) {
      const pid = k.split(':')[0];
      if (!currIds.has(pid)) somEmitido.current.delete(k);
    }
  }, [pedidos, tentarSom]);

  const limparAlertasSomDoPedido = useCallback((pedidoId: string) => {
    for (const k of somEmitido.current) {
      if (k.startsWith(`${pedidoId}:`)) somEmitido.current.delete(k);
    }
    colunaAnterior.current.delete(pedidoId);
  }, []);

  const onPedidoCanceladoSocket = useCallback(
    (payload: unknown) => {
      const id = extrairIdVendaPayload(payload);
      if (!id) return;
      limparAlertasSomDoPedido(id);
      setPedidos((prev) => prev.filter((p) => p.id !== id));
    },
    [limparAlertasSomDoPedido]
  );

  const aplicarPayloadVenda = useCallback((payload: unknown) => {
    if (import.meta.env.DEV) {
      console.info('[KDS_SOCKET] status-pedido-atualizado', payload);
    }
    const id = extrairIdVendaPayload(payload);
    if (!id) return;
    setPedidos((prev) => {
      const existing = prev.find((p) => p.id === id);
      const merged = mergeKdsPedidoNaLista(existing, payload);
      if (merged === null) return prev.filter((p) => p.id !== id);
      if (existing === undefined) {
        if (somNovoLiberadoRef.current) {
          queueMicrotask(() => tentarSomRef.current(merged.id, 'novo'));
        }
        return [merged, ...prev];
      }
      const idx = prev.findIndex((p) => p.id === id);
      const copy = [...prev];
      copy[idx] = merged;
      return copy;
    });
  }, []);

  const onNovoPedidoCozinha = useCallback((payload: unknown) => {
    setPedidos((prev) => {
      const id = extrairIdVendaPayload(payload);
      if (!id) return prev;
      const existing = prev.find((p) => p.id === id);
      const merged = mergeKdsPedidoNaLista(existing, payload);
      if (merged === null) return prev.filter((p) => p.id !== id);
      const novo = existing === undefined;
      if (novo && somNovoLiberadoRef.current) {
        queueMicrotask(() => tentarSomRef.current(merged.id, 'novo'));
      }
      const rest = prev.filter((p) => p.id !== id);
      return [...rest, merged];
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

  const abrirCancelarPedido = useCallback((id: string) => {
    const p = pedidos.find((x) => x.id === id);
    if (p && colunaKdsPermiteCancelar(p.coluna)) {
      setCancelTarget(p);
    }
  }, [pedidos]);

  const confirmarCancelarPedido = useCallback(
    async (payload: { motivo: string; observacao: string | null }) => {
      if (!cancelTarget) return;
      const id = cancelTarget.id;
      await api.post(`/api/vendas/${id}/cancelar`, {
        motivo: payload.motivo,
        observacao: payload.observacao ?? undefined,
        origem: 'KDS',
      });
      limparAlertasSomDoPedido(id);
      setPedidos((prev) => prev.filter((p) => p.id !== id));
      setCancelTarget(null);
    },
    [cancelTarget, limparAlertasSomDoPedido]
  );

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
    somNovoLiberadoRef.current = false;
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
    if (carregandoLista) return;

    const poll = async () => {
      try {
        const { data } = await api.get<unknown[]>('/api/vendas/kds');
        if (!Array.isArray(data)) return;
        setPedidos((prev) => {
          const prevIds = new Set(prev.map((p) => p.id));
          const prevMap = new Map(prev.map((p) => [p.id, p]));
          const next: KdsPedido[] = [];
          for (const row of data) {
            const id = extrairIdVendaPayload(row);
            if (!id) continue;
            const merged = mergeKdsPedidoNaLista(prevMap.get(id), row);
            if (merged) next.push(merged);
          }
          if (somNovoLiberadoRef.current) {
            const nextIds = new Set(next.map((p) => p.id));
            for (const id of nextIds) {
              if (!prevIds.has(id)) {
                queueMicrotask(() => tentarSomRef.current(id, 'novo'));
              }
            }
          }
          return next;
        });
      } catch (e) {
        if (import.meta.env.DEV) console.warn('[KDS_POLL] falha ao atualizar lista', e);
      }
    };

    const timer = window.setInterval(poll, POLL_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [carregandoLista]);

  useEffect(() => {
    const auth = buildKdsSocketAuth();
    if (!auth?.token) {
      setSocketStatus('error');
      return;
    }

    setSocketStatus('connecting');
    const baseUrl = resolveApiBaseUrl();
    const socket: Socket = io(baseUrl, {
      auth,
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 8,
      reconnectionDelay: 1200,
    });

    const onConnect = () => {
      setSocketStatus('connected');
      if (import.meta.env.DEV) {
        console.info('[KDS_SOCKET] conectado', {
          socketId: socket.id,
          url: baseUrl,
          path: '/socket.io',
          authLoja: Boolean((auth as { lojaSalaId?: string }).lojaSalaId),
        });
      }
    };
    const onDisconnect = () => {
      setSocketStatus('idle');
      if (import.meta.env.DEV) console.info('[KDS_SOCKET] desconectado');
    };
    const onConnectError = (err: unknown) => {
      setSocketStatus('error');
      if (import.meta.env.DEV) console.warn('[KDS_SOCKET] connect_error', err);
    };

    const comLog =
      (nome: string, fn: (p: unknown) => void) =>
      (payload: unknown) => {
        if (import.meta.env.DEV) console.info('[KDS_SOCKET] evento recebido:', nome);
        fn(payload);
      };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);
    socket.on('novo-pedido-cozinha', comLog('novo-pedido-cozinha', onNovoPedidoCozinha));
    socket.on('status-pedido-atualizado', comLog('status-pedido-atualizado', aplicarPayloadVenda));
    socket.on('pedido-cancelado', comLog('pedido-cancelado', onPedidoCanceladoSocket));

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      socket.off('novo-pedido-cozinha', onNovoPedidoCozinha);
      socket.off('status-pedido-atualizado', aplicarPayloadVenda);
      socket.off('pedido-cancelado', onPedidoCanceladoSocket);
      socket.disconnect();
    };
  }, [aplicarPayloadVenda, onNovoPedidoCozinha, onPedidoCanceladoSocket]);

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

  const contagemColunas = useMemo(() => {
    const atrasados = pedidos.filter((p) => isPedidoUrgente(p.recebidoEm, now)).length;
    return {
      novos: pedidos.filter((p) => p.coluna === 'TODO').length,
      prep: pedidos.filter((p) => p.coluna === 'PREPARANDO').length,
      prontos: pedidos.filter((p) => p.coluna === 'PRONTO').length,
      atrasados,
    };
  }, [pedidos, now]);

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#060816] text-white antialiased selection:bg-violet-500/30">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(139,92,246,0.12),transparent_50%)]" />

      <header className="relative z-10 flex shrink-0 flex-col gap-3 border-b border-white/10 bg-[#08101f]/90 px-4 py-3 backdrop-blur-xl md:flex-row md:items-center md:justify-between md:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06]">
            <Flame className="h-6 w-6 text-orange-300" />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight md:text-xl">KDS PRO — Cozinha</h1>
            <p className="text-xs text-white/45">
              Kitchen Display · <AuryaBranding />
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 md:gap-3">
          {carregandoLista && (
            <span className="hidden text-xs text-white/40 sm:inline">Sincronizando pedidos…</span>
          )}

          {contagemColunas.atrasados > 0 && (
            <span className="flex items-center gap-1.5 rounded-full border border-red-500/40 bg-red-500/15 px-3 py-1.5 text-xs font-semibold text-red-100">
              <AlarmClock className="h-3.5 w-3.5" />
              Atrasados: {contagemColunas.atrasados}
            </span>
          )}

          {!audioDesbloqueado ? (
            <button
              type="button"
              onClick={() => void ativarSons()}
              className="flex items-center gap-2 rounded-full border border-violet-400/55 bg-violet-600/35 px-4 py-2 text-xs font-bold text-white shadow-[0_0_20px_rgba(139,92,246,0.35)] transition hover:bg-violet-600/50"
            >
              <Volume2 className="h-4 w-4" />
              Ativar sons
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setSonsLigados((v) => !v)}
              title={sonsLigados ? 'Desativar sons' : 'Ligar sons'}
              className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                sonsLigados
                  ? 'border-violet-500/35 bg-violet-500/15 text-violet-100 hover:bg-violet-500/25'
                  : 'border-white/15 bg-white/[0.06] text-white/55 hover:bg-white/10'
              }`}
            >
              {sonsLigados ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
              {sonsLigados ? 'Sons ligados' : 'Mudo'}
            </button>
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

      <main className="relative z-10 grid min-h-0 flex-1 grid-cols-1 gap-4 p-4 md:grid-cols-3 md:gap-5 md:p-5">
        {COLUNAS.map((col) => {
          const lista = pedidosPorColuna(col.id);
          const count =
            col.id === 'TODO'
              ? contagemColunas.novos
              : col.id === 'PREPARANDO'
                ? contagemColunas.prep
                : contagemColunas.prontos;

          return (
            <section
              key={col.id}
              className="flex min-h-0 flex-col rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-md"
            >
              <div className="shrink-0 border-b border-white/10 px-4 py-3.5">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h2 className="font-semibold text-white">{col.titulo}</h2>
                    <p className="mt-0.5 text-xs text-white/45">{col.subtitulo}</p>
                  </div>
                  <span className="rounded-full border border-white/15 bg-black/25 px-3 py-1 text-sm font-bold tabular-nums text-white/90">
                    {count}
                  </span>
                </div>
              </div>
              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-4">
                {lista.map((p) => (
                  <KdsOrderCard
                    key={p.id}
                    pedido={p}
                    nowMs={now}
                    onAvancar={avancar}
                    onConcluir={concluir}
                    onCancelar={abrirCancelarPedido}
                    salvando={savingIds.has(p.id)}
                    urgente={urgenciaPorPedido.get(p.id) ?? false}
                  />
                ))}
                {lista.length === 0 && (
                  <p className="py-10 text-center text-sm text-white/35">Nenhum pedido aqui.</p>
                )}
              </div>
            </section>
          );
        })}
      </main>

      {cancelTarget && (
        <KdsCancelarPedidoModal
          pedido={cancelTarget}
          open
          onClose={() => setCancelTarget(null)}
          onConfirm={confirmarCancelarPedido}
        />
      )}

      <AuryaBranding />
    </div>
  );
}
