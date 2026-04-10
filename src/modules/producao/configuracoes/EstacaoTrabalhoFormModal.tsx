// src/pages/configuracoes/components/layout-etiquetas/EstacaoTrabalhoFormModal.tsx

import React, { useState, useEffect } from 'react';
import { 
  X, MonitorSmartphone, Scale, Printer, Factory, 
  Truck, Settings, Loader2, AlertCircle, Save, 
  Link as LinkIcon 
} from 'lucide-react';
import { api } from '../../../services/api';
import { EstacaoTrabalho, ModoOperacaoEstacao } from '../types/estacaoTrabalho';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  estacao: EstacaoTrabalho | null;
  onSave: () => void;
}

type FormState = {
  nome: string;
  identificadorMaquina: string;
  descricao: string;
  modoOperacao: ModoOperacaoEstacao;
  ativo: boolean;
  balancaId: string;
  layoutEtiquetaId: string;
  usarImpressoraPadrao: boolean;
  nomeImpressora: string;
  observacao: string;
};

const initialState: FormState = {
  nome: '',
  identificadorMaquina: '',
  descricao: '',
  modoOperacao: 'PRODUCAO',
  ativo: true,
  balancaId: '',
  layoutEtiquetaId: '',
  usarImpressoraPadrao: true,
  nomeImpressora: '',
  observacao: '',
};

const getModoIcon = (modo: string) => {
  switch (modo) {
    case 'PESAGEM': return <Scale className="text-emerald-400" size={20} />;
    case 'IMPRESSAO': return <Printer className="text-blue-400" size={20} />;
    case 'EXPEDICAO': return <Truck className="text-orange-400" size={20} />;
    case 'ADMINISTRATIVO': return <Settings className="text-gray-400" size={20} />;
    default: return <Factory className="text-violet-400" size={20} />;
  }
};

const EstacaoTrabalhoFormModal: React.FC<Props> = ({ isOpen, onClose, estacao, onSave }) => {
  const [form, setForm] = useState<FormState>(initialState);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Opções para os Selects
  const [balancas, setBalancas] = useState<{ id: string; nome: string }[]>([]);
  const [layouts, setLayouts] = useState<{ id: string; nome: string }[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);

  // Helper seguro para extrair erros (ZERO any)
  const getErrorMessage = (err: unknown): string => {
    if (err && typeof err === 'object' && 'response' in err) {
      const axiosError = err as { response?: { data?: { message?: string, error?: string } } };
      return axiosError.response?.data?.message || axiosError.response?.data?.error || 'Erro inesperado na operação.';
    }
    return err instanceof Error ? err.message : 'Erro inesperado.';
  };

  useEffect(() => {
    if (estacao) {
      setForm({
        nome: estacao.nome,
        identificadorMaquina: estacao.identificadorMaquina,
        descricao: estacao.descricao || '',
        modoOperacao: estacao.modoOperacao,
        ativo: estacao.ativo,
        balancaId: estacao.balancaId || '',
        layoutEtiquetaId: estacao.layoutEtiquetaId || '',
        usarImpressoraPadrao: estacao.usarImpressoraPadrao,
        nomeImpressora: estacao.nomeImpressora || '',
        observacao: estacao.observacao || '',
      });
    } else {
      setForm(initialState);
    }
    setError(null);
  }, [estacao, isOpen]);

  useEffect(() => {
    const fetchOptions = async () => {
      setLoadingOptions(true);
      try {
        // Ajuste as rotas conforme a sua API
        const [balancasRes, layoutsRes] = await Promise.all([
          api.get('/producao/configuracoes/balancas').catch(() => ({ data: { data: [] } })),
          api.get('/layout-etiquetas').catch(() => ({ data: [] })),
        ]);

        // Trata a estrutura de resposta (paginada ou array direto)
        setBalancas(balancasRes.data?.data || balancasRes.data || []);
        setLayouts(layoutsRes.data?.data || layoutsRes.data || []);
      } catch (err) {
        console.error('Erro ao carregar opções', err);
      } finally {
        setLoadingOptions(false);
      }
    };

    if (isOpen) fetchOptions();
  }, [isOpen]);

  // ✅ BLINDAGEM: Tipagem forte usando Generics do TypeScript
  const handleChange = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    setError(null);

    // Validação de Frontend
    if (!form.nome.trim() || !form.identificadorMaquina.trim()) {
      setError('Os campos Nome e Identificador da Máquina são obrigatórios.');
      return;
    }

    if (!form.usarImpressoraPadrao && !form.nomeImpressora.trim()) {
      setError('Informe o nome exato da impressora no Windows quando não usar a padrão.');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        ...form,
        balancaId: form.balancaId || null,
        layoutEtiquetaId: form.layoutEtiquetaId || null,
        nomeImpressora: form.usarImpressoraPadrao ? null : form.nomeImpressora.trim(),
      };

      const baseUrl = '/producao/configuracoes/estacoes-trabalho';

      if (estacao) {
        await api.put(`${baseUrl}/${estacao.id}`, payload);
      } else {
        await api.post(baseUrl, payload);
      }

      onSave();
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const inputClass = "w-full bg-[#131b2f] border border-gray-700 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all";
  const labelClass = "block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#0b1324] w-full max-w-4xl rounded-2xl border border-gray-800 shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* HEADER */}
        <div className="flex items-center justify-between border-b border-gray-800 p-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-3">
            <div className="p-2 bg-white/5 rounded-lg border border-white/10">
              {getModoIcon(form.modoOperacao)}
            </div>
            {estacao ? 'Editar Estação de Trabalho' : 'Nova Estação de Trabalho'}
          </h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white hover:bg-white/10 p-2 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* BODY */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-8">
          
          {error && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              <AlertCircle size={18} className="flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {/* SEÇÃO 1: Identificação Básica */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-gray-800 pb-2">
              <MonitorSmartphone size={16} className="text-violet-400" />
              Identificação da Máquina
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Nome Amigável *</label>
                <input
                  value={form.nome}
                  onChange={(e) => handleChange('nome', e.target.value)}
                  placeholder="Ex: Caixa 01, Balança Açougue..."
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Identificador da Máquina (MAC/Hostname) *</label>
                <input
                  value={form.identificadorMaquina}
                  onChange={(e) => handleChange('identificadorMaquina', e.target.value)}
                  placeholder="Ex: DESKTOP-CX01 ou 00:1A:2B..."
                  className={inputClass}
                />
              </div>

              <div className="md:col-span-2">
                <label className={labelClass}>Modo de Operação *</label>
                <select
                  value={form.modoOperacao}
                  onChange={(e) => handleChange('modoOperacao', e.target.value as ModoOperacaoEstacao)}
                  className={inputClass}
                >
                  <option value="PRODUCAO">Produção (Chão de Fábrica / Retaguarda)</option>
                  <option value="PESAGEM">Pesagem (Açougue / Padaria)</option>
                  <option value="IMPRESSAO">Estação de Impressão Dedicada</option>
                  <option value="EXPEDICAO">Expedição (Logística)</option>
                  <option value="ADMINISTRATIVO">Administrativo (Escritório)</option>
                </select>
              </div>
            </div>
          </div>

          {/* SEÇÃO 2: Integrações de Hardware */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-gray-800 pb-2">
              <LinkIcon size={16} className="text-emerald-400" />
              Integrações (Opcional)
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <label className={labelClass}>Balança Vinculada</label>
                <select
                  value={form.balancaId}
                  onChange={(e) => handleChange('balancaId', e.target.value)}
                  className={inputClass}
                  disabled={loadingOptions}
                >
                  <option value="">Nenhuma balança vinculada</option>
                  {balancas.map((b) => (
                    <option key={b.id} value={b.id}>{b.nome}</option>
                  ))}
                </select>
                {loadingOptions && <Loader2 size={16} className="absolute right-4 top-10 animate-spin text-gray-500" />}
              </div>

              <div className="relative">
                <label className={labelClass}>Layout de Etiqueta Padrão</label>
                <select
                  value={form.layoutEtiquetaId}
                  onChange={(e) => handleChange('layoutEtiquetaId', e.target.value)}
                  className={inputClass}
                  disabled={loadingOptions}
                >
                  <option value="">Nenhum layout vinculado</option>
                  {layouts.map((l) => (
                    <option key={l.id} value={l.id}>{l.nome}</option>
                  ))}
                </select>
                {loadingOptions && <Loader2 size={16} className="absolute right-4 top-10 animate-spin text-gray-500" />}
              </div>
            </div>
          </div>

          {/* SEÇÃO 3: Impressão Local */}
          <div className="space-y-4 bg-[#131b2f]/50 p-5 rounded-2xl border border-gray-800">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
              <Printer size={16} className="text-blue-400" />
              Configuração de Impressão Local (Zebra/Elgin)
            </h3>
            
            <label className="flex items-center gap-3 cursor-pointer group w-max">
              <div className="relative flex items-center">
                <input
                  type="checkbox"
                  checked={form.usarImpressoraPadrao}
                  onChange={(e) => handleChange('usarImpressoraPadrao', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
              </div>
              <span className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">
                Usar impressora padrão do Windows
              </span>
            </label>

            {!form.usarImpressoraPadrao && (
              <div className="mt-4 pt-4 border-t border-gray-800">
                <label className={labelClass}>Nome Exato da Impressora no Windows *</label>
                <input
                  value={form.nomeImpressora}
                  onChange={(e) => handleChange('nomeImpressora', e.target.value)}
                  placeholder="Ex: ZDesigner GC420t"
                  className={inputClass}
                />
                <p className="text-xs text-gray-500 mt-2">
                  O nome deve ser exatamente igual ao que aparece no "Painel de Controle de Impressoras" do Windows desta estação.
                </p>
              </div>
            )}
          </div>

          {/* STATUS */}
          <div className="flex items-center gap-3 p-4 bg-[#131b2f]/30 rounded-xl border border-gray-800">
            <div className="relative flex items-center">
              <input
                type="checkbox"
                id="ativo"
                checked={form.ativo}
                onChange={(e) => handleChange('ativo', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
            </div>
            <label htmlFor="ativo" className="text-sm font-medium text-gray-300 cursor-pointer">
              Estação Ativa (Permite login e operações)
            </label>
          </div>

        </div>

        {/* FOOTER */}
        <div className="p-6 border-t border-gray-800 flex justify-end gap-3 bg-[#08101f] rounded-b-2xl">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-5 py-2.5 text-sm font-medium text-gray-300 bg-transparent border border-gray-600 rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-6 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-xl hover:scale-[1.02] transition-transform disabled:opacity-50 disabled:scale-100 flex items-center gap-2 shadow-lg shadow-violet-500/20"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            {loading ? 'Salvando...' : 'Salvar Estação'}
          </button>
        </div>

      </div>
    </div>
  );
};

export default EstacaoTrabalhoFormModal;