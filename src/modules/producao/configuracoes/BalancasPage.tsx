import { useEffect, useState } from 'react';
import { Plus, Search, Edit2, Trash2, Power, PowerOff } from 'lucide-react';
import { api } from '../../../services/api';
import { Balanca, TipoConexaoBalanca, StatusBalanca } from './../types/balanca';
import BalancaFormModal from '../configuracoes/BalancaFormModal';
import { Layout } from '../../../components/Layout';

export default function BalancasPage() {
  const [balancas, setBalancas] = useState<Balanca[]>([]);
  const [busca, setBusca] = useState<string>('');
  const [statusFiltro, setStatusFiltro] = useState<StatusBalanca | ''>('');
  const [conexaoFiltro, setConexaoFiltro] = useState<TipoConexaoBalanca | ''>('');
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [balancaEditando, setBalancaEditando] = useState<Balanca | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const [buscaDebounce, setBuscaDebounce] = useState<string>('');

  useEffect(() => {
    const timeout = setTimeout(() => {
      setBuscaDebounce(busca);
    }, 400);

    return () => clearTimeout(timeout);
  }, [busca]);

  // =========================
  // CARREGAR
  // =========================
  const carregarBalancas = async (): Promise<void> => {
    try {
      setLoading(true);
      const params = new URLSearchParams();

      if (buscaDebounce) params.append('busca', buscaDebounce);
      if (statusFiltro) params.append('status', statusFiltro);
      if (conexaoFiltro) params.append('tipoConexao', conexaoFiltro);

      const response = await api.get(`/api/balancas?${params.toString()}`);

      const data = response.data;
      if (Array.isArray(data)) {
        setBalancas(data as Balanca[]);
      } else {
        setBalancas([]);
      }
    } catch (error: unknown) {
      console.error('Erro ao carregar balanças', error);
      alert('Erro ao carregar balanças.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarBalancas();
  }, [buscaDebounce, statusFiltro, conexaoFiltro]);

  // =========================
  // AÇÕES
  // =========================
  const handleExcluir = async (id: string): Promise<void> => {
    if (!window.confirm('Tem certeza que deseja excluir esta balança?')) return;

    try {
      await api.delete(`/api/balancas/${id}`);
      carregarBalancas();
    } catch (error: unknown) {
      console.error(error);
      alert('Erro ao excluir balança.');
    }
  };

  const handleToggleStatus = async (id: string, ativoAtual: boolean): Promise<void> => {
    try {
      await api.patch(`/api/balancas/${id}/status`, { ativo: !ativoAtual });
      carregarBalancas();
    } catch (error: unknown) {
      console.error(error);
      alert('Erro ao alterar status.');
    }
  };

  const abrirModalNovo = (): void => {
    setBalancaEditando(null);
    setModalOpen(true);
  };

  const abrirModalEditar = (balanca: Balanca): void => {
    setBalancaEditando(balanca);
    setModalOpen(true);
  };

  return (
    <Layout>
      <div className="p-6 min-h-screen bg-[#08101f] text-gray-100">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-fuchsia-400 to-violet-400 bg-clip-text text-transparent">
              Cadastro de Balanças
            </h1>
            <p className="text-gray-400 mt-1">
              Gerencie os equipamentos de pesagem da loja.
            </p>
          </div>
          <button
            onClick={abrirModalNovo}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white rounded-xl font-bold hover:scale-[1.02] transition-all shadow-[0_0_15px_rgba(139,92,246,0.30)]"
          >
            <Plus size={20} />
            Nova Balança
          </button>
        </div>

        {/* FILTROS */}
        <div className="bg-[#0b1324]/70 p-4 rounded-2xl border border-white/10 mb-6 flex flex-wrap gap-4 shadow-lg">
          <div className="flex-1 min-w-[250px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome, modelo, série..."
              className="w-full bg-[#131c31] border border-gray-700 rounded-xl pl-10 pr-4 py-2.5 text-white focus:ring-2 focus:ring-violet-500 outline-none transition-all"
            />
          </div>
          <select
            value={statusFiltro}
            onChange={(e) => setStatusFiltro(e.target.value as StatusBalanca | '')}
            className="bg-[#131c31] border border-gray-700 rounded-xl px-4 py-2.5 text-white outline-none focus:ring-2 focus:ring-violet-500 transition-all cursor-pointer"
          >
            <option value="">Todos os Status</option>
            <option value="ativo">Ativas</option>
            <option value="inativo">Inativas</option>
          </select>
          <select
            value={conexaoFiltro}
            onChange={(e) => setConexaoFiltro(e.target.value as TipoConexaoBalanca | '')}
            className="bg-[#131c31] border border-gray-700 rounded-xl px-4 py-2.5 text-white outline-none focus:ring-2 focus:ring-violet-500 transition-all cursor-pointer"
          >
            <option value="">Todas as Conexões</option>
            <option value="SERIAL">Serial</option>
            <option value="USB">USB</option>
            <option value="TCP_IP">TCP/IP</option>
            <option value="HID">Emulador (HID)</option>
            <option value="TECLADO">Teclado Manual</option>
          </select>
        </div>

        {/* TABELA */}
        <div className="bg-[#0b1324]/70 rounded-2xl border border-white/10 overflow-hidden shadow-lg overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-[#131c31]/80 text-gray-400 text-xs uppercase tracking-wider border-b border-white/5">
                <th className="p-4 font-medium">Nome da Balança</th>
                <th className="p-4 font-medium">Conexão</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={4} className="p-12 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-400">
                      <svg className="animate-spin h-8 w-8 text-violet-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Carregando balanças...
                    </div>
                  </td>
                </tr>
              ) : balancas.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-12 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-500">
                      <Search size={40} className="mb-4 opacity-20" />
                      <p className="text-lg font-medium text-gray-400">Nenhuma balança encontrada.</p>
                      <p className="text-sm mt-1">Tente ajustar os filtros ou cadastre um novo equipamento.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                balancas.map((balanca) => (
                  <tr key={balanca.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="p-4">
                      <div className="font-bold text-white">{balanca.nome}</div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {balanca.modelo || balanca.fabricante || 'Sem modelo definido'}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="px-2.5 py-1 bg-[#131c31] border border-gray-700 rounded-md text-xs font-medium text-gray-300">
                        {balanca.tipoConexao}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
                        balanca.ativo 
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                          : 'bg-gray-500/10 text-gray-400 border-gray-500/20'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${balanca.ativo ? 'bg-emerald-400' : 'bg-gray-400'}`}></span>
                        {balanca.ativo ? 'Ativa' : 'Inativa'}
                      </span>
                    </td>
                    <td className="p-4 align-middle">
                      <div className="flex justify-end gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleToggleStatus(balanca.id, balanca.ativo)}
                          title={balanca.ativo ? "Desativar balança" : "Ativar balança"}
                          className={`p-2 rounded-lg transition-all ${
                            balanca.ativo 
                              ? 'text-amber-400 hover:bg-amber-400/10 hover:text-amber-300' 
                              : 'text-emerald-400 hover:bg-emerald-400/10 hover:text-emerald-300'
                          }`}
                        >
                          {balanca.ativo ? <PowerOff size={18} /> : <Power size={18} />}
                        </button>
                        <button 
                          onClick={() => abrirModalEditar(balanca)}
                          title="Editar"
                          className="p-2 text-violet-400 hover:bg-violet-400/10 hover:text-violet-300 rounded-lg transition-all"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button 
                          onClick={() => handleExcluir(balanca.id)}
                          title="Excluir"
                          className="p-2 text-red-400 hover:bg-red-400/10 hover:text-red-300 rounded-lg transition-all"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* MODAL */}
        {modalOpen && (
          <BalancaFormModal
            balanca={balancaEditando}
            onClose={() => setModalOpen(false)}
            onSuccess={() => {
              setModalOpen(false);
              carregarBalancas();
            }}
          />
        )}
      </div>
    </Layout>
  );
}