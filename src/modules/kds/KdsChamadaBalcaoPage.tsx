import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { Bell, BellOff, Loader2, Radio } from 'lucide-react';
import { api, resolveApiBaseUrl } from '../../services/api';
import { buildKdsSocketAuth } from '../../services/socket/kdsSocketAuth';
import { AuryaBranding } from '../../components/AuryaBranding';
import {
  montarLinhasChamadaBalcao,
  mesclarPayloadVendaCache,
  popularCacheAPartirDaListaApi,
  type KdsChamadaBalcaoLinha,
} from './kdsChamadaBalcaoUtils';
import { extrairIdVendaPayload } from './kdsPedidoUtils';

const POLL_MS = 10_000;
const ROTACAO_MS = 7000;
const MAX_LISTA_SECUNDARIA = 6;
const SONS_INTERVALOS_MS = [0, 5000, 10000] as const;

function tocarSomLeveChamada(): void {
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.connect(g);
    g.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.value = 830;
    g.gain.setValueAtTime(0.055, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.12);
    osc.onended = () => void ctx.close();
  } catch {
    /* TV / autoplay */
  }
}

type SocketStatus = 'idle' | 'connecting' | 'connected' | 'error';

export function KdsChamadaBalcaoPage() {
  const [linhas, setLinhas] = useState<KdsChamadaBalcaoLinha[]>([]);
  const [socketStatus, setSocketStatus] = useState<SocketStatus>('idle');
  const [carregando, setCarregando] = useState(true);
  const [somLigado, setSomLigado] = useState(true);
  const [rotationIndex, setRotationIndex] = useState(0);
  const [animacaoEntrada, setAnimacaoEntrada] = useState<Record<string, boolean>>({});
  const [pulseNovo, setPulseNovo] = useState<Record<string, boolean>>({});

  const cacheRef = useRef(new Map<string, Record<string, unknown>>());
  const liberarDeteccaoNovoRef = useRef(false);
  const somLigadoRef = useRef(somLigado);
  const sonsPorPedidoRef = useRef(new Map<string, number[]>());

  somLigadoRef.current = somLigado;

  const limparSonsPedido = useCallback((pedidoId: string) => {
    const arr = sonsPorPedidoRef.current.get(pedidoId);
    if (arr) {
      arr.forEach((t) => clearTimeout(t));
      sonsPorPedidoRef.current.delete(pedidoId);
    }
  }, []);

  const limparTodosSonsAgendados = useCallback(() => {
    for (const [, arr] of sonsPorPedidoRef.current) {
      arr.forEach((t) => clearTimeout(t));
    }
    sonsPorPedidoRef.current.clear();
  }, []);

  const agendarTresSons = useCallback(
    (pedidoId: string) => {
      limparSonsPedido(pedidoId);
      if (!somLigadoRef.current) return;
      const timeouts: number[] = [];
      SONS_INTERVALOS_MS.forEach((ms, idx) => {
        const t = window.setTimeout(() => {
          if (!somLigadoRef.current) return;
          tocarSomLeveChamada();
          if (import.meta.env.DEV) {
            console.info(`[KDS_CHAMADA_AUDIO] disparo ${idx + 1}`, pedidoId);
          }
        }, ms);
        timeouts.push(t);
      });
      sonsPorPedidoRef.current.set(pedidoId, timeouts);
    },
    [limparSonsPedido]
  );

  const ativarAnimacaoEntrada = useCallback((id: string) => {
    setAnimacaoEntrada((m) => ({ ...m, [id]: true }));
    window.setTimeout(() => {
      setAnimacaoEntrada((m) => {
        const n = { ...m };
        delete n[id];
        return n;
      });
    }, 600);
  }, []);

  const ativarPulseNovo = useCallback((id: string) => {
    setPulseNovo((m) => ({ ...m, [id]: true }));
    window.setTimeout(() => {
      setPulseNovo((m) => {
        const n = { ...m };
        delete n[id];
        return n;
      });
    }, 5000);
  }, []);

  const sincronizarLista = useCallback(
    (detectarNovo: boolean) => {
      const next = montarLinhasChamadaBalcao(cacheRef.current);
      setLinhas((prev) => {
        const prevIds = new Set(prev.map((l) => l.id));
        const nextIds = new Set(next.map((l) => l.id));
        for (const id of prevIds) {
          if (!nextIds.has(id)) limparSonsPedido(id);
        }

        let novoId: string | undefined;
        if (detectarNovo && liberarDeteccaoNovoRef.current) {
          const novo = next.find((l) => !prevIds.has(l.id));
          if (novo) novoId = novo.id;
        }

        if (novoId) {
          queueMicrotask(() => {
            agendarTresSons(novoId!);
            ativarAnimacaoEntrada(novoId!);
            ativarPulseNovo(novoId!);
            setRotationIndex(0);
            if (import.meta.env.DEV) console.info('[KDS_CHAMADA] novo na fila', novoId);
          });
        }

        return next;
      });
    },
    [agendarTresSons, ativarAnimacaoEntrada, ativarPulseNovo, limparSonsPedido]
  );

  const sincronizarListaRef = useRef(sincronizarLista);
  sincronizarListaRef.current = sincronizarLista;

  useEffect(() => {
    return () => {
      limparTodosSonsAgendados();
    };
  }, [limparTodosSonsAgendados]);

  useEffect(() => {
    if (!somLigado) {
      limparTodosSonsAgendados();
    }
  }, [somLigado, limparTodosSonsAgendados]);

  useEffect(() => {
    if (!carregando) {
      liberarDeteccaoNovoRef.current = true;
    }
  }, [carregando]);

  const linhasIdsKey = useMemo(() => linhas.map((l) => l.id).join('|'), [linhas]);

  useEffect(() => {
    if (linhas.length === 0) {
      setRotationIndex(0);
      return;
    }
    setRotationIndex((i) => Math.min(i, linhas.length - 1));
  }, [linhas.length, linhasIdsKey]);

  useEffect(() => {
    if (linhas.length <= 1) return;
    const iv = window.setInterval(() => {
      setRotationIndex((i) => (i + 1) % linhas.length);
    }, ROTACAO_MS);
    return () => clearInterval(iv);
  }, [linhas.length, linhasIdsKey]);

  const principal = linhas.length > 0 ? linhas[Math.min(rotationIndex, linhas.length - 1)] : null;
  const secundarias = useMemo(() => {
    if (linhas.length === 0) return [];
    const idx = Math.min(rotationIndex, linhas.length - 1);
    return linhas.filter((_, i) => i !== idx).slice(0, MAX_LISTA_SECUNDARIA);
  }, [linhas, rotationIndex]);

  const onPayloadSocket = useCallback(
    (payload: unknown, evento: string) => {
      if (import.meta.env.DEV) {
        console.info('[KDS_SOCKET] evento recebido (chamada balcão):', evento);
      }
      mesclarPayloadVendaCache(cacheRef.current, payload);
      sincronizarLista(true);
    },
    [sincronizarLista]
  );

  useEffect(() => {
    let cancel = false;
    liberarDeteccaoNovoRef.current = false;
    (async () => {
      setCarregando(true);
      try {
        const { data } = await api.get<unknown[]>('/api/vendas/kds');
        if (cancel || !Array.isArray(data)) return;
        popularCacheAPartirDaListaApi(cacheRef.current, data);
        sincronizarListaRef.current(false);
      } catch (e) {
        console.error('KDS chamada: falha ao carregar', e);
      } finally {
        if (!cancel) setCarregando(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, []);

  useEffect(() => {
    if (carregando) return;
    const poll = async () => {
      try {
        const { data } = await api.get<unknown[]>('/api/vendas/kds');
        if (!Array.isArray(data)) return;
        popularCacheAPartirDaListaApi(cacheRef.current, data);
        sincronizarListaRef.current(true);
      } catch (e) {
        if (import.meta.env.DEV) console.warn('[KDS_CHAMADA] poll falhou', e);
      }
    };
    const t = window.setInterval(poll, POLL_MS);
    return () => clearInterval(t);
  }, [carregando]);

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
        console.info('[KDS_SOCKET] conectado (chamada balcão)', {
          socketId: socket.id,
          url: baseUrl,
        });
      }
    };
    const onDisconnect = () => setSocketStatus('idle');
    const onConnectError = (err: unknown) => {
      setSocketStatus('error');
      if (import.meta.env.DEV) console.warn('[KDS_SOCKET] connect_error (chamada)', err);
    };

    const novo = (p: unknown) => onPayloadSocket(p, 'novo-pedido-cozinha');
    const status = (p: unknown) => onPayloadSocket(p, 'status-pedido-atualizado');
    const cancelado = (p: unknown) => {
      const id = extrairIdVendaPayload(p);
      if (id) limparSonsPedido(id);
      onPayloadSocket(p, 'pedido-cancelado');
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);
    socket.on('novo-pedido-cozinha', novo);
    socket.on('status-pedido-atualizado', status);
    socket.on('pedido-cancelado', cancelado);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      socket.off('novo-pedido-cozinha', novo);
      socket.off('status-pedido-atualizado', status);
      socket.off('pedido-cancelado', cancelado);
      socket.disconnect();
    };
  }, [onPayloadSocket]);

  const statusLabel =
    socketStatus === 'connecting'
      ? 'Conectando…'
      : socketStatus === 'connected'
        ? 'Ao vivo'
        : socketStatus === 'error'
          ? 'Sem tempo real'
          : 'Desconectado';

  const classePulse = (id: string) =>
    pulseNovo[id]
      ? 'border-fuchsia-400/90 shadow-[0_0_48px_rgba(192,38,211,0.45)] ring-2 ring-violet-400/70'
      : 'border-white/20';

  return (
    <div className="flex min-h-screen flex-col bg-[#08101f] text-white antialiased selection:bg-violet-500/30">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(139,92,246,0.2),transparent_45%),radial-gradient(ellipse_at_80%_100%,rgba(192,38,211,0.12),transparent_40%)]" />

      <header className="relative z-10 flex shrink-0 items-center justify-between gap-4 border-b border-white/10 bg-[#08101f]/98 px-6 py-3 backdrop-blur-xl md:py-4">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-white md:text-xl">
            Chamada — Retirada no balcão
          </h1>
          <p className="mt-0.5 text-xs text-white/45 md:text-sm">
            painel de TV · <AuryaBranding variant="tv" />
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 md:gap-3">
          <button
            type="button"
            onClick={() => setSomLigado((v) => !v)}
            className={`flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition md:px-4 md:text-sm ${
              somLigado
                ? 'border-violet-500/40 bg-violet-500/15 text-violet-100'
                : 'border-white/15 bg-white/[0.06] text-white/50'
            }`}
          >
            {somLigado ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
            {somLigado ? 'Som' : 'Mudo'}
          </button>
          <div
            className={`flex items-center gap-2 rounded-full border px-2.5 py-1.5 text-xs font-medium md:px-3 ${
              socketStatus === 'connected'
                ? 'border-emerald-500/35 bg-emerald-500/15 text-emerald-200'
                : socketStatus === 'connecting'
                  ? 'border-amber-500/35 bg-amber-500/15 text-amber-100'
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

      <main className="relative z-10 flex flex-1 flex-col items-center px-4 py-6 md:px-10 md:py-10">
        {carregando ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-white/50">
            <Loader2 className="h-12 w-12 animate-spin text-violet-400" />
            <p className="text-xl">Carregando…</p>
          </div>
        ) : linhas.length === 0 ? (
          <div className="flex max-w-2xl flex-1 flex-col items-center justify-center text-center">
            <p className="text-3xl font-semibold text-white/75 md:text-4xl">
              Nenhum pedido pronto para retirada.
            </p>
            <p className="mt-6 text-sm font-semibold uppercase tracking-[0.25em] text-fuchsia-300/80 md:text-base">
              Aguarde chamada
            </p>
            <p className="mt-4 text-lg text-white/40">
              Novos pedidos aparecem aqui automaticamente quando ficarem prontos.
            </p>
          </div>
        ) : (
          <div className="flex w-full max-w-5xl flex-1 flex-col items-center gap-8 md:gap-12">
            <p className="text-center text-xs font-bold uppercase tracking-[0.35em] text-violet-300/90 md:text-sm">
              Pronto para retirada
            </p>

            {principal && (
              <div
                className={`w-full max-w-4xl rounded-3xl border-2 bg-gradient-to-br from-violet-600/25 via-fuchsia-600/15 to-indigo-900/30 px-6 py-10 text-center transition-all duration-500 md:px-12 md:py-14 ${classePulse(
                  principal.id
                )} ${animacaoEntrada[principal.id] ? 'kds-chamada-tv-enter' : ''}`}
              >
                <p className="font-mono text-5xl font-bold leading-tight tracking-tight text-white md:text-7xl lg:text-8xl">
                  <span className="bg-gradient-to-r from-violet-200 to-fuchsia-200 bg-clip-text text-transparent">
                    #{principal.numero}
                  </span>
                  <span className="mx-4 text-white/35 md:mx-8">—</span>
                  <span className="text-white">{principal.nome}</span>
                </p>
              </div>
            )}

            {secundarias.length > 0 && (
              <div className="w-full max-w-3xl">
                <p className="mb-4 text-center text-[11px] font-semibold uppercase tracking-widest text-white/40">
                  Também na fila
                </p>
                <ul className="flex flex-col gap-3 md:gap-4">
                  {secundarias.map((l) => (
                    <li
                      key={l.id}
                      className={`rounded-2xl border-2 bg-white/[0.06] px-5 py-4 text-center transition-all duration-500 md:px-8 md:py-5 ${classePulse(
                        l.id
                      )} ${animacaoEntrada[l.id] ? 'kds-chamada-tv-enter' : ''}`}
                    >
                      <p className="font-mono text-2xl font-semibold text-white md:text-4xl">
                        <span className="text-violet-200">#{l.numero}</span>
                        <span className="mx-3 text-white/35 md:mx-5">—</span>
                        <span>{l.nome}</span>
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </main>

      <AuryaBranding variant="tv" />
    </div>
  );
}
