// src/pages/configuracoes/components/layout-etiquetas/LayoutEtiquetaFormModal.tsx
import { api } from '../../../services/api';
import React, { useState, useEffect } from 'react';
import { LayoutEtiquetaJson, DEFAULT_LAYOUT_JSON } from '../types/etiquetas'; // Ajuste o caminho conforme necessário

export type TipoEtiquetaLayout =
  | 'PRODUTO'
  | 'PESAGEM'
  | 'PRODUCAO'
  | 'RASTREABILIDADE'
  | 'EXPEDICAO'
  | 'CAIXA'
  | 'GENERICA';

export type TipoAplicacaoEtiqueta = 'INTERNA' | 'ROTULO' | 'TESTEIRA';

export interface LayoutEtiqueta {
  id?: string;
  nome: string;
  descricao?: string | null;
  tipoEtiqueta: TipoEtiquetaLayout;
  tipoAplicacao: TipoAplicacaoEtiqueta;
  ativo?: boolean;
  larguraMm?: number | null;
  alturaMm?: number | null;
  larguraPx?: number | null;
  alturaPx?: number | null;
  densidade?: number | null;
  velocidade?: number | null;
  layoutJson?: LayoutEtiquetaJson; // BLINDAGEM: Tipagem forte em vez de unknown
  templateZpl?: string | null;
  observacao?: string | null;
}

interface Props {
  layout: LayoutEtiqueta | null;
  onClose: () => void;
  onSuccess: () => void | Promise<void>;
  // Se você tiver um hook ou instância do axios/fetch configurada, passe aqui ou importe direto
  // api: any; 
}

const LayoutEtiquetaFormModal: React.FC<Props> = ({
  layout,
  onClose,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estado local do formulário
  const [formData, setFormData] = useState<Partial<LayoutEtiqueta>>({
    nome: '',
    descricao: '',
    tipoEtiqueta: 'PRODUTO',
    tipoAplicacao: 'ROTULO',
    ativo: true,
    larguraMm: null,
    alturaMm: null,
    larguraPx: null,
    alturaPx: null,
    densidade: null,
    velocidade: null,
    observacao: '',
    layoutJson: DEFAULT_LAYOUT_JSON, // Inicializa com o canvas padrão na criação
  });

  // Preenche o formulário se for edição
  useEffect(() => {
    if (layout) {
      setFormData({
        ...layout,
        tipoAplicacao: layout.tipoAplicacao ?? 'ROTULO',
        // Garante que nulls virem strings vazias para os inputs controlados
        descricao: layout.descricao || '',
        observacao: layout.observacao || '',
      });
    }
  }, [layout]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else if (type === 'number') {
      setFormData((prev) => ({ 
        ...prev, 
        [name]: value === '' ? null : Number(value) 
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validação básica
    if (!formData.nome?.trim()) {
      setError('O nome do layout é obrigatório.');
      return;
    }

    if (!formData.tipoEtiqueta) {
      setError('A categoria do layout é obrigatória.');
      return;
    }

    if (!formData.tipoAplicacao) {
      setError('O tipo do layout é obrigatório.');
      return;
    }

    setLoading(true);

    try {
      const isEditing = !!layout?.id;

      const payload = {
        ...formData,
        nome: String(formData.nome ?? '')
          .trim()
          .toUpperCase(),
      };
      
      // ✅ CORREÇÃO: Adicionado o /api nas rotas e mantendo a instância 'api'
      if (isEditing) {
        await api.put(`/api/layout-etiquetas/${layout.id}`, payload);
      } else {
        await api.post(`/api/layout-etiquetas`, payload);
      }

      await onSuccess();
      onClose();
    } catch (err: unknown) {
      // ✅ BLINDAGEM: Zero 'any' na captura de erros do Axios
      let mensagemErro = 'Erro de conexão com o servidor.';
      
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as { response?: { data?: { error?: string } } };
        if (axiosError.response?.data?.error) {
          mensagemErro = axiosError.response.data.error;
        }
      } else if (err instanceof Error) {
        mensagemErro = err.message;
      }
      
      setError(mensagemErro);
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full bg-[#131b2f] border border-gray-700 rounded px-3 py-2 text-sm outline-none focus:border-purple-500 text-white transition-colors";
  const labelClass = "block text-xs font-medium text-gray-400 mb-1 uppercase tracking-wider";

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-[#0b1324] rounded-xl w-full max-w-3xl border border-gray-800 shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* HEADER */}
        <div className="p-5 border-b border-gray-800 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="w-2 h-6 bg-purple-500 rounded-full"></span>
            {layout ? 'Editar Configurações do Layout' : 'Novo Layout de Etiqueta'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* BODY COM SCROLL */}
        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
          {error && (
            <div className="mb-6 p-3 bg-red-500/10 border border-red-500/50 rounded text-red-400 text-sm flex items-center gap-2">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}

          <form id="layout-form" onSubmit={handleSubmit} className="space-y-6">
            
            {/* LINHA 1: Nome */}
            <div>
              <label className={labelClass}>Nome do Layout *</label>
              <input
                type="text"
                name="nome"
                value={formData.nome || ''}
                onChange={handleChange}
                className={inputClass}
                placeholder="Ex: Etiqueta Gôndola Padrão"
                required
              />
            </div>

            {/* LINHA 2: Tipo (físico) e Categoria operacional */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className={labelClass}>Tipo *</label>
                <select
                  name="tipoAplicacao"
                  value={formData.tipoAplicacao ?? 'ROTULO'}
                  onChange={handleChange}
                  className={inputClass}
                  required
                >
                  <option value="INTERNA">INTERNA</option>
                  <option value="ROTULO">RÓTULO</option>
                  <option value="TESTEIRA">TESTEIRA</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Categoria *</label>
                <select
                  name="tipoEtiqueta"
                  value={formData.tipoEtiqueta}
                  onChange={handleChange}
                  className={inputClass}
                  required
                >
                  <option value="PRODUTO">Produto (Gôndola)</option>
                  <option value="PESAGEM">Pesagem (Balança)</option>
                  <option value="PRODUCAO">Produção / Lote</option>
                  <option value="RASTREABILIDADE">Rastreabilidade</option>
                  <option value="EXPEDICAO">Expedição / Correios</option>
                  <option value="CAIXA">Caixa (Fechamento)</option>
                  <option value="GENERICA">Genérica</option>
                </select>
              </div>
            </div>

            {/* LINHA 2: Descrição */}
            <div>
              <label className={labelClass}>Descrição Interna</label>
              <input
                type="text"
                name="descricao"
                value={formData.descricao || ''}
                onChange={handleChange}
                className={inputClass}
                placeholder="Ex: Usado na impressora Zebra da padaria"
              />
            </div>

            {/* SEÇÃO: Dimensões */}
            <div className="bg-[#131b2f]/50 p-4 rounded-lg border border-gray-800">
              <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
                <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
                Dimensões Físicas e Virtuais
              </h3>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className={labelClass}>Largura (mm)</label>
                  <input type="number" name="larguraMm" value={formData.larguraMm || ''} onChange={handleChange} className={inputClass} placeholder="Ex: 100" />
                </div>
                <div>
                  <label className={labelClass}>Altura (mm)</label>
                  <input type="number" name="alturaMm" value={formData.alturaMm || ''} onChange={handleChange} className={inputClass} placeholder="Ex: 50" />
                </div>
                <div>
                  <label className={labelClass}>Largura (px)</label>
                  <input type="number" name="larguraPx" value={formData.larguraPx || ''} onChange={handleChange} className={inputClass} placeholder="Ex: 800" />
                </div>
                <div>
                  <label className={labelClass}>Altura (px)</label>
                  <input type="number" name="alturaPx" value={formData.alturaPx || ''} onChange={handleChange} className={inputClass} placeholder="Ex: 400" />
                </div>
              </div>
            </div>

            {/* SEÇÃO: Configurações de Hardware */}
            <div className="bg-[#131b2f]/50 p-4 rounded-lg border border-gray-800">
              <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
                <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Configurações da Impressora
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Densidade (Contraste/Temperatura)</label>
                  <input type="number" name="densidade" value={formData.densidade || ''} onChange={handleChange} className={inputClass} placeholder="Ex: 15 (0 a 30)" />
                </div>
                <div>
                  <label className={labelClass}>Velocidade (Polegadas/seg)</label>
                  <input type="number" name="velocidade" value={formData.velocidade || ''} onChange={handleChange} className={inputClass} placeholder="Ex: 4" />
                </div>
              </div>
            </div>

            {/* LINHA 3: Observações */}
            <div>
              <label className={labelClass}>Observações Técnicas</label>
              <textarea
                name="observacao"
                value={formData.observacao || ''}
                onChange={handleChange}
                className={`${inputClass} min-h-[80px] resize-y`}
                placeholder="Anotações sobre este layout..."
              />
            </div>

            {/* STATUS */}
            <div className="flex items-center gap-3 p-4 bg-[#131b2f]/30 rounded-lg border border-gray-800">
              <div className="relative flex items-center">
                <input
                  type="checkbox"
                  id="ativo"
                  name="ativo"
                  checked={formData.ativo}
                  onChange={handleChange}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-500"></div>
              </div>
              <label htmlFor="ativo" className="text-sm font-medium text-gray-300 cursor-pointer">
                Layout Ativo (Disponível para impressão)
              </label>
            </div>

          </form>
        </div>

        {/* FOOTER */}
        <div className="p-5 border-t border-gray-800 flex justify-end gap-3 bg-[#0b1324] rounded-b-xl">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-5 py-2.5 text-sm font-medium text-gray-300 bg-transparent border border-gray-600 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>

          <button
            type="submit"
            form="layout-form"
            disabled={loading}
            className="px-5 py-2.5 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-500 transition-colors disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-purple-900/20"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Salvando...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {layout ? 'Salvar Alterações' : 'Criar Layout'}
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};

export default LayoutEtiquetaFormModal;