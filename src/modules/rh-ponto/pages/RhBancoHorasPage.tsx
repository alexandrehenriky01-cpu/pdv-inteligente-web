import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Plus, Search, Wallet, X } from 'lucide-react';
import { RhPageShell } from '../../rh/components/RhPageShell';
import { bancoHorasAjuste, listBancoHoras } from '../services/pontoApi';
import { listFuncionarios } from '../../rh/services/rhApi';
import type { BancoHorasView } from '../types/ponto.types';
import type { RhFuncionarioListItem } from '../../rh/types/rh.types';

function fmtMin(min: number): string {
  const abs = Math.abs(min);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  const sign = min < 0 ? '-' : '';
  return `${sign}${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export default function RhBancoHorasPage(): JSX.Element {
  const [funcionarios, setFuncionarios] = useState<RhFuncionarioListItem[]>([]);
  const [selected, setSelected] = useState<RhFuncionarioListItem | null>(null);
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<BancoHorasView[]>([]);
  const [saldoAtual, setSaldoAtual] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formMinutos, setFormMinutos] = useState<number>(0);
  const [formObs, setFormObs] = useState('');

  useEffect(() => {
    let cancelled = false;
    const run = async (): Promise<void> => {
      try {
        const r = await listFuncionarios({ search: search || undefined, pageSize: 20 });
        if (!cancelled) setFuncionarios([...r.items]);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Erro.');
      }
    };
    void run();
    return () => { cancelled = true; };
  }, [search]);

  const reload = useCallback(async () => {
    if (!selected) {
      setItems([]);
      setSaldoAtual(0);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const r = await listBancoHoras(selected.id, { pageSize: 100 });
      setItems([...r.items]);
      setSaldoAtual(r.saldoAtual);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha.');
    } finally {
      setLoading(false);
    }
  }, [selected]);

  useEffect(() => { void reload(); }, [reload]);

  const openForm = (): void => {
    setFormMinutos(0);
    setFormObs('');
    setError(null);
    setInfo(null);
    setShowForm(true);
  };

  const submit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (!selected) return;
    if (formMinutos === 0) { setError('Informe um valor diferente de zero (positivo = crédito, negativo = débito).'); return; }
    if (formObs.trim().length < 3) { setError('Observação deve ter pelo menos 3 caracteres.'); return; }
    setSubmitting(true);
    setError(null);
    try {
      await bancoHorasAjuste({
        funcionarioId: selected.id,
        minutos: formMinutos,
        observacao: formObs.trim(),
      });
      setShowForm(false);
      setInfo(`Ajuste de ${fmtMin(formMinutos)} aplicado.`);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao ajustar.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <RhPageShell
      title="Banco de horas"
      subtitle="Lançamentos append-only. Saldo = soma dos lançamentos. Ajuste manual cria um lançamento auditável."
      icon={<Wallet className="h-6 w-6" />}
      error={error}
      actions={
        selected ? (
          <button
            type="button"
            onClick={openForm}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-violet-900/30 hover:from-violet-500 hover:to-fuchsia-500"
          >
            <Plus className="h-4 w-4" /> Ajuste manual
          </button>
        ) : null
      }
    >
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <aside className="rounded-2xl border border-white/10 bg-slate-950/30 p-3">
          <div className="relative mb-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              type="search"
              placeholder="Buscar funcionário…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-slate-900/60 py-2 pl-10 pr-3 text-sm text-white"
            />
          </div>
          <ul className="max-h-[60vh] space-y-1 overflow-auto">
            {funcionarios.map((f) => (
              <li key={f.id}>
                <button
                  type="button"
                  onClick={() => setSelected(f)}
                  className={`w-full rounded-md px-3 py-2 text-left text-sm hover:bg-white/5 ${selected?.id === f.id ? 'bg-violet-500/10 text-violet-100' : 'text-slate-200'}`}
                >
                  <div className="font-medium">{f.nome}</div>
                  <div className="text-xs text-slate-400">{f.matricula}</div>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <section className="lg:col-span-2">
          {selected ? (
            <>
              <div className="mb-3 rounded-2xl border border-violet-500/30 bg-violet-500/10 p-4">
                <div className="text-xs uppercase tracking-wide text-violet-200">Saldo atual de {selected.nome}</div>
                <div className={`mt-1 text-3xl font-bold ${saldoAtual < 0 ? 'text-rose-300' : 'text-emerald-300'}`}>
                  {fmtMin(saldoAtual)}
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/30">
                <table className="w-full text-left text-sm">
                  <thead className="bg-white/5 text-xs uppercase tracking-wide text-slate-300">
                    <tr>
                      <th className="px-4 py-3">Data</th>
                      <th className="px-4 py-3">Tipo</th>
                      <th className="px-4 py-3 text-right">Δ</th>
                      <th className="px-4 py-3 text-right">Saldo após</th>
                      <th className="px-4 py-3">Origem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">Carregando…</td></tr>
                    ) : items.length === 0 ? (
                      <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">Sem lançamentos.</td></tr>
                    ) : (
                      items.map((b) => (
                        <tr key={b.id} className="border-t border-white/5">
                          <td className="px-4 py-3 text-slate-400">{new Date(b.createdAt).toLocaleString('pt-BR')}</td>
                          <td className="px-4 py-3 text-slate-300">{b.tipo}</td>
                          <td className={`px-4 py-3 text-right font-mono ${b.minutos < 0 ? 'text-rose-300' : 'text-emerald-300'}`}>{fmtMin(b.minutos)}</td>
                          <td className="px-4 py-3 text-right font-mono text-slate-200">{fmtMin(b.saldoAposMinutos)}</td>
                          <td className="px-4 py-3 text-xs text-slate-400">{b.origem}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 p-12 text-center text-slate-400">
              Selecione um funcionário para ver o banco de horas.
            </div>
          )}
        </section>
      </div>

      {info ? (
        <div className="fixed bottom-6 right-6 z-50 inline-flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200 shadow-lg">
          <CheckCircle2 className="h-4 w-4" />
          {info}
          <button onClick={() => setInfo(null)} className="ml-2 text-emerald-300 hover:text-white"><X className="h-3 w-3" /></button>
        </div>
      ) : null}

      {showForm && selected ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <form onSubmit={(e) => void submit(e)} className="w-full max-w-md space-y-4 rounded-2xl border border-white/10 bg-slate-950 p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Ajuste manual de banco de horas</h2>
              <button type="button" onClick={() => setShowForm(false)} className="text-slate-400 hover:text-white"><X className="h-5 w-5" /></button>
            </div>
            <p className="text-xs text-slate-400">
              Funcionário <strong className="text-white">{selected.nome}</strong> ({selected.matricula}).
              Use valores <strong className="text-emerald-300">positivos</strong> para crédito e <strong className="text-rose-300">negativos</strong> para débito.
              Toda operação fica registrada e auditável.
            </p>

            <label className="block">
              <span className="text-xs uppercase tracking-wide text-slate-400">Minutos *</span>
              <input
                required
                type="number"
                step="1"
                min={-100000}
                max={100000}
                value={formMinutos}
                onChange={(e) => setFormMinutos(Number(e.target.value))}
                className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white"
              />
              <span className="mt-1 block text-xs text-slate-500">Equivalente a {fmtMin(formMinutos)}.</span>
            </label>

            <label className="block">
              <span className="text-xs uppercase tracking-wide text-slate-400">Observação * (mín. 3 chars)</span>
              <textarea
                required
                rows={3}
                minLength={3}
                value={formObs}
                onChange={(e) => setFormObs(e.target.value)}
                placeholder="Ex.: Compensação acordada pelo RH em reunião do dia 15."
                className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white"
              />
            </label>

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowForm(false)} className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300 hover:bg-white/5">
                Cancelar
              </button>
              <button type="submit" disabled={submitting} className="rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                {submitting ? 'Salvando…' : 'Aplicar ajuste'}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </RhPageShell>
  );
}
