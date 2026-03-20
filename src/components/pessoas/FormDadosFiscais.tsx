import React from 'react';

interface FormDadosFiscaisProps {
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
}

export function FormDadosFiscais({ formData, setFormData }: FormDadosFiscaisProps) {
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target as any;
    
    // Tratamento especial para o checkbox (boolean)
    if (type === 'checkbox') {
      setFormData((prev: any) => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
    } else {
      setFormData((prev: any) => ({ ...prev, [name]: value }));
    }
  };

  return (
    <div className="space-y-6">
      
      {/* ==========================================
          SESSÃO 1: DADOS FISCAIS E TRIBUTÁRIOS
          ========================================== */}
      <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
        <h3 className="text-sm font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-2">
          🧾 Dados Fiscais
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Regime Tributário</label>
            <select 
              name="regimeTributario" 
              value={formData.regimeTributario} 
              onChange={handleChange}
              className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
            >
              <option value="SIMPLES_NACIONAL">Simples Nacional</option>
              <option value="LUCRO_PRESUMIDO">Lucro Presumido</option>
              <option value="LUCRO_REAL">Lucro Real</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Indicador de IE</label>
            <select 
              name="indicadorIE" 
              value={formData.indicadorIE} 
              onChange={handleChange}
              className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
            >
              <option value="CONTRIBUINTE">Contribuinte</option>
              <option value="CONTRIBUINTE_ISENTO">Contribuinte Isento</option>
              <option value="NAO_CONTRIBUINTE">Não Contribuinte</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Inscrição Estadual (IE)</label>
            <input 
              type="text" 
              name="inscricaoEstadual" 
              value={formData.inscricaoEstadual} 
              onChange={handleChange}
              placeholder="Apenas números"
              className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Inscrição Municipal (IM)</label>
            <input 
              type="text" 
              name="inscricaoMunicipal" 
              value={formData.inscricaoMunicipal} 
              onChange={handleChange}
              className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">CFOP Padrão</label>
            <input 
              type="text" 
              name="cfopPadrao" 
              value={formData.cfopPadrao} 
              onChange={handleChange}
              placeholder="Ex: 5102"
              maxLength={4}
              className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          <div className="flex items-center mt-6">
            <label className="flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                name="consumidorFinal"
                checked={formData.consumidorFinal}
                onChange={handleChange}
                className="w-5 h-5 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
              />
              <span className="ml-2 text-sm font-medium text-slate-700">Consumidor Final?</span>
            </label>
          </div>
        </div>
      </div>

      {/* ==========================================
          SESSÃO 2: DADOS COMERCIAIS (Renderização Condicional)
          ========================================== */}
      <div className="p-5 bg-blue-50 border border-blue-100 rounded-xl space-y-4">
        <h3 className="text-sm font-bold text-blue-700 uppercase tracking-wider flex items-center gap-2">
          💼 Dados Comerciais ({formData.tipo === 'CLIENTE' ? 'Cliente' : 'Fornecedor'})
        </h3>
        
        {formData.tipo === 'CLIENTE' ? (
          // --- CAMPOS EXCLUSIVOS DE CLIENTE ---
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Limite de Crédito (R$)</label>
              <input 
                type="number" 
                step="0.01"
                name="limiteCredito" 
                value={formData.limiteCredito} 
                onChange={handleChange}
                placeholder="Ex: 5000.00"
                className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Condição de Pagamento Padrão</label>
              <input 
                type="text" 
                name="condicaoPagamento" 
                value={formData.condicaoPagamento} 
                onChange={handleChange}
                placeholder="Ex: 30/60/90 Dias"
                className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Ramo de Atividade</label>
              <input 
                type="text" 
                name="ramoAtividade" 
                value={formData.ramoAtividade} 
                onChange={handleChange}
                placeholder="Ex: Supermercado, Padaria, etc."
                className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Observações Gerais</label>
              <textarea 
                name="obsGerais" 
                value={formData.obsGerais} 
                onChange={handleChange}
                rows={3}
                placeholder="Anotações internas sobre o cliente..."
                className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
              />
            </div>
          </div>
        ) : (
          // --- CAMPOS EXCLUSIVOS DE FORNECEDOR ---
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Prazo de Entrega (Dias)</label>
              <input 
                type="number" 
                name="prazoEntregaDias" 
                value={formData.prazoEntregaDias} 
                onChange={handleChange}
                placeholder="Ex: 5"
                className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Condição de Compra Acordada</label>
              <input 
                type="text" 
                name="condicaoCompra" 
                value={formData.condicaoCompra} 
                onChange={handleChange}
                placeholder="Ex: Faturado 28dd, À vista, etc."
                className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}