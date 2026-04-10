import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Layout } from '../../components/Layout';
import { AxiosError } from 'axios'; 

// 🛡️ INTERFACE DE TIPAGEM ESTRITA
export interface ICfop {
  id?: string;
  codigo: string;
  descricao: string;
  tipoOperacao: 'ENTRADA' | 'SAIDA' | string;
  aplicacao: 'COMERCIALIZACAO' | 'USO_CONSUMO' | 'ATIVO_IMOBILIZADO' | 'SERVICO' | 'REMESSA_RETORNO' | 'OUTROS' | string;
  movimentaEstoque: boolean;
  geraFinanceiro: boolean;
  somaFaturamento: boolean;
  operacaoDevolucao: boolean;
  calculaTributos: boolean;
  cfopInverso: string;
  contaContabil: string;
  
  // Impostos Atuais
  cstIcmsPadrao: string;
  aliquotaIcmsPadrao: string | number;
  cstPisPadrao: string;
  aliquotaPisPadrao: string | number;
  cstCofinsPadrao: string;
  aliquotaCofinsPadrao: string | number;
  cstIpiPadrao: string;
  aliquotaIpiPadrao: string | number;
  
  // Reforma Tributária
  cstIbsCbsPadrao: string;
  aliquotaIbsPadrao: string | number;
  aliquotaCbsPadrao: string | number;
  aliquotaIsPadrao: string | number;
}

export function CadastroCfop() {
  const [cfops, setCfops] = useState<ICfop[]>([]);
  const [loading, setLoading] = useState(false);
  
  const estadoInicial: ICfop = {
    codigo: '',
    descricao: '',
    tipoOperacao: 'ENTRADA',
    aplicacao: 'COMERCIALIZACAO',
    movimentaEstoque: true,
    geraFinanceiro: true,
    somaFaturamento: true,
    operacaoDevolucao: false,
    calculaTributos: true,
    cfopInverso: '',
    contaContabil: '',
    
    cstIcmsPadrao: '', aliquotaIcmsPadrao: '',
    cstPisPadrao: '', aliquotaPisPadrao: '',
    cstCofinsPadrao: '', aliquotaCofinsPadrao: '',
    cstIpiPadrao: '', aliquotaIpiPadrao: '',
    
    cstIbsCbsPadrao: '',
    aliquotaIbsPadrao: '',
    aliquotaCbsPadrao: '',
    aliquotaIsPadrao: ''
  };

  const [formData, setFormData] = useState<ICfop>(estadoInicial);

  const carregarCfops = async () => {
    try {
      // 🚀 FIM DO ANY: Tipagem estrita na resposta da API
      const response = await api.get<ICfop[]>('/api/cfops');
      setCfops(response.data);
    } catch (error) {
      console.error("Erro ao carregar CFOPs", error);
    }
  };

  useEffect(() => {
    carregarCfops();
  }, []);

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const formatFloat = (val: string | number) => {
      if (!val) return null;
      if (typeof val === 'number') return val;
      return parseFloat(val.replace(',', '.'));
    };

    const payload = {
      ...formData,
      aliquotaIcmsPadrao: formatFloat(formData.aliquotaIcmsPadrao),
      aliquotaPisPadrao: formatFloat(formData.aliquotaPisPadrao),
      aliquotaCofinsPadrao: formatFloat(formData.aliquotaCofinsPadrao),
      aliquotaIpiPadrao: formatFloat(formData.aliquotaIpiPadrao),
      aliquotaIbsPadrao: formatFloat(formData.aliquotaIbsPadrao),
      aliquotaCbsPadrao: formatFloat(formData.aliquotaCbsPadrao),
      aliquotaIsPadrao: formatFloat(formData.aliquotaIsPadrao),
    };

    try {
      // 🚀 FIM DO ANY: Tipagem na criação
      await api.post<ICfop>('/api/cfops', payload);
      alert('✅ CFOP cadastrado com sucesso!');
      carregarCfops();
      setFormData(estadoInicial);
    } catch (err) {
      const error = err as AxiosError<{error?: string}>;
      alert(error.response?.data?.error || 'Erro ao salvar CFOP');
    } finally {
      setLoading(false);
    }
  };

  const handleExcluir = async (id?: string) => {
    if (!id) return;
    if (!window.confirm('Tem certeza que deseja excluir este CFOP?')) return;
    try {
      // 🚀 ROTA CORRIGIDA: Estava no singular (/api/cfop), mudei para o plural RESTful (/api/cfops)
      await api.delete(`/api/cfops/${id}`);
      carregarCfops();
    } catch (err) {
      const error = err as AxiosError<{error?: string}>;
      console.error(error);
      alert('Erro ao excluir. O CFOP pode estar em uso.');
    }
  };

  const inputClass = "w-full p-2.5 bg-[#0b1324] border border-white/10 text-white rounded-xl focus:outline-none focus:border-violet-500/40 focus:ring-2 focus:ring-violet-500/20 transition-all placeholder:text-slate-500 text-sm";
  const labelClass = "block text-xs font-bold text-slate-400 uppercase tracking-[0.16em] mb-1.5";

  return (
    <Layout>
      <div className="mx-auto max-w-7xl space-y-6 pb-12">
        
        {/* CABEÇALHO */}
        <div className="relative overflow-hidden rounded-[30px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(139,92,246,0.16),_transparent_26%),radial-gradient(circle_at_top_right,_rgba(16,185,129,0.10),_transparent_20%),linear-gradient(135deg,_#0b1020_0%,_#08101f_45%,_#0a1224_100%)] p-6 shadow-[0_25px_70px_rgba(0,0,0,0.40)]">
          <h1 className="text-3xl font-extrabold text-white">Regras Fiscais e CFOP</h1>
          <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-violet-300">Fiscal Intelligence</div>
          <p className="text-slate-400 mt-1">Configure os Códigos Fiscais, regras de tributação (Atuais e Reforma Tributária) e automações do ERP.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* FORMULÁRIO */}
          <div className="lg:col-span-6 bg-[#08101f]/90 backdrop-blur-xl p-6 rounded-[30px] shadow-[0_25px_60px_rgba(0,0,0,0.35)] border border-white/10 h-fit">
            <h2 className="mb-6 flex items-center gap-2 border-b border-white/10 pb-3 text-lg font-bold text-violet-300">
              <span className="text-2xl">⚙️</span> Novo Cadastro de CFOP
            </h2>
            
            <form onSubmit={handleSalvar} className="space-y-6">
              
              {/* BLOCO 1: DADOS BÁSICOS */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-violet-300 uppercase tracking-[0.16em] flex items-center gap-2">
                  <span className="w-4 h-0.5 bg-violet-400 rounded-full"></span> Identificação
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Código CFOP</label>
                    <input required type="text" placeholder="Ex: 5102"
                      value={formData.codigo} onChange={e => setFormData({...formData, codigo: e.target.value})}
                      className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Tipo</label>
                    <select 
                      value={formData.tipoOperacao} onChange={e => setFormData({...formData, tipoOperacao: e.target.value})}
                      className={inputClass}>
                      <option value="ENTRADA">Entrada</option>
                      <option value="SAIDA">Saída</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Descrição da Operação</label>
                  <input required type="text" placeholder="Ex: Venda de mercadoria"
                    value={formData.descricao} onChange={e => setFormData({...formData, descricao: e.target.value})}
                    className={inputClass} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Aplicação / Finalidade</label>
                    <select 
                      value={formData.aplicacao} onChange={e => setFormData({...formData, aplicacao: e.target.value})}
                      className={inputClass}>
                      <option value="COMERCIALIZACAO">Comercialização / Revenda</option>
                      <option value="USO_CONSUMO">Uso e Consumo</option>
                      <option value="ATIVO_IMOBILIZADO">Ativo Imobilizado</option>
                      <option value="SERVICO">Prestação de Serviço</option>
                      <option value="REMESSA_RETORNO">Remessa / Retorno</option>
                      <option value="OUTROS">Outros</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>CFOP Inverso (Devolução)</label>
                    <input type="text" placeholder="Ex: 1202"
                      value={formData.cfopInverso} onChange={e => setFormData({...formData, cfopInverso: e.target.value})}
                      className={inputClass} />
                  </div>
                </div>
              </div>

              {/* BLOCO 2: AUTOMAÇÕES DO ERP */}
              <div className="p-4 bg-[#0b1324]/70 rounded-2xl border border-white/10 space-y-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-[0.16em] mb-3">Comportamento no ERP</h3>
                
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative flex items-center justify-center">
                    <input type="checkbox" checked={formData.movimentaEstoque}
                      onChange={e => setFormData({...formData, movimentaEstoque: e.target.checked})}
                      className="peer appearance-none w-5 h-5 border-2 border-white/10 rounded bg-[#08101f] checked:bg-violet-500 checked:border-violet-400 transition-all cursor-pointer" />
                    <svg className="absolute w-3 h-3 text-slate-900 pointer-events-none opacity-0 peer-checked:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"></path></svg>
                  </div>
                  <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">Movimenta Estoque Físico</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative flex items-center justify-center">
                    <input type="checkbox" checked={formData.geraFinanceiro}
                      onChange={e => setFormData({...formData, geraFinanceiro: e.target.checked})}
                      className="peer appearance-none w-5 h-5 border-2 border-white/10 rounded bg-[#08101f] checked:bg-emerald-500 checked:border-emerald-400 transition-all cursor-pointer" />
                    <svg className="absolute w-3 h-3 text-slate-900 pointer-events-none opacity-0 peer-checked:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"></path></svg>
                  </div>
                  <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">Gera Financeiro (A Pagar/Receber)</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative flex items-center justify-center">
                    <input type="checkbox" checked={formData.somaFaturamento}
                      onChange={e => setFormData({...formData, somaFaturamento: e.target.checked})}
                      className="peer appearance-none w-5 h-5 border-2 border-white/10 rounded bg-[#08101f] checked:bg-fuchsia-500 checked:border-fuchsia-400 transition-all cursor-pointer" />
                    <svg className="absolute w-3 h-3 text-slate-900 pointer-events-none opacity-0 peer-checked:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"></path></svg>
                  </div>
                  <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">Soma no Faturamento Bruto</span>
                </label>
              </div>

              {/* BLOCO 3: IMPOSTOS ATUAIS */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-emerald-300 uppercase tracking-[0.16em] flex items-center gap-2">
                    <span className="w-4 h-0.5 bg-emerald-300 rounded-full"></span> Impostos Atuais
                  </h3>
                  <label className="flex items-center gap-2 cursor-pointer bg-slate-950/50 px-3 py-1.5 rounded-full border border-slate-700">
                    <input type="checkbox" checked={formData.calculaTributos} onChange={e => setFormData({...formData, calculaTributos: e.target.checked})} className="w-3.5 h-3.5 accent-emerald-500 rounded" />
                    <span className="text-xs font-bold text-slate-300">Calcular Tributos</span>
                  </label>
                </div>

                <div className="grid grid-cols-4 gap-3">
                  <div className="col-span-2"><label className={labelClass}>CST ICMS</label><input type="text" placeholder="Ex: 000" value={formData.cstIcmsPadrao} onChange={e => setFormData({...formData, cstIcmsPadrao: e.target.value})} className={inputClass} /></div>
                  <div className="col-span-2"><label className={labelClass}>Alíq. ICMS (%)</label><input type="number" step="0.01" placeholder="Ex: 18.00" value={formData.aliquotaIcmsPadrao} onChange={e => setFormData({...formData, aliquotaIcmsPadrao: e.target.value})} className={inputClass} /></div>
                  
                  <div className="col-span-2"><label className={labelClass}>CST PIS/COFINS</label><input type="text" placeholder="Ex: 01" value={formData.cstPisPadrao} onChange={e => setFormData({...formData, cstPisPadrao: e.target.value, cstCofinsPadrao: e.target.value})} className={inputClass} /></div>
                  <div><label className={labelClass}>Alíq. PIS</label><input type="number" step="0.01" placeholder="%" value={formData.aliquotaPisPadrao} onChange={e => setFormData({...formData, aliquotaPisPadrao: e.target.value})} className={inputClass} /></div>
                  <div><label className={labelClass}>Alíq. COF</label><input type="number" step="0.01" placeholder="%" value={formData.aliquotaCofinsPadrao} onChange={e => setFormData({...formData, aliquotaCofinsPadrao: e.target.value})} className={inputClass} /></div>
                </div>
              </div>

              {/* BLOCO 4: REFORMA TRIBUTÁRIA (Destaque Roxo/Aurya) */}
              <div className="p-5 bg-gradient-to-br from-fuchsia-900/20 to-[#08101f]/50 rounded-2xl border border-fuchsia-500/20 space-y-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-fuchsia-500/10 rounded-full blur-3xl"></div>
                <h3 className="text-xs font-bold text-fuchsia-300 uppercase tracking-[0.16em] relative z-10 flex items-center gap-2">
                  <span className="w-4 h-0.5 bg-fuchsia-300 rounded-full"></span> Reforma Tributária (IVA)
                </h3>
                
                <div className="grid grid-cols-4 gap-3 relative z-10">
                  <div className="col-span-4"><label className={labelClass}>CST IBS/CBS</label><input type="text" placeholder="Novo CST" value={formData.cstIbsCbsPadrao} onChange={e => setFormData({...formData, cstIbsCbsPadrao: e.target.value})} className={inputClass} /></div>
                  
                  <div className="col-span-2"><label className={labelClass}>Alíq. IBS (%) - Est/Mun</label><input type="number" step="0.01" placeholder="%" value={formData.aliquotaIbsPadrao} onChange={e => setFormData({...formData, aliquotaIbsPadrao: e.target.value})} className={inputClass} /></div>
                  <div className="col-span-2"><label className={labelClass}>Alíq. CBS (%) - Fed</label><input type="number" step="0.01" placeholder="%" value={formData.aliquotaCbsPadrao} onChange={e => setFormData({...formData, aliquotaCbsPadrao: e.target.value})} className={inputClass} /></div>
                  <div className="col-span-4"><label className={labelClass}>Alíq. Imposto Seletivo (IS) (%)</label><input type="number" step="0.01" placeholder="%" value={formData.aliquotaIsPadrao} onChange={e => setFormData({...formData, aliquotaIsPadrao: e.target.value})} className={inputClass} /></div>
                </div>
              </div>

              <button type="submit" disabled={loading}
                className="w-full py-3.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-bold rounded-xl shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:shadow-[0_0_25px_rgba(139,92,246,0.45)] transition-all transform hover:-translate-y-0.5 disabled:opacity-70 disabled:transform-none flex justify-center items-center gap-2">
                {loading ? 'Salvando...' : '💾 Salvar Regra CFOP'}
              </button>
            </form>
          </div>

          {/* LISTAGEM */}
          <div className="lg:col-span-6 bg-[#08101f]/90 backdrop-blur-xl rounded-[30px] shadow-[0_25px_60px_rgba(0,0,0,0.35)] border border-white/10 overflow-hidden h-fit">
            <div className="p-5 bg-[#0b1324] border-b border-white/10">
              <h2 className="text-lg font-bold text-white">Operações Cadastradas</h2>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-[#0b1324] text-xs text-slate-400 uppercase border-b border-white/10">
                    <th className="p-4 font-bold tracking-wider">CFOP</th>
                    <th className="p-4 font-bold tracking-wider">Descrição</th>
                    <th className="p-4 font-bold tracking-wider text-center">Tributos</th>
                    <th className="p-4 font-bold tracking-wider text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {cfops.length === 0 ? (
                    <tr><td colSpan={4} className="p-12 text-center text-slate-500">Nenhum CFOP cadastrado ainda.</td></tr>
                  ) : (
                    cfops.map((cfop) => (
                      <tr key={cfop.id} className="hover:bg-white/5 transition-colors">
                        <td className="p-4">
                          <div className="font-black text-white text-lg">{cfop.codigo}</div>
                          <span className={`inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full font-bold border ${cfop.tipoOperacao === 'ENTRADA' ? 'bg-sky-500/10 text-sky-300 border-sky-500/20' : 'bg-amber-500/10 text-amber-300 border-amber-500/20'}`}>
                            {cfop.tipoOperacao}
                          </span>
                        </td>
                        <td className="p-4 text-sm text-slate-300 font-medium">
                          {cfop.descricao}
                          <div className="text-xs text-slate-500 mt-1">Aplicação: <span className="text-slate-400">{cfop.aplicacao?.replace('_', ' ')}</span></div>
                        </td>
                        <td className="p-4">
                          <div className="flex flex-col items-center gap-1.5 text-[10px] font-bold">
                            <span className={`px-2 py-0.5 rounded border ${cfop.calculaTributos ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20" : "bg-[#0b1324] text-slate-400 border-white/10"}`}>
                              {cfop.calculaTributos ? 'Tributado' : 'Sem Tributo'}
                            </span>
                            {(cfop.aliquotaIbsPadrao || cfop.aliquotaCbsPadrao) && (
                              <span className="px-2 py-0.5 rounded bg-fuchsia-500/10 text-fuchsia-300 border border-fuchsia-500/20">
                                IVA: {Number(cfop.aliquotaIbsPadrao || 0) + Number(cfop.aliquotaCbsPadrao || 0)}%
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          <button onClick={() => handleExcluir(cfop.id)} className="text-red-300 hover:text-red-200 p-2 hover:bg-red-500/10 rounded-lg transition-colors" title="Excluir">
                            🗑️
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
      </div>
    </Layout>
  );
}