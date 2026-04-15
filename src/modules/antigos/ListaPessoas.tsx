import { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { Layout } from '../../components/Layout';
import { Link } from 'react-router-dom';

interface Pessoa {
  id: string;
  tipo: string;
  razaoSocial: string;
  nomeFantasia: string | null;
  cnpjCpf: string;
  status: string;
  contatos: { email: string | null; telefone: string | null }[];
  contaCliente?: { id: string; codigo: string; descricao: string } | null;
  contaFornecedor?: { id: string; codigo: string; descricao: string } | null;
}

export function ListaPessoas() {
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filtros
  const [busca, setBusca] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState('');

  const carregarPessoas = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('@PDVToken');
      const response = await api.get('/api/cadastros/pessoas', {
        headers: { Authorization: `Bearer ${token}` },
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

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      carregarPessoas();
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [busca, tipoFiltro]);

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
      <div className="max-w-7xl mx-auto mb-8 space-y-6">
        
        {/* CABEÇALHO DA PÁGINA */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/60 backdrop-blur-md p-6 rounded-xl shadow-lg border border-slate-800">
          <div>
            <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
              <span className="text-cyan-400">👥</span> Parceiros de Negócios
            </h1>
            <p className="text-slate-400 mt-1">Gerencie seus clientes e fornecedores e seus vínculos contábeis.</p>
          </div>
          
          <Link 
            to="/pessoas/novo" 
            className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white px-6 py-3 rounded-lg font-bold transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] hover:shadow-[0_0_25px_rgba(6,182,212,0.5)] transform hover:-translate-y-0.5 flex items-center gap-2"
          >
            <span className="text-xl">+</span> Novo Cadastro
          </Link>
        </div>

        {/* BARRA DE FILTROS */}
        <div className="bg-slate-900/60 backdrop-blur-md p-5 rounded-xl shadow-sm border border-slate-800 flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Buscar Parceiro</label>
            <div className="relative">
              <span className="absolute left-4 top-3 text-cyan-500">🔍</span>
              <input 
                type="text" 
                placeholder="Razão Social, Fantasia ou CNPJ/CPF..." 
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-slate-950/50 border border-slate-700 text-white rounded-lg focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all placeholder:text-slate-600"
              />
            </div>
          </div>
          
          <div className="w-full md:w-64">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Tipo de Parceiro</label>
            <select 
              value={tipoFiltro}
              onChange={(e) => setTipoFiltro(e.target.value)}
              className="w-full px-4 py-3 bg-slate-950/50 border border-slate-700 text-white rounded-lg focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all font-medium"
            >
              <option value="" className="text-slate-400">Todos</option>
              <option value="CLIENTE">Clientes</option>
              <option value="FORNECEDOR">Fornecedores</option>
              <option value="AMBOS">Ambos</option>
            </select>
          </div>
        </div>

        {/* TABELA DE DADOS */}
        <div className="bg-slate-900/60 backdrop-blur-md rounded-xl shadow-lg border border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-slate-900/80 border-b border-slate-800">
                  <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Razão Social / Fantasia</th>
                  <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">CNPJ / CPF</th>
                  <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Tipo</th>
                  <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Contato</th>
                  <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Vínculo Contábil</th>
                  <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="p-12 text-center">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <svg className="animate-spin h-8 w-8 text-cyan-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span className="text-cyan-400 font-bold animate-pulse">Carregando parceiros...</span>
                      </div>
                    </td>
                  </tr>
                ) : pessoas.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-slate-500">
                      Nenhum parceiro de negócios encontrado.
                    </td>
                  </tr>
                ) : (
                  pessoas.map((pessoa) => (
                    <tr key={pessoa.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="p-4">
                        <p className="font-bold text-white text-base">{pessoa.nomeFantasia || pessoa.razaoSocial}</p>
                        {pessoa.nomeFantasia && (
                          <p className="text-xs text-slate-400 truncate max-w-[200px] mt-0.5">{pessoa.razaoSocial}</p>
                        )}
                      </td>
                      <td className="p-4 text-slate-300 font-mono text-sm">
                        {formatarDocumento(pessoa.cnpjCpf)}
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider ${
                          pessoa.tipo === 'CLIENTE' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 
                          pessoa.tipo === 'FORNECEDOR' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 
                          'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
                        }`}>
                          {pessoa.tipo}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-slate-300">
                        {pessoa.contatos && pessoa.contatos.length > 0 ? (
                          <>
                            <p className="font-medium">{pessoa.contatos[0].telefone || '-'}</p>
                            <p className="text-xs text-slate-500 mt-0.5">{pessoa.contatos[0].email || '-'}</p>
                          </>
                        ) : (
                          <span className="text-slate-600 italic">Sem contato</span>
                        )}
                      </td>
                      
                      <td className="p-4 text-xs">
                        {(pessoa.tipo === 'CLIENTE' || pessoa.tipo === 'AMBOS') && (
                          <div className="flex items-center gap-2 mb-1.5" title={pessoa.contaCliente?.descricao || 'Conta Padrão de Clientes'}>
                            <span className="font-bold text-blue-500 w-4">C:</span>
                            {pessoa.contaCliente ? (
                              <span className="bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded text-blue-300 font-mono">{pessoa.contaCliente.codigo}</span>
                            ) : (
                              <span className="text-slate-500 italic">Padrão (1.1.2)</span>
                            )}
                          </div>
                        )}
                        {(pessoa.tipo === 'FORNECEDOR' || pessoa.tipo === 'AMBOS') && (
                          <div className="flex items-center gap-2" title={pessoa.contaFornecedor?.descricao || 'Conta Padrão de Fornecedores'}>
                            <span className="font-bold text-purple-500 w-4">F:</span>
                            {pessoa.contaFornecedor ? (
                              <span className="bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded text-purple-300 font-mono">{pessoa.contaFornecedor.codigo}</span>
                            ) : (
                              <span className="text-slate-500 italic">Padrão (2.1.1)</span>
                            )}
                          </div>
                        )}
                      </td>

                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded text-[10px] font-bold border uppercase ${
                          pessoa.status === 'ATIVO' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'
                        }`}>
                          {pessoa.status}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <button className="text-cyan-500 hover:text-cyan-300 transition-colors font-bold text-sm bg-cyan-500/10 hover:bg-cyan-500/20 px-3 py-1.5 rounded border border-cyan-500/20">
                          Detalhes
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* RODAPÉ DA TABELA */}
          <div className="bg-slate-950/50 p-4 border-t border-slate-800 text-sm text-slate-400 flex justify-between items-center">
            <span>Mostrando <strong className="text-cyan-400">{pessoas.length}</strong> registro(s)</span>
            <span className="italic text-xs text-slate-500">Limitado aos 50 mais recentes</span>
          </div>
        </div>

      </div>
    </Layout>
  );
}