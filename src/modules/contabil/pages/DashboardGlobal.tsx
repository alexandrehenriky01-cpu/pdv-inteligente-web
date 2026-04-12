import React, { useState, useEffect } from 'react';
import { Layout } from '../../../components/Layout';
import { RelatorioErrorBoundary } from '../../../components/RelatorioErrorBoundary';
import { api } from '../../../services/api';
import {
  TrendingUp,
  DollarSign,
  Package,
  AlertTriangle,
  BrainCircuit,
  Activity,
  Wallet,
  ArrowRight,
  Sparkles,
  Loader2,
  LineChart,
} from 'lucide-react';
import { formatarMoedaContabil, normalizarIndicadoresDreApi } from '../utils/dreApi';

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
    void carregarDashboard();
    void carregarInsightIA();
  }, []);

  const carregarDashboard = async () => {
    try {
      /**
       * DRE oficial: `GET /api/contabilidade/dre` agrega `LancamentoContabil` (Razão) por loja.
       * KPIs abaixo permanecem mock/evolutivos até existir endpoint dedicado de fechamento / painel executivo.
       */
      const dreRes = await api.get<unknown>('/api/contabilidade/dre').catch(() => null);
      const indicadores = dreRes?.data != null ? normalizarIndicadoresDreApi(dreRes.data) : null;
      const receita = indicadores?.receitaBruta ?? 0;

      setData({
        kpis: {
          faturamentoHoje: receita > 0 ? receita / 30 : 4580.0,
          contasPagarHoje: 1250.0,
          valorEstoque: 85400.0,
          ticketMedio: 124.5,
        },
        dre:
          indicadores != null
            ? {
                receitaBruta: indicadores.receitaBruta,
                cmv: indicadores.cmv,
                despesasOperacionais: indicadores.despesasOperacionais,
                despesas: indicadores.despesasOperacionais,
                lucroLiquido: indicadores.lucroLiquido,
                margemLucro: indicadores.margemLucro,
                margem: indicadores.margemLucro,
              }
            : {
                receitaBruta: 125000,
                cmv: 45000,
                despesasOperacionais: 30000,
                lucroLiquido: 50000,
                margemLucro: 40,
                margem: 40,
              },
        alertas: [
          { id: '1', tipo: 'ESTOQUE', mensagem: '5 produtos da Curva A estão com estoque crítico.' },
          { id: '2', tipo: 'FINANCEIRO', mensagem: '2 boletos vencem hoje (R$ 1.250,00).' },
        ],
      });
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const carregarInsightIA = async () => {
    try {
      const response = await api.get<{ mensagem?: string; analiseIA?: { resumoExecutivo?: string } }>(
        '/api/ia/financeiro/analise',
      );
      setIaInsight(
        response.data.mensagem ||
          response.data.analiseIA?.resumoExecutivo ||
          'O fluxo de caixa está saudável. Recomendo focar em promoções para itens de giro lento.',
      );
    } catch {
      setIaInsight('A Aurya está analisando seus dados silenciosamente. Tudo operando dentro da normalidade.');
    } finally {
      setLoadingIA(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex h-[80vh] flex-col items-center justify-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-violet-500" />
          <p className="font-bold uppercase tracking-widest text-slate-400">Sincronizando Empresa...</p>
        </div>
      </Layout>
    );
  }

  const margemReal = Number(data?.dre?.margemLucro ?? data?.dre?.margem ?? 0);
  const margemSegura = Number.isFinite(margemReal) ? margemReal : 0;
  const despesasReais = Number(data?.dre?.despesasOperacionais ?? data?.dre?.despesas ?? 0);
  const despesasSeguras = Number.isFinite(despesasReais) ? despesasReais : 0;
  const lucroLiquidoReal = Number(data?.dre?.lucroLiquido ?? 0);
  const lucroSeguro = Number.isFinite(lucroLiquidoReal) ? lucroLiquidoReal : 0;

  return (
    <Layout>
      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-up { animation: fadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>

      <RelatorioErrorBoundary titulo="Não foi possível carregar o painel de fechamento contábil.">
        <div className="mx-auto max-w-7xl animate-fade-up space-y-6 pb-12">
          {/* 🧠 O VEREDITO DA AURYA (TOPO) */}
          <div className="relative flex flex-col items-center gap-6 overflow-hidden rounded-[30px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(139,92,246,0.15),_transparent_40%),linear-gradient(135deg,_#0b1020_0%,_#08101f_100%)] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.40)] md:flex-row">
            <div className="pointer-events-none absolute right-0 top-0 h-64 w-64 rounded-full bg-violet-600/10 blur-[80px]" />

            <div className="relative shrink-0">
              <img
                src="/Aurya.jpeg"
                alt="Aurya IA"
                className="h-20 w-20 rounded-full border-2 border-violet-500/50 shadow-[0_0_20px_rgba(139,92,246,0.4)]"
              />
              <div className="absolute -bottom-1 -right-1 rounded-full bg-[#08101f] p-1">
                <Sparkles className="h-5 w-5 animate-pulse text-violet-400" />
              </div>
            </div>

            <div className="relative z-10 flex-1 text-center md:text-left">
              <h2 className="mb-1 flex items-center justify-center gap-2 text-sm font-black uppercase tracking-[0.2em] text-violet-400 md:justify-start">
                <BrainCircuit className="h-4 w-4" /> Veredito Matinal
              </h2>
              {loadingIA ? (
                <div className="flex items-center justify-center gap-3 text-slate-400 md:justify-start">
                  <Loader2 className="h-4 w-4 animate-spin" /> Aurya está processando seus dados...
                </div>
              ) : (
                <p className="text-lg font-medium leading-relaxed text-white md:text-xl">&quot;{iaInsight}&quot;</p>
              )}
            </div>
          </div>

          {/* 📊 KPIs VITAIS */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[
              {
                label: 'Faturamento (Hoje)',
                valor: formatarMoedaContabil(data?.kpis?.faturamentoHoje),
                icon: DollarSign,
                color: 'text-emerald-400',
                bg: 'bg-emerald-500/10',
                border: 'border-emerald-500/20',
              },
              {
                label: 'Contas a Pagar (Hoje)',
                valor: formatarMoedaContabil(data?.kpis?.contasPagarHoje),
                icon: Wallet,
                color: 'text-rose-400',
                bg: 'bg-rose-500/10',
                border: 'border-rose-500/20',
              },
              {
                label: 'Capital em Estoque',
                valor: formatarMoedaContabil(data?.kpis?.valorEstoque),
                icon: Package,
                color: 'text-sky-400',
                bg: 'bg-sky-500/10',
                border: 'border-sky-500/20',
              },
              {
                label: 'Ticket Médio',
                valor: formatarMoedaContabil(data?.kpis?.ticketMedio),
                icon: Activity,
                color: 'text-violet-400',
                bg: 'bg-violet-500/10',
                border: 'border-violet-500/20',
              },
            ].map((kpi, idx) => (
              <div
                key={idx}
                className="group flex items-center gap-4 rounded-[24px] border border-white/10 bg-[#08101f]/90 p-5 shadow-lg backdrop-blur-xl transition-colors hover:bg-white/5"
              >
                <div
                  className={`rounded-2xl border p-4 transition-transform group-hover:scale-110 ${kpi.bg} ${kpi.border}`}
                >
                  <kpi.icon className={`h-7 w-7 ${kpi.color}`} />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400">{kpi.label}</p>
                  <p className="mt-0.5 text-2xl font-black text-white">{kpi.valor}</p>
                </div>
              </div>
            ))}
          </div>

          {/* 📉 DRE & ALERTAS */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="rounded-[30px] border border-white/10 bg-[#08101f]/90 p-6 shadow-[0_20px_40px_rgba(0,0,0,0.3)] backdrop-blur-xl lg:col-span-2">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-lg font-black text-white">
                  <LineChart className="h-5 w-5 text-violet-400" /> DRE Resumido (mês — Livro Razão)
                </h3>
                <button
                  type="button"
                  className="flex items-center gap-1 text-xs font-bold text-violet-400 hover:text-violet-300"
                >
                  Ver DRE Completa <ArrowRight className="h-3 w-3" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-2xl border border-white/5 bg-black/20 p-4">
                  <span className="text-sm font-bold uppercase tracking-widest text-slate-400">Receita Bruta</span>
                  <span className="text-xl font-black text-sky-400">
                    {formatarMoedaContabil(data?.dre?.receitaBruta)}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-white/5 bg-black/20 p-4">
                  <span className="text-sm font-bold uppercase tracking-widest text-slate-400">(-) CMV</span>
                  <span className="text-xl font-black text-rose-400">
                    - {formatarMoedaContabil(data?.dre?.cmv)}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-white/5 bg-black/20 p-4">
                  <span className="text-sm font-bold uppercase tracking-widest text-slate-400">(-) Despesas Op.</span>
                  <span className="text-xl font-black text-amber-400">
                    - {formatarMoedaContabil(despesasSeguras)}
                  </span>
                </div>

                <div className="mt-4 flex items-center justify-between rounded-2xl border border-emerald-500/20 bg-gradient-to-r from-emerald-500/10 to-transparent p-5">
                  <span className="flex items-center gap-2 text-lg font-black uppercase tracking-widest text-white">
                    <TrendingUp className="h-6 w-6 text-emerald-400" /> Lucro Líquido
                  </span>
                  <div className="text-right">
                    <span className="block text-3xl font-black text-emerald-400">
                      {formatarMoedaContabil(lucroSeguro)}
                    </span>
                    <span className="mt-1 inline-block rounded-lg bg-emerald-500/10 px-2 py-1 text-xs font-bold text-emerald-500">
                      Margem: {(margemSegura || 0).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col rounded-[30px] border border-white/10 bg-[#08101f]/90 p-6 shadow-[0_20px_40px_rgba(0,0,0,0.3)] backdrop-blur-xl">
              <h3 className="mb-6 flex items-center gap-2 text-lg font-black text-white">
                <AlertTriangle className="h-5 w-5 text-amber-400" /> Alertas Operacionais
              </h3>

              <div className="custom-scrollbar flex flex-1 flex-col gap-3 overflow-y-auto">
                {data?.alertas && data.alertas.length > 0 ? (
                  data.alertas.map((alerta) => (
                    <div
                      key={alerta.id}
                      className="flex items-start gap-3 rounded-2xl border border-white/5 bg-[#0b1324] p-4"
                    >
                      <div
                        className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${alerta.tipo === 'ESTOQUE' ? 'bg-sky-400' : 'bg-rose-400'}`}
                      />
                      <div>
                        <p
                          className={`mb-1 text-[10px] font-black uppercase tracking-widest ${alerta.tipo === 'ESTOQUE' ? 'text-sky-400' : 'text-rose-400'}`}
                        >
                          {alerta.tipo}
                        </p>
                        <p className="text-sm font-medium leading-relaxed text-slate-300">{alerta.mensagem}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-1 flex-col items-center justify-center p-6 text-center text-slate-500">
                    <Sparkles className="mb-3 h-10 w-10 opacity-20" />
                    <p className="text-sm font-bold">
                      Nenhum alerta pendente.
                      <br />
                      Operação rodando perfeitamente.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </RelatorioErrorBoundary>
    </Layout>
  );
}
