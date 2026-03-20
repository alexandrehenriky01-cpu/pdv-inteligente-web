import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Layout } from '../components/Layout';
import { Link } from 'react-router-dom';

// Tipagem baseada no que o Backend retorna
interface Pessoa {
  id: string;
  tipo: string;
  razaoSocial: string;
  nomeFantasia: string | null;
  cnpjCpf: string;
  status: string;
  contatos: { email: string | null; telefone: string | null }[];
}

export function ListaPessoas() {
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filtros
  const [busca, setBusca] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState(''); // '' = Todos, 'CLIENTE', 'FORNECEDOR'

  const carregarPessoas = async () => {
    setLoading(true);
    try {
      // Passando os filtros como query params para a nossa rota do backend
      const response = await api.get('/api/pessoas', {
        params: {
          busca: busca || undefined,
          tipo: tipoFiltro || undefined
        }
      });
      setPessoas(response.data);
    } catch (error) {
      console.error("Erro ao carregar pessoas:", error);
      alert("Não foi possível carregar a lista de parceiros.");
    } finally {
      setLoading(false);
    }
  };

  // Carrega os dados na primeira vez e sempre que os filtros mudarem
  useEffect(() => {
    // Usamos um pequeno "debounce" (atraso) para não fazer requisição a cada letra digitada
    const delayDebounceFn = setTimeout(() => {
      carregarPessoas();
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [busca, tipoFiltro]);

  // Função auxiliar para formatar CNPJ/CPF
  const formatarDocumento = (doc: string) => {
    if (doc.length === 14) {
      return doc.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
    }
    if (doc.length === 11) {
      return doc.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
    }
    return doc;
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto mb-8">
        {/* CABEÇALHO DA PÁGINA */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Parceiros de Negócios</h1>
            <p className="text-slate-500 mt-1">Gerencie seus clientes e fornecedores.</p>
          </div>
          
          <Link 
            to="/pessoas/novo" 
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-semibold transition-colors shadow-sm flex items-center gap-2"
          >
            <span>+</span> Novo Cadastro
          </Link>
        </div>

        {/* BARRA DE FILTROS */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Buscar</label>
            <input 
              type="text" 
              placeholder="Razão Social, Fantasia ou CNPJ/CPF..." 
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          
          <div className="w-full md:w-64">
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Tipo</label>
            <select 
              value={tipoFiltro}
              onChange={(e) => setTipoFiltro(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
            >
              <option value="">Todos</option>
              <option value="CLIENTE">Clientes</option>
              <option value="FORNECEDOR">Fornecedores</option>
            </select>
          </div>
        </div>

        {/* TABELA DE DADOS */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="p-4 text-sm font-semibold text-slate-600">Razão Social / Fantasia</th>
                  <th className="p-4 text-sm font-semibold text-slate-600">CNPJ / CPF</th>
                  <th className="p-4 text-sm font-semibold text-slate-600">Tipo</th>
                  <th className="p-4 text-sm font-semibold text-slate-600">Contato (Principal)</th>
                  <th className="p-4 text-sm font-semibold text-slate-600">Status</th>
                  <th className="p-4 text-sm font-semibold text-slate-600 text-center">Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        Carregando dados...
                      </div>
                    </td>
                  </tr>
                ) : pessoas.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500">
                      Nenhum parceiro de negócios encontrado.
                    </td>
                  </tr>
                ) : (
                  pessoas.map((pessoa) => (
                    <tr key={pessoa.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="p-4">
                        <p className="font-bold text-slate-800">{pessoa.nomeFantasia || pessoa.razaoSocial}</p>
                        {pessoa.nomeFantasia && (
                          <p className="text-xs text-slate-500 truncate max-w-[200px]">{pessoa.razaoSocial}</p>
                        )}
                      </td>
                      <td className="p-4 text-slate-700 font-medium text-sm">
                        {formatarDocumento(pessoa.cnpjCpf)}
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                          pessoa.tipo === 'CLIENTE' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                        }`}>
                          {pessoa.tipo}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-slate-600">
                        {pessoa.contatos && pessoa.contatos.length > 0 ? (
                          <>
                            <p>{pessoa.contatos[0].telefone || '-'}</p>
                            <p className="text-xs text-slate-400">{pessoa.contatos[0].email || '-'}</p>
                          </>
                        ) : (
                          <span className="text-slate-400 italic">Sem contato</span>
                        )}
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                          pessoa.status === 'ATIVO' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {pessoa.status}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <button className="text-slate-400 hover:text-blue-600 transition-colors font-medium text-sm">
                          Ver Detalhes
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* RODAPÉ DA TABELA (Contador) */}
          <div className="bg-slate-50 p-4 border-t border-slate-200 text-sm text-slate-500 flex justify-between items-center">
            <span>Mostrando {pessoas.length} registro(s)</span>
            <span className="italic text-xs">Limitado aos 50 mais recentes</span>
          </div>
        </div>

      </div>
    </Layout>
  );
}