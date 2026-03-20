import React, { useState } from 'react';
import { api } from '../services/api'; 

import { FormDadosPrincipais } from '../components/pessoas/FormDadosPrincipais';
import { FormEndereco } from '../components/pessoas/FormEndereco';
import { FormContato } from '../components/pessoas/FormContato';
import { FormDadosFiscais } from '../components/pessoas/FormDadosFiscais';
import { Layout } from '../components/Layout';

export function CadastroPessoa() {
  const [loadingCnpj, setLoadingCnpj] = useState(false);
  const [salvando, setSalvando] = useState(false);

  // ✅ ESTADO ATUALIZADO: Reflete 100% o seu Backend (Prisma)
  const [formData, setFormData] = useState({
    tipo: 'CLIENTE', // Pode ser 'CLIENTE' ou 'FORNECEDOR'
    cnpjCpf: '',
    razaoSocial: '',
    nomeFantasia: '',
    
    // --- Dados Fiscais ---
    regimeTributario: 'SIMPLES_NACIONAL', // Valor padrão sugerido
    indicadorIE: 'NAO_CONTRIBUINTE',
    inscricaoEstadual: '',
    inscricaoMunicipal: '',
    cnaePrincipal: '',
    consumidorFinal: false,
    cfopPadrao: '',

    // --- Campos de Cliente ---
    limiteCredito: '',
    condicaoPagamento: '',
    ramoAtividade: '',
    obsGerais: '',

    // --- Campos de Fornecedor ---
    prazoEntregaDias: '',
    condicaoCompra: '',

    // --- Relacionamentos ---
    endereco: { cep: '', logradouro: '', numero: '', bairro: '', cidade: '', uf: '', ibge: '' },
    contato: { nome: '', email: '', telefone: '' }
  });

  const handleConsultarCnpj = async () => {
    if (formData.cnpjCpf.length < 14) return alert("Digite um CNPJ válido.");
    
    setLoadingCnpj(true);
    try {
      const { data } = await api.get(`/api/cnpj/${formData.cnpjCpf}`);
      
      setFormData(prev => ({
        ...prev,
        razaoSocial: data.razao_social,
        nomeFantasia: data.nome_fantasia || data.razao_social,
        cnaePrincipal: String(data.cnae_fiscal),
        endereco: {
          ...prev.endereco,
          cep: data.cep, 
          logradouro: data.logradouro, 
          numero: data.numero || '', 
          bairro: data.bairro, 
          cidade: data.municipio, 
          uf: data.uf, 
          ibge: String(data.codigo_municipio)
        },
        contato: {
          ...prev.contato,
          telefone: data.ddd_telefone_1, 
          email: data.email || '' 
        }
      }));
    } catch (error: any) {
      alert(error.response?.data?.error || "Erro ao consultar CNPJ.");
    } finally {
      setLoadingCnpj(false);
    }
  };

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    
    // Tratamento dos dados antes de enviar (Convertendo strings para números onde o Prisma exige)
    const payload = {
      ...formData,
      limiteCredito: formData.limiteCredito ? parseFloat(formData.limiteCredito) : null,
      prazoEntregaDias: formData.prazoEntregaDias ? parseInt(formData.prazoEntregaDias) : null,
    };

    try {
      await api.post('/api/pessoas', payload);
      alert("Parceiro de Negócios cadastrado com sucesso! 🚀");
    } catch (error: any) {
      alert("Erro ao salvar: " + (error.response?.data?.error || error.message));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-5xl mx-auto p-6 bg-white shadow-xl rounded-xl mt-10">
        <h2 className="text-3xl font-extrabold text-gray-800 mb-8 border-b pb-4">
          Novo Parceiro de Negócios
        </h2>

        <form onSubmit={handleSalvar} className="space-y-6">
          
          {/* Seletor de Tipo (Cliente ou Fornecedor) */}
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
            <label className="block text-sm font-bold text-slate-700 mb-2">Tipo de Cadastro</label>
            <select 
              value={formData.tipo}
              onChange={(e) => setFormData({...formData, tipo: e.target.value})}
              className="w-full md:w-1/3 px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
            >
              <option value="CLIENTE">Cliente</option>
              <option value="FORNECEDOR">Fornecedor</option>
            </select>
          </div>

          <FormDadosPrincipais 
            formData={formData} 
            setFormData={setFormData} 
            handleConsultarCnpj={handleConsultarCnpj}
            loadingCnpj={loadingCnpj}
          />

          {/* ✅ COMPONENTE ATIVADO AQUI: Renderiza os dados Fiscais e Comerciais */}
          <FormDadosFiscais 
            formData={formData} 
            setFormData={setFormData} 
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
              {salvando ? 'Salvando no Banco...' : '💾 Salvar Cadastro Completo'}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}