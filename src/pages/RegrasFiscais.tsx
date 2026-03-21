import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Layout } from '../components/Layout';

interface RegraFiscal {
  id?: string;
  nome: string;
  tipoOperacao: 'ENTRADA' | 'SAIDA';
  ncmAlvo: string;
  cfop: string;
  cstCsosn: string;
  cstPis: string;
  cstCofins: string;
  aliqIcms: number;
  aliqPis: number;
  aliqCofins: number;
  ativa: boolean;
}

export function RegrasFiscais() {
  const [regras, setRegras] = useState<RegraFiscal[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalAberto, setModalAberto] = useState(false);
  
  // ✅ CORRIGIDO AQUI: Trocado &lt; por <
  const [abaAtiva, setAbaAtiva] = useState<'SAIDA' | 'ENTRADA'>('SAIDA');
  
  const [regraAtual, setRegraAtual] = useState<RegraFiscal>({
    nome: '', tipoOperacao: 'SAIDA', ncmAlvo: '', cfop: '', cstCsosn: '',
    cstPis: '', cstCofins: '', aliqIcms: 0, aliqPis: 0, aliqCofins: 0, ativa: true
  });

  // Busca as regras no backend
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

  useEffect(() => {
    carregarRegras();
  }, []);

  const salvarRegra = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      if (regraAtual.id) {
        await api.put(`/regras-fiscais/${regraAtual.id}`, regraAtual);
      } else {
        await api.post('/regras-fiscais', regraAtual);
      }
      setModalAberto(false);
      carregarRegras();
    } catch (error) {
      console.error("Erro ao salvar regra:", error);
      alert("Erro ao salvar regra fiscal.");
    } finally {
      setLoading(false);
    }
  };

  const abrirNovaRegra = () => {
    setRegraAtual({
      nome: '', tipoOperacao: abaAtiva, ncmAlvo: '', cfop: '', cstCsosn: '',
      cstPis: '', cstCofins: '', aliqIcms: 0, aliqPis: 0, aliqCofins: 0, ativa: true
    });
    setModalAberto(true);
  };

  const regrasFiltradas = regras.filter(r => r.tipoOperacao === abaAtiva);

  return (
    <Layout>
      <div className="flex flex-col h-full">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-800">Motor Tributário</h1>
            <p className="text-slate-500">Gerencie as regras de exceção fiscal (ST, Entradas, etc).</p>
          </div>
          <button onClick={abrirNovaRegra} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg transition-all">
            + Nova Regra
          </button>
        </div>

        {/* Abas */}
        <div className="flex gap-4 mb-6 border-b border-slate-200 pb-4">
          <button 
            onClick={() => setAbaAtiva('SAIDA')}
            className={`px-6 py-2 rounded-lg font-bold transition-all ${abaAtiva === 'SAIDA' ? 'bg-emerald-100 text-emerald-700 border-2 border-emerald-500' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
          >
            Vendas (Saídas)
          </button>
          <button 
            onClick={() => setAbaAtiva('ENTRADA')}
            className={`px-6 py-2 rounded-lg font-bold transition-all ${abaAtiva === 'ENTRADA' ? 'bg-orange-100 text-orange-700 border-2 border-orange-500' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
          >
            Compras (Entradas)
          </button>
        </div>

        {/* Lista de Regras */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex-1">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="p-4 text-sm font-bold text-slate-600">Nome da Regra</th>
                <th className="p-4 text-sm font-bold text-slate-600">Condição (NCM)</th>
                <th className="p-4 text-sm font-bold text-slate-600">CFOP</th>
                <th className="p-4 text-sm font-bold text-slate-600">CST/CSOSN</th>
                <th className="p-4 text-sm font-bold text-slate-600 text-center">Status</th>
                <th className="p-4 text-sm font-bold text-slate-600 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {regrasFiltradas.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-slate-500">Nenhuma regra cadastrada para {abaAtiva.toLowerCase()}. O sistema usará os dados do cadastro do produto.</td></tr>
              ) : (
                regrasFiltradas.map(regra => (
                  <tr key={regra.id} className="hover:bg-blue-50 transition-colors">
                    <td className="p-4 font-bold text-slate-800">{regra.nome}</td>
                    <td className="p-4 text-slate-600">{regra.ncmAlvo ? `NCM: ${regra.ncmAlvo}` : 'Todos (Geral)'}</td>
                    <td className="p-4 font-mono font-bold text-blue-600">{regra.cfop}</td>
                    <td className="p-4 font-mono font-bold text-purple-600">{regra.cstCsosn}</td>
                    <td className="p-4 text-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${regra.ativa ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {regra.ativa ? 'ATIVA' : 'INATIVA'}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <button onClick={() => { setRegraAtual(regra); setModalAberto(true); }} className="text-blue-500 hover:text-blue-700 font-bold">Editar</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Cadastro/Edição */}
      {modalAberto && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h2 className="text-xl font-bold text-slate-800">{regraAtual.id ? 'Editar Regra Fiscal' : 'Nova Regra Fiscal'}</h2>
              <button onClick={() => setModalAberto(false)} className="text-slate-400 hover:text-red-500 text-2xl font-bold">&times;</button>
            </div>
            
            <form onSubmit={salvarRegra} className="p-6 overflow-y-auto flex-1 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-bold text-slate-700 mb-1">Nome da Regra (Ex: Venda de Bebidas ST)</label>
                  <input required type="text" value={regraAtual.nome} onChange={e => setRegraAtual({...regraAtual, nome: e.target.value})} className="w-full p-3 border-2 border-slate-200 rounded-lg outline-none focus:border-blue-500" />
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Tipo de Operação</label>
                  <select value={regraAtual.tipoOperacao} onChange={e => setRegraAtual({...regraAtual, tipoOperacao: e.target.value as any})} className="w-full p-3 border-2 border-slate-200 rounded-lg outline-none focus:border-blue-500 bg-white">
                    <option value="SAIDA">SAÍDA (Vendas)</option>
                    <option value="ENTRADA">ENTRADA (Compras)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">NCM Alvo (Condição)</label>
                  <input type="text" placeholder="Ex: 25171000 (Deixe vazio p/ todos)" value={regraAtual.ncmAlvo} onChange={e => setRegraAtual({...regraAtual, ncmAlvo: e.target.value.replace(/\D/g, '')})} maxLength={8} className="w-full p-3 border-2 border-slate-200 rounded-lg outline-none focus:border-blue-500" />
                  <span className="text-xs text-slate-400 mt-1 block">Se preenchido, a regra só aplica a este NCM.</span>
                </div>
              </div>

              <h3 className="text-sm font-bold text-slate-500 uppercase border-b pb-2 mt-6">Resultados a Aplicar</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">CFOP a Aplicar <span className="text-red-500">*</span></label>
                  <input required type="text" placeholder="Ex: 5405" value={regraAtual.cfop} onChange={e => setRegraAtual({...regraAtual, cfop: e.target.value.replace(/\D/g, '')})} maxLength={4} className="w-full p-3 border-2 border-slate-200 rounded-lg outline-none focus:border-blue-500 font-mono" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">CST/CSOSN a Aplicar <span className="text-red-500">*</span></label>
                  <input required type="text" placeholder="Ex: 500" value={regraAtual.cstCsosn} onChange={e => setRegraAtual({...regraAtual, cstCsosn: e.target.value.replace(/\D/g, '')})} maxLength={3} className="w-full p-3 border-2 border-slate-200 rounded-lg outline-none focus:border-blue-500 font-mono" />
                </div>
              </div>

              <div className="flex items-center gap-3 mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                <input type="checkbox" id="ativa" checked={regraAtual.ativa} onChange={e => setRegraAtual({...regraAtual, ativa: e.target.checked})} className="w-5 h-5 cursor-pointer accent-blue-600" />
                <label htmlFor="ativa" className="font-bold text-slate-700 cursor-pointer">Regra Ativa no Sistema</label>
              </div>

              <div className="pt-4 border-t border-slate-200 flex gap-4">
                <button type="button" onClick={() => setModalAberto(false)} className="flex-1 py-3 font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">Cancelar</button>
                <button type="submit" disabled={loading} className="flex-1 py-3 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-lg">
                  {loading ? 'Salvando...' : '💾 Salvar Regra'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}