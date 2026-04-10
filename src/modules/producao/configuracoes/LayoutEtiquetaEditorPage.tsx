import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Wand2, Save, ArrowLeft, Loader2, MousePointer2, Trash2
} from 'lucide-react';
import { api } from '../../../services/api';

import EtiquetaToolbox from './EtiquetaToolbox';
import EtiquetaCanvasEditor from './EtiquetaCanvasEditor';
import EtiquetaPropertiesPanel from './EtiquetaPropertiesPanel';
import PlaceholdersPanel from './PlaceholdersPanel';
import { LayoutEtiquetaJson, LayoutElemento, EtiquetaElementType, DEFAULT_LAYOUT_JSON } from '../types/etiquetas';

// 1. BLINDAGEM: Interface forte para os metadados (removendo o "any")
interface LayoutEtiqueta {
  id: string;
  nome: string;
  descricao?: string;
  tipoEtiqueta: string;
  larguraMm?: number;
  alturaMm?: number;
  larguraPx?: number;
  alturaPx?: number;
  layoutJson?: LayoutEtiquetaJson;
}

export default function LayoutEtiquetaEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estados Globais do Editor
  const [layoutJson, setLayoutJson] = useState<LayoutEtiquetaJson>(DEFAULT_LAYOUT_JSON);
  const [layoutMetadata, setLayoutMetadata] = useState<LayoutEtiqueta | null>(null);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  
  // 4. BLINDAGEM: Controle de alterações não salvas
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Estados de UI
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  // CARREGAR DADOS DO BANCO
  useEffect(() => {
    const fetchLayout = async () => {
      try {
        setIsLoading(true);
        const response = await api.get(`/api/layout-etiquetas/${id}`);
        setLayoutMetadata(response.data);
        
        if (response.data.layoutJson) {
          setLayoutJson(response.data.layoutJson);
        } else {
          setLayoutJson({
            ...DEFAULT_LAYOUT_JSON,
            canvas: {
              ...DEFAULT_LAYOUT_JSON.canvas,
              width: response.data.larguraPx || 400,
              height: response.data.alturaPx || 200,
            }
          });
        }
        // Reseta o status de alterações ao carregar
        setHasUnsavedChanges(false);
      } catch (error) {
        console.error('Erro ao carregar layout:', error);
        alert('Erro ao carregar o layout. Verifique a conexão.');
        navigate('/layout-etiquetas');
      } finally {
        setIsLoading(false);
      }
    };

    if (id) fetchLayout();
  }, [id, navigate]);

  // 4. BLINDAGEM: Intercepta fechamento da aba se houver alterações
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = ''; // Requisito padrão dos navegadores modernos
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // INTEGRAÇÃO COM A AURYA (IA)
  const handleUploadImagemIA = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 3. BLINDAGEM: Proteção de tamanho da imagem (Max 5MB)
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    if (file.size > MAX_FILE_SIZE) {
      alert('A imagem é muito pesada. O tamanho máximo permitido é 5MB.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsGeneratingAI(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('larguraMm', layoutMetadata?.larguraMm?.toString() || '100');
      formData.append('alturaMm', layoutMetadata?.alturaMm?.toString() || '50');

      // ✅ CORREÇÃO: Rota atualizada para bater com o routes.ts do Backend
      const response = await api.post('/api/layout-etiquetas/aurya-reversa', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response.data?.layoutJson) {
        setLayoutJson(response.data.layoutJson);
        setSelectedElementId(null);
        setHasUnsavedChanges(true);
        // 2. BLINDAGEM: Feedback de sucesso amigável
        alert('✨ Layout gerado com sucesso pela Aurya!');
      }
    } catch (error: any) {
      console.error('Erro na Aurya:', error);
      // 2. BLINDAGEM: Tratamento de erro detalhado
      const mensagemErro = error.response?.data?.error || 'Falha ao processar a imagem com a Aurya. Tente uma imagem com melhor iluminação e contraste.';
      alert(`⚠️ Erro da IA: ${mensagemErro}`);
    } finally {
      setIsGeneratingAI(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // GERENCIADORES DE ESTADO DO CANVAS 
  const handleAddElement = useCallback((type: EtiquetaElementType) => {
    // 5. BLINDAGEM: UUID Criptográfico contra colisões
    const baseId = `el_${crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36)}`;
    const zIndexBase = layoutJson.elements.length + 1;

    let novoElemento: LayoutElemento;

    switch (type) {
      case 'text':
        novoElemento = { id: baseId, type: 'text', x: 20, y: 20, width: 100, height: 30, visible: true, zIndex: zIndexBase, text: 'Novo Texto', fontSize: 14 };
        break;
      case 'dynamic_text':
        novoElemento = { id: baseId, type: 'dynamic_text', x: 20, y: 20, width: 100, height: 30, visible: true, zIndex: zIndexBase, placeholder: '{{produto}}', fontSize: 14 };
        break;
      case 'barcode':
        novoElemento = { id: baseId, type: 'barcode', x: 20, y: 20, width: 150, height: 50, visible: true, zIndex: zIndexBase, barcodeType: 'CODE128', valueMode: 'dynamic', placeholder: '{{codigoBarras}}', showHumanReadable: true };
        break;
      case 'qrcode':
        novoElemento = { id: baseId, type: 'qrcode', x: 20, y: 20, width: 80, height: 80, visible: true, zIndex: zIndexBase, valueMode: 'dynamic', placeholder: '{{codigoBarras}}' };
        break;
      case 'line':
        novoElemento = { id: baseId, type: 'line', x: 20, y: 20, width: 100, height: 30, visible: true, zIndex: zIndexBase, lineThickness: 2 };
        break;
      case 'rectangle':
        novoElemento = { id: baseId, type: 'rectangle', x: 20, y: 20, width: 100, height: 30, visible: true, zIndex: zIndexBase, borderThickness: 2 };
        break;
      default:
        return;
    }

    setLayoutJson(prev => ({
      ...prev,
      elements: [...prev.elements, novoElemento]
    }));
    setSelectedElementId(novoElemento.id);
    setHasUnsavedChanges(true); // Marca como alterado
  }, [layoutJson.elements.length]);

  const handleUpdateElement = useCallback((elementId: string, updates: Partial<LayoutElemento>) => {
    setLayoutJson(prev => ({
      ...prev,
      elements: prev.elements.map(el => el.id === elementId ? { ...el, ...updates } as LayoutElemento : el)
    }));
    setHasUnsavedChanges(true); // Marca como alterado
  }, []);

  const handleDeleteSelected = useCallback(() => {
    if (!selectedElementId) return;
    setLayoutJson(prev => ({
      ...prev,
      elements: prev.elements.filter(el => el.id !== selectedElementId)
    }));
    setSelectedElementId(null);
    setHasUnsavedChanges(true); // Marca como alterado
  }, [selectedElementId]);

  const handleInsertPlaceholder = useCallback((placeholder: string) => {
    if (!selectedElementId) {
      alert('Selecione um elemento de texto dinâmico ou código de barras primeiro.');
      return;
    }
    
    const elemento = layoutJson.elements.find(el => el.id === selectedElementId);
    if (!elemento || (elemento.type !== 'dynamic_text' && elemento.type !== 'barcode' && elemento.type !== 'qrcode')) {
      alert('O elemento selecionado não suporta variáveis dinâmicas.');
      return;
    }

    handleUpdateElement(selectedElementId, { placeholder });
  }, [selectedElementId, layoutJson.elements, handleUpdateElement]);

  // SALVAR NO BANCO
  const handleSave = async () => {
    setIsSaving(true);
    try {
      // ✅ CORREÇÃO: Usando o verbo PUT que mapeia perfeitamente para o método 'atualizar' do Controller
      await api.put(`/api/layout-etiquetas/${id}`, {
        layoutJson: layoutJson
      });
      setHasUnsavedChanges(false); // Limpa o status de alteração após salvar com sucesso
      alert('✅ Layout salvo com sucesso!');
    } catch (error: any) {
      console.error('Erro ao salvar:', error);
      const msg = error.response?.data?.error || 'Erro ao salvar o layout no banco de dados.';
      alert(`❌ ${msg}`);
    } finally {
      setIsSaving(false);
    }
  };

  // 4. BLINDAGEM: Navegação segura no botão de voltar
  const handleGoBack = () => {
    if (hasUnsavedChanges) {
      const confirmLeave = window.confirm('Você tem alterações não salvas. Deseja realmente sair e perder as modificações?');
      if (!confirmLeave) return;
    }
    navigate('/layout-etiquetas'); // ✅ CORREÇÃO: Apontando para a rota correta de listagem
  };

  // Captura o "Delete" do teclado para apagar elementos
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' && selectedElementId) {
        if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;
        handleDeleteSelected();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedElementId, handleDeleteSelected]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#060816] flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-violet-500" />
      </div>
    );
  }

  const selectedElementData = layoutJson.elements.find(el => el.id === selectedElementId) || null;

  return (
    <div className="min-h-screen bg-[#060816] text-slate-200 flex flex-col font-sans h-screen overflow-hidden">
      
      {/* HEADER AURYA SYSTEM */}
      <header className="flex-none bg-[#08101f]/90 backdrop-blur-xl border-b border-white/10 px-6 py-4 flex justify-between items-center shadow-[0_4px_30px_rgba(0,0,0,0.5)] z-20">
        <div className="flex items-center gap-4">
          <button 
            onClick={handleGoBack}
            className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors border border-white/10"
            title="Voltar para listagem"
          >
            <ArrowLeft size={20} className="text-slate-300" />
          </button>
          <div>
            <h1 className="text-xl font-black text-white flex items-center gap-2">
              Editor Visual <span className="text-violet-500">•</span> {layoutMetadata?.nome || 'Layout'}
              {hasUnsavedChanges && <span className="text-amber-500 text-xs font-bold ml-2">(Não salvo)</span>}
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              {layoutJson.canvas.width}px × {layoutJson.canvas.height}px | Arraste os elementos para posicionar
            </p>
          </div>
        </div>
        
        <div className="flex gap-3">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleUploadImagemIA} 
            accept="image/*" 
            className="hidden" 
          />
          
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isGeneratingAI}
            className="flex items-center gap-2 bg-[#131b2f] border border-violet-500/30 text-violet-300 px-4 py-2 rounded-xl text-sm font-bold hover:bg-violet-500/10 transition-all disabled:opacity-50"
          >
            {isGeneratingAI ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
            {isGeneratingAI ? 'Analisando...' : 'Engenharia Reversa IA'}
          </button>
          
          <button 
            onClick={handleSave}
            disabled={isSaving || !hasUnsavedChanges}
            className={`flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-bold transition-all ${
              hasUnsavedChanges 
                ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-[0_0_15px_rgba(139,92,246,0.30)] hover:scale-[1.02]' 
                : 'bg-white/5 text-gray-500 border border-white/10 cursor-not-allowed'
            }`}
          >
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Salvar Layout
          </button>
        </div>
      </header>

      {/* WORKSPACE (3 COLUNAS) */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* COLUNA 1: ESQUERDA (Toolbox & Variáveis) */}
        <aside className="w-72 flex-none bg-[#0b1324] border-r border-white/10 flex flex-col overflow-y-auto custom-scrollbar p-4 gap-8 z-10">
          <EtiquetaToolbox onAddElement={handleAddElement} />
          <PlaceholdersPanel onInsertPlaceholder={handleInsertPlaceholder} />
        </aside>

        {/* COLUNA 2: CENTRO (Canvas Workspace) */}
        <main className="flex-1 bg-[#060816] relative overflow-auto flex items-center justify-center p-8">
          <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#475569 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
          
          <div className="relative shadow-[0_0_50px_rgba(0,0,0,0.5)] ring-1 ring-white/20"
               style={{ 
                 width: layoutJson.canvas.width, 
                 height: layoutJson.canvas.height,
                 backgroundColor: layoutJson.canvas.background || '#ffffff'
               }}>
            
            <EtiquetaCanvasEditor 
              elements={layoutJson.elements}
              selectedId={selectedElementId}
              onSelect={setSelectedElementId}
              onUpdateElement={handleUpdateElement}
            />

          </div>

          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-[#08101f]/80 backdrop-blur border border-white/10 px-4 py-2 rounded-full flex items-center gap-2 text-xs text-slate-400 shadow-xl pointer-events-none">
            <MousePointer2 size={14} /> Selecione um elemento para editar. Pressione Delete para remover.
          </div>
        </main>

        {/* COLUNA 3: DIREITA (Painel de Propriedades) */}
        <aside className="w-80 flex-none bg-[#0b1324] border-l border-white/10 flex flex-col z-10">
          <div className="p-4 border-b border-white/10 flex justify-between items-center bg-[#08101f]">
            <h2 className="text-sm font-bold text-white tracking-wider">Inspetor</h2>
            {selectedElementId && (
              <button 
                onClick={handleDeleteSelected}
                className="text-red-400 hover:text-red-300 hover:bg-red-500/10 p-1.5 rounded transition-colors"
                title="Excluir Elemento"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
            <EtiquetaPropertiesPanel 
              selectedElement={selectedElementData}
              onUpdateElement={handleUpdateElement}
            />
          </div>
        </aside>

      </div>
    </div>
  );
}