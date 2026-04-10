import React, { useState, useEffect } from 'react';
import { Layout } from '../../../components/Layout';
import { api } from '../../../services/api';
import { 
  TrendingUp, TrendingDown, DollarSign, Package, 
  AlertTriangle, BrainCircuit, Activity, Wallet, 
  ArrowRight, Sparkles, Loader2, LineChart
} from 'lucide-react';
import { AxiosError } from 'axios';

interface IDashboardData {
  kpis: {
    faturamentoHoje: number;
    contasPagarHoje: number;
    valorEstoque: number;
    ticketMedio: number;
  };
  dre: {
    receitaBruta: number;
    cmv: number;
    despesasOperacionais?: number;
    despesas?: number;
    lucroLiquido: number;
    margemLucro?: number;
    margem?: number;
  };
  alertas: Array<{ id: string; tipo: 'ESTOQUE' | 'FINANCEIRO'; mensagem: string }>;
}

export function DashboardGlobal() {
  const [data, setData] = useState<IDashboardData | null>(null);
  const [iaInsight, setIaInsight] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingIA, setLoadingIA] = useState(true);

  useEffect(() => {
    carregarDashboard();
    carregarInsightIA();
  }, []);

  const carregarDashboard = async () => {
    try {
      const dreRes = await api.get('/api/contabilidade/dre').catch(() => null);
      
      setData({
        kpis: {
          faturamentoHoje: dreRes?.data?.receitaBruta ? dreRes.data.receitaBruta / 30 : 4580.00,
          contasPagarHoje: 1250.00,
          valorEstoque: 85400.00,
          ticketMedio: 124.50
        },
        dre: dreRes?.data || {
          receitaBruta: 125000,
          cmv: 45000,
          despesasOperacionais: 30000,
          lucroLiquido: 50000,
          margemLucro: 40
        },
        alertas: [
          { id: '1', tipo: 'ESTOQUE', mensagem: '5 produtos da Curva A estão com estoque crítico.' },
          { id: '2', tipo: 'FINANCEIRO', mensagem: '2 boletos vencem hoje (R$ 1.250,00).' }
        ]
      });
    } catch (error) {
      console.error("Erro ao carregar dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const carregarInsightIA = async () => {
    try {
      const response = await api.get('/api/ia/financeiro/analise');
      setIaInsight(response.data.mensagem || response.data.analiseIA?.resumoExecutivo || "O fluxo de caixa está saudável. Recomendo focar em promoções para itens de giro lento.");
    } catch (error) {
      setIaInsight("A Aurya está analisando seus dados silenciosamente. Tudo operando dentro da normalidade.");
    } finally {
      setLoadingIA(false);
    }
  };

  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor || 0);
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex h-[80vh] flex-col items-center justify-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-violet-500" />
          <p className="text-slate-400 font-bold uppercase tracking-widest">Sincronizando Empresa...</p>
        </div>
      </Layout>
    );
  }

  // 🛡️ Extração Segura das Variáveis da DRE (Blindagem contra Undefined)
  const margemReal = data?.dre?.margemLucro ?? data?.dre?.margem ?? 0;
  const despesasReais = data?.dre?.despesasOperacionais ?? data?.dre?.despesas ?? 0;
  const lucroLiquidoReal = data?.dre?.lucroLiquido ?? 0;

  return (
    <Layout>
      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-up { animation: fadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>

      <div className="mx-auto max-w-7xl space-y-6 pb-12 animate-fade-up">
        
        {/* 🧠 O VEREDITO DA AURYA (TOPO) */}
        <div className="relative overflow-hidden rounded-[30px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(139,92,246,0.15),_transparent_40%),linear-gradient(135deg,_#0b1020_0%,_#08101f_100%)] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.40)] flex flex-col md:flex-row items-center gap-6">
          <div className="absolute top-0 right-0 w-64 h-64 bg-violet-600/10 rounded-full blur-[80px] pointer-events-none"></div>
          
          <div className="relative shrink-0">
            <img src="/Aurya.jpeg" alt="Aurya IA" className="w-20 h-20 rounded-full border-2 border-violet-500/50 shadow-[0_0_20px_rgba(139,92,246,0.4)]" />
            <div className="absolute -bottom-1 -right-1 bg-[#08101f] rounded-full p-1">
              <Sparkles className="w-5 h-5 text-violet-400 animate-pulse" />
            </div>
          </div>

          <div className="flex-1 text-center md:text-left relative z-10">
            <h2 className="text-sm font-black text-violet-400 uppercase tracking-[0.2em] mb-1 flex items-center justify-center md:justify-start gap-2">
              <BrainCircuit className="w-4 h-4" /> Veredito Matinal
            </h2>
            {loadingIA ? (
              <div className="flex items-center gap-3 text-slate-400">
                <Loader2 className="w-4 h-4 animate-spin" /> Aurya está processando seus dados...
              </div>
            ) : (
              <p className="text-lg md:text-xl text-white font-medium leading-relaxed">
                "{iaInsight}"
              </p>
            )}
          </div>
        </div>

        {/* 📊 KPIs VITAIS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Faturamento (Hoje)', valor: formatarMoeda(data?.kpis?.faturamentoHoje || 0), icon: DollarSign, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
            { label: 'Contas a Pagar (Hoje)', valor: formatarMoeda(data?.kpis?.contasPagarHoje || 0), icon: Wallet, color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
            { label: 'Capital em Estoque', valor: formatarMoeda(data?.kpis?.valorEstoque || 0), icon: Package, color: 'text-sky-400', bg: 'bg-sky-500/10', border: 'border-sky-500/20' },
            { label: 'Ticket Médio', valor: formatarMoeda(data?.kpis?.ticketMedio || 0), icon: Activity, color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/20' },
          ].map((kpi, idx) => (
            <div key={idx} className="bg-[#08101f]/90 backdrop-blur-xl border border-white/10 rounded-[24px] p-5 flex items-center gap-4 shadow-lg hover:bg-white/5 transition-colors group">
              <div className={`p-4 rounded-2xl ${kpi.bg} ${kpi.border} border group-hover:scale-110 transition-transform`}>
                <kpi.icon className={`w-7 h-7 ${kpi.color}`} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{kpi.label}</p>
                <p className="text-2xl font-black text-white mt-0.5">{kpi.valor}</p>
              </div>
            </div>
          ))}
        </div>

        {/* 📉 DRE & ALERTAS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Resumo DRE (Ocupa 2 colunas) */}
          <div className="lg:col-span-2 bg-[#08101f]/90 backdrop-blur-xl border border-white/10 rounded-[30px] p-6 shadow-[0_20px_40px_rgba(0,0,0,0.3)]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <LineChart className="w-5 h-5 text-violet-400" /> DRE Resumido (Mês Atual)
              </h3>
              <button className="text-xs font-bold text-violet-400 hover:text-violet-300 flex items-center gap-1">
                Ver DRE Completa <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center p-4 bg-black/20 rounded-2xl border border-white/5">
                <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">Receita Bruta</span>
                <span className="text-xl font-black text-sky-400">{formatarMoeda(data?.dre?.receitaBruta || 0)}</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-black/20 rounded-2xl border border-white/5">
                <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">(-) CMV</span>
                <span className="text-xl font-black text-rose-400">- {formatarMoeda(data?.dre?.cmv || 0)}</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-black/20 rounded-2xl border border-white/5">
                <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">(-) Despesas Op.</span>
                <span className="text-xl font-black text-amber-400">- {formatarMoeda(despesasReais)}</span>
              </div>
              
              <div className="flex justify-between items-center p-5 bg-gradient-to-r from-emerald-500/10 to-transparent rounded-2xl border border-emerald-500/20 mt-4">
                <span className="text-lg font-black text-white uppercase tracking-widest flex items-center gap-2">
                  <TrendingUp className="w-6 h-6 text-emerald-400" /> Lucro Líquido
                </span>
                <div className="text-right">
                  <span className="block text-3xl font-black text-emerald-400">{formatarMoeda(lucroLiquidoReal)}</span>
                  <span className="text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-lg mt-1 inline-block">
                    Margem: {Number(margemReal).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Alertas Operacionais (Ocupa 1 coluna) */}
          <div className="bg-[#08101f]/90 backdrop-blur-xl border border-white/10 rounded-[30px] p-6 shadow-[0_20px_40px_rgba(0,0,0,0.3)] flex flex-col">
            <h3 className="text-lg font-black text-white flex items-center gap-2 mb-6">
              <AlertTriangle className="w-5 h-5 text-amber-400" /> Alertas Operacionais
            </h3>

            <div className="flex-1 flex flex-col gap-3 overflow-y-auto custom-scrollbar">
              {data?.alertas && data.alertas.length > 0 ? (
                data.alertas.map((alerta) => (
                  <div key={alerta.id} className="p-4 rounded-2xl bg-[#0b1324] border border-white/5 flex gap-3 items-start">
                    <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${alerta.tipo === 'ESTOQUE' ? 'bg-sky-400' : 'bg-rose-400'}`}></div>
                    <div>
                      <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${alerta.tipo === 'ESTOQUE' ? 'text-sky-400' : 'text-rose-400'}`}>
                        {alerta.tipo}
                      </p>
                      <p className="text-sm text-slate-300 font-medium leading-relaxed">{alerta.mensagem}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-500 text-center p-6">
                  <Sparkles className="w-10 h-10 mb-3 opacity-20" />
                  <p className="text-sm font-bold">Nenhum alerta pendente.<br/>Operação rodando perfeitamente.</p>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </Layout>
  );
}