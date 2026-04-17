import { useCallback, useEffect, useState } from 'react';
import { Layout } from '../../../components/Layout';
import { api } from '../../../services/api';
import {
  CreditCard,
  Loader2,
  Plus,
  Pencil,
  Trash2,
  X,
  Save,
} from 'lucide-react';
import { AxiosError } from 'axios';

interface IContaResumo {
  id: string;
  codigoEstrutural: string;
  nomeConta: string;
}

interface IAdquirenteRow {
  id: string;
  lojaId: string;
  nome: string;
  taxaDebito: number;
  taxaCredito: number;
  diasRecebimento: number;
  contaContabilId: string | null;
  contaContabil: IContaResumo | null;
  chavePix: string | null;
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
}

interface IPlanoContaOption {
  id: string;
  codigoEstrutural: string;
  nomeConta: string;
  tipoConta: string;
  ativa: boolean;
}

interface ApiEnvelope<T> {
  sucesso?: boolean;
  dados?: T;
  erro?: string;
}

function extrairListaAdquirentes(res: { data: IAdquirenteRow[] | ApiEnvelope<IAdquirenteRow[]> }): IAdquirenteRow[] {
  const d = res.data;
  if (Array.isArray(d)) return d;
  if (d && typeof d === 'object' && 'dados' in d && Array.isArray((d as ApiEnvelope<IAdquirenteRow[]>).dados)) {
    return (d as ApiEnvelope<IAdquirenteRow[]>).dados as IAdquirenteRow[];
  }
  return [];
}

function extrairErro(err: unknown): string {
  const ax = err as AxiosError<ApiEnvelope<unknown> & { error?: string }>;
  const msg =
    ax.response?.data?.erro ||
    ax.response?.data?.error ||
    (typeof ax.response?.data === 'object' &&
    ax.response?.data !== null &&
    'erro' in ax.response.data &&
    typeof (ax.response.data as { erro: string }).erro === 'string'
      ? (ax.response.data as { erro: string }).erro
      : undefined);
  if (typeof msg === 'string' && msg.length > 0) return msg;
  if (err instanceof Error) return err.message;
  return 'Erro ao processar a solicitação.';
}

const emptyForm = {
  nome: '',
  taxaDebito: '0',
  taxaCredito: '0',
  diasRecebimento: '1',
  contaContabilId: '',
  chavePix: '',
  ativo: true,
};

function formatPercento(n: number): string {
  if (Number.isNaN(n)) return '—';
  return `${n.toFixed(2)}%`;
}

export function AdquirentesPage() {
  const [lista, setLista] = useState<IAdquirenteRow[]>([]);
  const [contas, setContas] = useState<IPlanoContaOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<IAdquirenteRow | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const carregarAdquirentes = useCallback(async () => {
    try {
      const res = await api.get<IAdquirenteRow[] | ApiEnvelope<IAdquirenteRow[]>>('/api/adquirentes');
      setLista(extrairListaAdquirentes(res));
    } catch (error) {
      console.error('Erro ao carregar adquirentes:', error);
      alert(extrairErro(error));
      setLista([]);
    }
  }, []);

  const carregarContas = useCallback(async () => {
    try {
      const res = await api.get<IPlanoContaOption[]>('/api/contabilidade/planos');
      const raw = res.data;
      const arr = Array.isArray(raw) ? raw : [];
      setContas(arr.filter((c) => c.ativa !== false && c.tipoConta === 'ANALITICA'));
    } catch {
      setContas([]);
    }
  }, []);

  useEffect(() => {
    let ok = true;
    (async () => {
      setLoading(true);
      try {
        await Promise.all([carregarAdquirentes(), carregarContas()]);
      } catch (e) {
        if (ok) alert(extrairErro(e));
      } finally {
        if (ok) setLoading(false);
      }
    })();
    return () => {
      ok = false;
    };
  }, [carregarAdquirentes, carregarContas]);

  const abrirNovo = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const abrirEditar = (row: IAdquirenteRow) => {
    setEditing(row);
    setForm({
      nome: row.nome,
      taxaDebito: String(row.taxaDebito),
      taxaCredito: String(row.taxaCredito),
      diasRecebimento: String(row.diasRecebimento),
      contaContabilId: row.contaContabilId || '',
      chavePix: (row.chavePix ?? '') || '',
      ativo: row.ativo,
    });
    setModalOpen(true);
  };

  const fecharModal = () => {
    setModalOpen(false);
    setEditing(null);
    setForm(emptyForm);
  };

  const salvar = async () => {
    if (!form.nome.trim()) {
      alert('Informe o nome do local de cobrança.');
      return;
    }
    const td = Number(form.taxaDebito.replace(',', '.'));
    const tc = Number(form.taxaCredito.replace(',', '.'));
    const dias = parseInt(form.diasRecebimento, 10);
    if (Number.isNaN(td) || td < 0) {
      alert('Taxa de débito inválida.');
      return;
    }
    if (Number.isNaN(tc) || tc < 0) {
      alert('Taxa de crédito inválida.');
      return;
    }
    if (!Number.isInteger(dias) || dias < 1 || dias > 365) {
      alert('Prazo de recebimento deve ser entre 1 e 365 dias.');
      return;
    }

    const payload = {
      nome: form.nome.trim(),
      taxaDebito: td,
      taxaCredito: tc,
      diasRecebimento: dias,
      contaContabilId: form.contaContabilId.trim() || null,
      chavePix: form.chavePix.trim() || null,
      ativo: form.ativo,
    };

    setSaving(true);
    try {
      if (editing) {
        await api.put(`/api/adquirentes/${editing.id}`, payload);
      } else {
        await api.post('/api/adquirentes', payload);
      }
      await carregarAdquirentes();
      fecharModal();
    } catch (e) {
      alert(extrairErro(e));
    } finally {
      setSaving(false);
    }
  };

  const excluir = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await api.delete(`/api/adquirentes/${deleteId}`);
      setDeleteId(null);
      await carregarAdquirentes();
    } catch (e) {
      alert(extrairErro(e));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-[#08101f] p-6 font-sans text-white">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="flex flex-col justify-between gap-4 rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(139,92,246,0.15),_transparent_30%),linear-gradient(135deg,_#0b1020_0%,_#08101f_100%)] p-8 shadow-2xl md:flex-row md:items-center">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-violet-300">
                <CreditCard size={14} /> PDV &amp; Financeiro
              </div>
              <h1 className="text-3xl font-black tracking-tight text-white md:text-4xl">Locais de cobrança</h1>
              <p className="mt-2 max-w-xl text-sm text-slate-400">
                Cadastre maquininhas e adquirentes (taxas e prazo de recebimento). Os registros ativos aparecem nos selects da
                configuração de Caixas PDV.
              </p>
            </div>
            <button
              type="button"
              onClick={abrirNovo}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-violet-900/40 transition hover:opacity-95"
            >
              <Plus className="h-5 w-5" />
              Novo local
            </button>
          </div>

          <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0b1324]/80 shadow-xl backdrop-blur">
            {loading ? (
              <div className="flex flex-col items-center justify-center gap-3 py-24 text-slate-400">
                <Loader2 className="h-10 w-10 animate-spin text-violet-400" />
                <span className="text-sm font-medium">Carregando adquirentes…</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/[0.03] text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <th className="px-5 py-4">Nome</th>
                      <th className="px-5 py-4">Taxa débito</th>
                      <th className="px-5 py-4">Taxa crédito</th>
                      <th className="px-5 py-4">Dias receb.</th>
                      <th className="px-5 py-4">Conta contábil</th>
                      <th className="px-5 py-4">Chave PIX</th>
                      <th className="px-5 py-4">Status</th>
                      <th className="px-5 py-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {lista.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-5 py-12 text-center text-slate-500">
                          Nenhum local cadastrado. Clique em &quot;Novo local&quot; para cadastrar Stone, Cielo, Mercado Pago,
                          etc.
                        </td>
                      </tr>
                    ) : (
                      lista.map((row) => (
                        <tr key={row.id} className="transition hover:bg-white/[0.04]">
                          <td className="px-5 py-4 font-semibold text-white">{row.nome}</td>
                          <td className="px-5 py-4 text-slate-300">{formatPercento(row.taxaDebito)}</td>
                          <td className="px-5 py-4 text-slate-300">{formatPercento(row.taxaCredito)}</td>
                          <td className="px-5 py-4 text-slate-300">{row.diasRecebimento}</td>
                          <td className="max-w-[200px] truncate px-5 py-4 text-xs text-slate-400">
                            {row.contaContabil
                              ? `${row.contaContabil.codigoEstrutural} — ${row.contaContabil.nomeConta}`
                              : '—'}
                          </td>
                          <td className="px-5 py-4 text-xs text-slate-400">
                            {row.chavePix ? (
                              <span className="font-mono text-emerald-400">••••••{row.chavePix.slice(-4)}</span>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
                                row.ativo
                                  ? 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30'
                                  : 'bg-slate-500/15 text-slate-400 ring-1 ring-slate-500/25'
                              }`}
                            >
                              {row.ativo ? 'Ativo' : 'Inativo'}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-right">
                            <button
                              type="button"
                              onClick={() => abrirEditar(row)}
                              className="mr-2 inline-flex rounded-lg border border-white/10 bg-white/5 p-2 text-slate-300 hover:bg-white/10 hover:text-white"
                              title="Editar"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteId(row.id)}
                              className="inline-flex rounded-lg border border-red-500/20 bg-red-500/10 p-2 text-red-300 hover:bg-red-500/20"
                              title="Excluir"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
            <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/10 bg-[#0b1324] p-6 shadow-2xl">
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black text-white">
                    {editing ? 'Editar local de cobrança' : 'Novo local de cobrança'}
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">Maquininha / adquirente vinculado à sua loja.</p>
                </div>
                <button
                  type="button"
                  onClick={fecharModal}
                  className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400">Nome</label>
                  <input
                    type="text"
                    value={form.nome}
                    onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                    className="w-full rounded-xl border border-white/10 bg-[#08101f] px-4 py-2.5 text-sm text-white outline-none ring-violet-500/40 focus:ring-2"
                    placeholder="Ex.: Stone, Cielo, Mercado Pago"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400">
                      Taxa débito (%)
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={form.taxaDebito}
                      onChange={(e) => setForm((f) => ({ ...f, taxaDebito: e.target.value }))}
                      className="w-full rounded-xl border border-white/10 bg-[#08101f] px-4 py-2.5 text-sm text-white outline-none ring-violet-500/40 focus:ring-2"
                      placeholder="0,00"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400">
                      Taxa crédito (%)
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={form.taxaCredito}
                      onChange={(e) => setForm((f) => ({ ...f, taxaCredito: e.target.value }))}
                      className="w-full rounded-xl border border-white/10 bg-[#08101f] px-4 py-2.5 text-sm text-white outline-none ring-violet-500/40 focus:ring-2"
                      placeholder="0,00"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400">
                    Prazo de recebimento (dias)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={form.diasRecebimento}
                    onChange={(e) => setForm((f) => ({ ...f, diasRecebimento: e.target.value }))}
                    className="w-full rounded-xl border border-white/10 bg-[#08101f] px-4 py-2.5 text-sm text-white outline-none ring-violet-500/40 focus:ring-2"
                    placeholder="1, 14, 30…"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400">
                    Conta contábil (opcional)
                  </label>
                  <select
                    value={form.contaContabilId}
                    onChange={(e) => setForm((f) => ({ ...f, contaContabilId: e.target.value }))}
                    className="w-full rounded-xl border border-white/10 bg-[#08101f] px-4 py-2.5 text-sm text-white outline-none ring-violet-500/40 focus:ring-2"
                  >
                    <option value="">Nenhuma</option>
                    {contas.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.codigoEstrutural} — {c.nomeConta}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400">
                    Chave PIX (Para QR Code)
                  </label>
                  <input
                    type="text"
                    value={form.chavePix || ''}
                    onChange={(e) => setForm((f) => ({ ...f, chavePix: e.target.value }))}
                    className="w-full rounded-xl border border-white/10 bg-[#0b1324] px-4 py-2.5 text-sm text-white outline-none ring-violet-500/40 focus:ring-2"
                    placeholder="CPF, CNPJ, e-mail, telefone ou chave aleatória"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Esta chave será usada para gerar o QR Code dinâmico no Checkout do cliente.
                  </p>
                </div>

                <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                  <span className="text-sm font-semibold text-slate-300">Ativo</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={form.ativo}
                    onClick={() => setForm((f) => ({ ...f, ativo: !f.ativo }))}
                    className={`relative h-7 w-12 rounded-full transition ${form.ativo ? 'bg-emerald-600' : 'bg-slate-600'}`}
                  >
                    <span
                      className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition ${
                        form.ativo ? 'left-6' : 'left-0.5'
                      }`}
                    />
                  </button>
                </div>
              </div>

              <div className="mt-8 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={fecharModal}
                  className="rounded-xl border border-white/10 px-5 py-2.5 text-sm font-bold text-slate-300 hover:bg-white/5"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={salvar}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Salvar
                </button>
              </div>
            </div>
          </div>
        )}

        {deleteId && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 p-4">
            <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0b1324] p-6 shadow-2xl">
              <h3 className="text-lg font-bold text-white">Excluir local de cobrança?</h3>
              <p className="mt-2 text-sm text-slate-400">
                Os vínculos com caixas PDV serão removidos automaticamente. Esta ação não pode ser desfeita.
              </p>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setDeleteId(null)}
                  className="rounded-xl border border-white/10 px-4 py-2 text-sm font-bold text-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={excluir}
                  disabled={deleting}
                  className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                >
                  {deleting ? 'Excluindo…' : 'Excluir'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

export default AdquirentesPage;
