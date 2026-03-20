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
  
  // ✅ ESTADO PARA CONTROLAR AS ABAS
  const [abaAtiva, setAbaAtiva] = useState('principais'); // principais | fiscais | endereco | contato

  const [formData, setFormData] = useState({
    tipo: 'CLIENTE', 
    cnpjCpf: '',
    razaoSocial: '',
    nomeFantasia: '',
    
    regimeTributario: 'SIMPLES_NACIONAL',
    indicadorIE: 'NAO_CONTRIBUINTE',
    inscricaoEstadual: '',
    inscricaoMunicipal: '',
    cnaePrincipal: '',
    consumidorFinal: false,
    cfopPadrao: '',

    limiteCredito: '',
    condicaoPagamento: '',
    ramoAtividade: '',
    obsGerais: '',

    prazoEntregaDias: '',
    condicaoCompra: '',

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
      
      // Dica de UX: Após buscar o CNPJ, pula para a aba de Endereço para o usuário conferir
      setAbaAtiva('endereco');
      
    } catch (error: any) {
      alert(error.response?.data?.error || "Erro ao consultar CNPJ.");
    } finally {
      setLoadingCnpj(false);
    }
  };

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    
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

  // Estilo dinâmico para as abas
  const estiloAba = (nomeAba: string) => `
    px-4 py-3 font-semibold text-sm border-b-2 transition-colors cursor-pointer
    ${abaAtiva === nomeAba 
      ? 'border-blue-600 text-blue-600 bg-blue-50/50' 
      : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
    }
  `;

  return (
    <Layout>
      <div className="max-w-5xl mx-auto p-6 bg-white shadow-xl rounded-xl mt-10">
        
        <div className="flex justify-between items-center mb-6 border-b pb-4">
          <h2 className="text-3xl font-extrabold text-gray-800">
            Novo Parceiro de Negócios
          </h2>
          
          {/* Seletor de Tipo Compacto no Cabeçalho */}
          <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-lg border border-slate-200">
            <span className="text-sm font-bold text-slate-600 pl-2">Tipo:</span>
            <select 
              value={formData.tipo}
              onChange={(e) => setFormData({...formData, tipo: e.target.value})}
              className="px-3 py-1.5 rounded-md border-none focus:ring-2 focus:ring-blue-500 outline-none bg-white font-medium text-blue-700 shadow-sm"
            >
              <option value="CLIENTE">Cliente</option>
              <option value="FORNECEDOR">Fornecedor</option>
            </select>
          </div>
        </div>

        {/* NAVEGAÇÃO DAS ABAS */}
        <div className="flex overflow-x-auto border-b border-slate-200 mb-6 custom-scrollbar">
          <button type="button" onClick={() => setAbaAtiva('principais')} className={estiloAba('principais')}>
            🏢 Dados Principais
          </button>
          <button type="button" onClick={() => setAbaAtiva('fiscais')} className={estiloAba('fiscais')}>
            🧾 Fiscais & Comerciais
          </button>
          <button type="button" onClick={() => setAbaAtiva('endereco')} className={estiloAba('endereco')}>
            📍 Endereço
          </button>
          <button type="button" onClick={() => setAbaAtiva('contato')} className={estiloAba('contato')}>
            📞 Contatos
          </button>
        </div>

        {/* CONTEÚDO DO FORMULÁRIO */}
        <form onSubmit={handleSalvar} className="space-y-6 min-h-[300px]">
          
          {/* Renderização Condicional baseada na aba ativa */}
          <div className={abaAtiva === 'principais' ? 'block' : 'hidden'}>
            <FormDadosPrincipais 
              formData={formData} 
              setFormData={setFormData} 
              handleConsultarCnpj={handleConsultarCnpj}
              loadingCnpj={loadingCnpj}
            />
          </div>

          <div className={abaAtiva === 'fiscais' ? 'block' : 'hidden'}>
            <FormDadosFiscais 
              formData={formData} 
              setFormData={setFormData} 
            />
          </div>

          <div className={abaAtiva === 'endereco' ? 'block' : 'hidden'}>
            <FormEndereco 
              endereco={formData.endereco} 
              setEndereco={(novoEndereco) => setFormData({...formData, endereco: novoEndereco})} 
            />
          </div>

          <div className={abaAtiva === 'contato' ? 'block' : 'hidden'}>
            <FormContato 
              contato={formData.contato} 
              setContato={(novoContato) => setFormData({...formData, contato: novoContato})} 
            />
          </div>

          {/* RODAPÉ E BOTÃO SALVAR (Fixo em todas as abas) */}
          <div className="flex justify-between items-center mt-10 border-t pt-6">
            <p className="text-sm text-slate-400">
              Certifique-se de preencher os campos obrigatórios (*) antes de salvar.
            </p>
            <button 
              type="submit"
              disabled={salvando}
              className="bg-green-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-green-700 disabled:opacity-50 transition-all shadow-md hover:shadow-lg flex items-center gap-2"
            >
              {salvando ? '⏳ Salvando...' : '💾 Finalizar Cadastro'}
            </button>
          </div>
        </form>

      </div>
    </Layout>
  );
}