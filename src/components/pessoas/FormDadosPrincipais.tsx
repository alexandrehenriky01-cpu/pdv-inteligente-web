import React from 'react';

// Tipagem das Props para garantir a segurança do TypeScript
interface FormDadosPrincipaisProps {
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  handleConsultarCnpj: () => void;
  loadingCnpj: boolean;
}

export function FormDadosPrincipais({ formData, setFormData, handleConsultarCnpj, loadingCnpj }: FormDadosPrincipaisProps) {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded border border-gray-200">
        <div>
          <label className="block text-sm font-medium text-gray-700">Tipo de Cadastro</label>
          <select 
            className="mt-1 block w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
            value={formData.tipo}
            onChange={e => setFormData({...formData, tipo: e.target.value})}
          >
            <option value="CLIENTE">Cliente</option>
            <option value="FORNECEDOR">Fornecedor</option>
            <option value="AMBOS">Ambos</option>
          </select>
        </div>

        <div className="md:col-span-2 flex gap-2 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700">CNPJ / CPF</label>
            <input 
              type="text" 
              className="mt-1 block w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
              value={formData.cnpjCpf}
              onChange={e => setFormData({...formData, cnpjCpf: e.target.value})}
              placeholder="Somente números"
            />
          </div>
          <button 
            type="button"
            onClick={handleConsultarCnpj}
            disabled={loadingCnpj}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loadingCnpj ? 'Buscando...' : '🔍 Buscar Dados'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
        <div>
          <label className="block text-sm font-medium text-gray-700">Razão Social *</label>
          <input 
            type="text" required
            className="mt-1 block w-full p-2 border border-gray-300 rounded bg-gray-50"
            value={formData.razaoSocial}
            onChange={e => setFormData({...formData, razaoSocial: e.target.value})}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Nome Fantasia</label>
          <input 
            type="text" 
            className="mt-1 block w-full p-2 border border-gray-300 rounded bg-gray-50"
            value={formData.nomeFantasia}
            onChange={e => setFormData({...formData, nomeFantasia: e.target.value})}
          />
        </div>
      </div>
    </>
  );
}