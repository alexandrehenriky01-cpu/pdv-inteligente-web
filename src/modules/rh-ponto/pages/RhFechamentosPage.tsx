import { useCallback, useEffect, useState } from 'react';
import { CalendarCheck, CheckCircle2, FileSignature, FileText, Lock, Plus, X } from 'lucide-react';
import { RhPageShell } from '../../rh/components/RhPageShell';
import {
  abrirCartaoPontoPdf,
  assinarFechamento,
  criarFechamento,
  fecharPeriodo,
  listFechamentos,
} from '../services/pontoApi';
import { listFuncionarios } from '../../rh/services/rhApi';
import type { FechamentoView, RhStatusFechamento } from '../types/ponto.types';
import type { RhFuncionarioListItem } from '../../rh/types/rh.types';

const STATUS_COLOR: Record<RhStatusFechamento, string> = {
  ABERTO: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  FECHADO: 'border-violet-500/30 bg-violet-500/10 text-violet-300',
  ASSINADO: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  CANCELADO: 'border-slate-500/30 bg-slate-500/10 text-slate-300',
};

function fmtMin(min: number): string {
  const abs = Math.abs(min);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  const sign = min < 0 ? '-' : '';
  return `${sign}${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export default function RhFechamentosPage(): JSX.Element {
  const now = new Date();
  const [items, setItems] = useState<FechamentoView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<RhStatusFechamento | ''>('');
  const [funcionarios, setFuncionarios] = useState<RhFuncionarioListItem[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formFuncId, setFormFuncId] = useState('');
  const [formAno, setFormAno] = useState(now.getUTCFullYear());
  const [formMes, setFormMes] = useState(now.getUTCMonth() + 1);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const r = await listFuncionarios({ pageSize: 200 });
        if (!cancelled) setFuncionarios([...r.items]);
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, []);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await listFechamentos({ status: statusFilter || undefined });
      setItems([...r.items]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { void reload(); }, [reload]);

  const fechar = async (id: string): Promise<void> => {
    if (!window.confirm('Fechar este período? Cria lançamento de FECHAMENTO no banco de horas. Pode ser reaberto até a assinatura.')) return;
    try {
      await fecharPeriodo(id);
      setInfo('Período fechado.');
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha.');
    }
  };

  const assinar = async (id: string): Promise<void> => {
    if (!window.confirm('Assinar este fechamento? Após assinatura ele se torna IMUTÁVEL (gera hash SHA-256).')) return;
    try {
      await assinarFechamento(id);
      setInfo('Fechamento assinado.');
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha.');
    }
  };

  const baixarPdf = async (id: string): Promise<void> => {
    try {
      await abrirCartaoPontoPdf(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao gerar PDF.');
    }
  };

  const openForm = (): void => {
    setFormFuncId(funcionarios[0]?.id ?? '');
    setFormAno(now.getUTCFullYear());
    setFormMes(now.getUTCMonth() + 1);
    setError(null);
    setInfo(null);
    setShowForm(true);
  };

  const submit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (!formFuncId) { setError('Selecione um funcionário.'); return; }
    setSubmitting(true);
    setError(null);
    try {
      await criarFechamento({ funcionarioId: formFuncId, ano: formAno, mes: formMes });
      setShowForm(false);
      setInfo(`Fechamento ${String(formMes).padStart(2, '0')}/${formAno} criado em status ABERTO.`);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao criar fechamento.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <RhPageShell
      title="Fechamentos mensais"
      subtitle="Workflow: ABERTO → FECHADO → ASSINADO. Após assinado, imutável (hash SHA-256 garante integridade)."
      icon={<CalendarCheck className="h-6 w-6" />}
      onRefresh={reload}
      loading={loading}
      error={error}
      actions={
        <button
          type="button"
          onClick={openForm}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-violet-900/30 hover:from-violet-500 hover:to-fuchsia-500"
        >
          <Plus className="h-4 w-4" /> Criar fechamento
        </button>
      }
    >
      <div className="flex items-center gap-2">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as RhStatusFechamento | '')}
          className="rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2 text-sm text-white"
        >
          <option value="">Todos</option>
          <option value="ABERTO">Abertos</option>
          <option value="FECHADO">Fechados</option>
          <option value="ASSINADO">Assinados</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/30">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/5 text-xs uppercase tracking-wide text-slate-300">
            <tr>
              <th className="px-4 py-3">Funcionário</th>
              <th className="px-4 py-3">Período</th>
              <th className="px-4 py-3 text-right">Trab.</th>
              <th className="px-4 py-3 text-right">Extras</th>
              <th className="px-4 py-3 text-right">Atrasos</th>
              <th className="px-4 py-3 text-right">Saldo banco</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400">Carregando…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400">Sem fechamentos. Use "Criar fechamento" para começar.</td></tr>
            ) : (
              items.map((f) => (
                <tr key={f.id} className="border-t border-white/5">
                  <td className="px-4 py-3 font-mono text-xs">{f.funcionarioId.slice(0, 8)}…</td>
                  <td className="px-4 py-3 text-slate-300">{String(f.mes).padStart(2, '0')}/{f.ano}</td>
                  <td className="px-4 py-3 text-right font-mono">{fmtMin(f.totalHorasMinutos)}</td>
                  <td className="px-4 py-3 text-right font-mono text-emerald-300">{fmtMin(f.totalExtrasMinutos)}</td>
                  <td className="px-4 py-3 text-right font-mono text-amber-300">{fmtMin(f.totalAtrasosMinutos)}</td>
                  <td className={`px-4 py-3 text-right font-mono ${f.saldoBancoMinutos < 0 ? 'text-rose-300' : 'text-emerald-300'}`}>{fmtMin(f.saldoBancoMinutos)}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-md border px-2 py-0.5 text-xs ${STATUS_COLOR[f.status]}`}>{f.status}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex flex-wrap justify-end gap-1">
                      {f.status === 'ABERTO' ? (
                        <button onClick={() => void fechar(f.id)} className="inline-flex items-center gap-1 rounded-md border border-violet-500/30 bg-violet-500/10 px-2 py-1 text-xs text-violet-200 hover:bg-violet-500/20">
                          <Lock className="h-3.5 w-3.5" /> Fechar
                        </button>
                      ) : null}
                      {f.status === 'FECHADO' ? (
                        <button onClick={() => void assinar(f.id)} className="inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-xs text-emerald-200 hover:bg-emerald-500/20">
                          <FileSignature className="h-3.5 w-3.5" /> Assinar
                        </button>
                      ) : null}
                      <button onClick={() => void baixarPdf(f.id)} className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-200 hover:bg-white/10">
                        <FileText className="h-3.5 w-3.5" /> PDF
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {info ? (
        <div className="fixed bottom-6 right-6 z-50 inline-flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200 shadow-lg">
          <CheckCircle2 className="h-4 w-4" />
          {info}
          <button onClick={() => setInfo(null)} className="ml-2 text-emerald-300 hover:text-white"><X className="h-3 w-3" /></button>
        </div>
      ) : null}

      {showForm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <form onSubmit={(e) => void submit(e)} className="w-full max-w-md space-y-4 rounded-2xl border border-white/10 bg-slate-950 p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Criar fechamento mensal</h2>
              <button type="button" onClick={() => setShowForm(false)} className="text-slate-400 hover:text-white"><X className="h-5 w-5" /></button>
            </div>
            <p className="text-xs text-slate-400">
              Cria um fechamento em status <strong className="text-amber-300">ABERTO</strong> com os totais
              calculados pelo motor de jornada. Continue a evolução até <strong className="text-violet-300">FECHADO</strong>
              e depois <strong className="text-emerald-300">ASSINADO</strong>.
            </p>

            <label className="block">
              <span className="text-xs uppercase tracking-wide text-slate-400">Funcionário *</span>
              <select
                required
                value={formFuncId}
                onChange={(e) => setFormFuncId(e.target.value)}
                className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white"
              >
                <option value="">Selecione…</option>
                {funcionarios.map((f) => (
                  <option key={f.id} value={f.id}>{f.matricula} · {f.nome}</option>
                ))}
              </select>
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs uppercase tracking-wide text-slate-400">Ano *</span>
                <input
                  required
                  type="number"
                  min={2024}
                  max={2100}
                  value={formAno}
                  onChange={(e) => setFormAno(Number(e.target.value))}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white"
                />
              </label>
              <label className="block">
                <span className="text-xs uppercase tracking-wide text-slate-400">Mês *</span>
                <select
                  required
                  value={formMes}
                  onChange={(e) => setFormMes(Number(e.target.value))}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m}>{String(m).padStart(2, '0')}</option>
                  ))}
                </select>
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowForm(false)} className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300 hover:bg-white/5">
                Cancelar
              </button>
              <button type="submit" disabled={submitting} className="rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                {submitting ? 'Criando…' : 'Criar fechamento'}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </RhPageShell>
  );
}
