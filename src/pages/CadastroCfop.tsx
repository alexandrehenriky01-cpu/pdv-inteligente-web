import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Layout } from '../components/Layout';

export function CadastroCfop() {
  const [cfops, setCfops] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  const estadoInicial = {
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
    
    // Impostos Atuais
    cstIcmsPadrao: '', aliquotaIcmsPadrao: '',
    cstPisPadrao: '', aliquotaPisPadrao: '',
    cstCofinsPadrao: '', aliquotaCofinsPadrao: '',
    cstIpiPadrao: '', aliquotaIpiPadrao: '',
    
    // Reforma Tributária
    cstIbsCbsPadrao: '',
    aliquotaIbsPadrao: '',
    aliquotaCbsPadrao: '',
    aliquotaIsPadrao: ''
  };

  const [formData, setFormData] = useState(estadoInicial);

  const carregarCfops = async () => {
    try {
      const response = await api.get('/api/cfop');
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
    
    // Converte os valores vazios para null e os preenchidos para Float
    const formatFloat = (val: string) => val ? parseFloat(val.replace(',', '.')) : null;

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
      await api.post('/api/cfop', payload);
      alert('✅ CFOP cadastrado com sucesso!');
      carregarCfops();
      setFormData(estadoInicial);
    } catch (error: any) {
      alert(error.response?.data?.error || 'Erro ao salvar CFOP');
    } finally {
      setLoading(false);
    }
  };

  const handleExcluir = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este CFOP?')) return;
    try {
      await api.delete(`/api/cfop/${id}`);
      carregarCfops();
    } catch (error) {
      alert('Erro ao excluir. O CFOP pode estar em uso.');
    }
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-slate-800">Regras Fiscais e CFOP</h1>
          <p className="text-slate-500 mt-1">Configure os Códigos Fiscais, regras de tributação (Atuais e Reforma Tributária) e automações do ERP.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* FORMULÁRIO (OCUPA 6 COLUNAS PARA CABER OS CAMPOS) */}
          <div className="lg:col-span-6 bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-fit">
            <h2 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2">Novo Cadastro de CFOP</h2>
            
            <form onSubmit={handleSalvar} className="space-y-6">
              
              {/* BLOCO 1: DADOS BÁSICOS */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wider">1. Identificação</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700">Código CFOP</label>
                    <input required type="text" placeholder="Ex: 5102"
                      value={formData.codigo} onChange={e => setFormData({...formData, codigo: e.target.value})}
                      className="mt-1 w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700">Tipo</label>
                    <select 
                      value={formData.tipoOperacao} onChange={e => setFormData({...formData, tipoOperacao: e.target.value})}
                      className="mt-1 w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                      <option value="ENTRADA">Entrada</option>
                      <option value="SAIDA">Saída</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700">Descrição da Operação</label>
                  <input required type="text" placeholder="Ex: Venda de mercadoria"
                    value={formData.descricao} onChange={e => setFormData({...formData, descricao: e.target.value})}
                    className="mt-1 w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700">Aplicação / Finalidade</label>
                    <select 
                      value={formData.aplicacao} onChange={e => setFormData({...formData, aplicacao: e.target.value})}
                      className="mt-1 w-full p-2 border border-slate-300 rounded-lg text-sm outline-none">
                      <option value="COMERCIALIZACAO">Comercialização / Revenda</option>
                      <option value="USO_CONSUMO">Uso e Consumo</option>
                      <option value="ATIVO_IMOBILIZADO">Ativo Imobilizado</option>
                      <option value="SERVICO">Prestação de Serviço</option>
                      <option value="REMESSA_RETORNO">Remessa / Retorno</option>
                      <option value="OUTROS">Outros</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700">CFOP Inverso (Devolução)</label>
                    <input type="text" placeholder="Ex: 1202"
                      value={formData.cfopInverso} onChange={e => setFormData({...formData, cfopInverso: e.target.value})}
                      className="mt-1 w-full p-2 border border-slate-300 rounded-lg text-sm" />
                  </div>
                </div>
              </div>

              {/* BLOCO 2: AUTOMAÇÕES DO ERP */}
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
                <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">2. Comportamento no ERP</h3>
                
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={formData.movimentaEstoque}
                    onChange={e => setFormData({...formData, movimentaEstoque: e.target.checked})}
                    className="w-5 h-5 text-blue-600 rounded" />
                  <span className="text-sm font-medium text-slate-700">Movimenta Estoque Físico</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={formData.geraFinanceiro}
                    onChange={e => setFormData({...formData, geraFinanceiro: e.target.checked})}
                    className="w-5 h-5 text-emerald-600 rounded" />
                  <span className="text-sm font-medium text-slate-700">Gera Financeiro (Contas a Pagar/Receber)</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={formData.somaFaturamento}
                    onChange={e => setFormData({...formData, somaFaturamento: e.target.checked})}
                    className="w-5 h-5 text-purple-600 rounded" />
                  <span className="text-sm font-medium text-slate-700">Soma no Faturamento Bruto (Receita)</span>
                </label>
              </div>

              {/* BLOCO 3: IMPOSTOS ATUAIS */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-purple-600 uppercase tracking-wider">3. Impostos Atuais</h3>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={formData.calculaTributos} onChange={e => setFormData({...formData, calculaTributos: e.target.checked})} className="w-4 h-4 text-red-600 rounded" />
                    <span className="text-xs font-bold text-red-600">Calcular Tributos</span>
                  </label>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  <div className="col-span-2"><label className="block text-xs font-bold text-slate-700">CST ICMS</label><input type="text" placeholder="CST" value={formData.cstIcmsPadrao} onChange={e => setFormData({...formData, cstIcmsPadrao: e.target.value})} className="w-full p-2 border rounded-lg text-sm" /></div>
                  <div className="col-span-2"><label className="block text-xs font-bold text-slate-700">Alíq. ICMS (%)</label><input type="number" step="0.01" placeholder="%" value={formData.aliquotaIcmsPadrao} onChange={e => setFormData({...formData, aliquotaIcmsPadrao: e.target.value})} className="w-full p-2 border rounded-lg text-sm" /></div>
                  
                  <div className="col-span-2"><label className="block text-xs font-bold text-slate-700">CST PIS/COFINS</label><input type="text" placeholder="CST" value={formData.cstPisPadrao} onChange={e => setFormData({...formData, cstPisPadrao: e.target.value, cstCofinsPadrao: e.target.value})} className="w-full p-2 border rounded-lg text-sm" /></div>
                  <div><label className="block text-xs font-bold text-slate-700">Alíq. PIS</label><input type="number" step="0.01" placeholder="%" value={formData.aliquotaPisPadrao} onChange={e => setFormData({...formData, aliquotaPisPadrao: e.target.value})} className="w-full p-2 border rounded-lg text-sm" /></div>
                  <div><label className="block text-xs font-bold text-slate-700">Alíq. COF</label><input type="number" step="0.01" placeholder="%" value={formData.aliquotaCofinsPadrao} onChange={e => setFormData({...formData, aliquotaCofinsPadrao: e.target.value})} className="w-full p-2 border rounded-lg text-sm" /></div>
                </div>
              </div>

              {/* BLOCO 4: REFORMA TRIBUTÁRIA */}
              <div className="p-4 bg-blue-50/50 rounded-lg border border-blue-200 space-y-4">
                <h3 className="text-xs font-bold text-blue-800 uppercase tracking-wider">4. Reforma Tributária (IBS / CBS / IS)</h3>
                
                <div className="grid grid-cols-4 gap-2">
                  <div className="col-span-4"><label className="block text-xs font-bold text-slate-700">CST IBS/CBS</label><input type="text" placeholder="Novo CST" value={formData.cstIbsCbsPadrao} onChange={e => setFormData({...formData, cstIbsCbsPadrao: e.target.value})} className="w-full p-2 border rounded-lg text-sm" /></div>
                  
                  <div className="col-span-2"><label className="block text-xs font-bold text-slate-700">Alíq. IBS (%) - Est/Mun</label><input type="number" step="0.01" placeholder="%" value={formData.aliquotaIbsPadrao} onChange={e => setFormData({...formData, aliquotaIbsPadrao: e.target.value})} className="w-full p-2 border rounded-lg text-sm" /></div>
                  <div className="col-span-2"><label className="block text-xs font-bold text-slate-700">Alíq. CBS (%) - Fed</label><input type="number" step="0.01" placeholder="%" value={formData.aliquotaCbsPadrao} onChange={e => setFormData({...formData, aliquotaCbsPadrao: e.target.value})} className="w-full p-2 border rounded-lg text-sm" /></div>
                  <div className="col-span-4"><label className="block text-xs font-bold text-slate-700">Alíq. Imposto Seletivo (IS) (%)</label><input type="number" step="0.01" placeholder="%" value={formData.aliquotaIsPadrao} onChange={e => setFormData({...formData, aliquotaIsPadrao: e.target.value})} className="w-full p-2 border rounded-lg text-sm" /></div>
                </div>
              </div>

              <button type="submit" disabled={loading}
                className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition-colors shadow-md">
                {loading ? 'Salvando...' : '💾 Salvar Regra CFOP'}
              </button>
            </form>
          </div>

          {/* LISTAGEM (OCUPA 6 COLUNAS) */}
          <div className="lg:col-span-6 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden h-fit">
            <div className="p-4 bg-slate-50 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-800">Operações Cadastradas</h2>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-100 text-xs text-slate-500 uppercase border-b">
                    <th className="p-4">CFOP</th>
                    <th className="p-4">Descrição</th>
                    <th className="p-4 text-center">Tributos</th>
                    <th className="p-4 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cfops.length === 0 ? (
                    <tr><td colSpan={4} className="p-8 text-center text-slate-500">Nenhum CFOP cadastrado ainda.</td></tr>
                  ) : (
                    cfops.map((cfop) => (
                      <tr key={cfop.id} className="hover:bg-slate-50">
                        <td className="p-4">
                          <div className="font-bold text-slate-800 text-lg">{cfop.codigo}</div>
                          <span className={`inline-block mt-1 text-[10px] px-2 py-1 rounded-full font-bold ${cfop.tipoOperacao === 'ENTRADA' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                            {cfop.tipoOperacao}
                          </span>
                        </td>
                        <td className="p-4 text-sm text-slate-600 font-medium">
                          {cfop.descricao}
                          <div className="text-xs text-slate-400 mt-1">Aplicação: {cfop.aplicacao?.replace('_', ' ')}</div>
                        </td>
                        <td className="p-4">
                          <div className="grid grid-cols-1 gap-1 text-[10px] font-bold">
                            <span className={`px-2 py-1 rounded text-center ${cfop.calculaTributos ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-400"}`}>
                              {cfop.calculaTributos ? 'Tributado' : 'Sem Tributo'}
                            </span>
                            {(cfop.aliquotaIbsPadrao || cfop.aliquotaCbsPadrao) && (
                              <span className="px-2 py-1 rounded text-center bg-blue-100 text-blue-700">
                                IVA: {Number(cfop.aliquotaIbsPadrao || 0) + Number(cfop.aliquotaCbsPadrao || 0)}%
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          <button onClick={() => handleExcluir(cfop.id)} className="text-red-500 hover:text-red-700 p-2 bg-red-50 rounded-lg transition-colors">
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