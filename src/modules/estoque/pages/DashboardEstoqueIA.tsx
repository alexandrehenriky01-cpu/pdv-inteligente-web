import React, { useState, useEffect } from 'react';
import { api } from '../../../services/api';
import { Layout } from '../../../components/Layout';
import {
  Package,
  AlertTriangle,
  ShoppingCart,
  TrendingDown,
  BrainCircuit,
  Tag,
  CheckCircle2,
  Sparkles,
  Activity,
} from 'lucide-react';
import { AxiosError } from 'axios';

export interface IDadosBrutosEstoque {
  totalItens: number;
  capitalParado: number;
  qtdRisco: number;
  qtdZerados: number;
  qtdExcesso: number;
}

export interface IRecomendacaoIA {
  nome?: string;
  observacao?: string;
}

export interface IAnaliseIAEstoque {
  saudeEstoque: string;
  resumoExecutivo: string;
  produtosCriticosParaComprar: string[];
  sugestoesPromocao: string[];
  recomendacoes: (string | IRecomendacaoIA)[];
}

export interface IDashboardEstoqueIA {
  dadosBrutos: IDadosBrutosEstoque;
  analiseIA: IAnaliseIAEstoque;
}

function useCountUp(end: number, duration: number = 1500) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!end || end === 0) {
      setCount(0);
      return;
    }

    let startTimestamp: number | null = null;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 4);
      setCount(end * easeProgress);

      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        setCount(end);
      }
    };

    window.requestAnimationFrame(step);
  }, [end, duration]);

  return count;
}

export function DashboardEstoqueIA() {
  const [dados, setDados] = useState<IDashboardEstoqueIA | null>(null);
  const [loading, setLoading] = useState(true);

  const totalItensAnim = useCountUp(dados?.dadosBrutos?.totalItens || 0);
  const capitalParadoAnim = useCountUp(dados?.dadosBrutos?.capitalParado || 0);
  const riscoRupturaAnim = useCountUp(
    (dados?.dadosBrutos?.qtdRisco || 0) + (dados?.dadosBrutos?.qtdZerados || 0)
  );
  const excessoAnim = useCountUp(dados?.dadosBrutos?.qtdExcesso || 0);

  useEffect(() => {
    async function carregarAnalise() {
      try {
        const response = await api.get<IDashboardEstoqueIA>('/api/ia/estoque/analise');
        setDados(response.data);
      } catch (err) {
        const error = err as AxiosError<{ error?: string }>;
        console.error('Erro ao carregar IA de Estoque:', error.response?.data || error.message);
      } finally {
        setLoading(false);
      }
    }

    carregarAnalise();
  }, []);

  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(valor || 0);
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex h-[80vh] flex-col items-center justify-center space-y-6">
          <div className="relative">
            <img
              src="/Aurya.jpeg"
              alt="Aurya IA"
              className="h-24 w-24 rounded-full border-4 border-[#0b1020] object-cover shadow-[0_0_30px_rgba(59,130,246,0.35)] animate-pulse"
            />
            <div className="absolute -bottom-2 -right-2 rounded-full border border-white/10 bg-[#0b1020] p-2 shadow-lg">
              <BrainCircuit className="h-10 w-10 text-sky-300" />
            </div>
          </div>

          <p className="max-w-md text-center text-xl font-medium text-slate-200">
            Olá, eu sou a <span className="font-bold text-sky-300">Aurya (Logística)</span>.
            <span className="mt-2 block text-sm font-normal text-slate-400">
              Estou analisando suas prateleiras, giro de produtos e capital parado para gerar seu diagnóstico...
            </span>
          </p>
        </div>
      </Layout>
    );
  }

  if (!dados) {
    return (
      <Layout>
        <div className="mx-auto mt-10 max-w-4xl rounded-[30px] border border-rose-400/20 bg-rose-500/10 p-10 text-center shadow-[0_20px_50px_rgba(0,0,0,0.35)]">
          <div className="mb-4 inline-flex rounded-2xl border border-rose-400/20 bg-rose-500/10 p-4">
            <AlertTriangle className="h-14 w-14 text-rose-300" />
          </div>
          <h2 className="text-2xl font-black tracking-tight text-rose-200">
            Erro de conexão
          </h2>
          <p className="mt-2 font-medium text-slate-300">
            Não foi possível carregar os dados de estoque. Verifique sua conexão com o servidor.
          </p>
        </div>
      </Layout>
    );
  }

  const { dadosBrutos, analiseIA } = dados;

  const corSaude =
    analiseIA.saudeEstoque.includes('Crítica') || analiseIA.saudeEstoque.includes('Critica')
      ? 'bg-rose-500/10 text-rose-300 border-rose-400/20 shadow-[0_0_20px_rgba(244,63,94,0.18)]'
      : analiseIA.saudeEstoque.includes('Atenção') || analiseIA.saudeEstoque.includes('Atencao')
        ? 'bg-amber-500/10 text-amber-300 border-amber-400/20 shadow-[0_0_20px_rgba(245,158,11,0.16)]'
        : 'bg-emerald-500/10 text-emerald-300 border-emerald-400/20 shadow-[0_0_20px_rgba(16,185,129,0.16)]';

  const cardBase =
    'rounded-[28px] border border-white/10 bg-[#08101f]/90 p-7 shadow-[0_20px_50px_rgba(0,0,0,0.35)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1';

  return (
    <Layout>
      <style>{`
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-down {
          animation: fadeInDown 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      <div className="mx-auto max-w-7xl space-y-8 pb-12 animate-fade-in-down">
        <div className="relative overflow-hidden rounded-[30px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.14),_transparent_24%),radial-gradient(circle_at_top_right,_rgba(34,211,238,0.10),_transparent_20%),linear-gradient(135deg,_#0b1020_0%,_#08101f_45%,_#0a1224_100%)] p-6 shadow-[0_25px_70px_rgba(0,0,0,0.40)] sm:p-8">
          <div className="pointer-events-none absolute -left-10 top-0 h-52 w-52 rounded-full bg-sky-600/15 blur-[100px]" />
          <div className="pointer-events-none absolute right-0 top-0 h-56 w-56 rounded-full bg-cyan-600/10 blur-[110px]" />

          <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="rounded-2xl border border-sky-400/20 bg-sky-500/10 p-3 shadow-[0_0_20px_rgba(59,130,246,0.12)]">
                <Package className="h-8 w-8 text-sky-300" />
              </div>

              <div>
                <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-sky-400/20 bg-sky-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-sky-300">
                  <Sparkles className="h-3.5 w-3.5" />
                  Supply Chain Intelligence
                </div>

                <h1 className="text-3xl font-black tracking-tight text-white md:text-4xl">
                  Inteligência de Estoque
                </h1>
                <p className="mt-1 font-medium text-slate-400">
                  Análise preditiva de supply chain com IA.
                </p>
              </div>
            </div>

            <span
              className={`inline-flex items-center gap-2 rounded-2xl border px-5 py-3 text-sm font-black uppercase tracking-[0.16em] backdrop-blur-md ${corSaude}`}
            >
              Status: {analiseIA.saudeEstoque}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          <div className={`${cardBase} group hover:border-sky-400/20`}>
            <p className="mb-3 text-xs font-black uppercase tracking-[0.16em] text-slate-400">
              Total de SKUs
            </p>
            <p className="text-4xl font-black text-white transition-colors group-hover:text-sky-300">
              {Math.round(totalItensAnim)}{' '}
              <span className="text-lg font-medium text-slate-500">produtos</span>
            </p>
          </div>

          <div className={`${cardBase} group hover:border-sky-400/20`}>
            <p className="mb-3 text-xs font-black uppercase tracking-[0.16em] text-slate-400">
              Capital Parado
            </p>
            <p className="text-4xl font-black text-sky-300 drop-shadow-[0_0_10px_rgba(96,165,250,0.22)]">
              {formatarMoeda(capitalParadoAnim)}
            </p>
          </div>

          <div
            className={`${cardBase} group ${
              riscoRupturaAnim > 0 ? 'hover:border-rose-400/20' : 'hover:border-emerald-400/20'
            }`}
          >
            <p
              className={`mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] ${
                riscoRupturaAnim > 0 ? 'text-rose-300' : 'text-slate-400'
              }`}
            >
              <AlertTriangle className="h-4 w-4" />
              Risco de Ruptura
            </p>
            <p
              className={`text-4xl font-black ${
                riscoRupturaAnim > 0
                  ? 'text-rose-300 drop-shadow-[0_0_10px_rgba(244,63,94,0.22)]'
                  : 'text-white'
              }`}
            >
              {Math.round(riscoRupturaAnim)}{' '}
              <span className="text-lg font-medium opacity-70">itens</span>
            </p>
          </div>

          <div
            className={`${cardBase} group ${
              excessoAnim > 0 ? 'hover:border-amber-400/20' : 'hover:border-emerald-400/20'
            }`}
          >
            <p
              className={`mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] ${
                excessoAnim > 0 ? 'text-amber-300' : 'text-slate-400'
              }`}
            >
              <TrendingDown className="h-4 w-4" />
              Excesso / Encalhados
            </p>
            <p
              className={`text-4xl font-black ${
                excessoAnim > 0
                  ? 'text-amber-300 drop-shadow-[0_0_10px_rgba(245,158,11,0.22)]'
                  : 'text-white'
              }`}
            >
              {Math.round(excessoAnim)}{' '}
              <span className="text-lg font-medium opacity-70">itens</span>
            </p>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-[30px] border border-sky-400/15 bg-[#08101f]/95 p-8 shadow-[0_25px_70px_rgba(0,0,0,0.40)] md:p-10">
          <div className="pointer-events-none absolute right-0 top-0 h-96 w-96 rounded-full bg-sky-600/10 blur-[100px]" />

          <div className="relative z-10 mb-8 flex items-center gap-5 border-b border-white/10 pb-8">
            <div className="relative shrink-0">
              <img
                src="/Aurya.jpeg"
                alt="Aurya IA"
                className="h-20 w-20 rounded-full border-2 border-sky-400/20 object-cover shadow-[0_0_24px_rgba(59,130,246,0.24)] grayscale-[10%]"
              />
              <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full border-4 border-[#08101f] bg-emerald-500 shadow-[0_0_10px_rgba(34,197,94,0.8)] animate-pulse" />
            </div>

            <div>
              <h2 className="flex items-center gap-3 text-2xl font-black tracking-tight text-white md:text-3xl">
                Visão da Aurya
                <span className="text-xl font-medium text-sky-300">(Logística)</span>
                <BrainCircuit className="h-7 w-7 text-sky-300" />
              </h2>
              <p className="mt-2 text-sm font-bold uppercase tracking-[0.18em] text-slate-400">
                Inteligência Artificial de Supply Chain
              </p>
            </div>
          </div>

          <div className="relative z-10 mb-8 rounded-[24px] border border-sky-400/15 bg-sky-500/10 p-6 shadow-inner">
            <div className="absolute inset-y-0 left-0 w-1.5 rounded-l-[24px] bg-gradient-to-b from-sky-500 to-cyan-500" />
            <p className="pl-5 text-lg font-medium italic leading-8 text-white md:text-xl">
              "{analiseIA.resumoExecutivo}"
            </p>
          </div>

          <div className="relative z-10 mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-[26px] border border-rose-400/20 bg-rose-500/10 p-7 shadow-[0_18px_45px_rgba(0,0,0,0.28)]">
              <h3 className="mb-6 flex items-center gap-3 text-sm font-black uppercase tracking-[0.18em] text-rose-300">
                <ShoppingCart className="h-5 w-5" />
                Comprar Urgente
              </h3>

              <ul className="space-y-4">
                {analiseIA.produtosCriticosParaComprar?.length > 0 ? (
                  analiseIA.produtosCriticosParaComprar.map((prod: string, i: number) => (
                    <li
                      key={i}
                      className="flex items-start gap-4 rounded-2xl border border-white/10 bg-[#0b1324] p-4 text-base font-medium text-slate-200 shadow-inner"
                    >
                      <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-rose-400 shadow-[0_0_10px_rgba(244,63,94,0.8)]" />
                      <span className="leading-tight">{prod}</span>
                    </li>
                  ))
                ) : (
                  <li className="flex items-center gap-3 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4 text-base font-bold text-emerald-300">
                    <CheckCircle2 className="h-6 w-6" />
                    Nenhum produto em risco crítico!
                  </li>
                )}
              </ul>
            </div>

            <div className="rounded-[26px] border border-amber-400/20 bg-amber-500/10 p-7 shadow-[0_18px_45px_rgba(0,0,0,0.28)]">
              <h3 className="mb-6 flex items-center gap-3 text-sm font-black uppercase tracking-[0.18em] text-amber-300">
                <Tag className="h-5 w-5" />
                Fazer Promoção
              </h3>

              <ul className="space-y-4">
                {analiseIA.sugestoesPromocao?.length > 0 ? (
                  analiseIA.sugestoesPromocao.map((prod: string, i: number) => (
                    <li
                      key={i}
                      className="flex items-start gap-4 rounded-2xl border border-white/10 bg-[#0b1324] p-4 text-base font-medium text-slate-200 shadow-inner"
                    >
                      <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.8)]" />
                      <span className="leading-tight">{prod}</span>
                    </li>
                  ))
                ) : (
                  <li className="flex items-center gap-3 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4 text-base font-bold text-emerald-300">
                    <CheckCircle2 className="h-6 w-6" />
                    Estoque girando perfeitamente!
                  </li>
                )}
              </ul>
            </div>
          </div>

          <div className="relative z-10 rounded-[28px] border border-white/10 bg-black/10 p-8 shadow-[0_18px_45px_rgba(0,0,0,0.28)]">
            <h3 className="mb-6 flex items-center gap-3 text-sm font-black uppercase tracking-[0.18em] text-white">
              <span className="h-3 w-3 rounded-full bg-sky-400 shadow-[0_0_12px_rgba(59,130,246,0.9)] animate-pulse" />
              Plano de Ação Logístico
            </h3>

            <ul className="space-y-5">
              {analiseIA.recomendacoes?.map((rec: string | IRecomendacaoIA, index: number) => {
                const textoRecomendacao =
                  typeof rec === 'string'
                    ? rec
                    : `${rec.nome || 'Recomendação'}: ${rec.observacao || ''}`;

                return (
                  <li
                    key={index}
                    className="group flex items-start gap-5 rounded-[22px] border border-white/10 bg-[#0b1324] p-5 shadow-inner transition-all hover:border-sky-400/20"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-sky-400/20 bg-sky-500/10 font-black text-sky-300 transition-transform group-hover:scale-110">
                      {index + 1}
                    </span>

                    <span
                      className="pt-1 text-base font-medium leading-8 text-slate-300 [&>strong]:font-black [&>strong]:text-sky-300"
                      dangerouslySetInnerHTML={{
                        __html: textoRecomendacao.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                      }}
                    />
                  </li>
                );
              })}
            </ul>

            <div className="mt-6 flex items-center gap-2 text-xs font-medium text-slate-500">
              <Activity className="h-4 w-4 text-sky-300" />
              Priorize compras, giro e liquidação de excesso para melhorar saúde do estoque e capital de giro.
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}