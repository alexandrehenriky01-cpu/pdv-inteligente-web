import { useCallback, useEffect, useState } from 'react';
import { Clock, Plus, Pencil, Trash2, X } from 'lucide-react';
import { RhPageShell } from '../components/RhPageShell';
import { createJornada, deleteJornada, listJornadas, updateJornada, type JornadaFormInput } from '../services/rhApi';
import type { RhDiaSemana, RhJornadaView, RhTipoJornada } from '../types/rh.types';

const inputCls =
  'w-full rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-violet-500/50 focus:outline-none';

const DIAS: readonly RhDiaSemana[] = ['SEGUNDA', 'TERCA', 'QUARTA', 'QUINTA', 'SEXTA', 'SABADO', 'DOMINGO'];
const DIA_LABEL: Record<RhDiaSemana, string> = {
  SEGUNDA: 'Seg', TERCA: 'Ter', QUARTA: 'Qua', QUINTA: 'Qui', SEXTA: 'Sex', SABADO: 'Sáb', DOMINGO: 'Dom',
};

export default function RhJornadasPage(): JSX.Element {
  const [items, setItems] = useState<RhJornadaView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<JornadaFormInput>({
    codigo: '',
    nome: '',
    tipoJornada: 'FIXA',
    horasSemanais: 44,
    intervaloMinutos: 60,
    diasJornada: [],
  });
  const [submitting, setSubmitting] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listJornadas({ pageSize: 200 });
      setItems([...res.items]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void reload(); }, [reload]);

  const open = (): void => {
    setEditingId(null);
    setForm({ codigo: '', nome: '', tipoJornada: 'FIXA', horasSemanais: 44, intervaloMinutos: 60, diasJornada: [] });
    setShowForm(true);
  };

  const openEdit = (j: RhJornadaView): void => {
    setEditingId(j.id);
    setForm({
      codigo: j.codigo,
      nome: j.nome,
      tipoJornada: j.tipoJornada,
      horasSemanais: typeof j.horasSemanais === 'string' ? Number(j.horasSemanais) : j.horasSemanais,
      intervaloMinutos: j.intervaloMinutos,
      diasJornada: j.diasJornada.map((d) => ({
        diaSemana: d.diaSemana,
        horaInicio: d.horaInicio,
        horaFim: d.horaFim,
        intervaloMin: d.intervaloMin,
      })),
    });
    setShowForm(true);
  };

  const toggleDia = (dia: RhDiaSemana, horaInicio = '08:00', horaFim = '17:00'): void => {
    setForm((prev) => {
      const exists = (prev.diasJornada ?? []).find((d) => d.diaSemana === dia);
      const next = exists
        ? (prev.diasJornada ?? []).filter((d) => d.diaSemana !== dia)
        : [...(prev.diasJornada ?? []), { diaSemana: dia, horaInicio, horaFim, intervaloMin: 60 }];
      return { ...prev, diasJornada: next };
    });
  };

  const updateDia = (dia: RhDiaSemana, patch: { horaInicio?: string; horaFim?: string; intervaloMin?: number }): void => {
    setForm((prev) => ({
      ...prev,
      diasJornada: (prev.diasJornada ?? []).map((d) => (d.diaSemana === dia ? { ...d, ...patch } : d)),
    }));
  };

  const submit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      if (editingId) {
        await updateJornada(editingId, form);
      } else {
        await createJornada(form);
      }
      setShowForm(false);
      setEditingId(null);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao salvar jornada.');
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (id: string): Promise<void> => {
    if (!window.confirm('Inativar esta jornada?')) return;
    try {
      await deleteJornada(id);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha.');
    }
  };

  return (
    <RhPageShell
      title="Jornadas"
      icon={<Clock className="h-6 w-6" />}
      onRefresh={reload}
      loading={loading}
      error={error}
      actions={
        <button type="button" onClick={open} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-violet-900/30 hover:from-violet-500 hover:to-fuchsia-500">
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
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">Horas/sem</th>
              <th className="px-4 py-3">Dias</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Carregando…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Nenhuma jornada cadastrada.</td></tr>
            ) : (
              items.map((j) => (
                <tr key={j.id} className="border-t border-white/5 hover:bg-white/5">
                  <td className="px-4 py-3 font-mono text-xs">{j.codigo}</td>
                  <td className="px-4 py-3">{j.nome}</td>
                  <td className="px-4 py-3 text-slate-400">{j.tipoJornada}</td>
                  <td className="px-4 py-3 text-slate-400">{String(j.horasSemanais)}h</td>
                  <td className="px-4 py-3 text-slate-400">{j.diasJornada.length}/7</td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-1">
                      <button type="button" onClick={() => openEdit(j)} className="rounded-md border border-violet-500/30 bg-violet-500/10 px-2 py-1 text-xs text-violet-200 hover:bg-violet-500/20" title="Editar">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button type="button" onClick={() => void remove(j.id)} className="rounded-md border border-rose-500/30 bg-rose-500/10 px-2 py-1 text-xs text-rose-200 hover:bg-rose-500/20" title="Inativar">
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
          <form onSubmit={(e) => void submit(e)} className="w-full max-w-2xl space-y-3 rounded-2xl border border-white/10 bg-slate-950 p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">{editingId ? 'Editar jornada' : 'Nova jornada'}</h2>
              <button type="button" onClick={() => { setShowForm(false); setEditingId(null); }} className="text-slate-400 hover:text-white"><X className="h-5 w-5" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-xs uppercase tracking-wide text-slate-400">
                <span>Código *</span>
                <input required value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} className={`mt-1 ${inputCls}`} />
              </label>
              <label className="block text-xs uppercase tracking-wide text-slate-400">
                <span>Nome *</span>
                <input required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} className={`mt-1 ${inputCls}`} />
              </label>
              <label className="block text-xs uppercase tracking-wide text-slate-400">
                <span>Tipo *</span>
                <select required value={form.tipoJornada} onChange={(e) => setForm({ ...form, tipoJornada: e.target.value as RhTipoJornada })} className={`mt-1 ${inputCls}`}>
                  <option value="FIXA">Fixa</option>
                  <option value="ESCALA">Escala</option>
                  <option value="FLEXIVEL">Flexível</option>
                </select>
              </label>
              <label className="block text-xs uppercase tracking-wide text-slate-400">
                <span>Horas semanais *</span>
                <input required type="number" step="0.5" min={0} max={168} value={form.horasSemanais} onChange={(e) => setForm({ ...form, horasSemanais: Number(e.target.value) })} className={`mt-1 ${inputCls}`} />
              </label>
            </div>

            <div>
              <div className="mb-2 text-xs uppercase tracking-wide text-slate-400">Dias da semana</div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {DIAS.map((d) => {
                  const selected = (form.diasJornada ?? []).find((x) => x.diaSemana === d);
                  return (
                    <div key={d} className={`rounded-xl border p-2 ${selected ? 'border-violet-500/30 bg-violet-500/10' : 'border-white/10 bg-white/5'}`}>
                      <label className="flex items-center gap-2 text-sm text-white">
                        <input type="checkbox" checked={!!selected} onChange={() => toggleDia(d)} className="accent-violet-500" />
                        {DIA_LABEL[d]}
                      </label>
                      {selected ? (
                        <div className="mt-2 grid grid-cols-2 gap-1">
                          <input value={selected.horaInicio} onChange={(e) => updateDia(d, { horaInicio: e.target.value })} placeholder="08:00" className={inputCls} />
                          <input value={selected.horaFim} onChange={(e) => updateDia(d, { horaFim: e.target.value })} placeholder="17:00" className={inputCls} />
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>

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
