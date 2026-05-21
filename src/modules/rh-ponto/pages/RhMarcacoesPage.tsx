import { useCallback, useEffect, useState } from 'react';
import { ClipboardCheck, Search } from 'lucide-react';
import { RhPageShell } from '../../rh/components/RhPageShell';
import { listMarcacoes, urlComprovantePdf } from '../services/pontoApi';
import type { PontoMarcacaoView, RhStatusMarcacao, RhTipoMarcacao } from '../types/ponto.types';

const TIPO_LABEL: Record<RhTipoMarcacao, string> = {
  ENTRADA: 'Entrada',
  SAIDA: 'Saída',
  INICIO_INTERVALO: 'Início intervalo',
  FIM_INTERVALO: 'Fim intervalo',
};

const STATUS_COLOR: Record<RhStatusMarcacao, string> = {
  VALIDA: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  AJUSTADA: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  PENDENTE: 'border-slate-500/30 bg-slate-500/10 text-slate-300',
  REJEITADA: 'border-rose-500/30 bg-rose-500/10 text-rose-300',
};

export default function RhMarcacoesPage(): JSX.Element {
  const [items, setItems] = useState<PontoMarcacaoView[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<RhStatusMarcacao | ''>('');
  const [page, setPage] = useState(1);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await listMarcacoes({
        funcionarioId: search || undefined,
        status: statusFilter || undefined,
        page,
        pageSize: 25,
      });
      setItems([...r.items]);
      setTotal(r.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha.');
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => { void reload(); }, [reload]);

  return (
    <RhPageShell
      title="Marcações de ponto"
      subtitle="Todas as marcações registradas via totem ou web."
      icon={<ClipboardCheck className="h-6 w-6" />}
      onRefresh={reload}
      loading={loading}
      error={error}
    >
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="search"
            placeholder="Filtrar por funcionarioId…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full rounded-xl border border-white/10 bg-slate-950/40 py-2 pl-10 pr-3 text-sm text-white"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value as RhStatusMarcacao | ''); setPage(1); }}
          className="rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2 text-sm text-white"
        >
          <option value="">Todos os status</option>
          <option value="VALIDA">Válidas</option>
          <option value="AJUSTADA">Ajustadas</option>
          <option value="PENDENTE">Pendentes</option>
          <option value="REJEITADA">Rejeitadas</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/30">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/5 text-xs uppercase tracking-wide text-slate-300">
            <tr>
              <th className="px-4 py-3">Funcionário</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">Hora servidor</th>
              <th className="px-4 py-3">Método</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Comprovante</th>
              <th className="px-4 py-3 text-right">Hash</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">Carregando…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">Nenhuma marcação encontrada.</td></tr>
            ) : (
              items.map((m) => (
                <tr key={m.id} className="border-t border-white/5">
                  <td className="px-4 py-3 font-mono text-xs">{m.funcionarioId.slice(0, 8)}…</td>
                  <td className="px-4 py-3">{TIPO_LABEL[m.tipoMarcacao]}</td>
                  <td className="px-4 py-3 text-slate-300">{new Date(m.timestampServidor).toLocaleString('pt-BR')}</td>
                  <td className="px-4 py-3 text-slate-400">{m.metodoAutenticacao}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-md border px-2 py-0.5 text-xs ${STATUS_COLOR[m.status]}`}>{m.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    <a href={urlComprovantePdf(m.codigoComprovante)} target="_blank" rel="noreferrer" className="text-violet-300 underline-offset-2 hover:underline">
                      {m.codigoComprovante}
                    </a>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs text-slate-500">{m.hashIntegridadePrefix}…</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {total > 25 ? (
        <div className="flex items-center justify-between text-sm text-slate-400">
          <span>Total: {total}</span>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="rounded-md border border-white/10 bg-white/5 px-3 py-1 disabled:opacity-40">Anterior</button>
            <span>Página {page}</span>
            <button type="button" onClick={() => setPage((p) => p + 1)} disabled={page * 25 >= total} className="rounded-md border border-white/10 bg-white/5 px-3 py-1 disabled:opacity-40">Próxima</button>
          </div>
        </div>
      ) : null}
    </RhPageShell>
  );
}
