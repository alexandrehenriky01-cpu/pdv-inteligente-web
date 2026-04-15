import { useEffect, useState } from 'react';
import { Layout } from '../../../components/Layout';
import { api } from '../../../services/api';
import {
  BrainCircuit,
  TrendingDown,
  ShieldAlert,
  Sparkles,
  RefreshCcw,
  Activity,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AxiosError } from 'axios';
import { auryaBrandMark } from '../../../assets/branding';

export interface IAnaliseComprasResponse {
  analise: string;
  [key: string]: unknown;
}

export function AnaliseAuryaComprasPage() {
  const [analise, setAnalise] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    gerarAnalise();
  }, []);

  const gerarAnalise = async () => {
    setLoading(true);
    try {
      const res = await api.get<IAnaliseComprasResponse>('/api/ia/compras/analise');
      setAnalise(res.data.analise);
    } catch (err) {
      const error = err as AxiosError<{ error?: string }>;
      console.error('Erro na Aurya:', error.response?.data || error.message);
      setAnalise(
        'Não foi possível conectar ao cérebro da Aurya no momento. Verifique sua conexão ou tente novamente mais tarde.'
      );
    } finally {
      setLoading(false);
    }
  };

  const renderizarMarkdown = (text: string) => {
    if (!text) return null;

    let html = text
      .replace(
        /^### (.*$)/gim,
        '<h3 class="mt-8 mb-3 flex items-center gap-2 text-base sm:text-lg font-black uppercase tracking-[0.18em] text-violet-300"><span class="h-2 w-2 rounded-full bg-violet-400"></span>$1</h3>'
      )
      .replace(
        /^## (.*$)/gim,
        '<h2 class="mt-8 mb-4 border-b border-white/10 pb-3 text-lg sm:text-xl font-black tracking-tight text-white">$1</h2>'
      )
      .replace(
        /^# (.*$)/gim,
        '<h1 class="mt-6 mb-4 text-xl sm:text-2xl font-black tracking-tight text-white">$1</h1>'
      )
      .replace(/\*\*(.*?)\*\*/gim, '<strong class="font-black text-white">$1</strong>')
      .replace(/\*(.*?)\*/gim, '<em class="text-violet-300">$1</em>')
      .replace(
        /^\s*[-*]\s+(.*)$/gim,
        '<li class="ml-1 mb-2 flex items-start gap-3"><span class="mt-[6px] h-2 w-2 shrink-0 rounded-full bg-violet-400"></span><span>$1</span></li>'
      )
      .replace(/\n(?!\s*<li)/gim, '<br />');

    html = html.replace(/(<li.*<\/li>)/gim, '<ul class="my-4 space-y-1">$1</ul>');
    html = html.replace(/<\/ul><br \/>\s*<ul class="my-4 space-y-1">/gim, '');

    return (
      <div
        dangerouslySetInnerHTML={{ __html: html }}
        className="text-[15px] leading-8 text-slate-300 font-medium"
      />
    );
  };

  return (
    <Layout>
      <div className="mx-auto flex h-full max-w-6xl flex-col space-y-6 pb-12">
        <div className="relative overflow-hidden rounded-[30px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(139,92,246,0.16),_transparent_26%),linear-gradient(135deg,_#0b1020_0%,_#08101f_45%,_#0a1224_100%)] p-6 shadow-[0_25px_70px_rgba(0,0,0,0.40)] sm:p-8">
          <div className="pointer-events-none absolute -left-10 top-0 h-52 w-52 rounded-full bg-violet-600/15 blur-[100px]" />
          <div className="pointer-events-none absolute right-0 top-0 h-56 w-56 rounded-full bg-fuchsia-600/10 blur-[110px]" />
          <div className="pointer-events-none absolute bottom-0 right-[20%] h-40 w-40 rounded-full bg-violet-500/10 blur-[80px]" />

          <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="relative hidden shrink-0 sm:block">
              <img
                src={auryaBrandMark}
                alt="Aurya IA"
                className="h-20 w-20 rounded-2xl border border-violet-500/30 object-cover shadow-[0_0_25px_rgba(139,92,246,0.25)]"
              />
              <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full border-4 border-[#0b1020] bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.6)] animate-pulse" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-violet-300">
                <Sparkles className="h-3.5 w-3.5" />
                Aurya Intelligence
              </div>

              <h1 className="flex items-center gap-3 text-2xl font-black tracking-tight text-white sm:text-3xl">
                Análise Estratégica de Compras
                <BrainCircuit className="hidden h-6 w-6 text-violet-300 sm:block" />
              </h1>

              <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-300 sm:text-[15px]">
                Diagnóstico inteligente do supply chain, cotações, pedidos e divergências
                de recebimento com leitura orientada por contexto operacional.
              </p>
            </div>
          </div>
        </div>

        <div className="relative flex-1 overflow-hidden rounded-[30px] border border-white/10 bg-[#08101f]/90 p-6 shadow-[0_20px_55px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:p-8">
          <div className="pointer-events-none absolute bottom-0 left-0 h-96 w-96 rounded-full bg-violet-600/10 blur-[110px]" />
          <div className="pointer-events-none absolute right-0 top-0 h-80 w-80 rounded-full bg-fuchsia-600/5 blur-[100px]" />
          <div className="pointer-events-none absolute -right-10 -top-10 opacity-[0.05]">
            <BrainCircuit className="h-64 w-64 text-slate-300" />
          </div>

          {loading ? (
            <div className="relative z-10 flex h-full flex-col items-center justify-center space-y-6 py-20">
              <div className="relative">
                <img
                  src={auryaBrandMark}
                  alt="Aurya IA"
                  className="h-28 w-28 rounded-full border-4 border-[#0b1020] object-cover shadow-[0_0_40px_rgba(139,92,246,0.25)] animate-pulse"
                />
                <div className="absolute -bottom-3 -right-3 rounded-full border border-white/10 bg-[#0b1020] p-2 shadow-xl">
                  <BrainCircuit className="h-8 w-8 text-violet-300" />
                </div>
              </div>

              <div className="text-center">
                <p className="mb-2 text-2xl font-black tracking-tight text-violet-300 animate-pulse">
                  Analisando sua operação de compras...
                </p>
                <p className="mx-auto max-w-xl text-sm leading-7 text-slate-400 sm:text-base">
                  Cruzando dados de cotações, pedidos e divergências dos últimos 30 dias
                  para identificar riscos, gargalos e oportunidades.
                </p>
              </div>

              <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-violet-400/15 bg-violet-500/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-violet-300">
                <Activity className="h-4 w-4 animate-pulse" />
                Processando insights
              </div>
            </div>
          ) : (
            <div className="relative z-10 flex h-full flex-col gap-6">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
                <div>
                  <h2 className="text-lg font-black tracking-tight text-white sm:text-xl">
                    Relatório da Aurya
                  </h2>
                  <p className="mt-1 text-sm text-slate-400">
                    Leitura estratégica gerada com base nos dados atuais da operação.
                  </p>
                </div>

                <div className="inline-flex items-center gap-2 rounded-full border border-violet-400/15 bg-violet-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-violet-300">
                  <Sparkles className="h-3.5 w-3.5" />
                  Insight ativo
                </div>
              </div>

              <div className="custom-scrollbar max-h-[62vh] overflow-y-auto pr-1 sm:pr-3">
                <div className="rounded-3xl border border-white/10 bg-black/10 p-5 backdrop-blur-md sm:p-6">
                  {renderizarMarkdown(analise)}
                </div>
              </div>
            </div>
          )}
        </div>

        {!loading && analise && (
          <div className="grid shrink-0 grid-cols-1 gap-5 md:grid-cols-2">
            <button
              onClick={gerarAnalise}
              className="group flex items-center gap-5 rounded-3xl border border-white/10 bg-[#08101f]/90 p-6 text-left shadow-[0_18px_45px_rgba(0,0,0,0.30)] backdrop-blur-xl transition-all hover:-translate-y-1 hover:border-violet-400/20"
            >
              <div className="rounded-2xl border border-violet-400/20 bg-violet-500/10 p-4 text-violet-300 transition-all group-hover:scale-110 group-hover:bg-violet-500/15">
                <RefreshCcw className="h-7 w-7" />
              </div>

              <div>
                <p className="text-lg font-black tracking-tight text-white">
                  Atualizar análise
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-400">
                  Rodar novamente o algoritmo com dados em tempo real.
                </p>
              </div>
            </button>

            <button
              onClick={() => navigate('/compras/divergencias')}
              className="group flex items-center gap-5 rounded-3xl border border-white/10 bg-[#08101f]/90 p-6 text-left shadow-[0_18px_45px_rgba(0,0,0,0.30)] backdrop-blur-xl transition-all hover:-translate-y-1 hover:border-rose-400/20"
            >
              <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 p-4 text-rose-300 transition-all group-hover:scale-110 group-hover:bg-rose-500/15">
                <ShieldAlert className="h-7 w-7" />
              </div>

              <div>
                <p className="text-lg font-black tracking-tight text-white">
                  Ver divergências
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-400">
                  Ir para a auditoria de doca e recebimento de notas.
                </p>
              </div>
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
}