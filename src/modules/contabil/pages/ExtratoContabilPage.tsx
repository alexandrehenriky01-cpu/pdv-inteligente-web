import { useEffect, useState } from 'react';
import { api } from '../../../services/api';
import { Layout } from '../../../components/Layout';
import {
  BookOpen,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  Loader2,
  FileX,
  Calculator
} from 'lucide-react';
import { AxiosError } from 'axios';

export interface IPlanoConta {
  id: string;
  codigoEstrutural: string;
  nomeConta: string;
  tipoConta: 'SINTETICA' | 'ANALITICA';
  natureza: 'DEVEDORA' | 'CREDORA';
}

export interface ILancamentoContabil {
  id: string;
  dataLancamento: string;
  historico: string;
  tipo: 'DEBITO' | 'CREDITO';
  valor: number;
  planoContas?: {
    codigoEstrutural: string;
    nomeConta: string;
    natureza: string;
  };
}

export function ExtratoContabilPage() {
  const [planos, setPlanos] = useState<IPlanoConta[]>([]);
  const [lancamentos, setLancamentos] = useState<ILancamentoContabil[]>([]);
  const [loading, setLoading] = useState(false);

  // Filtros
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [contaSinteticaSelecionada, setContaSinteticaSelecionada] = useState('');
  const [contaAnaliticaSelecionada, setContaAnaliticaSelecionada] = useState('');

  useEffect(() => {
    carregarPlanosContas();
  }, []);

  async function carregarPlanosContas() {
    try {
      const response = await api.get<IPlanoConta[]>('/api/contabilidade/planos');
      setPlanos(response.data);
    } catch (err) {
      console.error('Erro ao carregar planos de contas:', err);
    }
  }

  async function buscarRazao() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (dataInicio) params.append('dataInicio', dataInicio);
      if (dataFim) params.append('dataFim', dataFim);
      
      if (contaAnaliticaSelecionada) {
        params.append('planoContasId', contaAnaliticaSelecionada);
      } else if (contaSinteticaSelecionada) {
        params.append('contaSinteticaId', contaSinteticaSelecionada);
      }

      const response = await api.get<ILancamentoContabil[]>(`/api/contabilidade/extrato?${params.toString()}`);
      setLancamentos(response.data);
    } catch (err) {
      const error = err as AxiosError<{ error?: string }>;
      alert(error.response?.data?.error || 'Erro ao carregar o Livro Razão.');
    } finally {
      setLoading(false);
    }
  }

  // Lógica inteligente de filtros em cascata
  const contasSinteticas = planos.filter(p => p.tipoConta === 'SINTETICA');
  
  const sinteticaSelecionadaObj = contasSinteticas.find(p => p.id === contaSinteticaSelecionada);
  const contasAnaliticas = planos.filter(p => 
    p.tipoConta === 'ANALITICA' && 
    (!sinteticaSelecionadaObj || p.codigoEstrutural.startsWith(sinteticaSelecionadaObj.codigoEstrutural))
  );

  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
  };

  const formatarData = (dataIso: string) => {
    if (!dataIso) return '---';
    try {
      const data = new Date(dataIso);
      if (isNaN(data.getTime())) return 'Data inválida';
      return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(data);
    } catch (e) {
      return 'Erro';
    }
  };

  // Cálculos do Razão Contábil
  const totalDebitos = lancamentos.filter(l => l.tipo === 'DEBITO').reduce((acc, l) => acc + Number(l.valor), 0);
  const totalCreditos = lancamentos.filter(l => l.tipo === 'CREDITO').reduce((acc, l) => acc + Number(l.valor), 0);
  
  // Cálculo de Saldo Progressivo
  let saldoAcumulado = 0;
  // A natureza da conta define se DÉBITO aumenta ou diminui o saldo.
  // Se for uma conta específica, usamos a natureza dela. Se for geral, usamos a variação líquida.
  const naturezaBase = (contaAnaliticaSelecionada || contaSinteticaSelecionada) && lancamentos.length > 0 
    ? lancamentos[0].planoContas?.natureza 
    : 'DEVEDORA';

  const lancamentosComSaldo = lancamentos.map(lanc => {
    const valor = Number(lanc.valor);
    if (naturezaBase === 'DEVEDORA') {
      saldoAcumulado += (lanc.tipo === 'DEBITO' ? valor : -valor);
    } else {
      saldoAcumulado += (lanc.tipo === 'CREDITO' ? valor : -valor);
    }
    return { ...lanc, saldoMomento: saldoAcumulado };
  });

  // Invertemos para mostrar o mais recente no topo
  const lancamentosExibicao = [...lancamentosComSaldo].reverse();

  const inputClass = 'w-full rounded-xl border border-white/10 bg-[#0d182d] px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none shadow-inner transition-all focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/50';
  const labelClass = 'mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1';

  return (
    <Layout>
      <div className="mx-auto flex h-full max-w-7xl flex-col space-y-6 pb-12">
        
        {/* CABEÇALHO */}
        <div className="relative overflow-hidden rounded-[30px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(139,92,246,0.16),_transparent_26%),linear-gradient(135deg,_#0b1020_0%,_#08101f_45%,_#0a1224_100%)] p-6 shadow-[0_25px_70px_rgba(0,0,0,0.40)] sm:p-8">
          <div className="pointer-events-none absolute right-0 top-0 h-64 w-64 rounded-full bg-violet-500/10 blur-[100px]" />
          <div className="relative z-10 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="rounded-2xl border border-violet-400/20 bg-violet-500/10 p-3 text-violet-300">
                <BookOpen className="h-7 w-7" />
              </div>
              <div>
                <h1 className="text-3xl font-black text-white">Livro Razão Contábil</h1>
                <p className="mt-1 font-medium text-slate-400">Auditoria detalhada de Débitos e Créditos por conta.</p>
              </div>
            </div>
          </div>
        </div>

        {/* BARRA DE FILTROS */}
        <div className="bg-[#08101f]/90 border border-white/10 rounded-[20px] p-5 shadow-xl backdrop-blur-xl">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4 items-end">
            
            <div className="xl:col-span-1">
              <label className={labelClass}>Data Inicial</label>
              <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className={inputClass} style={{ colorScheme: 'dark' }} />
            </div>
            
            <div className="xl:col-span-1">
              <label className={labelClass}>Data Final</label>
              <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className={inputClass} style={{ colorScheme: 'dark' }} />
            </div>

            <div className="xl:col-span-1">
              <label className={labelClass}>Conta Sintética</label>
              <select 
                value={contaSinteticaSelecionada} 
                onChange={(e) => {
                  setContaSinteticaSelecionada(e.target.value);
                  setContaAnaliticaSelecionada(''); // Reseta a analítica ao mudar a sintética
                }}
                className={inputClass}
              >
                <option value="">Todas as Contas</option>
                {contasSinteticas.map(conta => (
                  <option key={conta.id} value={conta.id}>{conta.codigoEstrutural} - {conta.nomeConta}</option>
                ))}
              </select>
            </div>

            <div className="xl:col-span-1">
              <label className={labelClass}>Conta Analítica</label>
              <select 
                value={contaAnaliticaSelecionada} 
                onChange={(e) => setContaAnaliticaSelecionada(e.target.value)}
                className={inputClass}
              >
                <option value="">Todas (do grupo)</option>
                {contasAnaliticas.map(conta => (
                  <option key={conta.id} value={conta.id}>{conta.codigoEstrutural} - {conta.nomeConta}</option>
                ))}
              </select>
            </div>

            <div className="xl:col-span-1">
              <button 
                onClick={buscarRazao}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-black py-3.5 rounded-xl transition-all hover:scale-[1.02] shadow-[0_0_20px_rgba(139,92,246,0.3)] disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                Filtrar Razão
              </button>
            </div>

          </div>
        </div>

        {/* RESUMO DOS TOTAIS */}
        {lancamentos.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-[#08101f]/90 border border-white/10 rounded-2xl p-5 flex flex-col items-center justify-center shadow-inner">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Total de Débitos</p>
              <p className="text-2xl font-black font-mono text-white">{formatarMoeda(totalDebitos)}</p>
            </div>
            <div className="bg-[#08101f]/90 border border-white/10 rounded-2xl p-5 flex flex-col items-center justify-center shadow-inner">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Total de Créditos</p>
              <p className="text-2xl font-black font-mono text-white">{formatarMoeda(totalCreditos)}</p>
            </div>
            <div className={`border rounded-2xl p-5 flex flex-col items-center justify-center shadow-inner ${naturezaBase === 'DEVEDORA' ? (totalDebitos >= totalCreditos ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-rose-500/10 border-rose-500/30') : (totalCreditos >= totalDebitos ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-rose-500/10 border-rose-500/30')}`}>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Saldo Final do Período</p>
              <p className={`text-2xl font-black font-mono ${naturezaBase === 'DEVEDORA' ? (totalDebitos >= totalCreditos ? 'text-emerald-400' : 'text-rose-400') : (totalCreditos >= totalDebitos ? 'text-emerald-400' : 'text-rose-400')}`}>
                {formatarMoeda(Math.abs(totalDebitos - totalCreditos))}
                <span className="text-xs ml-2 text-slate-500">({naturezaBase === 'DEVEDORA' ? (totalDebitos >= totalCreditos ? 'D' : 'C') : (totalCreditos >= totalDebitos ? 'C' : 'D')})</span>
              </p>
            </div>
          </div>
        )}

        {/* TABELA DO RAZÃO CONTÁBIL */}
        <div className="bg-[#08101f]/90 border border-white/10 rounded-[30px] shadow-xl backdrop-blur-xl overflow-hidden flex-1">
          <div className="overflow-x-auto max-h-[600px] custom-scrollbar">
            <table className="w-full min-w-[1000px] text-left">
              <thead className="sticky top-0 z-10 bg-[#0b1324] border-b border-white/10 shadow-md">
                <tr>
                  <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Data</th>
                  <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Conta Analítica</th>
                  <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Histórico</th>
                  <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Débito (R$)</th>
                  <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Crédito (R$)</th>
                  <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Saldo (R$)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="p-16 text-center">
                      <Loader2 className="w-8 h-8 text-violet-400 animate-spin mx-auto mb-4" />
                      <p className="text-slate-400 font-bold">Processando lançamentos contábeis...</p>
                    </td>
                  </tr>
                ) : lancamentosExibicao.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-16 text-center">
                      <Calculator className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                      <p className="text-slate-400 font-bold">Nenhum lançamento encontrado para os filtros informados.</p>
                    </td>
                  </tr>
                ) : (
                  lancamentosExibicao.map((linha) => (
                    <tr key={linha.id} className="hover:bg-white/5 transition-colors group">
                      <td className="p-4 text-xs text-slate-400 font-medium whitespace-nowrap">
                        {formatarData(linha.dataLancamento)}
                      </td>
                      <td className="p-4">
                        <p className="text-violet-300 font-bold text-xs font-mono">{linha.planoContas?.codigoEstrutural || 'N/A'}</p>
                        <p className="text-[10px] text-slate-400 uppercase tracking-wider">{linha.planoContas?.nomeConta || 'Conta não vinculada'}</p>
                      </td>
                      <td className="p-4 text-sm text-white font-medium max-w-xs truncate" title={linha.historico}>
                        {linha.historico}
                      </td>
                      <td className="p-4 text-right">
                        {linha.tipo === 'DEBITO' ? (
                          <span className="font-mono text-sm font-black text-white">{formatarMoeda(linha.valor)}</span>
                        ) : <span className="text-slate-600">-</span>}
                      </td>
                      <td className="p-4 text-right">
                        {linha.tipo === 'CREDITO' ? (
                          <span className="font-mono text-sm font-black text-white">{formatarMoeda(linha.valor)}</span>
                        ) : <span className="text-slate-600">-</span>}
                      </td>
                      <td className="p-4 text-right">
                        <span className="font-mono text-sm font-black text-violet-300 bg-violet-500/10 px-2 py-1 rounded border border-violet-500/20">
                          {formatarMoeda(linha.saldoMomento)}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </Layout>
  );
}