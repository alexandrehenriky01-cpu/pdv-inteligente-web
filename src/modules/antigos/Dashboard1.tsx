import { useEffect, useState } from 'react';
import { Layout } from '../../components/Layout';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
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
import { auryaBrandMark } from '../../assets/branding';

// 🛡️ INTERFACES DE TIPAGEM ESTRITA
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

// 🚀 NOVO: Interface para garantir a leitura segura do LocalStorage
interface IUsuarioStorage {
  nome?: string;
  [key: string]: unknown;
}

// 🚀 EFEITO WOW 1: Hook para os números girarem ao carregar (Count Up)
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
      // Curva Ease-Out suave
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

  // 🚀 FIM DO ANY: Tipagem segura no JSON.parse
  const usuario = JSON.parse(localStorage.getItem('@PDVUsuario') || '{}') as IUsuarioStorage;
  const iniciaisUsuario = usuario.nome ? usuario.nome.substring(0, 2).toUpperCase() : 'US';

  useEffect(() => {
    const carregarDashboard = async () => {
      try {
        // 🚀 FIM DO ANY: Tipagem estrita com Partial (pois o backend pode omitir campos)
        const response = await api.get<Partial<ResumoDashboard>>('/api/dashboard/resumo');
        
        // Garante que os dados numéricos sejam tratados corretamente, mesmo se vierem vazios
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
        const error = err as AxiosError<{error?: string}>;
        console.error("Erro ao carregar dashboard:", error.response?.data || error.message);
      } finally {
        setLoading(false);
      }
    };
    carregarDashboard();
  }, []);

  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor || 0);
  };

  // Valores Animados
  const vendasHojeAnim = useCountUp(resumo.vendasHoje);
  const saldoCaixasAnim = useCountUp(resumo.saldoCaixas);
  const lucroAnim = useCountUp(resumo.lucroPresumidoMes);

  // 🚀 EFEITO WOW 2: Inteligência de Estado da Aurya (O Cérebro)
  const getStatusAurya = () => {
    if (resumo.contasPagarHoje > (resumo.saldoCaixas + resumo.vendasHoje) && resumo.contasPagarHoje > 0) return 'critico';
    if (resumo.vendasHoje === 0) return 'atencao';
    return 'saudavel';
  };
  
  const statusAurya = getStatusAurya();

  const auryaConfig = {
    critico: { 
      bg: 'bg-red-950/30', border: 'border-red-500/50', text: 'text-red-400', shadow: 'shadow-red-500/20',
      icon: <TrendingDown className="w-5 h-5 text-red-400" />, label: 'Alerta Crítico',
      msg: 'Seu faturamento não cobre as contas a pagar de hoje. Ação imediata necessária para evitar descoberto.'
    },
    atencao: { 
      bg: 'bg-amber-950/30', border: 'border-amber-500/50', text: 'text-amber-400', shadow: 'shadow-amber-500/20',
      icon: <AlertTriangle className="w-5 h-5 text-amber-400" />, label: 'Atenção',
      msg: 'Faturamento baixo ou zerado hoje. Sugestão: Verifique a abertura do caixa ou ative uma promoção relâmpago.'
    },
    saudavel: { 
      bg: 'bg-emerald-950/30', border: 'border-emerald-500/50', text: 'text-emerald-400', shadow: 'shadow-emerald-500/20',
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-400" />, label: 'Saudável',
      msg: 'Operação rodando perfeitamente. O faturamento está fluindo e cobrindo as despesas. Continue assim!'
    }
  };

  const configAtual = auryaConfig[statusAurya];

  // Estilos Base Premium com Microinterações de Hover
  const solidCardStyle = "bg-slate-800 p-8 rounded-3xl shadow-xl border border-slate-700/80 transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl";
  const iconContainerStyle = "p-4 bg-slate-900 rounded-2xl border border-slate-700/50 shadow-inner group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300";

  return (
    <Layout>
      {/* 🚀 CSS Embutido para garantir as animações de luxo sem precisar mexer no config do Tailwind */}
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
          50% { transform: scaleY(1.15) translateY(-8px); }
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

      <div className="max-w-7xl mx-auto space-y-10 pb-12 animate-fade-in-down">
        
        {/* CABEÇALHO PREMIUM */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-8 rounded-3xl shadow-2xl border border-slate-700/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden group">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none group-hover:bg-blue-500/20 transition-colors duration-1000"></div>
          
          <div className="flex items-center gap-5 relative z-10">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-white font-black text-2xl shadow-[0_0_20px_rgba(6,182,212,0.4)] border-2 border-slate-800">
              {iniciaisUsuario}
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight flex items-center gap-3">
                Olá, {usuario.nome?.split(' ')[0]}! 
                <span className="text-cyan-400 animate-bounce origin-bottom">👋</span>
              </h1>
              <p className="text-slate-400 mt-1 font-medium text-sm md:text-base">Aqui está o pulso da sua empresa em tempo real.</p>
            </div>
          </div>
          
          <div className="relative z-10 w-full md:w-auto">
            <Link to="/frente-caixa" className="w-full md:w-auto group/btn relative flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-2xl font-black transition-all transform hover:scale-105 overflow-hidden shadow-[0_0_20px_rgba(37,99,235,0.4)]">
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/0 via-cyan-400/30 to-cyan-400/0 translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-700"></div>
              <ShoppingCart className="w-6 h-6 group-hover/btn:-rotate-12 transition-transform" /> 
              <span>Abrir PDV Agora</span>
            </Link>
          </div>
        </div>

        {/* 🚀 O CÉREBRO: INSIGHTS DA AURYA (Prioridade Visual Dinâmica) */}
        <div className={`relative p-[2px] rounded-3xl overflow-hidden group shadow-2xl transition-shadow duration-500 ${configAtual.shadow}`}>
          <div className={`absolute inset-[-100%] bg-[conic-gradient(from_90deg_at_50%_50%,#0f172a_0%,${statusAurya === 'critico' ? '#ef4444' : statusAurya === 'atencao' ? '#f59e0b' : '#10b981'}_50%,#0f172a_100%)] animate-border-spin opacity-50 group-hover:opacity-100 transition-opacity duration-500`}></div>
          
          <div className={`bg-slate-900 rounded-[22px] relative z-10 flex flex-col md:flex-row gap-6 items-center p-6 md:p-8`}>
            <div className="absolute -right-10 -top-10 opacity-5 pointer-events-none">
              <BrainCircuit className="w-64 h-64 text-slate-400" />
            </div>
            
            <div className="relative shrink-0">
              <img src={auryaBrandMark} alt="Aurya IA" className={`w-20 h-20 rounded-full object-cover border-2 shadow-lg ${configAtual.border}`} />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-4 border-slate-900 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.8)]"></div>
            </div>

            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <h2 className="text-xl font-black text-white flex items-center gap-2">
                  <Sparkles className="w-6 h-6 text-indigo-400 animate-pulse" /> Insights da Aurya
                </h2>
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1 border ${configAtual.bg} ${configAtual.border} ${configAtual.text}`}>
                  {configAtual.icon}
                  {configAtual.label}
                </span>
              </div>

              {loading ? (
                <p className="text-slate-400 animate-pulse text-lg">Analisando os dados da sua loja...</p>
              ) : (
                <p className="text-slate-300 font-medium text-lg leading-relaxed">
                  {configAtual.msg}
                </p>
              )}
            </div>

            {/* 🚀 BOTÃO ANÁLISE COMPLETA (Altamente Chamativo) */}
            <Link to="/financeiro/dashboard" className="shrink-0 relative group/btn overflow-hidden rounded-2xl p-[2px] transform hover:scale-105 transition-transform duration-300 shadow-lg">
              <div className="absolute inset-[-100%] bg-[conic-gradient(from_90deg_at_50%_50%,#0f172a_0%,#a855f7_50%,#06b6d4_100%)] animate-border-spin opacity-80 group-hover/btn:opacity-100"></div>
              <div className="relative bg-slate-900 px-6 py-4 rounded-[14px] flex items-center gap-3 transition-all group-hover/btn:bg-slate-800/90">
                <BarChart2 className="w-6 h-6 text-cyan-400 group-hover/btn:animate-pulse" />
                <span className="font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-cyan-300 text-lg">Análise Completa</span>
              </div>
            </Link>
          </div>
        </div>

        {/* 🚀 LINHA PRINCIPAL: KPIS COM REAÇÃO DE ESTADO */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Card Vendas */}
          <div className={`${solidCardStyle} group hover:border-emerald-500/50`}>
            <div className="flex justify-between items-start mb-6">
              <h3 className="text-slate-400 font-bold uppercase text-xs tracking-widest">Vendas Hoje</h3>
              <div className={`${iconContainerStyle} ${resumo.vendasHoje > 0 ? 'text-emerald-400' : 'text-slate-500'}`}><TrendingUp className="w-8 h-8" /></div>
            </div>
            
            {loading ? (
              <p className="text-4xl font-black text-slate-600 mb-6">...</p>
            ) : (
              <div className="mb-6">
                <p className={`text-4xl md:text-5xl font-black tracking-tighter mb-2 transition-colors duration-700 ${resumo.vendasHoje === 0 ? 'text-slate-600' : 'text-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.3)]'}`}>
                  {formatarMoeda(vendasHojeAnim)}
                </p>
                {resumo.vendasHoje === 0 && <p className="text-sm font-bold text-slate-500 flex items-center gap-1"><Info className="w-4 h-4"/> Nenhuma venda registrada</p>}
              </div>
            )}
            
            <div className="text-sm font-bold text-slate-300 bg-slate-900 border border-slate-700 px-4 py-2.5 rounded-xl inline-block w-full text-center">
              Acumulado: <span className="text-white">{formatarMoeda(resumo.vendasMes)}</span>
            </div>
          </div>

          {/* Card Caixas */}
          <div className={`${solidCardStyle} group hover:border-cyan-500/50`}>
            <div className="flex justify-between items-start mb-6">
              <h3 className="text-slate-400 font-bold uppercase text-xs tracking-widest">Saldo em Caixas</h3>
              <div className={`${iconContainerStyle} ${resumo.saldoCaixas > 0 ? 'text-cyan-400' : 'text-slate-500'}`}><Wallet className="w-8 h-8" /></div>
            </div>
            
            {loading ? (
              <p className="text-4xl font-black text-slate-600 mb-6">...</p>
            ) : (
              <div className="mb-6">
                <p className={`text-4xl md:text-5xl font-black tracking-tighter mb-2 transition-colors duration-700 ${resumo.saldoCaixas === 0 ? 'text-slate-600' : 'text-white'}`}>
                  {formatarMoeda(saldoCaixasAnim)}
                </p>
                {resumo.saldoCaixas === 0 && <p className="text-sm font-bold text-slate-500 flex items-center gap-1"><Info className="w-4 h-4"/> Caixas zerados</p>}
              </div>
            )}

            <Link to="/financeiro/extrato" className="text-sm font-bold text-cyan-400 flex items-center justify-center gap-2 bg-slate-900 border border-slate-700 px-4 py-2.5 rounded-xl hover:bg-cyan-950/30 transition-colors w-full group/btn">
              Ver Livro Razão <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
            </Link>
          </div>

          {/* 🚀 Card Lucro Premium */}
          <div className="bg-slate-800 p-8 rounded-3xl shadow-xl border border-purple-500/40 flex flex-col justify-between relative overflow-hidden group hover:border-purple-400 hover:-translate-y-2 hover:shadow-2xl hover:shadow-purple-500/20 transition-all duration-500">
            <div className="absolute inset-x-0 bottom-0 opacity-20 pointer-events-none animate-wave-breathe">
              <svg viewBox="0 0 1440 320" className="w-full h-auto text-purple-500 fill-current">
                <path d="M0,160L48,176C96,192,192,224,288,213.3C384,203,480,149,576,144C672,139,768,187,864,202.7C960,219,1056,203,1152,176C1248,149,1344,112,1392,93.3L1440,75L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
              </svg>
            </div>
            <div className="absolute -right-6 -top-6 p-4 opacity-10 group-hover:scale-110 group-hover:rotate-12 transition-transform duration-700"><Activity className="w-40 h-40 text-purple-400" /></div>
            
            <div className="relative z-10">
              <h3 className="text-purple-300 font-bold uppercase text-xs tracking-widest mb-6">Lucro Operacional (Mês)</h3>
              
              {loading ? (
                <p className="text-4xl font-black text-slate-600 mb-6">...</p>
              ) : (
                <div className="mb-6">
                  <p className={`text-4xl md:text-5xl font-black tracking-tighter mb-2 transition-colors duration-700 ${resumo.lucroPresumidoMes === 0 ? 'text-slate-600' : resumo.lucroPresumidoMes < 0 ? 'text-red-400 drop-shadow-[0_0_10px_rgba(239,68,68,0.4)]' : 'text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 to-cyan-400 drop-shadow-md'}`}>
                    {formatarMoeda(lucroAnim)}
                  </p>
                  {resumo.lucroPresumidoMes === 0 && <p className="text-sm font-bold text-slate-500 flex items-center gap-1"><Info className="w-4 h-4"/> Aguardando fechamentos</p>}
                </div>
              )}
            </div>
            <Link to="/contabilidade/dre" className="text-sm font-bold text-purple-300 flex items-center justify-center gap-2 bg-purple-900/20 border border-purple-500/30 px-4 py-2.5 rounded-xl hover:bg-purple-900/40 transition-colors w-full relative z-10 group/btn">
              Abrir DRE Completo <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>

        {/* 🚀 BLOCOS INFERIORES */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 pt-4">
          
          <div className="space-y-10">
            <div>
              <h2 className="text-xl font-black text-white flex items-center gap-3 tracking-tight mb-6"><DollarSign className="w-7 h-7 text-cyan-400"/> Financeiro Diário</h2>
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-slate-800 p-7 rounded-3xl shadow-lg border border-slate-700 hover:border-emerald-500/50 transition-colors border-l-4 border-l-emerald-500 group hover:-translate-y-1 duration-300">
                  <h3 className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-3">A Receber Hoje</h3>
                  <p className={`text-3xl font-black tracking-tighter group-hover:scale-105 origin-left transition-transform ${resumo.contasReceberHoje > 0 ? 'text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.3)]' : 'text-slate-500'}`}>
                    {resumo.contasReceberHoje === 0 ? 'Tudo em dia ✅' : formatarMoeda(resumo.contasReceberHoje)}
                  </p>
                </div>
                <div className={`bg-slate-800 p-7 rounded-3xl shadow-lg border border-slate-700 transition-all border-l-4 group hover:-translate-y-1 duration-300 ${resumo.contasPagarHoje > 0 ? 'border-l-red-500 hover:border-red-500/50' : 'border-l-slate-600'}`}>
                  <h3 className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-3">A Pagar Hoje</h3>
                  <p className={`text-3xl font-black tracking-tighter group-hover:scale-105 origin-left transition-transform ${resumo.contasPagarHoje > 0 ? 'text-red-400 drop-shadow-[0_0_10px_rgba(239,68,68,0.3)]' : 'text-slate-500'}`}>
                    {resumo.contasPagarHoje === 0 ? 'Tudo pago ✅' : formatarMoeda(resumo.contasPagarHoje)}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-xl font-black text-white flex items-center gap-3 tracking-tight mb-6"><FileText className="w-7 h-7 text-cyan-400"/> Pendências Fiscais</h2>
              <div className="grid grid-cols-2 gap-6">
                <Link to="/notas" className="bg-slate-800 hover:bg-slate-700 transition-all p-7 rounded-3xl border border-slate-700 flex items-center justify-between group shadow-lg hover:-translate-y-1 duration-300">
                  <div>
                    <h3 className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-3">NFC-e / NF-e</h3>
                    <p className={`text-3xl font-black tracking-tighter ${resumo.notasPendentesEmissao > 0 ? 'text-amber-400' : 'text-slate-500 text-lg'}`}>
                      {resumo.notasPendentesEmissao === 0 ? 'Livre ✅' : resumo.notasPendentesEmissao}
                    </p>
                  </div>
                  <AlertTriangle className={`w-12 h-12 ${resumo.notasPendentesEmissao > 0 ? 'text-amber-500 opacity-80 animate-pulse' : 'text-slate-600 opacity-20'} group-hover:scale-110 transition-all`} />
                </Link>

                <Link to="/entrada-notas" className="bg-slate-800 hover:bg-slate-700 transition-all p-7 rounded-3xl border border-slate-700 flex items-center justify-between group shadow-lg hover:-translate-y-1 duration-300">
                  <div>
                    <h3 className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-3">XMLs na Fila</h3>
                    <p className={`text-3xl font-black tracking-tighter ${resumo.xmlPendentesEntrada > 0 ? 'text-cyan-400' : 'text-slate-500 text-lg'}`}>
                      {resumo.xmlPendentesEntrada === 0 ? 'Livre ✅' : resumo.xmlPendentesEntrada}
                    </p>
                  </div>
                  <Download className={`w-12 h-12 ${resumo.xmlPendentesEntrada > 0 ? 'text-cyan-500 opacity-80 animate-bounce' : 'text-slate-600 opacity-20'} group-hover:scale-110 transition-all`} />
                </Link>
              </div>
            </div>
          </div>

          {/* Estoque */}
          <div className="bg-slate-800 p-8 rounded-3xl shadow-xl border border-slate-700 h-full flex flex-col hover:border-cyan-500/30 transition-all duration-300 hover:-translate-y-1">
            <h2 className="text-xl font-black text-white flex items-center gap-3 mb-8 tracking-tight"><Package className="w-7 h-7 text-cyan-400"/> Visão de Estoque</h2>
            
            <div className="flex-1 space-y-8">
              <div className="flex items-center justify-between p-7 bg-slate-900 rounded-2xl border border-slate-700 group hover:border-cyan-500/50 transition-colors">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Valor Imobilizado</p>
                  <p className="text-4xl font-black text-white tracking-tighter group-hover:scale-105 origin-left transition-transform">{loading ? '...' : formatarMoeda(resumo.valorTotalEstoque)}</p>
                </div>
                <div className="w-16 h-16 bg-slate-800 rounded-2xl border border-slate-700 flex items-center justify-center text-cyan-400 shadow-lg group-hover:rotate-12 transition-transform">
                  <DollarSign className="w-8 h-8" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="p-7 border border-slate-700 bg-slate-900 rounded-2xl text-center group hover:border-slate-500 transition-colors">
                  <p className="text-4xl font-black text-white tracking-tighter group-hover:scale-110 transition-transform">{loading ? '...' : resumo.totalProdutos}</p>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-3">Itens Ativos</p>
                </div>
                <div className={`p-7 border rounded-2xl text-center transition-all group flex flex-col justify-center ${resumo.alertasEstoque > 0 ? 'bg-red-900/20 border-red-500/50 hover:bg-red-900/40' : 'bg-slate-900 border-slate-700'}`}>
                  {resumo.alertasEstoque > 0 ? (
                    <>
                      <p className="text-4xl font-black text-red-400 tracking-tighter group-hover:scale-110 transition-transform animate-pulse drop-shadow-[0_0_10px_rgba(239,68,68,0.4)]">{resumo.alertasEstoque}</p>
                      <p className="text-xs font-bold text-red-400 uppercase tracking-widest mt-3">Rupturas</p>
                    </>
                  ) : (
                    <>
                      <p className="text-2xl font-black text-slate-500 tracking-tighter">Saudável ✅</p>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-3">Rupturas</p>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-10 pt-8 border-t border-slate-700">
              <Link to="/estoque/inventario" className="w-full py-5 bg-slate-900 hover:bg-slate-700 text-white border border-slate-700 font-black tracking-wide rounded-2xl transition-all flex items-center justify-center gap-3 hover:border-cyan-500/50 hover:shadow-[0_0_20px_rgba(6,182,212,0.2)] group overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-r from-slate-700/0 via-slate-700/50 to-slate-700/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                <AlertTriangle className="w-6 h-6 text-amber-400 group-hover:scale-110 transition-transform" /> Realizar Inventário Cego
              </Link>
            </div>
          </div>

        </div>
      </div>
    </Layout>
  );
}