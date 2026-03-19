import React from 'react';

interface FormEnderecoProps {
  endereco: any;
  setEndereco: (endereco: any) => void;
}

export function FormEndereco({ endereco, setEndereco }: FormEnderecoProps) {
  
  // Função helper para manter o código limpo ao atualizar campos aninhados
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEndereco({ ...endereco, [name]: value });
  };

  return (
    <div className="mt-8">
      <h3 className="text-lg font-semibold text-gray-800 border-b pb-2 mb-4">📍 Endereço Principal</h3>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-1">
          <label className="block text-sm font-medium text-gray-700">CEP *</label>
          <input 
            type="text" required name="cep"
            className="mt-1 block w-full p-2 border border-gray-300 rounded focus:ring-blue-500"
            value={endereco.cep}
            onChange={handleChange}
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700">Logradouro *</label>
          <input 
            type="text" required name="logradouro"
            className="mt-1 block w-full p-2 border border-gray-300 rounded focus:ring-blue-500"
            value={endereco.logradouro}
            onChange={handleChange}
          />
        </div>
        <div className="md:col-span-1">
          <label className="block text-sm font-medium text-gray-700">Número *</label>
          <input 
            type="text" required name="numero"
            className="mt-1 block w-full p-2 border border-gray-300 rounded focus:ring-blue-500"
            value={endereco.numero}
            onChange={handleChange}
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700">Bairro *</label>
          <input 
            type="text" required name="bairro"
            className="mt-1 block w-full p-2 border border-gray-300 rounded focus:ring-blue-500"
            value={endereco.bairro}
            onChange={handleChange}
          />
        </div>
        <div className="md:col-span-1">
          <label className="block text-sm font-medium text-gray-700">Cidade *</label>
          <input 
            type="text" required name="cidade"
            className="mt-1 block w-full p-2 border border-gray-300 rounded focus:ring-blue-500"
            value={endereco.cidade}
            onChange={handleChange}
          />
        </div>
        <div className="md:col-span-1">
          <label className="block text-sm font-medium text-gray-700">UF *</label>
          <input 
            type="text" required name="uf" maxLength={2}
            className="mt-1 block w-full p-2 border border-gray-300 rounded uppercase focus:ring-blue-500"
            value={endereco.uf}
            onChange={handleChange}
          />
        </div>
      </div>
    </div>
  );
}