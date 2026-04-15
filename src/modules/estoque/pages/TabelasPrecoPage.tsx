import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { api } from '../../../services/api';
import { Layout } from '../../../components/Layout';
import {
  ListOrdered,
  Plus,
  Loader2,
  Pencil,
  Trash2,
  X,
  Download,
  Search,
  Check,
} from 'lucide-react';
import { AxiosError } from 'axios';
import { toast } from 'react-toastify';

type TipoTabelaPreco = 'PRINCIPAL' | 'PROMOCAO' | 'ATACADO' | 'REVENDA';

interface TabelaPrecoRow {
  id: string;
  nome: string;
  tipo: TipoTabelaPreco;
  dataInicio: string | null;
  dataFim: string | null;
  ativa: boolean;
  padrao: boolean;
  _count: { itens: number };
}

interface ProdutoResumo {
  id: string;
  codigo: string;
  nome: string;
  precoCusto: unknown;
  unidadeMedida: string;
}

interface TabelaPrecoItemRow {
  id: string;
  produtoId: string;
  precoVenda: unknown;
  quantidadeMinima: number | null;
  produto: ProdutoResumo;
}

interface ProdutoBusca {
  id: string;
  nome: string;
  codigo: string;
  codigoBarras: string | null;
}

function fmtData(iso: string | null): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('pt-BR');
  } catch {
    return iso;
  }
}

function fmtMoney(v: unknown): string {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? '0'));
  if (Number.isNaN(n)) return '0,00';
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const TIPOS: { value: TipoTabelaPreco; label: string }[] = [
  { value: 'PRINCIPAL', label: 'Principal' },
  { value: 'PROMOCAO', label: 'Promoção' },
  { value: 'ATACADO', label: 'Atacado' },
  { value: 'REVENDA', label: 'Revenda' },
];

export function TabelasPrecoPage() {
  const [tabelas, setTabelas] = useState<TabelaPrecoRow[]>([]);
  const [carregandoLista, setCarregandoLista] = useState(true);
  const [selecionada, setSelecionada] = useState<TabelaPrecoRow | null>(null);
  const [itens, setItens] = useState<TabelaPrecoItemRow[]>([]);
  const [carregandoItens, setCarregandoItens] = useState(false);

  const [modalNova, setModalNova] = useState(false);
  const [formNova, setFormNova] = useState({
    nome: '',
    tipo: 'PRINCIPAL' as TipoTabelaPreco,
    padrao: false,
    ativa: true,
  });
  const [salvandoNova, setSalvandoNova] = useState(false);

  const [editandoTabela, setEditandoTabela] = useState(false);
  const [formEdit, setFormEdit] = useState({
    nome: '',
    tipo: 'PRINCIPAL' as TipoTabelaPreco,
    padrao: false,
    ativa: true,
    dataInicio: '',
    dataFim: '',
  });
  const [salvandoEdit, setSalvandoEdit] = useState(false);

  const [buscaProduto, setBuscaProduto] = useState('');
  const [resultadosProduto, setResultadosProduto] = useState<ProdutoBusca[]>([]);
  const [produtoAddId, setProdutoAddId] = useState('');
  const [precoAdd, setPrecoAdd] = useState('');
  const [qtdMinAdd, setQtdMinAdd] = useState('');
  const [importando, setImportando] = useState(false);

  const carregarTabelas = useCallback(async () => {
    setCarregandoLista(true);
    try {
      const { data } = await api.get<{ sucesso: boolean; dados?: TabelaPrecoRow[]; erro?: string }>(
        '/api/tabelas-preco'
      );
      if (!data.sucesso || !data.dados) {
        throw new Error(data.erro || 'Falha ao listar tabelas.');
      }
      setTabelas(data.dados);
    } catch (e) {
      const ax = e as AxiosError<{ erro?: string }>;
      toast.error(ax.response?.data?.erro || (e instanceof Error ? e.message : 'Erro ao listar.'));
    } finally {
      setCarregandoLista(false);
    }
  }, []);

  const carregarItens = useCallback(async (tabelaId: string) => {
    setCarregandoItens(true);
    try {
      const { data } = await api.get<{ sucesso: boolean; dados?: TabelaPrecoItemRow[]; erro?: string }>(
        `/api/tabelas-preco/${tabelaId}/itens`
      );
      if (!data.sucesso || !data.dados) {
        throw new Error(data.erro || 'Falha ao listar itens.');
      }
      setItens(data.dados);
    } catch (e) {
      const ax = e as AxiosError<{ erro?: string }>;
      toast.error(ax.response?.data?.erro || (e instanceof Error ? e.message : 'Erro ao listar itens.'));
    } finally {
      setCarregandoItens(false);
    }
  }, []);

  useEffect(() => {
    void carregarTabelas();
  }, [carregarTabelas]);

  useEffect(() => {
    if (selecionada) {
      void carregarItens(selecionada.id);
      setFormEdit({
        nome: selecionada.nome,
        tipo: selecionada.tipo,
        padrao: selecionada.padrao,
        ativa: selecionada.ativa,
        dataInicio: selecionada.dataInicio ? selecionada.dataInicio.slice(0, 10) : '',
        dataFim: selecionada.dataFim ? selecionada.dataFim.slice(0, 10) : '',
      });
      setEditandoTabela(false);
    } else {
      setItens([]);
    }
  }, [selecionada, carregarItens]);

  useEffect(() => {
    if (buscaProduto.trim().length < 2) {
      setResultadosProduto([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const { data } = await api.get<ProdutoBusca[]>(
          `/api/cadastros/produtos?busca=${encodeURIComponent(buscaProduto.trim())}`
        );
        setResultadosProduto(Array.isArray(data) ? data : []);
      } catch {
        setResultadosProduto([]);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [buscaProduto]);

  const criarTabela = async (e: FormEvent) => {
    e.preventDefault();
    if (!formNova.nome.trim()) {
      toast.warn('Informe o nome da tabela.');
      return;
    }
    setSalvandoNova(true);
    try {
      const { data } = await api.post<{ sucesso: boolean; dados?: TabelaPrecoRow; erro?: string }>(
        '/api/tabelas-preco',
        {
          nome: formNova.nome.trim(),
          tipo: formNova.tipo,
          padrao: formNova.padrao,
          ativa: formNova.ativa,
        }
      );
      if (!data.sucesso || !data.dados) {
        throw new Error(data.erro || 'Falha ao criar.');
      }
      toast.success('Tabela criada.');
      setModalNova(false);
      setFormNova({ nome: '', tipo: 'PRINCIPAL', padrao: false, ativa: true });
      await carregarTabelas();
      setSelecionada(data.dados);
    } catch (e) {
      const ax = e as AxiosError<{ erro?: string }>;
      toast.error(ax.response?.data?.erro || (e instanceof Error ? e.message : 'Erro ao criar.'));
    } finally {
      setSalvandoNova(false);
    }
  };

  const salvarEdicaoTabela = async (e: FormEvent) => {
    e.preventDefault();
    if (!selecionada) return;
    if (!formEdit.nome.trim()) {
      toast.warn('Nome obrigatório.');
      return;
    }
    setSalvandoEdit(true);
    try {
      const payload: Record<string, unknown> = {
        nome: formEdit.nome.trim(),
        tipo: formEdit.tipo,
        padrao: formEdit.padrao,
        ativa: formEdit.ativa,
      };
      if (formEdit.dataInicio.trim()) {
        payload.dataInicio = `${formEdit.dataInicio}T00:00:00.000Z`;
      } else {
        payload.dataInicio = null;
      }
      if (formEdit.dataFim.trim()) {
        payload.dataFim = `${formEdit.dataFim}T23:59:59.999Z`;
      } else {
        payload.dataFim = null;
      }

      const { data } = await api.put<{ sucesso: boolean; dados?: TabelaPrecoRow; erro?: string }>(
        `/api/tabelas-preco/${selecionada.id}`,
        payload
      );
      if (!data.sucesso) {
        throw new Error(data.erro || 'Falha ao salvar.');
      }
      toast.success('Tabela atualizada.');
      setEditandoTabela(false);
      await carregarTabelas();
      const ref = await api.get<{ sucesso: boolean; dados?: TabelaPrecoRow; erro?: string }>(
        `/api/tabelas-preco/${selecionada.id}`
      );
      if (ref.data.sucesso && ref.data.dados) {
        setSelecionada(ref.data.dados);
      }
    } catch (e) {
      const ax = e as AxiosError<{ erro?: string }>;
      toast.error(ax.response?.data?.erro || (e instanceof Error ? e.message : 'Erro ao salvar.'));
    } finally {
      setSalvandoEdit(false);
    }
  };

  const excluirTabela = async () => {
    if (!selecionada) return;
    if (!window.confirm(`Remover a tabela "${selecionada.nome}" e todos os itens?`)) return;
    try {
      const { data } = await api.delete<{ sucesso: boolean; erro?: string }>(
        `/api/tabelas-preco/${selecionada.id}`
      );
      if (!data.sucesso) {
        throw new Error(data.erro || 'Falha ao excluir.');
      }
      toast.success('Tabela removida.');
      setSelecionada(null);
      await carregarTabelas();
    } catch (e) {
      const ax = e as AxiosError<{ erro?: string }>;
      toast.error(ax.response?.data?.erro || (e instanceof Error ? e.message : 'Erro ao excluir.'));
    }
  };

  const importarTodos = async () => {
    if (!selecionada) return;
    setImportando(true);
    try {
      const { data } = await api.post<{
        sucesso: boolean;
        dados?: { criados: number; jaExistentes: number; totalProdutos: number };
        erro?: string;
      }>(`/api/tabelas-preco/${selecionada.id}/importar-produtos`, {});
      if (!data.sucesso || !data.dados) {
        throw new Error(data.erro || 'Falha na importação.');
      }
      toast.success(
        `Importação: ${data.dados.criados} novos itens; ${data.dados.jaExistentes} já estavam na tabela.`
      );
      await carregarItens(selecionada.id);
      await carregarTabelas();
    } catch (e) {
      const ax = e as AxiosError<{ erro?: string }>;
      toast.error(ax.response?.data?.erro || (e instanceof Error ? e.message : 'Erro na importação.'));
    } finally {
      setImportando(false);
    }
  };

  const adicionarItem = async (e: FormEvent) => {
    e.preventDefault();
    if (!selecionada) return;
    const pid = produtoAddId.trim();
    if (!pid) {
      toast.warn('Selecione ou informe o produto.');
      return;
    }
    const preco = parseFloat(precoAdd.replace(',', '.'));
    if (Number.isNaN(preco) || preco < 0) {
      toast.warn('Preço de venda inválido.');
      return;
    }
    const qMinRaw = qtdMinAdd.trim();
    const quantidadeMinima =
      qMinRaw === '' ? null : parseInt(qMinRaw, 10);
    if (quantidadeMinima !== null && (Number.isNaN(quantidadeMinima) || quantidadeMinima < 1)) {
      toast.warn('Quantidade mínima inválida (inteiro ≥ 1 ou vazio).');
      return;
    }
    try {
      const { data } = await api.post<{ sucesso: boolean; erro?: string }>(
        `/api/tabelas-preco/${selecionada.id}/itens`,
        {
          produtoId: pid,
          precoVenda: preco,
          quantidadeMinima,
        }
      );
      if (!data.sucesso) {
        throw new Error(data.erro || 'Falha ao salvar item.');
      }
      toast.success('Item salvo na tabela.');
      setProdutoAddId('');
      setPrecoAdd('');
      setQtdMinAdd('');
      setBuscaProduto('');
      setResultadosProduto([]);
      await carregarItens(selecionada.id);
      await carregarTabelas();
    } catch (e) {
      const ax = e as AxiosError<{ erro?: string }>;
      toast.error(ax.response?.data?.erro || (e instanceof Error ? e.message : 'Erro ao salvar item.'));
    }
  };

  const atualizarPrecoItem = async (item: TabelaPrecoItemRow, precoStr: string) => {
    if (!selecionada) return;
    const preco = parseFloat(precoStr.replace(',', '.'));
    if (Number.isNaN(preco) || preco < 0) {
      toast.warn('Preço inválido.');
      return;
    }
    try {
      const { data } = await api.patch<{ sucesso: boolean; erro?: string }>(
        `/api/tabelas-preco/${selecionada.id}/itens/${item.id}`,
        { precoVenda: preco }
      );
      if (!data.sucesso) {
        throw new Error(data.erro || 'Falha ao atualizar.');
      }
      await carregarItens(selecionada.id);
    } catch (e) {
      const ax = e as AxiosError<{ erro?: string }>;
      toast.error(ax.response?.data?.erro || (e instanceof Error ? e.message : 'Erro ao atualizar.'));
    }
  };

  const removerItem = async (item: TabelaPrecoItemRow) => {
    if (!selecionada) return;
    if (!window.confirm(`Remover "${item.produto.nome}" desta tabela?`)) return;
    try {
      const { data } = await api.delete<{ sucesso: boolean; erro?: string }>(
        `/api/tabelas-preco/${selecionada.id}/itens/${item.id}`
      );
      if (!data.sucesso) {
        throw new Error(data.erro || 'Falha ao remover.');
      }
      await carregarItens(selecionada.id);
      await carregarTabelas();
    } catch (e) {
      const ax = e as AxiosError<{ erro?: string }>;
      toast.error(ax.response?.data?.erro || (e instanceof Error ? e.message : 'Erro ao remover.'));
    }
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6 bg-[#060816] min-h-full">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-violet-500/10 text-violet-300 border border-white/10">
              <ListOrdered className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-white">Listas de preços</h1>
              <p className="text-sm text-slate-400">
                Precificação de venda por tabela; o PDV usa promoção → estação → tabela padrão da loja.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setModalNova(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-sm font-black shadow-[0_0_15px_rgba(139,92,246,0.30)] hover:scale-[1.02] transition-all"
          >
            <Plus className="w-4 h-4" />
            Nova tabela
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-[#08101f]/90 backdrop-blur-xl rounded-[30px] border border-white/10 shadow-[0_25px_60px_rgba(0,0,0,0.35)] overflow-hidden">
            <div className="px-4 py-3 border-b border-white/10 font-medium text-white">
              Tabelas da loja
            </div>
            {carregandoLista ? (
              <div className="flex justify-center py-16 text-slate-500">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
            ) : tabelas.length === 0 ? (
              <p className="p-6 text-sm text-slate-400">Nenhuma tabela cadastrada.</p>
            ) : (
              <ul className="p-4 space-y-2 max-h-[480px] overflow-y-auto">
                {tabelas.map((t) => (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => setSelecionada(t)}
                      className={`w-full text-left rounded-2xl border px-4 py-3 transition-all bg-[#0b1324]/70 border-white/10 hover:bg-white/5 ${
                        selecionada?.id === t.id ? 'ring-2 ring-violet-500/40 border-violet-500/30' : ''
                      }`}
                    >
                      <div className="flex justify-between gap-2">
                        <span className="font-medium text-white">{t.nome}</span>
                        <span className="text-xs text-slate-400 shrink-0">
                          {TIPOS.find((x) => x.value === t.tipo)?.label ?? t.tipo}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-2 text-xs">
                        <span
                          className={`px-2 py-0.5 rounded-lg text-xs font-medium ${
                            t.ativa
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-white/5 text-slate-400 border border-white/10'
                          }`}
                        >
                          {t.ativa ? 'Ativa' : 'Inativa'}
                        </span>
                        {t.padrao && (
                          <span className="px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
                            Padrão da loja
                          </span>
                        )}
                        <span className="text-slate-500">
                          {fmtData(t.dataInicio)} → {fmtData(t.dataFim)}
                        </span>
                        <span className="text-slate-500">{t._count.itens} itens</span>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="bg-[#08101f]/90 backdrop-blur-xl rounded-[30px] border border-white/10 shadow-[0_25px_60px_rgba(0,0,0,0.35)] overflow-hidden min-h-[320px]">
            {!selecionada ? (
              <div className="p-8 text-center text-slate-400 text-sm">
                Selecione uma tabela para gerenciar os preços dos produtos.
              </div>
            ) : (
              <>
                <div className="px-4 py-3 border-b border-white/10 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="font-semibold text-white">{selecionada.nome}</h2>
                    <p className="text-xs text-slate-400">Itens da lista (preço de venda real no PDV)</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setEditandoTabela((v) => !v)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      {editandoTabela ? 'Fechar edição' : 'Editar tabela'}
                    </button>
                    <button
                      type="button"
                      onClick={excluirTabela}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium text-red-400 border border-red-500/30 bg-red-500/10 hover:bg-red-500/20"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Excluir
                    </button>
                  </div>
                </div>

                {editandoTabela && (
                  <form
                    onSubmit={salvarEdicaoTabela}
                    className="p-4 border-b border-white/10 space-y-3 bg-[#0b1324]/50"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <label className="block text-xs font-medium text-slate-400">
                        Nome
                        <input
                          className="mt-1 w-full rounded-xl border border-white/10 bg-[#0b1324] px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-violet-500/40 focus:ring-2 focus:ring-violet-500/20 outline-none"
                          value={formEdit.nome}
                          onChange={(e) => setFormEdit((f) => ({ ...f, nome: e.target.value }))}
                        />
                      </label>
                      <label className="block text-xs font-medium text-slate-400">
                        Tipo
                        <select
                          className="mt-1 w-full rounded-xl border border-white/10 bg-[#0b1324] px-3 py-2 text-sm text-white focus:border-violet-500/40 focus:ring-2 focus:ring-violet-500/20 outline-none"
                          value={formEdit.tipo}
                          onChange={(e) =>
                            setFormEdit((f) => ({ ...f, tipo: e.target.value as TipoTabelaPreco }))
                          }
                        >
                          {TIPOS.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="block text-xs font-medium text-slate-400">
                        Início vigência
                        <input
                          type="date"
                          className="mt-1 w-full rounded-xl border border-white/10 bg-[#0b1324] px-3 py-2 text-sm text-white focus:border-violet-500/40 focus:ring-2 focus:ring-violet-500/20 outline-none"
                          value={formEdit.dataInicio}
                          onChange={(e) => setFormEdit((f) => ({ ...f, dataInicio: e.target.value }))}
                        />
                      </label>
                      <label className="block text-xs font-medium text-slate-400">
                        Fim vigência
                        <input
                          type="date"
                          className="mt-1 w-full rounded-xl border border-white/10 bg-[#0b1324] px-3 py-2 text-sm text-white focus:border-violet-500/40 focus:ring-2 focus:ring-violet-500/20 outline-none"
                          value={formEdit.dataFim}
                          onChange={(e) => setFormEdit((f) => ({ ...f, dataFim: e.target.value }))}
                        />
                      </label>
                    </div>
                    <label className="flex items-center gap-2 text-sm text-slate-300">
                      <input
                        type="checkbox"
                        checked={formEdit.padrao}
                        onChange={(e) => setFormEdit((f) => ({ ...f, padrao: e.target.checked }))}
                      />
                      Tabela padrão da loja (fallback do PDV)
                    </label>
                    <label className="flex items-center gap-2 text-sm text-slate-300">
                      <input
                        type="checkbox"
                        checked={formEdit.ativa}
                        onChange={(e) => setFormEdit((f) => ({ ...f, ativa: e.target.checked }))}
                      />
                      Ativa
                    </label>
                    <button
                      type="submit"
                      disabled={salvandoEdit}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-sm font-black shadow-[0_0_15px_rgba(139,92,246,0.30)] hover:scale-[1.02] transition-all disabled:opacity-50 disabled:hover:scale-100"
                    >
                      {salvandoEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      Salvar tabela
                    </button>
                  </form>
                )}

                <div className="p-4 border-b border-white/10 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={importarTodos}
                      disabled={importando}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 disabled:opacity-50"
                    >
                      {importando ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                      Importar todos os produtos
                    </button>
                  </div>
                  <form onSubmit={adicionarItem} className="space-y-2">
                    <p className="text-xs font-medium text-slate-400">Incluir / atualizar produto</p>
                    <div className="relative">
                      <div className="flex gap-2">
                        <div className="flex-1 relative">
                          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                          <input
                            className="w-full pl-9 pr-3 py-2 rounded-xl border border-white/10 bg-[#0b1324] text-white text-sm placeholder:text-slate-500 focus:border-violet-500/40 focus:ring-2 focus:ring-violet-500/20 outline-none"
                            placeholder="Buscar produto por nome ou código…"
                            value={buscaProduto}
                            onChange={(e) => setBuscaProduto(e.target.value)}
                          />
                        </div>
                      </div>
                      {resultadosProduto.length > 0 && (
                        <ul className="absolute z-10 mt-1 w-full max-h-48 overflow-y-auto rounded-xl border border-white/10 bg-[#08101f] shadow-[0_25px_60px_rgba(0,0,0,0.35)] text-sm text-white">
                          {resultadosProduto.map((p) => (
                            <li key={p.id}>
                              <button
                                type="button"
                                className="w-full text-left px-3 py-2 hover:bg-white/5 text-slate-200"
                                onClick={() => {
                                  setProdutoAddId(p.id);
                                  setBuscaProduto(`${p.codigo} — ${p.nome}`);
                                  setResultadosProduto([]);
                                }}
                              >
                                {p.codigo} — {p.nome}
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input
                        className="rounded-xl border border-white/10 bg-[#0b1324] text-white px-3 py-2 text-sm placeholder:text-slate-500 focus:border-violet-500/40 focus:ring-2 focus:ring-violet-500/20 outline-none"
                        placeholder="UUID do produto (opcional se buscou)"
                        value={produtoAddId}
                        onChange={(e) => setProdutoAddId(e.target.value)}
                      />
                      <input
                        className="rounded-xl border border-white/10 bg-[#0b1324] text-white px-3 py-2 text-sm placeholder:text-slate-500 focus:border-violet-500/40 focus:ring-2 focus:ring-violet-500/20 outline-none"
                        placeholder="Preço venda"
                        value={precoAdd}
                        onChange={(e) => setPrecoAdd(e.target.value)}
                      />
                      <input
                        className="rounded-xl border border-white/10 bg-[#0b1324] text-white px-3 py-2 text-sm placeholder:text-slate-500 focus:border-violet-500/40 focus:ring-2 focus:ring-violet-500/20 outline-none"
                        placeholder="Qtd. mín. (atacado)"
                        value={qtdMinAdd}
                        onChange={(e) => setQtdMinAdd(e.target.value)}
                      />
                    </div>
                    <button
                      type="submit"
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-black bg-gradient-to-r from-emerald-600 to-teal-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.35)] hover:scale-[1.02] transition-all"
                    >
                      <Plus className="w-4 h-4" />
                      Salvar item
                    </button>
                  </form>
                </div>

                <div className="max-h-[360px] overflow-y-auto p-4 space-y-2">
                  {carregandoItens ? (
                    <div className="flex justify-center py-12">
                      <Loader2 className="w-6 h-6 animate-spin text-slate-500" />
                    </div>
                  ) : itens.length === 0 ? (
                    <p className="p-6 text-sm text-slate-400">Nenhum item nesta tabela.</p>
                  ) : (
                    <>
                      <div className="sticky top-0 z-[1] flex gap-2 px-2 py-2 text-xs font-black uppercase tracking-widest text-slate-500 bg-[#08101f]/95 backdrop-blur-sm border-b border-white/10">
                        <span className="flex-1 min-w-0">Produto</span>
                        <span className="w-28 shrink-0">Preço</span>
                        <span className="w-14 shrink-0 text-center">Qtd.</span>
                        <span className="w-10 shrink-0" />
                      </div>
                      {itens.map((it) => (
                        <div
                          key={it.id}
                          className="flex flex-wrap sm:flex-nowrap items-center gap-2 rounded-2xl border border-white/10 bg-[#0b1324]/70 px-3 py-3 hover:bg-white/5 transition-all"
                        >
                          <div className="flex-1 min-w-[140px]">
                            <div className="font-medium text-white">{it.produto.nome}</div>
                            <div className="text-xs text-slate-500">{it.produto.codigo}</div>
                          </div>
                          <div className="shrink-0">
                            <ItemPrecoEditor
                              valorInicial={fmtMoney(it.precoVenda)}
                              onSalvar={(s) => void atualizarPrecoItem(it, s)}
                            />
                          </div>
                          <div className="w-14 shrink-0 text-center text-slate-400 text-sm">
                            {it.quantidadeMinima ?? '—'}
                          </div>
                          <button
                            type="button"
                            onClick={() => void removerItem(it)}
                            className="p-1.5 rounded-xl text-red-400 border border-transparent hover:bg-red-500/10 hover:border-red-500/30"
                            title="Remover"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {modalNova && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[30px] bg-[#08101f]/90 backdrop-blur-xl border border-white/10 shadow-[0_25px_60px_rgba(0,0,0,0.35)] p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-white">Nova tabela de preço</h3>
              <button
                type="button"
                onClick={() => setModalNova(false)}
                className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={criarTabela} className="space-y-3">
              <label className="block text-sm font-medium text-slate-400">
                Nome
                <input
                  required
                  className="mt-1 w-full rounded-xl border border-white/10 bg-[#0b1324] text-white px-3 py-2 focus:border-violet-500/40 focus:ring-2 focus:ring-violet-500/20 outline-none"
                  value={formNova.nome}
                  onChange={(e) => setFormNova((f) => ({ ...f, nome: e.target.value }))}
                />
              </label>
              <label className="block text-sm font-medium text-slate-400">
                Tipo
                <select
                  className="mt-1 w-full rounded-xl border border-white/10 bg-[#0b1324] text-white px-3 py-2 focus:border-violet-500/40 focus:ring-2 focus:ring-violet-500/20 outline-none"
                  value={formNova.tipo}
                  onChange={(e) =>
                    setFormNova((f) => ({ ...f, tipo: e.target.value as TipoTabelaPreco }))
                  }
                >
                  {TIPOS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={formNova.padrao}
                  onChange={(e) => setFormNova((f) => ({ ...f, padrao: e.target.checked }))}
                />
                Definir como tabela padrão da loja
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={formNova.ativa}
                  onChange={(e) => setFormNova((f) => ({ ...f, ativa: e.target.checked }))}
                />
                Ativa
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalNova(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-sm hover:bg-white/10"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvandoNova}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-sm font-black shadow-[0_0_15px_rgba(139,92,246,0.30)] hover:scale-[1.02] transition-all disabled:opacity-50 disabled:hover:scale-100 inline-flex items-center gap-2"
                >
                  {salvandoNova && <Loader2 className="w-4 h-4 animate-spin" />}
                  Criar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}

function ItemPrecoEditor({
  valorInicial,
  onSalvar,
}: {
  valorInicial: string;
  onSalvar: (s: string) => void;
}) {
  const [val, setVal] = useState(valorInicial);
  useEffect(() => {
    setVal(valorInicial);
  }, [valorInicial]);
  return (
    <div className="flex items-center gap-1">
      <input
        className="w-24 rounded-xl border border-white/10 bg-[#0b1324] text-white px-2 py-1 text-sm focus:border-violet-500/40 focus:ring-2 focus:ring-violet-500/20 outline-none"
        value={val}
        onChange={(e) => setVal(e.target.value)}
      />
      <button
        type="button"
        onClick={() => onSalvar(val)}
        className="p-1 rounded-xl text-violet-400 hover:bg-violet-500/10 border border-transparent hover:border-violet-500/30"
        title="Aplicar preço"
      >
        <Check className="w-4 h-4" />
      </button>
    </div>
  );
}
