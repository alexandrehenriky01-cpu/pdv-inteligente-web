// src/pages/configuracoes/EstacoesTrabalhoPage.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Plus, Search, Edit2, Trash2, MonitorSmartphone, 
  Activity, AlertTriangle, Loader2, Scale, Printer, 
  Truck, Settings, Factory, PowerOff // ✅ CORREÇÃO: PowerOff adicionado aqui!
} from 'lucide-react';
import { Layout } from '../../../components/Layout';
import { api } from '../../../services/api';
import EstacaoTrabalhoFormModal from './EstacaoTrabalhoFormModal';
// ✅ CORREÇÃO: Caminho do types ajustado com "../" (volta uma pasta)
import { EstacaoTrabalho, ModoOperacaoEstacao } from '../types/estacaoTrabalho';

const getModoIcon = (modo: string) => {
  switch (modo) {
    case 'PESAGEM': return <Scale size={16} className="text-emerald-400" />;
    case 'IMPRESSAO': return <Printer size={16} className="text-blue-400" />;
    case 'EXPEDICAO': return <Truck size={16} className="text-orange-400" />;
    case 'ADMINISTRATIVO': return <Settings size={16} className="text-gray-400" />;
    default: return <Factory size={16} className="text-violet-400" />;
  }
};

const EstacoesTrabalhoPage: React.FC = () => {
  const [estacoes, setEstacoes] = useState<EstacaoTrabalho[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [toast, setToast] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [filters, setFilters] = useState({ search: '' });
  const [debouncedFilters, setDebouncedFilters] = useState(filters);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEstacao, setEditingEstacao] = useState<EstacaoTrabalho | null>(null);

  // Helper seguro para extrair erros (ZERO any)
  const getErrorMessage = (err: unknown): string => {
    if (err && typeof err === 'object' && 'response' in err) {
      const axiosError = err as { response?: { data?: { message?: string, error?: string } } };
      return axiosError.response?.data?.message || axiosError.response?.data?.error || 'Erro inesperado na operação.';
    }
    return err instanceof Error ? err.message : 'Erro inesperado.';
  };

  // =========================
  // TOAST AUTO CLOSE
  // =========================
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  // =========================
  // DEBOUNCE
  // =========================
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedFilters(filters);
    }, 400);
    return () => clearTimeout(timer);
  }, [filters]);

  // =========================
  // FETCH
  // =========================
  const fetchEstacoes = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Ajuste a rota conforme o seu backend
      const response = await api.get('/api/producao/configuracoes/estacoes-trabalho', {
        params: debouncedFilters,
      });

      setEstacoes(response.data.data || response.data || []);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [debouncedFilters]);

  useEffect(() => {
    fetchEstacoes();
  }, [fetchEstacoes]);

  // =========================
  // MÉTRICAS
  // =========================
  const total = estacoes.length;
  const ativos = estacoes.filter(e => e.ativo).length;
  const inativos = total - ativos;

  // =========================
  // HANDLERS
  // =========================
  const handleCreate = () => {
    setEditingEstacao(null);
    setIsModalOpen(true);
  };

  const handleEdit = (estacao: EstacaoTrabalho) => {
    setEditingEstacao(estacao);
    setIsModalOpen(true);
  };

  const handleDelete = async () => {
    if (!confirmDeleteId) return;
    setIsDeleting(true);

    try {
      await api.delete(`/api/producao/configuracoes/estacoes-trabalho/${confirmDeleteId}`);
      setToast('Estação excluída com sucesso!');
      setConfirmDeleteId(null);
      fetchEstacoes();
    } catch (err: unknown) {
      alert(getErrorMessage(err)); // Usando alert simples para erros de deleção, ou você pode usar um Toast de erro
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-[#08101f] text-white p-6 font-sans">
        <div className="max-w-7xl mx-auto space-y-6">

          {/* TOAST DE SUCESSO */}
          {toast && (
            <div className="fixed top-6 right-6 bg-[#0b1324] border border-emerald-500/30 text-emerald-400 px-6 py-4 rounded-2xl shadow-[0_10px_40px_rgba(16,185,129,0.2)] z-50 font-medium flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
              {toast}
            </div>
          )}

          {/* HEADER */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[radial-gradient(circle_at_top_left,_rgba(139,92,246,0.15),_transparent_30%),linear-gradient(135deg,_#0b1020_0%,_#08101f_100%)] p-8 rounded-[28px] border border-white/10 shadow-2xl">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-violet-300">
                <MonitorSmartphone size={14} /> Infraestrutura
              </div>
              <h1 className="text-3xl md:text-4xl font-black bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                Estações de Trabalho
              </h1>
              <p className="text-gray-400 text-sm mt-2 max-w-xl">
                Gerencie os terminais operacionais, PDVs físicos, balanças e pontos de impressão da sua loja.
              </p>
            </div>

            <button
              onClick={handleCreate}
              className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-bold px-6 py-3 rounded-xl shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:scale-[1.02] transition-all whitespace-nowrap"
            >
              <Plus size={20} />
              Nova Estação
            </button>
          </div>

          {/* MÉTRICAS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-[#0b1324] p-6 rounded-2xl border border-white/10 shadow-lg flex items-center gap-4">
              <div className="p-4 bg-blue-500/10 rounded-xl text-blue-400">
                <MonitorSmartphone size={24} />
              </div>
              <div>
                <div className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Total de Estações</div>
                <div className="text-3xl font-black text-white">{total}</div>
              </div>
            </div>

            <div className="bg-[#0b1324] p-6 rounded-2xl border border-emerald-500/20 shadow-lg flex items-center gap-4 relative overflow-hidden">
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl"></div>
              <div className="p-4 bg-emerald-500/10 rounded-xl text-emerald-400">
                <Activity size={24} />
              </div>
              <div>
                <div className="text-emerald-400/80 text-xs font-bold uppercase tracking-wider mb-1">Operando (Ativas)</div>
                <div className="text-3xl font-black text-emerald-400">{ativos}</div>
              </div>
            </div>

            <div className="bg-[#0b1324] p-6 rounded-2xl border border-red-500/20 shadow-lg flex items-center gap-4">
              <div className="p-4 bg-red-500/10 rounded-xl text-red-400">
                <PowerOff size={24} />
              </div>
              <div>
                <div className="text-red-400/80 text-xs font-bold uppercase tracking-wider mb-1">Paradas (Inativas)</div>
                <div className="text-3xl font-black text-red-400">{inativos}</div>
              </div>
            </div>
          </div>

          {/* BARRA DE BUSCA */}
          <div className="bg-[#0b1324] p-4 rounded-2xl border border-white/10 shadow-lg">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
              <input
                placeholder="Buscar estação pelo nome ou identificador..."
                value={filters.search}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFilters({ search: e.target.value })}
                className="w-full bg-[#131b2f] border border-gray-700 text-white pl-12 pr-4 py-3 rounded-xl focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none transition-all"
              />
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 flex items-center gap-3">
              <AlertTriangle size={20} />
              {error}
            </div>
          )}

          {/* LISTAGEM (CARDS) */}
          <div className="space-y-3">
            {loading ? (
              <div className="p-16 text-center text-gray-400 flex flex-col items-center gap-4 bg-[#0b1324] rounded-2xl border border-white/10">
                <Loader2 className="animate-spin text-violet-500" size={32} />
                <span className="font-medium">Carregando infraestrutura...</span>
              </div>
            ) : estacoes.length === 0 ? (
              <div className="p-16 text-center text-gray-400 bg-[#0b1324] rounded-2xl border border-white/10">
                <MonitorSmartphone size={48} className="mx-auto mb-4 text-gray-600 opacity-50" />
                <div className="text-xl font-bold mb-2 text-gray-300">Nenhuma estação encontrada</div>
                <div className="text-sm max-w-md mx-auto">
                  Cadastre os computadores, caixas e balanças da sua loja para iniciar a operação do PDV.
                </div>
              </div>
            ) : (
              estacoes.map((row) => (
                <div
                  key={row.id}
                  className="bg-[#0b1324] p-5 rounded-2xl border border-white/10 hover:border-violet-500/30 transition-all group flex flex-col lg:flex-row justify-between lg:items-center gap-6 shadow-lg"
                >
                  {/* Info Principal */}
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-[#131b2f] rounded-xl border border-gray-800 text-gray-400 group-hover:text-violet-400 group-hover:border-violet-500/30 transition-colors">
                      <MonitorSmartphone size={24} />
                    </div>
                    
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-bold text-lg text-white">{row.nome}</h3>
                        <span className={`text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full border ${
                          row.ativo
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-red-500/10 text-red-400 border-red-500/20'
                        }`}>
                          {row.ativo ? 'Operando' : 'Parada'}
                        </span>
                      </div>
                      
                      <div className="text-sm text-gray-400 flex items-center gap-2">
                        <span className="font-mono bg-white/5 px-2 py-0.5 rounded text-xs">{row.identificadorMaquina}</span>
                        {row.descricao && <span>• {row.descricao}</span>}
                      </div>

                      {/* Tags de Integração */}
                      <div className="flex flex-wrap gap-2 mt-3">
                        <div className="flex items-center gap-1.5 bg-[#131b2f] border border-gray-800 px-2.5 py-1 rounded-lg text-xs font-medium text-gray-300">
                          {getModoIcon(row.modoOperacao)}
                          {row.modoOperacao}
                        </div>

                        {row.balanca && (
                          <div className="flex items-center gap-1.5 bg-emerald-500/5 border border-emerald-500/10 px-2.5 py-1 rounded-lg text-xs font-medium text-emerald-300">
                            <Scale size={14} />
                            {row.balanca.nome}
                          </div>
                        )}

                        {row.layoutPesagem && (
                          <div className="flex items-center gap-1.5 bg-fuchsia-500/5 border border-fuchsia-500/10 px-2.5 py-1 rounded-lg text-xs font-medium text-fuchsia-300">
                            <Printer size={14} />
                            Pesagem: {row.layoutPesagem.nome}
                          </div>
                        )}
                        {row.layoutInterna && (
                          <div className="flex items-center gap-1.5 bg-violet-500/5 border border-violet-500/10 px-2.5 py-1 rounded-lg text-xs font-medium text-violet-300">
                            <Printer size={14} />
                            Interna: {row.layoutInterna.nome}
                          </div>
                        )}
                        {row.layoutRecebimento && (
                          <div className="flex items-center gap-1.5 bg-amber-500/5 border border-amber-500/10 px-2.5 py-1 rounded-lg text-xs font-medium text-amber-200">
                            <Printer size={14} />
                            Receb.: {row.layoutRecebimento.nome}
                          </div>
                        )}
                        {row.layoutExpedicao && (
                          <div className="flex items-center gap-1.5 bg-orange-500/5 border border-orange-500/10 px-2.5 py-1 rounded-lg text-xs font-medium text-orange-200">
                            <Printer size={14} />
                            Exped.: {row.layoutExpedicao.nome}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="flex items-center gap-2 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => handleEdit(row)}
                      className="flex items-center gap-2 px-4 py-2.5 bg-[#131b2f] hover:bg-violet-500/10 hover:text-violet-300 text-gray-300 border border-gray-800 hover:border-violet-500/30 rounded-xl text-sm font-medium transition-all"
                    >
                      <Edit2 size={16} /> Editar
                    </button>

                    <button
                      onClick={() => setConfirmDeleteId(row.id)}
                      className="flex items-center gap-2 p-2.5 bg-red-500/5 hover:bg-red-500/20 text-red-400 border border-red-500/10 hover:border-red-500/30 rounded-xl transition-all"
                      title="Excluir Estação"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

        </div>

        {/* MODAIS */}
        {isModalOpen && (
          <EstacaoTrabalhoFormModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            estacao={editingEstacao}
            onSave={() => {
              setIsModalOpen(false);
              fetchEstacoes();
              setToast(editingEstacao ? 'Estação atualizada com sucesso!' : 'Estação criada com sucesso!');
            }}
          />
        )}

        {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO */}
        {confirmDeleteId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-md rounded-2xl border border-red-500/20 bg-[#0b1324] p-6 shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="flex items-center gap-4 mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 shrink-0">
                  <AlertTriangle className="h-6 w-6 text-red-500" />
                </div>
                <h3 className="text-xl font-bold text-white">Excluir Estação?</h3>
              </div>
              <p className="text-gray-400 mb-6 text-sm">
                Esta ação removerá a estação de trabalho do sistema. As impressões pendentes para esta máquina perderão o vínculo. Deseja continuar?
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setConfirmDeleteId(null)}
                  disabled={isDeleting}
                  className="rounded-xl border border-gray-700 px-5 py-2.5 text-sm font-medium text-gray-300 hover:bg-gray-800 transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-red-500 transition-colors shadow-lg shadow-red-900/20 disabled:opacity-50"
                >
                  {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                  {isDeleting ? 'Excluindo...' : 'Sim, excluir'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </Layout>
  );
};

export default EstacoesTrabalhoPage;