import { useCallback, useEffect, useMemo, useState } from 'react';
import { Cpu, RefreshCw, ShieldCheck, ShieldOff, Ban, CheckCircle2 } from 'lucide-react';
import {
  listRhAgentDevices,
  revokeRhAgentDevice,
  setRhAgentTrust,
  type RhAgentDeviceView,
  type RhAgentTrustLevel,
} from '../services/rhAgentApi';

const TRUST_COLORS: Record<RhAgentTrustLevel, string> = {
  PENDING: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
  TRUSTED: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
  REVOKED: 'bg-rose-500/10 text-rose-300 border-rose-500/30',
  BLOCKED: 'bg-rose-500/20 text-rose-200 border-rose-500/40',
};

const STATUS_LABEL: Record<RhAgentDeviceView['status'], string> = {
  ONLINE: 'Online',
  OFFLINE: 'Offline',
  UNKNOWN: 'Desconhecido',
};

function formatDate(value: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'medium' });
}

export default function RhAgentDispositivosPage(): JSX.Element {
  const [devices, setDevices] = useState<RhAgentDeviceView[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyAgentId, setBusyAgentId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await listRhAgentDevices();
      setDevices(list);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha ao carregar dispositivos.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const summary = useMemo(() => {
    if (!devices) return null;
    const counts: Record<RhAgentTrustLevel, number> = { PENDING: 0, TRUSTED: 0, REVOKED: 0, BLOCKED: 0 };
    for (const d of devices) counts[d.trustLevel]++;
    return counts;
  }, [devices]);

  const handleApprove = async (agentId: string): Promise<void> => {
    setBusyAgentId(agentId);
    try {
      await setRhAgentTrust(agentId, 'TRUSTED');
      await reload();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha ao aprovar dispositivo.';
      setError(message);
    } finally {
      setBusyAgentId(null);
    }
  };

  const handleRevoke = async (agentId: string, hardBlock: boolean): Promise<void> => {
    const reason = window.prompt(
      hardBlock
        ? 'Motivo para BLOQUEAR (terminal) este dispositivo:'
        : 'Motivo para revogar este dispositivo:',
      ''
    );
    if (!reason || reason.trim().length < 3) return;
    setBusyAgentId(agentId);
    try {
      await revokeRhAgentDevice(agentId, reason.trim(), hardBlock);
      await reload();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha ao revogar dispositivo.';
      setError(message);
    } finally {
      setBusyAgentId(null);
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl p-6">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-white">
            <Cpu className="h-6 w-6 text-violet-300" />
            Dispositivos AuryaRhAgent
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Gestão dos serviços AuryaRhAgent instalados nas máquinas da loja. Sprint 1 entrega
            handshake + registro + revogação. Biometria fica para sprint posterior.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void reload()}
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 hover:bg-white/10"
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </header>

      {error ? (
        <div className="mb-4 rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-rose-200">
          {error}
        </div>
      ) : null}

      {summary ? (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(['TRUSTED', 'PENDING', 'REVOKED', 'BLOCKED'] as RhAgentTrustLevel[]).map((tl) => (
            <div key={tl} className={`rounded-xl border p-3 text-sm ${TRUST_COLORS[tl]}`}>
              <div className="text-xs uppercase tracking-wide">{tl}</div>
              <div className="text-2xl font-bold">{summary[tl]}</div>
            </div>
          ))}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/30">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/5 text-xs uppercase tracking-wide text-slate-300">
            <tr>
              <th className="px-4 py-3">Host</th>
              <th className="px-4 py-3">Trust</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Versão</th>
              <th className="px-4 py-3">Visto por último</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {!devices && !loading ? null : null}
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  Carregando…
                </td>
              </tr>
            ) : devices && devices.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  Nenhum dispositivo AuryaRhAgent registrado nesta loja.
                </td>
              </tr>
            ) : (
              devices?.map((d) => {
                const busy = busyAgentId === d.agentId;
                return (
                  <tr key={d.agentId} className="border-t border-white/5">
                    <td className="px-4 py-3">
                      <div className="font-medium text-white">{d.hostname ?? '—'}</div>
                      <div className="text-xs text-slate-400">{d.osVersion ?? d.installationId}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-md border px-2 py-0.5 text-xs ${TRUST_COLORS[d.trustLevel]}`}>
                        {d.trustLevel}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-300">{STATUS_LABEL[d.status]}</td>
                    <td className="px-4 py-3 text-slate-400">{d.agentVersion ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-400">{formatDate(d.lastSeenAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex flex-wrap justify-end gap-2">
                        {d.trustLevel === 'PENDING' ? (
                          <button
                            type="button"
                            onClick={() => void handleApprove(d.agentId)}
                            disabled={busy}
                            className="inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-xs text-emerald-200 hover:bg-emerald-500/20 disabled:opacity-50"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Aprovar
                          </button>
                        ) : null}
                        {d.trustLevel === 'TRUSTED' ? (
                          <button
                            type="button"
                            onClick={() => void handleRevoke(d.agentId, false)}
                            disabled={busy}
                            className="inline-flex items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-xs text-amber-200 hover:bg-amber-500/20 disabled:opacity-50"
                          >
                            <ShieldOff className="h-3.5 w-3.5" />
                            Revogar
                          </button>
                        ) : null}
                        {d.trustLevel !== 'BLOCKED' ? (
                          <button
                            type="button"
                            onClick={() => void handleRevoke(d.agentId, true)}
                            disabled={busy}
                            className="inline-flex items-center gap-1 rounded-md border border-rose-500/30 bg-rose-500/10 px-2 py-1 text-xs text-rose-200 hover:bg-rose-500/20 disabled:opacity-50"
                          >
                            <Ban className="h-3.5 w-3.5" />
                            Bloquear
                          </button>
                        ) : null}
                        {d.trustLevel === 'REVOKED' ? (
                          <button
                            type="button"
                            onClick={() => void handleApprove(d.agentId)}
                            disabled={busy}
                            className="inline-flex items-center gap-1 rounded-md border border-violet-500/30 bg-violet-500/10 px-2 py-1 text-xs text-violet-200 hover:bg-violet-500/20 disabled:opacity-50"
                          >
                            <ShieldCheck className="h-3.5 w-3.5" />
                            Re-parear
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
