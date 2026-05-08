import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { Activity, Loader2, RefreshCw, Search } from 'lucide-react';
import { Layout } from '../../components/Layout';
import { api } from '../../services/api';
import { AxiosError } from 'axios';

/**
 * AdminRuntimePage — Lote C7.C.
 *
 * Dashboard operacional /admin/runtime. Lista todas as instalações com
 * polling REST a cada 30s. Filtros (canal, health, busca) operam em-memória
 * sobre o último snapshot — backend já entrega dataset enriquecido.
 *
 * Sem WebSocket nesta fase: polling REST é simples, robusto e suficiente
 * para a frequência (heartbeat = 5min, polling = 30s).
 */

type EffectiveHealth = 'healthy' | 'degraded' | 'unknown' | 'offline';

interface Installation {
  installationId: string;
  lojaId: string | null;
  shellVersion: string;
  backendVersion: string | null;
  frontendVersion: string | null;
  updateChannel: string;
  runtimeHealth: string;
  lastSeenAt: string;
  lastHeartbeatDeltaSec: number;
  startupFailures: number;
  rollbackCount: number;
  effectiveHealth: EffectiveHealth;
}

interface InstallationsResponse {
  ok: boolean;
  total: number;
  items: Installation[];
}

interface RuntimeStats {
  totalInstallations: number;
  byVersion: Record<string, number>;
  byChannel: Record<string, number>;
  byHealth: Record<string, number>;
  last24hRollbacks: number;
  last24hDegraded: number;
  offlineCount: number;
}

const POLL_INTERVAL_MS = 30 * 1000;
const HEALTH_LABELS: Record<EffectiveHealth, string> = {
  healthy: 'Saudável',
  degraded: 'Degradado',
  unknown: 'Desconhecido',
  offline: 'Offline',
};
const HEALTH_COLORS: Record<EffectiveHealth, string> = {
  healthy: 'bg-emerald-100 text-emerald-700 border-emerald-300',
  degraded: 'bg-amber-100 text-amber-800 border-amber-300',
  unknown: 'bg-gray-100 text-gray-700 border-gray-300',
  offline: 'bg-red-100 text-red-700 border-red-300',
};

function formatDelta(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}min`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('pt-BR');
  } catch {
    return iso;
  }
}

export function AdminRuntimePage() {
  const [items, setItems] = useState<Installation[]>([]);
  const [stats, setStats] = useState<RuntimeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const [channelFilter, setChannelFilter] = useState<string>('');
  const [healthFilter, setHealthFilter] = useState<string>('');
  const [search, setSearch] = useState<string>('');

  const fetchData = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      else setRefreshing(true);
      try {
        const params = new URLSearchParams();
        params.set('limit', '500');
        if (channelFilter) params.set('channel', channelFilter);
        if (healthFilter) params.set('health', healthFilter);
        if (search.trim()) params.set('search', search.trim());

        const [installationsRes, statsRes] = await Promise.all([
          api.get<InstallationsResponse>(`/api/runtime/installations?${params.toString()}`),
          api.get<{ ok: boolean } & RuntimeStats>('/api/runtime/stats'),
        ]);

        if (installationsRes.data.ok) setItems(installationsRes.data.items);
        if (statsRes.data.ok) {
          const { ok: _ok, ...rest } = statsRes.data;
          void _ok;
          setStats(rest);
        }
        setLastUpdated(new Date());
      } catch (e) {
        const msg =
          e instanceof AxiosError
            ? String(e.response?.data?.error || e.message)
            : e instanceof Error
              ? e.message
              : 'Falha ao carregar runtime.';
        if (!silent) toast.error(msg);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [channelFilter, healthFilter, search]
  );

  // Carga inicial + polling de 30s. Refetch on filter change.
  useEffect(() => {
    void fetchData(false);
    const id = setInterval(() => {
      void fetchData(true);
    }, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [fetchData]);

  const filtered = useMemo(() => items, [items]);

  return (
    <Layout>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Activity className="w-8 h-8 text-orange-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Runtime operacional</h1>
              <p className="text-sm text-gray-500">
                Telemetria das instalações Aurya Soluções
                {lastUpdated && (
                  <span className="ml-2 text-xs text-gray-400">
                    · Atualizado {formatDateTime(lastUpdated.toISOString())}
                  </span>
                )}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void fetchData(false)}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
          >
            {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Atualizar
          </button>
        </div>

        {/* Stats summary */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <StatCard label="Instalações" value={stats.totalInstallations} />
            <StatCard label="Offline (>15min)" value={stats.offlineCount} accent="red" />
            <StatCard
              label="Degradado (24h)"
              value={stats.last24hDegraded}
              accent={stats.last24hDegraded > 0 ? 'amber' : 'gray'}
            />
            <StatCard
              label="Rollbacks (24h)"
              value={stats.last24hRollbacks}
              accent={stats.last24hRollbacks > 0 ? 'amber' : 'gray'}
            />
          </div>
        )}

        {/* Distribution */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <DistributionCard title="Por canal" data={stats.byChannel} />
            <DistributionCard title="Por health" data={stats.byHealth} />
            <DistributionCard title="Por versão (shell)" data={stats.byVersion} />
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-4 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por installationId ou lojaId..."
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
            />
          </div>
          <select
            value={channelFilter}
            onChange={(e) => setChannelFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="">Todos os canais</option>
            <option value="stable">Stable</option>
            <option value="beta">Beta</option>
            <option value="canary">Canary</option>
          </select>
          <select
            value={healthFilter}
            onChange={(e) => setHealthFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="">Todos os states</option>
            <option value="healthy">Saudável</option>
            <option value="degraded">Degradado</option>
            <option value="offline">Offline</option>
            <option value="unknown">Desconhecido</option>
          </select>
        </div>

        {/* Grid */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-8 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-orange-600" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-gray-500">Nenhuma instalação encontrada.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <Th>Status</Th>
                    <Th>Installation ID</Th>
                    <Th>Loja</Th>
                    <Th>Shell</Th>
                    <Th>Backend</Th>
                    <Th>Frontend</Th>
                    <Th>Canal</Th>
                    <Th>Última visita</Th>
                    <Th align="right">Falhas</Th>
                    <Th align="right">Rollbacks</Th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row) => (
                    <tr key={row.installationId} className="border-b border-gray-100 hover:bg-gray-50">
                      <Td>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${HEALTH_COLORS[row.effectiveHealth]}`}
                        >
                          {HEALTH_LABELS[row.effectiveHealth]}
                        </span>
                      </Td>
                      <Td>
                        <code className="text-xs text-gray-700">
                          {row.installationId.length > 24
                            ? `${row.installationId.slice(0, 22)}…`
                            : row.installationId}
                        </code>
                      </Td>
                      <Td>
                        <code className="text-xs text-gray-500">
                          {row.lojaId
                            ? row.lojaId.length > 14
                              ? `${row.lojaId.slice(0, 12)}…`
                              : row.lojaId
                            : '—'}
                        </code>
                      </Td>
                      <Td>{row.shellVersion}</Td>
                      <Td>{row.backendVersion ?? '—'}</Td>
                      <Td>{row.frontendVersion ?? '—'}</Td>
                      <Td>
                        <span className="text-xs px-2 py-0.5 bg-gray-100 rounded">{row.updateChannel}</span>
                      </Td>
                      <Td>
                        <span title={formatDateTime(row.lastSeenAt)}>
                          {formatDelta(row.lastHeartbeatDeltaSec)} atrás
                        </span>
                      </Td>
                      <Td align="right">
                        {row.startupFailures > 0 ? (
                          <span className="text-amber-700 font-medium">{row.startupFailures}</span>
                        ) : (
                          <span className="text-gray-400">0</span>
                        )}
                      </Td>
                      <Td align="right">
                        {row.rollbackCount > 0 ? (
                          <span className="text-red-700 font-medium">{row.rollbackCount}</span>
                        ) : (
                          <span className="text-gray-400">0</span>
                        )}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

interface StatCardProps {
  label: string;
  value: number;
  accent?: 'red' | 'amber' | 'gray';
}

function StatCard({ label, value, accent = 'gray' }: StatCardProps) {
  const colorMap: Record<NonNullable<StatCardProps['accent']>, string> = {
    red: 'text-red-600',
    amber: 'text-amber-600',
    gray: 'text-gray-900',
  };
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="text-xs text-gray-500 uppercase tracking-wide">{label}</div>
      <div className={`text-3xl font-bold mt-1 ${colorMap[accent]}`}>{value}</div>
    </div>
  );
}

interface DistributionCardProps {
  title: string;
  data: Record<string, number>;
}

function DistributionCard({ title, data }: DistributionCardProps) {
  const entries = Object.entries(data).sort(([, a], [, b]) => b - a);
  const total = entries.reduce((s, [, v]) => s + v, 0);
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="text-sm font-medium text-gray-700 mb-3">{title}</div>
      {entries.length === 0 ? (
        <div className="text-xs text-gray-400">Sem dados</div>
      ) : (
        <div className="space-y-2">
          {entries.map(([key, value]) => {
            const pct = total > 0 ? Math.round((value / total) * 100) : 0;
            return (
              <div key={key}>
                <div className="flex justify-between text-xs mb-0.5">
                  <span className="text-gray-700">{key}</span>
                  <span className="text-gray-500">
                    {value} ({pct}%)
                  </span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded overflow-hidden">
                  <div
                    className="h-full bg-orange-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Th({ children, align = 'left' }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return (
    <th
      className={`px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider ${
        align === 'right' ? 'text-right' : 'text-left'
      }`}
    >
      {children}
    </th>
  );
}

function Td({ children, align = 'left' }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return (
    <td
      className={`px-4 py-2 text-sm text-gray-900 ${align === 'right' ? 'text-right' : 'text-left'}`}
    >
      {children}
    </td>
  );
}
