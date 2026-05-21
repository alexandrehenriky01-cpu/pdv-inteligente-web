import { useCallback, useEffect, useMemo, useState } from 'react';
import { Users, Plus, Search, X, Trash2, FileText, UserCog } from 'lucide-react';
import { RhPageShell } from '../components/RhPageShell';
import { RhFuncionarioDocumentos } from '../components/RhFuncionarioDocumentos';
import {
  createFuncionario,
  deleteFuncionario,
  demitirFuncionario,
  listCargos,
  listDepartamentos,
  listFuncionarios,
  listJornadas,
  reativarFuncionario,
  updateFuncionario,
  type FuncionarioFormInput,
} from '../services/rhApi';
import type {
  RhCargoView,
  RhDepartamentoView,
  RhFuncionarioListItem,
  RhFuncionarioStatus,
  RhJornadaView,
  RhTipoContrato,
} from '../types/rh.types';

const STATUS_BADGE: Record<RhFuncionarioStatus, string> = {
  ATIVO: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
  INATIVO: 'bg-slate-500/10 text-slate-300 border-slate-500/30',
  AFASTADO: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
  DEMITIDO: 'bg-rose-500/10 text-rose-300 border-rose-500/30',
};

const CONTRATO_LABEL: Record<RhTipoContrato, string> = {
  CLT: 'CLT',
  PJ: 'PJ',
  ESTAGIO: 'Estágio',
  TEMPORARIO: 'Temporário',
  AUTONOMO: 'Autônomo',
};

function formatCpf(value: string): string {
  if (value.length !== 11) return value;
  return `${value.slice(0, 3)}.${value.slice(3, 6)}.${value.slice(6, 9)}-${value.slice(9, 11)}`;
}

function toIsoDateOnly(d: string | null | undefined): string {
  if (!d) return '';
  return d.slice(0, 10);
}

const EMPTY_FORM: FuncionarioFormInput = {
  matricula: '',
  nome: '',
  cpf: '',
  email: null,
  telefone: null,
  rg: null,
  dataAdmissao: new Date().toISOString(),
  tipoContrato: 'CLT',
  salarioBase: null,
  departamentoId: null,
  cargoId: null,
  jornadaId: null,
  observacoes: null,
};

export default function RhFuncionariosPage(): JSX.Element {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [funcionarios, setFuncionarios] = useState<RhFuncionarioListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [departamentos, setDepartamentos] = useState<RhDepartamentoView[]>([]);
  const [cargos, setCargos] = useState<RhCargoView[]>([]);
  const [jornadas, setJornadas] = useState<RhJornadaView[]>([]);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<RhFuncionarioStatus | ''>('');
  const [page, setPage] = useState(1);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<RhFuncionarioListItem | null>(null);
  const [form, setForm] = useState<FuncionarioFormInput>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [tab, setTab] = useState<'dados' | 'documentos'>('dados');

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [list, dep, car, jor] = await Promise.all([
        listFuncionarios({
          search: search || undefined,
          status: statusFilter || undefined,
          page,
          pageSize: 25,
        }),
        listDepartamentos({ pageSize: 200 }),
        listCargos({ pageSize: 200 }),
        listJornadas({ pageSize: 200 }),
      ]);
      setFuncionarios([...list.items]);
      setTotal(list.total);
      setDepartamentos([...dep.items]);
      setCargos([...car.items]);
      setJornadas([...jor.items]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar funcionários.');
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / 25)), [total]);

  const openCreate = (): void => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setTab('dados');
    setShowForm(true);
  };

  const openEdit = (f: RhFuncionarioListItem): void => {
    setEditing(f);
    setTab('dados');
    setForm({
      matricula: f.matricula,
      nome: f.nome,
      cpf: f.cpf,
      email: f.email,
      telefone: f.telefone,
      dataAdmissao: f.dataAdmissao,
      dataDemissao: f.dataDemissao,
      tipoContrato: f.tipoContrato,
      salarioBase: typeof f.salarioBase === 'string' ? Number(f.salarioBase) : f.salarioBase,
      departamentoId: f.departamento?.id ?? null,
      cargoId: f.cargo?.id ?? null,
      jornadaId: f.jornada?.id ?? null,
      status: f.status,
    });
    setShowForm(true);
  };

  const closeForm = (): void => {
    setShowForm(false);
    setEditing(null);
    setForm(EMPTY_FORM);
  };

  const submit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      if (editing) {
        await updateFuncionario(editing.id, form);
      } else {
        await createFuncionario(form);
      }
      closeForm();
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao salvar funcionário.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string): Promise<void> => {
    if (!window.confirm('Inativar este funcionário? (soft delete — pode ser reativado depois)')) return;
    try {
      await deleteFuncionario(id);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao inativar.');
    }
  };

  const handleDemitir = async (id: string): Promise<void> => {
    if (!window.confirm('Demitir este funcionário? Marca status=DEMITIDO e dataDemissao=hoje.')) return;
    try {
      await demitirFuncionario(id);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao demitir.');
    }
  };

  const handleReativar = async (id: string): Promise<void> => {
    try {
      await reativarFuncionario(id);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao reativar.');
    }
  };

  return (
    <RhPageShell
      title="Funcionários"
      subtitle="Gestão de funcionários por loja. CPF e matrícula únicos por loja."
      icon={<Users className="h-6 w-6" />}
      onRefresh={reload}
      loading={loading}
      error={error}
      actions={
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-violet-900/30 hover:from-violet-500 hover:to-fuchsia-500"
        >
          <Plus className="h-4 w-4" />
          Novo funcionário
        </button>
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="search"
            placeholder="Buscar por nome, matrícula, CPF, e-mail…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-xl border border-white/10 bg-slate-950/40 py-2 pl-10 pr-3 text-sm text-white placeholder:text-slate-500 focus:border-violet-500/50 focus:outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as RhFuncionarioStatus | '');
            setPage(1);
          }}
          className="rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2 text-sm text-white"
        >
          <option value="">Todos os status</option>
          <option value="ATIVO">Ativo</option>
          <option value="AFASTADO">Afastado</option>
          <option value="INATIVO">Inativo</option>
          <option value="DEMITIDO">Demitido</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/30">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/5 text-xs uppercase tracking-wide text-slate-300">
            <tr>
              <th className="px-4 py-3">Matrícula</th>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">CPF</th>
              <th className="px-4 py-3">Cargo / Departamento</th>
              <th className="px-4 py-3">Contrato</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">Carregando…</td></tr>
            ) : funcionarios.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">Nenhum funcionário encontrado.</td></tr>
            ) : (
              funcionarios.map((f) => (
                <tr key={f.id} className="border-t border-white/5 hover:bg-white/5">
                  <td className="px-4 py-3 font-mono text-xs text-slate-300">{f.matricula}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-white">{f.nome}</div>
                    <div className="text-xs text-slate-400">{f.email ?? '—'}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-300">{formatCpf(f.cpf)}</td>
                  <td className="px-4 py-3 text-slate-300">
                    <div>{f.cargo?.nome ?? '—'}</div>
                    <div className="text-xs text-slate-400">{f.departamento?.nome ?? '—'}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-300">{CONTRATO_LABEL[f.tipoContrato]}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-md border px-2 py-0.5 text-xs ${STATUS_BADGE[f.status]}`}>{f.status}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(f)}
                        className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-200 hover:bg-white/10"
                      >
                        Editar
                      </button>
                      {f.status === 'ATIVO' ? (
                        <button
                          type="button"
                          onClick={() => void handleDemitir(f.id)}
                          className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-xs text-amber-200 hover:bg-amber-500/20"
                        >
                          Demitir
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => void handleReativar(f.id)}
                          className="rounded-md border border-violet-500/30 bg-violet-500/10 px-2 py-1 text-xs text-violet-200 hover:bg-violet-500/20"
                        >
                          Reativar
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => void handleDelete(f.id)}
                        title="Inativar"
                        className="rounded-md border border-rose-500/30 bg-rose-500/10 px-2 py-1 text-xs text-rose-200 hover:bg-rose-500/20"
                      >
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

      {totalPages > 1 ? (
        <div className="flex items-center justify-between text-sm text-slate-400">
          <span>Total: {total}</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-md border border-white/10 bg-white/5 px-3 py-1 disabled:opacity-40"
            >
              Anterior
            </button>
            <span>Página {page} / {totalPages}</span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="rounded-md border border-white/10 bg-white/5 px-3 py-1 disabled:opacity-40"
            >
              Próxima
            </button>
          </div>
        </div>
      ) : null}

      {showForm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-3xl space-y-4 rounded-2xl border border-white/10 bg-slate-950 p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">
                {editing ? `Editar funcionário — ${editing.matricula}` : 'Novo funcionário'}
              </h2>
              <button type="button" onClick={closeForm} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            {editing ? (
              <div className="inline-flex rounded-xl border border-white/10 bg-white/5 p-1 text-xs">
                <button
                  type="button"
                  onClick={() => setTab('dados')}
                  className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 transition ${tab === 'dados' ? 'bg-violet-500/20 text-violet-100' : 'text-slate-300 hover:text-white'}`}
                >
                  <UserCog className="h-3.5 w-3.5" /> Dados do funcionário
                </button>
                <button
                  type="button"
                  onClick={() => setTab('documentos')}
                  className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 transition ${tab === 'documentos' ? 'bg-violet-500/20 text-violet-100' : 'text-slate-300 hover:text-white'}`}
                >
                  <FileText className="h-3.5 w-3.5" /> Documentos
                </button>
              </div>
            ) : null}

            {tab === 'dados' || !editing ? (
              <form onSubmit={(e) => void submit(e)} className="space-y-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="Matrícula *">
                    <input required value={form.matricula} onChange={(e) => setForm({ ...form, matricula: e.target.value })} className={inputCls} />
                  </Field>
                  <Field label="Nome *">
                    <input required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} className={inputCls} />
                  </Field>
                  <Field label="CPF (somente dígitos) *">
                    <input required maxLength={11} value={form.cpf} onChange={(e) => setForm({ ...form, cpf: e.target.value.replace(/\D/g, '') })} className={inputCls} />
                  </Field>
                  <Field label="E-mail">
                    <input type="email" value={form.email ?? ''} onChange={(e) => setForm({ ...form, email: e.target.value || null })} className={inputCls} />
                  </Field>
                  <Field label="Telefone">
                    <input value={form.telefone ?? ''} onChange={(e) => setForm({ ...form, telefone: e.target.value || null })} className={inputCls} />
                  </Field>
                  <Field label="Tipo de contrato *">
                    <select required value={form.tipoContrato} onChange={(e) => setForm({ ...form, tipoContrato: e.target.value as RhTipoContrato })} className={inputCls}>
                      {(Object.keys(CONTRATO_LABEL) as RhTipoContrato[]).map((k) => (
                        <option key={k} value={k}>{CONTRATO_LABEL[k]}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Data de admissão *">
                    <input required type="date" value={toIsoDateOnly(form.dataAdmissao)} onChange={(e) => setForm({ ...form, dataAdmissao: new Date(`${e.target.value}T00:00:00Z`).toISOString() })} className={inputCls} />
                  </Field>
                  <Field label="Salário base">
                    <input type="number" step="0.01" min={0} value={form.salarioBase ?? ''} onChange={(e) => setForm({ ...form, salarioBase: e.target.value === '' ? null : Number(e.target.value) })} className={inputCls} />
                  </Field>
                  <Field label="Departamento">
                    <select value={form.departamentoId ?? ''} onChange={(e) => setForm({ ...form, departamentoId: e.target.value || null })} className={inputCls}>
                      <option value="">—</option>
                      {departamentos.map((d) => <option key={d.id} value={d.id}>{d.nome}</option>)}
                    </select>
                  </Field>
                  <Field label="Cargo">
                    <select value={form.cargoId ?? ''} onChange={(e) => setForm({ ...form, cargoId: e.target.value || null })} className={inputCls}>
                      <option value="">—</option>
                      {cargos.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                    </select>
                  </Field>
                  <Field label="Jornada">
                    <select value={form.jornadaId ?? ''} onChange={(e) => setForm({ ...form, jornadaId: e.target.value || null })} className={inputCls}>
                      <option value="">—</option>
                      {jornadas.map((j) => <option key={j.id} value={j.id}>{j.nome}</option>)}
                    </select>
                  </Field>
                </div>
                <Field label="Observações">
                  <textarea rows={3} value={form.observacoes ?? ''} onChange={(e) => setForm({ ...form, observacoes: e.target.value || null })} className={inputCls} />
                </Field>
                {!editing ? (
                  <p className="rounded-lg border border-violet-500/30 bg-violet-500/5 px-3 py-2 text-xs text-violet-200">
                    Após criar o funcionário, a aba <strong>Documentos</strong> fica disponível para upload de PDF/imagem (RG, CPF, CTPS, contrato, ASO etc.).
                  </p>
                ) : null}
                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={closeForm} className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300 hover:bg-white/5">
                    Cancelar
                  </button>
                  <button type="submit" disabled={submitting} className="rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                    {submitting ? 'Salvando…' : editing ? 'Salvar' : 'Criar'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="max-h-[70vh] overflow-y-auto pr-1">
                {editing ? <RhFuncionarioDocumentos funcionarioId={editing.id} /> : null}
                <div className="mt-4 flex justify-end">
                  <button type="button" onClick={closeForm} className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300 hover:bg-white/5">
                    Fechar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </RhPageShell>
  );
}

const inputCls = 'w-full rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-violet-500/50 focus:outline-none';

function Field({ label, children }: { label: string; children: React.ReactNode }): JSX.Element {
  return (
    <label className="block text-xs uppercase tracking-wide text-slate-400">
      <span>{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
