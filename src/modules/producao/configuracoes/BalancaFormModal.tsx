import { useCallback, useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { X, Scale, Settings2, Network, Usb, Keyboard, ChevronDown, ChevronUp, Radio } from 'lucide-react';
import { AxiosError } from 'axios';
import { api } from '../../../services/api';
import { Balanca, TipoConexaoBalanca } from '../types/balanca';

interface Props {
  balanca: Balanca | null;
  onClose: () => void;
  onSuccess: () => void;
}

interface ApiErrorResponse {
  error: string;
}

const initialState: Partial<Balanca> = {
  nome: '',
  descricao: '',
  modelo: '',
  fabricante: '',
  numeroSerie: '',
  tipoConexao: 'SERIAL',
  portaCom: 'COM3',
  baudRate: 9600,
  dataBits: 8,
  stopBits: 1,
  parity: 'NONE',
  ip: '',
  portaTcp: undefined,
  protocolo: 'TOLEDO',
  unidadePeso: 'KG',
  casasDecimais: 3,
  timeoutLeitura: 2000,
  tolerancia: 0,
  ativo: true,
  observacao: ''
};

export default function BalancaFormModal({ balanca, onClose, onSuccess }: Props) {
  const [formData, setFormData] = useState<Partial<Balanca>>(initialState);
  const [erro, setErro] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [mostrarAvancado, setMostrarAvancado] = useState<boolean>(false);
  const [pesoVisor, setPesoVisor] = useState<string>('—.———');
  const [testandoPeso, setTestandoPeso] = useState<boolean>(false);

  useEffect(() => {
    if (balanca) {
      setFormData({ ...initialState, ...balanca, casasDecimais: balanca.casasDecimais ?? 3 });
    } else {
      setFormData(initialState);
    }
    setPesoVisor('—.———');
    setTestandoPeso(false);
  }, [balanca]);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;

    setFormData(prev => {
      if (type === 'checkbox') {
        const checked = (e.target as HTMLInputElement).checked;
        return { ...prev, [name]: checked };
      }
      if (type === 'number') {
        return { ...prev, [name]: value === '' ? undefined : Number(value) };
      }
      return { ...prev, [name]: value };
    });
  };

  const validar = (): string => {
    if (!formData.nome) return 'Nome é obrigatório';

    const casas = Number(formData.casasDecimais ?? 3);
    if (!Number.isInteger(casas) || casas < 0 || casas > 4) {
      return 'Casas decimais deve ser um inteiro entre 0 e 4.';
    }

    if (formData.tipoConexao === 'SERIAL' || formData.tipoConexao === 'USB') {
      if (!formData.portaCom) return 'Porta COM é obrigatória (Ex: COM3)';
      if (!formData.baudRate) return 'Baud Rate é obrigatório para conexões seriais.';
    }

    if (formData.tipoConexao === 'TCP_IP') {
      if (!formData.ip) return 'Endereço IP é obrigatório';
      if (!formData.portaTcp) return 'Porta TCP é obrigatória';
    }

    return '';
  };

  const handleTestarPeso = useCallback(() => {
    setTestandoPeso(true);
    const casas = Math.min(4, Math.max(0, Math.round(Number(formData.casasDecimais ?? 3))));
    window.setTimeout(() => {
      const valor = (Math.random() * 5).toFixed(casas);
      const unidade = formData.unidadePeso === 'G' ? ' G' : ' KG';
      setPesoVisor(`${valor}${unidade}`);
      setTestandoPeso(false);
    }, 1000);
  }, [formData.casasDecimais, formData.unidadePeso]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const erroValidacao = validar();
    if (erroValidacao) {
      setErro(erroValidacao);
      return;
    }

    setErro('');
    setLoading(true);

    const casasDecimais = Math.min(4, Math.max(0, Math.round(Number(formData.casasDecimais ?? 3))));

    const payload: Partial<Balanca> = {
      ...formData,
      casasDecimais,
      nome: String(formData.nome ?? '').trim().toUpperCase(),
      descricao: formData.descricao != null && String(formData.descricao).trim() !== ''
        ? String(formData.descricao).trim().toUpperCase()
        : formData.descricao === ''
          ? ''
          : formData.descricao,
      fabricante:
        formData.fabricante != null && String(formData.fabricante).trim() !== ''
          ? String(formData.fabricante).trim().toUpperCase()
          : formData.fabricante,
      modelo:
        formData.modelo != null && String(formData.modelo).trim() !== ''
          ? String(formData.modelo).trim().toUpperCase()
          : formData.modelo,
      numeroSerie:
        formData.numeroSerie != null && String(formData.numeroSerie).trim() !== ''
          ? String(formData.numeroSerie).trim().toUpperCase()
          : formData.numeroSerie,
      observacao:
        formData.observacao != null && String(formData.observacao).trim() !== ''
          ? String(formData.observacao).trim().toUpperCase()
          : formData.observacao,
    };

    if (payload.portaCom != null && String(payload.portaCom).trim() !== '') {
      payload.portaCom = String(payload.portaCom).trim().toUpperCase();
    }

    try {
      if (balanca?.id) {
        await api.put(`/api/balancas/${balanca.id}`, payload);
      } else {
        await api.post('/api/balancas', payload);
      }
      onSuccess();
    } catch (err: unknown) {
      if (err instanceof AxiosError && err.response?.data) {
        const data = err.response.data as ApiErrorResponse;
        setErro(data.error || 'Erro ao salvar balança');
      } else if (err instanceof Error) {
        setErro(err.message);
      } else {
        setErro('Erro desconhecido ao salvar balança');
      }
    } finally {
      setLoading(false);
    }
  };

  const renderIconeConexao = () => {
    switch (formData.tipoConexao) {
      case 'SERIAL': return <Settings2 className="w-5 h-5 text-violet-400" />;
      case 'USB': return <Usb className="w-5 h-5 text-blue-400" />;
      case 'TCP_IP': return <Network className="w-5 h-5 text-emerald-400" />;
      case 'TECLADO': return <Keyboard className="w-5 h-5 text-amber-400" />;
      default: return <Scale className="w-5 h-5 text-gray-400" />;
    }
  };

  const inputClass = "w-full bg-[#0b1324] border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none transition-all placeholder:text-gray-600";
  const labelClass = "block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5";

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease-out]">
      <div className="bg-[#08101f] border border-white/10 rounded-[30px] w-full max-w-4xl max-h-[90vh] flex flex-col shadow-[0_25px_80px_rgba(0,0,0,0.70)]">
        
        {/* HEADER */}
        <div className="flex justify-between items-center p-6 border-b border-white/5 bg-[#0b1324]/50 rounded-t-[30px]">
          <h2 className="text-2xl font-black text-white flex items-center gap-3">
            <Scale className="text-violet-400" />
            {balanca ? 'Editar Balança' : 'Nova Balança'}
          </h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* BODY */}
        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar space-y-8">
          {erro && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 text-red-400 rounded-2xl text-sm font-medium flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
              {erro}
            </div>
          )}

          <form id="balanca-form" onSubmit={handleSubmit} className="space-y-8">
            
            {/* SESSÃO 1: IDENTIFICAÇÃO */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-violet-400 uppercase tracking-widest flex items-center gap-2 border-b border-white/5 pb-2">
                1. Identificação do Equipamento
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className={labelClass}>Nome da Balança <span className="text-fuchsia-500">*</span></label>
                  <input type="text" name="nome" required value={formData.nome || ''} onChange={handleChange} className={inputClass} placeholder="Ex: Balança do Açougue" />
                </div>
                <div>
                  <label className={labelClass}>Protocolo de Comunicação</label>
                  <select name="protocolo" value={formData.protocolo || 'TOLEDO'} onChange={handleChange} className={inputClass}>
                    <option value="TOLEDO">Toledo (Prix)</option>
                    <option value="FILIZOLA">Filizola</option>
                    <option value="URANO">Urano</option>
                    <option value="GERTEC">Gertec</option>
                    <option value="ELGIN">Elgin</option>
                    <option value="CUSTOM">Custom</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Fabricante / Marca</label>
                  <input type="text" name="fabricante" value={formData.fabricante || ''} onChange={handleChange} className={inputClass} placeholder="Ex: Toledo" />
                </div>
                <div>
                  <label className={labelClass}>Modelo</label>
                  <input type="text" name="modelo" value={formData.modelo || ''} onChange={handleChange} className={inputClass} placeholder="Ex: Prix 3 Plus" />
                </div>
                <div>
                  <label className={labelClass}>Número de Série</label>
                  <input type="text" name="numeroSerie" value={formData.numeroSerie || ''} onChange={handleChange} className={inputClass} placeholder="Ex: SN-12345678" />
                </div>
                <div>
                  <label className={labelClass}>Unidade de Peso Padrão</label>
                  <select name="unidadePeso" value={formData.unidadePeso || 'KG'} onChange={handleChange} className={inputClass}>
                    <option value="KG">Quilogramas (KG)</option>
                    <option value="G">Gramas (G)</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Casas decimais (peso)</label>
                  <input
                    type="number"
                    name="casasDecimais"
                    min={0}
                    max={4}
                    step={1}
                    value={formData.casasDecimais ?? 3}
                    onChange={handleChange}
                    className={inputClass}
                  />
                  <p className="mt-1 text-[10px] text-gray-500">Precisão para exibição e cálculo (0 a 4). Padrão: 3.</p>
                </div>
                <div className="md:col-span-2">
                  <label className={labelClass}>Descrição / Localização</label>
                  <input type="text" name="descricao" value={formData.descricao || ''} onChange={handleChange} className={inputClass} placeholder="Ex: Balança localizada no setor de desossa traseira" />
                </div>
              </div>
            </div>

            {/* SESSÃO 2: CONECTIVIDADE PRINCIPAL */}
            <div className="space-y-4 bg-[#0b1324] p-5 rounded-2xl border border-white/5">
              <h3 className="text-sm font-bold text-violet-400 uppercase tracking-widest flex items-center gap-2 border-b border-white/5 pb-2">
                2. Parâmetros de Conexão
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2">
                  <label className={labelClass}>Tipo de Conexão <span className="text-fuchsia-500">*</span></label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2">
                      {renderIconeConexao()}
                    </div>
                    <select name="tipoConexao" required value={formData.tipoConexao || 'SERIAL'} onChange={handleChange} className={`${inputClass} pl-12`}>
                      <option value="SERIAL">Cabo Serial (RS232) / COM</option>
                      <option value="USB">Cabo USB</option>
                      <option value="TCP_IP">Rede (TCP/IP / Wi-Fi)</option>
                      <option value="HID">Emulador (HID)</option>
                      <option value="TECLADO">Teclado Manual</option>
                    </select>
                  </div>
                </div>

                {/* CAMPOS DINÂMICOS: SERIAL / USB */}
                {(formData.tipoConexao === 'SERIAL' || formData.tipoConexao === 'USB') && (
                  <>
                    <div>
                      <label className={labelClass}>Porta COM (Windows) <span className="text-fuchsia-500">*</span></label>
                      <input type="text" name="portaCom" value={formData.portaCom || ''} onChange={handleChange} className={inputClass} placeholder="Ex: COM3" />
                    </div>
                    <div>
                      <label className={labelClass}>Baud Rate (Velocidade) <span className="text-fuchsia-500">*</span></label>
                      <select name="baudRate" value={formData.baudRate || 9600} onChange={handleChange} className={inputClass}>
                        <option value="2400">2400</option>
                        <option value="4800">4800</option>
                        <option value="9600">9600 (Padrão)</option>
                        <option value="19200">19200</option>
                        <option value="115200">115200</option>
                      </select>
                    </div>
                  </>
                )}

                {/* CAMPOS DINÂMICOS: REDE TCP/IP */}
                {formData.tipoConexao === 'TCP_IP' && (
                  <>
                    <div>
                      <label className={labelClass}>Endereço IP da Balança <span className="text-fuchsia-500">*</span></label>
                      <input type="text" name="ip" value={formData.ip || ''} onChange={handleChange} className={inputClass} placeholder="Ex: 192.168.1.150" />
                    </div>
                    <div>
                      <label className={labelClass}>Porta de Rede (TCP) <span className="text-fuchsia-500">*</span></label>
                      <input type="number" name="portaTcp" value={formData.portaTcp || ''} onChange={handleChange} className={inputClass} placeholder="Ex: 4001" />
                    </div>
                  </>
                )}

                <div className="md:col-span-2 rounded-2xl border border-emerald-500/25 bg-gradient-to-b from-[#030806] via-black to-[#0a1210] p-5 shadow-[inset_0_0_48px_rgba(16,185,129,0.06)]">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400/90">
                        Visor de teste de peso
                      </p>
                      <p className="mt-1 max-w-xl text-[11px] leading-relaxed text-gray-500">
                        Simula leitura após IP/porta (ou outros meios). A comunicação real via TCP/socket será integrada no backend; esta UI já exibe o formato com as casas decimais configuradas.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleTestarPeso}
                      disabled={testandoPeso}
                      className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-emerald-300 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Radio className="h-4 w-4" />
                      {testandoPeso ? 'Conectando…' : 'Testar conexão / Ler peso'}
                    </button>
                  </div>
                  <div
                    className={`mt-4 flex min-h-[5.5rem] items-center justify-center rounded-xl border px-3 py-4 text-center font-mono text-2xl tracking-[0.15em] sm:text-3xl ${
                      testandoPeso
                        ? 'border-amber-500/40 bg-black/80 text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.35)]'
                        : 'border-emerald-800/60 bg-black text-emerald-400 drop-shadow-[0_0_14px_rgba(52,211,153,0.45)]'
                    }`}
                  >
                    {testandoPeso ? 'CONECTANDO...' : pesoVisor}
                  </div>
                </div>
              </div>
            </div>

            {/* SESSÃO 3: PARÂMETROS AVANÇADOS (ACCORDION) */}
            <div className="border border-white/5 rounded-2xl overflow-hidden bg-[#08101f]">
              <button 
                type="button" 
                onClick={() => setMostrarAvancado(!mostrarAvancado)}
                className="w-full p-4 flex justify-between items-center bg-[#0b1324]/50 hover:bg-[#0b1324] transition-colors"
              >
                <span className="text-sm font-bold text-gray-300 uppercase tracking-widest">
                  3. Parâmetros Técnicos Avançados
                </span>
                {mostrarAvancado ? <ChevronUp className="text-violet-400" /> : <ChevronDown className="text-gray-500" />}
              </button>
              
              {mostrarAvancado && (
                <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-5 border-t border-white/5 animate-[fadeIn_0.2s_ease-out]">
                  {(formData.tipoConexao === 'SERIAL' || formData.tipoConexao === 'USB') && (
                    <>
                      <div>
                        <label className={labelClass}>Data Bits</label>
                        <select name="dataBits" value={formData.dataBits || 8} onChange={handleChange} className={inputClass}>
                          <option value="7">7</option>
                          <option value="8">8 (Padrão)</option>
                        </select>
                      </div>
                      <div>
                        <label className={labelClass}>Stop Bits</label>
                        <select name="stopBits" value={formData.stopBits || 1} onChange={handleChange} className={inputClass}>
                          <option value="1">1 (Padrão)</option>
                          <option value="1.5">1.5</option>
                          <option value="2">2</option>
                        </select>
                      </div>
                      <div>
                        <label className={labelClass}>Parity (Paridade)</label>
                        <select name="parity" value={formData.parity || 'NONE'} onChange={handleChange} className={inputClass}>
                          <option value="NONE">None (Nenhuma)</option>
                          <option value="ODD">Odd (Ímpar)</option>
                          <option value="EVEN">Even (Par)</option>
                          <option value="MARK">Mark</option>
                          <option value="SPACE">Space</option>
                        </select>
                      </div>
                    </>
                  )}
                  <div>
                    <label className={labelClass}>Timeout de Leitura (ms)</label>
                    <input type="number" name="timeoutLeitura" value={formData.timeoutLeitura || 2000} onChange={handleChange} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Tolerância (Variação)</label>
                    <input type="number" name="tolerancia" value={formData.tolerancia || 0} onChange={handleChange} className={inputClass} placeholder="Ex: 0.005" />
                  </div>
                  <div className="md:col-span-3">
                    <label className={labelClass}>Observações Técnicas</label>
                    <textarea 
                      name="observacao" 
                      value={formData.observacao || ''} 
                      onChange={handleChange} 
                      className={`${inputClass} min-h-[80px] resize-none`} 
                      placeholder="Anotações para a equipe de TI..." 
                    />
                  </div>
                </div>
              )}
            </div>

            {/* SESSÃO 4: STATUS */}
            <div className="flex items-center gap-3 p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/20">
              <input
                type="checkbox"
                name="ativo"
                id="ativoCheckbox"
                checked={formData.ativo ?? true}
                onChange={handleChange}
                className="w-5 h-5 rounded border-emerald-600 text-emerald-500 focus:ring-emerald-500 bg-[#0b1324] cursor-pointer"
              />
              <label htmlFor="ativoCheckbox" className="text-sm font-bold text-emerald-400 cursor-pointer select-none">
                Equipamento Ativo e Liberado para Uso
              </label>
            </div>

          </form>
        </div>

        {/* FOOTER */}
        <div className="p-6 border-t border-white/5 bg-[#0b1324]/50 rounded-b-[30px] flex justify-end gap-4">
          <button onClick={onClose} className="px-6 py-3 text-sm font-bold text-gray-400 hover:text-white transition-colors">
            Cancelar
          </button>
          <button 
            type="submit" 
            form="balanca-form" 
            disabled={loading}
            className="px-8 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-sm font-black rounded-xl hover:scale-[1.02] transition-all disabled:opacity-50 disabled:hover:scale-100 shadow-[0_0_20px_rgba(139,92,246,0.30)]"
          >
            {loading ? 'Salvando...' : 'Salvar Equipamento'}
          </button>
        </div>
      </div>
    </div>
  );
}