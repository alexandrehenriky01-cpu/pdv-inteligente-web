import { useEffect, useState, type FormEvent } from 'react';
import { api } from '../../../services/api';
import { Layout } from '../../../components/Layout';
import {
  Package,
  Plus,
  AlertTriangle,
  X,
  Loader2,
  Search,
  Box,
  CheckCircle2,
  Sparkles,
  Landmark,
} from 'lucide-react';
import { AxiosError } from 'axios';

export interface IContaEstoque {
  codigo: string;
  descricao: string;
}

export interface IProdutoEstoque {
  id: string;
  nome: string;
  codigoBarras?: string;
  estoque?: {
    quantidadeAtual: number;
  };
  contaEstoque?: IContaEstoque | null;
}

export function Estoque() {
  const [produtos, setProdutos] = useState<IProdutoEstoque[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [produtoSelecionado, setProdutoSelecionado] = useState('');
  const [quantidadeAdicionar, setQuantidadeAdicionar] = useState('');
  const [motivo, setMotivo] = useState('AJUSTE_MANUAL');
  const [loadingEntrada, setLoadingEntrada] = useState(false);

  const carregarEstoque = async () => {
    try {
      const response = await api.get<IProdutoEstoque[]>('/api/cadastros/produtos');
      setProdutos(response.data);
    } catch (err) {
      const error = err as AxiosError<{ error?: string }>;
      console.error('Erro ao carregar estoque:', error.response?.data || error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarEstoque();
  }, []);

  const handleEntradaEstoque = async (e: FormEvent) => {
    e.preventDefault();
    if (!produtoSelecionado || !quantidadeAdicionar) return;

    setLoadingEntrada(true);
    try {
      await api.post<{ message?: string }>('/api/estoque/entrada', {
        produtoId: produtoSelecionado,
        quantidade: Number(quantidadeAdicionar),
        motivo: motivo
      });

      alert('✅ Ajuste de estoque realizado com sucesso!');
      setShowModal(false);
      setProdutoSelecionado('');
      setQuantidadeAdicionar('');
      setMotivo('AJUSTE_MANUAL');
      carregarEstoque();
    } catch (err) {
      const error = err as AxiosError<{ erro?: string; error?: string }>;
      console.error('Erro na entrada de estoque:', error);
      alert(error.response?.data?.erro || error.response?.data?.error || 'Erro ao registrar entrada.');
    } finally {
      setLoadingEntrada(false);
    }
  };

  const produtosFiltrados = produtos.filter(
    p =>
      p.nome.toLowerCase().includes(busca.toLowerCase()) ||
      (p.codigoBarras && p.codigoBarras.includes(busca))
  );

  const inputClass =
    'w-full rounded-2xl border border-white/10 bg-[#0d182d] px-4 py-3.5 text-sm text-white placeholder:text-slate-500 outline-none shadow-inner transition-all focus:border-violet-400/30 focus:ring-2 focus:ring-violet-500/15';
  const labelClass =
    'mb-2 block pl-1 text-xs font-bold uppercase tracking-[0.16em] text-slate-400';

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
                Inventory Control
              </div>

              <h1 className="flex items-center gap-4 text-3xl font-black tracking-tight text-white">
                <div className="rounded-2xl border border-violet-400/20 bg-violet-500/10 p-3 shadow-[0_0_20px_rgba(139,92,246,0.12)]">
                  <Package className="h-8 w-8 text-violet-300" />
                </div>
                Controle de Estoque
              </h1>

              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300 sm:text-[15px]">
                Visibilidade total do inventário, ajustes manuais e vínculo contábil
                dos itens em estoque.
              </p>
            </div>

            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 rounded-2xl border border-violet-400/20 bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-3.5 font-black text-white shadow-[0_0_20px_rgba(139,92,246,0.22)] transition-all hover:scale-[1.02] hover:brightness-110"
            >
              <Plus className="h-5 w-5" />
              Ajuste Manual
            </button>
          </div>
        </div>

        <div className="rounded-[24px] border border-white/10 bg-[#08101f]/90 p-4 shadow-[0_20px_45px_rgba(0,0,0,0.30)] backdrop-blur-xl">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-violet-300" />
            <input
              type="text"
              placeholder="Buscar produto por nome ou código de barras..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className={`${inputClass} pl-12`}
            />
          </div>
        </div>

        <div className="flex-1 overflow-hidden rounded-[30px] border border-white/10 bg-[#08101f]/90 shadow-[0_25px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-white/10 bg-black/10 px-5 py-5">
            <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.18em] text-white">
              <Box className="h-4 w-4 text-violet-300" />
              Posição Atual do Inventário
            </h2>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-black text-violet-300">
              {produtosFiltrados.length} Itens
            </span>
          </div>

          <div className="flex-1 overflow-auto">
            <table className="min-w-[980px] w-full text-left">
              <thead className="sticky top-0 z-10 border-b border-white/10 bg-[#0b1324]">
                <tr>
                  <th className="p-5 text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                    Produto
                  </th>
                  <th className="p-5 text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                    Cód. Barras
                  </th>
                  <th className="p-5 text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                    Vínculo Contábil
                  </th>
                  <th className="p-5 text-center text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                    Qtde Atual
                  </th>
                  <th className="p-5 text-center text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                    Status
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-white/5">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="p-16 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <div className="rounded-2xl border border-violet-400/20 bg-violet-500/10 p-4">
                          <Loader2 className="h-8 w-8 animate-spin text-violet-300" />
                        </div>
                        <p className="font-bold text-slate-300">
                          Carregando inventário...
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : produtosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-16 text-center bg-black/10">
                      <div className="flex flex-col items-center">
                        <div className="mb-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                          <Package className="h-12 w-12 text-slate-500" />
                        </div>
                        <p className="text-lg font-black text-white">
                          Nenhum produto encontrado
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  produtosFiltrados.map((produto) => {
                    const qtd = produto.estoque?.quantidadeAtual || 0;

                    let statusColor = 'border-emerald-400/20 bg-emerald-500/10 text-emerald-300';
                    let statusText = 'Saudável';

                    if (qtd === 0) {
                      statusColor = 'border-rose-400/20 bg-rose-500/10 text-rose-300';
                      statusText = 'Falta (Ruptura)';
                    } else if (qtd < 5) {
                      statusColor = 'border-amber-400/20 bg-amber-500/10 text-amber-300';
                      statusText = 'Baixo (Atenção)';
                    }

                    return (
                      <tr key={produto.id} className="transition-colors hover:bg-white/5">
                        <td className="p-5 text-base font-bold text-white">
                          {produto.nome}
                        </td>

                        <td className="p-5 font-mono text-sm text-slate-400">
                          {produto.codigoBarras || 'S/ Código'}
                        </td>

                        <td className="p-5 text-xs">
                          <div
                            className="flex items-center gap-2"
                            title={produto.contaEstoque?.descricao || 'Conta Padrão de Estoque'}
                          >
                            <span className="w-4 font-black text-violet-300">E:</span>
                            {produto.contaEstoque ? (
                              <span className="rounded-lg border border-white/10 bg-[#0b1324] px-2.5 py-1 font-mono font-bold text-slate-300">
                                {produto.contaEstoque.codigo}
                              </span>
                            ) : (
                              <span className="font-medium italic text-slate-500">
                                Padrão (1.1.4)
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="p-5 text-center font-mono text-2xl font-black text-white">
                          {qtd}
                        </td>

                        <td className="p-5 text-center">
                          <span
                            className={`inline-flex items-center justify-center rounded-lg border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] ${statusColor}`}
                          >
                            {statusText}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="border-t border-white/10 bg-black/10 px-6 py-4">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <Landmark className="h-4 w-4 text-violet-300" />
              O vínculo contábil do item define a classificação patrimonial do estoque dentro da estrutura contábil.
            </div>
          </div>
        </div>

        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#020617]/80 p-4 backdrop-blur-md">
            <div className="animate-modal relative flex w-full max-w-md flex-col overflow-hidden rounded-[30px] border border-white/10 bg-[#08101f]/95 shadow-[0_25px_80px_rgba(0,0,0,0.65)]">
              <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-400" />

              <div className="flex items-center justify-between border-b border-white/10 bg-black/10 px-6 py-6">
                <div>
                  <h3 className="text-xl font-black tracking-tight text-white">
                    Ajuste Manual
                  </h3>
                  <p className="mt-1 text-xs text-slate-400">
                    Entrada ou saída avulsa de mercadoria.
                  </p>
                </div>

                <button
                  onClick={() => setShowModal(false)}
                  className="rounded-full border border-white/10 bg-white/5 p-2 text-slate-400 transition-all hover:border-white/15 hover:bg-white/10 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleEntradaEstoque} className="space-y-6 p-6">
                <div className="flex gap-3 rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4 text-sm text-amber-100 shadow-inner">
                  <AlertTriangle className="h-6 w-6 shrink-0 text-amber-300" />
                  <p className="leading-relaxed">
                    <strong className="font-black text-amber-300">Aviso Contábil:</strong>{' '}
                    Entradas manuais sem NF-e gerarão um lançamento de contrapartida pendente{' '}
                    <strong className="font-black text-amber-300">(Perneta)</strong> para o
                    contador classificar posteriormente no Livro Razão.
                  </p>
                </div>

                <div>
                  <label className={labelClass}>Selecione o Produto</label>
                  <select
                    value={produtoSelecionado}
                    onChange={(e) => setProdutoSelecionado(e.target.value)}
                    className={inputClass}
                    required
                  >
                    <option value="">-- Escolha um produto --</option>
                    {produtos.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.nome}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Quantidade</label>
                    <input
                      type="number"
                      min="1"
                      value={quantidadeAdicionar}
                      onChange={(e) => setQuantidadeAdicionar(e.target.value)}
                      className={`${inputClass} text-lg font-black`}
                      placeholder="Ex: 10"
                      required
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Motivo</label>
                    <select
                      value={motivo}
                      onChange={(e) => setMotivo(e.target.value)}
                      className={inputClass}
                    >
                      <option value="AJUSTE_MANUAL">Ajuste Manual</option>
                      <option value="COMPRA_SEM_NOTA">Compra s/ Nota</option>
                      <option value="DEVOLUCAO">Devolução</option>
                      <option value="INVENTARIO">Inventário Cego</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-4 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 rounded-2xl border border-white/10 bg-white/5 py-3.5 font-bold text-slate-300 transition-all hover:bg-white/10 hover:text-white"
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    disabled={loadingEntrada || !produtoSelecionado || !quantidadeAdicionar}
                    className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-violet-400/20 bg-gradient-to-r from-violet-600 to-fuchsia-600 py-3.5 font-black text-white shadow-[0_0_20px_rgba(139,92,246,0.22)] transition-all hover:scale-[1.02] hover:brightness-110 disabled:opacity-50 disabled:hover:scale-100"
                  >
                    {loadingEntrada ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-5 w-5" />
                    )}
                    Confirmar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}