import { useState, useEffect } from 'react';
import axios from 'axios';
import { Layout } from '../components/Layout';

// Tipagem para o TypeScript saber o que é uma Categoria
interface Categoria {
  id: string;
  nome: string;
}

export function Categorias() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [novaCategoria, setNovaCategoria] = useState('');
  const [loading, setLoading] = useState(false);

  // Função para buscar as categorias no Backend
  const carregarCategorias = async () => {
    try {
      const token = localStorage.getItem('@PDVToken'); // Pega o crachá
      
      const response = await axios.get('http://localhost:3333/categorias', {
        headers: {
          Authorization: `Bearer ${token}` // Mostra o crachá na porta do backend
        }
      });
      
      setCategorias(response.data);
    } catch (error) {
      console.error("Erro ao carregar categorias:", error);
      alert("Sua sessão expirou ou houve um erro. Faça login novamente.");
    }
  };

  // Função para criar uma nova categoria
  const handleCriarCategoria = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novaCategoria.trim()) return;
    
    setLoading(true);
    try {
      const token = localStorage.getItem('@PDVToken');
      
      await axios.post('http://localhost:3333/categorias', 
        { nome: novaCategoria },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      setNovaCategoria(''); // Limpa o campo
      carregarCategorias(); // Recarrega a lista para mostrar a nova
    } catch (error) {
      console.error("Erro ao criar categoria:", error);
      alert("Erro ao criar categoria.");
    } finally {
      setLoading(false);
    }
  };

  // O useEffect faz o React chamar a função carregarCategorias assim que a tela abre
  useEffect(() => {
    carregarCategorias();
  }, []);

  return (
    <Layout>
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Categorias</h1>
          <p className="text-slate-500 mt-1">Gerencie os departamentos da sua loja.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Coluna da Esquerda: Formulário de Criação */}
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold text-slate-800 mb-4">Nova Categoria</h2>
            
            <form onSubmit={handleCriarCategoria} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome da Categoria</label>
                <input
                  type="text"
                  value={novaCategoria}
                  onChange={(e) => setNovaCategoria(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  placeholder="Ex: Bebidas"
                  required
                />
              </div>
              
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition-colors disabled:bg-blue-400"
              >
                {loading ? 'Salvando...' : 'Adicionar Categoria'}
              </button>
            </form>
          </div>
        </div>

        {/* Coluna da Direita: Lista de Categorias */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="p-4 text-sm font-semibold text-slate-600">Nome</th>
                  <th className="p-4 text-sm font-semibold text-slate-600 w-24">Ações</th>
                </tr>
              </thead>
              <tbody>
                {categorias.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="p-8 text-center text-slate-500">
                      Nenhuma categoria cadastrada ainda.
                    </td>
                  </tr>
                ) : (
                  categorias.map((categoria) => (
                    <tr key={categoria.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="p-4 text-slate-800 font-medium">{categoria.nome}</td>
                      <td className="p-4">
                        <button className="text-slate-400 hover:text-red-500 transition-colors">
                          Excluir
                        </button>
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