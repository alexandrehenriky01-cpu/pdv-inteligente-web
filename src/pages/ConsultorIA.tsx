import { useState } from 'react';
import { api } from '../services/api';
import { Layout } from '../components/Layout';
import { 
  BrainCircuit, 
  Package, 
  TrendingUp, 
  Sparkles, 
  Loader2, 
  Lightbulb,
  AlertTriangle
} from 'lucide-react';
import { AxiosError } from 'axios';
import { auryaBrandMark } from '../assets/branding';

// 🛡️ INTERFACE DE TIPAGEM ESTRITA PARA A RESPOSTA DA IA
export interface IAnaliseIAResponse {
  mensagem?: string;
  analiseIA?: {
    resumoExecutivo?: string;
    [key: string]: unknown;
  };
}

export function ConsultorIA() {
  const [loading, setLoading] = useState(false);
  const [insight, setInsight] = useState<string | null>(null);
  const [tipoAnalise, setTipoAnalise] = useState<'estoque' | 'financeiro' | null>(null);

  const buscarAnalise = async (tipo: 'estoque' | 'financeiro') => {
    setLoading(true);
    setInsight(null); 
    setTipoAnalise(tipo);
    
    try {
      const response = await api.get<IAnaliseIAResponse>(`/api/ia/${tipo}/analise`);
      
      const textoInsight = response.data.mensagem || response.data.analiseIA?.resumoExecutivo || "Análise concluída, mas sem texto de retorno.";
      setInsight(textoInsight);
      
    } catch (err) {
      const error = err as AxiosError<{error?: string}>;
      console.error("Erro ao buscar IA:", error.response?.data || error.message);
      setInsight(`❌ Ops! A Aurya encontrou um problema: ${error.response?.data?.error || 'Serviço indisponível no momento.'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <style>{`
        @keyframes fadeInDown { 
          from { opacity: 0; transform: translateY(-20px); } 
          to { opacity: 1; transform: translateY(0); } 
        }
        .animate-fade-in-down { 
          animation: fadeInDown 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; 
        }
      `}</style>

      <div className="mx-auto max-w-6xl space-y-8 pb-12 animate-fade-in-down">
        
        {/* HEADER AURYA */}
        <div className="relative overflow-hidden rounded-[30px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(139,92,246,0.18),_transparent_30%),linear-gradient(135deg,_#0b1020_0%,_#08101f_50%,_#0a1224_100%)] p-8 shadow-[0_25px_70px_rgba(0,0,0,0.45)] flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">

          <div className="pointer-events-none absolute right-0 top-0 w-72 h-72 bg-violet-600/10 rounded-full blur-[100px]"></div>

          <div className="flex flex-col md:flex-row items-center gap-6 relative z-10">
            
            <div className="relative shrink-0">
              <img src={auryaBrandMark} className="w-24 h-24 rounded-full border border-violet-500/30 shadow-[0_0_30px_rgba(139,92,246,0.6)]" />
              
              <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-emerald-500 rounded-full border-4 border-[#0b1020] flex items-center justify-center shadow-lg">
                <Sparkles className="w-3 h-3 text-white" />
              </div>
            </div>

            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-violet-300">
                AI Intelligence
              </div>

              <h1 className="text-4xl font-black text-white flex items-center gap-3 justify-center md:justify-start">
                Consultor Inteligente <BrainCircuit className="w-8 h-8 text-violet-300" />
              </h1>

              <p className="text-slate-300 mt-2 text-lg">
                Olá! Sou a Aurya. Vamos escalar seu negócio com dados.
              </p>
            </div>
          </div>
        </div>

        {/* BOTÕES */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* ESTOQUE */}
          <button 
            onClick={() => buscarAnalise('estoque')}
            disabled={loading}
            className={`p-8 rounded-[30px] border transition-all flex flex-col items-center gap-4 ${
              tipoAnalise === 'estoque' && insight 
                ? 'bg-cyan-500/10 border-cyan-400/30 shadow-[0_0_30px_rgba(6,182,212,0.2)]'
                : 'bg-[#08101f] border-white/10 hover:bg-white/5'
            }`}
          >
            <Package className="w-10 h-10 text-cyan-300" />
            <span className="text-white font-black text-xl">Analisar Estoque</span>
            <span className="text-slate-400 text-sm">Evite rupturas e maximize giro.</span>
          </button>

          {/* FINANCEIRO */}
          <button 
            onClick={() => buscarAnalise('financeiro')}
            disabled={loading}
            className={`p-8 rounded-[30px] border transition-all flex flex-col items-center gap-4 ${
              tipoAnalise === 'financeiro' && insight 
                ? 'bg-emerald-500/10 border-emerald-400/30 shadow-[0_0_30px_rgba(16,185,129,0.2)]'
                : 'bg-[#08101f] border-white/10 hover:bg-white/5'
            }`}
          >
            <TrendingUp className="w-10 h-10 text-emerald-300" />
            <span className="text-white font-black text-xl">Financeiro</span>
            <span className="text-slate-400 text-sm">Lucro, margem e crescimento.</span>
          </button>

        </div>

        {/* LOADING */}
        {loading && (
          <div className="bg-[#08101f] border border-white/10 p-12 rounded-[30px] text-center">
            <Loader2 className="w-12 h-12 animate-spin text-violet-400 mx-auto mb-4" />
            <p className="text-white font-bold">Processando dados...</p>
          </div>
        )}

        {/* RESULTADO */}
        {insight && !loading && (
          <div className={`p-8 rounded-[30px] border ${
            insight.includes('❌') 
              ? 'bg-red-500/10 border-red-500/30'
              : 'bg-[#08101f] border-white/10'
          }`}>
            
            <h3 className="text-lg font-black text-violet-300 mb-4 flex items-center gap-2">
              <Sparkles /> Insight Estratégico
            </h3>

            <div className="text-slate-200 whitespace-pre-wrap">
              {insight}
            </div>

          </div>
        )}

      </div>
    </Layout>
  );
}