import { useEffect, useState } from 'react';
import { api } from '../../../services/api';
import { Layout } from '../../../components/Layout';
import {
  Landmark,
  Search,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  Loader2,
  FileX,
  CreditCard,
  Banknote,
  QrCode,
  ShieldCheck,
  Building2
} from 'lucide-react';
import { AxiosError } from 'axios';

export interface IContaBancaria {
  id: string;
  descricao: string;
  saldoInicial: number;
}

export interface ILancamentoExtrato {
  id: string;
  data: string;
  historico: string;
  documento: string;
  tipo: 'DEBITO' | 'CREDITO'; // DÉBITO = Entrada na conta, CRÉDITO = Saída
  valor: number;
  saldoMomento: number;
  formaPagamento: string;
  /** Vinculado a título marcado como estorno pendente após cancelamento operacional (ex.: KDS). */
  estornoPendente?: boolean;
}

export function ExtratoFinanceiroPage() {
  const [contas, setContas] = useState<IContaBancaria[]>([]);
  const [extrato, setExtrato] = useState<ILancamentoExtrato[]>([]);
  const [loading, setLoading] = useState(false);

  // Filtros
  const [contaSelecionada, setContaSelecionada] = useState<string>('');
  const [dataInicio, setDataInicio] = useState<string>('');
  const [dataFim, setDataFim] = useState<string>('');

  // Carrega as contas bancárias (caixas) ao abrir a tela
  useEffect(() => {
    carregarContas();
  }, []);

  // Toda vez que a conta ou as datas mudarem, busca o extrato
  useEffect(() => {
    if (contaSelecionada) {
      buscarExtrato();
    } else {
      setExtrato([]); // Limpa a tela se nenhuma conta estiver selecionada
    }
  }, [contaSelecionada, dataInicio, dataFim]);

  async function carregarContas() {
    try {
      const response = await api.get<IContaBancaria[]>('/api/financeiro/caixas');
      setContas(response.data);
      if (response.data.length > 0) {
        setContaSelecionada(response.data[0].id); // Seleciona a primeira conta por padrão
      }
    } catch (err) {
      console.error('Erro ao carregar contas:', err);
    }
  }

  async function buscarExtrato() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('contaBancariaId', contaSelecionada);
      if (dataInicio) params.append('dataInicio', dataInicio);
      if (dataFim) params.append('dataFim', dataFim);

      const response = await api.get<ILancamentoExtrato[]>(`/api/contabilidade/extrato?${params.toString()}`);
      setExtrato(response.data);
    } catch (err) {
      const error = err as AxiosError<{ error?: string }>;
      console.error('Erro ao buscar extrato:', error);
      alert(error.response?.data?.error || 'Erro ao carregar o extrato.');
    } finally {
      setLoading(false);
    }
  }

  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
  };

    const formatarData = (dataIso: string) => {
    // 1. Verifica se o valor existe
    if (!dataIso) return 'Data não registrada';
    
    try {
      // 2. Tenta converter para o formato de Data do JavaScript
      const data = new Date(dataIso);
      
      // 3. Verifica se a conversão resultou em uma data válida (evita o Invalid time value)
      if (isNaN(data.getTime())) {
        return 'Data inválida';
      }
      
      // 4. Se passou por tudo, formata lindamente
      return new Intl.DateTimeFormat('pt-BR', { 
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' 
      }).format(data);
    } catch (e) {
      return 'Erro na data';
    }
  };

  const getIconePagamento = (forma: string) => {
    switch (forma?.toUpperCase()) {
      case 'PIX': return <QrCode className="w-4 h-4 text-cyan-400" />;
      case 'DINHEIRO': return <Banknote className="w-4 h-4 text-emerald-400" />;
      case 'CARTAO_CREDITO':
      case 'CARTAO_DEBITO': return <CreditCard className="w-4 h-4 text-amber-400" />;
      case 'CREDIARIO': return <ShieldCheck className="w-4 h-4 text-violet-400" />;
      default: return <Building2 className="w-4 h-4 text-slate-400" />;
    }
  };

  // Cálculos de Totais do período filtrado
  const totalEntradas = extrato.filter(e => e.tipo === 'DEBITO').reduce((acc, e) => acc + e.valor, 0);
  const totalSaidas = extrato.filter(e => e.tipo === 'CREDITO').reduce((acc, e) => acc + e.valor, 0);
  const saldoAtualConta = contas.find(c => c.id === contaSelecionada)?.saldoInicial || 0;

  const inputClass = 'w-full rounded-xl border border-white/10 bg-[#0d182d] px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none shadow-inner transition-all focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50';

  return (
    <Layout>
      <div className="mx-auto flex h-full max-w-7xl flex-col space-y-6 pb-12">
        
        {/* CABEÇALHO */}
        <div className="relative overflow-hidden rounded-[30px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(6,182,212,0.16),_transparent_26%),linear-gradient(135deg,_#0b1020_0%,_#08101f_45%,_#0a1224_100%)] p-6 shadow-[0_25px_70px_rgba(0,0,0,0.40)] sm:p-8">
          <div className="pointer-events-none absolute right-0 top-0 h-64 w-64 rounded-full bg-cyan-500/10 blur-[100px]" />
          <div className="relative z-10 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/10 p-3 text-cyan-300">
                <Landmark className="h-7 w-7" />
              </div>
              <div>
                <h1 className="text-3xl font-black text-white">Extrato Bancário e Caixas</h1>
                <p className="mt-1 font-medium text-slate-400">Acompanhe o fluxo de entradas e saídas de cada gaveta/conta.</p>
              </div>
            </div>
            
            {/* SALDO ATUAL EM DESTAQUE */}
            <div className="bg-[#08101f]/80 border border-white/10 rounded-2xl p-4 flex items-center gap-4 backdrop-blur-md shadow-inner">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 text-right">Saldo Atual (Conta)</p>
                <p className={`text-2xl font-black font-mono ${saldoAtualConta >= 0 ? 'text-cyan-300' : 'text-rose-400'}`}>
                  {formatarMoeda(saldoAtualConta)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* BARRA DE FILTROS */}
        <div className="flex flex-col lg:flex-row gap-4 bg-[#08101f]/90 border border-white/10 rounded-[20px] p-4 shadow-xl backdrop-blur-xl">
          <div className="flex-1">
            <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Selecionar Conta / Caixa</label>
            <select 
              value={contaSelecionada} 
              onChange={(e) => setContaSelecionada(e.target.value)}
              className={inputClass}
            >
              <option value="" disabled>Selecione uma conta...</option>
              {contas.map(conta => (
                <option key={conta.id} value={conta.id}>{conta.descricao}</option>
              ))}
            </select>
          </div>
          
          <div className="w-full lg:w-48">
            <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Data Inicial</label>
            <input 
              type="date" 
              value={dataInicio} 
              onChange={(e) => setDataInicio(e.target.value)} 
              className={inputClass} 
              style={{ colorScheme: 'dark' }} 
            />
          </div>
          
          <div className="w-full lg:w-48">
            <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Data Final</label>
            <input 
              type="date" 
              value={dataFim} 
              onChange={(e) => setDataFim(e.target.value)} 
              className={inputClass} 
              style={{ colorScheme: 'dark' }} 
            />
          </div>
        </div>

        {/* RESUMO DO PERÍODO */}
        {extrato.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-5 flex items-center gap-4">
              <div className="p-3 bg-emerald-500/20 rounded-xl text-emerald-400"><ArrowUpRight className="w-6 h-6"/></div>
              <div>
                <p className="text-xs font-bold text-emerald-200/70 uppercase tracking-wider mb-1">Entradas no Período</p>
                <p className="text-2xl font-black font-mono text-emerald-400">{formatarMoeda(totalEntradas)}</p>
              </div>
            </div>
            <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-5 flex items-center gap-4">
              <div className="p-3 bg-rose-500/20 rounded-xl text-rose-400"><ArrowDownRight className="w-6 h-6"/></div>
              <div>
                <p className="text-xs font-bold text-rose-200/70 uppercase tracking-wider mb-1">Saídas no Período</p>
                <p className="text-2xl font-black font-mono text-rose-400">{formatarMoeda(totalSaidas)}</p>
              </div>
            </div>
          </div>
        )}

        {/* TABELA DE EXTRATO */}
        <div className="bg-[#08101f]/90 border border-white/10 rounded-[30px] shadow-xl backdrop-blur-xl overflow-hidden flex-1">
          <div className="overflow-x-auto max-h-[600px] custom-scrollbar">
            <table className="w-full min-w-[1000px] text-left">
              <thead className="sticky top-0 z-10 bg-[#0b1324] border-b border-white/10 shadow-md">
                <tr>
                  <th className="p-5 text-[11px] font-black uppercase tracking-widest text-slate-400">Data / Hora</th>
                  <th className="p-5 text-[11px] font-black uppercase tracking-widest text-slate-400">Histórico da Movimentação</th>
                  <th className="p-5 text-[11px] font-black uppercase tracking-widest text-slate-400 text-center">Forma</th>
                  <th className="p-5 text-[11px] font-black uppercase tracking-widest text-slate-400 text-right">Valor (R$)</th>
                  <th className="p-5 text-[11px] font-black uppercase tracking-widest text-slate-400 text-right">Saldo Progressivo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="p-16 text-center">
                      <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mx-auto mb-4" />
                      <p className="text-slate-400 font-bold">Processando extrato...</p>
                    </td>
                  </tr>
                ) : !contaSelecionada ? (
                  <tr>
                    <td colSpan={5} className="p-16 text-center">
                      <Filter className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                      <p className="text-slate-400 font-bold">Selecione uma conta bancária para visualizar o extrato.</p>
                    </td>
                  </tr>
                ) : extrato.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-16 text-center">
                      <FileX className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                      <p className="text-slate-400 font-bold">Nenhuma movimentação encontrada neste período.</p>
                    </td>
                  </tr>
                ) : (
                  extrato.map((linha, index) => {
                    const isEntrada = linha.tipo === 'DEBITO'; // Na conta banco, Débito = Entrada de grana
                    const dataRef = linha.data || (linha as { dataLancamento?: string }).dataLancamento;
                    return (
                      <tr key={linha.id} className="hover:bg-white/5 transition-colors group">
                        <td className="p-4 text-sm text-slate-400 font-medium whitespace-nowrap">
                          {formatarData(dataRef ?? '')}
                        </td>
                        <td className="p-4">
                          <p className="text-white font-bold text-sm mb-1">{linha.historico}</p>
                          <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">{linha.documento}</p>
                          {linha.estornoPendente && (
                            <p className="mt-2 inline-flex rounded-lg border border-amber-500/40 bg-amber-500/15 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-amber-200">
                              Estorno pendente
                            </p>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          <div className="inline-flex items-center justify-center p-2 bg-[#0b1324] border border-white/5 rounded-lg shadow-inner" title={linha.formaPagamento}>
                            {getIconePagamento(linha.formaPagamento)}
                          </div>
                        </td>
                        <td className="p-4 text-right">
                          <span className={`inline-flex items-center gap-1.5 font-mono text-base font-black ${isEntrada ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {isEntrada ? '+' : '-'} {formatarMoeda(linha.valor)}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <span className="font-mono text-base font-black text-cyan-300 bg-cyan-500/10 px-3 py-1.5 rounded-lg border border-cyan-500/20">
                            {formatarMoeda(linha.saldoMomento)}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </Layout>
  );
}