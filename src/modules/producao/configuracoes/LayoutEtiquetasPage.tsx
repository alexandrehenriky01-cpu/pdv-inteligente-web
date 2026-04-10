// src/pages/configuracoes/LayoutEtiquetasPage.tsx

import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom'; // ✅ NOVO: Para navegar até o Canvas
import { 
  Plus, Search, Edit2, Trash2, Power, PowerOff, Eye, X, AlertTriangle, Loader2, Palette 
} from 'lucide-react'; // ✅ NOVO: Ícone Palette para o botão de Design
import { api } from '../../../services/api';
import LayoutEtiquetaFormModal from './LayoutEtiquetaFormModal'; // Ajustei o caminho relativo
import { LayoutEtiquetaJson } from '../types/etiquetas';

type TipoEtiquetaLayout =
  | 'PRODUTO'
  | 'PESAGEM'
  | 'PRODUCAO'
  | 'RASTREABILIDADE'
  | 'EXPEDICAO'
  | 'CAIXA'
  | 'GENERICA';

interface LayoutEtiqueta {
  id: string;
  nome: string;
  descricao?: string | null;
  tipoEtiqueta: TipoEtiquetaLayout;
  ativo: boolean;
  larguraMm?: number | null;
  alturaMm?: number | null;
  larguraPx?: number | null;
  alturaPx?: number | null;
  densidade?: number | null;
  velocidade?: number | null;
  layoutJson?: LayoutEtiquetaJson;
  templateZpl?: string | null;
  observacao?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

const LayoutEtiquetasPage: React.FC = () => {
  const navigate = useNavigate(); // ✅ Hook de navegação
  const [layouts, setLayouts] = useState<LayoutEtiqueta[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  
  // Estados de Modais
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [layoutEditando, setLayoutEditando] = useState<LayoutEtiqueta | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<LayoutEtiquetaJson | null>(null);

  const [processingId, setProcessingId] = useState<string | null>(null);

  const [busca, setBusca] = useState('');
  const [buscaDebounce, setBuscaDebounce] = useState('');
  const [statusFiltro, setStatusFiltro] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState('');

  // Helper seguro para extrair erro de requisições sem usar 'any'
  const getErrorMessage = (error: unknown): string => {
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as { response?: { data?: { error?: string } } };
      if (axiosError.response?.data?.error) return axiosError.response.data.error;
    }
    return error instanceof Error ? error.message : 'Erro inesperado na operação.';
  };

  useEffect(() => {
    const timer = setTimeout(() => setBuscaDebounce(busca), 400);
    return () => clearTimeout(timer);
  }, [busca]);

  const carregarLayouts = async () => {
    try {
      setLoading(true);
      setErro('');

      const params = new URLSearchParams();
      if (buscaDebounce) params.append('busca', buscaDebounce);
      if (statusFiltro) params.append('status', statusFiltro);
      if (tipoFiltro) params.append('tipoEtiqueta', tipoFiltro);

      // ✅ CORREÇÃO: Adicionado o /api antes de /layout-etiquetas
      const response = await api.get(`/api/layout-etiquetas?${params.toString()}`);
      setLayouts(response.data);
    } catch (error: unknown) {
      console.error('Erro ao carregar layouts', error);
      setErro(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarLayouts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buscaDebounce, statusFiltro, tipoFiltro]);

  const handleNovo = () => {
    setLayoutEditando(null);
    setIsModalOpen(true);
  };

  const handleEditarMetadata = (layout: LayoutEtiqueta) => {
    setLayoutEditando(layout);
    setIsModalOpen(true);
  };

  const handleAbrirEditorVisual = (id: string) => {
    // ✅ Navega para a página do Canvas que construímos
    navigate(`/configuracoes/etiquetas/${id}/editor`);
  };

  const confirmarExclusao = async () => {
    if (!deleteConfirmId) return;
    setProcessingId(deleteConfirmId);
    
    try {
      await api.delete(`/api/layout-etiquetas/${deleteConfirmId}`);
      await carregarLayouts();
      setDeleteConfirmId(null);
    } catch (error: unknown) {
      console.error(error);
      alert(getErrorMessage(error));
    } finally {
      setProcessingId(null);
    }
  };

  const handleToggleStatus = async (id: string, ativoAtual: boolean) => {
    setProcessingId(id);
    try {
      await api.patch(`/api/layout-etiquetas/${id}/status`, {
        ativo: !ativoAtual,
      });
      await carregarLayouts();
    } catch (error: unknown) {
      console.error(error);
      alert(getErrorMessage(error));
    } finally {
      setProcessingId(null);
    }
  };

  const handlePreview = async (layout: LayoutEtiqueta) => {
    setProcessingId(layout.id);
    try {
      const response = await api.post('/api/layout-etiquetas/preview', {
        layoutJson: layout.layoutJson,
        mockData: {
          produto: 'Picanha Bovina',
          peso: '1.250 KG',
          validade: '15/04/2026',
          lote: 'LOTE-001',
          dataProducao: '07/04/2026',
          quantidadePecas: '3',
          codigoBarras: '7891234567890',
          op: 'OP-2045',
          dataAtual: '07/04/2026',
          horaAtual: '14:32',
        },
      });
      setPreviewData(response.data);
    } catch (error: unknown) {
      console.error(error);
      alert(getErrorMessage(error));
    } finally {
      setProcessingId(null);
    }
  };

  const totalLayouts = useMemo(() => layouts.length, [layouts]);
  const totalAtivos = useMemo(() => layouts.filter((l) => l.ativo).length, [layouts]);

  return (
    <div className="min-h-screen bg-[#08101f] text-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* HEADER E CARDS DE RESUMO */}
        <div className="rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(139,92,246,0.16),_transparent_26%),linear-gradient(135deg,_#0b1020_0%,_#08101f_45%,_#0a1224_100%)] p-6 shadow-[0_25px_70px_rgba(0,0,0,0.40)] sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-fuchsia-400/20 bg-fuchsia-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-fuchsia-300">
                Editor gráfico de etiquetas
              </div>
              <h1 className="text-3xl md:text-4xl font-black bg-gradient-to-r from-purple-400 to-fuchsia-500 bg-clip-text text-transparent">
                Layouts de Etiquetas
              </h1>
              <p className="text-gray-400 text-sm mt-2">
                Gerencie os modelos de impressão para produtos, pesagem, produção e expedição.
              </p>
            </div>

            <button
              onClick={handleNovo}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-purple-600 to-fuchsia-600 px-5 py-3 font-bold text-white shadow-lg shadow-purple-500/20 transition-all hover:scale-[1.02] hover:opacity-95"
            >
              <Plus size={18} />
              Novo Layout
            </button>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-[#0b1324]/80 p-4">
              <div className="text-xs uppercase tracking-wider text-gray-500">Total de layouts</div>
              <div className="mt-1 text-2xl font-black text-white">{totalLayouts}</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-[#0b1324]/80 p-4">
              <div className="text-xs uppercase tracking-wider text-gray-500">Layouts ativos</div>
              <div className="mt-1 text-2xl font-black text-emerald-400">{totalAtivos}</div>
            </div>
          </div>
        </div>

        {/* FILTROS */}
        <div className="rounded-2xl border border-white/10 bg-[#0b1324] p-4 shadow-[0_20px_50px_rgba(0,0,0,0.30)]">
          <div className="flex flex-col gap-4 lg:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
              <input
                type="text"
                placeholder="Buscar por nome, descrição ou observação..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="w-full rounded-xl border border-gray-700 bg-[#131b2f] pl-10 pr-4 py-3 text-white outline-none transition-all focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
              />
            </div>

            <select
              value={statusFiltro}
              onChange={(e) => setStatusFiltro(e.target.value)}
              className="rounded-xl border border-gray-700 bg-[#131b2f] px-4 py-3 text-white outline-none focus:border-violet-500"
            >
              <option value="">Todos os status</option>
              <option value="ativo">Ativos</option>
              <option value="inativo">Inativos</option>
            </select>

            <select
              value={tipoFiltro}
              onChange={(e) => setTipoFiltro(e.target.value)}
              className="rounded-xl border border-gray-700 bg-[#131b2f] px-4 py-3 text-white outline-none focus:border-violet-500"
            >
              <option value="">Todos os tipos</option>
              <option value="PRODUTO">Produto</option>
              <option value="PESAGEM">Pesagem</option>
              <option value="PRODUCAO">Produção</option>
              <option value="RASTREABILIDADE">Rastreabilidade</option>
              <option value="EXPEDICAO">Expedição</option>
              <option value="CAIXA">Caixa</option>
              <option value="GENERICA">Genérica</option>
            </select>
          </div>
        </div>

        {/* TABELA */}
        <div className="rounded-2xl border border-white/10 bg-[#0b1324] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.30)]">
          {erro && (
            <div className="m-4 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
              {erro}
            </div>
          )}

          {loading ? (
            <div className="p-10 flex flex-col items-center justify-center gap-3 text-gray-400">
              <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
              Carregando layouts de etiquetas...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead className="bg-[#131b2f] text-gray-300 text-sm uppercase tracking-wider">
                  <tr>
                    <th className="p-4 text-left font-medium">Nome do Layout</th>
                    <th className="p-4 text-left font-medium">Tipo</th>
                    <th className="p-4 text-left font-medium">Dimensões</th>
                    <th className="p-4 text-center font-medium">Status</th>
                    <th className="p-4 text-right font-medium">Ações</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-800">
                  {layouts.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-gray-500">
                        Nenhum layout cadastrado. Clique em "Novo Layout" para começar.
                      </td>
                    </tr>
                  ) : (
                    layouts.map((layout) => {
                      const isProcessing = processingId === layout.id;

                      return (
                        <tr key={layout.id} className={`hover:bg-[#131b2f] transition group ${isProcessing ? 'opacity-50 pointer-events-none' : ''}`}>
                          <td className="p-4">
                            <div className="font-medium text-gray-200">{layout.nome}</div>
                            <div className="text-xs text-gray-500">
                              {layout.descricao || 'Sem descrição'}
                            </div>
                          </td>

                          <td className="p-4">
                            <span className="inline-flex rounded-lg border border-violet-500/20 bg-violet-500/10 px-2.5 py-1 text-xs font-semibold text-violet-300">
                              {layout.tipoEtiqueta}
                            </span>
                          </td>

                          <td className="p-4 text-sm text-gray-400">
                            {layout.larguraPx && layout.alturaPx
                              ? `${layout.larguraPx}px × ${layout.alturaPx}px`
                              : layout.larguraMm && layout.alturaMm
                              ? `${layout.larguraMm}mm × ${layout.alturaMm}mm`
                              : '-'}
                          </td>

                          <td className="p-4 text-center">
                            <span
                              className={`inline-flex px-2.5 py-1 rounded text-xs font-medium border ${
                                layout.ativo
                                  ? 'bg-green-500/10 text-green-400 border-green-500/20'
                                  : 'bg-red-500/10 text-red-400 border-red-500/20'
                              }`}
                            >
                              {layout.ativo ? 'Ativo' : 'Inativo'}
                            </span>
                          </td>

                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition">
                              
                              {isProcessing ? (
                                <Loader2 className="w-5 h-5 animate-spin text-purple-500 mr-4" />
                              ) : (
                                <>
                                  {/* ✅ NOVO: Botão para abrir o Editor Visual (Canvas) */}
                                  <button
                                    onClick={() => handleAbrirEditorVisual(layout.id)}
                                    className="rounded-lg p-2 text-gray-400 transition hover:bg-fuchsia-500/15 hover:text-fuchsia-300"
                                    title="Desenhar Etiqueta (Canvas)"
                                  >
                                    <Palette size={18} />
                                  </button>

                                  <button
                                    onClick={() => handlePreview(layout)}
                                    className="rounded-lg p-2 text-gray-400 transition hover:bg-cyan-500/15 hover:text-cyan-300"
                                    title="Preview JSON / Dados"
                                  >
                                    <Eye size={18} />
                                  </button>

                                  <button
                                    onClick={() => handleToggleStatus(layout.id, layout.ativo)}
                                    className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-700 hover:text-white"
                                    title={layout.ativo ? 'Desativar' : 'Ativar'}
                                  >
                                    {layout.ativo ? <PowerOff size={18} /> : <Power size={18} />}
                                  </button>

                                  <button
                                    onClick={() => handleEditarMetadata(layout)}
                                    className="rounded-lg p-2 text-gray-400 transition hover:bg-violet-500/15 hover:text-violet-300"
                                    title="Editar Configurações"
                                  >
                                    <Edit2 size={18} />
                                  </button>

                                  <button
                                    onClick={() => setDeleteConfirmId(layout.id)}
                                    className="rounded-lg p-2 text-gray-400 transition hover:bg-red-500/15 hover:text-red-300"
                                    title="Excluir"
                                  >
                                    <Trash2 size={18} />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* MODAL DE FORMULÁRIO (Criação/Edição de Metadados) */}
      {isModalOpen && (
        <LayoutEtiquetaFormModal
          layout={layoutEditando}
          onClose={() => {
            setIsModalOpen(false);
            setLayoutEditando(null);
          }}
          onSuccess={() => {
            setIsModalOpen(false);
            setLayoutEditando(null);
            carregarLayouts();
          }}
        />
      )}

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-red-500/20 bg-[#0b1324] p-6 shadow-2xl">
            <div className="flex items-center gap-4 mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
                <AlertTriangle className="h-6 w-6 text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-white">Excluir Layout?</h3>
            </div>
            <p className="text-gray-400 mb-6">
              Esta ação é irreversível. O layout será removido permanentemente e não poderá mais ser usado para impressões.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="rounded-lg border border-gray-700 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-800 transition"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarExclusao}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 transition shadow-lg shadow-red-900/20"
              >
                Sim, excluir layout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE PREVIEW */}
      {previewData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-3xl rounded-2xl border border-gray-700 bg-[#0b1324] flex flex-col max-h-[90vh] shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-800 p-5">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Eye className="text-cyan-400" size={20} />
                Preview do Layout (Dados Renderizados)
              </h3>
              <button onClick={() => setPreviewData(null)} className="text-gray-400 hover:text-white transition">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto custom-scrollbar">
              <p className="text-gray-400 text-sm mb-4">
                Este é o objeto JSON retornado pelo servidor após substituir os placeholders (como <code className="text-purple-400">{"{{produto}}"}</code>) pelos dados de teste.
              </p>
              <div className="bg-[#131b2f] p-4 rounded-xl border border-gray-800 overflow-x-auto">
                <pre className="text-xs text-cyan-300 font-mono">
                  {JSON.stringify(previewData, null, 2)}
                </pre>
              </div>
            </div>

            <div className="border-t border-gray-800 p-5 flex justify-end bg-[#08101f] rounded-b-2xl">
              <button
                onClick={() => setPreviewData(null)}
                className="rounded-lg bg-gray-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-600 transition"
              >
                Fechar Preview
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default LayoutEtiquetasPage;