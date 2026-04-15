import { useEffect, useState } from 'react';
import { api } from '../../../services/api';
import { Layout } from '../../../components/Layout';
import {
  Scale,
  AlertOctagon,
  FileSearch,
  TrendingUp,
  BrainCircuit,
  CheckCircle2,
  Sparkles,
  Activity,
  AlertTriangle,
  Landmark,
} from 'lucide-react';
import { AxiosError } from 'axios';
import { auryaBrandMark } from '../../../assets/branding';

export interface IDadosBrutosContabeis {
  isPartidasDobradasOk: boolean;
  diferencaPartidasDobradas: number;
  pernetasCount: number;
  pernetasValor: number;
  totalReceitasDRE: number;
  resultadoExercicio: number;
}

export interface IAlertaPernetesDetalhado {
  itemIdentificado?: string;
  quantidade?: number;
  valorTotal?: number;
  observacaoAuditor?: string;
}

export interface IIntegridadePartidasDetalhada {
  debitos?: number;
  creditos?: number;
  diferenca?: number;
  status?: string;
  observacaoAuditor?: string;
}

export interface IAnaliseDREDetalhada {
  receitas?: number;
  despesas?: number;
  resultadoCalculado?: number;
  verificacaoMatematica?: string;
  observacaoAuditor?: string;
}

export interface IAnaliseIAContabil {
  statusAuditoria: 'Aprovado' | 'Reprovado' | 'Com Ressalvas' | string;
  resumoExecutivo: string;
  alertaPernetes: string | IAlertaPernetesDetalhado;
  integridadePartidasDobradas: string | IIntegridadePartidasDetalhada;
  analiseDRE: string | IAnaliseDREDetalhada;
  recomendacoesContabeis: string[];
}

export interface IDashboardAuditoria {
  dadosBrutos: IDadosBrutosContabeis;
  analiseIA: IAnaliseIAContabil;
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

export function DashboardContabil() {
  const [dados, setDados] = useState<IDashboardAuditoria | null>(null);
  const [loading, setLoading] = useState(true);

  const difPartidasAnim = useCountUp(dados?.dadosBrutos?.diferencaPartidasDobradas || 0);
  const pernetasValorAnim = useCountUp(dados?.dadosBrutos?.pernetasValor || 0);
  const receitasAnim = useCountUp(dados?.dadosBrutos?.totalReceitasDRE || 0);
  const resultadoAnim = useCountUp(dados?.dadosBrutos?.resultadoExercicio || 0);

  useEffect(() => {
    async function carregarAuditoria() {
      try {
        const response = await api.get<IDashboardAuditoria>('/api/ia/contabil/analise');
        setDados(response.data);
      } catch (err) {
        const error = err as AxiosError<{ error?: string }>;
        console.error('Erro ao carregar Auditoria Contábil:', error.response?.data || error.message);
      } finally {
        setLoading(false);
      }
    }

    carregarAuditoria();
  }, []);

  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(valor || 0);
  };

  const renderAlertaPernetes = (alerta: IAnaliseIAContabil['alertaPernetes']) => {
    if (!alerta) return null;

    if (typeof alerta === 'string') {
      return <p className="text-base font-medium leading-8 text-slate-300">{alerta}</p>;
    }

    return (
      <div className="space-y-3 text-base font-medium leading-8 text-slate-300">
        {alerta.itemIdentificado && (
          <p>
            <strong className="text-violet-300">Item identificado:</strong> {alerta.itemIdentificado}
          </p>
        )}
        {alerta.quantidade !== undefined && (
          <p>
            <strong className="text-violet-300">Quantidade:</strong> {alerta.quantidade}
          </p>
        )}
        {alerta.valorTotal !== undefined && (
          <p>
            <strong className="text-violet-300">Valor total:</strong> {formatarMoeda(Number(alerta.valorTotal))}
          </p>
        )}
        {alerta.observacaoAuditor && (
          <p>
            <strong className="text-violet-300">Observação do auditor:</strong> {alerta.observacaoAuditor}
          </p>
        )}
      </div>
    );
  };

  const renderIntegridadePartidas = (
    dadosIntegridade: IAnaliseIAContabil['integridadePartidasDobradas']
  ) => {
    if (!dadosIntegridade) return null;

    if (typeof dadosIntegridade === 'string') {
      return <p className="text-base font-medium leading-8 text-slate-300">{dadosIntegridade}</p>;
    }

    return (
      <div className="space-y-3 text-base font-medium leading-8 text-slate-300">
        {dadosIntegridade.debitos !== undefined && (
          <p>
            <strong className="text-violet-300">Débitos:</strong> {formatarMoeda(Number(dadosIntegridade.debitos))}
          </p>
        )}
        {dadosIntegridade.creditos !== undefined && (
          <p>
            <strong className="text-violet-300">Créditos:</strong> {formatarMoeda(Number(dadosIntegridade.creditos))}
          </p>
        )}
        {dadosIntegridade.diferenca !== undefined && (
          <p>
            <strong className="text-violet-300">Diferença:</strong> {formatarMoeda(Number(dadosIntegridade.diferenca))}
          </p>
        )}
        {dadosIntegridade.status && (
          <p>
            <strong className="text-violet-300">Status:</strong> {dadosIntegridade.status}
          </p>
        )}
        {dadosIntegridade.observacaoAuditor && (
          <p>
            <strong className="text-violet-300">Observação do auditor:</strong> {dadosIntegridade.observacaoAuditor}
          </p>
        )}
      </div>
    );
  };

  const renderAnaliseDRE = (dre: IAnaliseIAContabil['analiseDRE']) => {
    if (!dre) return null;

    if (typeof dre === 'string') {
      return <p className="text-base font-medium leading-8 text-slate-300">{dre}</p>;
    }

    return (
      <div className="space-y-3 text-base font-medium leading-8 text-slate-300">
        {dre.receitas !== undefined && (
          <p>
            <strong className="text-violet-300">Receitas:</strong> {formatarMoeda(Number(dre.receitas))}
          </p>
        )}
        {dre.despesas !== undefined && (
          <p>
            <strong className="text-violet-300">Despesas:</strong> {formatarMoeda(Number(dre.despesas))}
          </p>
        )}
        {dre.resultadoCalculado !== undefined && (
          <p>
            <strong className="text-violet-300">Resultado calculado:</strong> {formatarMoeda(Number(dre.resultadoCalculado))}
          </p>
        )}
        {dre.verificacaoMatematica && (
          <p>
            <strong className="text-violet-300">Verificação matemática:</strong> {dre.verificacaoMatematica}
          </p>
        )}
        {dre.observacaoAuditor && (
          <p>
            <strong className="text-violet-300">Observação do auditor:</strong> {dre.observacaoAuditor}
          </p>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex h-[80vh] flex-col items-center justify-center space-y-6">
          <div className="relative">
            <img
              src={auryaBrandMark}
              alt="Aurya IA"
              className="h-24 w-24 rounded-full border-4 border-[#0b1020] object-cover shadow-[0_0_30px_rgba(139,92,246,0.35)] animate-pulse grayscale-[15%]"
            />
            <div className="absolute -bottom-2 -right-2 rounded-full border border-white/10 bg-[#0b1020] p-2 shadow-lg">
              <BrainCircuit className="h-10 w-10 text-violet-300" />
            </div>
          </div>

          <p className="max-w-md text-center text-xl font-medium text-slate-200">
            Olá, eu sou a <span className="font-bold text-violet-300">Aurya (Auditora)</span>.
            <span className="mt-2 block text-sm font-normal text-slate-400">
              Cruzando os dados do seu Livro Razão e validando as Partidas Dobradas...
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
            <AlertOctagon className="h-14 w-14 animate-pulse text-rose-300" />
          </div>
          <h2 className="text-2xl font-black tracking-tight text-rose-200">
            Erro de conexão
          </h2>
          <p className="mt-2 font-medium text-slate-300">
            Não foi possível carregar a auditoria. Verifique sua conexão com o servidor.
          </p>
        </div>
      </Layout>
    );
  }

  const { dadosBrutos, analiseIA } = dados;

  const corStatus =
    analiseIA.statusAuditoria === 'Reprovado'
      ? {
          bg: 'bg-rose-500/10',
          border: 'border-rose-400/20',
          text: 'text-rose-300',
          shadow: 'shadow-[0_0_30px_rgba(244,63,94,0.16)]',
          icon: <AlertOctagon className="h-5 w-5 text-rose-300" />,
        }
      : analiseIA.statusAuditoria === 'Com Ressalvas'
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
            icon: <CheckCircle2 className="h-5 w-5 text-emerald-300" />,
          };

  const solidCardStyle =
    'rounded-[28px] border border-white/10 bg-[#08101f]/90 p-7 shadow-[0_20px_50px_rgba(0,0,0,0.35)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-violet-400/15';
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
        <div className="relative overflow-hidden rounded-[30px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(139,92,246,0.16),_transparent_26%),linear-gradient(135deg,_#0b1020_0%,_#08101f_45%,_#0a1224_100%)] p-6 shadow-[0_25px_70px_rgba(0,0,0,0.40)] sm:p-8">
          <div className="pointer-events-none absolute -left-10 top-0 h-52 w-52 rounded-full bg-violet-600/15 blur-[100px]" />
          <div className="pointer-events-none absolute right-0 top-0 h-56 w-56 rounded-full bg-fuchsia-600/10 blur-[110px]" />

          <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-violet-300">
                <Sparkles className="h-3.5 w-3.5" />
                Accounting Intelligence
              </div>

              <h1 className="flex items-center gap-4 text-3xl font-black tracking-tight text-white md:text-4xl">
                <div className="rounded-2xl border border-violet-400/20 bg-violet-500/10 p-3 shadow-[0_0_20px_rgba(139,92,246,0.12)]">
                  <Scale className="h-8 w-8 text-violet-300" />
                </div>
                Auditoria Contábil
              </h1>

              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300 sm:text-[15px]">
                Validação assistida por IA para integridade contábil, partidas dobradas,
                lançamentos órfãos e leitura estratégica do DRE.
              </p>
            </div>

            <span
              className={`inline-flex items-center gap-2 rounded-2xl border px-5 py-3 text-sm font-black uppercase tracking-[0.16em] backdrop-blur-md ${corStatus.bg} ${corStatus.border} ${corStatus.text} ${corStatus.shadow}`}
            >
              {corStatus.icon}
              Status: {analiseIA.statusAuditoria}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          <div
            className={`${solidCardStyle} group ${
              dadosBrutos.isPartidasDobradasOk ? 'hover:border-emerald-400/20' : 'hover:border-rose-400/20'
            }`}
          >
            <div className="mb-6 flex items-start justify-between">
              <h3 className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                Partidas Dobradas
              </h3>
              <div
                className={`${iconContainerStyle} ${
                  dadosBrutos.isPartidasDobradasOk ? 'text-emerald-300' : 'text-rose-300'
                }`}
              >
                <Scale className="h-6 w-6" />
              </div>
            </div>

            <p
              className={`mb-2 text-4xl font-black tracking-tighter ${
                dadosBrutos.isPartidasDobradasOk
                  ? 'text-white'
                  : 'text-rose-300 drop-shadow-[0_0_12px_rgba(244,63,94,0.25)]'
              }`}
            >
              {dadosBrutos.isPartidasDobradasOk ? 'ÍNTEGRO' : 'ERRO GRAVE'}
            </p>
            <p className="text-sm font-bold text-slate-500">
              Dif: {formatarMoeda(difPartidasAnim)}
            </p>
          </div>

          <div
            className={`${solidCardStyle} group ${
              dadosBrutos.pernetasCount > 0 ? 'hover:border-amber-400/20' : 'hover:border-violet-400/15'
            }`}
          >
            <div className="mb-6 flex items-start justify-between">
              <h3 className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                Lançamentos Órfãos
              </h3>
              <div
                className={`${iconContainerStyle} ${
                  dadosBrutos.pernetasCount > 0 ? 'text-amber-300' : 'text-slate-500'
                }`}
              >
                <FileSearch className="h-6 w-6" />
              </div>
            </div>

            <p
              className={`mb-2 text-4xl font-black tracking-tighter ${
                dadosBrutos.pernetasCount > 0
                  ? 'text-amber-300 drop-shadow-[0_0_12px_rgba(245,158,11,0.22)]'
                  : 'text-white'
              }`}
            >
              {dadosBrutos.pernetasCount}{' '}
              <span className="text-lg text-slate-500">pendências</span>
            </p>
            <p className="text-sm font-bold text-slate-500">
              {formatarMoeda(pernetasValorAnim)} sem conta
            </p>
          </div>

          <div className={`${solidCardStyle} group hover:border-sky-400/20`}>
            <div className="mb-6 flex items-start justify-between">
              <h3 className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                Receitas (DRE)
              </h3>
              <div className={`${iconContainerStyle} text-sky-300`}>
                <TrendingUp className="h-6 w-6" />
              </div>
            </div>

            <p className="mb-2 text-4xl font-black tracking-tighter text-sky-300 drop-shadow-[0_0_12px_rgba(96,165,250,0.22)]">
              {formatarMoeda(receitasAnim)}
            </p>
          </div>

          <div
            className={`${solidCardStyle} group ${
              dadosBrutos.resultadoExercicio >= 0 ? 'hover:border-emerald-400/20' : 'hover:border-rose-400/20'
            }`}
          >
            <div className="mb-6 flex items-start justify-between">
              <h3 className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                Resultado Exercício
              </h3>
              <div
                className={`${iconContainerStyle} ${
                  dadosBrutos.resultadoExercicio >= 0 ? 'text-emerald-300' : 'text-rose-300'
                }`}
              >
                <Activity className="h-6 w-6" />
              </div>
            </div>

            <p
              className={`mb-2 text-4xl font-black tracking-tighter ${
                dadosBrutos.resultadoExercicio >= 0
                  ? 'text-emerald-300 drop-shadow-[0_0_12px_rgba(52,211,153,0.22)]'
                  : 'text-rose-300 drop-shadow-[0_0_12px_rgba(244,63,94,0.22)]'
              }`}
            >
              {formatarMoeda(resultadoAnim)}
            </p>
          </div>
        </div>

        <div className={`relative overflow-hidden rounded-[30px] p-[1px] ${corStatus.shadow}`}>
          <div className="absolute inset-[-100%] bg-[conic-gradient(from_90deg_at_50%_50%,#0f172a_0%,#8b5cf6_26%,#d946ef_50%,#0f172a_100%)] opacity-60 animate-border-spin" />

          <div className="relative z-10 rounded-[29px] border border-white/10 bg-[#08101f]/95 p-8 shadow-[0_25px_70px_rgba(0,0,0,0.40)] md:p-10">
            <div className="pointer-events-none absolute right-0 top-0 h-96 w-96 rounded-full bg-violet-600/10 blur-[100px]" />

            <div className="relative z-10 mb-8 flex items-center gap-5 border-b border-white/10 pb-8">
              <div className="relative shrink-0">
                <img
                  src={auryaBrandMark}
                  alt="Aurya IA"
                  className="h-20 w-20 rounded-full border-2 border-violet-500/30 object-cover shadow-[0_0_24px_rgba(139,92,246,0.25)] grayscale-[10%]"
                />
                <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full border-4 border-[#08101f] bg-emerald-500 shadow-[0_0_10px_rgba(34,197,94,0.8)] animate-pulse" />
              </div>

              <div>
                <h2 className="flex items-center gap-3 text-2xl font-black tracking-tight text-white md:text-3xl">
                  Parecer da Aurya
                  <span className="text-xl font-medium text-violet-300">(Auditora)</span>
                  <Sparkles className="h-7 w-7 animate-pulse text-violet-300" />
                </h2>
                <p className="mt-2 text-sm font-bold uppercase tracking-[0.18em] text-slate-400">
                  Auditoria Contábil Assistida por IA
                </p>
              </div>
            </div>

            <div className="relative z-10 mb-8 rounded-[24px] border border-violet-400/15 bg-violet-500/10 p-6 shadow-inner">
              <div className="absolute inset-y-0 left-0 w-1.5 rounded-l-[24px] bg-gradient-to-b from-violet-500 to-fuchsia-500" />
              <p className="pl-5 text-lg font-medium italic leading-8 text-white md:text-xl">
                "{analiseIA.resumoExecutivo}"
              </p>
            </div>

            <div className="relative z-10 mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="rounded-[26px] border border-white/10 bg-black/10 p-7 shadow-[0_18px_45px_rgba(0,0,0,0.28)]">
                <h3 className="mb-5 flex items-center gap-3 text-sm font-black uppercase tracking-[0.18em] text-amber-300">
                  <FileSearch className="h-5 w-5" />
                  Alerta de Conciliação
                </h3>
                {renderAlertaPernetes(analiseIA.alertaPernetes)}
              </div>

              <div className="rounded-[26px] border border-white/10 bg-black/10 p-7 shadow-[0_18px_45px_rgba(0,0,0,0.28)]">
                <h3 className="mb-5 flex items-center gap-3 text-sm font-black uppercase tracking-[0.18em] text-violet-300">
                  <Scale className="h-5 w-5" />
                  Balanço e Partidas Dobradas
                </h3>
                {renderIntegridadePartidas(analiseIA.integridadePartidasDobradas)}

                <div className="mt-5 border-t border-white/10 pt-5">
                  {renderAnaliseDRE(analiseIA.analiseDRE)}
                </div>
              </div>
            </div>

            <div className="relative z-10 rounded-[28px] border border-white/10 bg-black/10 p-8 shadow-[0_18px_45px_rgba(0,0,0,0.28)]">
              <h3 className="mb-6 flex items-center gap-3 text-sm font-black uppercase tracking-[0.18em] text-white">
                <span className="h-3 w-3 rounded-full bg-violet-400 shadow-[0_0_12px_rgba(139,92,246,0.9)] animate-pulse" />
                Ações Corretivas Recomendadas
              </h3>

              <ul className="space-y-4">
                {analiseIA.recomendacoesContabeis?.map((rec: string, index: number) => (
                  <li
                    key={index}
                    className="group flex items-start gap-5 rounded-[22px] border border-white/10 bg-[#0b1324] p-5 shadow-inner transition-all hover:border-violet-400/20"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-violet-400/20 bg-violet-500/10 font-black text-violet-300 transition-transform group-hover:scale-110">
                      {index + 1}
                    </span>

                    <span
                      className="pt-1 text-base font-medium leading-8 text-slate-300 [&>strong]:font-black [&>strong]:text-violet-300"
                      dangerouslySetInnerHTML={{
                        __html: rec.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                      }}
                    />
                  </li>
                ))}
              </ul>

              <div className="mt-6 flex items-center gap-2 text-xs font-medium text-slate-500">
                <Landmark className="h-4 w-4 text-violet-300" />
                Priorize as ações em ordem para melhorar integridade, conciliação e desempenho do exercício.
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}