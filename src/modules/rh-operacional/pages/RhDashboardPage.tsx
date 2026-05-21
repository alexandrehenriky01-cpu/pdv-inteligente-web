import { useEffect, useState } from 'react';
import {
  Activity, Users, AlertTriangle, FileSignature, ShieldAlert, Fingerprint, Clock, Wallet,
} from 'lucide-react';
import { RhPageShell } from '../../rh/components/RhPageShell';
import { getDashboard, type DashboardIndicadoresView } from '../services/rhOperacionalApi';

function fmtMin(min: number): string {
  const abs = Math.abs(min);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `${min < 0 ? '-' : ''}${String(h).padStart(2, '0')}h${String(m).padStart(2, '0')}m`;
}

export default function RhDashboardPage(): JSX.Element {
  const [data, setData] = useState<DashboardIndicadoresView | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const refresh = async (): Promise<void> => {
    setBusy(true); setErr(null);
    try {
      setData(await getDashboard());
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Falha ao carregar dashboard.');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => { void refresh(); }, []);

  return (
    <RhPageShell
      title="Dashboard RH"
      subtitle="Indicadores operacionais em tempo real."
      icon={<Activity className="h-6 w-6" />}
      onRefresh={() => void refresh()}
      loading={busy}
      error={err}
    >
      {data ? (
        <div className="space-y-6">
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Card icon={<Users className="h-4 w-4" />}     label="Funcionários ativos"   value={String(data.funcionariosAtivos)} tone="violet" />
            <Card icon={<Clock className="h-4 w-4" />}     label="Presentes hoje"        value={String(data.presentesHoje)}      tone="emerald" />
            <Card icon={<Wallet className="h-4 w-4" />}    label="Banco horas total"     value={fmtMin(data.saldoBancoMinutosTotal)} tone={data.saldoBancoMinutosTotal >= 0 ? 'emerald' : 'rose'} />
            <Card icon={<Fingerprint className="h-4 w-4" />} label="Biometria ativos"   value={String(data.biometriaAtivos)}    tone="violet" />
          </section>

          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Card icon={<AlertTriangle className="h-4 w-4" />} label="Justificativas pendentes" value={String(data.justificativasPendentes)} tone="amber" />
            <Card icon={<AlertTriangle className="h-4 w-4" />} label="Ajustes pendentes"        value={String(data.ajustesPendentes)}        tone="amber" />
            <Card icon={<FileSignature className="h-4 w-4" />} label="Assinaturas pendentes"    value={String(data.assinaturasPendentes)}    tone="violet" />
            <Card icon={<AlertTriangle className="h-4 w-4" />} label="Fechamentos atrasados"    value={String(data.fechamentosAtrasados)}    tone={data.fechamentosAtrasados > 0 ? 'rose' : 'slate'} />
          </section>

          <section className="grid gap-3 lg:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-4">
              <h3 className="text-sm font-semibold text-white">Divergências abertas</h3>
              <div className="mt-3 flex items-baseline gap-4">
                <div className="text-3xl font-bold text-rose-300">{data.divergencias.abertas}</div>
                <div className="text-xs text-slate-400">
                  + {data.divergencias.emRevisao} em revisão · {data.divergencias.resolvidasHoje} resolvidas hoje
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                <SevPill label="HIGH" value={data.divergencias.porSeveridade.HIGH} tone="rose" />
                <SevPill label="MEDIUM" value={data.divergencias.porSeveridade.MEDIUM} tone="amber" />
                <SevPill label="LOW" value={data.divergencias.porSeveridade.LOW} tone="slate" />
              </div>
            </div>

            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-amber-100"><ShieldAlert className="h-4 w-4" /> LGPD</h3>
              <p className="mt-2 text-xs text-amber-100/80">
                <strong>{data.funcionariosSemConsentimento}</strong> funcionários ativos sem consentimento LGPD vigente.
              </p>
              <p className="mt-1 text-xs text-amber-100/60">Regularize antes da próxima marcação biométrica.</p>
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-slate-900/40 p-4">
            <h3 className="text-sm font-semibold text-white">Divergências por tipo</h3>
            <ul className="mt-3 grid gap-2 text-xs text-slate-300 sm:grid-cols-2">
              {data.divergencias.porTipo.length === 0 ? (
                <li className="text-slate-500">Nenhuma divergência aberta.</li>
              ) : (
                data.divergencias.porTipo.map((t) => (
                  <li key={t.tipo} className="flex items-center justify-between rounded-lg border border-white/5 bg-black/20 px-3 py-2">
                    <span>{t.tipo.replace(/_/g, ' ')}</span>
                    <span className="rounded bg-rose-500/15 px-2 py-0.5 font-mono text-rose-200">{t.count}</span>
                  </li>
                ))
              )}
            </ul>
          </section>
        </div>
      ) : null}
    </RhPageShell>
  );
}

function Card(props: { icon: JSX.Element; label: string; value: string; tone: 'violet' | 'emerald' | 'amber' | 'rose' | 'slate' }): JSX.Element {
  const ring: Record<typeof props.tone, string> = {
    violet: 'border-violet-500/30 bg-violet-500/5 text-violet-200',
    emerald: 'border-emerald-500/30 bg-emerald-500/5 text-emerald-200',
    amber: 'border-amber-500/30 bg-amber-500/5 text-amber-200',
    rose: 'border-rose-500/30 bg-rose-500/5 text-rose-200',
    slate: 'border-white/10 bg-white/5 text-slate-200',
  };
  return (
    <div className={`rounded-2xl border p-4 ${ring[props.tone]}`}>
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide opacity-80">{props.icon}{props.label}</div>
      <div className="mt-2 text-2xl font-bold">{props.value}</div>
    </div>
  );
}

function SevPill(props: { label: string; value: number; tone: 'rose' | 'amber' | 'slate' }): JSX.Element {
  const tone: Record<typeof props.tone, string> = {
    rose: 'border-rose-500/30 bg-rose-500/10 text-rose-200',
    amber: 'border-amber-500/30 bg-amber-500/10 text-amber-200',
    slate: 'border-white/10 bg-white/5 text-slate-200',
  };
  return (
    <div className={`rounded-lg border p-2 text-center ${tone[props.tone]}`}>
      <div className="text-[10px] uppercase tracking-wide opacity-80">{props.label}</div>
      <div className="text-lg font-bold">{props.value}</div>
    </div>
  );
}
