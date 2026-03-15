import { useState, useEffect } from 'react';
import axios from 'axios';
import { Layout } from '../components/Layout';

interface ResumoDashboard {
  vendasHoje: number;
  totalProdutos: number;
  alertasEstoque: number;
}

export function Dashboard() {
  const [resumo, setResumo] = useState<ResumoDashboard>({
    vendasHoje: 0,
    totalProdutos: 0,
    alertasEstoque: 0
  });
  const [loading, setLoading] = useState(true);

  // Pega o nome do usuário para dar bom dia/boa tarde
  const usuario = JSON.parse(localStorage.getItem('@PDVUsuario') || '{}');

  useEffect(() => {
    const carregarDashboard = async () => {
      try {
        const token = localStorage.getItem('@PDVToken');
        const response = await axios.get('http://localhost:3333/dashboard/resumo', {
          headers: { Authorization: `Bearer ${token}` }
        });

        console.log("🚨 DADOS RECEBIDOS DO BACKEND:", response.data);
        setResumo(response.data);
      } catch (error) {
        console.error("Erro ao carregar dashboard:", error);
      } finally {
        setLoading(false);
      }
    };

    carregarDashboard();

  }, []);

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800">
          Olá, {usuario.nome?.split(' ')[0]}! 👋
        </h1>
        <p className="text-slate-500 mt-1">Aqui está o resumo da sua loja hoje.</p>
      </div>
      
      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Card de Vendas */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 border-l-4 border-l-emerald-500">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-slate-500 text-sm font-medium">Vendas Hoje</h3>
              <p className="text-3xl font-bold text-slate-800 mt-2">
                {loading ? '...' : `R$ ${Number(resumo.vendasHoje).toFixed(2).replace('.', ',')}`}
              </p>
            </div>
            <div className="p-3 bg-emerald-100 rounded-lg text-emerald-600 text-xl">💰</div>
          </div>
        </div>
        
        {/* Card de Produtos */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 border-l-4 border-l-blue-500">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-slate-500 text-sm font-medium">Produtos Cadastrados</h3>
              <p className="text-3xl font-bold text-slate-800 mt-2">
                {loading ? '...' : resumo.totalProdutos}
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg text-blue-600 text-xl">📦</div>
          </div>
        </div>
        
        {/* Card de Alertas */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 border-l-4 border-l-red-500">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-slate-500 text-sm font-medium">Alertas de Estoque</h3>
              <p className="text-3xl font-bold text-slate-800 mt-2">
                {loading ? '...' : resumo.alertasEstoque}
              </p>
            </div>
            <div className="p-3 bg-red-100 rounded-lg text-red-600 text-xl">⚠️</div>
          </div>
          {resumo.alertasEstoque > 0 && !loading && (
            <p className="text-xs text-red-500 mt-4 font-medium">
              Atenção: Você tem produtos precisando de reposição!
            </p>
          )}
        </div>

      </div>
    </Layout>
  );
}