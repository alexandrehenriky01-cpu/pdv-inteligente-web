import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, RefreshCw, Sparkles, ShieldX, CheckCircle2 } from 'lucide-react';
import { RhPageShell } from '../../rh/components/RhPageShell';
import {
  detectarDivergencias,
  listDivergencias,
  resolverDivergencia,
  type DivergenciaView,
  type RhDivergenciaSeveridade,
  type RhDivergenciaStatus,
  type RhDivergenciaTipo,
} from '../services/rhOperacionalApi';

const SEV: ReadonlyArray<RhDivergenciaSeveridade> = ['HIGH', 'MEDIUM', 'LOW'];
const STATUSES: ReadonlyArray<RhDivergenciaStatus> = ['ABERTA', 'EM_REVISAO', 'RESOLVIDA', 'IGNORADA'];

export default function RhDivergenciasPage(): JSX.Element {
  const [items, setItems] = useState<DivergenciaView[]>([]);
  const [filtroStatus, setFiltroStatus] = useState<RhDivergenciaStatus | ''>('ABERTA');
  const [filtroSev, setFiltroSev] = useState<RhDivergenciaSeveridade | ''>('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setBusy(true); setErr(null);
    try {
      const r = await listDivergencias({
        status: filtroStatus || undefined,
        severidade: filtroSev || undefined,
        pageSize: 100,
      });
      setItems(r.items);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Falha ao listar.');
    } finally {
      setBusy(false);
    }
  }, [filtroStatus, filtroSev]);

  useEffect(() => { void carregar(); }, [carregar]);

  const detectar = async (): Promise<void> => {
    setBusy(true); setErr(null); setInfo(null);
    try {
      const r = await detectarDivergencias({});
      setInfo(`Detecção criou ${r.criadas} divergências.`);
      await carregar();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Falha na detecção.');
    } finally {
      setBusy(false);
    }
  };

  const resolver = async (id: string, status: 'RESOLVIDA' | 'IGNORADA'): Promise<void> => {
    const nota = window.prompt(`${status === 'RESOLVIDA' ? 'Resolução' : 'Ignorar'} — informe nota (mín 3 chars):`) ?? '';
    if (nota.trim().length < 3) return;
    setBusy(true); setErr(null);
    try {
      await resolverDivergencia(id, { status, nota });
      await carregar();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Falha ao resolver.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <RhPageShell
      title="Divergências"
      subtitle="Painel operacional de anomalias detectadas no ponto."
      icon={<AlertTriangle className="h-6 w-6" />}
      onRefresh={() => void carregar()}
      loading={busy}
      error={err}
      actions={
        <button onClick={() => void detectar()} disabled={busy} className="inline-flex items-center gap-2 rounded-xl border border-violet-500/40 px-3 py-1.5 text-xs text-violet-200 hover:bg-violet-500/10 disabled:opacity-50">
          <Sparkles className="h-3 w-3" /> Detectar agora
        </button>
      }
    >
      <div className="space-y-4">
        {info ? (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-2 text-sm text-emerald-200">
            <CheckCircle2 className="h-4 w-4" /> {info}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value as RhDivergenciaStatus | '')} className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white">
            <option value="">Todos status</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={filtroSev} onChange={(e) => setFiltroSev(e.target.value as RhDivergenciaSeveridade | '')} className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white">
            <option value="">Todas severidades</option>
            {SEV.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <button onClick={() => void carregar()} disabled={busy} className="inline-flex items-center gap-1 rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-200 hover:bg-white/5 disabled:opacity-50">
            <RefreshCw className="h-3 w-3" /> Atualizar
          </button>
        </div>

        <div className="overflow-hidden rounded-2xl border border-white/10">
          <table className="min-w-full text-sm text-slate-200">
            <thead className="bg-white/5 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-3 py-2 text-left">Severidade</th>
                <th className="px-3 py-2 text-left">Tipo</th>
                <th className="px-3 py-2 text-left">Funcionário</th>
                <th className="px-3 py-2 text-left">Data ref.</th>
                <th className="px-3 py-2 text-left">Detalhe</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td colSpan={7} className="px-3 py-6 text-center text-xs text-slate-500">Sem divergências para os filtros atuais.</td></tr>
              ) : (
                items.map((d) => (
                  <tr key={d.id} className="border-t border-white/5">
                    <td className="px-3 py-2"><SevBadge sev={d.severidade} /></td>
                    <td className="px-3 py-2 text-xs">{d.tipo.replace(/_/g, ' ')}</td>
                    <td className="px-3 py-2 font-mono text-xs">{d.funcionarioId?.slice(0, 8) ?? '—'}…</td>
                    <td className="px-3 py-2 text-xs">{new Date(d.dataReferencia).toLocaleDateString('pt-BR')}</td>
                    <td className="px-3 py-2 text-xs">{d.detalhe}</td>
                    <td className="px-3 py-2 text-xs">{d.status}</td>
                    <td className="px-3 py-2 text-right">
                      {d.status === 'ABERTA' || d.status === 'EM_REVISAO' ? (
                        <div className="flex justify-end gap-1">
                          <button onClick={() => void resolver(d.id, 'RESOLVIDA')} className="rounded-lg border border-emerald-500/40 px-2 py-1 text-xs text-emerald-200 hover:bg-emerald-500/10">Resolver</button>
                          <button onClick={() => void resolver(d.id, 'IGNORADA')} className="rounded-lg border border-white/10 px-2 py-1 text-xs text-slate-300 hover:bg-white/5">Ignorar</button>
                        </div>
                      ) : null}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </RhPageShell>
  );
}

function SevBadge(props: { sev: RhDivergenciaSeveridade }): JSX.Element {
  const tone: Record<RhDivergenciaSeveridade, string> = {
    HIGH: 'border-rose-500/40 bg-rose-500/10 text-rose-200',
    MEDIUM: 'border-amber-500/40 bg-amber-500/10 text-amber-200',
    LOW: 'border-white/10 bg-white/5 text-slate-300',
  };
  return <span className={`rounded-lg border px-2 py-0.5 text-[10px] font-bold ${tone[props.sev]}`}>{props.sev}</span>;
}
