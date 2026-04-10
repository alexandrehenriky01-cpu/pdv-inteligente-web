import React, { useState, useEffect } from 'react';
import { api } from '../../../services/api';
import { Layout } from '../../../components/Layout';
import {
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle,
  Clock,
  DollarSign,
  Plus,
  X,
  Edit2,
  Trash2,
  Lock,
  RotateCcw,
  AlertTriangle,
  Search,
  HandCoins,
  Loader2,
  FileX,
  Sparkles,
  Landmark,
  Filter,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { AxiosError } from 'axios';

export interface IPessoaResumo {
  nome: string;
}

export interface ITitulo {
  id: string;
  descricao: string;
  observacao?: string;
  tipo: 'RECEBER' | 'PAGAR';
  valor: number;
  saldoDevedor: number;
  dataVencimento: string;
  dataEmissao?: string;
  status: 'PENDENTE' | 'PAGO' | 'ATRASADO' | 'PAGO_TOTAL' | 'ABERTO' | 'CONCLUIDO' | string;
  pessoa: IPessoaResumo;
  origem: 'MANUAL' | 'PDV' | 'NFE' | string;
  planoContas: string;
}

export interface IPlanoContaResumo {
  id: string;
  codigoEstrutural: string;
  nomeConta: string;
  natureza: 'DEVEDORA' | 'CREDORA';
  grupo: 'BALANCO' | 'DRE';
}

export interface IContaBancaria {
  id: string;
  descricao: string;
}

export function GestaoTitulosPage() {
  const [titulos, setTitulos] = useState<ITitulo[]>([]);
  const [planosContas, setPlanosContas] = useState<IPlanoContaResumo[]>([]);
  const [contasBancarias, setContasBancarias] = useState<IContaBancaria[]>([]);
  const [loading, setLoading] = useState(false);

  // ==========================================
  // 🚀 ESTADOS DOS FILTROS AVANÇADOS
  // ==========================================
  const [busca, setBusca] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<'TODOS' | 'RECEBER' | 'PAGAR'>('TODOS');
  const [filtroStatus, setFiltroStatus] = useState<'TODOS' | 'ABERTOS' | 'PAGOS' | 'VENCIDOS'>('TODOS');
  const [filtroValorMin, setFiltroValorMin] = useState('');
  const [filtroValorMax, setFiltroValorMax] = useState('');
  const [filtroDataEmissaoInicio, setFiltroDataEmissaoInicio] = useState('');
  const [filtroDataEmissaoFim, setFiltroDataEmissaoFim] = useState('');
  const [filtroDataVencimentoInicio, setFiltroDataVencimentoInicio] = useState('');
  const [filtroDataVencimentoFim, setFiltroDataVencimentoFim] = useState('');
  const [filtroOrigem, setFiltroOrigem] = useState('TODAS');
  const [showFiltrosAvancados, setShowFiltrosAvancados] = useState(false);

  // ==========================================
  // 🚀 ESTADOS DOS MODAIS
  // ==========================================
  const [isNovoModalOpen, setIsNovoModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isBaixaModalOpen, setIsBaixaModalOpen] = useState(false);
  const [tituloSelecionado, setTituloSelecionado] = useState<ITitulo | null>(null);
  const [saving, setSaving] = useState(false);

  // Estados de Formulário
  const [valorBaixa, setValorBaixa] = useState('');
  const [dataBaixa, setDataBaixa] = useState('');
  const [formaPagamento, setFormaPagamento] = useState('PIX');
  const [contaBancaria, setContaBancaria] = useState('');

  const [novoDescricao, setNovoDescricao] = useState('');
  const [novoTipo, setNovoTipo] = useState<'RECEBER' | 'PAGAR'>('PAGAR');
  const [novoValor, setNovoValor] = useState('');
  const [novoVencimento, setNovoVencimento] = useState('');
  const [novoPlanoContasId, setNovoPlanoContasId] = useState('');

  const isPago = (status: string) => ['PAGO', 'PAGO_TOTAL', 'CONCLUIDO', 'BAIXADO'].includes(status?.toUpperCase() || '');
  const isPendente = (status: string) => ['PENDENTE', 'ABERTO'].includes(status?.toUpperCase() || '');
  const isAtrasado = (status: string) => ['ATRASADO', 'VENCIDO'].includes(status?.toUpperCase() || '');

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    setLoading(true);
    try {
      const [resTitulos, resContas, resCaixas] = await Promise.all([
        api.get<ITitulo[]>('/api/financeiro/titulos'),
        api.get<IPlanoContaResumo[]>('/api/contabilidade/planos').catch(() => ({ data: [] as IPlanoContaResumo[] })),
        // ✅ CORREÇÃO: Apontando para a nova rota de caixas dentro do módulo financeiro
        api.get<IContaBancaria[]>('/api/financeiro/caixas').catch(() => ({ data: [] as IContaBancaria[] }))
      ]);

      setTitulos(resTitulos.data);
      setPlanosContas(resContas.data);
      setContasBancarias(resCaixas.data);

      if (resCaixas.data.length > 0) {
        setContaBancaria(resCaixas.data[0].id);
      }
    } catch (err) {
      const error = err as AxiosError<{ error?: string }>;
      console.error('Erro ao buscar dados:', error.response?.data || error.message);
    } finally {
      setLoading(false);
    }
  }

  async function salvarNovoTitulo() {
    if (!novoDescricao || !novoValor || !novoVencimento) {
      alert('Preencha descrição, valor e vencimento!');
      return;
    }

    setSaving(true);
    try {
      await api.post<{ message?: string }>('/api/financeiro/titulos', {
        descricao: novoDescricao,
        tipo: novoTipo,
        valor: Number(novoValor),
        dataVencimento: novoVencimento,
        planoContasId: novoPlanoContasId || undefined
      });

      alert('✅ Título criado com sucesso!');
      fecharModais();
      carregarDados();
    } catch (err) {
      const error = err as AxiosError<{ error?: string }>;
      console.error('Erro ao criar título:', error);
      alert(error.response?.data?.error || 'Erro ao salvar o título.');
    } finally {
      setSaving(false);
    }
  }

  function fecharModais() {
    setIsNovoModalOpen(false);
    setIsEditModalOpen(false);
    setIsBaixaModalOpen(false);
    setTituloSelecionado(null);
    setNovoDescricao('');
    setNovoValor('');
    setNovoVencimento('');
    setNovoPlanoContasId('');
  }

  function limparFiltros() {
    setBusca('');
    setFiltroTipo('TODOS');
    setFiltroStatus('TODOS');
    setFiltroValorMin('');
    setFiltroValorMax('');
    setFiltroDataEmissaoInicio('');
    setFiltroDataEmissaoFim('');
    setFiltroDataVencimentoInicio('');
    setFiltroDataVencimentoFim('');
    setFiltroOrigem('TODAS');
  }

  const efetuarBaixa = async () => {
    if (!tituloSelecionado || !valorBaixa || !dataBaixa) return;

    if (!contaBancaria) {
      alert('Selecione uma conta bancária/caixa para realizar a baixa.');
      return;
    }

    setSaving(true);
    try {
      // ✅ CORREÇÃO: Ajustado o endpoint para corresponder à rota do seu financeiro.routes.ts
      await api.put<{ message?: string }>(`/api/financeiro/titulos/${tituloSelecionado.id}/baixa`, {
        valorPago: Number(valorBaixa),
        dataBaixa: dataBaixa,
        tipoPagamento: formaPagamento,
        contaBancariaId: contaBancaria
      });

      alert('✅ Baixa e contabilização efetuadas com sucesso!');
      fecharModais();
      carregarDados();
    } catch (err) {
      const error = err as AxiosError<{ error?: string }>;
      console.error('Erro ao baixar:', error);
      alert(error.response?.data?.error || 'Erro ao processar a baixa.');
    } finally {
      setSaving(false);
    }
  };

  const confirmarEstorno = async (titulo: ITitulo) => {
    if (window.confirm(`Atenção: Deseja estornar a baixa e reverter a contabilidade do título "${titulo.descricao}"?`)) {
      try {
        await api.put<{ message?: string }>(`/api/financeiro/titulos/${titulo.id}/estorno`, {});
        alert('✅ Estorno realizado com sucesso!');
        fecharModais();
        carregarDados();
      } catch (err) {
        const error = err as AxiosError<{ error?: string }>;
        console.error('Erro ao estornar:', error);
        alert(error.response?.data?.error || 'Erro ao realizar estorno.');
      }
    }
  };

  const confirmarExclusao = async (titulo: ITitulo) => {
    if (window.confirm(`Tem certeza que deseja excluir o título e a provisão contábil de "${titulo.descricao}"?`)) {
      try {
        await api.delete<{ message?: string }>(`/api/financeiro/titulos/${titulo.id}`);
        alert('✅ Título excluído com sucesso!');
        fecharModais();
        carregarDados();
      } catch (err) {
        const error = err as AxiosError<{ error?: string }>;
        console.error('Erro ao excluir:', error);
        alert(error.response?.data?.error || 'Erro ao excluir título.');
      }
    }
  };

  const abrirModalBaixa = (titulo: ITitulo) => {
    setTituloSelecionado(titulo);
    setValorBaixa(titulo.saldoDevedor.toString());
    setDataBaixa(new Date().toISOString().split('T')[0]);
    setIsBaixaModalOpen(true);
  };

  const abrirModalEdit = (titulo: ITitulo) => {
    setTituloSelecionado(titulo);
    setIsEditModalOpen(true);
  };

  const abrirModalNovo = () => {
    setTituloSelecionado(null);
    setNovoTipo('PAGAR');
    setNovoDescricao('');
    setNovoValor('');
    setNovoVencimento('');
    setIsNovoModalOpen(true);
  };

  // ==========================================
  // 🚀 MOTOR DE FILTRAGEM AVANÇADA
  // ==========================================
  const titulosFiltrados = titulos.filter(t => {
    // 1. Tipo
    if (filtroTipo !== 'TODOS' && t.tipo !== filtroTipo) return false;
    
    // 2. Status
    const statusSeguro = String(t.status || '');
    if (filtroStatus === 'ABERTOS' && isPago(statusSeguro)) return false;
    if (filtroStatus === 'PAGOS' && !isPago(statusSeguro)) return false;
    if (filtroStatus === 'VENCIDOS' && !isAtrasado(statusSeguro)) return false;

    // 3. Origem / Tipo de Documento
    if (filtroOrigem !== 'TODAS' && t.origem !== filtroOrigem) return false;

    // 4. Busca Textual (Cliente, Descrição, Produto)
    if (busca) {
      const textoBusca = busca.toLowerCase();
      const matchDescricao = String(t.descricao || '').toLowerCase().includes(textoBusca);
      const matchObservacao = String(t.observacao || '').toLowerCase().includes(textoBusca);
      const matchPessoa = String(t.pessoa?.nome || '').toLowerCase().includes(textoBusca);
      
      if (!matchDescricao && !matchObservacao && !matchPessoa) return false;
    }

    // 5. Valores
    if (filtroValorMin && t.valor < Number(filtroValorMin)) return false;
    if (filtroValorMax && t.valor > Number(filtroValorMax)) return false;

    // 6. Vencimento
    if (filtroDataVencimentoInicio && new Date(t.dataVencimento) < new Date(filtroDataVencimentoInicio)) return false;
    if (filtroDataVencimentoFim && new Date(t.dataVencimento) > new Date(filtroDataVencimentoFim)) return false;

    // 7. Emissão
    if (t.dataEmissao) {
      if (filtroDataEmissaoInicio && new Date(t.dataEmissao) < new Date(filtroDataEmissaoInicio)) return false;
      if (filtroDataEmissaoFim && new Date(t.dataEmissao) > new Date(filtroDataEmissaoFim)) return false;
    }

    return true;
  });

  const totalReceber = titulos
    .filter(t => t.tipo === 'RECEBER' && !isPago(t.status))
    .reduce((acc, t) => acc + t.saldoDevedor, 0);

  const totalPagar = titulos
    .filter(t => t.tipo === 'PAGAR' && !isPago(t.status))
    .reduce((acc, t) => acc + t.saldoDevedor, 0);

  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
  };

  const getStatusBadge = (status: string) => {
    if (isPago(status)) {
      return (
        <span className="inline-flex w-max items-center gap-1 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-300">
          <CheckCircle className="h-3 w-3" /> Liquidado
        </span>
      );
    }
    if (isAtrasado(status)) {
      return (
        <span className="inline-flex w-max items-center gap-1 rounded-full border border-rose-400/20 bg-rose-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-rose-300 shadow-[0_0_10px_rgba(244,63,94,0.18)] animate-pulse">
          <Clock className="h-3 w-3" /> Atrasado
        </span>
      );
    }
    if (isPendente(status)) {
      return (
        <span className="inline-flex w-max items-center gap-1 rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-amber-300">
          <Clock className="h-3 w-3" /> Pendente
        </span>
      );
    }
    return (
      <span className="inline-flex w-max rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
        {status}
      </span>
    );
  };

  const inputClass = 'w-full rounded-2xl border border-white/10 bg-[#0d182d] px-4 py-3.5 text-sm text-white placeholder:text-slate-500 outline-none shadow-inner transition-all focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/50';
  const labelClass = 'mb-2 block pl-1 text-xs font-bold uppercase tracking-[0.16em] text-slate-400';

  const bgHeader = filtroTipo === 'RECEBER' ? 'bg-emerald-500/10' : filtroTipo === 'PAGAR' ? 'bg-rose-500/10' : 'bg-violet-500/10';
  const iconeBgHeader = filtroTipo === 'RECEBER' ? 'border-emerald-400/20 bg-emerald-500/10 text-emerald-300' : filtroTipo === 'PAGAR' ? 'border-rose-400/20 bg-rose-500/10 text-rose-300' : 'border-violet-400/20 bg-violet-500/10 text-violet-300';

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
        /* 🚀 SCROLLBAR CUSTOMIZADA E FORÇADA */
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.2);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(139, 92, 246, 0.4);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(139, 92, 246, 0.8);
        }
      `}</style>

      <div className="mx-auto flex h-full max-w-7xl flex-col space-y-6 pb-12">
        {/* CABEÇALHO */}
        <div className="relative overflow-hidden rounded-[30px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(139,92,246,0.16),_transparent_26%),linear-gradient(135deg,_#0b1020_0%,_#08101f_45%,_#0a1224_100%)] p-6 shadow-[0_25px_70px_rgba(0,0,0,0.40)] sm:p-8">
          <div className={`pointer-events-none absolute right-0 top-0 h-64 w-64 rounded-full blur-[100px] ${bgHeader}`} />

          <div className="relative z-10 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className={`rounded-2xl border p-3 transition-colors ${iconeBgHeader}`}>
                <DollarSign className="h-7 w-7" />
              </div>
              <div>
                <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-violet-300">
                  <Sparkles className="h-3.5 w-3.5" />
                  Gestão Avançada
                </div>
                <h1 className="text-3xl font-black text-white">Contas a Pagar e Receber</h1>
                <p className="mt-1 font-medium text-slate-400">Gerencie os títulos financeiros e a conciliação contábil.</p>
              </div>
            </div>

            <button
              onClick={abrirModalNovo}
              className="inline-flex items-center gap-2 rounded-2xl border border-violet-400/20 bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-3.5 font-black text-white shadow-[0_0_20px_rgba(139,92,246,0.22)] transition-all hover:scale-[1.02] hover:brightness-110"
            >
              <Plus className="h-5 w-5" />
              Novo Título Manual
            </button>
          </div>
        </div>

        {/* CARDS DE TOTAIS */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="group flex items-center justify-between rounded-[26px] border border-emerald-400/20 bg-emerald-500/10 p-6 shadow-[0_20px_45px_rgba(0,0,0,0.30)] backdrop-blur-xl transition-all hover:border-emerald-400/30">
            <div>
              <p className="mb-2 text-xs font-black uppercase tracking-[0.16em] text-slate-400">A Receber (Pendentes)</p>
              <p className="font-mono text-3xl font-black text-emerald-300">{formatarMoeda(totalReceber)}</p>
            </div>
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-emerald-400/20 bg-emerald-500/10 transition-transform group-hover:scale-110">
              <ArrowUpRight className="h-7 w-7 text-emerald-300" />
            </div>
          </div>

          <div className="group flex items-center justify-between rounded-[26px] border border-rose-400/20 bg-rose-500/10 p-6 shadow-[0_20px_45px_rgba(0,0,0,0.30)] backdrop-blur-xl transition-all hover:border-rose-400/30">
            <div>
              <p className="mb-2 text-xs font-black uppercase tracking-[0.16em] text-slate-400">A Pagar (Pendentes)</p>
              <p className="font-mono text-3xl font-black text-rose-300">{formatarMoeda(totalPagar)}</p>
            </div>
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-rose-400/20 bg-rose-500/10 transition-transform group-hover:scale-110">
              <ArrowDownRight className="h-7 w-7 text-rose-300" />
            </div>
          </div>
        </div>

        {/* ÁREA DA TABELA E FILTROS */}
        <div className="rounded-[30px] border border-white/10 bg-[#08101f]/90 shadow-[0_25px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl overflow-hidden">
          
          {/* BARRA DE CONTROLES RÁPIDOS */}
          <div className="flex flex-col items-center justify-between gap-4 border-b border-white/10 bg-black/10 p-5 lg:flex-row">
            <div className="relative w-full lg:w-[400px]">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar (Cliente, Descrição, Origem...)"
                className={`${inputClass} pl-12 py-3`}
              />
            </div>

            <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
              <div className="flex rounded-xl border border-white/10 bg-[#0b1324] p-1.5 shadow-inner">
                <button onClick={() => setFiltroTipo('TODOS')} className={`flex-1 rounded-lg px-4 py-2.5 text-xs font-black uppercase tracking-[0.14em] transition-all sm:flex-none ${filtroTipo === 'TODOS' ? 'bg-violet-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}>Todos</button>
                <button onClick={() => setFiltroTipo('RECEBER')} className={`flex-1 rounded-lg px-4 py-2.5 text-xs font-black uppercase tracking-[0.14em] transition-all sm:flex-none ${filtroTipo === 'RECEBER' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}>Receber</button>
                <button onClick={() => setFiltroTipo('PAGAR')} className={`flex-1 rounded-lg px-4 py-2.5 text-xs font-black uppercase tracking-[0.14em] transition-all sm:flex-none ${filtroTipo === 'PAGAR' ? 'bg-rose-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}>Pagar</button>
              </div>

              <button
                onClick={() => setShowFiltrosAvancados(!showFiltrosAvancados)}
                className={`inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-black uppercase tracking-wider transition-all sm:flex-none ${
                  showFiltrosAvancados ? 'border-violet-400/30 bg-violet-500/20 text-violet-300' : 'border-white/10 bg-[#0b1324] text-slate-400 hover:text-white'
                }`}
              >
                <Filter className="h-4 w-4" />
                Filtros Avançados
                {showFiltrosAvancados ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* 🚀 PAINEL DE FILTROS AVANÇADOS */}
          {showFiltrosAvancados && (
            <div className="border-b border-white/10 bg-black/20 p-6 animate-modal">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                
                <div>
                  <label className={labelClass}>Status do Título</label>
                  <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value as any)} className={inputClass}>
                    <option value="TODOS">Todos os Status</option>
                    <option value="ABERTOS">Abertos / Pendentes</option>
                    <option value="PAGOS">Pagos / Baixados</option>
                    <option value="VENCIDOS">Vencidos / Atrasados</option>
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Origem / Documento</label>
                  <select value={filtroOrigem} onChange={(e) => setFiltroOrigem(e.target.value)} className={inputClass}>
                    <option value="TODAS">Todas as Origens</option>
                    <option value="PDV">Vendas PDV / Frente de Caixa</option>
                    <option value="MESA">Vendas PDV Food (Mesas)</option>
                    <option value="NFE">Nota Fiscal (XML)</option>
                    <option value="MANUAL">Lançamento Manual</option>
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Valor Mínimo (R$)</label>
                  <input type="number" value={filtroValorMin} onChange={(e) => setFiltroValorMin(e.target.value)} placeholder="0.00" className={inputClass} />
                </div>

                <div>
                  <label className={labelClass}>Valor Máximo (R$)</label>
                  <input type="number" value={filtroValorMax} onChange={(e) => setFiltroValorMax(e.target.value)} placeholder="9999.00" className={inputClass} />
                </div>

                <div>
                  <label className={labelClass}>Vencimento (A partir de)</label>
                  <input type="date" value={filtroDataVencimentoInicio} onChange={(e) => setFiltroDataVencimentoInicio(e.target.value)} className={inputClass} style={{ colorScheme: 'dark' }} />
                </div>

                <div>
                  <label className={labelClass}>Vencimento (Até)</label>
                  <input type="date" value={filtroDataVencimentoFim} onChange={(e) => setFiltroDataVencimentoFim(e.target.value)} className={inputClass} style={{ colorScheme: 'dark' }} />
                </div>

                <div>
                  <label className={labelClass}>Emissão (A partir de)</label>
                  <input type="date" value={filtroDataEmissaoInicio} onChange={(e) => setFiltroDataEmissaoInicio(e.target.value)} className={inputClass} style={{ colorScheme: 'dark' }} />
                </div>

                <div>
                  <label className={labelClass}>Emissão (Até)</label>
                  <input type="date" value={filtroDataEmissaoFim} onChange={(e) => setFiltroDataEmissaoFim(e.target.value)} className={inputClass} style={{ colorScheme: 'dark' }} />
                </div>
              </div>
              
              <div className="mt-6 flex justify-end">
                <button onClick={limparFiltros} className="rounded-xl border border-white/10 bg-white/5 px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-400 transition-colors hover:bg-white/10 hover:text-white">
                  Limpar Todos os Filtros
                </button>
              </div>
            </div>
          )}

          {/* 🚀 TABELA COM BARRA DE ROLAGEM FORÇADA (max-h-[600px] e custom-scrollbar) */}
          <div className="custom-scrollbar overflow-x-auto overflow-y-auto max-h-[600px] w-full">
            <table className="min-w-[1100px] w-full text-left">
              <thead className="sticky top-0 z-10 border-b border-white/10 bg-[#0b1324] backdrop-blur-md">
                <tr>
                  <th className="p-5 text-xs font-black uppercase tracking-[0.16em] text-slate-400">Descrição / Origem</th>
                  <th className="p-5 text-xs font-black uppercase tracking-[0.16em] text-slate-400">Pessoa (Cliente/Forn.)</th>
                  <th className="p-5 text-xs font-black uppercase tracking-[0.16em] text-slate-400">Conta Contábil</th>
                  <th className="p-5 text-xs font-black uppercase tracking-[0.16em] text-slate-400">Vencimento</th>
                  <th className="p-5 text-right text-xs font-black uppercase tracking-[0.16em] text-slate-400">Valor (R$)</th>
                  <th className="p-5 text-center text-xs font-black uppercase tracking-[0.16em] text-slate-400">Status</th>
                  <th className="p-5 text-right text-xs font-black uppercase tracking-[0.16em] text-slate-400">Ações</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-white/5">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="p-16 text-center">
                      <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-violet-400" />
                      <p className="font-bold text-slate-300">Carregando títulos...</p>
                    </td>
                  </tr>
                ) : titulosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="bg-black/10 p-16 text-center">
                      <FileX className="mx-auto mb-4 h-12 w-12 text-slate-500" />
                      <p className="text-lg font-black text-white">Nenhum título encontrado com os filtros atuais.</p>
                      <button onClick={limparFiltros} className="mt-4 text-sm font-bold text-violet-400 hover:text-violet-300">Limpar Filtros</button>
                    </td>
                  </tr>
                ) : (
                  titulosFiltrados.map((titulo) => {
                    const isPendenteConciliacao = titulo.planoContas?.includes('Pendente') || !titulo.planoContas;

                    return (
                      <tr key={titulo.id} className="group cursor-pointer transition-colors hover:bg-white/5" onClick={() => abrirModalEdit(titulo)}>
                        <td className="p-5">
                          <div className="flex items-center gap-4">
                            <div className={`rounded-lg p-2 ${titulo.tipo === 'RECEBER' ? 'bg-emerald-500/10' : 'bg-rose-500/10'}`}>
                              {titulo.tipo === 'RECEBER' ? <ArrowUpRight className="h-5 w-5 text-emerald-300" /> : <ArrowDownRight className="h-5 w-5 text-rose-300" />}
                            </div>
                            <div>
                              <span className="block text-base font-black text-white">{titulo.descricao}</span>
                              <span className="mt-1 inline-block rounded-lg border border-white/10 bg-[#0b1324] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                                Origem: {titulo.origem}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="p-5 text-sm font-bold text-slate-300">{titulo.pessoa?.nome || 'Diversos / Consumidor'}</td>
                        <td className="p-5">
                          {isPendenteConciliacao ? (
                            <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-400/20 bg-amber-500/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-amber-300 shadow-sm"><AlertTriangle className="h-3.5 w-3.5" /> CONCILIAR</span>
                          ) : (
                            <span className="inline-flex items-center rounded-lg border border-white/10 bg-[#0b1324] px-3 py-1.5 font-mono text-xs font-bold text-slate-300">{titulo.planoContas}</span>
                          )}
                        </td>
                        <td className="p-5 text-sm font-medium text-slate-400">{new Date(titulo.dataVencimento).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</td>
                        <td className={`p-5 text-right font-mono text-lg font-black ${titulo.tipo === 'RECEBER' ? 'text-emerald-300' : 'text-rose-300'}`}>{formatarMoeda(titulo.valor)}</td>
                        <td className="p-5 text-center">{getStatusBadge(titulo.status)}</td>
                        <td className="p-5">
                          <div className="flex justify-end gap-3 opacity-0 transition-opacity group-hover:opacity-100">
                            <button onClick={(e) => { e.stopPropagation(); abrirModalEdit(titulo); }} className="rounded-xl border border-white/10 bg-[#0b1324] p-2.5 text-slate-400 hover:border-violet-400/20 hover:bg-violet-500/10 hover:text-violet-300" title="Ver Detalhes"><Edit2 className="h-4 w-4" /></button>
                            {!isPago(titulo.status) ? (
                              <button onClick={(e) => { e.stopPropagation(); abrirModalBaixa(titulo); }} className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-black uppercase tracking-[0.14em] transition-all shadow-sm ${titulo.tipo === 'RECEBER' ? 'border-emerald-400/20 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-600 hover:text-white' : 'border-rose-400/20 bg-rose-500/10 text-rose-300 hover:bg-rose-600 hover:text-white'}`} title="Realizar Baixa"><HandCoins className="h-4 w-4" /> Baixar</button>
                            ) : (
                              <button onClick={(e) => { e.stopPropagation(); confirmarEstorno(titulo); }} className="inline-flex items-center gap-2 rounded-xl border border-amber-400/20 bg-amber-500/10 px-4 py-2.5 text-xs font-black uppercase tracking-[0.14em] text-amber-300 hover:bg-amber-500/20"><RotateCcw className="h-3.5 w-3.5" /> Estornar</button>
                            )}
                            {titulo.origem === 'MANUAL' && titulo.valor === titulo.saldoDevedor && (
                              <button onClick={(e) => { e.stopPropagation(); confirmarExclusao(titulo); }} className="rounded-xl border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-rose-300 hover:bg-rose-500/20" title="Excluir Título"><Trash2 className="h-4 w-4" /></button>
                            )}
                          </div>
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
              Exibindo {titulosFiltrados.length} de {titulos.length} títulos encontrados no sistema.
            </div>
          </div>
        </div>
      </div>

      {/* ========================================== */}
      {/* 🚀 MODAL: BAIXAR TÍTULO */}
      {/* ========================================== */}
      {isBaixaModalOpen && tituloSelecionado && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#020617]/90 p-4 backdrop-blur-md">
          <div className="animate-modal w-full max-w-md overflow-hidden rounded-[30px] border border-white/10 bg-[#08101f] shadow-[0_25px_80px_rgba(0,0,0,0.8)]">
            <div className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${tituloSelecionado.tipo === 'RECEBER' ? 'from-emerald-500 to-teal-500' : 'from-rose-500 to-orange-500'}`} />
            <div className="flex items-center justify-between border-b border-white/10 bg-black/20 p-6">
              <h2 className="flex items-center gap-3 text-xl font-black text-white">
                <CheckCircle className={`h-6 w-6 ${tituloSelecionado.tipo === 'RECEBER' ? 'text-emerald-300' : 'text-rose-300'}`} />
                Baixar Título a {tituloSelecionado.tipo === 'RECEBER' ? 'Receber' : 'Pagar'}
              </h2>
              <button onClick={fecharModais} className="rounded-full border border-white/10 bg-white/5 p-2 text-slate-400 hover:text-white"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-6 p-6">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-5 shadow-inner">
                <p className="mb-1 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Título</p>
                <p className="text-lg font-black text-white">{tituloSelecionado.descricao}</p>
                <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4">
                  <span className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Saldo Devedor</span>
                  <span className={`font-mono text-2xl font-black ${tituloSelecionado.tipo === 'RECEBER' ? 'text-emerald-300' : 'text-rose-300'}`}>{formatarMoeda(tituloSelecionado.saldoDevedor)}</span>
                </div>
              </div>
              <div className="space-y-5">
                <div>
                  <label className={labelClass}>Valor a Baixar (R$)</label>
                  <input type="number" value={valorBaixa} onChange={(e) => setValorBaixa(e.target.value)} max={tituloSelecionado.saldoDevedor} className={`${inputClass} font-mono text-xl font-black ${tituloSelecionado.tipo === 'RECEBER' ? 'focus:border-emerald-400/30 focus:ring-emerald-500/15' : 'focus:border-rose-400/30 focus:ring-rose-500/15'}`} />
                </div>
                
                {/* ✅ NOVO: Select da Conta Bancária (Caixa) */}
                <div>
                  <label className={labelClass}>Conta Bancária / Caixa</label>
                  <select value={contaBancaria} onChange={(e) => setContaBancaria(e.target.value)} className={inputClass}>
                    {contasBancarias.length === 0 && <option value="">Nenhuma conta cadastrada</option>}
                    {contasBancarias.map(conta => (
                      <option key={conta.id} value={conta.id}>{conta.descricao}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Forma de Pagamento</label>
                  <select value={formaPagamento} onChange={(e) => setFormaPagamento(e.target.value)} className={inputClass}>
                    <option value="DINHEIRO">Dinheiro (Caixa Interno)</option>
                    <option value="PIX">PIX (Banco)</option>
                    <option value="CARTAO_CREDITO">Cartão de Crédito</option>
                    <option value="CARTAO_DEBITO">Cartão de Débito</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex shrink-0 flex-col gap-3 border-t border-white/10 bg-black/20 p-6 sm:flex-row sm:justify-end">
              <button onClick={fecharModais} className="w-full rounded-2xl border border-white/10 bg-white/5 px-6 py-3.5 font-bold text-slate-300 hover:bg-white/10 hover:text-white sm:w-auto">Cancelar</button>
              <button onClick={efetuarBaixa} disabled={saving || !contaBancaria} className={`inline-flex w-full items-center justify-center gap-2 rounded-2xl px-8 py-3.5 font-black text-white transition-all hover:scale-[1.02] disabled:opacity-50 sm:w-auto ${tituloSelecionado.tipo === 'RECEBER' ? 'bg-gradient-to-r from-emerald-600 to-teal-500' : 'bg-gradient-to-r from-rose-600 to-orange-500'}`}>
                {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle className="h-5 w-5" />} Confirmar Baixa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* 🚀 MODAL: NOVO / EDITAR TÍTULO */}
      {/* ========================================== */}
      {(isNovoModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#020617]/90 p-4 backdrop-blur-md">
          <div className="animate-modal w-full max-w-2xl overflow-hidden rounded-[30px] border border-white/10 bg-[#08101f] shadow-[0_25px_80px_rgba(0,0,0,0.8)]">
            <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-violet-500 to-cyan-400" />
            
            <div className="flex items-center justify-between border-b border-white/10 bg-black/20 p-6">
              <h2 className="text-xl font-black text-white">{isEditModalOpen ? `Detalhes do Título #${tituloSelecionado?.id.substring(0, 8)}` : 'Novo Título Manual'}</h2>
              <button onClick={fecharModais} className="rounded-full border border-white/10 bg-white/5 p-2 text-slate-400 hover:text-white"><X className="h-5 w-5" /></button>
            </div>

            <div className="custom-scrollbar max-h-[70vh] space-y-6 overflow-y-auto p-6">
              {isEditModalOpen && tituloSelecionado?.origem !== 'MANUAL' && (
                <div className="flex items-start gap-4 rounded-2xl border border-indigo-400/20 bg-indigo-500/10 p-5 shadow-inner">
                  <Lock className="mt-0.5 h-6 w-6 shrink-0 text-indigo-300" />
                  <div>
                    <p className="mb-1 text-sm font-black uppercase tracking-[0.16em] text-indigo-300">Título Integrado ({tituloSelecionado?.origem})</p>
                    <p className="text-sm font-medium leading-relaxed text-indigo-100/80">Gerado automaticamente. Os campos estruturais estão bloqueados para garantir a integridade contábil.</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div>
                  <label className={labelClass}>Tipo de Operação</label>
                  <select disabled={isEditModalOpen && tituloSelecionado?.origem !== 'MANUAL'} value={isEditModalOpen ? tituloSelecionado?.tipo : novoTipo} onChange={(e) => setNovoTipo(e.target.value as any)} className={inputClass}>
                    <option value="PAGAR">A Pagar (Despesa / Passivo)</option>
                    <option value="RECEBER">A Receber (Receita / Ativo)</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Valor Total (R$)</label>
                  <input type="number" disabled={isEditModalOpen && tituloSelecionado?.origem !== 'MANUAL'} value={isEditModalOpen ? tituloSelecionado?.valor : novoValor} onChange={(e) => setNovoValor(e.target.value)} className={`${inputClass} font-mono text-lg font-black`} />
                </div>
              </div>

              <div>
                <label className={labelClass}>Descrição do Título</label>
                <input type="text" disabled={isEditModalOpen && tituloSelecionado?.origem !== 'MANUAL'} value={isEditModalOpen ? tituloSelecionado?.descricao : novoDescricao} onChange={(e) => setNovoDescricao(e.target.value)} placeholder="Ex: Conta de Luz, Aluguel, etc." className={`${inputClass} font-bold`} />
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div>
                  <label className={labelClass}>Data de Vencimento</label>
                  <input type="date" disabled={isEditModalOpen && tituloSelecionado?.origem !== 'MANUAL'} value={isEditModalOpen && tituloSelecionado?.dataVencimento ? new Date(tituloSelecionado.dataVencimento).toISOString().split('T')[0] : novoVencimento} onChange={(e) => setNovoVencimento(e.target.value)} className={inputClass} style={{ colorScheme: 'dark' }} />
                </div>
                {!isEditModalOpen && (
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.16em] text-violet-300">Classificação Contábil</label>
                    <select value={novoPlanoContasId} onChange={(e) => setNovoPlanoContasId(e.target.value)} className={`${inputClass} bg-[#0b1324]`}>
                      <option value="">-- Deixar Pendente --</option>
                      {planosContas.map(conta => (<option key={conta.id} value={conta.id}>{conta.codigoEstrutural} - {conta.nomeConta}</option>))}
                    </select>
                  </div>
                )}
              </div>
            </div>

            <div className="flex shrink-0 flex-col items-center justify-between gap-4 border-t border-white/10 bg-black/20 p-6 sm:flex-row">
              <div className="w-full sm:w-auto">
                {isEditModalOpen && tituloSelecionado?.origem === 'MANUAL' && (
                  <button onClick={() => confirmarExclusao(tituloSelecionado)} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-5 py-3 text-rose-300 hover:bg-rose-500/20 sm:w-auto">
                    <Trash2 className="h-4 w-4" /> Excluir
                  </button>
                )}
              </div>
              <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
                <button onClick={fecharModais} className="w-full rounded-2xl border border-white/10 bg-white/5 px-6 py-3.5 font-bold text-slate-300 sm:w-auto">Voltar</button>
                {!isEditModalOpen && (
                  <button onClick={salvarNovoTitulo} disabled={saving} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-violet-400/20 bg-gradient-to-r from-violet-600 to-fuchsia-600 px-8 py-3.5 font-black text-white sm:w-auto hover:scale-[1.02] transition-all">
                    {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle className="h-5 w-5" />} Criar Título
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}