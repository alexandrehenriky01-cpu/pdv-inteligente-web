import React, { useState, useEffect } from 'react';
import { api } from '../../../services/api';
import { Layout } from '../../../components/Layout';
import { RelatorioErrorBoundary } from '../../../components/RelatorioErrorBoundary';
import {
  TrendingUp,
  TrendingDown,
  Calculator,
  Loader2,
  Activity,
  Sparkles,
  Landmark,
} from 'lucide-react';
import { AxiosError } from 'axios';
import {
  extrairResumoDreApi,
  formatarMoedaContabil,
  normalizarIndicadoresDreApi,
} from '../utils/dreApi';

export interface IDREData {
  receitaBruta: number;
  cmv: number;
  lucroBruto: number;
  despesasOperacionais: number;
  lucroLiquido: number;
  margemLucro: number;
  resumo: 'LUCRO' | 'PREJUÍZO' | 'PONTO DE EQUILÍBRIO';
}

export function DREPage() {
  const [dre, setDre] = useState<IDREData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void carregarDRE();
  }, []);

  async function carregarDRE() {
    try {
      setLoading(true);
      const response = await api.get<unknown>('/api/contabilidade/dre');
      const raw = response.data;
      const ind = normalizarIndicadoresDreApi(raw);
      const resumo = extrairResumoDreApi(raw);
      setDre({
        ...ind,
        resumo,
      });
    } catch (err) {
      const error = err as AxiosError<{ error?: string }>;
      console.error('Erro ao carregar DRE:', error.response?.data || error.message);
      setDre(null);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex h-[80vh] flex-col items-center justify-center gap-4">
          <div className="rounded-2xl border border-violet-400/20 bg-violet-500/10 p-4">
            <Loader2 className="h-12 w-12 animate-spin text-violet-300" />
          </div>
          <p className="animate-pulse text-sm font-bold uppercase tracking-[0.16em] text-slate-400">
            Calculando Balanço e DRE...
          </p>
        </div>
      </Layout>
    );
  }

  if (!dre) {
    return (
      <Layout>
        <div className="flex h-[80vh] flex-col items-center justify-center gap-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <Activity className="h-12 w-12 text-slate-500" />
          </div>
          <p className="text-base font-bold text-slate-400">
            Nenhum dado financeiro encontrado para o período.
          </p>
        </div>
      </Layout>
    );
  }

  const isLucro = dre.lucroLiquido >= 0;
  const margemExibicao = (Number(dre.margemLucro) || 0).toFixed(2);

  return (
    <Layout>
      <RelatorioErrorBoundary titulo="Não foi possível carregar o DRE.">
        <div className="mx-auto flex h-full max-w-5xl flex-col space-y-8 pb-12">
          <div className="relative overflow-hidden rounded-[30px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(139,92,246,0.16),_transparent_26%),linear-gradient(135deg,_#0b1020_0%,_#08101f_45%,_#0a1224_100%)] p-6 shadow-[0_25px_70px_rgba(0,0,0,0.40)] sm:p-8">
            <div className="pointer-events-none absolute -left-10 top-0 h-52 w-52 rounded-full bg-violet-600/15 blur-[100px]" />
            <div className="pointer-events-none absolute right-0 top-0 h-56 w-56 rounded-full bg-fuchsia-600/10 blur-[110px]" />

            <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-violet-300">
                  <Sparkles className="h-3.5 w-3.5" />
                  Financial Statement
                </div>

                <h1 className="flex items-center gap-4 text-3xl font-black tracking-tight text-white">
                  <div className="rounded-2xl border border-violet-400/20 bg-violet-500/10 p-3 shadow-[0_0_20px_rgba(139,92,246,0.12)]">
                    <Calculator className="h-8 w-8 text-violet-300" />
                  </div>
                  DRE - Demonstrativo de Resultados
                </h1>

                <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300 sm:text-[15px]">
                  Visão gerencial de competência para acompanhar receita, custo, lucro bruto, despesas operacionais e
                  resultado líquido (dados do Livro Razão — lançamentos contábeis).
                </p>
              </div>

              <div
                className={`rounded-[24px] border-2 px-6 py-4 shadow-[0_20px_40px_rgba(0,0,0,0.25)] backdrop-blur-md ${
                  isLucro
                    ? 'border-emerald-400/20 bg-emerald-500/10'
                    : 'border-rose-400/20 bg-rose-500/10'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`rounded-2xl p-3 ${
                      isLucro
                        ? 'bg-emerald-500/15 text-emerald-300'
                        : 'bg-rose-500/15 text-rose-300'
                    }`}
                  >
                    {isLucro ? (
                      <TrendingUp className="h-8 w-8" />
                    ) : (
                      <TrendingDown className="h-8 w-8" />
                    )}
                  </div>

                  <div>
                    <p
                      className={`text-xs font-black uppercase tracking-[0.16em] ${
                        isLucro ? 'text-emerald-300/90' : 'text-rose-300/90'
                      }`}
                    >
                      Resultado do Exercício
                    </p>
                    <p
                      className={`mt-1 text-2xl font-black ${
                        isLucro ? 'text-emerald-300' : 'text-rose-300'
                      }`}
                    >
                      {formatarMoedaContabil(dre.lucroLiquido)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-[30px] border border-white/10 bg-[#08101f]/90 shadow-[0_25px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl">
            <div className="border-b border-white/10 bg-black/10 px-6 py-5">
              <div className="flex items-center gap-3">
                <Landmark className="h-5 w-5 text-violet-300" />
                <h2 className="text-lg font-black tracking-tight text-white">Estrutura do DRE</h2>
              </div>
              <p className="mt-1 text-sm text-slate-400">Demonstrativo sintético do resultado do exercício.</p>
            </div>

            <div className="text-base">
              <div className="flex flex-col gap-3 border-b border-white/10 bg-black/10 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
                <span className="flex items-center gap-3 text-sm font-black uppercase tracking-[0.16em] text-slate-300">
                  <span className="h-2 w-2 rounded-full bg-sky-400" />
                  1. Receita Bruta de Vendas
                </span>
                <span className="font-mono text-xl font-black text-sky-300">
                  {formatarMoedaContabil(dre.receitaBruta)}
                </span>
              </div>

              <div className="flex flex-col gap-3 border-b border-white/5 bg-white/[0.02] px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:pl-12">
                <span className="text-sm font-bold text-slate-500">
                  (-) Custo das Mercadorias Vendidas (CMV)
                </span>
                <span className="font-mono font-bold text-rose-300">
                  - {formatarMoedaContabil(dre.cmv)}
                </span>
              </div>

              <div className="flex flex-col gap-3 border-b border-violet-400/10 bg-violet-500/10 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
                <span className="flex items-center gap-3 text-sm font-black uppercase tracking-[0.16em] text-violet-300">
                  <span className="h-2 w-2 rounded-full bg-violet-400" />
                  2. Lucro Bruto
                </span>
                <span className="font-mono text-xl font-black text-violet-300">
                  {formatarMoedaContabil(dre.lucroBruto)}
                </span>
              </div>

              <div className="flex flex-col gap-3 border-b border-white/5 bg-white/[0.02] px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:pl-12">
                <span className="text-sm font-bold text-slate-500">
                  (-) Despesas Operacionais / Administrativas
                </span>
                <span className="font-mono font-bold text-rose-300">
                  - {formatarMoedaContabil(dre.despesasOperacionais)}
                </span>
              </div>

              <div
                className={`flex flex-col justify-between gap-4 px-6 py-8 sm:flex-row sm:items-center ${
                  isLucro
                    ? 'border-t border-emerald-400/20 bg-gradient-to-r from-emerald-500/15 to-emerald-500/5'
                    : 'border-t border-rose-400/20 bg-gradient-to-r from-rose-500/15 to-rose-500/5'
                }`}
              >
                <span className="flex items-center gap-3 text-xl font-black uppercase tracking-[0.16em] text-white">
                  <span
                    className={`h-3 w-3 animate-pulse rounded-full ${
                      isLucro ? 'bg-emerald-400' : 'bg-rose-400'
                    }`}
                  />
                  3. Resultado Líquido
                </span>

                <div className="rounded-[22px] border border-white/10 bg-black/10 p-4 backdrop-blur-md sm:text-right">
                  <span
                    className={`block font-mono text-3xl font-black ${
                      isLucro ? 'text-emerald-300' : 'text-rose-300'
                    }`}
                  >
                    {formatarMoedaContabil(dre.lucroLiquido)}
                  </span>

                  <span className="mt-2 inline-block rounded-xl border border-white/10 bg-white/5 px-3 py-1 text-sm font-bold text-slate-300">
                    Margem Líquida:{' '}
                    <strong className={isLucro ? 'text-emerald-300' : 'text-rose-300'}>{margemExibicao}%</strong>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </RelatorioErrorBoundary>
    </Layout>
  );
}
