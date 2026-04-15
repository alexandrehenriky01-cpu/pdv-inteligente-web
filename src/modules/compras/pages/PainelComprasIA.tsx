import { Fragment, useEffect, useState } from 'react';
import { Layout } from '../../../components/Layout';
import { api } from '../../../services/api';
import { auryaBrandMark } from '../../../assets/branding';
import { 
  AlertTriangle, 
  ShoppingCart, 
  BrainCircuit, 
  Lightbulb, 
  Package, 
  Box, 
  Apple, 
  Beef, 
  Milk,
  Loader2
} from 'lucide-react';

interface ISugestaoCompra {
  produtoId: string;
  nome: string;
  codigoBarras: string | null;
  estoqueAtual: number;
  vmd: number;
  coberturaDias: number;
  quantidadeSugerida: number;
  status: 'CRÍTICO' | 'ATENÇÃO';
  custoMedio?: number;
}

interface IAnaliseCompras {
  totalAlertas: number;
  sugestoesCompra: ISugestaoCompra[];
  insightsIA: string[];
}

export default function PainelComprasIA() {
  const [data, setData] = useState<IAnaliseCompras | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      const response = await api.get('/api/ia/compras/analise');
      setData(response.data);
    } catch (error) {
      console.error("Erro ao carregar inteligência de compras:", error);
      setData({ totalAlertas: 0, sugestoesCompra: [], insightsIA: [] });
    } finally {
      setLoading(false);
    }
  };

  const getIconeProduto = (nome: string) => {
    const n = nome.toLowerCase();
    if (n.includes('leite') || n.includes('queijo') || n.includes('mussarela')) return Milk;
    if (n.includes('carne') || n.includes('bovina') || n.includes('frango')) return Beef;
    if (n.includes('tomate') || n.includes('maçã') || n.includes('fruta')) return Apple;
    if (n.includes('pão')) return Box;
    return Package; 
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex h-[80vh] flex-col items-center justify-center space-y-6">
          <div className="relative">
            <img
              src={auryaBrandMark}
              alt="Aurya IA"
              className="h-24 w-24 rounded-full border-4 border-[#0b1020] object-cover shadow-[0_0_30px_rgba(59,130,246,0.35)] animate-pulse"
            />
            <div className="absolute -bottom-2 -right-2 rounded-full border border-white/10 bg-[#0b1020] p-2 shadow-lg">
              <BrainCircuit className="h-10 w-10 text-sky-300" />
            </div>
          </div>

          <p className="max-w-md text-center text-xl font-medium text-slate-200">
            Olá, eu sou a <span className="font-bold text-sky-300">Aurya (Compras)</span>.
            <span className="mt-2 block text-sm font-normal text-slate-400">
              Estou analisando suas compras, fornecedores e estoque para gerar sugestões de reposição...
            </span>
          </p>
        </div>
      </Layout>
    );
  }

  // Lógica corrigida e segura: Verifica se há dados reais
  const hasData = data?.sugestoesCompra && data.sugestoesCompra.length > 0;
  const diasCriticos = hasData 
    ? Math.min(...data.sugestoesCompra.map(s => s.coberturaDias)) 
    : null;

  return (
    <Layout>
      <style>{`
        @keyframes float { 0% { transform: translateY(0px); } 50% { transform: translateY(-10px); } 100% { transform: translateY(0px); } }
        .animate-float { animation: float 6s ease-in-out infinite; }
        .glow-text { text-shadow: 0 0 30px rgba(6, 182, 212, 0.6); }
        .glow-text-emerald { text-shadow: 0 0 30px rgba(16, 185, 129, 0.6); }
        .glow-badge { box-shadow: 0 0 25px rgba(6, 182, 212, 0.5); }
      `}</style>

      {/* Container Principal Full Screen (Widescreen 95%) */}
      <div className="min-h-[calc(100vh-6rem)] bg-[#060816] rounded-[40px] flex flex-col items-center justify-center p-6 relative overflow-hidden">
        
        {/* Efeitos de Luz de Fundo */}
        <div className="absolute top-0 right-1/4 w-[800px] h-[800px] bg-cyan-600/10 rounded-full blur-[150px] pointer-events-none"></div>
        <div className="absolute bottom-0 left-1/4 w-[800px] h-[800px] bg-blue-800/10 rounded-full blur-[150px] pointer-events-none"></div>

        {/* 🪟 Painel Central Expandido */}
        <div className="w-full max-w-[95%] bg-[#08101f]/80 backdrop-blur-3xl border border-white/10 shadow-[0_30px_100px_rgba(0,0,0,0.9)] rounded-[40px] p-12 relative z-10 animate-float">
          
          <div className="text-center mb-16 max-w-6xl mx-auto">
            <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight leading-tight">
              Motor de Reposição <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 glow-text">Inteligente</span>
            </h1>
            <p className="text-slate-400 text-lg mt-4 font-medium">Análise preditiva de estoque e sugestões de compra baseadas em VMD (Venda Média Diária).</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            
            {/* 🔴 COLUNA 1: Alertas Dinâmicos */}
            <div className="flex flex-col gap-6">
              <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-3">
                <AlertTriangle className="w-8 h-8 text-slate-400" /> Alertas de Estoque
              </h2>
              
              {!hasData ? (
                <div className="text-emerald-500 text-center p-10 bg-emerald-500/10 rounded-[24px] border border-emerald-500/20 font-bold uppercase tracking-widest">
                  Nenhum produto com risco de ruptura no momento.
                </div>
              ) : (
                data.sugestoesCompra.map((item) => {
                  const Icone = getIconeProduto(item.nome);
                  const isCritico = item.status === 'CRÍTICO';
                  const corBg = isCritico ? 'bg-red-500' : 'bg-amber-500';
                  const corTexto = isCritico ? 'text-red-400' : 'text-amber-400';
                  const corShadow = isCritico ? 'shadow-[0_0_15px_rgba(239,68,68,0.6)]' : 'shadow-[0_0_15px_rgba(245,158,11,0.6)]';

                  return (
                    <div key={item.produtoId} className="bg-[#0b1324]/70 border border-white/5 rounded-[24px] p-6 hover:bg-white/5 transition-all group relative overflow-hidden">
                      <div className={`absolute left-0 top-0 bottom-0 w-2 ${corBg}`}></div>
                      <div className="flex items-center justify-between mb-4 pl-4">
                        <span className="text-white font-black text-2xl flex items-center gap-3 truncate max-w-[60%]">
                          <Icone className="w-8 h-8 text-slate-400 shrink-0" /> {item.nome}
                        </span>
                        <span className={`${corBg} text-white px-4 py-1.5 rounded-lg text-sm font-black uppercase tracking-widest ${corShadow} shrink-0`}>
                          {item.status}
                        </span>
                      </div>
                      <div className="flex justify-between items-end pl-14">
                        <div>
                          <p className="text-slate-500 text-sm uppercase tracking-widest font-bold">Estoque Atual</p>
                          <p className={`${corTexto} text-3xl font-black font-mono`}>{Number(item.estoqueAtual)} Un</p>
                        </div>
                        <div className="text-right">
                          <p className="text-slate-500 text-sm uppercase tracking-widest font-bold">VMD</p>
                          <p className="text-white text-3xl font-black font-mono">{Number(item.vmd).toFixed(1)}/dia</p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* 🛒 COLUNA 2: Sugestões Dinâmicas */}
            <div className="flex flex-col gap-6">
              <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-3">
                <ShoppingCart className="w-8 h-8 text-slate-400" /> Sugestões de Compra
              </h2>
              
              {!hasData ? (
                <div className="text-emerald-500 text-center p-10 bg-emerald-500/10 rounded-[24px] border border-emerald-500/20 font-bold uppercase tracking-widest">
                  Nenhuma sugestão de compra gerada.
                </div>
              ) : (
                data.sugestoesCompra.map((item) => {
                  const Icone = getIconeProduto(item.nome);
                  const custoMedio = item.custoMedio || 15.50; 
                  const valorTotalPrevisto = Number(item.quantidadeSugerida) * custoMedio;

                  return (
                    <div key={item.produtoId} className="bg-[#0b1324]/70 border border-white/5 rounded-[24px] p-6 hover:bg-white/5 transition-all group flex justify-between items-center">
                      <div className="flex items-center gap-5 w-1/2">
                        <div className="p-4 bg-cyan-500/10 rounded-2xl border border-cyan-500/20 shrink-0">
                          <Icone className="w-8 h-8 text-cyan-400" />
                        </div>
                        <div className="truncate">
                          <span className="text-white font-black text-2xl block truncate">{item.nome}</span>
                          <p className="text-slate-500 text-xs uppercase tracking-widest mt-1 font-bold">Cobertura: {Number(item.coberturaDias).toFixed(0)} dias</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end shrink-0">
                        <span className="text-xs text-cyan-400 font-black uppercase tracking-widest mb-2">Sugerido Comprar</span>
                        
                        <div className="bg-cyan-500/20 border border-cyan-500/30 px-5 py-2.5 rounded-xl flex items-center gap-4 glow-badge">
                          <span className="text-cyan-400 text-2xl font-black font-mono">{Number(item.quantidadeSugerida)} Un</span>
                          <div className="w-px h-8 bg-cyan-500/30"></div>
                          <span className="text-emerald-400 text-xl font-black font-mono">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorTotalPrevisto)}
                          </span>
                        </div>
                        
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-2">
                          Custo Médio: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(custoMedio)}/Un
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* 🧠 COLUNA 3: Insights Dinâmicos (Sintaxe JSX Corrigida) */}
            <div className="flex flex-col gap-6">
              <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-3">
                Insights Estratégicos
              </h2>
              
              <div className="bg-[#0b1324]/70 border border-white/5 rounded-[24px] p-10 flex flex-col items-center justify-center text-center h-full relative overflow-hidden">
                
                <div className="relative mb-12 mt-4">
                  <div className={`absolute inset-0 ${hasData ? 'bg-cyan-400' : 'bg-emerald-400'} blur-3xl opacity-30 rounded-full animate-pulse scale-150 transition-colors duration-1000`}></div>
                  <div className={`relative z-10 bg-[#08101f] p-8 rounded-full border-2 ${hasData ? 'border-cyan-500/40 shadow-[0_0_50px_rgba(6,182,212,0.5)]' : 'border-emerald-500/40 shadow-[0_0_50px_rgba(16,185,129,0.5)]'} transition-colors duration-1000`}>
                    <BrainCircuit className={`w-24 h-24 ${hasData ? 'text-cyan-400' : 'text-emerald-400'} transition-colors duration-1000`} />
                    {hasData && <Lightbulb className="w-10 h-10 text-yellow-400 absolute -top-2 -right-2 drop-shadow-[0_0_15px_rgba(250,204,21,1)]" />}
                  </div>
                </div>

                <h3 className="text-4xl font-black text-white mb-6 leading-tight">
                  {hasData ? 'Previsão de Ruptura' : 'Estoque Saudável'}
                </h3>
                <p className="text-2xl text-slate-300 leading-relaxed">
                  {hasData ? (
                    <Fragment>
                      O produto mais crítico<br/>esgota seu estoque
                      <span className="text-cyan-400 font-black text-5xl glow-text block mt-4">
                        {diasCriticos !== null && diasCriticos > 0 ? `em ${Number(diasCriticos).toFixed(0)} dias` : 'IMEDIATO'}
                      </span>
                    </Fragment>
                  ) : (
                    <Fragment>
                      Sua operação está sob<br/>controle absoluto.
                      <span className="text-emerald-400 font-black text-5xl glow-text-emerald block mt-4 tracking-widest">
                        SAUDÁVEL
                      </span>
                    </Fragment>
                  )}
                </p>

              </div>
            </div>

          </div>

          <div className="mt-16 flex flex-col items-center justify-center opacity-50 hover:opacity-100 transition-opacity cursor-default">
            <h2 className="text-2xl font-black text-white tracking-[0.4em]">AURYA</h2>
            <p className="text-xs text-slate-400 uppercase tracking-[0.5em] mt-2 font-bold">Soluções</p>
          </div>

        </div>
      </div>
    </Layout>
  );
}