import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Layout } from '../components/Layout';
import { useNavigate } from 'react-router-dom';

export function ListarNfe() {
  const navigate = useNavigate();
  const [notas, setNotas] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Estado dos Filtros
  const [filtros, setFiltros] = useState({
    numero: '',
    fornecedor: '',
    dataInicio: '',
    dataFim: '',
    produto: '',
    cfop: ''
  });

  const carregarNotas = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('@PDVToken');
      
      // Monta a URL com os filtros preenchidos
      const params = new URLSearchParams();
      if (filtros.numero) params.append('numero', filtros.numero);
      if (filtros.fornecedor) params.append('fornecedor', filtros.fornecedor);
      if (filtros.dataInicio) params.append('dataInicio', filtros.dataInicio);
      if (filtros.dataFim) params.append('dataFim', filtros.dataFim);
      if (filtros.produto) params.append('produto', filtros.produto);
      if (filtros.cfop) params.append('cfop', filtros.cfop);

      const response = await api.get(`/api/nfe?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      setNotas(response.data);
    } catch (error) {
      console.error("Erro ao buscar notas", error);
      alert('Erro ao carregar as Notas Fiscais.');
    } finally {
      setLoading(false);
    }
  };

  // Carrega as notas ao abrir a tela
  useEffect(() => {
    carregarNotas();
  }, []);

  const handleLimparFiltros = () => {
    setFiltros({ numero: '', fornecedor: '', dataInicio: '', dataFim: '', produto: '', cfop: '' });
    setTimeout(carregarNotas, 100); // Recarrega após limpar
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-800">Gestão de Notas Fiscais</h1>
            <p className="text-slate-500 mt-1">Consulte e audite todas as notas de entrada importadas no sistema.</p>
          </div>
          <button 
            onClick={() => navigate('/estoque/entrada')}
            className="bg-emerald-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-emerald-700 transition-colors shadow-sm flex items-center gap-2"
          >
            <span className="text-xl">+</span> Nova Entrada (XML)
          </button>
        </div>

        {/* 🔍 PAINEL DE FILTROS */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-6">
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-2">
            <span>🔍</span> Filtros de Pesquisa
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Nº da Nota</label>
              <input type="text" placeholder="Ex: 1234" value={filtros.numero} onChange={e => setFiltros({...filtros, numero: e.target.value})} className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
            </div>
            <div className="lg:col-span-2">
              <label className="block text-xs font-bold text-slate-600 mb-1">Fornecedor (Razão Social)</label>
              <input type="text" placeholder="Nome do fornecedor" value={filtros.fornecedor} onChange={e => setFiltros({...filtros, fornecedor: e.target.value})} className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Data Início</label>
              <input type="date" value={filtros.dataInicio} onChange={e => setFiltros({...filtros, dataInicio: e.target.value})} className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Data Fim</label>
              <input type="date" value={filtros.dataFim} onChange={e => setFiltros({...filtros, dataFim: e.target.value})} className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">CFOP (Itens)</label>
              <input type="text" placeholder="Ex: 1102" value={filtros.cfop} onChange={e => setFiltros({...filtros, cfop: e.target.value})} className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
            </div>
            <div className="lg:col-span-2">
              <label className="block text-xs font-bold text-slate-600 mb-1">Produto Contido na Nota</label>
              <input type="text" placeholder="Nome do produto" value={filtros.produto} onChange={e => setFiltros({...filtros, produto: e.target.value})} className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-slate-100">
            <button onClick={handleLimparFiltros} className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded transition-colors">
              Limpar Filtros
            </button>
            <button onClick={carregarNotas} disabled={loading} className="bg-blue-600 text-white px-6 py-2 rounded font-bold hover:bg-blue-700 transition-colors text-sm shadow-sm">
              {loading ? 'Buscando...' : 'Aplicar Filtros'}
            </button>
          </div>
        </div>

        {/* 📋 TABELA DE RESULTADOS */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-xs text-slate-500 uppercase border-b border-slate-200">
                  <th className="p-4 font-bold">Data Emissão</th>
                  <th className="p-4 font-bold">Nº Nota / Série</th>
                  <th className="p-4 font-bold">Fornecedor</th>
                  <th className="p-4 font-bold text-center">Qtd Itens</th>
                  <th className="p-4 font-bold text-right">Valor Total</th>
                  <th className="p-4 font-bold text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {notas.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500">
                      Nenhuma nota fiscal encontrada com estes filtros.
                    </td>
                  </tr>
                ) : (
                  notas.map((nota) => (
                    <tr key={nota.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 text-sm font-medium text-slate-700">
                        {new Date(nota.dataEmissao).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="p-4">
                        <span className="font-bold text-slate-800">{nota.numero}</span>
                        <span className="text-xs text-slate-500 ml-1">/ {nota.serie}</span>
                      </td>
                      <td className="p-4 text-sm text-slate-600">
                        <div className="font-bold">{nota.fornecedor?.razaoSocial}</div>
                        <div className="text-xs text-slate-400">CNPJ: {nota.fornecedor?.cnpjCpf}</div>
                      </td>
                      <td className="p-4 text-sm text-center font-bold text-slate-600">
                        {nota.itens?.length || 0}
                      </td>
                      <td className="p-4 text-sm font-bold text-emerald-600 text-right">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(nota.valorTotalDocumento)}
                      </td>
                      <td className="p-4 text-center">
                        <span className="bg-emerald-100 text-emerald-700 text-xs px-2 py-1 rounded-full font-bold">
                          Processada
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </Layout>
  );
}