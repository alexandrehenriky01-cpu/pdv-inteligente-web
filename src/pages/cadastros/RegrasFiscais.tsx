import { useEffect, useState, type FormEvent } from 'react';
import { api } from '../../services/api';
import { Layout } from '../../components/Layout';
import { Settings2, Plus, Edit2, ShieldAlert, CheckCircle2, XCircle } from 'lucide-react';
import { AxiosError } from 'axios';

interface RegraFiscal {
  id?: string;
  nome: string;
  tipoOperacao: 'ENTRADA' | 'SAIDA';
  ncmAlvo: string;
  ufDestino: string;
  cfop: string;
  cstCsosn: string;
  aliqIcms: number;
  percReducaoBcIcms: number;
  aliqIcmsSt: number;
  margemValorAgregado: number;
  cstPis: string;
  aliqPis: number;
  cstCofins: string;
  aliqCofins: number;
  cstIpi: string;
  aliqIpi: number;
  ativa: boolean;
}

export function RegrasFiscais() {
  const [regras, setRegras] = useState<RegraFiscal[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalAberto, setModalAberto] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState<'SAIDA' | 'ENTRADA'>('SAIDA');
  
  const estadoInicial: RegraFiscal = {
    nome: '', tipoOperacao: 'SAIDA', ncmAlvo: '', ufDestino: '', cfop: '', cstCsosn: '',
    aliqIcms: 0, percReducaoBcIcms: 0, aliqIcmsSt: 0, margemValorAgregado: 0,
    cstPis: '', aliqPis: 0, cstCofins: '', aliqCofins: 0, cstIpi: '', aliqIpi: 0, ativa: true
  };

  const [regraAtual, setRegraAtual] = useState<RegraFiscal>(estadoInicial);

  const carregarRegras = async () => {
    try {
      setLoading(true);
      // 🚀 FIM DO ANY: Tipagem estrita e rota padronizada
      const response = await api.get<RegraFiscal[]>('/api/regras-fiscais');
      setRegras(response.data);
    } catch (error) {
      console.error("Erro ao carregar regras:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregarRegras(); }, []);

  const salvarRegra = async (e: FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const payload = {
        ...regraAtual,
        aliqIcms: Number(regraAtual.aliqIcms), 
        percReducaoBcIcms: Number(regraAtual.percReducaoBcIcms),
        aliqIcmsSt: Number(regraAtual.aliqIcmsSt), 
        margemValorAgregado: Number(regraAtual.margemValorAgregado),
        aliqPis: Number(regraAtual.aliqPis), 
        aliqCofins: Number(regraAtual.aliqCofins), 
        aliqIpi: Number(regraAtual.aliqIpi)
      };

      if (regraAtual.id) {
        // 🚀 Rota padronizada
        await api.put<RegraFiscal>(`/api/regras-fiscais/${regraAtual.id}`, payload);
      } else {
        // 🚀 Rota padronizada
        await api.post<RegraFiscal>('/api/regras-fiscais', payload);
      }
      
      setModalAberto(false);
      carregarRegras();
    } catch (err) {
      const error = err as AxiosError<{error?: string}>;
      alert(error.response?.data?.error || "Erro ao salvar regra fiscal.");
    } finally {
      setLoading(false);
    }
  };

  const regrasFiltradas = regras.filter(r => r.tipoOperacao === abaAtiva);

  // Classes padrão do nosso Design System Dark
  const inputClass = "w-full p-2.5 bg-[#0b1324] border border-white/10 text-white rounded-xl focus:outline-none focus:border-violet-500/40 focus:ring-2 focus:ring-violet-500/20 transition-all placeholder:text-slate-500 text-sm";
  const labelClass = "block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-[0.16em]";

  return (
    <Layout>
      <div className="mx-auto max-w-7xl space-y-6 pb-12">
        
        {/* CABEÇALHO */}
        <div className="relative flex flex-col justify-between gap-4 overflow-hidden rounded-[30px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(139,92,246,0.16),_transparent_26%),radial-gradient(circle_at_top_right,_rgba(16,185,129,0.10),_transparent_20%),linear-gradient(135deg,_#0b1020_0%,_#08101f_45%,_#0a1224_100%)] p-6 shadow-[0_25px_70px_rgba(0,0,0,0.40)] md:flex-row md:items-center">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-violet-300">Fiscal Intelligence</div>
            <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
              <Settings2 className="w-8 h-8 text-violet-300" /> Motor Tributário
            </h1>
            <p className="text-slate-400 mt-1">Regras complexas para operações Estaduais (CFOP 5) e Interestaduais (CFOP 6).</p>
          </div>
          <button 
            onClick={() => { setRegraAtual({...estadoInicial, tipoOperacao: abaAtiva}); setModalAberto(true); }} 
            className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white px-6 py-3 rounded-xl font-bold shadow-[0_0_20px_rgba(139,92,246,0.30)] transition-all hover:scale-[1.02] flex items-center gap-2"
          >
            <Plus className="w-5 h-5" /> Nova Regra
          </button>
        </div>

        {/* ABAS */}
        <div className="flex gap-4 border-b border-slate-800 pb-4">
          <button 
            onClick={() => setAbaAtiva('SAIDA')} 
            className={`px-6 py-2.5 rounded-lg font-bold transition-all ${abaAtiva === 'SAIDA' ? 'bg-violet-500/15 text-violet-300 border border-violet-500/30 shadow-inner' : 'bg-[#08101f] text-slate-500 hover:bg-white/5 border border-white/10'}`}
          >
            Vendas (Saídas)
          </button>
          <button 
            onClick={() => setAbaAtiva('ENTRADA')} 
            className={`px-6 py-2.5 rounded-lg font-bold transition-all ${abaAtiva === 'ENTRADA' ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-inner' : 'bg-[#08101f] text-slate-500 hover:bg-white/5 border border-white/10'}`}
          >
            Compras (Entradas)
          </button>
        </div>

        {/* LISTAGEM */}
        <div className="bg-[#08101f]/90 backdrop-blur-xl rounded-[30px] shadow-[0_25px_60px_rgba(0,0,0,0.35)] border border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-[#0b1324] border-b border-white/10">
                <tr>
                  <th className="p-4 text-xs font-black text-slate-400 uppercase tracking-wider">Nome da Regra</th>
                  <th className="p-4 text-xs font-black text-slate-400 uppercase tracking-wider">NCM / UF Destino</th>
                  <th className="p-4 text-xs font-black text-slate-400 uppercase tracking-wider">CFOP / CST</th>
                  <th className="p-4 text-xs font-black text-slate-400 uppercase tracking-wider text-center">Status</th>
                  <th className="p-4 text-xs font-black text-slate-400 uppercase tracking-wider text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {regrasFiltradas.length === 0 ? (
                  <tr><td colSpan={5} className="p-12 text-center text-slate-500">Nenhuma regra cadastrada para esta operação.</td></tr>
                ) : (
                  regrasFiltradas.map(regra => (
                    <tr key={regra.id} className="hover:bg-white/5 transition-colors">
                      <td className="p-4 font-bold text-white flex items-center gap-2">
                        <ShieldAlert className="w-4 h-4 text-violet-300" /> {regra.nome}
                      </td>
                      <td className="p-4">
                        <span className="block text-xs text-slate-400">NCM: {regra.ncmAlvo || 'Todos'}</span>
                        <span className="block text-xs font-bold text-violet-300 mt-0.5">UF: {regra.ufDestino || 'Todas (Geral)'}</span>
                      </td>
                      <td className="p-4">
                        <span className="bg-[#0b1324] border border-white/10 px-2 py-1 rounded font-mono font-bold text-violet-300 text-xs mr-2">{regra.cfop}</span>
                        <span className="bg-[#0b1324] border border-white/10 px-2 py-1 rounded font-mono font-bold text-fuchsia-300 text-xs">{regra.cstCsosn}</span>
                      </td>
                      <td className="p-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black border uppercase ${regra.ativa ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' : 'bg-red-500/10 text-red-300 border-red-500/20'}`}>
                          {regra.ativa ? <CheckCircle2 className="w-3 h-3"/> : <XCircle className="w-3 h-3"/>}
                          {regra.ativa ? 'ATIVA' : 'INATIVA'}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <button onClick={() => { setRegraAtual(regra); setModalAberto(true); }} className="p-2 bg-[#0b1324] hover:bg-violet-500/20 text-slate-400 hover:text-violet-300 rounded-lg transition-colors border border-white/10">
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL DARK MODE */}
      {modalAberto && (
        <div className="fixed inset-0 bg-[#020617]/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#08101f] border border-white/10 rounded-[30px] shadow-[0_25px_80px_rgba(0,0,0,0.60)] w-full max-w-5xl flex flex-col max-h-[90vh] overflow-hidden">
            
            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-[#0b1324]/70">
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                <Settings2 className="w-6 h-6 text-violet-300" />
                {regraAtual.id ? 'Editar Regra Fiscal' : 'Nova Regra Fiscal'}
              </h2>
              <button onClick={() => setModalAberto(false)} className="text-slate-500 hover:text-red-300 transition-colors">
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={salvarRegra} className="p-6 overflow-y-auto flex-1 space-y-6 custom-scrollbar">
              
              {/* BLOCO 1: CONDIÇÕES */}
              <div className="bg-[#0b1324]/70 p-5 rounded-2xl border border-white/10">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-[0.16em] mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-violet-300"></span> 1. Condições da Regra
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-2">
                    <label className={labelClass}>Nome da Regra</label>
                    <input required type="text" value={regraAtual.nome} onChange={e => setRegraAtual({...regraAtual, nome: e.target.value})} className={inputClass} placeholder="Ex: Venda SP para RJ - NCM 1234" />
                  </div>
                  <div>
                    <label className={labelClass}>NCM Alvo</label>
                    <input type="text" placeholder="Vazio = Todos" value={regraAtual.ncmAlvo} onChange={e => setRegraAtual({...regraAtual, ncmAlvo: e.target.value.replace(/\D/g, '')})} maxLength={8} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>UF Destino</label>
                    <input type="text" placeholder="Ex: RJ (Vazio = Todas)" value={regraAtual.ufDestino} onChange={e => setRegraAtual({...regraAtual, ufDestino: e.target.value.toUpperCase()})} maxLength={2} className={`${inputClass} font-bold`} />
                  </div>
                </div>
              </div>

              {/* BLOCO 2: ICMS E ICMS ST */}
              <div className="bg-violet-950/15 p-5 rounded-2xl border border-violet-500/20">
                <h3 className="text-xs font-bold text-violet-300 uppercase tracking-[0.16em] mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-violet-300"></span> 2. ICMS e Substituição Tributária (ST)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                  <div className="md:col-span-2">
                    <label className={labelClass}>CFOP <span className="text-red-500">*</span></label>
                    <input required type="text" placeholder="Ex: 5102 / 6102" value={regraAtual.cfop} onChange={e => setRegraAtual({...regraAtual, cfop: e.target.value.replace(/\D/g, '')})} maxLength={4} className={inputClass} />
                  </div>
                  <div className="md:col-span-2">
                    <label className={labelClass}>CST/CSOSN <span className="text-red-500">*</span></label>
                    <input required type="text" placeholder="Ex: 102 / 500" value={regraAtual.cstCsosn} onChange={e => setRegraAtual({...regraAtual, cstCsosn: e.target.value.replace(/\D/g, '')})} maxLength={3} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>% ICMS</label>
                    <input type="number" step="0.01" value={regraAtual.aliqIcms} onChange={e => setRegraAtual({...regraAtual, aliqIcms: parseFloat(e.target.value) || 0})} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>% Redução BC</label>
                    <input type="number" step="0.01" value={regraAtual.percReducaoBcIcms} onChange={e => setRegraAtual({...regraAtual, percReducaoBcIcms: parseFloat(e.target.value) || 0})} className={inputClass} />
                  </div>
                  
                  {/* Linha ST */}
                  <div className="md:col-span-3">
                    <label className={labelClass}>% ICMS ST</label>
                    <input type="number" step="0.01" value={regraAtual.aliqIcmsSt} onChange={e => setRegraAtual({...regraAtual, aliqIcmsSt: parseFloat(e.target.value) || 0})} className={inputClass} />
                  </div>
                  <div className="md:col-span-3">
                    <label className={labelClass}>% MVA / IVA-ST</label>
                    <input type="number" step="0.01" value={regraAtual.margemValorAgregado} onChange={e => setRegraAtual({...regraAtual, margemValorAgregado: parseFloat(e.target.value) || 0})} className={inputClass} />
                  </div>
                </div>
              </div>

              {/* BLOCO 3: PIS, COFINS E IPI */}
              <div className="bg-amber-950/15 p-5 rounded-2xl border border-amber-500/20">
                <h3 className="text-xs font-bold text-amber-300 uppercase tracking-[0.16em] mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-300"></span> 3. Tributos Federais (PIS, COFINS e IPI)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                  <div>
                    <label className={labelClass}>CST PIS</label>
                    <input type="text" value={regraAtual.cstPis} onChange={e => setRegraAtual({...regraAtual, cstPis: e.target.value.replace(/\D/g, '')})} maxLength={2} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>% PIS</label>
                    <input type="number" step="0.01" value={regraAtual.aliqPis} onChange={e => setRegraAtual({...regraAtual, aliqPis: parseFloat(e.target.value) || 0})} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>CST COFINS</label>
                    <input type="text" value={regraAtual.cstCofins} onChange={e => setRegraAtual({...regraAtual, cstCofins: e.target.value.replace(/\D/g, '')})} maxLength={2} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>% COFINS</label>
                    <input type="number" step="0.01" value={regraAtual.aliqCofins} onChange={e => setRegraAtual({...regraAtual, aliqCofins: parseFloat(e.target.value) || 0})} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>CST IPI</label>
                    <input type="text" value={regraAtual.cstIpi} onChange={e => setRegraAtual({...regraAtual, cstIpi: e.target.value.replace(/\D/g, '')})} maxLength={2} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>% IPI</label>
                    <input type="number" step="0.01" value={regraAtual.aliqIpi} onChange={e => setRegraAtual({...regraAtual, aliqIpi: parseFloat(e.target.value) || 0})} className={inputClass} />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 mt-4 p-4 bg-[#0b1324]/70 rounded-2xl border border-white/10 cursor-pointer" onClick={() => setRegraAtual({...regraAtual, ativa: !regraAtual.ativa})}>
                <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${regraAtual.ativa ? 'bg-violet-500 border-violet-400' : 'bg-[#08101f] border-white/10'}`}>
                  {regraAtual.ativa && <CheckCircle2 className="w-4 h-4 text-white" />}
                </div>
                <span className="font-bold text-slate-300">Regra Ativa no Sistema</span>
              </div>

              <div className="pt-6 border-t border-slate-800 flex gap-4">
                <button type="button" onClick={() => setModalAberto(false)} className="flex-1 py-3.5 font-bold text-slate-300 bg-white/5 hover:bg-white/10 hover:text-white rounded-xl transition-colors border border-white/10">
                  Cancelar
                </button>
                <button type="submit" disabled={loading} className="flex-1 py-3.5 font-black text-white bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-xl shadow-[0_0_20px_rgba(139,92,246,0.30)] transition-all disabled:opacity-50 hover:scale-[1.01]">
                  {loading ? 'Salvando...' : '💾 Salvar Regra Completa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}