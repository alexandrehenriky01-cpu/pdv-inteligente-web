import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import {
  AlertCircle,
  Check,
  Copy,
  Loader2,
  QrCode,
  RefreshCcw,
  Timer,
  Wallet,
  X,
  XCircle,
} from 'lucide-react';
import { resolveApiBaseUrl } from '../../../services/api';
import { buildKdsSocketAuth } from '../../../services/socket/kdsSocketAuth';
import {
  cancelarPixPdv,
  consultarStatusPixPdv,
  iniciarPixPdv,
  revalidarPixPdv,
  type PixPdvDinamico,
  type PixPdvEstatico,
  type PixPdvIniciarResp,
  type PixPdvStatus,
} from '../services/pixPdvApi';

const POLL_INTERVAL_MS = 5_000;

export type PixPagamentoModalEstado =
  | 'loading'
  | 'aguardando'
  | 'pago'
  | 'expirado'
  | 'cancelado'
  | 'erro'
  | 'manual';

export interface PixPagamentoModalProps {
  vendaId: string;
  /** Sobrescreve o valorTotal da venda quando informado. */
  valor?: number;
  open: boolean;
  onClose(): void;
  /** Disparado quando o pagamento é confirmado pelo PSP. */
  onPago?(payload: { vendaId: string; txid: string }): void;
  /** Disparado quando operador confirma manualmente um PIX estático. */
  onConfirmacaoManual?(payload: { vendaId: string; chavePix: string }): void;
}

interface SocketPixConfirmadoPayload {
  vendaId: string;
  txid: string;
  status: string;
}

function isDinamico(r: PixPdvIniciarResp): r is PixPdvDinamico {
  return r.tipo === 'DINAMICO';
}

function isEstatico(r: PixPdvIniciarResp): r is PixPdvEstatico {
  return r.tipo === 'ESTATICO';
}

function formatBrl(n: number): string {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatTempo(restanteSeg: number): string {
  if (restanteSeg <= 0) return '00:00';
  const m = Math.floor(restanteSeg / 60).toString().padStart(2, '0');
  const s = Math.floor(restanteSeg % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export function PixPagamentoModal(props: PixPagamentoModalProps): JSX.Element | null {
  const { vendaId, valor, open, onClose, onPago, onConfirmacaoManual } = props;

  const [estado, setEstado] = useState<PixPagamentoModalEstado>('loading');
  const [erro, setErro] = useState<string | null>(null);
  const [resp, setResp] = useState<PixPdvIniciarResp | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [revalidando, setRevalidando] = useState(false);
  const [agora, setAgora] = useState(() => Date.now());

  const socketRef = useRef<Socket | null>(null);
  const pollRef = useRef<number | null>(null);
  const closedRef = useRef(false);

  const reset = useCallback(() => {
    setEstado('loading');
    setErro(null);
    setResp(null);
    setCopiado(false);
    setRevalidando(false);
  }, []);

  const fechar = useCallback(() => {
    closedRef.current = true;
    if (pollRef.current !== null) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    onClose();
  }, [onClose]);

  // ── Iniciar cobrança ──
  useEffect(() => {
    if (!open || !vendaId) return;
    closedRef.current = false;
    reset();

    let cancelado = false;
    void (async () => {
      try {
        const r = await iniciarPixPdv(vendaId, valor);
        if (cancelado) return;
        setResp(r);
        if (isDinamico(r)) setEstado('aguardando');
        else if (isEstatico(r)) setEstado('manual');
      } catch (e: unknown) {
        if (cancelado) return;
        const ax = e as { response?: { data?: { error?: string } }; message?: string };
        setErro(ax.response?.data?.error ?? ax.message ?? 'Falha ao iniciar PIX.');
        setEstado('erro');
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [open, vendaId, valor, reset]);

  // ── Tick para contador de expiração ──
  useEffect(() => {
    if (estado !== 'aguardando') return;
    const t = window.setInterval(() => setAgora(Date.now()), 1_000);
    return () => window.clearInterval(t);
  }, [estado]);

  // ── Socket: pagamento confirmado / cancelado / expirado ──
  useEffect(() => {
    if (estado !== 'aguardando') return;
    const auth = buildKdsSocketAuth();
    if (!auth?.token) return;

    const socket: Socket = io(resolveApiBaseUrl(), {
      auth,
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1500,
    });
    socketRef.current = socket;

    const onPagamento = (payload: unknown): void => {
      const p = payload as SocketPixConfirmadoPayload;
      if (!p || typeof p !== 'object') return;
      if (p.vendaId !== vendaId) return;
      setEstado('pago');
      onPago?.({ vendaId, txid: p.txid });
    };
    const onCancelado = (payload: unknown): void => {
      const p = payload as { vendaId?: string; txid?: string };
      if (p?.vendaId !== vendaId) return;
      setEstado('cancelado');
    };
    const onExpirado = (payload: unknown): void => {
      const p = payload as { vendaId?: string; txid?: string };
      if (p?.vendaId !== vendaId) return;
      setEstado('expirado');
    };

    socket.on('pix-pagamento-confirmado', onPagamento);
    socket.on('pix-cancelado', onCancelado);
    socket.on('pix-expirado', onExpirado);

    return () => {
      socket.off('pix-pagamento-confirmado', onPagamento);
      socket.off('pix-cancelado', onCancelado);
      socket.off('pix-expirado', onExpirado);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [estado, vendaId, onPago]);

  // ── Polling fallback ──
  useEffect(() => {
    if (estado !== 'aguardando') return;
    if (!resp || !isDinamico(resp)) return;
    const txid = resp.txid;

    const tick = async (): Promise<void> => {
      try {
        const s = await consultarStatusPixPdv(txid);
        if (closedRef.current) return;
        if (s.status === 'PAGO') {
          setEstado('pago');
          onPago?.({ vendaId, txid });
        } else if (s.status === 'EXPIRADO') {
          setEstado('expirado');
        } else if (s.status === 'CANCELADO') {
          setEstado('cancelado');
        }
      } catch {
        /* mantém aguardando — socket cuida do happy path */
      }
    };

    pollRef.current = window.setInterval(() => void tick(), POLL_INTERVAL_MS);
    return () => {
      if (pollRef.current !== null) {
        window.clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [estado, resp, vendaId, onPago]);

  const expiresAtMs = useMemo(() => {
    if (!resp || !isDinamico(resp) || !resp.expiresAt) return null;
    const t = Date.parse(resp.expiresAt);
    return Number.isFinite(t) ? t : null;
  }, [resp]);

  const restanteSeg = useMemo(() => {
    if (!expiresAtMs) return 0;
    return Math.max(0, Math.floor((expiresAtMs - agora) / 1000));
  }, [expiresAtMs, agora]);

  const copiar = useCallback(async (texto: string) => {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 2_000);
    } catch {
      setErro('Falha ao copiar para a área de transferência.');
    }
  }, []);

  const revalidar = useCallback(async () => {
    if (!resp || !isDinamico(resp)) return;
    setRevalidando(true);
    try {
      const r = await revalidarPixPdv(resp.txid);
      if (r.status === 'CONFIRMADO' || r.status === 'JA_CONFIRMADO') {
        setEstado('pago');
        onPago?.({ vendaId, txid: resp.txid });
      } else if (r.status === 'EXPIRADO') {
        setEstado('expirado');
      } else if (r.status === 'CANCELADO') {
        setEstado('cancelado');
      } else {
        setErro(r.motivo ?? 'Pagamento ainda não confirmado pelo PSP.');
      }
    } catch (e: unknown) {
      const ax = e as { response?: { data?: { error?: string } }; message?: string };
      setErro(ax.response?.data?.error ?? ax.message ?? 'Falha ao revalidar.');
    } finally {
      setRevalidando(false);
    }
  }, [resp, vendaId, onPago]);

  const cancelar = useCallback(async () => {
    if (!resp || !isDinamico(resp)) return;
    if (!window.confirm('Cancelar a cobrança PIX atual? O cliente não conseguirá mais pagar com este código.')) {
      return;
    }
    try {
      await cancelarPixPdv(resp.txid);
      setEstado('cancelado');
    } catch (e: unknown) {
      const ax = e as { response?: { data?: { error?: string } }; message?: string };
      setErro(ax.response?.data?.error ?? ax.message ?? 'Falha ao cancelar.');
    }
  }, [resp]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-3xl border border-white/10 bg-[radial-gradient(circle_at_top,_rgba(139,92,246,0.18),_transparent_50%),linear-gradient(160deg,_#0b1324_0%,_#08101f_100%)] p-6 shadow-2xl">
        <button
          type="button"
          onClick={fechar}
          className="absolute right-4 top-4 rounded-lg p-2 text-slate-400 hover:bg-white/10"
          aria-label="Fechar"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-violet-300">
          <Wallet size={14} /> Pagamento PIX
        </div>

        {estado === 'loading' && (
          <div className="flex flex-col items-center gap-3 py-16 text-slate-300">
            <Loader2 className="h-10 w-10 animate-spin text-violet-400" />
            <p className="text-sm">Gerando cobrança PIX…</p>
          </div>
        )}

        {estado === 'erro' && (
          <div className="flex flex-col items-center gap-4 py-12 text-center">
            <AlertCircle className="h-12 w-12 text-red-400" />
            <h3 className="text-lg font-bold text-white">Não foi possível gerar o PIX</h3>
            {erro && <p className="text-sm text-slate-400">{erro}</p>}
            <button
              type="button"
              onClick={fechar}
              className="rounded-xl border border-white/10 bg-[#08101f] px-4 py-2 text-sm font-medium text-slate-300 hover:bg-white/10"
            >
              Voltar
            </button>
          </div>
        )}

        {estado === 'pago' && (
          <div className="flex flex-col items-center gap-4 py-10 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
              <Check className="h-9 w-9" strokeWidth={3} />
            </div>
            <h3 className="text-xl font-black text-white">Pagamento confirmado</h3>
            <p className="max-w-sm text-sm text-slate-400">
              O PSP confirmou o recebimento. Você pode prosseguir com a venda no caixa.
            </p>
            {valor != null && (
              <p className="text-2xl font-black tabular-nums text-emerald-300">{formatBrl(valor)}</p>
            )}
            <button
              type="button"
              onClick={fechar}
              className="mt-2 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 px-6 py-2.5 text-sm font-bold text-white shadow-lg"
            >
              <Check className="h-4 w-4" /> Continuar venda
            </button>
          </div>
        )}

        {(estado === 'expirado' || estado === 'cancelado') && (
          <div className="flex flex-col items-center gap-4 py-12 text-center">
            <XCircle className="h-12 w-12 text-red-400" />
            <h3 className="text-lg font-bold text-white">
              {estado === 'expirado' ? 'Cobrança expirada' : 'Cobrança cancelada'}
            </h3>
            <p className="max-w-sm text-sm text-slate-400">
              {estado === 'expirado'
                ? 'O tempo limite foi atingido. Gere uma nova cobrança ou escolha outra forma de pagamento.'
                : 'Esta cobrança foi cancelada. Você pode escolher outra forma de pagamento.'}
            </p>
            <button
              type="button"
              onClick={fechar}
              className="rounded-xl border border-white/10 bg-[#08101f] px-4 py-2 text-sm font-medium text-slate-300 hover:bg-white/10"
            >
              Voltar
            </button>
          </div>
        )}

        {estado === 'aguardando' && resp && isDinamico(resp) && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-lg font-black text-white">Aguardando pagamento</h3>
              {restanteSeg > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-bold tabular-nums text-amber-200">
                  <Timer className="h-3.5 w-3.5" /> {formatTempo(restanteSeg)}
                </span>
              )}
            </div>

            <div className="flex justify-center rounded-2xl border border-white/10 bg-white p-4">
              {resp.qrCodeBase64 ? (
                <img
                  src={`data:image/png;base64,${resp.qrCodeBase64}`}
                  alt="QR Code PIX"
                  className="h-48 w-48 object-contain"
                />
              ) : (
                <QrCode className="h-32 w-32 text-slate-300" />
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase text-slate-500">
                Código copia e cola
              </label>
              <textarea
                readOnly
                value={resp.pixCopiaCola}
                rows={3}
                className="w-full resize-none rounded-xl border border-violet-500/20 bg-[#060816] px-3 py-2 text-[10px] leading-tight text-emerald-300"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void copiar(resp.pixCopiaCola)}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 py-2.5 text-sm font-bold text-emerald-200 hover:bg-emerald-500/20"
              >
                <Copy className="h-4 w-4" /> {copiado ? 'Copiado!' : 'Copiar código'}
              </button>
              <button
                type="button"
                onClick={() => void revalidar()}
                disabled={revalidando}
                className="flex items-center justify-center gap-2 rounded-xl border border-violet-500/30 bg-violet-500/10 px-4 py-2.5 text-sm font-bold text-violet-200 hover:bg-violet-500/20 disabled:opacity-50"
              >
                {revalidando ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                Revalidar
              </button>
              <button
                type="button"
                onClick={() => void cancelar()}
                className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm font-bold text-red-200 hover:bg-red-500/20"
              >
                Cancelar
              </button>
            </div>

            {erro && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                {erro}
              </div>
            )}

            <p className="text-center text-[11px] text-slate-500">
              Este modal atualiza automaticamente quando o pagamento é confirmado pelo banco.
            </p>
          </div>
        )}

        {estado === 'manual' && resp && isEstatico(resp) && (
          <div className="space-y-4">
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
              <p className="font-bold">Confirmação manual necessária</p>
              <p className="mt-1 text-xs text-amber-200/80">
                {resp.mensagem ??
                  'Este local de cobrança não tem confirmação automática. Receba o PIX e confirme no caixa.'}
              </p>
            </div>

            {/* QR Code do BR Code estático (gerado pelo backend) */}
            {resp.qrCodeBase64 && (
              <div className="flex justify-center rounded-2xl border border-white/10 bg-white p-4">
                <img
                  src={`data:image/png;base64,${resp.qrCodeBase64}`}
                  alt="QR Code PIX"
                  className="h-48 w-48 object-contain"
                />
              </div>
            )}

            {/* Copia e cola: prioriza pixCopiaCola (BR Code completo); fallback para chave pura */}
            {resp.pixCopiaCola ? (
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase text-slate-500">
                  Código copia e cola
                </label>
                <textarea
                  readOnly
                  value={resp.pixCopiaCola}
                  rows={3}
                  className="w-full resize-none rounded-xl border border-violet-500/20 bg-[#060816] px-3 py-2 text-[10px] leading-tight text-emerald-300"
                />
              </div>
            ) : (
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase text-slate-500">
                  Chave PIX da loja
                </label>
                <input
                  readOnly
                  value={resp.chavePix}
                  className="w-full rounded-xl border border-white/10 bg-[#08101f] px-4 py-2.5 text-sm text-white"
                />
              </div>
            )}

            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => void copiar(resp.pixCopiaCola ?? resp.chavePix)}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 py-2.5 text-sm font-bold text-emerald-200 hover:bg-emerald-500/20"
              >
                <Copy className="h-4 w-4" />
                {copiado
                  ? 'Copiado!'
                  : resp.pixCopiaCola
                    ? 'Copiar código PIX'
                    : 'Copiar chave PIX'}
              </button>

              <div className="flex flex-wrap gap-2">
                {onConfirmacaoManual && (
                  <button
                    type="button"
                    onClick={() => onConfirmacaoManual({ vendaId, chavePix: resp.chavePix })}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 py-2.5 text-sm font-bold text-white"
                  >
                    <Check className="h-4 w-4" /> Confirmar pagamento manualmente
                  </button>
                )}
                <button
                  type="button"
                  onClick={fechar}
                  className="rounded-xl border border-white/10 bg-[#08101f] px-4 py-2.5 text-sm font-medium text-slate-300 hover:bg-white/10"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function statusLabel(_s: PixPdvStatus | undefined): string {
  return '';
}
void statusLabel;
