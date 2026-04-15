import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { Layout } from '../components/Layout';
import { api } from '../services/api';
import {
  ArrowLeft,
  Loader2,
  Pizza,
  ShoppingBag,
  TrendingUp,
  UtensilsCrossed,
} from 'lucide-react';
import { AxiosError } from 'axios';

/** Resposta alinhada a `DashboardService.obterFoodMetrics` (API). */
export interface FoodMetricsApiResponse {
  periodo: { inicio: string; fim: string };
  porOrigem: Array<{
    origem: string;
    faturamento: number;
    pedidos: number;
    ticketMedio: number;
  }>;
  totais: {
    faturamentoFood: number;
    pedidosFood: number;
    ticketMedioTotem: number | null;
    ticketMedioPdvBalcao: number | null;
    pedidosPdvBalcao: number;
  };
  topProdutosCardapio: Array<{
    itemCardapioId: string;
    nome: string;
    quantidadeVendida: number;
  }>;
}

const CANAL_COLORS: Record<string, string> = {
  PDV: '#94a3b8',
  TOTEM: '#8b5cf6',
  DELIVERY: '#f97316',
  MESA: '#10b981',
};

const CANAL_LABELS: Record<string, string> = {
  PDV: 'PDV (balcão)',
  TOTEM: 'Totem',
  DELIVERY: 'Delivery',
  MESA: 'Mesa',
};

function fmtBrl(n: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n || 0);
}

function fmtPeriodo(isoInicio: string, isoFim: string): string {
  const a = new Date(isoInicio);
  const b = new Date(isoFim);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return '';
  const opt: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' };
  return `${a.toLocaleDateString('pt-BR', opt)} — ${b.toLocaleDateString('pt-BR', opt)}`;
}

export function DashboardFood() {
  const [data, setData] = useState<FoodMetricsApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro(null);
    try {
      const { data: payload } = await api.get<FoodMetricsApiResponse>('/api/dashboard/food-metrics');
      setData(payload);
    } catch (e) {
      const ax = e as AxiosError<{ error?: string }>;
      const msg = ax.response?.data?.error || ax.message || 'Falha ao carregar métricas.';
      setErro(msg);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const chartData = useMemo(() => {
    if (!data?.porOrigem) return [];
    return data.porOrigem
      .filter((r) => r.faturamento > 0)
      .map((r) => ({
        name: CANAL_LABELS[r.origem] ?? r.origem,
        origem: r.origem,
        valor: r.faturamento,
        fill: CANAL_COLORS[r.origem] ?? '#64748b',
      }));
  }, [data]);

  const barData = useMemo(() => {
    if (!data?.porOrigem) return [];
    return data.porOrigem.map((r) => ({
      canal: CANAL_LABELS[r.origem] ?? r.origem,
      Faturamento: r.faturamento,
      fill: CANAL_COLORS[r.origem] ?? '#64748b',
    }));
  }, [data]);

  const cardClass =
    'rounded-[28px] border border-white/10 bg-[#08101f]/90 backdrop-blur-xl p-6 shadow-[0_25px_60px_rgba(0,0,0,0.35)]';

  return (
    <Layout>
      <div className="relative min-h-[calc(100vh-4rem)] bg-[#060816] text-white">
        <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(139,92,246,0.12),transparent_50%)]" />
        <div className="relative z-10 mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Link
                to="/dashboard"
                className="mb-3 inline-flex items-center gap-2 text-sm font-bold text-violet-300 hover:text-white"
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar ao dashboard
              </Link>
              <h1 className="flex flex-wrap items-center gap-3 text-3xl font-black tracking-tight text-white md:text-4xl">
                <Pizza className="h-9 w-9 text-orange-400" />
                BI Food Service
              </h1>
              <p className="mt-2 text-slate-400">
                {data
                  ? `Período: ${fmtPeriodo(data.periodo.inicio, data.periodo.fim)}`
                  : 'Métricas do ecossistema Totem, Delivery e Mesa.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void carregar()}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-bold text-slate-200 hover:bg-white/10"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Atualizar
            </button>
          </div>

          {erro ? (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-200">{erro}</div>
          ) : null}

          {loading && !data ? (
            <div className="flex justify-center py-24">
              <Loader2 className="h-12 w-12 animate-spin text-violet-400" />
            </div>
          ) : data ? (
            <>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className={cardClass}>
                  <div className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500">
                    <UtensilsCrossed className="h-4 w-4 text-violet-400" />
                    Faturamento food
                  </div>
                  <p className="text-3xl font-black text-white">{fmtBrl(data.totais.faturamentoFood)}</p>
                  <p className="mt-1 text-xs text-slate-500">Totem + Delivery + Mesa (concluídas)</p>
                </div>
                <div className={cardClass}>
                  <div className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500">
                    <TrendingUp className="h-4 w-4 text-amber-400" />
                    Ticket médio
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between gap-4 border-b border-white/5 pb-2">
                      <span className="text-slate-400">Totem</span>
                      <span className="font-mono font-bold text-violet-300">
                        {data.totais.ticketMedioTotem != null
                          ? fmtBrl(data.totais.ticketMedioTotem)
                          : '—'}
                      </span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-slate-400">PDV (balcão)</span>
                      <span className="font-mono font-bold text-slate-300">
                        {data.totais.ticketMedioPdvBalcao != null
                          ? fmtBrl(data.totais.ticketMedioPdvBalcao)
                          : '—'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className={cardClass}>
                  <div className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500">
                    <ShoppingBag className="h-4 w-4 text-emerald-400" />
                    Pedidos food
                  </div>
                  <p className="text-3xl font-black text-white">{data.totais.pedidosFood}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    PDV no período: {data.totais.pedidosPdvBalcao} pedidos (referência balcão)
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className={cardClass}>
                  <h2 className="mb-4 text-lg font-black text-white">Mix por canal (faturamento)</h2>
                  <div className="h-[300px] w-full">
                    {chartData.length === 0 ? (
                      <p className="py-16 text-center text-slate-500">Sem vendas no período.</p>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={chartData}
                            dataKey="valor"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={72}
                            outerRadius={110}
                            paddingAngle={2}
                            stroke="#0f172a"
                            strokeWidth={2}
                          >
                            {chartData.map((entry, i) => (
                              <Cell key={i} fill={entry.fill} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value) =>
                              value != null && value !== ''
                                ? fmtBrl(Number(value))
                                : ''
                            }
                            contentStyle={{
                              background: '#0f172a',
                              border: '1px solid rgba(139,92,246,0.35)',
                              borderRadius: 12,
                            }}
                          />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>

                <div className={cardClass}>
                  <h2 className="mb-4 text-lg font-black text-white">Faturamento por origem</h2>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={barData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
                        <XAxis dataKey="canal" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                        <YAxis
                          tick={{ fill: '#94a3b8', fontSize: 11 }}
                          tickFormatter={(v) =>
                            new Intl.NumberFormat('pt-BR', {
                              notation: 'compact',
                              compactDisplay: 'short',
                            }).format(Number(v))
                          }
                        />
                        <Tooltip
                          formatter={(value) =>
                            value != null && value !== ''
                              ? fmtBrl(Number(value))
                              : ''
                          }
                          contentStyle={{
                            background: '#0f172a',
                            border: '1px solid rgba(139,92,246,0.35)',
                            borderRadius: 12,
                          }}
                        />
                        <Bar dataKey="Faturamento" radius={[8, 8, 0, 0]}>
                          {barData.map((e, i) => (
                            <Cell key={i} fill={e.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div className={cardClass}>
                <h2 className="mb-6 text-lg font-black text-white">Top 5 — cardápio (Totem / Delivery / Mesa)</h2>
                {data.topProdutosCardapio.length === 0 ? (
                  <p className="text-slate-500">Nenhum item de cardápio vendido no período.</p>
                ) : (
                  <ol className="space-y-3">
                    {data.topProdutosCardapio.map((p, idx) => (
                      <li
                        key={p.itemCardapioId}
                        className="flex items-center justify-between gap-4 rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/20 text-sm font-black text-violet-200">
                            {idx + 1}
                          </span>
                          <span className="truncate font-bold text-white">{p.nome}</span>
                        </div>
                        <span className="shrink-0 font-mono text-sm text-emerald-300">
                          {p.quantidadeVendida} u.
                        </span>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </Layout>
  );
}
