import { useState } from 'react';
import axios from 'axios';
import { Layout } from '../components/Layout';

export function ConsultorIA() {
  const [loading, setLoading] = useState(false);
  const [insight, setInsight] = useState<string | null>(null);

  const buscarAnalise = async (tipo: 'estoque' | 'financeiro') => {
    setLoading(true);
    setInsight(null); // Limpa o anterior
    try {
      const token = localStorage.getItem('@PDVToken');
      const response = await axios.get(`http://localhost:3333/ia/${tipo}/analise`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setInsight(response.data.mensagem);
    } catch (error) {
      console.error("Erro ao buscar IA:", error);
      setInsight("❌ Ops! O consultor está indisponível no momento.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800">Consultor Inteligente 🧠</h1>
        <p className="text-slate-500 mt-1">Seu parceiro virtual para insights de negócios.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <button 
          onClick={() => buscarAnalise('estoque')}
          className="bg-blue-600 hover:bg-blue-700 text-white p-6 rounded-xl shadow-sm transition-all transform hover:-translate-y-1 flex flex-col items-center justify-center gap-3"
        >
          <span className="text-4xl">📦</span>
          <span className="font-bold text-lg">Analisar meu Estoque</span>
          <span className="text-blue-200 text-sm text-center">Descubra o que comprar e o que promover.</span>
        </button>

        <button 
          onClick={() => buscarAnalise('financeiro')}
          className="bg-emerald-600 hover:bg-emerald-700 text-white p-6 rounded-xl shadow-sm transition-all transform hover:-translate-y-1 flex flex-col items-center justify-center gap-3"
        >
          <span className="text-4xl">💰</span>
          <span className="font-bold text-lg">Analisar minhas Vendas</span>
          <span className="text-emerald-200 text-sm text-center">Dicas para aumentar o faturamento.</span>
        </button>
      </div>

      {loading && (
        <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 text-center animate-pulse">
          <div className="text-4xl mb-4">🤖</div>
          <p className="text-slate-600 font-medium">O Consultor está analisando seus dados...</p>
        </div>
      )}

      {insight && !loading && (
        <div className="bg-slate-800 p-8 rounded-xl shadow-lg border border-slate-700 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10 text-6xl">💡</div>
          <h3 className="text-emerald-400 font-bold mb-4 flex items-center gap-2">
            <span>✨</span> Insight Gerado:
          </h3>
          <div className="text-slate-200 whitespace-pre-wrap leading-relaxed text-lg">
            {insight}
          </div>
        </div>
      )}
    </Layout>
  );
}