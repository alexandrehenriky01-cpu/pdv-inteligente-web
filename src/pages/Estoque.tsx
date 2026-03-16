import { useState, useEffect } from 'react';
import axios from 'axios';
import { Layout } from '../components/Layout';

interface Produto {
  id: string;
  nome: string;
  codigoBarras?: string;
  estoque?: {
    quantidadeAtual: number;
  };
}
  
export function Estoque() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados do Modal de Entrada de Estoque
  const [showModal, setShowModal] = useState(false);
  const [produtoSelecionado, setProdutoSelecionado] = useState('');
  const [quantidadeAdicionar, setQuantidadeAdicionar] = useState('');
  const [loadingEntrada, setLoadingEntrada] = useState(false);

  const carregarEstoque = async () => {
    try {
      const token = localStorage.getItem('@PDVToken');
      const response = await axios.get('https://pdv-inteligente-api.onrender.com/produtos', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProdutos(response.data);
    } catch (error) {
      console.error("Erro ao carregar estoque:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarEstoque();
  }, []);

  // Função para salvar a entrada de mercadoria
  const handleEntradaEstoque = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!produtoSelecionado || !quantidadeAdicionar) return;

    setLoadingEntrada(true);
    try {
      const token = localStorage.getItem('@PDVToken');
      
      // Enviando a requisição para o backend registrar a entrada
      await axios.post('https://pdv-inteligente-api.onrender.com/estoque/entrada', {
        produtoId: produtoSelecionado,
        quantidade: Number(quantidadeAdicionar),
        tipoMovimento: 'ENTRADA' // Caso seu backend exija saber o tipo
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Sucesso! Limpa o modal e recarrega a lista
      setShowModal(false);
      setProdutoSelecionado('');
      setQuantidadeAdicionar('');
      carregarEstoque(); 
      
    } catch (error) {
      console.error("Erro na entrada de estoque:", error);
      alert("Erro ao registrar entrada. Verifique o terminal do backend para ver o que o banco exigiu.");
    } finally {
      setLoadingEntrada(false);
    }
  };

  return (
    <Layout>
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Controle de Estoque</h1>
          <p className="text-slate-500 mt-1">Visibilidade total dos produtos da sua loja física.</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors shadow-sm"
        >
          + Entrada de Mercadoria
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
          <h2 className="font-semibold text-slate-700">Posição Atual do Inventário</h2>
        </div>
        
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="p-4 text-sm font-semibold text-slate-600">Produto</th>
              <th className="p-4 text-sm font-semibold text-slate-600">Cód. Barras</th>
              <th className="p-4 text-sm font-semibold text-slate-600 text-center">Quantidade Atual</th>
              <th className="p-4 text-sm font-semibold text-slate-600 text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="p-8 text-center text-slate-500">Carregando estoque...</td></tr>
            ) : produtos.length === 0 ? (
              <tr><td colSpan={4} className="p-8 text-center text-slate-500">Nenhum produto cadastrado.</td></tr>
            ) : (
              produtos.map((produto) => {
                const qtd = produto.estoque?.quantidadeAtual || 0;
                
                let statusColor = "bg-green-100 text-green-700";
                let statusText = "Saudável";
                
                if (qtd === 0) {
                  statusColor = "bg-red-100 text-red-700";
                  statusText = "Falta (Ruptura)";
                } else if (qtd < 5) {
                  statusColor = "bg-yellow-100 text-yellow-700";
                  statusText = "Baixo (Atenção)";
                }

                return (
                  <tr key={produto.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="p-4 text-slate-800 font-medium">{produto.nome}</td>
                    <td className="p-4 text-slate-500 text-sm">{produto.codigoBarras || 'Sem código'}</td>
                    <td className="p-4 text-center font-bold text-lg text-slate-700">{qtd}</td>
                    <td className="p-4 text-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusColor}`}>
                        {statusText}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL DE ENTRADA DE ESTOQUE */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-800">Nova Entrada de Mercadoria</h3>
              <button 
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 text-2xl font-bold"
              >
                &times;
              </button>
            </div>
            
            <form onSubmit={handleEntradaEstoque} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Selecione o Produto</label>
                <select
                  value={produtoSelecionado}
                  onChange={(e) => setProdutoSelecionado(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                  required
                >
                  <option value="">Escolha um produto...</option>
                  {produtos.map(p => (
                    <option key={p.id} value={p.id}>{p.nome}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Quantidade Recebida</label>
                <input
                  type="number"
                  min="1"
                  value={quantidadeAdicionar}
                  onChange={(e) => setQuantidadeAdicionar(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Ex: 50"
                  required
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loadingEntrada}
                  className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:bg-blue-400"
                >
                  {loadingEntrada ? 'Salvando...' : 'Confirmar Entrada'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}