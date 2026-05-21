import { useCallback, useEffect, useState } from 'react';
import { Briefcase, Plus, Trash2, X } from 'lucide-react';
import { RhPageShell } from '../components/RhPageShell';
import {
  createCargo,
  deleteCargo,
  listCargos,
  listDepartamentos,
  updateCargo,
  type CargoFormInput,
} from '../services/rhApi';
import type { RhCargoView, RhDepartamentoView } from '../types/rh.types';

const inputCls =
  'w-full rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-violet-500/50 focus:outline-none';

export default function RhCargosPage(): JSX.Element {
  const [items, setItems] = useState<RhCargoView[]>([]);
  const [departamentos, setDepartamentos] = useState<RhDepartamentoView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<RhCargoView | null>(null);
  const [form, setForm] = useState<CargoFormInput>({ codigo: '', nome: '' });
  const [submitting, setSubmitting] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [cargos, deps] = await Promise.all([
        listCargos({ pageSize: 200 }),
        listDepartamentos({ pageSize: 200 }),
      ]);
      setItems([...cargos.items]);
      setDepartamentos([...deps.items]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void reload(); }, [reload]);

  const open = (target: RhCargoView | null): void => {
    setEditing(target);
    setForm(target
      ? { codigo: target.codigo, nome: target.nome, descricao: target.descricao, cbo: target.cbo, departamentoId: target.departamentoId, ativo: target.ativo }
      : { codigo: '', nome: '' });
    setShowForm(true);
  };

  const submit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      if (editing) await updateCargo(editing.id, form);
      else await createCargo(form);
      setShowForm(false);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao salvar.');
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (id: string): Promise<void> => {
    if (!window.confirm('Inativar este cargo?')) return;
    try {
      await deleteCargo(id);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao inativar.');
    }
  };

  return (
    <RhPageShell
      title="Cargos"
      icon={<Briefcase className="h-6 w-6" />}
      onRefresh={reload}
      loading={loading}
      error={error}
      actions={
        <button type="button" onClick={() => open(null)} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-violet-900/30 hover:from-violet-500 hover:to-fuchsia-500">
          <Plus className="h-4 w-4" /> Novo
        </button>
      }
    >
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/30">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/5 text-xs uppercase tracking-wide text-slate-300">
            <tr>
              <th className="px-4 py-3">Código</th>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">Departamento</th>
              <th className="px-4 py-3">CBO</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Carregando…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Nenhum cargo cadastrado.</td></tr>
            ) : (
              items.map((c) => (
                <tr key={c.id} className="border-t border-white/5 hover:bg-white/5">
                  <td className="px-4 py-3 font-mono text-xs">{c.codigo}</td>
                  <td className="px-4 py-3">{c.nome}</td>
                  <td className="px-4 py-3 text-slate-400">{c.departamento?.nome ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-400">{c.cbo ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-md border px-2 py-0.5 text-xs ${c.ativo ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-slate-500/30 bg-slate-500/10 text-slate-300'}`}>
                      {c.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-1">
                      <button type="button" onClick={() => open(c)} className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-200 hover:bg-white/10">Editar</button>
                      <button type="button" onClick={() => void remove(c.id)} className="rounded-md border border-rose-500/30 bg-rose-500/10 px-2 py-1 text-xs text-rose-200 hover:bg-rose-500/20">
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
              <h2 className="text-lg font-semibold text-white">{editing ? 'Editar cargo' : 'Novo cargo'}</h2>
              <button type="button" onClick={() => setShowForm(false)} className="text-slate-400 hover:text-white"><X className="h-5 w-5" /></button>
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
              <span>Departamento</span>
              <select value={form.departamentoId ?? ''} onChange={(e) => setForm({ ...form, departamentoId: e.target.value || null })} className={`mt-1 ${inputCls}`}>
                <option value="">—</option>
                {departamentos.map((d) => <option key={d.id} value={d.id}>{d.nome}</option>)}
              </select>
            </label>
            <label className="block text-xs uppercase tracking-wide text-slate-400">
              <span>CBO (opcional)</span>
              <input value={form.cbo ?? ''} onChange={(e) => setForm({ ...form, cbo: e.target.value || null })} className={`mt-1 ${inputCls}`} />
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowForm(false)} className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300 hover:bg-white/5">Cancelar</button>
              <button type="submit" disabled={submitting} className="rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                {submitting ? 'Salvando…' : editing ? 'Salvar' : 'Criar'}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </RhPageShell>
  );
}
