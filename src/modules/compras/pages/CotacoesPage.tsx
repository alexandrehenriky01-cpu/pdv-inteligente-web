import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '../../../components/Layout';
import { api } from '../../../services/api';
import {
  Calculator,
  CheckCircle,
  Truck,
  DollarSign,
  Loader2,
  AlertCircle,
  XCircle,
  Sparkles,
  ClipboardList,
  CircleDollarSign,
} from 'lucide-react';
import { AxiosError } from 'axios';

export interface IProdutoResumo {
  id: string;
  nome: string;
}

export interface IItemSolicitacao {
  id: string;
  produtoId: string;
  quantidade: string | number;
  quantidadeAprovada?: string | number;
  produto?: IProdutoResumo;
}

export interface ISolicitacaoPendente {
  id: string;
  status?: string;
  dataNecessidade: string | Date;
  solicitante?: { nome: string };
  itens: IItemSolicitacao[];
}

export interface IFornecedorResumo {
  id: string;
  razaoSocial: string;
  nomeFantasia?: string;
  tipo: string;
  // 🚀 NOVOS CAMPOS ADICIONADOS AQUI
  cpfCnpj?: string;
  cidade?: string;
}

export interface ICotacaoResponse {
  cotacao: {
    id: string;
    itens?: Array<{ id: string }>;
  };
}

export function CotacoesPage() {
  const [solicitacoes, setSolicitacoes] = useState<ISolicitacaoPendente[]>([]);
  const [fornecedores, setFornecedores] = useState<IFornecedorResumo[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [isModalAberto, setIsModalAberto] = useState(false);
  const [solicitacaoSelecionada, setSolicitacaoSelecionada] = useState<ISolicitacaoPendente | null>(null);
  const [fornecedorId, setFornecedorId] = useState('');
  const [precos, setPrecos] = useState<Record<string, string>>({});
  const [apenasRegistrarCotacao, setApenasRegistrarCotacao] = useState(false);
  const [observacoesCotacao, setObservacoesCotacao] = useState('');
  const [condicaoPagamentoCotacao, setCondicaoPagamentoCotacao] = useState('');
  const [prazoEntregaCotacao, setPrazoEntregaCotacao] = useState('');

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    setLoading(true);
    try {
      const [resSol, resForn] = await Promise.all([
        api.get<ISolicitacaoPendente[]>('/api/compras/solicitacoes-aprovadas'),
        api.get<IFornecedorResumo[]>('/api/pessoas').catch(() => ({ data: [] as IFornecedorResumo[] }))
      ]);

      setSolicitacoes(resSol.data);

      const fornecedoresValidos = resForn.data.filter((p) =>
        ['FORNECEDOR', 'AMBOS'].includes(p.tipo)
      );
      setFornecedores(fornecedoresValidos);
    } catch (error) {
      console.error('Erro ao carregar dados de cotações:', error);
    } finally {
      setLoading(false);
    }
  };

  const abrirModalCotacao = (solicitacao: ISolicitacaoPendente) => {
    setSolicitacaoSelecionada(solicitacao);
    setPrecos({});
    setFornecedorId('');
    setApenasRegistrarCotacao(false);
    setObservacoesCotacao('');
    setCondicaoPagamentoCotacao('');
    setPrazoEntregaCotacao('');
    setIsModalAberto(true);
  };

  const handlePrecoChange = (produtoId: string, valor: string) => {
    setPrecos(prev => ({ ...prev, [produtoId]: valor }));
  };

  const salvarCotacao = async () => {
    if (!fornecedorId) return alert('Selecione um fornecedor.');
    if (!solicitacaoSelecionada) return;

    const itensCotacao = solicitacaoSelecionada.itens.map(item => ({
      itemSolicitacaoId: item.id,
      produtoId: item.produtoId,
      fornecedorId: fornecedorId,
      quantidade: Number(item.quantidadeAprovada ?? item.quantidade), 
      valorUnitario: Number(precos[item.produtoId]) || 0
    }));

    if (itensCotacao.some(i => i.valorUnitario <= 0)) {
      return alert('Preencha o valor unitário de todos os itens com valores maiores que zero.');
    }

    setSaving(true);
    try {
      const u = (s: string) => s.trim().toUpperCase();
      const resCotacao = await api.post<ICotacaoResponse>('/api/compras/cotacoes', {
        observacao: `COTAÇÃO SC #${solicitacaoSelecionada.id.substring(0, 6)}`,
        observacoes: observacoesCotacao.trim() ? u(observacoesCotacao) : null,
        condicaoPagamento: condicaoPagamentoCotacao.trim() ? u(condicaoPagamentoCotacao) : null,
        prazoEntrega: prazoEntregaCotacao.trim() ? u(prazoEntregaCotacao) : null,
        solicitacaoIds: [solicitacaoSelecionada.id],
        itensCotacao
      });

      const itensVencedoresIds = resCotacao.data.cotacao.itens?.map(i => i.id) || [];

      if (!apenasRegistrarCotacao && itensVencedoresIds.length > 0) {
        await api.put(`/api/compras/cotacoes/${resCotacao.data.cotacao.id}/finalizar`, {
          itensVencedoresIds
        });
      }

      alert(
        apenasRegistrarCotacao
          ? '✅ Cotação registrada. Use Gerenciar Cotações para comparar fornecedores e gerar pedidos otimizados.'
          : '✅ Cotação registrada e Pedido de Compra gerado para aprovação da Diretoria!'
      );
      setIsModalAberto(false);
      carregarDados();
    } catch (err) {
      const error = err as AxiosError<{ error?: string }>;
      alert(error.response?.data?.error || 'Erro ao registrar cotação.');
    } finally {
      setSaving(false);
    }
  };

  // 🚀 FUNÇÃO PARA FORMATAR O TEXTO DO FORNECEDOR NO SELECT
  const formatarNomeFornecedor = (f: IFornecedorResumo) => {
    const nome = f.nomeFantasia || f.razaoSocial;
    const doc = f.cpfCnpj ? ` | CNPJ: ${f.cpfCnpj}` : '';
    const cid = f.cidade ? ` | ${f.cidade}` : '';
    return `${nome}${doc}${cid}`;
  };

  const inputClass =
    'w-full rounded-2xl border border-white/10 bg-[#0d182d] px-4 py-3.5 text-sm text-white placeholder:text-slate-500 outline-none shadow-inner transition-all focus:border-violet-400/30 focus:ring-2 focus:ring-violet-500/15';

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

      <div className="mx-auto max-w-7xl space-y-8 pb-12">
        <div className="relative overflow-hidden rounded-[30px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(139,92,246,0.16),_transparent_26%),linear-gradient(135deg,_#0b1020_0%,_#08101f_45%,_#0a1224_100%)] p-6 shadow-[0_25px_70px_rgba(0,0,0,0.40)] sm:p-8">
          <div className="pointer-events-none absolute -left-10 top-0 h-52 w-52 rounded-full bg-violet-600/15 blur-[100px]" />
          <div className="pointer-events-none absolute right-0 top-0 h-56 w-56 rounded-full bg-fuchsia-600/10 blur-[110px]" />

          <div className="relative z-10 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-violet-300">
                <Sparkles className="h-3.5 w-3.5" />
                Supply Chain Intelligence
              </div>

              <Link
                to="/compras/gerenciar-cotacoes"
                className="mb-3 inline-flex rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-amber-200 hover:bg-amber-500/20"
              >
                🏆 Análise de cotação & comparar propostas → Gerenciar cotações
              </Link>

              <h1 className="flex items-center gap-4 text-3xl font-black tracking-tight text-white">
                <div className="rounded-2xl border border-violet-400/20 bg-violet-500/10 p-3 shadow-[0_0_20px_rgba(139,92,246,0.12)]">
                  <Calculator className="h-8 w-8 text-violet-300" />
                </div>
                Cotações de Preço
              </h1>

              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300 sm:text-[15px]">
                Transforme solicitações aprovadas em cotações organizadas e gere pedidos
                de compra com mais velocidade, rastreabilidade e padrão operacional.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="h-8 w-2 rounded-full bg-gradient-to-b from-violet-400 to-fuchsia-500" />
          <div>
            <h2 className="text-xl font-black tracking-tight text-white">
              Gerar cotação
            </h2>
            <p className="text-sm text-slate-400">
              Solicitações <strong className="text-slate-200">aprovadas</strong> ou{' '}
              <strong className="text-slate-200">em cotação</strong> (novas propostas). Aprovação da supervisão é feita em
              Aprovação de Compras.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {loading && solicitacoes.length === 0 ? (
            <div className="lg:col-span-2 rounded-[30px] border border-white/10 bg-[#08101f]/90 p-12 text-center shadow-[0_20px_50px_rgba(0,0,0,0.35)]">
              <div className="flex flex-col items-center gap-4">
                <div className="rounded-2xl border border-violet-400/20 bg-violet-500/10 p-4">
                  <Loader2 className="h-8 w-8 animate-spin text-violet-300" />
                </div>
                <p className="text-base font-bold text-slate-300">
                  Buscando solicitações aprovadas...
                </p>
              </div>
            </div>
          ) : solicitacoes.length === 0 ? (
            <div className="lg:col-span-2 relative overflow-hidden rounded-[30px] border border-white/10 border-dashed bg-[#08101f]/90 py-20 text-center shadow-[0_20px_50px_rgba(0,0,0,0.35)]">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(139,92,246,0.12),_transparent_30%)]" />
              <div className="relative z-10 flex flex-col items-center">
                <div className="mb-4 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4">
                  <CheckCircle className="h-12 w-12 text-emerald-300" />
                </div>
                <h3 className="mb-2 text-2xl font-black text-white">
                  Tudo em dia!
                </h3>
                <p className="max-w-md text-base leading-7 text-slate-400">
                  Não há solicitações de compra aguardando cotação no momento.
                </p>
              </div>
            </div>
          ) : (
            solicitacoes.map(sol => (
              <div
                key={sol.id}
                className="group rounded-[30px] border border-white/10 bg-[#08101f]/90 p-6 shadow-[0_20px_50px_rgba(0,0,0,0.35)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-violet-400/20"
              >
                <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <span
                      className={`mb-3 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${
                        sol.status === 'EM_COTACAO'
                          ? 'border-sky-400/25 bg-sky-500/10 text-sky-300'
                          : 'border-emerald-400/20 bg-emerald-500/10 text-emerald-300'
                      }`}
                    >
                      <CheckCircle className="h-3.5 w-3.5" />
                      {sol.status === 'EM_COTACAO'
                        ? 'Em cotação — nova proposta'
                        : 'SC aprovada'}
                    </span>

                    <h3 className="text-xl font-black tracking-tight text-white">
                      SC #{sol.id.substring(0, 6).toUpperCase()}
                    </h3>

                    <p className="mt-1 text-sm font-medium text-slate-400">
                      Solicitante:{' '}
                      <span className="text-slate-300">{sol.solicitante?.nome}</span>
                    </p>
                  </div>

                  <button
                    onClick={() => abrirModalCotacao(sol)}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-violet-400/20 bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-3 text-sm font-black uppercase tracking-wide text-white shadow-[0_0_20px_rgba(139,92,246,0.20)] transition-all hover:scale-[1.02] hover:brightness-110"
                  >
                    <CircleDollarSign className="h-4 w-4" />
                    Gerar cotação
                  </button>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/10 p-5">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                      {sol.itens.length} itens aprovados
                    </p>
                    <ClipboardList className="h-4 w-4 text-violet-400" />
                  </div>

                  <ul className="space-y-2.5">
                    {sol.itens.map(item => (
                      <li
                        key={item.id}
                        className="flex items-center justify-between gap-3 border-b border-white/5 pb-2.5 last:border-0 last:pb-0"
                      >
                        <span className="text-sm font-medium text-slate-300">
                          {item.produto?.nome}
                        </span>

                        <span className="rounded-xl border border-violet-400/15 bg-violet-500/10 px-2.5 py-1 text-xs font-black text-violet-300">
                          {Number(item.quantidadeAprovada ?? item.quantidade)} un
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))
          )}
        </div>

        {isModalAberto && solicitacaoSelecionada && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#020617]/80 p-4 backdrop-blur-md">
            <div className="animate-modal relative flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-[30px] border border-white/10 bg-[#08101f]/95 shadow-[0_25px_80px_rgba(0,0,0,0.65)]">
              <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-violet-400" />

              <div className="flex items-start justify-between gap-4 border-b border-white/10 bg-black/10 px-6 py-6 sm:px-8">
                <div>
                  <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-violet-300">
                    <Sparkles className="h-3.5 w-3.5" />
                    Registro de cotação
                  </div>

                  <h2 className="text-2xl font-black tracking-tight text-white">
                    Registrar Cotação
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-slate-400">
                    Insira os valores negociados com o fornecedor para gerar o pedido.
                  </p>
                </div>

                <button
                  onClick={() => setIsModalAberto(false)}
                  className="rounded-full border border-white/10 bg-white/5 p-2 text-slate-400 transition-all hover:border-white/15 hover:bg-white/10 hover:text-white"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>

              <div className="custom-scrollbar flex-1 space-y-6 overflow-y-auto px-6 py-6 sm:px-8">
                <div className="rounded-2xl border border-white/10 bg-black/10 p-5">
                  <label className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                    <Truck className="h-4 w-4 text-violet-300" />
                    Fornecedor escolhido
                  </label>

                  {/* 🚀 SELECT ATUALIZADO PARA MOSTRAR CNPJ E CIDADE */}
                  <select
                    value={fornecedorId}
                    onChange={e => setFornecedorId(e.target.value)}
                    className={inputClass}
                  >
                    <option value="">Selecione o fornecedor na lista...</option>
                    {fornecedores.map(f => (
                      <option key={f.id} value={f.id}>
                        {formatarNomeFornecedor(f)}
                      </option>
                    ))}
                  </select>
                </div>

                <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-100">
                  <input
                    type="checkbox"
                    checked={apenasRegistrarCotacao}
                    onChange={e => setApenasRegistrarCotacao(e.target.checked)}
                    className="h-4 w-4 accent-amber-500"
                  />
                  <span>
                    Apenas registrar cotação (não gerar pedido agora). Use para comparar vários
                    fornecedores na tela <strong>Gerenciar Cotações</strong>.
                  </span>
                </label>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                      Observações da cotação
                    </label>
                    <input
                      value={observacoesCotacao}
                      onChange={e => setObservacoesCotacao(e.target.value)}
                      className={inputClass}
                      placeholder="Detalhes da negociação"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                      Condição de pagamento
                    </label>
                    <input
                      value={condicaoPagamentoCotacao}
                      onChange={e => setCondicaoPagamentoCotacao(e.target.value)}
                      className={inputClass}
                      placeholder="Ex: 30/60 DDL"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                      Prazo de entrega
                    </label>
                    <input
                      value={prazoEntregaCotacao}
                      onChange={e => setPrazoEntregaCotacao(e.target.value)}
                      className={inputClass}
                      placeholder="Ex: 7 DIAS ÚTEIS"
                    />
                  </div>
                </div>

                <div>
                  <h3 className="mb-4 flex items-center gap-2 text-lg font-black tracking-tight text-white">
                    <DollarSign className="h-5 w-5 text-emerald-300" />
                    Preços negociados
                  </h3>

                  <div className="space-y-4">
                    {solicitacaoSelecionada.itens.map(item => {
                      const qtd = Number(item.quantidadeAprovada ?? item.quantidade) || 0;
                      const valorUnit = Number(precos[item.produtoId]) || 0;
                      const subtotal = qtd * valorUnit;

                      return (
                        <div
                          key={item.id}
                          className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-black/10 p-5 transition-colors hover:border-violet-400/15 sm:flex-row sm:items-center"
                        >
                          <div className="flex-1">
                            <p className="text-base font-bold text-white">
                              {item.produto?.nome}
                            </p>
                            <p className="mt-1 inline-flex rounded-lg border border-white/10 bg-[#0b1324] px-2.5 py-1 text-xs font-medium text-slate-400">
                              Qtd aprovada:{' '}
                              <strong className="ml-1 text-violet-300">{qtd} un</strong>
                            </p>
                          </div>

                          <div className="w-full shrink-0 sm:w-44">
                            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                              Valor Unit. (R$)
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              min="0.01"
                              value={precos[item.produtoId] || ''}
                              onChange={e => handlePrecoChange(item.produtoId, e.target.value)}
                              className="w-full rounded-2xl border border-white/10 bg-[#0d182d] px-4 py-3 text-sm font-black text-emerald-300 outline-none shadow-inner transition-all focus:border-emerald-400/30 focus:ring-2 focus:ring-emerald-500/15"
                              placeholder="0.00"
                            />
                          </div>

                          <div className="w-full shrink-0 rounded-2xl border border-white/10 bg-[#0b1324] p-3.5 sm:w-36 sm:text-right">
                            <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                              Subtotal
                            </label>
                            <p className="text-lg font-black text-white">
                              R$ {subtotal.toFixed(2)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="flex shrink-0 flex-col gap-3 border-t border-white/10 bg-black/10 px-6 py-5 sm:flex-row sm:justify-end sm:px-8">
                <button
                  onClick={() => setIsModalAberto(false)}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-6 py-3.5 font-bold text-slate-300 transition-all hover:bg-white/10 hover:text-white sm:w-auto"
                >
                  Cancelar
                </button>

                <button
                  onClick={salvarCotacao}
                  disabled={saving}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-emerald-400/20 bg-gradient-to-r from-emerald-600 to-emerald-500 px-8 py-3.5 font-black text-white shadow-[0_0_25px_rgba(16,185,129,0.22)] transition-all hover:scale-[1.02] hover:brightness-110 disabled:opacity-50 disabled:hover:scale-100 sm:w-auto"
                >
                  {saving ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <CheckCircle className="h-5 w-5" />
                  )}
                  {saving
                    ? 'Salvando...'
                    : apenasRegistrarCotacao
                      ? 'Salvar cotação'
                      : 'Gerar Pedido de Compra'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}