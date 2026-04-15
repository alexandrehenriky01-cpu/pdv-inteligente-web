import { useCallback, useEffect, useState } from 'react';
import { Layout } from '../../../components/Layout';
import { api } from '../../../services/api';
import {
  Banknote,
  Loader2,
  Plus,
  Pencil,
  Trash2,
  X,
  Monitor,
  Save,
} from 'lucide-react';
import { AxiosError } from 'axios';

interface IAdquirente {
  id: string;
  nome: string;
  ativo: boolean;
}

interface IEstacaoDisponivel {
  id: string;
  nome: string;
  identificadorMaquina: string;
  nomeMaquina?: string | null;
  caixaId?: string | null;
}

interface ICaixa {
  id: string;
  nome: string;
  lojaId: string;
  serieNFCe: number;
  ultimoNumeroNFCe: number;
  ativo: boolean;
  adquirentePosDebitoId?: string | null;
  adquirentePosCreditoId?: string | null;
  adquirenteTefDebitoId?: string | null;
  adquirenteTefCreditoId?: string | null;
  estacaoTrabalho?: IEstacaoDisponivel | null;
  adquirentePosDebito?: IAdquirente | null;
  adquirentePosCredito?: IAdquirente | null;
  adquirenteTefDebito?: IAdquirente | null;
  adquirenteTefCredito?: IAdquirente | null;
}

interface ApiEnvelope<T> {
  sucesso?: boolean;
  dados?: T;
  erro?: string;
}

function extrairLista<T>(res: { data: T[] | ApiEnvelope<T[]> }): T[] {
  const d = res.data;
  if (Array.isArray(d)) return d;
  if (d && typeof d === 'object' && 'dados' in d && Array.isArray((d as ApiEnvelope<T[]>).dados)) {
    return (d as ApiEnvelope<T[]>).dados as T[];
  }
  return [];
}

function extrairErro(err: unknown): string {
  const ax = err as AxiosError<ApiEnvelope<unknown>>;
  const msg = ax.response?.data?.erro || ax.response?.data?.erro;
  if (typeof msg === 'string' && msg.length > 0) return msg;
  if (err instanceof Error) return err.message;
  return 'Erro ao processar a solicitação.';
}

const emptyForm = {
  nome: '',
  estacaoTrabalhoId: '',
  serieNFCe: 1,
  ultimoNumeroNFCe: 0,
  adquirentePosDebitoId: '',
  adquirentePosCreditoId: '',
  adquirenteTefDebitoId: '',
  adquirenteTefCreditoId: '',
  ativo: true,
};

export function CaixasConfigPage() {
  const [caixas, setCaixas] = useState<ICaixa[]>([]);
  const [adquirentes, setAdquirentes] = useState<IAdquirente[]>([]);
  const [estacoes, setEstacoes] = useState<IEstacaoDisponivel[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<ICaixa | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const carregarCaixas = useCallback(async () => {
    try {
      const res = await api.get<ICaixa[] | ApiEnvelope<ICaixa[]>>('/api/caixas');
      setCaixas(extrairLista<ICaixa>(res));
    } catch (error) {
      console.error('Erro ao carregar caixas:', error);
    }
  }, []);

  const carregarAdquirentes = useCallback(async () => {
    try {
      const res = await api.get<IAdquirente[] | ApiEnvelope<IAdquirente[]>>('/api/caixas/adquirentes');
      setAdquirentes(extrairLista<IAdquirente>(res));
    } catch (error) {
      console.error('Erro ao carregar adquirentes:', error);
    }
  }, []);

  const carregarEstacoes = useCallback(async (caixaIdExcluir?: string) => {
    try {
      const params = caixaIdExcluir ? { caixaId: caixaIdExcluir } : {};
      const res = await api.get<IEstacaoDisponivel[] | ApiEnvelope<IEstacaoDisponivel[]>>(
        '/api/caixas/estacoes-disponiveis',
        { params }
      );
      setEstacoes(extrairLista<IEstacaoDisponivel>(res));
    } catch (error) {
      console.error('Erro ao carregar estações:', error);
    }
  }, []);

  useEffect(() => {
    let ok = true;
    (async () => {
      setLoading(true);
      try {
        await Promise.all([carregarCaixas(), carregarAdquirentes()]);
      } catch (e) {
        if (ok) alert(extrairErro(e));
      } finally {
        if (ok) setLoading(false);
      }
    })();
    return () => {
      ok = false;
    };
  }, [carregarCaixas, carregarAdquirentes]);

  const abrirNovo = async () => {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
    try {
      await carregarEstacoes();
    } catch (e) {
      alert(extrairErro(e));
    }
  };

  const abrirEditar = async (c: ICaixa) => {
    setEditing(c);
    setForm({
      nome: c.nome,
      estacaoTrabalhoId: c.estacaoTrabalho?.id || '',
      serieNFCe: c.serieNFCe,
      ultimoNumeroNFCe: c.ultimoNumeroNFCe,
      adquirentePosDebitoId: c.adquirentePosDebitoId || '',
      adquirentePosCreditoId: c.adquirentePosCreditoId || '',
      adquirenteTefDebitoId: c.adquirenteTefDebitoId || '',
      adquirenteTefCreditoId: c.adquirenteTefCreditoId || '',
      ativo: c.ativo,
    });
    setModalOpen(true);
    try {
      await carregarEstacoes(c.id);
    } catch (e) {
      alert(extrairErro(e));
    }
  };

  const fecharModal = () => {
    setModalOpen(false);
    setEditing(null);
    setForm(emptyForm);
  };

  const salvar = async () => {
    if (!form.nome.trim()) {
      alert('Informe o nome do caixa.');
      return;
    }
    setSaving(true);
    const payload = {
      nome: form.nome.trim(),
      serieNFCe: Number(form.serieNFCe),
      ultimoNumeroNFCe: Number(form.ultimoNumeroNFCe),
      ativo: form.ativo,
      estacaoTrabalhoId: form.estacaoTrabalhoId.trim() || null,
      adquirentePosDebitoId: form.adquirentePosDebitoId.trim() || null,
      adquirentePosCreditoId: form.adquirentePosCreditoId.trim() || null,
      adquirenteTefDebitoId: form.adquirenteTefDebitoId.trim() || null,
      adquirenteTefCreditoId: form.adquirenteTefCreditoId.trim() || null,
    };
    try {
      if (editing) {
        await api.put(`/api/caixas/${editing.id}`, payload);
      } else {
        await api.post('/api/caixas', payload);
      }
      await carregarCaixas();
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
      await api.delete(`/api/caixas/${deleteId}`);
      setDeleteId(null);
      await carregarCaixas();
    } catch (e) {
      alert(extrairErro(e));
    } finally {
      setDeleting(false);
    }
  };

  const labelEstacao = (e: IEstacaoDisponivel) => {
    const extra = e.nomeMaquina || e.identificadorMaquina;
    return `${e.nome} (${extra})`;
  };

  return (
    <Layout>
      <div className="min-h-screen bg-[#08101f] p-6 font-sans text-white">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="flex flex-col justify-between gap-4 rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(139,92,246,0.15),_transparent_30%),linear-gradient(135deg,_#0b1020_0%,_#08101f_100%)] p-8 shadow-2xl md:flex-row md:items-center">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-violet-300">
                <Banknote size={14} /> PDV & Fiscal
              </div>
              <h1 className="text-3xl font-black tracking-tight text-white md:text-4xl">Caixas lógicos</h1>
              <p className="mt-2 max-w-xl text-sm text-slate-400">
                Vincule cada caixa a uma estação de trabalho, série NFC-e e adquirentes separados para POS (manual) e TEF
                (PinPad). O PDV usa o terminal da sessão para localizar o caixa da estação.
              </p>
            </div>
            <button
              type="button"
              onClick={abrirNovo}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-violet-900/40 transition hover:opacity-95"
            >
              <Plus className="h-5 w-5" />
              Novo caixa
            </button>
          </div>

          <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0b1324]/80 shadow-xl backdrop-blur">
            {loading ? (
              <div className="flex flex-col items-center justify-center gap-3 py-24 text-slate-400">
                <Loader2 className="h-10 w-10 animate-spin text-violet-400" />
                <span className="text-sm font-medium">Carregando caixas…</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/[0.03] text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <th className="px-5 py-4">Nome</th>
                      <th className="px-5 py-4">Estação vinculada</th>
                      <th className="px-5 py-4">Série NFC-e</th>
                      <th className="px-5 py-4">Status</th>
                      <th className="px-5 py-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {caixas.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-5 py-12 text-center text-slate-500">
                          Nenhum caixa cadastrado. Clique em &quot;Novo caixa&quot; para começar.
                        </td>
                      </tr>
                    ) : (
                      caixas.map((c) => (
                        <tr key={c.id} className="transition hover:bg-white/[0.04]">
                          <td className="px-5 py-4 font-semibold text-white">{c.nome}</td>
                          <td className="px-5 py-4 text-slate-300">
                            {c.estacaoTrabalho ? (
                              <span className="inline-flex items-center gap-2">
                                <Monitor className="h-4 w-4 text-violet-400" />
                                {labelEstacao(c.estacaoTrabalho)}
                              </span>
                            ) : (
                              <span className="text-slate-500">—</span>
                            )}
                          </td>
                          <td className="px-5 py-4 text-slate-300">
                            {c.serieNFCe}{' '}
                            <span className="text-slate-500">
                              (últ. {c.ultimoNumeroNFCe})
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
                                c.ativo
                                  ? 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30'
                                  : 'bg-slate-500/15 text-slate-400 ring-1 ring-slate-500/25'
                              }`}
                            >
                              {c.ativo ? 'Ativo' : 'Inativo'}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-right">
                            <button
                              type="button"
                              onClick={() => abrirEditar(c)}
                              className="mr-2 inline-flex rounded-lg border border-white/10 bg-white/5 p-2 text-slate-300 hover:bg-white/10 hover:text-white"
                              title="Editar"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteId(c.id)}
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
            <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-white/10 bg-[#0b1324] p-6 shadow-2xl">
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black text-white">
                    {editing ? 'Editar caixa' : 'Novo caixa'}
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    A estação vinculada é atualizada pelo vínculo em Estação de Trabalho (caixaId).
                  </p>
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
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400">
                    Nome do caixa
                  </label>
                  <input
                    type="text"
                    value={form.nome}
                    onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                    className="w-full rounded-xl border border-white/10 bg-[#08101f] px-4 py-2.5 text-sm text-white outline-none ring-violet-500/40 focus:ring-2"
                    placeholder="Ex.: Caixa 01 - Balcão"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400">
                    Estação de trabalho
                  </label>
                  <select
                    value={form.estacaoTrabalhoId}
                    onChange={(e) => setForm((f) => ({ ...f, estacaoTrabalhoId: e.target.value }))}
                    className="w-full rounded-xl border border-white/10 bg-[#08101f] px-4 py-2.5 text-sm text-white outline-none ring-violet-500/40 focus:ring-2"
                  >
                    <option value="">Nenhuma</option>
                    {estacoes.map((e) => (
                      <option key={e.id} value={e.id}>
                        {labelEstacao(e)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400">
                      Série NFC-e
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={form.serieNFCe}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, serieNFCe: parseInt(e.target.value, 10) || 1 }))
                      }
                      className="w-full rounded-xl border border-white/10 bg-[#08101f] px-4 py-2.5 text-sm text-white outline-none ring-violet-500/40 focus:ring-2"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400">
                      Último nº NFC-e
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={form.ultimoNumeroNFCe}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          ultimoNumeroNFCe: parseInt(e.target.value, 10) || 0,
                        }))
                      }
                      className="w-full rounded-xl border border-white/10 bg-[#08101f] px-4 py-2.5 text-sm text-white outline-none ring-violet-500/40 focus:ring-2"
                    />
                  </div>
                </div>

                <div className="space-y-3 rounded-xl border border-white/10 bg-white/[0.04] p-4">
                  <h3 className="text-sm font-bold text-violet-200">
                    💳 Maquininha POS (Manual/Contingência)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Usada quando o operador escolhe débito/crédito sem PinPad integrado.
                  </p>
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400">
                      Adquirente débito (POS)
                    </label>
                    <select
                      value={form.adquirentePosDebitoId}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, adquirentePosDebitoId: e.target.value }))
                      }
                      className="w-full rounded-xl border border-white/10 bg-[#08101f] px-4 py-2.5 text-sm text-white outline-none ring-violet-500/40 focus:ring-2"
                    >
                      <option value="">Nenhum</option>
                      {adquirentes.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400">
                      Adquirente crédito (POS)
                    </label>
                    <select
                      value={form.adquirentePosCreditoId}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, adquirentePosCreditoId: e.target.value }))
                      }
                      className="w-full rounded-xl border border-white/10 bg-[#08101f] px-4 py-2.5 text-sm text-white outline-none ring-violet-500/40 focus:ring-2"
                    >
                      <option value="">Nenhum</option>
                      {adquirentes.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-3 rounded-xl border border-violet-500/25 bg-violet-500/[0.06] p-4">
                  <h3 className="text-sm font-bold text-violet-200">
                    🔌 Maquininha TEF (Integrada)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Usada quando a venda é finalizada após autorização no PinPad (fluxo TEF).
                  </p>
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400">
                      Adquirente débito (TEF)
                    </label>
                    <select
                      value={form.adquirenteTefDebitoId}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, adquirenteTefDebitoId: e.target.value }))
                      }
                      className="w-full rounded-xl border border-white/10 bg-[#08101f] px-4 py-2.5 text-sm text-white outline-none ring-violet-500/40 focus:ring-2"
                    >
                      <option value="">Nenhum</option>
                      {adquirentes.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400">
                      Adquirente crédito (TEF)
                    </label>
                    <select
                      value={form.adquirenteTefCreditoId}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, adquirenteTefCreditoId: e.target.value }))
                      }
                      className="w-full rounded-xl border border-white/10 bg-[#08101f] px-4 py-2.5 text-sm text-white outline-none ring-violet-500/40 focus:ring-2"
                    >
                      <option value="">Nenhum</option>
                      {adquirentes.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                  <span className="text-sm font-semibold text-slate-300">Status ativo</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={form.ativo}
                    onClick={() => setForm((f) => ({ ...f, ativo: !f.ativo }))}
                    className={`relative h-7 w-12 rounded-full transition ${
                      form.ativo ? 'bg-emerald-600' : 'bg-slate-600'
                    }`}
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
              <h3 className="text-lg font-bold text-white">Excluir caixa?</h3>
              <p className="mt-2 text-sm text-slate-400">
                O vínculo com a estação de trabalho será removido. Esta ação não pode ser desfeita.
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

export default CaixasConfigPage;
