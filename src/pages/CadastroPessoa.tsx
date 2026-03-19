import React, { useState } from 'react';
// 1. Trocamos o 'axios' puro pela nossa instância customizada (explicada abaixo)
import { api } from '../services/api'; 

import { FormDadosPrincipais } from '../components/pessoas/FormDadosPrincipais';
import { FormEndereco } from '../components/pessoas/FormEndereco';
import { FormContato } from '../components/pessoas/FormContato';

export function CadastroPessoa() {
  const [loadingCnpj, setLoadingCnpj] = useState(false);
  const [salvando, setSalvando] = useState(false);

  // 🛡️ Nota de Segurança: NÃO colocamos o 'lojaId' aqui no estado!
  // O Frontend nunca deve enviar o ID do Tenant, o Backend é quem deve descobrir
  // isso através do Token JWT para evitar fraudes.
  const [formData, setFormData] = useState({
    tipo: 'CLIENTE',
    cnpjCpf: '',
    razaoSocial: '',
    nomeFantasia: '',
    cnaePrincipal: '',
    indicadorIE: 'NAO_CONTRIBUINTE',
    endereco: { cep: '', logradouro: '', numero: '', bairro: '', cidade: '', uf: '', ibge: '' },
    contato: { nome: '', email: '', telefone: '' }
  });

  const handleConsultarCnpj = async () => {
    if (formData.cnpjCpf.length < 14) return alert("Digite um CNPJ válido.");
    
    setLoadingCnpj(true);
    try {
      // 2. Usamos a instância 'api'. A URL base já está configurada nela!
      const { data } = await api.get(`/api/cnpj/${formData.cnpjCpf}`);
      
      setFormData(prev => ({
        ...prev,
        razaoSocial: data.razao_social,
        nomeFantasia: data.nome_fantasia || data.razao_social,
        cnaePrincipal: String(data.cnae_fiscal),
        endereco: {
          ...prev.endereco,
          cep: data.cep, logradouro: data.logradouro, bairro: data.bairro, 
          cidade: data.municipio, uf: data.uf, ibge: String(data.codigo_municipio)
        },
        contato: {
          ...prev.contato,
          telefone: data.ddd_telefone_1, email: data.email || ''
        }
      }));
    } catch (error: any) {
      // Tratamento de erro mais amigável
      alert(error.response?.data?.error || "Erro ao consultar CNPJ.");
    } finally {
      setLoadingCnpj(false);
    }
  };

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    try {
      // 3. O Token JWT será injetado automaticamente pelo Axios Interceptor
      await api.post('/api/pessoas', formData);
      alert("Parceiro de Negócios cadastrado com sucesso! 🚀");
      
      // Opcional: Limpar o formulário após o sucesso
      // setFormData({...estadoInicial}); 
      
    } catch (error: any) {
      alert("Erro ao salvar: " + (error.response?.data?.error || error.message));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6 bg-white shadow-xl rounded-xl mt-10">
      <h2 className="text-3xl font-extrabold text-gray-800 mb-8 border-b pb-4">
        Novo Parceiro de Negócios
      </h2>

      <form onSubmit={handleSalvar} className="space-y-4">
        <FormDadosPrincipais 
          formData={formData} 
          setFormData={setFormData} 
          handleConsultarCnpj={handleConsultarCnpj}
          loadingCnpj={loadingCnpj}
        />

        <FormEndereco 
          endereco={formData.endereco} 
          setEndereco={(novoEndereco) => setFormData({...formData, endereco: novoEndereco})} 
        />

        <FormContato 
          contato={formData.contato} 
          setContato={(novoContato) => setFormData({...formData, contato: novoContato})} 
        />

        <div className="flex justify-end mt-10 border-t pt-6">
          <button 
            type="submit"
            disabled={salvando}
            className="bg-green-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-green-700 disabled:opacity-50 transition-all shadow-md hover:shadow-lg"
          >
            {salvando ? 'Salvando no Banco...' : '💾 Salvar Cadastro'}
          </button>
        </div>
      </form>
    </div>
  );
}