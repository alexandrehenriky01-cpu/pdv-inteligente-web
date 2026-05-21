import { useCallback, useEffect, useState } from 'react';
import { CalendarRange, Pencil, Plus, Trash2, X } from 'lucide-react';
import { RhPageShell } from '../components/RhPageShell';
import { createEscala, deleteEscala, listEscalas, updateEscala, type EscalaFormInput } from '../services/rhApi';
import type { RhEscalaView } from '../types/rh.types';

const inputCls =
  'w-full rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-violet-500/50 focus:outline-none';

function toIsoDateOnly(d: string | null | undefined): string {
  if (!d) return '';
  return d.slice(0, 10);
}

export default function RhEscalasPage(): JSX.Element {
  const [items, setItems] = useState<RhEscalaView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<EscalaFormInput>({
    codigo: '',
    nome: '',
    dataInicio: new Date().toISOString(),
  });
  const [submitting, setSubmitting] = useState(false);

  const openCreate = (): void => {
    setEditingId(null);
    setForm({ codigo: '', nome: '', dataInicio: new Date().toISOString() });
    setShowForm(true);
  };

  const openEdit = (e: RhEscalaView): void => {
    setEditingId(e.id);
    setForm({
      codigo: e.codigo,
      nome: e.nome,
      descricao: e.descricao ?? null,
      dataInicio: e.dataInicio,
      dataFim: e.dataFim ?? null,
      ativo: e.ativo,
    });
    setShowForm(true);
  };

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listEscalas({ pageSize: 200 });
      setItems([...res.items]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void reload(); }, [reload]);

  const submit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      if (editingId) {
        await updateEscala(editingId, form);
      } else {
        await createEscala(form);
      }
      setShowForm(false);
      setEditingId(null);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao salvar.');
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (id: string): Promise<void> => {
    if (!window.confirm('Inativar esta escala?')) return;
    try {
      await deleteEscala(id);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha.');
    }
  };

  return (
    <RhPageShell
      title="Escalas"
      subtitle="Cadastro de escalas (12x36, plantões, turnos). A atribuição funcionário↔escala vem em sprint de ponto."
      icon={<CalendarRange className="h-6 w-6" />}
      onRefresh={reload}
      loading={loading}
      error={error}
      actions={
        <button type="button" onClick={openCreate} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-violet-900/30 hover:from-violet-500 hover:to-fuchsia-500">
          <Plus className="h-4 w-4" /> Nova
        </button>
      }
    >
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/30">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/5 text-xs uppercase tracking-wide text-slate-300">
            <tr>
              <th className="px-4 py-3">Código</th>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">Início</th>
              <th className="px-4 py-3">Fim</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Carregando…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Nenhuma escala cadastrada.</td></tr>
            ) : (
              items.map((e) => (
                <tr key={e.id} className="border-t border-white/5 hover:bg-white/5">
                  <td className="px-4 py-3 font-mono text-xs">{e.codigo}</td>
                  <td className="px-4 py-3">{e.nome}</td>
                  <td className="px-4 py-3 text-slate-400">{toIsoDateOnly(e.dataInicio)}</td>
                  <td className="px-4 py-3 text-slate-400">{toIsoDateOnly(e.dataFim) || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-md border px-2 py-0.5 text-xs ${e.ativo ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-slate-500/30 bg-slate-500/10 text-slate-300'}`}>
                      {e.ativo ? 'Ativa' : 'Inativa'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-1">
                      <button type="button" onClick={() => openEdit(e)} className="rounded-md border border-violet-500/30 bg-violet-500/10 px-2 py-1 text-xs text-violet-200 hover:bg-violet-500/20" title="Editar">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button type="button" onClick={() => void remove(e.id)} className="rounded-md border border-rose-500/30 bg-rose-500/10 px-2 py-1 text-xs text-rose-200 hover:bg-rose-500/20" title="Inativar">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showForm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <form onSubmit={(e) => void submit(e)} className="w-full max-w-md space-y-3 rounded-2xl border border-white/10 bg-slate-950 p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">{editingId ? 'Editar escala' : 'Nova escala'}</h2>
              <button type="button" onClick={() => { setShowForm(false); setEditingId(null); }} className="text-slate-400 hover:text-white"><X className="h-5 w-5" /></button>
            </div>
            <label className="block text-xs uppercase tracking-wide text-slate-400">
              <span>Código *</span>
              <input required value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} className={`mt-1 ${inputCls}`} />
            </label>
            <label className="block text-xs uppercase tracking-wide text-slate-400">
              <span>Nome *</span>
              <input required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} className={`mt-1 ${inputCls}`} />
            </label>
            <label className="block text-xs uppercase tracking-wide text-slate-400">
              <span>Data início *</span>
              <input required type="date" value={toIsoDateOnly(form.dataInicio)} onChange={(e) => setForm({ ...form, dataInicio: new Date(`${e.target.value}T00:00:00Z`).toISOString() })} className={`mt-1 ${inputCls}`} />
            </label>
            <label className="block text-xs uppercase tracking-wide text-slate-400">
              <span>Data fim (opcional)</span>
              <input type="date" value={toIsoDateOnly(form.dataFim)} onChange={(e) => setForm({ ...form, dataFim: e.target.value ? new Date(`${e.target.value}T00:00:00Z`).toISOString() : null })} className={`mt-1 ${inputCls}`} />
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => { setShowForm(false); setEditingId(null); }} className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300 hover:bg-white/5">Cancelar</button>
              <button type="submit" disabled={submitting} className="rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                {submitting ? 'Salvando…' : (editingId ? 'Salvar' : 'Criar')}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </RhPageShell>
  );
}
