import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  AlertTriangle,
  FileText,
  Download,
  Wallet,
  ShoppingCart,
  ArrowRight,
  Activity,
  Sparkles,
  BrainCircuit,
  BarChart2,
  CheckCircle2,
  Info
} from 'lucide-react';
import { AxiosError } from 'axios';

interface ResumoDashboard {
  vendasHoje: number;
  vendasMes: number;
  contasReceberHoje: number;
  contasPagarHoje: number;
  saldoCaixas: number;
  totalProdutos: number;
  alertasEstoque: number;
  valorTotalEstoque: number;
  notasPendentesEmissao: number;
  xmlPendentesEntrada: number;
  lucroPresumidoMes: number;
}

interface IUsuarioStorage {
  nome?: string;
  [key: string]: unknown;
}

function useCountUp(end: number, duration: number = 1500) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (end === 0) {
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

export function Dashboard() {
  const [resumo, setResumo] = useState<ResumoDashboard>({
    vendasHoje: 0, vendasMes: 0,
    contasReceberHoje: 0, contasPagarHoje: 0, saldoCaixas: 0,
    totalProdutos: 0, alertasEstoque: 0, valorTotalEstoque: 0,
    notasPendentesEmissao: 0, xmlPendentesEntrada: 0,
    lucroPresumidoMes: 0
  });
  const [loading, setLoading] = useState(true);

  const usuario = JSON.parse(localStorage.getItem('@PDVUsuario') || '{}') as IUsuarioStorage;
  const iniciaisUsuario = usuario.nome ? usuario.nome.substring(0, 2).toUpperCase() : 'US';

  useEffect(() => {
    const carregarDashboard = async () => {
      try {
        const response = await api.get<Partial<ResumoDashboard>>('/api/dashboard/resumo');

        const dadosSeguros: ResumoDashboard = {
          vendasHoje: Number(response.data.vendasHoje || 0),
          vendasMes: Number(response.data.vendasMes || 0),
          contasReceberHoje: Number(response.data.contasReceberHoje || 0),
          contasPagarHoje: Number(response.data.contasPagarHoje || 0),
          saldoCaixas: Number(response.data.saldoCaixas || 0),
          totalProdutos: Number(response.data.totalProdutos || 0),
          alertasEstoque: Number(response.data.alertasEstoque || 0),
          valorTotalEstoque: Number(response.data.valorTotalEstoque || 0),
          notasPendentesEmissao: Number(response.data.notasPendentesEmissao || 0),
          xmlPendentesEntrada: Number(response.data.xmlPendentesEntrada || 0),
          lucroPresumidoMes: Number(response.data.lucroPresumidoMes || 0)
        };

        setResumo(dadosSeguros);
      } catch (err) {
        const error = err as AxiosError<{ error?: string }>;
        console.error('Erro ao carregar dashboard:', error.response?.data || error.message);
      } finally {
        setLoading(false);
      }
    };
    carregarDashboard();
  }, []);

  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor || 0);
  };

  const vendasHojeAnim = useCountUp(resumo.vendasHoje);
  const saldoCaixasAnim = useCountUp(resumo.saldoCaixas);
  const lucroAnim = useCountUp(resumo.lucroPresumidoMes);

  const getStatusAurya = () => {
    if (resumo.contasPagarHoje > (resumo.saldoCaixas + resumo.vendasHoje) && resumo.contasPagarHoje > 0) return 'critico';
    if (resumo.vendasHoje === 0) return 'atencao';
    return 'saudavel';
  };

  const statusAurya = getStatusAurya();

  const auryaConfig = {
    critico: {
      bg: 'bg-rose-500/10',
      border: 'border-rose-500/30',
      text: 'text-rose-300',
      shadow: 'shadow-[0_0_35px_rgba(244,63,94,0.15)]',
      icon: <TrendingDown className="w-5 h-5 text-rose-300" />,
      label: 'Alerta Crítico',
      msg: 'Seu faturamento não cobre as contas a pagar de hoje. Ação imediata necessária para evitar descoberto.'
    },
    atencao: {
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/30',
      text: 'text-amber-300',
      shadow: 'shadow-[0_0_35px_rgba(245,158,11,0.12)]',
      icon: <AlertTriangle className="w-5 h-5 text-amber-300" />,
      label: 'Atenção',
      msg: 'Faturamento baixo ou zerado hoje. Sugestão: verifique a abertura do caixa ou ative uma promoção relâmpago.'
    },
    saudavel: {
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/30',
      text: 'text-emerald-300',
      shadow: 'shadow-[0_0_35px_rgba(16,185,129,0.12)]',
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-300" />,
      label: 'Saudável',
      msg: 'Operação rodando perfeitamente. O faturamento está fluindo e cobrindo as despesas. Continue assim!'
    }
  };

  const configAtual = auryaConfig[statusAurya];

  const solidCardStyle =
    'rounded-3xl border border-white/10 bg-[#08101f]/90 backdrop-blur-xl p-7 md:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.35)] transition-all duration-500 hover:-translate-y-1.5 hover:border-violet-400/20';

  const iconContainerStyle =
    'p-4 rounded-2xl border border-white/10 bg-black/10 backdrop-blur-md shadow-inner group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300';

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
        @keyframes waveBreathe {
          0%, 100% { transform: scaleY(1) translateY(0); }
          50% { transform: scaleY(1.12) translateY(-6px); }
        }
        .animate-wave-breathe {
          animation: waveBreathe 6s ease-in-out infinite;
          transform-origin: bottom;
        }
        @keyframes borderSpin {
          100% { transform: rotate(360deg); }
        }
        .animate-border-spin {
          animation: borderSpin 3s linear infinite;
        }
      `}</style>

      <div className="mx-auto max-w-7xl space-y-8 pb-12 animate-fade-in-down">
        <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(139,92,246,0.16),_transparent_28%),linear-gradient(135deg,_#0b1020_0%,_#08101f_45%,_#0a1224_100%)] p-7 md:p-8 shadow-[0_25px_70px_rgba(0,0,0,0.40)]">
          <div className="pointer-events-none absolute -left-10 top-0 h-52 w-52 rounded-full bg-violet-600/15 blur-[100px]" />
          <div className="pointer-events-none absolute right-0 top-0 h-56 w-56 rounded-full bg-fuchsia-600/10 blur-[110px]" />

          <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4 md:gap-5">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-violet-400/20 bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 text-xl font-black text-white shadow-[0_0_25px_rgba(139,92,246,0.20)]">
                {iniciaisUsuario}
              </div>

              <div>
                <h1 className="flex flex-wrap items-center gap-3 text-3xl font-black tracking-tight text-white md:text-4xl">
                  Olá, {usuario.nome?.split(' ')[0]}!
                  <span className="origin-bottom text-violet-300 animate-bounce">👋</span>
                </h1>
                <p className="mt-1 text-sm font-medium text-slate-400 md:text-base">
                  Aqui está o pulso da sua empresa em tempo real.
                </p>
              </div>
            </div>

            <div className="w-full md:w-auto">
              <Link
                to="/frente-caixa"
                className="group/btn relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-2xl border border-violet-400/20 bg-gradient-to-r from-violet-600 to-fuchsia-600 px-7 py-4 font-black text-white shadow-[0_0_30px_rgba(139,92,246,0.28)] transition-all hover:scale-[1.02] hover:brightness-110 md:w-auto"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/15 to-white/0 translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-700" />
                <ShoppingCart className="h-5 w-5 group-hover/btn:-rotate-12 transition-transform" />
                <span>Abrir PDV Agora</span>
              </Link>
            </div>
          </div>
        </div>

        <div className={`relative overflow-hidden rounded-[30px] p-[1px] ${configAtual.shadow}`}>
          <div className="absolute inset-[-100%] bg-[conic-gradient(from_90deg_at_50%_50%,#0f172a_0%,#8b5cf6_22%,#d946ef_50%,#0f172a_100%)] animate-border-spin opacity-60" />

          <div className="relative z-10 flex flex-col gap-6 rounded-[29px] border border-white/10 bg-[#08101f]/95 p-6 md:flex-row md:items-center md:p-8">
            <div className="pointer-events-none absolute -right-10 -top-10 opacity-[0.05]">
              <BrainCircuit className="h-64 w-64 text-slate-300" />
            </div>

            <div className="relative shrink-0">
              <img
                src="/Aurya.jpeg"
                alt="Aurya IA"
                className={`h-20 w-20 rounded-full border-2 object-cover shadow-lg ${configAtual.border}`}
              />
              <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full border-4 border-[#08101f] bg-emerald-500 shadow-[0_0_12px_rgba(34,197,94,0.8)] animate-pulse" />
            </div>

            <div className="flex-1">
              <div className="mb-2 flex flex-wrap items-center gap-3">
                <h2 className="flex items-center gap-2 text-xl font-black tracking-tight text-white">
                  <Sparkles className="h-6 w-6 text-violet-300 animate-pulse" />
                  Insights da Aurya
                </h2>

                <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${configAtual.bg} ${configAtual.border} ${configAtual.text}`}>
                  {configAtual.icon}
                  {configAtual.label}
                </span>
              </div>

              {loading ? (
                <p className="text-lg text-slate-400 animate-pulse">
                  Analisando os dados da sua loja...
                </p>
              ) : (
                <p className="text-base leading-7 text-slate-300 md:text-lg">
                  {configAtual.msg}
                </p>
              )}
            </div>

            <Link
              to="/financeiro/dashboard"
              className="group/btn relative shrink-0 overflow-hidden rounded-2xl p-[1px] transition-transform duration-300 hover:scale-[1.02]"
            >
              <div className="absolute inset-[-100%] bg-[conic-gradient(from_90deg_at_50%_50%,#0f172a_0%,#8b5cf6_48%,#d946ef_80%,#0f172a_100%)] animate-border-spin opacity-90" />
              <div className="relative flex items-center gap-3 rounded-[15px] border border-white/10 bg-[#0b1324] px-6 py-4 transition-all group-hover/btn:bg-[#10192d]">
                <BarChart2 className="h-5 w-5 text-violet-300 group-hover/btn:animate-pulse" />
                <span className="bg-gradient-to-r from-violet-200 to-fuchsia-300 bg-clip-text text-lg font-black text-transparent">
                  Análise Completa
                </span>
              </div>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className={`${solidCardStyle} group`}>
            <div className="mb-6 flex items-start justify-between">
              <h3 className="text-xs font-bold uppercase tracking-[0.20em] text-slate-400">
                Vendas Hoje
              </h3>
              <div className={`${iconContainerStyle} ${resumo.vendasHoje > 0 ? 'text-emerald-300' : 'text-slate-500'}`}>
                <TrendingUp className="h-8 w-8" />
              </div>
            </div>

            {loading ? (
              <p className="mb-6 text-4xl font-black text-slate-600">...</p>
            ) : (
              <div className="mb-6">
                <p
                  className={`mb-2 text-4xl font-black tracking-tighter md:text-5xl transition-colors duration-700 ${
                    resumo.vendasHoje === 0
                      ? 'text-slate-600'
                      : 'text-emerald-300 drop-shadow-[0_0_16px_rgba(52,211,153,0.22)]'
                  }`}
                >
                  {formatarMoeda(vendasHojeAnim)}
                </p>
                {resumo.vendasHoje === 0 && (
                  <p className="flex items-center gap-1 text-sm font-bold text-slate-500">
                    <Info className="h-4 w-4" />
                    Nenhuma venda registrada
                  </p>
                )}
              </div>
            )}

            <div className="inline-block w-full rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-center text-sm font-bold text-slate-300">
              Acumulado: <span className="text-white">{formatarMoeda(resumo.vendasMes)}</span>
            </div>
          </div>

          <div className={`${solidCardStyle} group`}>
            <div className="mb-6 flex items-start justify-between">
              <h3 className="text-xs font-bold uppercase tracking-[0.20em] text-slate-400">
                Saldo em Caixas
              </h3>
              <div className={`${iconContainerStyle} ${resumo.saldoCaixas > 0 ? 'text-violet-300' : 'text-slate-500'}`}>
                <Wallet className="h-8 w-8" />
              </div>
            </div>

            {loading ? (
              <p className="mb-6 text-4xl font-black text-slate-600">...</p>
            ) : (
              <div className="mb-6">
                <p
                  className={`mb-2 text-4xl font-black tracking-tighter md:text-5xl transition-colors duration-700 ${
                    resumo.saldoCaixas === 0 ? 'text-slate-600' : 'text-white'
                  }`}
                >
                  {formatarMoeda(saldoCaixasAnim)}
                </p>
                {resumo.saldoCaixas === 0 && (
                  <p className="flex items-center gap-1 text-sm font-bold text-slate-500">
                    <Info className="h-4 w-4" />
                    Caixas zerados
                  </p>
                )}
              </div>
            )}

            <Link
              to="/financeiro/extrato"
              className="group/btn flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-sm font-bold text-violet-300 transition-all hover:border-violet-400/20 hover:bg-violet-500/10"
            >
              Ver Livro Razão
              <ArrowRight className="h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
            </Link>
          </div>

          <div className="group relative overflow-hidden rounded-3xl border border-violet-400/20 bg-[radial-gradient(circle_at_top_left,_rgba(139,92,246,0.14),_transparent_30%),linear-gradient(180deg,_#0b1324_0%,_#08101f_100%)] p-7 md:p-8 shadow-[0_20px_55px_rgba(0,0,0,0.35)] transition-all duration-500 hover:-translate-y-1.5 hover:border-violet-300/30 hover:shadow-[0_25px_60px_rgba(139,92,246,0.16)]">
            <div className="pointer-events-none absolute inset-x-0 bottom-0 opacity-20 animate-wave-breathe">
              <svg viewBox="0 0 1440 320" className="h-auto w-full fill-current text-violet-500">
                <path d="M0,160L48,176C96,192,192,224,288,213.3C384,203,480,149,576,144C672,139,768,187,864,202.7C960,219,1056,203,1152,176C1248,149,1344,112,1392,93.3L1440,75L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
              </svg>
            </div>

            <div className="pointer-events-none absolute -right-6 -top-6 opacity-[0.08] transition-transform duration-700 group-hover:rotate-12 group-hover:scale-110">
              <Activity className="h-40 w-40 text-violet-300" />
            </div>

            <div className="relative z-10">
              <h3 className="mb-6 text-xs font-bold uppercase tracking-[0.20em] text-violet-300">
                Lucro Operacional (Mês)
              </h3>

              {loading ? (
                <p className="mb-6 text-4xl font-black text-slate-600">...</p>
              ) : (
                <div className="mb-6">
                  <p
                    className={`mb-2 text-4xl font-black tracking-tighter md:text-5xl transition-colors duration-700 ${
                      resumo.lucroPresumidoMes === 0
                        ? 'text-slate-600'
                        : resumo.lucroPresumidoMes < 0
                          ? 'text-rose-300 drop-shadow-[0_0_12px_rgba(244,63,94,0.25)]'
                          : 'bg-gradient-to-r from-emerald-300 to-violet-300 bg-clip-text text-transparent'
                    }`}
                  >
                    {formatarMoeda(lucroAnim)}
                  </p>
                  {resumo.lucroPresumidoMes === 0 && (
                    <p className="flex items-center gap-1 text-sm font-bold text-slate-500">
                      <Info className="h-4 w-4" />
                      Aguardando fechamentos
                    </p>
                  )}
                </div>
              )}
            </div>

            <Link
              to="/contabilidade/dre"
              className="group/btn relative z-10 flex w-full items-center justify-center gap-2 rounded-2xl border border-violet-400/20 bg-violet-500/10 px-4 py-3 text-sm font-bold text-violet-200 transition-all hover:bg-violet-500/15"
            >
              Abrir DRE Completo
              <ArrowRight className="h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 pt-2 lg:grid-cols-2">
          <div className="space-y-8">
            <div>
              <h2 className="mb-5 flex items-center gap-3 text-xl font-black tracking-tight text-white">
                <DollarSign className="h-7 w-7 text-violet-300" />
                Financeiro Diário
              </h2>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div className="group rounded-3xl border border-white/10 border-l-4 border-l-emerald-400 bg-[#08101f]/90 p-7 shadow-[0_18px_45px_rgba(0,0,0,0.30)] transition-all duration-300 hover:-translate-y-1 hover:border-emerald-400/30">
                  <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                    A Receber Hoje
                  </h3>
                  <p className={`origin-left text-3xl font-black tracking-tighter transition-transform group-hover:scale-[1.02] ${resumo.contasReceberHoje > 0 ? 'text-emerald-300' : 'text-slate-500'}`}>
                    {resumo.contasReceberHoje === 0 ? 'Tudo em dia ✅' : formatarMoeda(resumo.contasReceberHoje)}
                  </p>
                </div>

                <div className={`group rounded-3xl border border-white/10 border-l-4 bg-[#08101f]/90 p-7 shadow-[0_18px_45px_rgba(0,0,0,0.30)] transition-all duration-300 hover:-translate-y-1 ${
                  resumo.contasPagarHoje > 0
                    ? 'border-l-rose-400 hover:border-rose-400/30'
                    : 'border-l-slate-600'
                }`}>
                  <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                    A Pagar Hoje
                  </h3>
                  <p className={`origin-left text-3xl font-black tracking-tighter transition-transform group-hover:scale-[1.02] ${resumo.contasPagarHoje > 0 ? 'text-rose-300' : 'text-slate-500'}`}>
                    {resumo.contasPagarHoje === 0 ? 'Tudo pago ✅' : formatarMoeda(resumo.contasPagarHoje)}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h2 className="mb-5 flex items-center gap-3 text-xl font-black tracking-tight text-white">
                <FileText className="h-7 w-7 text-violet-300" />
                Pendências Fiscais
              </h2>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Link
                  to="/notas"
                  className="group flex items-center justify-between rounded-3xl border border-white/10 bg-[#08101f]/90 p-7 shadow-[0_18px_45px_rgba(0,0,0,0.30)] transition-all duration-300 hover:-translate-y-1 hover:border-amber-400/20"
                >
                  <div>
                    <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                      NFC-e / NF-e
                    </h3>
                    <p className={`text-3xl font-black tracking-tighter ${resumo.notasPendentesEmissao > 0 ? 'text-amber-300' : 'text-slate-500 text-lg'}`}>
                      {resumo.notasPendentesEmissao === 0 ? 'Livre ✅' : resumo.notasPendentesEmissao}
                    </p>
                  </div>

                  <AlertTriangle
                    className={`h-11 w-11 transition-all group-hover:scale-110 ${
                      resumo.notasPendentesEmissao > 0
                        ? 'text-amber-400 opacity-80 animate-pulse'
                        : 'text-slate-600 opacity-20'
                    }`}
                  />
                </Link>

                <Link
                  to="/entrada-notas"
                  className="group flex items-center justify-between rounded-3xl border border-white/10 bg-[#08101f]/90 p-7 shadow-[0_18px_45px_rgba(0,0,0,0.30)] transition-all duration-300 hover:-translate-y-1 hover:border-violet-400/20"
                >
                  <div>
                    <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                      XMLs na Fila
                    </h3>
                    <p className={`text-3xl font-black tracking-tighter ${resumo.xmlPendentesEntrada > 0 ? 'text-violet-300' : 'text-slate-500 text-lg'}`}>
                      {resumo.xmlPendentesEntrada === 0 ? 'Livre ✅' : resumo.xmlPendentesEntrada}
                    </p>
                  </div>

                  <Download
                    className={`h-11 w-11 transition-all group-hover:scale-110 ${
                      resumo.xmlPendentesEntrada > 0
                        ? 'text-violet-300 opacity-80 animate-bounce'
                        : 'text-slate-600 opacity-20'
                    }`}
                  />
                </Link>
              </div>
            </div>
          </div>

          <div className="flex h-full flex-col rounded-[30px] border border-white/10 bg-[#08101f]/90 p-7 md:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.35)] transition-all duration-300 hover:-translate-y-1 hover:border-violet-400/20">
            <h2 className="mb-7 flex items-center gap-3 text-xl font-black tracking-tight text-white">
              <Package className="h-7 w-7 text-violet-300" />
              Visão de Estoque
            </h2>

            <div className="flex-1 space-y-6">
              <div className="group flex items-center justify-between rounded-2xl border border-white/10 bg-black/10 p-6 transition-colors hover:border-violet-400/20">
                <div>
                  <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                    Valor Imobilizado
                  </p>
                  <p className="origin-left text-3xl font-black tracking-tighter text-white transition-transform group-hover:scale-[1.02] md:text-4xl">
                    {loading ? '...' : formatarMoeda(resumo.valorTotalEstoque)}
                  </p>
                </div>

                <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-[#0f1728] text-violet-300 shadow-lg transition-transform group-hover:rotate-12">
                  <DollarSign className="h-8 w-8" />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div className="group rounded-2xl border border-white/10 bg-black/10 p-6 text-center transition-colors hover:border-white/15">
                  <p className="text-4xl font-black tracking-tighter text-white transition-transform group-hover:scale-110">
                    {loading ? '...' : resumo.totalProdutos}
                  </p>
                  <p className="mt-3 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                    Itens Ativos
                  </p>
                </div>

                <div className={`group rounded-2xl border p-6 text-center transition-all flex flex-col justify-center ${
                  resumo.alertasEstoque > 0
                    ? 'border-rose-400/30 bg-rose-500/10 hover:bg-rose-500/12'
                    : 'border-white/10 bg-black/10'
                }`}>
                  {resumo.alertasEstoque > 0 ? (
                    <>
                      <p className="text-4xl font-black tracking-tighter text-rose-300 transition-transform group-hover:scale-110 animate-pulse">
                        {resumo.alertasEstoque}
                      </p>
                      <p className="mt-3 text-xs font-bold uppercase tracking-[0.18em] text-rose-300">
                        Rupturas
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-2xl font-black tracking-tighter text-slate-400">
                        Saudável ✅
                      </p>
                      <p className="mt-3 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                        Rupturas
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-8 border-t border-white/10 pt-7">
              <Link
                to="/estoque/inventario"
                className="group relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-2xl border border-violet-400/20 bg-violet-500/10 py-4 font-black tracking-wide text-white transition-all hover:border-violet-300/30 hover:bg-violet-500/15 hover:shadow-[0_0_30px_rgba(139,92,246,0.14)]"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                <AlertTriangle className="h-5 w-5 text-amber-300 transition-transform group-hover:scale-110" />
                Realizar Inventário Cego
              </Link>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}