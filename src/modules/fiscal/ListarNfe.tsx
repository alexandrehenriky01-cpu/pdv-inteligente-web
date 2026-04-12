import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Layout } from '../../components/Layout';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Search,
  Plus,
  Filter,
  Eraser,
  Loader2,
  FileX,
  PackageCheck,
  Database,
  AlertCircle,
  Sparkles,
  Link2,
  Minus,
  Edit2,
  Trash2,
  X,
  Users,
  Package,
} from 'lucide-react';
import { AxiosError } from 'axios';

// 🛡️ INTERFACES DE TIPAGEM ESTRITA
export interface IFornecedorResumo {
  razaoSocial?: string;
  cnpjCpf?: string;
}

export interface IItemNotaResumo {
  id: string;
  descricaoOriginal?: string;
  quantidade?: number;
  valorTotal?: number;
}

export interface IPedidoCompraVinculoNfe {
  id: string;
  status: string;
  dataPedido: string;
  valorTotal?: string | number;
}

export interface IDocumentoEntradaMercadoriaVinculo {
  id: string;
  numero: string;
  tipoDocumento: string;
  statusRecebimento?: string;
}

export interface INotaEntradaResumo {
  id: string;
  dataEmissao: string;
  numero: string;
  serie: string;
  valorTotalDocumento: number;
  fornecedor?: IFornecedorResumo;
  itens?: IItemNotaResumo[];
  pedidoCompra?: IPedidoCompraVinculoNfe | null;
  documentoEntradaMercadoria?: IDocumentoEntradaMercadoriaVinculo | null;

  statusEstoque?: boolean;
  statusContabil?: boolean;
  statusIntegracaoEstoque?: 'PENDENTE' | 'PROCESSADO' | 'NAO_APLICA';
}

function formatarIdPedidoVisual(id: string): string {
  return id.replace(/-/g, '').slice(0, 8).toUpperCase();
}

interface IPessoaLookup {
  id: string;
  razaoSocial: string;
  nomeFantasia?: string;
  cpfCnpj?: string;
}

interface IProdutoLookup {
  id: string;
  nome: string;
  codigo: string;
}

export function ListarNfe() {
  const navigate = useNavigate();

  const [notas, setNotas] = useState<INotaEntradaResumo[]>([]);
  const [loading, setLoading] = useState(false);

  const [filtros, setFiltros] = useState({
    numero: '',
    dataInicio: '',
    dataFim: '',
    cfop: '',
    fornecedorId: '',
    fornecedorLabel: '',
    produtoId: '',
    produtoLabel: '',
  });

  const [modalFornecedor, setModalFornecedor] = useState(false);
  const [modalProduto, setModalProduto] = useState(false);
  const [buscaFornecedorModal, setBuscaFornecedorModal] = useState('');
  const [buscaProdutoModal, setBuscaProdutoModal] = useState('');
  const [listaFornecedorModal, setListaFornecedorModal] = useState<IPessoaLookup[]>([]);
  const [listaProdutoModal, setListaProdutoModal] = useState<IProdutoLookup[]>([]);
  const [carregandoLookupFornecedor, setCarregandoLookupFornecedor] = useState(false);
  const [carregandoLookupProduto, setCarregandoLookupProduto] = useState(false);

  const [estornoModal, setEstornoModal] = useState<{ id: string; numero: string; serie: string } | null>(null);
  const [estornoEmAndamento, setEstornoEmAndamento] = useState(false);

  const carregarNotas = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filtros.numero) params.append('numero', filtros.numero);
      if (filtros.dataInicio) params.append('dataInicio', filtros.dataInicio);
      if (filtros.dataFim) params.append('dataFim', filtros.dataFim);
      if (filtros.cfop) params.append('cfop', filtros.cfop);
      if (filtros.fornecedorId) params.append('fornecedorId', filtros.fornecedorId);
      if (filtros.produtoId) params.append('produtoId', filtros.produtoId);

      const response = await api.get<INotaEntradaResumo[]>(
        `/api/nfe?${params.toString()}`
      );

      setNotas(response.data);
    } catch (err) {
      const error = err as AxiosError<{ error?: string }>;
      console.error('Erro ao buscar notas', error.response?.data || error.message);
      alert('Erro ao carregar as Notas Fiscais.');
    } finally {
      setLoading(false);
    }
  };

  const carregarListaFornecedores = async (termo: string) => {
    setCarregandoLookupFornecedor(true);
    try {
      const params = new URLSearchParams();
      params.append('tipo', 'FORNECEDOR');
      if (termo.trim()) params.append('busca', termo.trim());
      const res = await api.get<IPessoaLookup[]>(`/api/pessoas?${params.toString()}`);
      setListaFornecedorModal(Array.isArray(res.data) ? res.data : []);
    } catch {
      setListaFornecedorModal([]);
    } finally {
      setCarregandoLookupFornecedor(false);
    }
  };

  const carregarListaProdutos = async (termo: string) => {
    setCarregandoLookupProduto(true);
    try {
      const params = new URLSearchParams();
      if (termo.trim()) params.append('busca', termo.trim());
      const res = await api.get<IProdutoLookup[]>(`/api/produtos?${params.toString()}`);
      setListaProdutoModal(Array.isArray(res.data) ? res.data : []);
    } catch {
      setListaProdutoModal([]);
    } finally {
      setCarregandoLookupProduto(false);
    }
  };

  const abrirModalFornecedor = () => {
    setModalFornecedor(true);
    setBuscaFornecedorModal('');
    void carregarListaFornecedores('');
  };

  const abrirModalProduto = () => {
    setModalProduto(true);
    setBuscaProdutoModal('');
    void carregarListaProdutos('');
  };

  const confirmarEstorno = async () => {
    if (!estornoModal) return;
    setEstornoEmAndamento(true);
    try {
      await api.delete(`/api/nfe/entradas/${estornoModal.id}`);
      setEstornoModal(null);
      await carregarNotas();
    } catch (err) {
      const error = err as AxiosError<{ error?: string }>;
      alert(error.response?.data?.error ?? 'Falha ao estornar a nota.');
    } finally {
      setEstornoEmAndamento(false);
    }
  };

  useEffect(() => {
    carregarNotas();
  }, []);

  const handleLimparFiltros = () => {
    setFiltros({
      numero: '',
      dataInicio: '',
      dataFim: '',
      cfop: '',
      fornecedorId: '',
      fornecedorLabel: '',
      produtoId: '',
      produtoLabel: '',
    });
    setTimeout(carregarNotas, 100);
  };

  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(valor);
  };

  const formatarCnpj = (cnpj?: string) => {
    if (!cnpj) return '-';
    return cnpj.replace(
      /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,
      '$1.$2.$3/$4-$5'
    );
  };

  return (
    <Layout>
      <div className="mx-auto flex h-full max-w-7xl flex-col space-y-6 pb-12">
        <div className="relative overflow-hidden rounded-[30px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(139,92,246,0.16),_transparent_26%),radial-gradient(circle_at_top_right,_rgba(16,185,129,0.10),_transparent_20%),linear-gradient(135deg,_#0b1020_0%,_#08101f_45%,_#0a1224_100%)] p-6 shadow-[0_25px_70px_rgba(0,0,0,0.40)] sm:p-8">
          <div className="pointer-events-none absolute -left-10 top-0 h-52 w-52 rounded-full bg-violet-600/15 blur-[100px]" />
          <div className="pointer-events-none absolute right-0 top-0 h-56 w-56 rounded-full bg-emerald-600/10 blur-[110px]" />

          <div className="relative z-10 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-violet-300">
                <Sparkles className="h-3.5 w-3.5" />
                Inbound Fiscal
              </div>

              <h1 className="flex items-center gap-4 text-3xl font-black tracking-tight text-white">
                <div className="rounded-2xl border border-violet-400/20 bg-violet-500/10 p-3 shadow-[0_0_20px_rgba(139,92,246,0.12)]">
                  <FileText className="h-8 w-8 text-violet-300" />
                </div>
                Gestão de Notas (Entrada)
              </h1>

              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300 sm:text-[15px]">
                Consulte notas de entrada com rastreio P2P: na mesma linha você vê o pedido de compra e o documento
                de mercadoria que fecharam o ciclo com a SEFAZ.
              </p>
            </div>

            <button
              onClick={() => navigate('/estoque/entrada')}
              className="inline-flex items-center gap-2 rounded-2xl border border-emerald-400/20 bg-gradient-to-r from-emerald-600 to-emerald-500 px-6 py-3.5 font-black text-white shadow-[0_0_20px_rgba(16,185,129,0.22)] transition-all hover:scale-[1.02] hover:brightness-110"
            >
              <Plus className="h-5 w-5" />
              Nova Entrada (XML)
            </button>
          </div>
        </div>

        <div className="rounded-[30px] border border-white/10 bg-[#08101f]/90 p-6 shadow-[0_20px_50px_rgba(0,0,0,0.35)] backdrop-blur-xl">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-2xl border border-violet-400/20 bg-violet-500/10 p-2.5">
              <Filter className="h-4 w-4 text-violet-300" />
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-[0.18em] text-white">
                Filtros de Pesquisa
              </h2>
              <p className="text-xs text-slate-400">
                Refine a consulta por documento, fornecedor, período, produto ou CFOP.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-3 lg:grid-cols-6">
            <div>
              <label className="mb-2 block pl-1 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                Nº da Nota
              </label>
              <input
                type="text"
                placeholder="Ex: 1234"
                value={filtros.numero}
                onChange={(e) => setFiltros({ ...filtros, numero: e.target.value })}
                className="w-full rounded-2xl border border-white/10 bg-[#0d182d] px-4 py-3.5 text-sm text-white placeholder:text-slate-500 outline-none shadow-inner transition-all focus:border-violet-400/30 focus:ring-2 focus:ring-violet-500/15"
              />
            </div>

            <div className="lg:col-span-2">
              <label className="mb-2 block pl-1 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                Fornecedor
              </label>
              <button
                type="button"
                onClick={abrirModalFornecedor}
                className="flex w-full items-center justify-between gap-2 rounded-2xl border border-white/10 bg-[#0d182d] px-4 py-3.5 text-left text-sm text-white outline-none transition-all hover:border-violet-400/30 focus:border-violet-400/30 focus:ring-2 focus:ring-violet-500/15"
              >
                <span className={filtros.fornecedorLabel ? 'text-white' : 'text-slate-500'}>
                  {filtros.fornecedorLabel || 'Clique para buscar fornecedor…'}
                </span>
                <Users className="h-4 w-4 shrink-0 text-violet-300" />
              </button>
              {filtros.fornecedorId ? (
                <button
                  type="button"
                  onClick={() =>
                    setFiltros((f) => ({
                      ...f,
                      fornecedorId: '',
                      fornecedorLabel: '',
                    }))
                  }
                  className="mt-1 pl-1 text-[10px] font-bold uppercase tracking-wider text-rose-400 hover:text-rose-300"
                >
                  Limpar fornecedor
                </button>
              ) : null}
            </div>

            <div>
              <label className="mb-2 block pl-1 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                Data Início
              </label>
              <input
                type="date"
                value={filtros.dataInicio}
                onChange={(e) => setFiltros({ ...filtros, dataInicio: e.target.value })}
                className="w-full rounded-2xl border border-white/10 bg-[#0d182d] px-4 py-3.5 text-sm text-white outline-none shadow-inner transition-all focus:border-violet-400/30 focus:ring-2 focus:ring-violet-500/15"
                style={{ colorScheme: 'dark' }}
              />
            </div>

            <div>
              <label className="mb-2 block pl-1 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                Data Fim
              </label>
              <input
                type="date"
                value={filtros.dataFim}
                onChange={(e) => setFiltros({ ...filtros, dataFim: e.target.value })}
                className="w-full rounded-2xl border border-white/10 bg-[#0d182d] px-4 py-3.5 text-sm text-white outline-none shadow-inner transition-all focus:border-violet-400/30 focus:ring-2 focus:ring-violet-500/15"
                style={{ colorScheme: 'dark' }}
              />
            </div>

            <div>
              <label className="mb-2 block pl-1 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                CFOP (Itens)
              </label>
              <input
                type="text"
                placeholder="Ex: 1102"
                value={filtros.cfop}
                onChange={(e) => setFiltros({ ...filtros, cfop: e.target.value })}
                className="w-full rounded-2xl border border-white/10 bg-[#0d182d] px-4 py-3.5 text-sm text-white placeholder:text-slate-500 outline-none shadow-inner transition-all focus:border-violet-400/30 focus:ring-2 focus:ring-violet-500/15"
              />
            </div>

            <div className="lg:col-span-2">
              <label className="mb-2 block pl-1 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                Produto na nota
              </label>
              <button
                type="button"
                onClick={abrirModalProduto}
                className="flex w-full items-center justify-between gap-2 rounded-2xl border border-white/10 bg-[#0d182d] px-4 py-3.5 text-left text-sm text-white outline-none transition-all hover:border-violet-400/30 focus:border-violet-400/30 focus:ring-2 focus:ring-violet-500/15"
              >
                <span className={filtros.produtoLabel ? 'text-white' : 'text-slate-500'}>
                  {filtros.produtoLabel || 'Clique para buscar produto…'}
                </span>
                <Package className="h-4 w-4 shrink-0 text-emerald-300" />
              </button>
              {filtros.produtoId ? (
                <button
                  type="button"
                  onClick={() =>
                    setFiltros((f) => ({
                      ...f,
                      produtoId: '',
                      produtoLabel: '',
                    }))
                  }
                  className="mt-1 pl-1 text-[10px] font-bold uppercase tracking-wider text-rose-400 hover:text-rose-300"
                >
                  Limpar produto
                </button>
              ) : null}
            </div>
          </div>

          <div className="mt-6 flex flex-col justify-end gap-4 border-t border-white/10 pt-5 sm:flex-row">
            <button
              onClick={handleLimparFiltros}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-6 py-3.5 font-bold text-slate-300 transition-all hover:bg-white/10 hover:text-white sm:w-auto"
            >
              <Eraser className="h-4 w-4" />
              Limpar Filtros
            </button>

            <button
              onClick={carregarNotas}
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-violet-400/20 bg-gradient-to-r from-violet-600 to-fuchsia-600 px-8 py-3.5 font-black text-white shadow-[0_0_20px_rgba(139,92,246,0.22)] transition-all hover:scale-[1.02] hover:brightness-110 disabled:opacity-50 disabled:hover:scale-100 sm:w-auto"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Search className="h-5 w-5" />
              )}
              {loading ? 'Buscando...' : 'Aplicar Filtros'}
            </button>
          </div>
        </div>

        <div className="flex-1 space-y-6">
          {loading && notas.length === 0 ? (
            <div className="rounded-[30px] border border-white/10 bg-[#08101f]/90 p-12 text-center shadow-[0_20px_50px_rgba(0,0,0,0.35)]">
              <div className="flex flex-col items-center gap-4">
                <div className="rounded-2xl border border-violet-400/20 bg-violet-500/10 p-4">
                  <Loader2 className="h-8 w-8 animate-spin text-violet-300" />
                </div>
                <p className="text-base font-bold text-slate-300">
                  Buscando notas fiscais...
                </p>
              </div>
            </div>
          ) : notas.length === 0 ? (
            <div className="relative overflow-hidden rounded-[30px] border border-white/10 border-dashed bg-[#08101f]/90 py-20 text-center shadow-[0_20px_50px_rgba(0,0,0,0.35)]">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(139,92,246,0.08),_transparent_28%)]" />
              <div className="relative z-10 flex flex-col items-center">
                <div className="mb-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                  <FileX className="h-12 w-12 text-slate-500" />
                </div>
                <h3 className="mb-2 text-2xl font-black text-white">
                  Nenhuma nota fiscal encontrada
                </h3>
                <p className="max-w-md text-base leading-7 text-slate-400">
                  Tente ajustar os filtros de pesquisa para localizar os documentos desejados.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex-1 min-w-0 overflow-hidden rounded-[30px] border border-white/10 bg-[#08101f]/90 shadow-[0_25px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl">
              <div className="flex items-center justify-between border-b border-white/10 bg-black/10 px-5 py-5">
                <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.18em] text-white">
                  <FileText className="h-4 w-4 text-violet-300" />
                  Notas de entrada registradas
                </h2>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-black text-violet-300">
                  {notas.length} Registros
                </span>
              </div>

              <div className="w-full max-w-full overflow-x-auto overscroll-x-contain">
                <table className="w-full min-w-max text-left">
                  <thead className="sticky top-0 z-10 border-b border-white/10 bg-[#0b1324]">
                    <tr>
                      <th className="whitespace-nowrap p-5 text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                        Data Emissão
                      </th>
                      <th className="whitespace-nowrap p-5 text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                        Nº Nota / Série
                      </th>
                      <th className="min-w-[200px] max-w-[320px] p-5 text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                        Fornecedor
                      </th>
                      <th className="whitespace-nowrap p-5 text-center text-xs font-black uppercase tracking-[0.16em] text-cyan-300/90">
                        Vínculo P2P
                      </th>
                      <th className="whitespace-nowrap p-5 text-center text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                        Qtd Itens
                      </th>
                      <th className="whitespace-nowrap p-5 text-right text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                        Valor Total
                      </th>
                      <th className="whitespace-nowrap p-5 text-center text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                        Integração ERP
                      </th>
                      <th
                        className="sticky right-0 z-30 min-w-[8.5rem] whitespace-nowrap border-l border-white/10 bg-[#0b1324]/95 p-5 text-center text-xs font-black uppercase tracking-[0.12em] text-violet-300/90 shadow-[-10px_0_20px_-6px_rgba(0,0,0,0.65)] backdrop-blur-md"
                        scope="col"
                      >
                        Ações
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-white/5">
                    {notas.map((nota) => {
                      const integ = nota.statusIntegracaoEstoque;
                      const estoqueNaoAplica = integ === 'NAO_APLICA';
                      const estoqueProcessado =
                        !estoqueNaoAplica &&
                        (integ === 'PROCESSADO' || nota.statusEstoque === true);
                      return (
                      <tr
                        key={nota.id}
                        className="group transition-colors hover:bg-white/5"
                      >
                        <td className="whitespace-nowrap p-5 text-sm font-bold text-slate-300">
                          {new Date(nota.dataEmissao).toLocaleDateString('pt-BR', {
                            timeZone: 'UTC',
                          })}
                        </td>

                        <td className="whitespace-nowrap p-5">
                          <span className="text-lg font-black text-white">{nota.numero}</span>
                          <span className="ml-1 text-sm font-bold text-slate-500">
                            / {nota.serie}
                          </span>
                        </td>

                        <td className="min-w-[200px] max-w-[320px] p-5 align-top">
                          <div
                            className="max-w-[300px] truncate font-bold text-slate-200"
                            title={nota.fornecedor?.razaoSocial}
                          >
                            {nota.fornecedor?.razaoSocial || 'Desconhecido'}
                          </div>
                          <div className="mt-1 text-xs font-mono text-slate-400">
                            CNPJ: {formatarCnpj(nota.fornecedor?.cnpjCpf)}
                          </div>
                        </td>

                        <td className="whitespace-nowrap p-5 align-top">
                          <div className="flex min-w-[200px] flex-col items-center gap-2">
                            {nota.pedidoCompra?.id ? (
                              <>
                                <button
                                  type="button"
                                  title="Abrir pedido de compra"
                                  onClick={() =>
                                    navigate('/compras/pedidos', {
                                      state: { highlightPedidoId: nota.pedidoCompra!.id },
                                    })
                                  }
                                  className="inline-flex w-full max-w-[220px] items-center justify-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-500/15 px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-cyan-200 shadow-[0_0_16px_rgba(34,211,238,0.12)] transition-all hover:border-cyan-300/50 hover:bg-cyan-500/25 hover:text-white"
                                >
                                  <Link2 className="h-3.5 w-3.5 shrink-0" />
                                  Pedido #{formatarIdPedidoVisual(nota.pedidoCompra.id)}
                                </button>
                                {nota.documentoEntradaMercadoria?.id ? (
                                  <span
                                    className="text-center text-[9px] font-bold uppercase tracking-widest text-slate-500"
                                    title={`DocumentoEntrada ${nota.documentoEntradaMercadoria.id}`}
                                  >
                                    Doc. entrada #{formatarIdPedidoVisual(nota.documentoEntradaMercadoria.id)}
                                  </span>
                                ) : (
                                  <span className="text-[9px] font-bold uppercase tracking-widest text-slate-600">
                                    Sem doc. mercadoria
                                  </span>
                                )}
                              </>
                            ) : (
                              <span className="text-xs font-bold uppercase tracking-widest text-slate-600">
                                Sem vínculo
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="whitespace-nowrap p-5 text-center text-lg font-black text-violet-300">
                          {nota.itens?.length || 0}
                        </td>

                        <td className="whitespace-nowrap p-5 text-right font-mono text-xl font-black text-emerald-300">
                          {formatarMoeda(nota.valorTotalDocumento)}
                        </td>

                        <td className="whitespace-nowrap p-5 text-center">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <span
                              className={`inline-flex w-[150px] items-center justify-center gap-1 rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] shadow-sm ${
                                estoqueNaoAplica
                                  ? 'border-white/10 bg-white/5 text-slate-400'
                                  : estoqueProcessado
                                    ? 'border-emerald-400/20 bg-emerald-500/10 text-emerald-300'
                                    : 'border-amber-400/20 bg-amber-500/10 text-amber-300'
                              }`}
                            >
                              {estoqueNaoAplica ? (
                                <Minus className="h-3.5 w-3.5" />
                              ) : estoqueProcessado ? (
                                <PackageCheck className="h-3.5 w-3.5" />
                              ) : (
                                <AlertCircle className="h-3.5 w-3.5" />
                              )}
                              {estoqueNaoAplica
                                ? 'Sem integração estoque'
                                : estoqueProcessado
                                  ? 'Estoque atualizado'
                                  : 'Estoque pendente'}
                            </span>

                            <span
                              className={`inline-flex w-[150px] items-center justify-center gap-1 rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] shadow-sm ${
                                nota.statusContabil
                                  ? 'border-sky-400/20 bg-sky-500/10 text-sky-300'
                                  : 'border-white/10 bg-white/5 text-slate-500'
                              }`}
                            >
                              {nota.statusContabil ? (
                                <Database className="h-3.5 w-3.5" />
                              ) : (
                                <AlertCircle className="h-3.5 w-3.5" />
                              )}
                              {nota.statusContabil ? 'Contabilizado' : 'Não Contab.'}
                            </span>
                          </div>
                        </td>

                        <td
                          className="sticky right-0 z-20 whitespace-nowrap border-l border-white/10 bg-[#08101f]/95 p-5 text-center shadow-[-10px_0_20px_-6px_rgba(0,0,0,0.55)] backdrop-blur-md group-hover:bg-[#0a1224]/95"
                        >
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              title="Editar / reconferir nota"
                              onClick={() =>
                                navigate('/entrada-notas', {
                                  state: { editarDocumentoId: nota.id },
                                })
                              }
                              className="rounded-xl border border-white/10 bg-white/5 p-2.5 text-slate-300 transition-all hover:border-violet-400/30 hover:bg-violet-500/15 hover:text-violet-200"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              title="Estornar e excluir nota"
                              onClick={() =>
                                setEstornoModal({
                                  id: nota.id,
                                  numero: nota.numero,
                                  serie: nota.serie,
                                })
                              }
                              className="rounded-xl border border-white/10 bg-white/5 p-2.5 text-slate-400 transition-all hover:border-rose-500/40 hover:bg-rose-500/15 hover:text-rose-200"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {modalFornecedor ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-[#020617]/80 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="lookup-fornecedor-titulo"
        >
          <div className="relative w-full max-w-lg overflow-hidden rounded-[24px] border border-white/10 bg-[#08101f] shadow-[0_25px_80px_rgba(0,0,0,0.55)]">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <h3 id="lookup-fornecedor-titulo" className="text-sm font-black uppercase tracking-[0.14em] text-white">
                Buscar fornecedor
              </h3>
              <button
                type="button"
                onClick={() => setModalFornecedor(false)}
                className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white"
                aria-label="Fechar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-5">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={buscaFornecedorModal}
                  onChange={(e) => setBuscaFornecedorModal(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void carregarListaFornecedores(buscaFornecedorModal);
                  }}
                  placeholder="Razão social, fantasia, CNPJ…"
                  className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#0d182d] px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-violet-400/30 focus:outline-none focus:ring-2 focus:ring-violet-500/15"
                />
                <button
                  type="button"
                  onClick={() => void carregarListaFornecedores(buscaFornecedorModal)}
                  disabled={carregandoLookupFornecedor}
                  className="shrink-0 rounded-xl border border-violet-400/25 bg-violet-500/15 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-violet-200 hover:bg-violet-500/25 disabled:opacity-50"
                >
                  {carregandoLookupFornecedor ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Buscar'}
                </button>
              </div>
              <div className="mt-4 max-h-64 overflow-y-auto rounded-xl border border-white/5 bg-black/20">
                {listaFornecedorModal.length === 0 && !carregandoLookupFornecedor ? (
                  <p className="p-4 text-center text-xs text-slate-500">Nenhum resultado. Ajuste a busca.</p>
                ) : (
                  <ul className="divide-y divide-white/5">
                    {listaFornecedorModal.map((p) => (
                      <li key={p.id}>
                        <button
                          type="button"
                          onClick={() => {
                            const label = p.razaoSocial || p.nomeFantasia || p.cpfCnpj || p.id;
                            setFiltros((f) => ({
                              ...f,
                              fornecedorId: p.id,
                              fornecedorLabel: label,
                            }));
                            setModalFornecedor(false);
                          }}
                          className="flex w-full flex-col items-start gap-0.5 px-4 py-3 text-left text-sm text-slate-200 hover:bg-violet-500/10"
                        >
                          <span className="font-bold text-white">{p.razaoSocial}</span>
                          {p.nomeFantasia ? (
                            <span className="text-xs text-slate-500">{p.nomeFantasia}</span>
                          ) : null}
                          <span className="font-mono text-[11px] text-slate-500">{p.cpfCnpj}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {modalProduto ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-[#020617]/80 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="lookup-produto-titulo"
        >
          <div className="relative w-full max-w-lg overflow-hidden rounded-[24px] border border-white/10 bg-[#08101f] shadow-[0_25px_80px_rgba(0,0,0,0.55)]">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <h3 id="lookup-produto-titulo" className="text-sm font-black uppercase tracking-[0.14em] text-white">
                Buscar produto
              </h3>
              <button
                type="button"
                onClick={() => setModalProduto(false)}
                className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white"
                aria-label="Fechar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-5">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={buscaProdutoModal}
                  onChange={(e) => setBuscaProdutoModal(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void carregarListaProdutos(buscaProdutoModal);
                  }}
                  placeholder="Nome ou código…"
                  className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#0d182d] px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-emerald-400/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/15"
                />
                <button
                  type="button"
                  onClick={() => void carregarListaProdutos(buscaProdutoModal)}
                  disabled={carregandoLookupProduto}
                  className="shrink-0 rounded-xl border border-emerald-400/25 bg-emerald-500/15 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-emerald-200 hover:bg-emerald-500/25 disabled:opacity-50"
                >
                  {carregandoLookupProduto ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Buscar'}
                </button>
              </div>
              <div className="mt-4 max-h-64 overflow-y-auto rounded-xl border border-white/5 bg-black/20">
                {listaProdutoModal.length === 0 && !carregandoLookupProduto ? (
                  <p className="p-4 text-center text-xs text-slate-500">Nenhum resultado. Ajuste a busca.</p>
                ) : (
                  <ul className="divide-y divide-white/5">
                    {listaProdutoModal.map((p) => (
                      <li key={p.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setFiltros((f) => ({
                              ...f,
                              produtoId: p.id,
                              produtoLabel: `${p.codigo} — ${p.nome}`,
                            }));
                            setModalProduto(false);
                          }}
                          className="flex w-full flex-col items-start gap-0.5 px-4 py-3 text-left hover:bg-emerald-500/10"
                        >
                          <span className="text-xs font-mono text-slate-500">{p.codigo}</span>
                          <span className="text-sm font-bold text-white">{p.nome}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {estornoModal ? (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-[#020617]/85 p-4 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md overflow-hidden rounded-[24px] border border-rose-500/30 bg-[#08101f] shadow-[0_25px_80px_rgba(0,0,0,0.6)]">
            <div className="border-b border-rose-500/20 bg-rose-500/10 px-5 py-4">
              <h3 className="text-sm font-black uppercase tracking-[0.16em] text-rose-200">
                Estorno irreversível
              </h3>
            </div>
            <div className="space-y-3 p-5 text-sm leading-relaxed text-slate-300">
              <p>
                Confirma a <strong className="text-white">exclusão e estorno total</strong> da nota{' '}
                <span className="font-mono text-violet-300">
                  {estornoModal.numero}/{estornoModal.serie}
                </span>
                ?
              </p>
              <p className="text-xs text-slate-500">
                O sistema desfará movimentos de estoque, excluirá títulos a pagar em aberto, movimentos fiscais e
                contábeis vinculados. Títulos já liquidados bloqueiam o estorno.
              </p>
            </div>
            <div className="flex flex-col gap-2 border-t border-white/10 bg-black/20 p-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setEstornoModal(null)}
                disabled={estornoEmAndamento}
                className="rounded-xl border border-white/10 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-300 hover:bg-white/5 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void confirmarEstorno()}
                disabled={estornoEmAndamento}
                className="rounded-xl border border-rose-500/40 bg-rose-600/90 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-white hover:bg-rose-600 disabled:opacity-50"
              >
                {estornoEmAndamento ? 'Estornando…' : 'Confirmar estorno'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </Layout>
  );
}