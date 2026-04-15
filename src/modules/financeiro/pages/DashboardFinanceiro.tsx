import { useEffect, useState } from 'react';
import { api } from '../../../services/api';
import { Layout } from '../../../components/Layout';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertTriangle,
  BrainCircuit,
  Package,
  Sparkles,
  Wallet,
  Landmark,
} from 'lucide-react';
import { AxiosError } from 'axios';
import { auryaBrandMark } from '../../../assets/branding';

export interface IDadosBrutosFinanceiro {
  saldoCaixa: number;
  faturamentoTotal: number;
  capitalParado: number;
  aReceber: number;
  aPagar: number;
}

export interface IRecomendacaoFinanceiraIA {
  nome?: string;
  observacao?: string;
}

export interface IAnaliseIAFinanceiro {
  saudeFinanceira: string;
  resumoExecutivo: string;
  analiseFluxoCaixa: string;
  alertaEstoque: string;
  recomendacoes: (string | IRecomendacaoFinanceiraIA)[];
}

export interface IDashboardFinanceiroIA {
  dadosBrutos: IDadosBrutosFinanceiro;
  analiseIA: IAnaliseIAFinanceiro;
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

export function DashboardFinanceiro() {
  const [dados, setDados] = useState<IDashboardFinanceiroIA | null>(null);
  const [loading, setLoading] = useState(true);

  const saldoCaixaAnim = useCountUp(dados?.dadosBrutos?.saldoCaixa || 0);
  const faturamentoAnim = useCountUp(dados?.dadosBrutos?.faturamentoTotal || 0);
  const capitalParadoAnim = useCountUp(dados?.dadosBrutos?.capitalParado || 0);
  const aReceberAnim = useCountUp(dados?.dadosBrutos?.aReceber || 0);
  const aPagarAnim = useCountUp(dados?.dadosBrutos?.aPagar || 0);

  useEffect(() => {
    async function carregarAnalise() {
      try {
        const response = await api.get<IDashboardFinanceiroIA>('/api/ia/financeiro/analise');
        setDados(response.data);
      } catch (err) {
        const error = err as AxiosError<{ error?: string }>;
        console.error('Erro ao carregar IA:', error.response?.data || error.message);
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
              src={auryaBrandMark}
              alt="Aurya IA"
              className="h-24 w-24 rounded-full border-4 border-[#0b1020] object-cover shadow-[0_0_30px_rgba(6,182,212,0.35)] animate-pulse grayscale-[10%]"
            />
            <div className="absolute -bottom-2 -right-2 rounded-full border border-white/10 bg-[#0b1020] p-2 shadow-lg">
              <BrainCircuit className="h-10 w-10 text-cyan-300" />
            </div>
          </div>

          <p className="max-w-md text-center text-xl font-medium text-slate-200">
            Olá, eu sou a <span className="font-bold text-cyan-300">Aurya (CFO)</span>.
            <span className="mt-2 block text-sm font-normal text-slate-400">
              Analisando seu fluxo de caixa e inventário para gerar o diagnóstico financeiro...
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
            <AlertTriangle className="h-14 w-14 animate-pulse text-rose-300" />
          </div>
          <h2 className="text-2xl font-black tracking-tight text-rose-200">
            Erro de conexão
          </h2>
          <p className="mt-2 font-medium text-slate-300">
            Não foi possível carregar a análise da IA. Verifique sua conexão com o servidor.
          </p>
        </div>
      </Layout>
    );
  }

  const { dadosBrutos, analiseIA } = dados;

  const saudeFinanceira = analiseIA?.saudeFinanceira || '';

  const corSaude =
    saudeFinanceira.includes('Precária') ||
    saudeFinanceira.includes('Crítica') ||
    saudeFinanceira.includes('Critica')
      ? {
          bg: 'bg-rose-500/10',
          border: 'border-rose-400/20',
          text: 'text-rose-300',
          shadow: 'shadow-[0_0_30px_rgba(244,63,94,0.16)]',
          icon: <TrendingDown className="h-5 w-5 text-rose-300" />,
        }
      : saudeFinanceira.includes('Atenção') ||
          saudeFinanceira.includes('Atencao')
        ? {
            bg: 'bg-amber-500/10',
            border: 'border-amber-400/20',
            text: 'text-amber-300',
            shadow: 'shadow-[0_0_30px_rgba(245,158,11,0.14)]',
            icon: <AlertTriangle className="h-5 w-5 text-amber-300" />,
          }
        : {
            bg: 'bg-emerald-500/10',
            border: 'border-emerald-400/20',
            text: 'text-emerald-300',
            shadow: 'shadow-[0_0_30px_rgba(16,185,129,0.14)]',
            icon: <TrendingUp className="h-5 w-5 text-emerald-300" />,
          };

  const solidCardStyle =
    'rounded-[28px] border border-white/10 bg-[#08101f]/90 p-7 shadow-[0_20px_50px_rgba(0,0,0,0.35)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1';
  const iconContainerStyle =
    'rounded-2xl border border-white/10 bg-black/10 p-4 shadow-inner transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3';

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
        @keyframes borderSpin {
          100% { transform: rotate(360deg); }
        }
        .animate-border-spin {
          animation: borderSpin 3s linear infinite;
        }
      `}</style>

      <div className="mx-auto max-w-7xl space-y-8 pb-12 animate-fade-in-down">
        <div className="relative overflow-hidden rounded-[30px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(6,182,212,0.14),_transparent_24%),radial-gradient(circle_at_top_right,_rgba(59,130,246,0.10),_transparent_20%),linear-gradient(135deg,_#0b1020_0%,_#08101f_45%,_#0a1224_100%)] p-6 shadow-[0_25px_70px_rgba(0,0,0,0.40)] sm:p-8">
          <div className="pointer-events-none absolute -left-10 top-0 h-52 w-52 rounded-full bg-cyan-600/15 blur-[100px]" />
          <div className="pointer-events-none absolute right-0 top-0 h-56 w-56 rounded-full bg-sky-600/10 blur-[110px]" />

          <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-cyan-300">
                <Sparkles className="h-3.5 w-3.5" />
                Financial Intelligence
              </div>

              <h1 className="flex items-center gap-4 text-3xl font-black tracking-tight text-white md:text-4xl">
                <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/10 p-3 shadow-[0_0_20px_rgba(6,182,212,0.12)]">
                  <DollarSign className="h-8 w-8 text-cyan-300" />
                </div>
                Painel Financeiro
              </h1>

              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300 sm:text-[15px]">
                Diagnóstico financeiro com leitura de caixa, faturamento, capital parado,
                contas a receber e contas a pagar.
              </p>
            </div>

            <span
              className={`inline-flex items-center gap-2 rounded-2xl border px-5 py-3 text-sm font-black uppercase tracking-[0.16em] backdrop-blur-md ${corSaude.bg} ${corSaude.border} ${corSaude.text} ${corSaude.shadow}`}
            >
              {corSaude.icon}
              Saúde: {saudeFinanceira || 'Carregando...'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          <div className={`${solidCardStyle} group hover:border-cyan-400/20`}>
            <div className="mb-6 flex items-start justify-between">
              <h3 className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                Saldo em Caixa
              </h3>
              <div className={`${iconContainerStyle} text-cyan-300`}>
                <Wallet className="h-6 w-6" />
              </div>
            </div>

            <p
              className={`mb-2 text-4xl font-black tracking-tighter ${
                dadosBrutos.saldoCaixa > 0
                  ? 'text-white'
                  : 'text-rose-300 drop-shadow-[0_0_12px_rgba(244,63,94,0.22)]'
              }`}
            >
              {formatarMoeda(saldoCaixaAnim)}
            </p>
          </div>

          <div className={`${solidCardStyle} group hover:border-emerald-400/20`}>
            <div className="mb-6 flex items-start justify-between">
              <h3 className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                Faturamento
              </h3>
              <div className={`${iconContainerStyle} text-emerald-300`}>
                <TrendingUp className="h-6 w-6" />
              </div>
            </div>

            <p
              className={`mb-2 text-4xl font-black tracking-tighter ${
                dadosBrutos.faturamentoTotal > 0
                  ? 'text-emerald-300 drop-shadow-[0_0_12px_rgba(52,211,153,0.22)]'
                  : 'text-slate-500'
              }`}
            >
              {formatarMoeda(faturamentoAnim)}
            </p>
          </div>

          <div className={`${solidCardStyle} group hover:border-amber-400/20`}>
            <div className="mb-6 flex items-start justify-between">
              <h3 className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                Capital Parado
              </h3>
              <div className={`${iconContainerStyle} text-amber-300`}>
                <Package className="h-6 w-6" />
              </div>
            </div>

            <p
              className={`mb-2 text-4xl font-black tracking-tighter ${
                dadosBrutos.capitalParado > 0
                  ? 'text-amber-300 drop-shadow-[0_0_12px_rgba(245,158,11,0.22)]'
                  : 'text-slate-500'
              }`}
            >
              {formatarMoeda(capitalParadoAnim)}
            </p>
          </div>

          <div className={`${solidCardStyle} group flex flex-col justify-center gap-4 hover:border-white/15`}>
            <h3 className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
              A Receber / A Pagar
            </h3>

            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/10 p-4 transition-colors group-hover:bg-black/20">
              <span className="flex items-center gap-2 text-sm font-bold text-sky-300">
                <TrendingUp className="h-4 w-4" />
                Receber
              </span>
              <span className="text-xl font-black text-white">
                {formatarMoeda(aReceberAnim)}
              </span>
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/10 p-4 transition-colors group-hover:bg-black/20">
              <span className="flex items-center gap-2 text-sm font-bold text-rose-300">
                <TrendingDown className="h-4 w-4" />
                Pagar
              </span>
              <span className="text-xl font-black text-white">
                {formatarMoeda(aPagarAnim)}
              </span>
            </div>
          </div>
        </div>

        <div className={`relative overflow-hidden rounded-[30px] p-[1px] ${corSaude.shadow}`}>
          <div className="absolute inset-[-100%] bg-[conic-gradient(from_90deg_at_50%_50%,#0f172a_0%,#06b6d4_26%,#3b82f6_50%,#0f172a_100%)] opacity-60 animate-border-spin" />

          <div className="relative z-10 rounded-[29px] border border-white/10 bg-[#08101f]/95 p-8 shadow-[0_25px_70px_rgba(0,0,0,0.40)] md:p-10">
            <div className="pointer-events-none absolute right-0 top-0 h-96 w-96 rounded-full bg-cyan-600/10 blur-[100px]" />

            <div className="relative z-10 mb-8 flex items-center gap-5 border-b border-white/10 pb-8">
              <div className="relative shrink-0">
                <img
                  src={auryaBrandMark}
                  alt="Aurya IA"
                  className="h-20 w-20 rounded-full border-2 border-cyan-400/20 object-cover shadow-[0_0_24px_rgba(6,182,212,0.24)] grayscale-[10%]"
                />
                <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full border-4 border-[#08101f] bg-emerald-500 shadow-[0_0_10px_rgba(34,197,94,0.8)] animate-pulse" />
              </div>

              <div>
                <h2 className="flex items-center gap-3 text-2xl font-black tracking-tight text-white md:text-3xl">
                  Diagnóstico da Aurya
                  <span className="text-xl font-medium text-cyan-300">(CFO)</span>
                  <Sparkles className="h-7 w-7 animate-pulse text-cyan-300" />
                </h2>
                <p className="mt-2 text-sm font-bold uppercase tracking-[0.18em] text-slate-400">
                  Inteligência Artificial Financeira
                </p>
              </div>
            </div>

            <div className="relative z-10 mb-8 rounded-[24px] border border-cyan-400/15 bg-cyan-500/10 p-6 shadow-inner">
              <div className="absolute inset-y-0 left-0 w-1.5 rounded-l-[24px] bg-gradient-to-b from-cyan-400 to-blue-600" />
              <p className="pl-5 text-lg font-medium italic leading-8 text-white md:text-xl">
                "{analiseIA?.resumoExecutivo || 'Carregando análise...'}"
              </p>
            </div>

            <div className="relative z-10 mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="rounded-[26px] border border-white/10 bg-black/10 p-7 shadow-[0_18px_45px_rgba(0,0,0,0.28)]">
                <h3 className="mb-5 flex items-center gap-3 text-sm font-black uppercase tracking-[0.18em] text-cyan-300">
                  <TrendingUp className="h-5 w-5" />
                  Análise de Fluxo de Caixa
                </h3>
                <p className="text-base font-medium leading-8 text-slate-300">
                  {analiseIA?.analiseFluxoCaixa || 'Aguardando dados...'}
                </p>
              </div>

              <div className="rounded-[26px] border border-white/10 bg-black/10 p-7 shadow-[0_18px_45px_rgba(0,0,0,0.28)]">
                <h3 className="mb-5 flex items-center gap-3 text-sm font-black uppercase tracking-[0.18em] text-amber-300">
                  <AlertTriangle className="h-5 w-5" />
                  Alerta de Estoque e Compras
                </h3>
                <p className="text-base font-medium leading-8 text-slate-300">
                  {analiseIA?.alertaEstoque || 'Aguardando dados...'}
                </p>
              </div>
            </div>

            <div className="relative z-10 rounded-[28px] border border-white/10 bg-black/10 p-8 shadow-[0_18px_45px_rgba(0,0,0,0.28)]">
              <h3 className="mb-6 flex items-center gap-3 text-sm font-black uppercase tracking-[0.18em] text-white">
                <span className="h-3 w-3 rounded-full bg-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.9)] animate-pulse" />
                Plano de Ação Estratégico
              </h3>

              <ul className="space-y-4">
                {(analiseIA?.recomendacoes || []).map((rec: string | IRecomendacaoFinanceiraIA, index: number) => {
                  const textoRecomendacao =
                    typeof rec === 'string'
                      ? rec
                      : `${rec.nome || 'Recomendação'}: ${rec.observacao || ''}`;

                  return (
                    <li
                      key={index}
                      className="group flex items-start gap-5 rounded-[22px] border border-white/10 bg-[#0b1324] p-5 shadow-inner transition-all hover:border-cyan-400/20"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-500/10 font-black text-cyan-300 transition-transform group-hover:scale-110">
                        {index + 1}
                      </span>

                      <span
                        className="pt-1 text-base font-medium leading-8 text-slate-300 [&>strong]:font-black [&>strong]:text-cyan-300"
                        dangerouslySetInnerHTML={{
                          __html: textoRecomendacao.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                        }}
                      />
                    </li>
                  );
                })}
              </ul>

              <div className="mt-6 flex items-center gap-2 text-xs font-medium text-slate-500">
                <Landmark className="h-4 w-4 text-cyan-300" />
                Priorize caixa, liquidez, recebíveis e capital de giro para melhorar a saúde financeira da operação.
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}