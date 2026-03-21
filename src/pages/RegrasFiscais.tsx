import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Layout } from '../components/Layout';

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
      const response = await api.get('/regras-fiscais');
      setRegras(response.data);
    } catch (error) {
      console.error("Erro ao carregar regras:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregarRegras(); }, []);

  const salvarRegra = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const payload = {
        ...regraAtual,
        aliqIcms: Number(regraAtual.aliqIcms), percReducaoBcIcms: Number(regraAtual.percReducaoBcIcms),
        aliqIcmsSt: Number(regraAtual.aliqIcmsSt), margemValorAgregado: Number(regraAtual.margemValorAgregado),
        aliqPis: Number(regraAtual.aliqPis), aliqCofins: Number(regraAtual.aliqCofins), aliqIpi: Number(regraAtual.aliqIpi)
      };

      if (regraAtual.id) await api.put(`/regras-fiscais/${regraAtual.id}`, payload);
      else await api.post('/regras-fiscais', payload);
      
      setModalAberto(false);
      carregarRegras();
    } catch (error) {
      alert("Erro ao salvar regra fiscal.");
    } finally {
      setLoading(false);
    }
  };

  const regrasFiltradas = regras.filter(r => r.tipoOperacao === abaAtiva);

  return (
    <Layout>
      <div className="flex flex-col h-full">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-800">Motor Tributário Enterprise</h1>
            <p className="text-slate-500">Regras complexas para operações Estaduais e Interestaduais.</p>
          </div>
          <button onClick={() => { setRegraAtual({...estadoInicial, tipoOperacao: abaAtiva}); setModalAberto(true); }} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg">
            + Nova Regra
          </button>
        </div>

        <div className="flex gap-4 mb-6 border-b border-slate-200 pb-4">
          <button onClick={() => setAbaAtiva('SAIDA')} className={`px-6 py-2 rounded-lg font-bold transition-all ${abaAtiva === 'SAIDA' ? 'bg-emerald-100 text-emerald-700 border-2 border-emerald-500' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>Vendas (Saídas)</button>
          <button onClick={() => setAbaAtiva('ENTRADA')} className={`px-6 py-2 rounded-lg font-bold transition-all ${abaAtiva === 'ENTRADA' ? 'bg-orange-100 text-orange-700 border-2 border-orange-500' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>Compras (Entradas)</button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex-1">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="p-4 text-sm font-bold text-slate-600">Nome da Regra</th>
                <th className="p-4 text-sm font-bold text-slate-600">NCM / UF Destino</th>
                <th className="p-4 text-sm font-bold text-slate-600">CFOP / CST</th>
                <th className="p-4 text-sm font-bold text-slate-600 text-center">Status</th>
                <th className="p-4 text-sm font-bold text-slate-600 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {regrasFiltradas.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-slate-500">Nenhuma regra cadastrada.</td></tr>
              ) : (
                regrasFiltradas.map(regra => (
                  <tr key={regra.id} className="hover:bg-blue-50">
                    <td className="p-4 font-bold text-slate-800">{regra.nome}</td>
                    <td className="p-4 text-slate-600">
                      <span className="block text-xs">NCM: {regra.ncmAlvo || 'Todos'}</span>
                      <span className="block text-xs font-bold text-blue-600">UF: {regra.ufDestino || 'Todas (Geral)'}</span>
                    </td>
                    <td className="p-4">
                      <span className="font-mono font-bold text-blue-600 mr-2">{regra.cfop}</span>
                      <span className="font-mono font-bold text-purple-600">{regra.cstCsosn}</span>
                    </td>
                    <td className="p-4 text-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${regra.ativa ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {regra.ativa ? 'ATIVA' : 'INATIVA'}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <button onClick={() => { setRegraAtual(regra); setModalAberto(true); }} className="text-blue-500 font-bold">Editar</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalAberto && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h2 className="text-xl font-bold text-slate-800">{regraAtual.id ? 'Editar Regra Fiscal' : 'Nova Regra Fiscal'}</h2>
              <button onClick={() => setModalAberto(false)} className="text-slate-400 hover:text-red-500 text-2xl font-bold">&times;</button>
            </div>
            
            <form onSubmit={salvarRegra} className="p-6 overflow-y-auto flex-1 space-y-6">
              
              {/* BLOCO 1: CONDIÇÕES */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <h3 className="text-sm font-bold text-slate-500 uppercase mb-4">1. Condições da Regra (Quando ela será aplicada?)</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-slate-700 mb-1">Nome da Regra</label>
                    <input required type="text" value={regraAtual.nome} onChange={e => setRegraAtual({...regraAtual, nome: e.target.value})} className="w-full p-2 border-2 border-slate-200 rounded-lg outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">NCM Alvo</label>
                    <input type="text" placeholder="Vazio = Todos" value={regraAtual.ncmAlvo} onChange={e => setRegraAtual({...regraAtual, ncmAlvo: e.target.value.replace(/\D/g, '')})} maxLength={8} className="w-full p-2 border-2 border-slate-200 rounded-lg outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">UF Destino do Cliente</label>
                    <input type="text" placeholder="Ex: SP, RJ (Vazio = Todas)" value={regraAtual.ufDestino} onChange={e => setRegraAtual({...regraAtual, ufDestino: e.target.value.toUpperCase()})} maxLength={2} className="w-full p-2 border-2 border-slate-200 rounded-lg outline-none focus:border-blue-500 font-bold" />
                  </div>
                </div>
              </div>

              {/* BLOCO 2: ICMS E ICMS ST */}
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                <h3 className="text-sm font-bold text-blue-600 uppercase mb-4">2. ICMS e Substituição Tributária (ST)</h3>
                <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-slate-700 mb-1">CFOP <span className="text-red-500">*</span></label>
                    <input required type="text" value={regraAtual.cfop} onChange={e => setRegraAtual({...regraAtual, cfop: e.target.value.replace(/\D/g, '')})} maxLength={4} className="w-full p-2 border-2 border-blue-200 rounded-lg" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-slate-700 mb-1">CST/CSOSN <span className="text-red-500">*</span></label>
                    <input required type="text" value={regraAtual.cstCsosn} onChange={e => setRegraAtual({...regraAtual, cstCsosn: e.target.value.replace(/\D/g, '')})} maxLength={3} className="w-full p-2 border-2 border-blue-200 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">% ICMS</label>
                    <input type="number" step="0.01" value={regraAtual.aliqIcms} onChange={e => setRegraAtual({...regraAtual, aliqIcms: parseFloat(e.target.value) || 0})} className="w-full p-2 border-2 border-blue-200 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">% Redução BC</label>
                    <input type="number" step="0.01" value={regraAtual.percReducaoBcIcms} onChange={e => setRegraAtual({...regraAtual, percReducaoBcIcms: parseFloat(e.target.value) || 0})} className="w-full p-2 border-2 border-blue-200 rounded-lg" />
                  </div>
                  
                  {/* Linha ST */}
                  <div className="md:col-span-3">
                    <label className="block text-sm font-bold text-slate-700 mb-1">% ICMS ST</label>
                    <input type="number" step="0.01" value={regraAtual.aliqIcmsSt} onChange={e => setRegraAtual({...regraAtual, aliqIcmsSt: parseFloat(e.target.value) || 0})} className="w-full p-2 border-2 border-blue-200 rounded-lg" />
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-sm font-bold text-slate-700 mb-1">% MVA / IVA-ST</label>
                    <input type="number" step="0.01" value={regraAtual.margemValorAgregado} onChange={e => setRegraAtual({...regraAtual, margemValorAgregado: parseFloat(e.target.value) || 0})} className="w-full p-2 border-2 border-blue-200 rounded-lg" />
                  </div>
                </div>
              </div>

              {/* BLOCO 3: PIS, COFINS E IPI */}
              <div className="bg-orange-50 p-4 rounded-xl border border-orange-100">
                <h3 className="text-sm font-bold text-orange-600 uppercase mb-4">3. Tributos Federais (PIS, COFINS e IPI)</h3>
                <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">CST PIS</label>
                    <input type="text" value={regraAtual.cstPis} onChange={e => setRegraAtual({...regraAtual, cstPis: e.target.value.replace(/\D/g, '')})} maxLength={2} className="w-full p-2 border-2 border-orange-200 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">% PIS</label>
                    <input type="number" step="0.01" value={regraAtual.aliqPis} onChange={e => setRegraAtual({...regraAtual, aliqPis: parseFloat(e.target.value) || 0})} className="w-full p-2 border-2 border-orange-200 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">CST COFINS</label>
                    <input type="text" value={regraAtual.cstCofins} onChange={e => setRegraAtual({...regraAtual, cstCofins: e.target.value.replace(/\D/g, '')})} maxLength={2} className="w-full p-2 border-2 border-orange-200 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">% COFINS</label>
                    <input type="number" step="0.01" value={regraAtual.aliqCofins} onChange={e => setRegraAtual({...regraAtual, aliqCofins: parseFloat(e.target.value) || 0})} className="w-full p-2 border-2 border-orange-200 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">CST IPI</label>
                    <input type="text" value={regraAtual.cstIpi} onChange={e => setRegraAtual({...regraAtual, cstIpi: e.target.value.replace(/\D/g, '')})} maxLength={2} className="w-full p-2 border-2 border-orange-200 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">% IPI</label>
                    <input type="number" step="0.01" value={regraAtual.aliqIpi} onChange={e => setRegraAtual({...regraAtual, aliqIpi: parseFloat(e.target.value) || 0})} className="w-full p-2 border-2 border-orange-200 rounded-lg" />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                <input type="checkbox" id="ativa" checked={regraAtual.ativa} onChange={e => setRegraAtual({...regraAtual, ativa: e.target.checked})} className="w-5 h-5 accent-blue-600" />
                <label htmlFor="ativa" className="font-bold text-slate-700">Regra Ativa no Sistema</label>
              </div>

              <div className="pt-4 border-t border-slate-200 flex gap-4">
                <button type="button" onClick={() => setModalAberto(false)} className="flex-1 py-3 font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg">Cancelar</button>
                <button type="submit" disabled={loading} className="flex-1 py-3 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg">
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