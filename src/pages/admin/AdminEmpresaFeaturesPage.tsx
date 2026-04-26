import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { ArrowLeft, Flag, Loader2, Search } from 'lucide-react';
import { Layout } from '../../components/Layout';
import { api } from '../../services/api';
import { AxiosError } from 'axios';

type FeatureOrigin = 'PLAN' | 'OVERRIDE' | 'SYSTEM' | 'NONE';

interface FeatureRow {
  feature: string;
  module: string;
  enabled: boolean;
  origin: FeatureOrigin;
}

interface FeaturesResponse {
  sucesso: boolean;
  dados?: {
    empresaId: string;
    plano: string;
    modulosAtivos: string[];
    features: FeatureRow[];
  };
  erro?: string;
}

export function AdminEmpresaFeaturesPage() {
  const { empresaId } = useParams<{ empresaId: string }>();
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [rows, setRows] = useState<FeatureRow[]>([]);
  const [plano, setPlano] = useState('');
  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState<string>('');

  const load = useCallback(async () => {
    if (!empresaId) return;
    setLoading(true);
    try {
      const res = await api.get<FeaturesResponse>(`/api/empresas/${empresaId}/features`);
      if (!res.data.sucesso || !res.data.dados) {
        throw new Error(res.data.erro || 'Falha ao carregar features.');
      }
      setRows(res.data.dados.features);
      setPlano(res.data.dados.plano);
    } catch (e) {
      const msg =
        e instanceof AxiosError
          ? String(e.response?.data?.erro || e.response?.data?.error || e.message)
          : e instanceof Error
            ? e.message
            : 'Erro ao carregar.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [empresaId]);

  useEffect(() => {
    void load();
  }, [load]);

  const modules = useMemo(() => {
    const s = new Set(rows.map((r) => r.module));
    return [...s].sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (moduleFilter && r.module !== moduleFilter) return false;
      if (!q) return true;
      return r.feature.toLowerCase().includes(q) || r.module.toLowerCase().includes(q);
    });
  }, [rows, search, moduleFilter]);

  const grouped = useMemo(() => {
    const m = new Map<string, FeatureRow[]>();
    for (const r of filtered) {
      const list = m.get(r.module) ?? [];
      list.push(r);
      m.set(r.module, list);
    }
    return [...m.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const toggle = async (feature: string, enabled: boolean) => {
    if (!empresaId) return;
    setSavingKey(feature);
    try {
      await api.put(`/api/empresas/${empresaId}/features`, [{ feature, enabled: !enabled }]);
      toast.success('Feature atualizada.');
      await load();
    } catch (e) {
      const msg =
        e instanceof AxiosError
          ? String(e.response?.data?.erro || e.response?.data?.error || e.message)
          : 'Falha ao salvar.';
      toast.error(msg);
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <Layout>
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link
              to="/admin/clientes"
              className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-violet-600 hover:text-violet-800 dark:text-violet-300 dark:hover:text-violet-100"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar para clientes
            </Link>
            <h1 className="flex items-center gap-3 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              <Flag className="h-8 w-8 text-violet-500" />
              Feature flags
            </h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Empresa <span className="font-mono text-xs">{empresaId}</span> — plano base:{' '}
              <strong>{plano || '—'}</strong>. Overrides têm prioridade sobre o plano e módulos.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-900/60 md:flex-row md:items-center">
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por feature ou módulo..."
              className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-sm dark:border-white/10 dark:bg-slate-950 dark:text-white"
            />
          </div>
          <select
            value={moduleFilter}
            onChange={(e) => setModuleFilter(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold dark:border-white/10 dark:bg-slate-950 dark:text-white"
          >
            <option value="">Todos os módulos</option>
            {modules.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-violet-500" />
          </div>
        ) : (
          <div className="space-y-10">
            {grouped.map(([mod, list]) => (
              <section key={mod}>
                <h2 className="mb-3 text-xs font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                  {mod}
                </h2>
                <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs font-bold uppercase text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                      <tr>
                        <th className="px-4 py-3">Feature</th>
                        <th className="px-4 py-3">Origem</th>
                        <th className="px-4 py-3 text-right">Ativo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/10">
                      {list.map((r) => (
                        <tr key={r.feature} className="bg-white dark:bg-slate-900/40">
                          <td className="px-4 py-3 font-mono text-xs text-slate-900 dark:text-slate-100">{r.feature}</td>
                          <td className="px-4 py-3">
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                                r.origin === 'OVERRIDE'
                                  ? 'bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-200'
                                  : r.origin === 'PLAN'
                                    ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-500/20 dark:text-emerald-200'
                                    : r.origin === 'SYSTEM'
                                      ? 'bg-sky-100 text-sky-900 dark:bg-sky-500/20 dark:text-sky-200'
                                      : 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300'
                              }`}
                            >
                              {r.origin}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              disabled={savingKey === r.feature}
                              onClick={() => void toggle(r.feature, r.enabled)}
                              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                                r.enabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
                              } disabled:opacity-50`}
                              title={r.enabled ? 'Desativar override' : 'Ativar'}
                            >
                              <span
                                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                                  r.enabled ? 'translate-x-6' : 'translate-x-1'
                                }`}
                              />
                              {savingKey === r.feature && (
                                <Loader2 className="absolute inset-0 m-auto h-4 w-4 animate-spin text-slate-700" />
                              )}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
