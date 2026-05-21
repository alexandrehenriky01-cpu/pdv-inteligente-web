import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Plus, ThumbsDown, ThumbsUp, Wrench, X } from 'lucide-react';
import { RhPageShell } from '../../rh/components/RhPageShell';
import { aprovarAjuste, criarAjuste, listAjustes, rejeitarAjuste } from '../services/pontoApi';
import { listFuncionarios } from '../../rh/services/rhApi';
import type {
  PontoAjusteView,
  RhStatusAjuste,
  RhTipoAjuste,
  RhTipoMarcacao,
} from '../types/ponto.types';
import type { RhFuncionarioListItem } from '../../rh/types/rh.types';

const TIPOS_AJUSTE: ReadonlyArray<{ value: RhTipoAjuste; label: string }> = [
  { value: 'ESQUECIMENTO', label: 'Esquecimento' },
  { value: 'CORRECAO', label: 'Correção' },
  { value: 'ABONO', label: 'Abono' },
  { value: 'SISTEMA', label: 'Falha do sistema' },
  { value: 'OUTRO', label: 'Outro' },
];

const TIPOS_MARC: ReadonlyArray<{ value: RhTipoMarcacao; label: string }> = [
  { value: 'ENTRADA', label: 'Entrada' },
  { value: 'SAIDA', label: 'Saída' },
  { value: 'INICIO_INTERVALO', label: 'Início de intervalo' },
  { value: 'FIM_INTERVALO', label: 'Fim de intervalo' },
];

function toLocalInputValue(d: Date): string {
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const STATUS_COLOR: Record<RhStatusAjuste, string> = {
  PENDENTE: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  APROVADO: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  REJEITADO: 'border-rose-500/30 bg-rose-500/10 text-rose-300',
};

interface AjusteForm {
  funcionarioId: string;
  tipoAjuste: RhTipoAjuste;
  motivo: string;
  propostaTipoMarcacao: RhTipoMarcacao;
  propostaTimestamp: string;
  propostaObservacao: string;
}

export default function RhAjustesPage(): JSX.Element {
  const [items, setItems] = useState<PontoAjusteView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<RhStatusAjuste | ''>('PENDENTE');
  const [funcionarios, setFuncionarios] = useState<RhFuncionarioListItem[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<AjusteForm>({
    funcionarioId: '',
    tipoAjuste: 'ESQUECIMENTO',
    motivo: '',
    propostaTipoMarcacao: 'ENTRADA',
    propostaTimestamp: toLocalInputValue(new Date()),
    propostaObservacao: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const r = await listFuncionarios({ pageSize: 100 });
        if (!cancelled) setFuncionarios([...r.items]);
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, []);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await listAjustes({ status: statusFilter || undefined });
      setItems([...r.items]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { void reload(); }, [reload]);

  const aprovar = async (id: string): Promise<void> => {
    if (!window.confirm('Aprovar este ajuste? Criará uma nova marcação corrigida.')) return;
    try {
      await aprovarAjuste(id);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha.');
    }
  };

  const rejeitar = async (id: string): Promise<void> => {
    const motivo = window.prompt('Motivo da rejeição:');
    if (!motivo || motivo.trim().length < 3) return;
    try {
      await rejeitarAjuste(id, motivo.trim());
      setInfo('Ajuste rejeitado.');
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha.');
    }
  };

  const openForm = (): void => {
    setForm({
      funcionarioId: funcionarios[0]?.id ?? '',
      tipoAjuste: 'ESQUECIMENTO',
      motivo: '',
      propostaTipoMarcacao: 'ENTRADA',
      propostaTimestamp: toLocalInputValue(new Date()),
      propostaObservacao: '',
    });
    setError(null);
    setInfo(null);
    setShowForm(true);
  };

  const submitForm = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (!form.funcionarioId) {
      setError('Selecione um funcionário.');
      return;
    }
    if (form.motivo.trim().length < 3) {
      setError('Motivo deve ter pelo menos 3 caracteres.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await criarAjuste({
        funcionarioId: form.funcionarioId,
        tipoAjuste: form.tipoAjuste,
        motivo: form.motivo.trim(),
        propostaTipoMarcacao: form.propostaTipoMarcacao,
        propostaTimestamp: new Date(form.propostaTimestamp).toISOString(),
        propostaObservacao: form.propostaObservacao.trim() || null,
      });
      setShowForm(false);
      setInfo('Solicitação de ajuste enviada. Aguarde aprovação do gestor.');
      setStatusFilter('PENDENTE');
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao solicitar ajuste.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <RhPageShell
      title="Ajustes de ponto"
      subtitle="Solicitações de correção de marcação. Aprovar cria nova marcação; original fica como AJUSTADA."
      icon={<Wrench className="h-6 w-6" />}
      onRefresh={reload}
      loading={loading}
      error={error}
      actions={
        <button
          type="button"
          onClick={openForm}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-violet-900/30 hover:from-violet-500 hover:to-fuchsia-500"
        >
          <Plus className="h-4 w-4" /> Solicitar ajuste
        </button>
      }
    >
      <div className="flex items-center gap-2">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as RhStatusAjuste | '')}
          className="rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2 text-sm text-white"
        >
          <option value="">Todos</option>
          <option value="PENDENTE">Pendentes</option>
          <option value="APROVADO">Aprovados</option>
          <option value="REJEITADO">Rejeitados</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/30">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/5 text-xs uppercase tracking-wide text-slate-300">
            <tr>
              <th className="px-4 py-3">Funcionário</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">Proposta</th>
              <th className="px-4 py-3">Motivo</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Carregando…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Nenhum ajuste.</td></tr>
            ) : (
              items.map((a) => (
                <tr key={a.id} className="border-t border-white/5">
                  <td className="px-4 py-3 font-mono text-xs">{a.funcionarioId.slice(0, 8)}…</td>
                  <td className="px-4 py-3 text-slate-300">{a.tipoAjuste}</td>
                  <td className="px-4 py-3 text-slate-300">
                    <div>{a.propostaTipoMarcacao}</div>
                    <div className="text-xs text-slate-400">{new Date(a.propostaTimestamp).toLocaleString('pt-BR')}</div>
                  </td>
                  <td className="px-4 py-3 max-w-xs truncate text-slate-300">{a.motivo}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-md border px-2 py-0.5 text-xs ${STATUS_COLOR[a.status]}`}>{a.status}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {a.status === 'PENDENTE' ? (
                      <div className="inline-flex gap-1">
                        <button onClick={() => void aprovar(a.id)} className="inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-xs text-emerald-200 hover:bg-emerald-500/20">
                          <ThumbsUp className="h-3.5 w-3.5" /> Aprovar
                        </button>
                        <button onClick={() => void rejeitar(a.id)} className="inline-flex items-center gap-1 rounded-md border border-rose-500/30 bg-rose-500/10 px-2 py-1 text-xs text-rose-200 hover:bg-rose-500/20">
                          <ThumbsDown className="h-3.5 w-3.5" /> Rejeitar
                        </button>
                      </div>
                    ) : <span className="text-xs text-slate-500">—</span>}
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
          <form
            onSubmit={(e) => void submitForm(e)}
            className="w-full max-w-lg space-y-4 rounded-2xl border border-white/10 bg-slate-950 p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Solicitar ajuste de marcação</h2>
              <button type="button" onClick={() => setShowForm(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-xs text-slate-400">
              O ajuste fica como <strong className="text-amber-300">PENDENTE</strong> até um gestor aprovar.
              Quando aprovado, uma nova marcação é criada com origem WEB; a original (se houver) é marcada como AJUSTADA.
            </p>

            <label className="block">
              <span className="text-xs uppercase tracking-wide text-slate-400">Funcionário *</span>
              <select
                required
                value={form.funcionarioId}
                onChange={(e) => setForm({ ...form, funcionarioId: e.target.value })}
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
                <span className="text-xs uppercase tracking-wide text-slate-400">Tipo de ajuste *</span>
                <select
                  required
                  value={form.tipoAjuste}
                  onChange={(e) => setForm({ ...form, tipoAjuste: e.target.value as RhTipoAjuste })}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white"
                >
                  {TIPOS_AJUSTE.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="text-xs uppercase tracking-wide text-slate-400">Tipo da marcação *</span>
                <select
                  required
                  value={form.propostaTipoMarcacao}
                  onChange={(e) => setForm({ ...form, propostaTipoMarcacao: e.target.value as RhTipoMarcacao })}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white"
                >
                  {TIPOS_MARC.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </label>
            </div>

            <label className="block">
              <span className="text-xs uppercase tracking-wide text-slate-400">Data e hora propostas *</span>
              <input
                required
                type="datetime-local"
                value={form.propostaTimestamp}
                onChange={(e) => setForm({ ...form, propostaTimestamp: e.target.value })}
                className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white"
              />
            </label>

            <label className="block">
              <span className="text-xs uppercase tracking-wide text-slate-400">Motivo * (mín. 3 chars)</span>
              <textarea
                required
                rows={3}
                minLength={3}
                value={form.motivo}
                onChange={(e) => setForm({ ...form, motivo: e.target.value })}
                placeholder="Ex.: Esqueci de bater o ponto na saída de ontem."
                className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white"
              />
            </label>

            <label className="block">
              <span className="text-xs uppercase tracking-wide text-slate-400">Observação (opcional)</span>
              <input
                value={form.propostaObservacao}
                onChange={(e) => setForm({ ...form, propostaObservacao: e.target.value })}
                className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white"
              />
            </label>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300 hover:bg-white/5"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {submitting ? 'Enviando…' : 'Enviar solicitação'}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </RhPageShell>
  );
}
