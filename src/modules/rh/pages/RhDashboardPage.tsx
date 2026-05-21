import { useEffect, useState } from 'react';
import { Building2, Briefcase, Users, Clock, CalendarRange, FileLock2 } from 'lucide-react';
import { RhPageShell } from '../components/RhPageShell';
import {
  listCargos,
  listDepartamentos,
  listEscalas,
  listFuncionarios,
  listJornadas,
} from '../services/rhApi';

interface RhStatRow {
  readonly label: string;
  readonly value: number;
  readonly icon: JSX.Element;
  readonly hint?: string;
}

export default function RhDashboardPage(): JSX.Element {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<RhStatRow[] | null>(null);

  const load = async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const [func, dep, cargo, jornada, escala] = await Promise.all([
        listFuncionarios({ pageSize: 1 }),
        listDepartamentos({ pageSize: 1 }),
        listCargos({ pageSize: 1 }),
        listJornadas({ pageSize: 1 }),
        listEscalas({ pageSize: 1 }),
      ]);
      const ativos = await listFuncionarios({ pageSize: 1, status: 'ATIVO' });
      const demitidos = await listFuncionarios({ pageSize: 1, status: 'DEMITIDO' });
      setStats([
        { label: 'Funcionários', value: func.total, icon: <Users className="h-5 w-5" />, hint: `${ativos.total} ativos · ${demitidos.total} demitidos` },
        { label: 'Departamentos', value: dep.total, icon: <Building2 className="h-5 w-5" /> },
        { label: 'Cargos', value: cargo.total, icon: <Briefcase className="h-5 w-5" /> },
        { label: 'Jornadas', value: jornada.total, icon: <Clock className="h-5 w-5" /> },
        { label: 'Escalas', value: escala.total, icon: <CalendarRange className="h-5 w-5" /> },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <RhPageShell
      title="Aurya RH"
      subtitle="Visão geral do módulo de RH. Esta versão não inclui ponto eletrônico nem biometria — apenas cadastro, jornadas, escalas e consentimentos LGPD."
      icon={<Users className="h-6 w-6" />}
      onRefresh={load}
      loading={loading}
      error={error}
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {(stats ?? Array.from({ length: 5 }, () => null)).map((s, i) => (
          <div key={s?.label ?? i} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4 backdrop-blur-xl">
            <div className="flex items-center gap-2 text-slate-300">
              {s?.icon ?? <Users className="h-5 w-5" />}
              <span className="text-xs uppercase tracking-wide">{s?.label ?? '—'}</span>
            </div>
            <div className="mt-2 text-3xl font-bold text-white">{s?.value ?? 0}</div>
            {s?.hint ? <div className="mt-1 text-xs text-slate-400">{s.hint}</div> : null}
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5">
        <div className="mb-2 flex items-center gap-2 font-semibold text-amber-200">
          <FileLock2 className="h-4 w-4" />
          LGPD: Consentimentos antes da biometria
        </div>
        <p className="text-sm text-slate-300">
          O cadastro biométrico do funcionário exige consentimento LGPD ativo. Acesse
          <span className="mx-1 rounded bg-white/5 px-1.5 py-0.5 font-mono text-xs">RH &gt; Consentimentos LGPD</span>
          para registrar o aceite antes de habilitar a biometria no totem.
        </p>
      </div>
    </RhPageShell>
  );
}
