import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { Layout } from '../../../components/Layout';
import { api } from '../../../services/api';
import {
  Plus,
  CheckCircle,
  AlertTriangle,
  Search,
  Package,
  Calendar,
  Tag,
  X,
  Loader2,
  ClipboardList,
  Sparkles,
  Boxes,
} from 'lucide-react';
import { AxiosError } from 'axios';

export interface IProdutoInventario {
  id: string;
  nome: string;
  codigoBarras?: string;
}

export interface IItemInventario {
  id: string;
  produto: IProdutoInventario;
  quantidadeSistema: number;
  quantidadeContada: number | null;
  diferenca: number | null;
  impactoFinanceiro: number | null;
}

export interface IInventario {
  id: string;
  observacao: string;
  status: 'ABERTO' | 'CONCLUIDO' | 'CANCELADO';
  dataInicio: string;
  dataFim: string | null;
  itens: IItemInventario[];
}

export interface ICategoria {
  id: string;
  nome: string;
}

export function GestaoInventarioPage() {
  const [inventarios, setInventarios] = useState<IInventario[]>([]);
  const [categorias, setCategorias] = useState<ICategoria[]>([]);
  const [produtosTotais, setProdutosTotais] = useState<IProdutoInventario[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalAberto, setIsModalAberto] = useState(false);
  const [inventarioSelecionado, setInventarioSelecionado] = useState<IInventario | null>(null);

  const [filtroCategorias, setFiltroCategorias] = useState<string[]>([]);
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  const [buscaProduto, setBuscaProduto] = useState('');
  const [filtroProdutos, setFiltroProdutos] = useState<IProdutoInventario[]>([]);

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    setLoading(true);
    try {
      const [resInv, resCat, resProd] = await Promise.all([
        api.get<IInventario[]>('/api/estoque/inventario'),
        api.get<ICategoria[]>('/api/cadastros/categorias').catch(() => ({ data: [] as ICategoria[] })),
        api.get<IProdutoInventario[]>('/api/cadastros/produtos').catch(() => ({ data: [] as IProdutoInventario[] }))
      ]);

      setInventarios(resInv.data);
      setCategorias(resCat.data);
      setProdutosTotais(resProd.data);
    } catch (err) {
      const error = err as AxiosError<{ error?: string }>;
      console.error('Erro ao carregar dados do inventário:', error.response?.data || error.message);
      toast.error(error.response?.data?.error || error.message || 'Erro ao carregar inventário.');
    } finally {
      setLoading(false);
    }
  };

  const iniciarInventario = async () => {
    try {
      await api.post('/api/estoque/inventario', {
        categoriaIds: filtroCategorias.length > 0 ? filtroCategorias : undefined,
        produtoIds: filtroProdutos.length > 0 ? filtroProdutos.map(p => p.id) : undefined,
        dataEntradaInicio: dataInicio || undefined,
        dataEntradaFim: dataFim || undefined
      });

      alert('✅ Inventário iniciado com sucesso! O operador já pode começar a bipar no mobile.');
      setIsModalAberto(false);

      setFiltroCategorias([]);
      setFiltroProdutos([]);
      setDataInicio('');
      setDataFim('');

      carregarDados();
    } catch (err) {
      const error = err as AxiosError<{ error?: string }>;
      alert(error.response?.data?.error || 'Erro ao iniciar inventário.');
    }
  };

  const concluirInventario = async (id: string) => {
    if (!window.confirm('ATENÇÃO: Isso ajustará o estoque real e gerará lançamentos contábeis (DRE) para as quebras/perdas. Deseja prosseguir?')) return;

    try {
      await api.post(`/api/estoque/inventario/${id}/concluir`, {});
      alert('✅ Inventário concluído e contabilizado com sucesso!');
      setInventarioSelecionado(null);
      carregarDados();
    } catch (err) {
      const error = err as AxiosError<{ error?: string }>;
      alert(error.response?.data?.error || 'Erro ao concluir inventário.');
    }
  };

  const calcularPrejuizo = (itens: IItemInventario[]) => {
    return itens.reduce((acc, item) => acc + (Number(item.impactoFinanceiro) || 0), 0);
  };

  const adicionarProdutoFiltro = (produto: IProdutoInventario) => {
    if (!filtroProdutos.find(p => p.id === produto.id)) {
      setFiltroProdutos([...filtroProdutos, produto]);
    }
    setBuscaProduto('');
  };

  const removerProdutoFiltro = (id: string) => {
    setFiltroProdutos(filtroProdutos.filter(p => p.id !== id));
  };

  const inputClass =
    'w-full rounded-2xl border border-white/10 bg-[#0d182d] px-4 py-3.5 text-sm text-white placeholder:text-slate-500 outline-none shadow-inner transition-all focus:border-violet-400/30 focus:ring-2 focus:ring-violet-500/15';
  const labelClass =
    'mb-2 flex items-center gap-2 pl-1 text-xs font-bold uppercase tracking-[0.16em] text-slate-400';

  return (
    <Layout>
      <style>{`
        @keyframes modalEnter {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-modal {
          animation: modalEnter 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      <div className="mx-auto flex h-full max-w-7xl flex-col space-y-6 pb-12">
        <div className="relative overflow-hidden rounded-[30px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(139,92,246,0.16),_transparent_26%),linear-gradient(135deg,_#0b1020_0%,_#08101f_45%,_#0a1224_100%)] p-6 shadow-[0_25px_70px_rgba(0,0,0,0.40)] sm:p-8">
          <div className="pointer-events-none absolute -left-10 top-0 h-52 w-52 rounded-full bg-violet-600/15 blur-[100px]" />
          <div className="pointer-events-none absolute right-0 top-0 h-56 w-56 rounded-full bg-fuchsia-600/10 blur-[110px]" />

          <div className="relative z-10 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-violet-300">
                <Sparkles className="h-3.5 w-3.5" />
                Inventory Audit
              </div>

              <h1 className="flex items-center gap-4 text-3xl font-black tracking-tight text-white">
                <div className="rounded-2xl border border-violet-400/20 bg-violet-500/10 p-3 shadow-[0_0_20px_rgba(139,92,246,0.12)]">
                  <ClipboardList className="h-8 w-8 text-violet-300" />
                </div>
                Gestão de Inventário
              </h1>

              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300 sm:text-[15px]">
                Controle de perdas, quebras, auditoria operacional e contabilização
                do inventário em tempo real.
              </p>
            </div>

            <button
              onClick={() => setIsModalAberto(true)}
              className="inline-flex items-center gap-2 rounded-2xl border border-violet-400/20 bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-3.5 font-black text-white shadow-[0_0_20px_rgba(139,92,246,0.22)] transition-all hover:scale-[1.02] hover:brightness-110"
            >
              <Plus className="h-5 w-5" />
              Abrir Inventário
            </button>
          </div>
        </div>

        <div className="grid flex-1 grid-cols-1 gap-4">
          {loading && inventarios.length === 0 ? (
            <div className="flex flex-col items-center gap-4 rounded-[30px] border border-white/10 bg-[#08101f]/90 p-16 text-center shadow-[0_20px_45px_rgba(0,0,0,0.30)]">
              <div className="rounded-2xl border border-violet-400/20 bg-violet-500/10 p-4">
                <Loader2 className="h-8 w-8 animate-spin text-violet-300" />
              </div>
              <p className="font-bold text-slate-300">Buscando inventários...</p>
            </div>
          ) : inventarios.length === 0 ? (
            <div className="flex flex-col items-center rounded-[30px] border border-white/10 border-dashed bg-[#08101f]/90 p-16 text-center shadow-[0_20px_45px_rgba(0,0,0,0.30)]">
              <div className="mb-4 rounded-2xl border border-white/10 bg-white/5 p-5">
                <Package className="h-16 w-16 text-slate-500" />
              </div>
              <h3 className="mb-2 text-2xl font-black text-white">
                Nenhum inventário registrado
              </h3>
              <p className="text-lg text-slate-400">
                Inicie uma nova contagem para auditar seu estoque.
              </p>
            </div>
          ) : (
            inventarios.map(inv => (
              <div
                key={inv.id}
                className="group flex cursor-pointer flex-col items-start justify-between gap-4 rounded-[26px] border border-white/10 bg-[#08101f]/90 p-6 shadow-[0_20px_45px_rgba(0,0,0,0.30)] transition-all hover:-translate-y-1 hover:border-violet-400/20 md:flex-row md:items-center"
                onClick={() => setInventarioSelecionado(inv)}
              >
                <div>
                  <div className="mb-2 flex items-center gap-3">
                    <span
                      className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${
                        inv.status === 'ABERTO'
                          ? 'border-amber-400/20 bg-amber-500/10 text-amber-300 animate-pulse'
                          : 'border-emerald-400/20 bg-emerald-500/10 text-emerald-300'
                      }`}
                    >
                      {inv.status}
                    </span>

                    <span className="text-sm font-bold text-slate-500">
                      {new Date(inv.dataInicio).toLocaleDateString('pt-BR')}
                    </span>
                  </div>

                  <h3 className="text-xl font-black text-white transition-colors group-hover:text-violet-300">
                    {inv.observacao}
                  </h3>
                  <p className="mt-1 text-sm font-medium text-slate-400">
                    {inv.itens.length} produtos em auditoria
                  </p>
                </div>

                {inv.status === 'CONCLUIDO' && (
                  <div className="w-full rounded-2xl border border-white/10 bg-black/10 p-4 md:w-auto md:min-w-[240px] md:text-right">
                    <p className="mb-1 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                      Impacto Financeiro (DRE)
                    </p>
                    <p
                      className={`text-2xl font-black font-mono ${
                        calcularPrejuizo(inv.itens) < 0 ? 'text-rose-300' : 'text-emerald-300'
                      }`}
                    >
                      R$ {calcularPrejuizo(inv.itens).toFixed(2)}
                    </p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {inventarioSelecionado && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#020617]/80 p-4 backdrop-blur-md">
            <div className="animate-modal relative flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-[30px] border border-white/10 bg-[#08101f]/95 shadow-[0_25px_80px_rgba(0,0,0,0.65)]">
              <div
                className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${
                  inventarioSelecionado.status === 'ABERTO'
                    ? 'from-amber-500 to-orange-500'
                    : 'from-emerald-500 to-teal-500'
                }`}
              />

              <div className="flex shrink-0 items-center justify-between border-b border-white/10 bg-black/10 px-6 py-6 sm:px-8">
                <div>
                  <h2 className="text-2xl font-black text-white">
                    Detalhes do Inventário
                  </h2>
                  <p className="mt-1 text-sm text-slate-400">
                    {inventarioSelecionado.observacao}
                  </p>
                </div>

                <button
                  onClick={() => setInventarioSelecionado(null)}
                  className="rounded-full border border-white/10 bg-white/5 p-2 text-slate-400 transition-all hover:border-white/15 hover:bg-white/10 hover:text-white"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="flex-1 overflow-auto">
                <table className="w-full min-w-[900px] text-left text-sm">
                  <thead className="sticky top-0 z-10 border-b border-white/10 bg-[#0b1324]">
                    <tr>
                      <th className="p-5 text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                        Produto
                      </th>
                      <th className="p-5 text-center text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                        Sistema
                      </th>
                      <th className="p-5 text-center text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                        Contado
                      </th>
                      <th className="p-5 text-center text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                        Diferença
                      </th>
                      <th className="p-5 text-right text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                        Impacto (R$)
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-white/5">
                    {inventarioSelecionado.itens.map(item => (
                      <tr key={item.id} className="transition-colors hover:bg-white/5">
                        <td className="p-5 font-bold text-slate-200">
                          {item.produto.nome}
                          <p className="mt-1 font-mono text-xs text-slate-500">
                            {item.produto.codigoBarras || 'S/ Código'}
                          </p>
                        </td>

                        <td className="p-5 text-center font-mono text-base text-slate-400">
                          {Number(item.quantidadeSistema).toFixed(2)}
                        </td>

                        <td className="p-5 text-center font-mono text-lg font-black text-violet-300">
                          {item.quantidadeContada !== null ? (
                            Number(item.quantidadeContada).toFixed(2)
                          ) : (
                            <span className="text-sm text-amber-500/60">Pendente</span>
                          )}
                        </td>

                        <td className="p-5 text-center">
                          <span
                            className={`rounded-lg px-2 py-1 font-mono font-black ${
                              Number(item.diferenca) < 0
                                ? 'bg-rose-500/10 text-rose-300'
                                : Number(item.diferenca) > 0
                                  ? 'bg-emerald-500/10 text-emerald-300'
                                  : 'text-slate-500'
                            }`}
                          >
                            {item.diferenca !== null ? Number(item.diferenca).toFixed(2) : '-'}
                          </span>
                        </td>

                        <td
                          className={`p-5 text-right font-mono text-base font-black ${
                            Number(item.impactoFinanceiro) < 0
                              ? 'text-rose-300'
                              : Number(item.impactoFinanceiro) > 0
                                ? 'text-emerald-300'
                                : 'text-slate-500'
                          }`}
                        >
                          {item.impactoFinanceiro !== null
                            ? `R$ ${Number(item.impactoFinanceiro).toFixed(2)}`
                            : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {inventarioSelecionado.status === 'ABERTO' && (
                <div className="flex shrink-0 flex-col items-center justify-between gap-4 border-t border-white/10 bg-black/10 p-6 sm:flex-row">
                  <div className="flex w-full items-center gap-3 rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4 sm:w-auto">
                    <AlertTriangle className="h-6 w-6 shrink-0 text-amber-300" />
                    <p className="text-sm font-medium text-amber-100">
                      Certifique-se que a contagem terminou no <strong className="text-amber-300">Mobile</strong> antes de concluir.
                    </p>
                  </div>

                  <button
                    onClick={() => concluirInventario(inventarioSelecionado.id)}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-emerald-400/20 bg-gradient-to-r from-emerald-600 to-teal-500 px-8 py-4 font-black text-white shadow-[0_0_20px_rgba(16,185,129,0.24)] transition-all hover:scale-[1.02] hover:brightness-110 sm:w-auto"
                  >
                    <CheckCircle className="h-5 w-5" />
                    Concluir e Contabilizar
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {isModalAberto && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#020617]/80 p-4 backdrop-blur-md">
            <div className="animate-modal relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-[30px] border border-white/10 bg-[#08101f]/95 shadow-[0_25px_80px_rgba(0,0,0,0.65)]">
              <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-400" />

              <div className="flex shrink-0 items-center justify-between border-b border-white/10 bg-black/10 px-6 py-6 sm:px-8">
                <div>
                  <h2 className="text-xl font-black text-white">
                    Iniciar Inventário Parcial
                  </h2>
                  <p className="mt-1 text-sm text-slate-400">
                    Selecione os filtros para focar a contagem.
                  </p>
                </div>

                <button
                  onClick={() => setIsModalAberto(false)}
                  className="rounded-full border border-white/10 bg-white/5 p-2 text-slate-400 transition-all hover:border-white/15 hover:bg-white/10 hover:text-white"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="custom-scrollbar flex-1 space-y-6 overflow-y-auto px-6 py-6 sm:px-8">
                <div className="rounded-2xl border border-white/10 bg-black/10 p-5">
                  <label className={labelClass}>
                    <Tag className="h-4 w-4 text-violet-300" />
                    Filtrar por Produtos Específicos
                  </label>

                  <div className="relative mb-3">
                    <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Digite o nome do produto..."
                      value={buscaProduto}
                      onChange={(e) => setBuscaProduto(e.target.value)}
                      className={`${inputClass} pl-12`}
                    />
                  </div>

                  {buscaProduto && (
                    <div className="custom-scrollbar absolute z-20 mb-3 max-h-40 w-[calc(100%-3rem)] overflow-y-auto rounded-2xl border border-white/10 bg-[#0b1324] shadow-2xl sm:w-[calc(100%-4rem)]">
                      {produtosTotais
                        .filter(
                          p =>
                            p.nome.toLowerCase().includes(buscaProduto.toLowerCase()) &&
                            !filtroProdutos.find(fp => fp.id === p.id)
                        )
                        .slice(0, 20)
                        .map(p => (
                          <div
                            key={p.id}
                            className="cursor-pointer border-b border-white/5 p-3 text-sm font-bold text-slate-300 transition-colors hover:bg-violet-500/10"
                            onClick={() => adicionarProdutoFiltro(p)}
                          >
                            {p.nome}
                          </div>
                        ))}
                    </div>
                  )}

                  {filtroProdutos.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2 rounded-xl border border-white/10 bg-[#0b1324] p-4 shadow-inner">
                      {filtroProdutos.map(p => (
                        <span
                          key={p.id}
                          className="flex items-center gap-2 rounded-lg border border-violet-400/20 bg-violet-500/10 px-3 py-1.5 text-xs font-bold text-violet-300"
                        >
                          {p.nome}
                          <button
                            onClick={() => removerProdutoFiltro(p.id)}
                            className="rounded-full p-1 transition-colors hover:bg-rose-500/10 hover:text-rose-300"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/10 p-5">
                  <label className={labelClass}>
                    <Package className="h-4 w-4 text-violet-300" />
                    Filtrar por Categorias Inteiras
                  </label>

                  <select
                    multiple
                    className={`${inputClass} custom-scrollbar h-32`}
                    onChange={(e) =>
                      setFiltroCategorias(Array.from(e.target.selectedOptions, option => option.value))
                    }
                  >
                    {categorias.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.nome}
                      </option>
                    ))}
                  </select>

                  <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                    Segure CTRL (ou CMD) para selecionar várias categorias.
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/10 p-5">
                  <label className={labelClass}>
                    <Calendar className="h-4 w-4 text-violet-300" />
                    Produtos que entraram via NFe entre:
                  </label>

                  <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                        Data Início
                      </span>
                      <input
                        type="date"
                        value={dataInicio}
                        onChange={e => setDataInicio(e.target.value)}
                        className={inputClass}
                        style={{ colorScheme: 'dark' }}
                      />
                    </div>

                    <div>
                      <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                        Data Fim
                      </span>
                      <input
                        type="date"
                        value={dataFim}
                        onChange={e => setDataFim(e.target.value)}
                        className={inputClass}
                        style={{ colorScheme: 'dark' }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex shrink-0 flex-col gap-4 border-t border-white/10 bg-black/10 p-6 sm:flex-row sm:justify-end">
                <button
                  onClick={() => setIsModalAberto(false)}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-6 py-3.5 font-bold text-slate-300 transition-all hover:bg-white/10 hover:text-white sm:w-auto"
                >
                  Cancelar
                </button>

                <button
                  onClick={iniciarInventario}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-violet-400/20 bg-gradient-to-r from-violet-600 to-fuchsia-600 px-8 py-3.5 font-black text-white shadow-[0_0_20px_rgba(139,92,246,0.22)] transition-all hover:scale-[1.02] hover:brightness-110 sm:w-auto"
                >
                  <Boxes className="h-5 w-5" />
                  Gerar Lista de Contagem
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}