import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, CheckCircle2, AlertTriangle, RefreshCw, LogOut } from 'lucide-react';
import { api } from '../services/api';
import { auryaBrandMark } from '../assets/branding';
import { AUTH_TOKEN_KEY, AUTH_USER_KEY } from '../services/authStorage';

/**
 * RC1.13 — Sincronização Inicial.
 *
 * Tela exibida pós-login quando o backend reporta snapshotApplied=false.
 * Dispara POST /api/activation/resync e faz polling em
 * GET /api/activation/bootstrap-status até concluir.
 *
 * Sem bypass: enquanto snapshotApplied=false, o backend (SnapshotGate)
 * retorna 412 SNAPSHOT_NOT_APPLIED em qualquer rota operacional.
 */

interface BootstrapStatus {
  installed: boolean;
  activated: boolean;
  mode: string;
  lojaId: string | null;
  installationId: string | null;
  snapshotApplied: boolean;
  snapshotAppliedAt: string | null;
  snapshotCounts: Record<string, { ok: number; failed: number; retried?: number; nullified?: number }> | null;
  incrementalSyncEnabled: boolean;
  entities: Record<string, number>;
}

type Phase = 'idle' | 'syncing' | 'completed' | 'failed';

const POLL_MS = 2000;

function formatEntityName(key: string): string {
  const map: Record<string, string> = {
    produtos: 'Produtos',
    categorias: 'Categorias',
    mesas: 'Mesas',
    itemCardapio: 'Itens do Cardápio',
    adquirentes: 'Adquirentes',
    caixas: 'Caixas',
    permissoesCargo: 'Permissões',
    usuarios: 'Usuários',
    estoque: 'Estoque',
    estacoesTrabalho: 'Estações de Trabalho',
    impressoras: 'Impressoras',
    embalagens: 'Embalagens',
    tabelaPreco: 'Tabela de Preço',
    tabelaPrecoItem: 'Itens de Tabela de Preço',
    pessoas: 'Pessoas (fornecedores)',
    planoContas: 'Plano de Contas',
    naturezaOperacao: 'CFOPs',
    regraFiscal: 'Regras Fiscais',
  };
  return map[key] || key;
}

export function SincronizacaoInicial() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>('idle');
  const [status, setStatus] = useState<BootstrapStatus | null>(null);
  const [error, setError] = useState<string>('');
  const pollRef = useRef<number | null>(null);

  const fetchStatus = useCallback(async (): Promise<BootstrapStatus | null> => {
    try {
      const resp = await api.get<BootstrapStatus>('/api/activation/bootstrap-status');
      setStatus(resp.data);
      return resp.data;
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Falha ao consultar status');
      return null;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const s = await fetchStatus();
      if (cancelled) return;
      if (s?.snapshotApplied) {
        setPhase('completed');
      }
    })();
    return () => {
      cancelled = true;
      if (pollRef.current) {
        window.clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [fetchStatus]);

  const startSync = useCallback(async () => {
    setError('');
    setPhase('syncing');
    try {
      await api.post('/api/activation/resync', {});
      // Polling até confirmar snapshotApplied=true ou backend reportar falha.
      pollRef.current = window.setInterval(async () => {
        const s = await fetchStatus();
        if (!s) return;
        if (s.snapshotApplied) {
          if (pollRef.current) window.clearInterval(pollRef.current);
          pollRef.current = null;
          setPhase('completed');
        }
      }, POLL_MS);
    } catch (e: any) {
      const code = e?.response?.data?.code;
      const msg =
        e?.response?.data?.error ||
        e?.message ||
        'Falha ao iniciar a sincronização inicial.';
      setError(`${msg}${code ? ` (${code})` : ''}`);
      setPhase('failed');
      if (pollRef.current) {
        window.clearInterval(pollRef.current);
        pollRef.current = null;
      }
    }
  }, [fetchStatus]);

  // Auto-redirect after success.
  useEffect(() => {
    if (phase !== 'completed') return;
    const t = window.setTimeout(() => {
      try {
        const userStr = localStorage.getItem(AUTH_USER_KEY);
        const role = userStr ? (JSON.parse(userStr).role as string | undefined) : undefined;
        if (role === 'CAIXA' || role === 'VENDEDOR') navigate('/frente-caixa');
        else if (role === 'GARCOM') navigate('/garcom/mesas');
        else navigate('/dashboard');
      } catch {
        navigate('/dashboard');
      }
    }, 1500);
    return () => window.clearTimeout(t);
  }, [phase, navigate]);

  const handleSair = useCallback(() => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
    navigate('/login');
  }, [navigate]);

  const counts = status?.snapshotCounts ?? null;
  const entities = status?.entities ?? {};

  const totalOk = useMemo(() => {
    if (!counts) return 0;
    return Object.values(counts).reduce((s, c) => s + (c.ok ?? 0), 0);
  }, [counts]);
  const totalFailed = useMemo(() => {
    if (!counts) return 0;
    return Object.values(counts).reduce((s, c) => s + (c.failed ?? 0), 0);
  }, [counts]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 px-4 py-10">
      <div className="w-full max-w-2xl bg-slate-900/80 backdrop-blur rounded-2xl shadow-2xl border border-slate-700/60 overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-800 flex items-center gap-4">
          <img src={auryaBrandMark} alt="Aurya" className="h-10 w-10" />
          <div>
            <h1 className="text-xl font-semibold text-white">Sincronização Inicial</h1>
            <p className="text-sm text-slate-400">
              Baixando a base operacional da sua loja para uso offline.
            </p>
          </div>
        </div>

        <div className="px-8 py-6 space-y-6">
          {phase === 'idle' && (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-amber-200 text-sm flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">Ambiente sem carga inicial</p>
                <p className="text-amber-200/80 text-xs mt-1">
                  O sistema só libera operação após baixar produtos, cardápio,
                  mesas e configurações da nuvem.
                </p>
              </div>
            </div>
          )}

          {phase === 'syncing' && (
            <div className="rounded-lg border border-sky-500/40 bg-sky-500/10 px-4 py-3 text-sky-200 text-sm flex items-start gap-3">
              <Loader2 className="h-5 w-5 mt-0.5 shrink-0 animate-spin" />
              <div>
                <p className="font-medium">Baixando snapshot da nuvem…</p>
                <p className="text-sky-200/80 text-xs mt-1">
                  Não feche esta janela. Pode levar alguns minutos em conexões
                  lentas.
                </p>
              </div>
            </div>
          )}

          {phase === 'completed' && (
            <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-emerald-200 text-sm flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">Sincronização concluída</p>
                <p className="text-emerald-200/80 text-xs mt-1">
                  Redirecionando para a operação…
                </p>
              </div>
            </div>
          )}

          {phase === 'failed' && error && (
            <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-rose-200 text-sm flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">Sincronização falhou</p>
                <p className="text-rose-200/80 text-xs mt-1">{error}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Object.keys(entities)
              .sort()
              .map((key) => {
                const total = entities[key] ?? 0;
                const c = counts?.[key];
                const ok = c?.ok ?? 0;
                const failed = c?.failed ?? 0;
                const visualTotal = total > 0 ? total : ok;
                return (
                  <div
                    key={key}
                    className="rounded-lg bg-slate-800/60 border border-slate-700/60 px-3 py-3"
                  >
                    <div className="text-xs text-slate-400">
                      {formatEntityName(key)}
                    </div>
                    <div className="mt-1 text-lg font-semibold text-white tabular-nums">
                      {visualTotal}
                    </div>
                    {failed > 0 && (
                      <div className="text-xs text-rose-300 mt-0.5">
                        {failed} falha{failed > 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>

          {counts && (
            <div className="text-xs text-slate-400 flex items-center gap-4">
              <span>
                Snapshot: <strong className="text-emerald-300">{totalOk} ok</strong>
                {totalFailed > 0 && (
                  <>
                    {' '}
                    /{' '}
                    <strong className="text-rose-300">
                      {totalFailed} falhas
                    </strong>
                  </>
                )}
              </span>
              {status?.snapshotAppliedAt && (
                <span>
                  Última aplicação:{' '}
                  {new Date(status.snapshotAppliedAt).toLocaleString('pt-BR')}
                </span>
              )}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="button"
              onClick={startSync}
              disabled={phase === 'syncing' || phase === 'completed'}
              className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-semibold transition"
            >
              {phase === 'syncing' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              {phase === 'failed'
                ? 'Tentar novamente'
                : phase === 'completed'
                  ? 'Concluído'
                  : 'Sincronizar base inicial'}
            </button>

            <button
              type="button"
              onClick={handleSair}
              className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
            >
              <LogOut className="h-4 w-4" /> Sair
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SincronizacaoInicial;
