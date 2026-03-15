import { useState, useEffect } from 'react';
import axios from 'axios';
import { Layout } from '../components/Layout';

interface Categoria {
  id: string;
  nome: string;
}

interface Produto {
  id: string;
  nome: string;
  precoCusto: number;
  precoVenda: number;
  categoria: {
    nome: string;
  };
  codigoBarras: string
}

export function Produtos() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  
  // Estados do formulário atualizados para bater com o Banco de Dados!
  const [nome, setNome] = useState('');
  const [precoCusto, setPrecoCusto] = useState('');
  const [precoVenda, setPrecoVenda] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [loading, setLoading] = useState(false);
  const [codigoBarras, setcodigoBarras] = useState('');

  const carregarDados = async () => {
    try {
      const token = localStorage.getItem('@PDVToken');
      const headers = { Authorization: `Bearer ${token}` };

      const [resProdutos, resCategorias] = await Promise.all([
        axios.get('http://localhost:3333/produtos', { headers }),
        axios.get('http://localhost:3333/categorias', { headers })
      ]);
      
      setProdutos(resProdutos.data);
      setCategorias(resCategorias.data);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const handleCriarProduto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome || !precoCusto || !precoVenda || !categoriaId ) {
      alert("Preencha todos os campos!");
      return;
    }
    
    setLoading(true);
    try {
      const token = localStorage.getItem('@PDVToken');
      
      // Aqui está o segredo: enviamos exatamente o que o Prisma quer!
      await axios.post('http://localhost:3333/produtos', 
        { 
          nome, 
          precoCusto: parseFloat(precoCusto), 
          precoVenda: parseFloat(precoVenda), 
          categoriaId ,
          codigoBarras
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setNome('');
      setPrecoCusto('');
      setPrecoVenda('');
      setCategoriaId('');
      setcodigoBarras('');
      
      carregarDados(); 
    } catch (error) {
      console.error("Erro ao criar produto:", error);
      alert("Erro ao criar produto. Verifique se o backend está rodando corretamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800">Produtos</h1>
        <p className="text-slate-500 mt-1">Cadastre e gerencie o estoque da sua loja.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold text-slate-800 mb-4">Novo Produto</h2>
            
            <form onSubmit={handleCriarProduto} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome do Produto</label>
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Ex: Coca-Cola 2L"
                  required
                />
              </div>

              {/* Novo Campo: Preço de Custo */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Preço de Custo (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={precoCusto}
                  onChange={(e) => setPrecoCusto(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Ex: 5.00"
                  required
                />
              </div>

              {/* Novo Campo: Preço de Venda */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Preço de Venda (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={precoVenda}
                  onChange={(e) => setPrecoVenda(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Ex: 8.50"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Categoria</label>
                <select
                  value={categoriaId}
                  onChange={(e) => setCategoriaId(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                  required
                >
                  <option value="">Selecione uma categoria...</option>
                  {categorias.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.nome}</option>
                  ))}
                </select>
              </div>

              {/* Novo Campo: Código de Barras */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Código de Barras</label>
                <input
                  type="text"
                  value={codigoBarras}
                  onChange={(e) => setcodigoBarras(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Ex: 7891234567890"
                />
              </div>

              {/* Novo Campo: Preço de Venda */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Preço de Venda (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={precoVenda}
                  onChange={(e) => setPrecoVenda(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Ex: 8.50"
                  required
                />
              </div>
              
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition-colors disabled:bg-blue-400"
              >
                {loading ? 'Salvando...' : 'Cadastrar Produto'}
              </button>
            </form>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="p-4 text-sm font-semibold text-slate-600">Produto</th>
                  <th className="p-4 text-sm font-semibold text-slate-600">Categoria</th>
                  <th className="p-4 text-sm font-semibold text-slate-600">Custo</th>
                  <th className="p-4 text-sm font-semibold text-slate-600">Venda</th>
                  <th className="p-4 text-sm font-semibold text-slate-600">Código de Barras</th>
                </tr>
              </thead>
              <tbody>
                {produtos.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-500">
                      Nenhum produto cadastrado ainda.
                    </td>
                  </tr>
                ) : (
                  produtos.map((produto) => (
                    <tr key={produto.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="p-4 text-slate-800 font-medium">{produto.nome}</td>
                      <td className="p-4 text-slate-600">
                        <span className="bg-slate-100 px-2 py-1 rounded text-xs font-medium">
                          {produto.categoria?.nome || 'Sem categoria'}
                        </span>
                      </td>
                      <td className="p-4 text-red-600 font-medium">
                        R$ {Number(produto.precoCusto).toFixed(2).replace('.', ',')}
                      </td>
                      <td className="p-4 text-emerald-600 font-semibold">
                        R$ {Number(produto.precoVenda).toFixed(2).replace('.', ',')}
                      </td>
                      <td className="p-4 text-slate-600">
                        {produto.codigoBarras || 'N/A'}
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