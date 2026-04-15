import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Layout } from '../../components/Layout';
import { api } from '../../services/api';
import { AxiosError } from 'axios';
import { transformarParaMaiusculas } from '../../utils/formatters';
import {
  Layers,
  Plus,
  Trash2,
  Edit2,
  Loader2,
  Package,
  Save,
  X,
  AlertCircle,
} from 'lucide-react';

interface IProdutoOpcao {
  id: string;
  codigo: string;
  nome: string;
  tipoItem?: string | null;
  unidadeMedida: string;
}

interface IEmbalagemItemApi {
  id: string;
  produtoInsumoId: string;
  quantidade: string;
  unidadeMedida: string;
  tara: string;
  custo: string;
  produtoInsumo?: {
    id: string;
    codigo: string;
    nome: string;
    tipoItem?: string | null;
    unidadeMedida?: string;
  };
}

interface IEmbalagemApi {
  id: string;
  codigo: string;
  nome: string;
  ativo: boolean;
  taraTotal: string;
  custoTotal: string;
  itens: IEmbalagemItemApi[];
}

interface LinhaInsumo {
  key: string;
  produtoInsumoId: string;
  quantidade: string;
  unidadeMedida: string;
  tara: string;
  custo: string;
}

function novaLinhaInsumo(): LinhaInsumo {
  return {
    key: `k-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    produtoInsumoId: '',
    quantidade: '1',
    unidadeMedida: 'UN',
    tara: '0',
    custo: '0',
  };
}

function totaisCalculados(linhas: LinhaInsumo[]): { tara: number; custo: number } {
  let tara = 0;
  let custo = 0;
  for (const L of linhas) {
    const q = parseFloat(String(L.quantidade).replace(',', '.')) || 0;
    const tu = parseFloat(String(L.tara).replace(',', '.')) || 0;
    const cu = parseFloat(String(L.custo).replace(',', '.')) || 0;
    tara += q * tu;
    custo += q * cu;
  }
  return { tara, custo };
}

const inputClass =
  'w-full rounded-xl border border-violet-500/25 bg-[#0d182d] px-3 py-2.5 text-sm text-white placeholder:text-slate-600 outline-none focus:border-violet-400/50 focus:ring-2 focus:ring-violet-500/15';
const labelClass = 'mb-1.5 block text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400';

export function Embalagens() {
  const [lista, setLista] = useState<IEmbalagemApi[]>([]);
  const [produtos, setProdutos] = useState<IProdutoOpcao[]>([]);
  const [loadingLista, setLoadingLista] = useState(true);
  const [loadingProdutos, setLoadingProdutos] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const [mostrarTodosProdutos, setMostrarTodosProdutos] = useState(false);

  const [editId, setEditId] = useState<string | null>(null);
  const [codigo, setCodigo] = useState('');
  const [nome, setNome] = useState('');
  const [ativo, setAtivo] = useState(true);
  const [linhas, setLinhas] = useState<LinhaInsumo[]>([novaLinhaInsumo()]);
  const [taraManual, setTaraManual] = useState('0');
  const [custoManual, setCustoManual] = useState('0');

  const linhasComInsumo = useMemo(
    () => linhas.filter((l) => l.produtoInsumoId.trim() !== ''),
    [linhas]
  );
  const temInsumos = linhasComInsumo.length > 0;
  const totais = useMemo(() => totaisCalculados(linhasComInsumo), [linhasComInsumo]);

  const produtosSelect = useMemo(() => {
    if (mostrarTodosProdutos) return produtos;
    const emb = produtos.filter((p) => p.tipoItem === '02');
    return emb.length > 0 ? emb : produtos;
  }, [produtos, mostrarTodosProdutos]);

  const carregar = useCallback(async () => {
    setLoadingLista(true);
    try {
      const res = await api.get<IEmbalagemApi[]>('/api/embalagens');
      setLista(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error(e);
      setLista([]);
    } finally {
      setLoadingLista(false);
    }
  }, []);

  const carregarProdutos = useCallback(async () => {
    setLoadingProdutos(true);
    try {
      const res = await api.get<IProdutoOpcao[]>('/api/cadastros/produtos');
      setProdutos(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error(e);
      setProdutos([]);
    } finally {
      setLoadingProdutos(false);
    }
  }, []);

  useEffect(() => {
    void carregar();
    void carregarProdutos();
  }, [carregar, carregarProdutos]);

  const limparForm = () => {
    setEditId(null);
    setCodigo('');
    setNome('');
    setAtivo(true);
    setLinhas([novaLinhaInsumo()]);
    setTaraManual('0');
    setCustoManual('0');
  };

  const abrirNova = () => {
    limparForm();
  };

  const abrirEditar = (e: IEmbalagemApi) => {
    setEditId(e.id);
    setCodigo(e.codigo);
    setNome(e.nome);
    setAtivo(e.ativo);
    if (e.itens && e.itens.length > 0) {
      setLinhas(
        e.itens.map((it) => ({
          key: `k-${it.id}`,
          produtoInsumoId: it.produtoInsumoId,
          quantidade: String(it.quantidade),
          unidadeMedida: it.unidadeMedida || 'UN',
          tara: String(it.tara),
          custo: String(it.custo),
        }))
      );
      setTaraManual('0');
      setCustoManual('0');
    } else {
      setLinhas([novaLinhaInsumo()]);
      setTaraManual(String(e.taraTotal ?? '0'));
      setCustoManual(String(e.custoTotal ?? '0'));
    }
  };

  const adicionarLinha = () => {
    setLinhas((prev) => [...prev, novaLinhaInsumo()]);
  };

  const removerLinha = (key: string) => {
    setLinhas((prev) => (prev.length <= 1 ? prev : prev.filter((l) => l.key !== key)));
  };

  const atualizarLinha = (key: string, patch: Partial<LinhaInsumo>) => {
    setLinhas((prev) =>
      prev.map((l) => {
        if (l.key !== key) return l;
        const next = { ...l, ...patch };
        if (patch.produtoInsumoId !== undefined && patch.produtoInsumoId !== l.produtoInsumoId) {
          const p = produtos.find((x) => x.id === patch.produtoInsumoId);
          if (p?.unidadeMedida) {
            next.unidadeMedida = p.unidadeMedida;
          }
        }
        return next;
      })
    );
  };

  const handleSalvar = async (e: FormEvent) => {
    e.preventDefault();
    if (!codigo.trim() || !nome.trim()) {
      alert('Código e nome são obrigatórios.');
      return;
    }
    const itensPayload = linhas
      .filter((l) => l.produtoInsumoId.trim() !== '')
      .map((l) => ({
        produtoInsumoId: l.produtoInsumoId.trim(),
        quantidade: parseFloat(String(l.quantidade).replace(',', '.')) || 0,
        unidadeMedida: (l.unidadeMedida || 'UN').trim().toUpperCase(),
        tara: parseFloat(String(l.tara).replace(',', '.')) || 0,
        custo: parseFloat(String(l.custo).replace(',', '.')) || 0,
      }));

    const taraTotalEnvio = temInsumos
      ? totais.tara
      : parseFloat(String(taraManual).replace(',', '.')) || 0;
    const custoTotalEnvio = temInsumos
      ? totais.custo
      : parseFloat(String(custoManual).replace(',', '.')) || 0;

    setSalvando(true);
    try {
      const raw = {
        codigo: codigo.trim(),
        nome: nome.trim(),
        ativo,
        itens: itensPayload,
        taraTotal: taraTotalEnvio,
        custoTotal: custoTotalEnvio,
      };
      const payload = transformarParaMaiusculas(raw) as typeof raw;
      if (editId) {
        await api.put(`/api/embalagens/${editId}`, payload);
      } else {
        await api.post('/api/embalagens', payload);
      }
      limparForm();
      await carregar();
    } catch (err) {
      const er = err as AxiosError<{ error?: string }>;
      alert(er.response?.data?.error || 'Erro ao salvar embalagem.');
    } finally {
      setSalvando(false);
    }
  };

  const handleExcluir = async (id: string) => {
    if (!window.confirm('Excluir esta ficha de embalagem?')) return;
    try {
      await api.delete(`/api/embalagens/${id}`);
      if (editId === id) limparForm();
      await carregar();
    } catch (err) {
      const er = err as AxiosError<{ error?: string }>;
      alert(er.response?.data?.error || 'Erro ao excluir.');
    }
  };

  return (
    <Layout>
      <div className="mx-auto max-w-7xl space-y-6 pb-12">
        <div className="relative overflow-hidden rounded-[30px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(139,92,246,0.16),_transparent_26%),linear-gradient(135deg,_#0b1020_0%,_#08101f_45%,_#0a1224_100%)] p-6 shadow-[0_25px_70px_rgba(0,0,0,0.40)] sm:p-8">
          <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-amber-200">
                <Layers className="h-3.5 w-3.5" />
                BOM / Ficha técnica
              </div>
              <h1 className="flex items-center gap-3 text-2xl font-black tracking-tight text-white sm:text-3xl">
                <span className="rounded-2xl border border-amber-400/25 bg-amber-500/10 p-2.5">
                  <Package className="h-7 w-7 text-amber-300" />
                </span>
                Embalagens (embalagem final)
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-400">
                Com insumos na ficha, tara e custo totais são calculados automaticamente (quantidade × unitário). Sem
                insumos, informe tara e custo totais manualmente no cabeçalho.
              </p>
            </div>
            <button
              type="button"
              onClick={abrirNova}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-violet-400/30 bg-violet-600/80 px-5 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-violet-500"
            >
              <Plus className="h-4 w-4" />
              Nova embalagem
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          <div className="xl:col-span-5">
            <div className="rounded-[24px] border border-white/10 bg-[#0b1324]/90 p-5 shadow-[0_20px_50px_rgba(0,0,0,0.35)]">
              <h2 className="mb-4 text-xs font-black uppercase tracking-[0.2em] text-slate-400">Cadastradas</h2>
              {loadingLista ? (
                <div className="flex items-center justify-center py-16 text-slate-500">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : lista.length === 0 ? (
                <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-white/10 py-12 text-center text-slate-500">
                  <AlertCircle className="h-8 w-8 opacity-50" />
                  <p>Nenhuma embalagem cadastrada.</p>
                </div>
              ) : (
                <ul className="max-h-[520px] space-y-2 overflow-y-auto pr-1 custom-scrollbar">
                  {lista.map((item) => (
                    <li
                      key={item.id}
                      className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 transition ${
                        editId === item.id
                          ? 'border-amber-400/40 bg-amber-500/10'
                          : 'border-white/10 bg-[#0d182d]/80 hover:border-white/15'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-white">
                          {item.codigo} — {item.nome}
                        </p>
                        <p className="text-xs text-slate-500">
                          Tara: {item.taraTotal} · Custo: {item.custoTotal}
                          {!item.ativo ? (
                            <span className="ml-2 rounded-md border border-red-400/30 bg-red-500/10 px-1.5 py-0.5 text-red-300">
                              Inativa
                            </span>
                          ) : null}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <button
                          type="button"
                          title="Editar"
                          onClick={() => abrirEditar(item)}
                          className="rounded-xl border border-white/10 p-2 text-slate-300 hover:bg-white/5 hover:text-white"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          title="Excluir"
                          onClick={() => void handleExcluir(item.id)}
                          className="rounded-xl border border-red-400/20 p-2 text-red-400 hover:bg-red-500/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="xl:col-span-7">
            <form
              onSubmit={(ev) => void handleSalvar(ev)}
              className="space-y-5 rounded-[24px] border border-white/10 bg-[#0b1324]/90 p-6 shadow-[0_20px_50px_rgba(0,0,0,0.35)]"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-sm font-black uppercase tracking-[0.18em] text-white">
                  {editId ? 'Editar ficha' : 'Nova ficha'}
                </h2>
                {editId ? (
                  <button
                    type="button"
                    onClick={limparForm}
                    className="inline-flex items-center gap-1 rounded-xl border border-white/15 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-white/5"
                  >
                    <X className="h-3.5 w-3.5" />
                    Cancelar edição
                  </button>
                ) : null}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Código</label>
                  <input className={inputClass} value={codigo} onChange={(e) => setCodigo(e.target.value.toUpperCase())} required />
                </div>
                <div>
                  <label className={labelClass}>Nome</label>
                  <input className={inputClass} value={nome} onChange={(e) => setNome(e.target.value)} required />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={ativo}
                    onChange={(e) => setAtivo(e.target.checked)}
                    className="h-4 w-4 rounded border-violet-500/40 bg-[#0d182d] text-violet-500"
                  />
                  Ativa
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={mostrarTodosProdutos}
                    onChange={(e) => setMostrarTodosProdutos(e.target.checked)}
                    className="h-4 w-4 rounded border-violet-500/40 bg-[#0d182d] text-violet-500"
                  />
                  Mostrar todos os produtos no insumo
                </label>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>
                    Tara total {temInsumos ? '(calculada pelos insumos)' : '(manual — sem insumos)'}
                  </label>
                  <input
                    type="number"
                    step="any"
                    min={0}
                    className={`${inputClass} ${temInsumos ? 'cursor-not-allowed opacity-80' : ''}`}
                    disabled={temInsumos}
                    readOnly={temInsumos}
                    value={temInsumos ? totais.tara.toFixed(6) : taraManual}
                    onChange={temInsumos ? undefined : (e) => setTaraManual(e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelClass}>
                    Custo total {temInsumos ? '(calculado pelos insumos)' : '(manual — sem insumos)'}
                  </label>
                  <input
                    type="number"
                    step="any"
                    min={0}
                    className={`${inputClass} ${temInsumos ? 'cursor-not-allowed opacity-80' : ''}`}
                    disabled={temInsumos}
                    readOnly={temInsumos}
                    value={temInsumos ? totais.custo.toFixed(4) : custoManual}
                    onChange={temInsumos ? undefined : (e) => setCustoManual(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h3 className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Insumos</h3>
                  <button
                    type="button"
                    onClick={adicionarLinha}
                    className="inline-flex items-center gap-1 rounded-xl border border-emerald-400/30 bg-emerald-500/15 px-3 py-1.5 text-xs font-bold text-emerald-200 hover:bg-emerald-500/25"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Linha
                  </button>
                </div>

                {loadingProdutos ? (
                  <p className="text-sm text-slate-500">Carregando produtos…</p>
                ) : (
                  <div className="overflow-x-auto rounded-2xl border border-white/10">
                    <table className="w-full min-w-[640px] text-left text-sm">
                      <thead>
                        <tr className="border-b border-white/10 bg-[#0d182d]/80 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          <th className="px-3 py-2">Insumo</th>
                          <th className="px-3 py-2 w-24">Qtd</th>
                          <th className="px-3 py-2 w-24">UN</th>
                          <th className="px-3 py-2 w-28">Tara u.</th>
                          <th className="px-3 py-2 w-28">Custo u.</th>
                          <th className="px-2 py-2 w-10" />
                        </tr>
                      </thead>
                      <tbody>
                        {linhas.map((L) => (
                          <tr key={L.key} className="border-b border-white/5">
                            <td className="px-3 py-2">
                              <select
                                className={inputClass}
                                value={L.produtoInsumoId ?? ''}
                                onChange={(e) => atualizarLinha(L.key, { produtoInsumoId: e.target.value })}
                              >
                                <option value="">— Selecione —</option>
                                {produtosSelect.map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {p.codigo} — {p.nome}
                                    {p.tipoItem ? ` (${p.tipoItem})` : ''}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="px-3 py-2">
                              <input
                                className={inputClass}
                                value={L.quantidade}
                                onChange={(e) => atualizarLinha(L.key, { quantidade: e.target.value })}
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                className={inputClass}
                                value={L.unidadeMedida}
                                onChange={(e) => atualizarLinha(L.key, { unidadeMedida: e.target.value.toUpperCase() })}
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                className={inputClass}
                                value={L.tara}
                                onChange={(e) => atualizarLinha(L.key, { tara: e.target.value })}
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                className={inputClass}
                                value={L.custo}
                                onChange={(e) => atualizarLinha(L.key, { custo: e.target.value })}
                              />
                            </td>
                            <td className="px-2 py-2">
                              <button
                                type="button"
                                onClick={() => removerLinha(L.key)}
                                className="rounded-lg p-2 text-slate-500 hover:bg-red-500/10 hover:text-red-400"
                                title="Remover linha"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={salvando}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-violet-400/40 bg-gradient-to-r from-violet-600 to-fuchsia-600 py-3.5 text-sm font-bold text-white shadow-lg transition hover:opacity-95 disabled:opacity-50 sm:w-auto sm:px-10"
              >
                {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Salvar ficha
              </button>
            </form>
          </div>
        </div>
      </div>
    </Layout>
  );
}
