import React, { useState, useEffect } from 'react';
import { Layout } from '../../../components/Layout';
import { api } from '../../../services/api';
import {
  Plus,
  CheckCircle,
  XCircle,
  Clock,
  ShoppingBag,
  Trash2,
  FileText,
  AlertCircle,
  Loader2,
  Sparkles,
  ClipboardList,
} from 'lucide-react';
import { AxiosError } from 'axios';

export interface IProdutoResumo {
  id: string;
  nome: string;
}

export interface IItemSolicitacao {
  produtoId: string;
  quantidade: string | number;
  produto?: IProdutoResumo;
}

export interface ISolicitacaoCompra {
  id: string;
  dataSolicitacao: string | Date;
  dataNecessidade: string | Date;
  observacao?: string;
  status: string;
  solicitante?: { nome: string };
  aprovador?: { nome: string };
  motivoReprovacao?: string;
  itens: IItemSolicitacao[];
}

interface IUsuarioStorage {
  role?: string;
  [key: string]: unknown;
}

export function SolicitacoesCompraPage() {
  const [solicitacoes, setSolicitacoes] = useState<ISolicitacaoCompra[]>([]);
  const [produtos, setProdutos] = useState<IProdutoResumo[]>([]);
  const [isModalNovoAberto, setIsModalNovoAberto] = useState(false);
  const [loading, setLoading] = useState(false);

  const [dataNecessidade, setDataNecessidade] = useState('');
  const [observacao, setObservacao] = useState('');
  const [itensForm, setItensForm] = useState<IItemSolicitacao[]>([]);

  const usuarioLogado = JSON.parse(localStorage.getItem('@PDVUsuario') || '{}') as IUsuarioStorage;
  const isSupervisor =
    usuarioLogado.role === 'GERENTE' ||
    usuarioLogado.role === 'SUPERVISOR' ||
    usuarioLogado.role === 'SUPER_ADMIN';

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    setLoading(true);
    try {
      const [resSol, resProd] = await Promise.all([
        api.get<ISolicitacaoCompra[]>('/api/compras/solicitacoes'),
        api.get<IProdutoResumo[]>('/api/produtos')
      ]);
      setSolicitacoes(resSol.data);
      setProdutos(resProd.data);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const adicionarItemForm = () => {
    setItensForm([...itensForm, { produtoId: '', quantidade: '1' }]);
  };

  const removerItemForm = (index: number) => {
    const novosItens = [...itensForm];
    novosItens.splice(index, 1);
    setItensForm(novosItens);
  };

  const salvarSolicitacao = async () => {
    if (
      !dataNecessidade ||
      itensForm.length === 0 ||
      itensForm.some(i => !i.produtoId || !i.quantidade || Number(i.quantidade) <= 0)
    ) {
      return alert('Preencha a data de necessidade e certifique-se de que todos os itens têm quantidade válida.');
    }

    setLoading(true);
    try {
      await api.post('/api/compras/solicitacoes', {
        dataNecessidade,
        observacao,
        itens: itensForm.map(i => ({ ...i, quantidade: Number(i.quantidade) }))
      });

      alert('✅ Solicitação enviada para supervisão com sucesso!');
      setIsModalNovoAberto(false);
      setItensForm([]);
      setObservacao('');
      setDataNecessidade('');
      carregarDados();
    } catch (err) {
      const error = err as AxiosError<{ error?: string }>;
      alert(error.response?.data?.error || 'Erro ao salvar solicitação.');
      setLoading(false);
    }
  };

  const avaliarSolicitacao = async (id: string, status: 'APROVADA' | 'REPROVADA') => {
    let motivo = '';
    if (status === 'REPROVADA') {
      motivo = window.prompt('Qual o motivo da reprovação?') || '';
      if (!motivo) return;
    } else {
      if (!window.confirm('Confirma a aprovação desta solicitação para ir à cotação?')) return;
    }

    try {
      await api.put(`/api/compras/solicitacoes/${id}/avaliar`, {
        status,
        motivoReprovacao: motivo
      });

      alert(`✅ Solicitação ${status.toLowerCase()} com sucesso!`);
      carregarDados();
    } catch (err) {
      const error = err as AxiosError<{ error?: string }>;
      alert(error.response?.data?.error || 'Erro ao avaliar solicitação.');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'AGUARDANDO_SUPERVISAO':
        return (
          <span className="inline-flex w-max items-center gap-1 rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-amber-300">
            <Clock className="h-3 w-3" />
            Aguardando
          </span>
        );
      case 'APROVADA':
        return (
          <span className="inline-flex w-max items-center gap-1 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-300">
            <CheckCircle className="h-3 w-3" />
            Aprovada
          </span>
        );
      case 'REPROVADA':
        return (
          <span className="inline-flex w-max items-center gap-1 rounded-full border border-rose-400/20 bg-rose-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-rose-300">
            <XCircle className="h-3 w-3" />
            Reprovada
          </span>
        );
      case 'EM_COTACAO':
        return (
          <span className="inline-flex w-max items-center gap-1 rounded-full border border-sky-400/20 bg-sky-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-sky-300">
            <ShoppingBag className="h-3 w-3" />
            Em cotação
          </span>
        );
      default:
        return (
          <span className="inline-flex w-max rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
            {status}
          </span>
        );
    }
  };

  const inputClass =
    'w-full rounded-2xl border border-white/10 bg-[#0d182d] px-4 py-3.5 text-sm text-white placeholder:text-slate-500 outline-none shadow-inner transition-all focus:border-violet-400/30 focus:ring-2 focus:ring-violet-500/15';
  const labelClass =
    'mb-2 block pl-1 text-xs font-bold uppercase tracking-[0.16em] text-slate-400';

  return (
    <Layout>
      <style>{`
        @keyframes modalEnter {
          from { opacity: 0; transform: scale(0.96) translateY(10px); }
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
                Purchase Request Flow
              </div>

              <h1 className="flex items-center gap-4 text-3xl font-black tracking-tight text-white">
                <div className="rounded-2xl border border-violet-400/20 bg-violet-500/10 p-3 shadow-[0_0_20px_rgba(139,92,246,0.12)]">
                  <FileText className="h-8 w-8 text-violet-300" />
                </div>
                Solicitações de Compra
              </h1>

              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300 sm:text-[15px]">
                Fluxo de requisição interna de mercadorias e insumos para aprovação,
                cotação e continuidade da cadeia de compras.
              </p>
            </div>

            <button
              onClick={() => setIsModalNovoAberto(true)}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-violet-400/20 bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-3.5 font-black text-white shadow-[0_0_20px_rgba(139,92,246,0.22)] transition-all hover:scale-[1.02] hover:brightness-110"
            >
              <Plus className="h-5 w-5" />
              Nova Solicitação
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="h-8 w-2 rounded-full bg-gradient-to-b from-violet-400 to-fuchsia-500" />
          <div>
            <h2 className="text-xl font-black tracking-tight text-white">
              Histórico de solicitações
            </h2>
            <p className="text-sm text-slate-400">
              Acompanhe o envio, avaliação e evolução das requisições internas.
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-hidden rounded-[30px] border border-white/10 bg-[#08101f]/90 shadow-[0_20px_50px_rgba(0,0,0,0.35)] backdrop-blur-xl">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left">
              <thead className="border-b border-white/10 bg-black/10">
                <tr>
                  <th className="p-5 text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                    ID / Data
                  </th>
                  <th className="p-5 text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                    Solicitante
                  </th>
                  <th className="p-5 text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                    Itens (Resumo)
                  </th>
                  <th className="p-5 text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                    Prazo Desejado
                  </th>
                  <th className="p-5 text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                    Status
                  </th>
                  {isSupervisor && (
                    <th className="p-5 text-right text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                      Ações (Supervisor)
                    </th>
                  )}
                </tr>
              </thead>

              <tbody className="divide-y divide-white/5">
                {loading && solicitacoes.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-12 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <div className="rounded-2xl border border-violet-400/20 bg-violet-500/10 p-4">
                          <Loader2 className="h-8 w-8 animate-spin text-violet-300" />
                        </div>
                        <p className="text-base font-bold text-slate-300">
                          Carregando solicitações...
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : solicitacoes.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-16 text-center">
                      <div className="flex flex-col items-center">
                        <div className="mb-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                          <AlertCircle className="h-12 w-12 text-slate-500" />
                        </div>
                        <p className="text-lg font-black text-white">
                          Nenhuma solicitação encontrada
                        </p>
                        <p className="mt-1 text-slate-400">
                          Sua equipe ainda não solicitou nenhuma compra.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  solicitacoes.map(sol => (
                    <tr key={sol.id} className="transition-colors hover:bg-white/5">
                      <td className="p-5">
                        <p className="text-base font-black text-white">
                          #{sol.id.substring(0, 6).toUpperCase()}
                        </p>
                        <p className="mt-0.5 text-xs font-medium text-slate-500">
                          {new Date(sol.dataSolicitacao).toLocaleDateString('pt-BR')}
                        </p>
                      </td>

                      <td className="p-5 font-bold text-slate-300">
                        {sol.solicitante?.nome || 'Desconhecido'}
                      </td>

                      <td className="p-5">
                        <span className="text-sm font-black text-violet-300">
                          {sol.itens.length} produto(s)
                        </span>
                        <span className="mt-1 block max-w-[220px] truncate text-xs text-slate-500">
                          Ex: {sol.itens[0]?.produto?.nome} {sol.itens.length > 1 ? '...' : ''}
                        </span>
                      </td>

                      <td className="p-5 font-bold text-slate-300">
                        {new Date(sol.dataNecessidade).toLocaleDateString('pt-BR')}
                      </td>

                      <td className="p-5">{getStatusBadge(sol.status)}</td>

                      {isSupervisor && (
                        <td className="p-5 text-right">
                          {sol.status === 'AGUARDANDO_SUPERVISAO' ? (
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => avaliarSolicitacao(sol.id, 'APROVADA')}
                                className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-2.5 text-emerald-300 transition-all hover:bg-emerald-500/15"
                                title="Aprovar"
                              >
                                <CheckCircle className="h-5 w-5" />
                              </button>

                              <button
                                onClick={() => avaliarSolicitacao(sol.id, 'REPROVADA')}
                                className="rounded-xl border border-rose-400/20 bg-rose-500/10 p-2.5 text-rose-300 transition-all hover:bg-rose-500/15"
                                title="Reprovar"
                              >
                                <XCircle className="h-5 w-5" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs font-bold italic text-slate-600">
                              Avaliado
                            </span>
                          )}
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {isModalNovoAberto && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#020617]/80 p-4 backdrop-blur-md">
            <div className="animate-modal relative flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-[30px] border border-white/10 bg-[#08101f]/95 shadow-[0_25px_80px_rgba(0,0,0,0.65)]">
              <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-violet-400" />

              <div className="flex items-start justify-between gap-4 border-b border-white/10 bg-black/10 px-6 py-6 sm:px-8">
                <div>
                  <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-violet-300">
                    <Sparkles className="h-3.5 w-3.5" />
                    Nova requisição
                  </div>

                  <h2 className="text-xl font-black tracking-tight text-white">
                    Nova Solicitação de Compra
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-slate-400">
                    Preencha os itens que você precisa que o setor de compras cote.
                  </p>
                </div>

                <button
                  onClick={() => setIsModalNovoAberto(false)}
                  className="rounded-full border border-white/10 bg-white/5 p-2 text-slate-400 transition-all hover:border-white/15 hover:bg-white/10 hover:text-white"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>

              <div className="custom-scrollbar flex-1 space-y-6 overflow-y-auto px-6 py-6 sm:px-8">
                <div className="grid grid-cols-1 gap-5 rounded-2xl border border-white/10 bg-black/10 p-5 md:grid-cols-2">
                  <div>
                    <label className={labelClass}>Data de Necessidade *</label>
                    <input
                      type="date"
                      value={dataNecessidade}
                      onChange={e => setDataNecessidade(e.target.value)}
                      className={inputClass}
                      style={{ colorScheme: 'dark' }}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Observação / Justificativa</label>
                    <input
                      type="text"
                      value={observacao}
                      onChange={e => setObservacao(e.target.value)}
                      placeholder="Ex: Reposição para o final de semana"
                      className={inputClass}
                    />
                  </div>
                </div>

                <div className="pt-1">
                  <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <h3 className="flex items-center gap-2 text-lg font-black tracking-tight text-white">
                      <ClipboardList className="h-5 w-5 text-violet-300" />
                      Produtos solicitados
                    </h3>

                    <button
                      onClick={adicionarItemForm}
                      className="inline-flex items-center gap-2 rounded-2xl border border-violet-400/20 bg-violet-500/10 px-4 py-2 text-sm font-bold text-violet-300 transition-all hover:bg-violet-500/15"
                    >
                      <Plus className="h-4 w-4" />
                      Adicionar Item
                    </button>
                  </div>

                  <div className="space-y-3">
                    {itensForm.map((item, index) => (
                      <div
                        key={index}
                        className="flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-black/10 p-4 sm:flex-row"
                      >
                        <div className="w-full sm:flex-1">
                          <label className="mb-1 block text-xs font-bold text-slate-400 sm:hidden">
                            Produto
                          </label>
                          <select
                            value={item.produtoId}
                            onChange={e => {
                              const novosItens = [...itensForm];
                              novosItens[index].produtoId = e.target.value;
                              setItensForm(novosItens);
                            }}
                            className={inputClass}
                          >
                            <option value="">Selecione um produto do catálogo...</option>
                            {produtos.map(p => (
                              <option key={p.id} value={p.id}>
                                {p.nome}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="w-full sm:w-36">
                          <label className="mb-1 block text-xs font-bold text-slate-400 sm:hidden">
                            Quantidade
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={item.quantidade}
                            onChange={e => {
                              const novosItens = [...itensForm];
                              novosItens[index].quantidade = e.target.value;
                              setItensForm(novosItens);
                            }}
                            placeholder="Qtd"
                            className={`${inputClass} text-center font-bold`}
                          />
                        </div>

                        <button
                          onClick={() => removerItemForm(index)}
                          className="flex w-full items-center justify-center rounded-2xl border border-white/10 bg-white/5 p-3.5 text-slate-400 transition-all hover:border-rose-400/20 hover:bg-rose-500/10 hover:text-rose-300 sm:w-auto"
                          title="Remover item"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    ))}

                    {itensForm.length === 0 && (
                      <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-white/10 bg-black/10 py-12">
                        <ShoppingBag className="mb-3 h-10 w-10 text-slate-600" />
                        <p className="text-sm font-bold text-slate-400">
                          Nenhum produto adicionado à lista.
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Clique em "Adicionar Item" para começar.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex shrink-0 flex-col gap-3 border-t border-white/10 bg-black/10 px-6 py-5 sm:flex-row sm:justify-end sm:px-8">
                <button
                  onClick={() => setIsModalNovoAberto(false)}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-6 py-3.5 font-bold text-slate-300 transition-all hover:bg-white/10 hover:text-white sm:w-auto"
                >
                  Cancelar
                </button>

                <button
                  onClick={salvarSolicitacao}
                  disabled={loading}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-violet-400/20 bg-gradient-to-r from-violet-600 to-fuchsia-600 px-8 py-3.5 font-black text-white shadow-[0_0_20px_rgba(139,92,246,0.22)] transition-all hover:scale-[1.02] hover:brightness-110 disabled:opacity-50 sm:w-auto"
                >
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <CheckCircle className="h-5 w-5" />
                  )}
                  {loading ? 'Enviando...' : 'Enviar Solicitação'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}