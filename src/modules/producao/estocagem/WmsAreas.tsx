import React, { useState, useEffect } from 'react';
import { Layout } from '../../../components/Layout';
import { api } from '../../../services/api';
import { toast } from 'react-toastify';
import { 
  ThermometerSnowflake, Plus, MapPin, Layers, 
  Settings2, Loader2, ArrowRight, Box 
} from 'lucide-react';

// Tipagens baseadas no nosso Backend
interface AreaArmazem {
  id: number;
  nome: string;
  tipo: 'CONGELADO' | 'RESFRIADO' | 'SECO' | 'QUARENTENA';
  temperatura: number | null;
  _count?: { enderecos: number };
}

export function WmsAreas() {
  const [areas, setAreas] = useState<AreaArmazem[]>([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);

  // Estados do Formulário de Nova Área
  const [mostrarFormArea, setMostrarFormArea] = useState(false);
  const [novaArea, setNovaArea] = useState({ nome: '', tipo: 'CONGELADO', temperatura: '' });

  // Estados do Gerador de Endereços
  const [areaSelecionada, setAreaSelecionada] = useState<AreaArmazem | null>(null);
  const [gerador, setGerador] = useState({ rua: '', posicoes: '', niveis: '', pesoMaximo: '1500' });

  // Carregar Áreas ao abrir a tela
  useEffect(() => {
    carregarAreas();
  }, []);

  const carregarAreas = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/wms/areas');
      setAreas(response.data);
    } catch (error) {
      toast.error("Erro ao carregar câmaras frias.");
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // CRIAR NOVA ÁREA (CÂMARA FRIA)
  // ==========================================
  const handleCriarArea = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    try {
      await api.post('/api/wms/areas', {
        nome: novaArea.nome,
        tipo: novaArea.tipo,
        temperatura: novaArea.temperatura ? Number(novaArea.temperatura) : undefined
      });
      
      toast.success("Área criada com sucesso!");
      setMostrarFormArea(false);
      setNovaArea({ nome: '', tipo: 'CONGELADO', temperatura: '' });
      carregarAreas();
    } catch (error: any) {
      toast.error(error.response?.data?.erro || "Erro ao criar área.");
    } finally {
      setSalvando(false);
    }
  };

  // ==========================================
  // GERADOR DE ENDEREÇOS EM MASSA
  // ==========================================
  const handleGerarEnderecos = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!areaSelecionada) return;

    setSalvando(true);
    try {
      const response = await api.post('/api/wms/enderecos/gerar-massa', {
        areaId: areaSelecionada.id,
        rua: gerador.rua.toUpperCase(),
        posicoes: Number(gerador.posicoes),
        niveis: Number(gerador.niveis),
        pesoMaximoPorPosicao: Number(gerador.pesoMaximo)
      });
      
      toast.success(response.data.mensagem);
      setAreaSelecionada(null);
      setGerador({ rua: '', posicoes: '', niveis: '', pesoMaximo: '1500' });
      carregarAreas(); // Recarrega para atualizar a contagem de endereços
    } catch (error: any) {
      toast.error(error.response?.data?.erro || "Erro ao gerar endereços.");
    } finally {
      setSalvando(false);
    }
  };

  const getCorTipo = (tipo: string) => {
    switch(tipo) {
      case 'CONGELADO': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'RESFRIADO': return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';
      case 'SECO': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'QUARENTENA': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const inputClass = 'w-full bg-[#0b1324] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 transition-all';

  return (
    <Layout>
      <div className="mx-auto max-w-6xl space-y-6 pb-12 animate-[fadeIn_0.5s_ease-out]">
        
        {/* HEADER */}
        <div className="flex flex-col justify-between gap-6 rounded-[30px] border border-white/10 bg-[#08101f] p-6 shadow-[0_25px_70px_rgba(0,0,0,0.40)] sm:flex-row sm:items-center sm:p-8">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-violet-300 mb-3">
              <Box className="h-3.5 w-3.5" /> WMS - Warehouse Management
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">Câmaras Frias & Áreas</h1>
            <p className="text-slate-400 mt-2 font-medium">Gerencie a estrutura física do seu armazém.</p>
          </div>
          
          <button 
            onClick={() => setMostrarFormArea(!mostrarFormArea)}
            className="bg-violet-600 hover:bg-violet-500 text-white px-6 py-3.5 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(139,92,246,0.3)]"
          >
            {mostrarFormArea ? 'Cancelar' : <><Plus className="w-5 h-5" /> Nova Área</>}
          </button>
        </div>

        {/* FORMULÁRIO DE NOVA ÁREA */}
        {mostrarFormArea && (
          <div className="bg-[#08101f]/90 backdrop-blur-xl rounded-[30px] border border-violet-500/30 p-6 md:p-8 shadow-[0_25px_60px_rgba(0,0,0,0.35)] animate-[fadeIn_0.3s_ease-out]">
            <h2 className="text-xl font-black text-white mb-6 flex items-center gap-2">
              <Settings2 className="text-violet-400" /> Cadastrar Novo Espaço Físico
            </h2>
            <form onSubmit={handleCriarArea} className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-[0.16em] mb-2 pl-1">Nome da Área *</label>
                <input required type="text" value={novaArea.nome} onChange={e => setNovaArea({...novaArea, nome: e.target.value})} className={inputClass} placeholder="Ex: Câmara Fria 01" />
              </div>
              <div>
                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-[0.16em] mb-2 pl-1">Tipo de Armazenagem *</label>
                <select value={novaArea.tipo} onChange={e => setNovaArea({...novaArea, tipo: e.target.value as any})} className={inputClass}>
                  <option value="CONGELADO">Congelado (-18ºC)</option>
                  <option value="RESFRIADO">Resfriado (0ºC a 4ºC)</option>
                  <option value="SECO">Estoque Seco</option>
                  <option value="QUARENTENA">Quarentena / Bloqueado</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-[0.16em] mb-2 pl-1">Temperatura Alvo (ºC)</label>
                <input type="number" step="0.1" value={novaArea.temperatura} onChange={e => setNovaArea({...novaArea, temperatura: e.target.value})} className={inputClass} placeholder="Ex: -18.5" />
              </div>
              <div className="md:col-span-3 flex justify-end mt-2">
                <button type="submit" disabled={salvando} className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-3 rounded-xl font-bold transition-all flex items-center gap-2">
                  {salvando ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Salvar Área'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* MODAL GERADOR DE ENDEREÇOS */}
        {areaSelecionada && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
            <div className="bg-[#08101f] border border-white/10 rounded-[30px] p-8 max-w-2xl w-full shadow-[0_0_100px_rgba(0,0,0,0.5)]">
              <h2 className="text-2xl font-black text-white mb-2 flex items-center gap-3">
                <Layers className="text-emerald-400" /> Gerador de Endereços
              </h2>
              <p className="text-slate-400 mb-8">
                Criando estrutura para: <strong className="text-white">{areaSelecionada.nome}</strong>
              </p>

              <form onSubmit={handleGerarEnderecos} className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-[0.16em] mb-2 pl-1">Letra/Nome da Rua *</label>
                    <input required type="text" maxLength={3} value={gerador.rua} onChange={e => setGerador({...gerador, rua: e.target.value})} className={`${inputClass} font-mono text-2xl uppercase`} placeholder="Ex: A" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-[0.16em] mb-2 pl-1">Peso Máx. Posição (KG)</label>
                    <input required type="number" value={gerador.pesoMaximo} onChange={e => setGerador({...gerador, pesoMaximo: e.target.value})} className={inputClass} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6 bg-[#0b1324] p-6 rounded-2xl border border-white/5">
                  <div>
                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-[0.16em] mb-2 pl-1">Qtd. Posições (Colunas) *</label>
                    <input required type="number" min="1" value={gerador.posicoes} onChange={e => setGerador({...gerador, posicoes: e.target.value})} className={inputClass} placeholder="Ex: 20" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-[0.16em] mb-2 pl-1">Qtd. Níveis (Andares) *</label>
                    <input required type="number" min="1" value={gerador.niveis} onChange={e => setGerador({...gerador, niveis: e.target.value})} className={inputClass} placeholder="Ex: 4" />
                  </div>
                </div>

                {gerador.posicoes && gerador.niveis && (
                  <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 text-center">
                    <span className="text-emerald-400 font-bold">
                      Isso irá gerar {Number(gerador.posicoes) * Number(gerador.niveis)} endereços de uma vez!
                    </span>
                  </div>
                )}

                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setAreaSelecionada(null)} className="flex-1 bg-white/5 hover:bg-white/10 text-white py-4 rounded-xl font-bold transition-all">
                    Cancelar
                  </button>
                  <button type="submit" disabled={salvando} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2">
                    {salvando ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Gerar Estrutura'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* LISTA DE ÁREAS CADASTRADAS */}
        {loading ? (
          <div className="py-12 text-center text-slate-400 font-bold flex justify-center items-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-violet-300" /> Carregando estrutura...
          </div>
        ) : areas.length === 0 ? (
          <div className="bg-[#08101f]/90 backdrop-blur-xl rounded-[30px] border border-white/10 p-12 text-center shadow-[0_25px_60px_rgba(0,0,0,0.35)]">
            <ThermometerSnowflake className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-black text-white mb-2">Nenhuma Área Cadastrada</h3>
            <p className="text-slate-400">Comece criando sua primeira Câmara Fria ou área de estoque.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {areas.map(area => (
              <div key={area.id} className="bg-[#08101f]/90 backdrop-blur-xl rounded-[24px] border border-white/10 p-6 shadow-[0_15px_40px_rgba(0,0,0,0.2)] hover:border-violet-500/30 transition-all group">
                <div className="flex justify-between items-start mb-4">
                  <div className={`text-[10px] px-2.5 py-1 rounded font-bold uppercase border ${getCorTipo(area.tipo)}`}>
                    {area.tipo}
                  </div>
                  {area.temperatura && (
                    <div className="flex items-center gap-1 text-cyan-400 font-mono font-bold text-sm bg-cyan-500/10 px-2 py-1 rounded-lg">
                      <ThermometerSnowflake className="w-3.5 h-3.5" /> {area.temperatura}ºC
                    </div>
                  )}
                </div>
                
                <h3 className="text-2xl font-black text-white mb-2">{area.nome}</h3>
                
                <div className="flex items-center gap-2 text-slate-400 mb-6 bg-white/5 w-fit px-3 py-1.5 rounded-lg">
                  <MapPin className="w-4 h-4 text-emerald-400" />
                  <span className="font-bold text-white">{area._count?.enderecos || 0}</span> posições geradas
                </div>

                <button 
                  onClick={() => setAreaSelecionada(area)}
                  className="w-full bg-[#0b1324] hover:bg-violet-600 border border-white/10 hover:border-violet-500 text-slate-300 hover:text-white py-3.5 rounded-xl font-bold transition-all flex items-center justify-center gap-2 group-hover:shadow-[0_0_20px_rgba(139,92,246,0.2)]"
                >
                  <Layers className="w-4 h-4" /> Gerar Endereços
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}