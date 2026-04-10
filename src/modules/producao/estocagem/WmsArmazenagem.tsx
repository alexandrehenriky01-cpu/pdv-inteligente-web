import React, { useState, useRef, useEffect } from 'react';
import { Layout } from '../../../components/Layout';
import { api } from '../../../services/api';
import { toast } from 'react-toastify';
import { 
  Package, MapPin, CheckCircle2, ArrowRight, 
  Loader2, Barcode, AlertTriangle, RefreshCcw 
} from 'lucide-react';

export function WmsArmazenagem() {
  const [codigoLote, setCodigoLote] = useState('');
  const [codigoEndereco, setCodigoEndereco] = useState('');
  
  const [etapa, setEtapa] = useState<'BIPAR_LOTE' | 'BIPAR_ENDERECO' | 'CONFIRMAR'>('BIPAR_LOTE');
  const [salvando, setSalvando] = useState(false);

  const inputLoteRef = useRef<HTMLInputElement>(null);
  const inputEnderecoRef = useRef<HTMLInputElement>(null);

  // Auto-focus para agilizar o uso do leitor de código de barras
  useEffect(() => {
    if (etapa === 'BIPAR_LOTE') {
      inputLoteRef.current?.focus();
    } else if (etapa === 'BIPAR_ENDERECO') {
      inputEnderecoRef.current?.focus();
    }
  }, [etapa]);

  // ==========================================
  // HANDLERS DOS LEITORES DE CÓDIGO DE BARRAS
  // ==========================================
  const handleBiparLote = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && codigoLote.trim() !== '') {
      // Aqui poderíamos bater numa API para validar se o lote existe antes de avançar,
      // mas para otimizar tempo na câmara fria, vamos avançar direto e validar no final.
      setEtapa('BIPAR_ENDERECO');
    }
  };

  const handleBiparEndereco = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && codigoEndereco.trim() !== '') {
      setEtapa('CONFIRMAR');
    }
  };

  // ==========================================
  // REGISTRAR ARMAZENAGEM (PUTAWAY)
  // ==========================================
  const handleConfirmarArmazenagem = async () => {
    if (!codigoLote || !codigoEndereco) {
      toast.error("Lote e Endereço são obrigatórios.");
      return;
    }

    setSalvando(true);
    try {
      const response = await api.post('/api/wms/movimentos/armazenar', {
        codigoLote: codigoLote.trim(),
        codigoEndereco: codigoEndereco.trim().toUpperCase() // Padrão CF1-RA-P01-N01
      });
      
      toast.success(response.data.mensagem || "Palete armazenado com sucesso!");
      
      // Reseta para o próximo palete
      resetarTela();
    } catch (error: any) {
      toast.error(error.response?.data?.erro || "Erro ao armazenar palete.");
      // Volta para a etapa de endereço caso o erro seja "Endereço Cheio", por exemplo
      setEtapa('BIPAR_ENDERECO');
      setCodigoEndereco('');
    } finally {
      setSalvando(false);
    }
  };

  const resetarTela = () => {
    setCodigoLote('');
    setCodigoEndereco('');
    setEtapa('BIPAR_LOTE');
  };

  const inputClass = 'w-full bg-[#0b1324] border border-white/10 rounded-2xl px-6 py-6 text-white text-2xl font-mono focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all text-center placeholder:text-slate-600';

  return (
    <Layout>
      <div className="mx-auto max-w-3xl space-y-6 pb-12 animate-[fadeIn_0.5s_ease-out]">
        
        {/* HEADER */}
        <div className="flex flex-col justify-center items-center gap-4 rounded-[30px] border border-white/10 bg-[#08101f] p-8 shadow-[0_25px_70px_rgba(0,0,0,0.40)] text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">
            <Package className="h-4 w-4" /> WMS - Operação
          </div>
          <h1 className="text-4xl font-black text-white tracking-tight">Armazenagem (Putaway)</h1>
          <p className="text-slate-400 font-medium">Guarde os paletes recebidos nas posições do armazém.</p>
        </div>

        {/* ÁREA DE OPERAÇÃO */}
        <div className="bg-[#08101f]/90 backdrop-blur-xl rounded-[30px] border border-white/10 p-8 md:p-12 shadow-[0_25px_60px_rgba(0,0,0,0.35)] relative overflow-hidden">
          
          {/* Indicador de Progresso */}
          <div className="flex justify-between items-center mb-12 relative">
            <div className="absolute top-1/2 left-0 w-full h-1 bg-white/5 -z-10 -translate-y-1/2"></div>
            <div className="absolute top-1/2 left-0 h-1 bg-emerald-500 -z-10 -translate-y-1/2 transition-all duration-500" 
                 style={{ width: etapa === 'BIPAR_LOTE' ? '0%' : etapa === 'BIPAR_ENDERECO' ? '50%' : '100%' }}></div>
            
            <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg transition-all ${etapa === 'BIPAR_LOTE' ? 'bg-emerald-500 text-slate-900 shadow-[0_0_20px_rgba(16,185,129,0.4)]' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'}`}>1</div>
            <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg transition-all ${etapa === 'BIPAR_ENDERECO' ? 'bg-emerald-500 text-slate-900 shadow-[0_0_20px_rgba(16,185,129,0.4)]' : etapa === 'CONFIRMAR' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-[#0b1324] text-slate-600 border border-white/10'}`}>2</div>
            <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg transition-all ${etapa === 'CONFIRMAR' ? 'bg-emerald-500 text-slate-900 shadow-[0_0_20px_rgba(16,185,129,0.4)]' : 'bg-[#0b1324] text-slate-600 border border-white/10'}`}>3</div>
          </div>

          {/* PASSO 1: LOTE */}
          {etapa === 'BIPAR_LOTE' && (
            <div className="text-center animate-[fadeIn_0.3s_ease-out]">
              <Barcode className="w-20 h-20 text-emerald-400 mx-auto mb-6" />
              <h2 className="text-2xl font-black text-white mb-2">Bipe a Etiqueta do Palete</h2>
              <p className="text-slate-400 mb-8">Leia o código de barras (Lote) gerado no recebimento.</p>
              
              <input 
                ref={inputLoteRef}
                type="text" 
                value={codigoLote}
                onChange={e => setCodigoLote(e.target.value)}
                onKeyDown={handleBiparLote}
                className={inputClass}
                placeholder="Ex: IN-20260409-1234"
              />
              
              <button 
                onClick={() => codigoLote && setEtapa('BIPAR_ENDERECO')}
                disabled={!codigoLote}
                className="w-full mt-6 bg-white/5 hover:bg-white/10 disabled:opacity-50 text-white py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
              >
                Avançar Manualmente <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* PASSO 2: ENDEREÇO */}
          {etapa === 'BIPAR_ENDERECO' && (
            <div className="text-center animate-[fadeIn_0.3s_ease-out]">
              <MapPin className="w-20 h-20 text-blue-400 mx-auto mb-6" />
              <h2 className="text-2xl font-black text-white mb-2">Bipe o Endereço (Prateleira)</h2>
              <p className="text-slate-400 mb-8">Vá até a posição vazia e leia a etiqueta da prateleira.</p>
              
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-8 text-left flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Palete Selecionado</span>
                  <p className="text-emerald-400 font-mono font-bold text-lg">{codigoLote}</p>
                </div>
                <button onClick={() => setEtapa('BIPAR_LOTE')} className="p-2 hover:bg-white/10 rounded-lg text-slate-400 transition-colors">
                  <RefreshCcw className="w-5 h-5" />
                </button>
              </div>

              <input 
                ref={inputEnderecoRef}
                type="text" 
                value={codigoEndereco}
                onChange={e => setCodigoEndereco(e.target.value)}
                onKeyDown={handleBiparEndereco}
                className={inputClass}
                placeholder="Ex: CF1-RA-P01-N01"
              />

              <button 
                onClick={() => codigoEndereco && setEtapa('CONFIRMAR')}
                disabled={!codigoEndereco}
                className="w-full mt-6 bg-white/5 hover:bg-white/10 disabled:opacity-50 text-white py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
              >
                Avançar Manualmente <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* PASSO 3: CONFIRMAÇÃO */}
          {etapa === 'CONFIRMAR' && (
            <div className="text-center animate-[fadeIn_0.3s_ease-out]">
              <div className="bg-[#0b1324] border border-white/10 rounded-2xl p-8 mb-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="text-left">
                    <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider block mb-2">Guardar o Palete</span>
                    <div className="flex items-center gap-3">
                      <Package className="w-6 h-6 text-emerald-400" />
                      <span className="text-2xl font-mono font-black text-white">{codigoLote}</span>
                    </div>
                  </div>
                  
                  <div className="hidden md:flex items-center justify-center">
                    <ArrowRight className="w-8 h-8 text-slate-600" />
                  </div>

                  <div className="text-left md:text-right">
                    <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider block mb-2">No Endereço</span>
                    <div className="flex items-center md:justify-end gap-3">
                      <MapPin className="w-6 h-6 text-blue-400" />
                      <span className="text-2xl font-mono font-black text-white">{codigoEndereco}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={resetarTela}
                  disabled={salvando}
                  className="flex-1 bg-white/5 hover:bg-white/10 text-white py-6 rounded-2xl font-bold transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleConfirmarArmazenagem}
                  disabled={salvando}
                  className="flex-[2] bg-emerald-600 hover:bg-emerald-500 text-white py-6 rounded-2xl font-black text-xl transition-all flex items-center justify-center gap-3 shadow-[0_0_30px_rgba(16,185,129,0.3)]"
                >
                  {salvando ? <Loader2 className="w-8 h-8 animate-spin" /> : <CheckCircle2 className="w-8 h-8" />}
                  Confirmar Armazenagem
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </Layout>
  );
}