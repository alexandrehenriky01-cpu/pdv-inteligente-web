import React from 'react';

interface FormContatoProps {
  contato: any;
  setContato: (contato: any) => void;
}

export function FormContato({ contato, setContato }: FormContatoProps) {
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setContato({ ...contato, [name]: value });
  };

  return (
    <div className="mt-8">
      <h3 className="text-lg font-semibold text-gray-800 border-b pb-2 mb-4">📞 Contato Principal</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Nome do Contato *</label>
          <input 
            type="text" required name="nome"
            className="mt-1 block w-full p-2 border border-gray-300 rounded focus:ring-blue-500"
            value={contato.nome}
            onChange={handleChange}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">E-mail</label>
          <input 
            type="email" name="email"
            className="mt-1 block w-full p-2 border border-gray-300 rounded focus:ring-blue-500"
            value={contato.email}
            onChange={handleChange}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Telefone / WhatsApp</label>
          <input 
            type="text" name="telefone"
            className="mt-1 block w-full p-2 border border-gray-300 rounded focus:ring-blue-500"
            value={contato.telefone}
            onChange={handleChange}
          />
        </div>
      </div>
    </div>
  );
}