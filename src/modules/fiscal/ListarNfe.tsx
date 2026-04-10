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

export interface INotaEntradaResumo {
  id: string;
  dataEmissao: string;
  numero: string;
  serie: string;
  valorTotalDocumento: number;
  fornecedor?: IFornecedorResumo;
  itens?: IItemNotaResumo[];

  statusEstoque?: boolean;
  statusContabil?: boolean;
}

export function ListarNfe() {
  const navigate = useNavigate();

  const [notas, setNotas] = useState<INotaEntradaResumo[]>([]);
  const [loading, setLoading] = useState(false);

  const [filtros, setFiltros] = useState({
    numero: '',
    fornecedor: '',
    dataInicio: '',
    dataFim: '',
    produto: '',
    cfop: '',
  });

  const carregarNotas = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filtros.numero) params.append('numero', filtros.numero);
      if (filtros.fornecedor) params.append('fornecedor', filtros.fornecedor);
      if (filtros.dataInicio) params.append('dataInicio', filtros.dataInicio);
      if (filtros.dataFim) params.append('dataFim', filtros.dataFim);
      if (filtros.produto) params.append('produto', filtros.produto);
      if (filtros.cfop) params.append('cfop', filtros.cfop);

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

  useEffect(() => {
    carregarNotas();
  }, []);

  const handleLimparFiltros = () => {
    setFiltros({
      numero: '',
      fornecedor: '',
      dataInicio: '',
      dataFim: '',
      produto: '',
      cfop: '',
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
                Consulte e audite todas as compras importadas, com rastreabilidade
                fiscal, vínculo de estoque e contabilização no ERP.
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
                Fornecedor (Razão Social)
              </label>
              <input
                type="text"
                placeholder="Nome do fornecedor"
                value={filtros.fornecedor}
                onChange={(e) => setFiltros({ ...filtros, fornecedor: e.target.value })}
                className="w-full rounded-2xl border border-white/10 bg-[#0d182d] px-4 py-3.5 text-sm text-white placeholder:text-slate-500 outline-none shadow-inner transition-all focus:border-violet-400/30 focus:ring-2 focus:ring-violet-500/15"
              />
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
                Produto Contido na Nota
              </label>
              <input
                type="text"
                placeholder="Nome do produto"
                value={filtros.produto}
                onChange={(e) => setFiltros({ ...filtros, produto: e.target.value })}
                className="w-full rounded-2xl border border-white/10 bg-[#0d182d] px-4 py-3.5 text-sm text-white placeholder:text-slate-500 outline-none shadow-inner transition-all focus:border-violet-400/30 focus:ring-2 focus:ring-violet-500/15"
              />
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
            <div className="flex-1 overflow-hidden rounded-[30px] border border-white/10 bg-[#08101f]/90 shadow-[0_25px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl">
              <div className="flex items-center justify-between border-b border-white/10 bg-black/10 px-5 py-5">
                <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.18em] text-white">
                  <FileText className="h-4 w-4 text-violet-300" />
                  Notas de entrada registradas
                </h2>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-black text-violet-300">
                  {notas.length} Registros
                </span>
              </div>

              <div className="flex-1 overflow-auto">
                <table className="min-w-[1000px] w-full text-left">
                  <thead className="sticky top-0 z-10 border-b border-white/10 bg-[#0b1324]">
                    <tr>
                      <th className="p-5 text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                        Data Emissão
                      </th>
                      <th className="p-5 text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                        Nº Nota / Série
                      </th>
                      <th className="p-5 text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                        Fornecedor
                      </th>
                      <th className="p-5 text-center text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                        Qtd Itens
                      </th>
                      <th className="p-5 text-right text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                        Valor Total
                      </th>
                      <th className="p-5 text-center text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                        Integração ERP
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-white/5">
                    {notas.map((nota) => (
                      <tr
                        key={nota.id}
                        className="transition-colors hover:bg-white/5"
                      >
                        <td className="p-5 text-sm font-bold text-slate-300">
                          {new Date(nota.dataEmissao).toLocaleDateString('pt-BR', {
                            timeZone: 'UTC',
                          })}
                        </td>

                        <td className="p-5">
                          <span className="text-lg font-black text-white">{nota.numero}</span>
                          <span className="ml-1 text-sm font-bold text-slate-500">
                            / {nota.serie}
                          </span>
                        </td>

                        <td className="p-5">
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

                        <td className="p-5 text-center text-lg font-black text-violet-300">
                          {nota.itens?.length || 0}
                        </td>

                        <td className="p-5 text-right font-mono text-xl font-black text-emerald-300">
                          {formatarMoeda(nota.valorTotalDocumento)}
                        </td>

                        <td className="p-5 text-center">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <span
                              className={`inline-flex w-[150px] items-center justify-center gap-1 rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] shadow-sm ${
                                nota.statusEstoque
                                  ? 'border-emerald-400/20 bg-emerald-500/10 text-emerald-300'
                                  : 'border-white/10 bg-white/5 text-slate-500'
                              }`}
                            >
                              {nota.statusEstoque ? (
                                <PackageCheck className="h-3.5 w-3.5" />
                              ) : (
                                <AlertCircle className="h-3.5 w-3.5" />
                              )}
                              {nota.statusEstoque ? 'Estoque OK' : 'Estoque Pendente'}
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
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}