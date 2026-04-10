import React, { useState, useEffect } from 'react';
import { Upload, Save, Building2, Phone, MapPin, UserSquare2, FileText, CheckCircle2, ShieldCheck, Key, Hash } from 'lucide-react';
// 🚀 1. IMPORTAMOS O HOOK DE NAVEGAÇÃO
import { useNavigate } from 'react-router-dom'; 
import { api } from '../../services/api'; 

interface CompanySettings {
  nomeFantasia: string;
  razaoSocial: string;
  cnpj: string;
  inscricaoEstadual: string;
  inscricaoMunicipal: string;
  regimeTributario: string;
  pessoaFisica: boolean;
  logo: File | null;
  email: string;
  telefone: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  municipio: string;
  uf: string;
  nomeResponsavel: string;
  cpfResponsavel: string;
  
  certificado: File | null;
  senhaCertificado: string;
  cscId: string;
  cscHash: string;
  rntrc: string;
  
  nfeHomologacaoSerie: string;
  nfeHomologacaoNumero: string;
  nfeProducaoSerie: string;
  nfeProducaoNumero: string;
  nfeToggle: boolean;
  nfceHomologacaoSerie: string;
  nfceHomologacaoNumero: string;
  nfceProducaoSerie: string;
  nfceProducaoNumero: string;
  nfceToggle: boolean;
  nfseHomologacaoSerie: string;
  nfseHomologacaoNumero: string;
  nfseProducaoSerie: string;
  nfseProducaoNumero: string;
  nfseToggle: boolean;
  cteHomologacaoSerie: string;
  cteHomologacaoNumero: string;
  cteProducaoSerie: string;
  cteProducaoNumero: string;
  cteToggle: boolean;
  mdfeHomologacaoSerie: string;
  mdfeHomologacaoNumero: string;
  mdfeProducaoSerie: string;
  mdfeProducaoNumero: string;
  mdfeToggle: boolean;
}

export const ConfiguracoesLoja: React.FC = () => {
  // 🚀 2. INICIALIZAMOS O NAVEGADOR
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<string>('identificacao');
  
  const [settings, setSettings] = useState<CompanySettings>({
    nomeFantasia: '', razaoSocial: '', cnpj: '', inscricaoEstadual: '', inscricaoMunicipal: '',
    regimeTributario: '', pessoaFisica: false, logo: null, email: '', telefone: '',
    cep: '', logradouro: '', numero: '', complemento: '', bairro: '', municipio: '', uf: '',
    nomeResponsavel: '', cpfResponsavel: '', 
    certificado: null, senhaCertificado: '', cscId: '', cscHash: '', rntrc: '',
    nfeHomologacaoSerie: '', nfeHomologacaoNumero: '', nfeProducaoSerie: '', nfeProducaoNumero: '', nfeToggle: false,
    nfceHomologacaoSerie: '', nfceHomologacaoNumero: '', nfceProducaoSerie: '', nfceProducaoNumero: '', nfceToggle: false,
    nfseHomologacaoSerie: '', nfseHomologacaoNumero: '', nfseProducaoSerie: '', nfseProducaoNumero: '', nfseToggle: false,
    cteHomologacaoSerie: '', cteHomologacaoNumero: '', cteProducaoSerie: '', cteProducaoNumero: '', cteToggle: false,
    mdfeHomologacaoSerie: '', mdfeHomologacaoNumero: '', mdfeProducaoSerie: '', mdfeProducaoNumero: '', mdfeToggle: false,
  });

  useEffect(() => {
    const carregarDadosDaLoja = async () => {
      try {
        const userStr = localStorage.getItem('@PDVUsuario');
        if (userStr) {
          const usuario = JSON.parse(userStr);
          if (usuario.loja) {
             setSettings(prev => ({
                ...prev,
                razaoSocial: usuario.loja.nome || prev.razaoSocial,
                nomeFantasia: usuario.loja.nomeFantasia || usuario.loja.nome || prev.nomeFantasia,
                cnpj: usuario.loja.cnpj || prev.cnpj,
                email: usuario.loja.email || prev.email,
                telefone: usuario.loja.telefone || prev.telefone,
             }));
          }
        }

        const response = await api.get('/api/lojas/minha-loja');
        const lojaDB = response.data;

        if (lojaDB) {
          setSettings(prev => ({
            ...prev,
            razaoSocial: lojaDB.nome || prev.razaoSocial,
            nomeFantasia: lojaDB.nomeFantasia || lojaDB.nome || prev.nomeFantasia,
            cnpj: lojaDB.cnpj || prev.cnpj,
            email: lojaDB.email || prev.email,
            telefone: lojaDB.telefone || prev.telefone,
            cep: lojaDB.cep || prev.cep,
            logradouro: lojaDB.logradouro || prev.logradouro,
            numero: lojaDB.numero || prev.numero,
            complemento: lojaDB.complemento || prev.complemento,
            bairro: lojaDB.bairro || prev.bairro,
            municipio: lojaDB.cidade || prev.municipio, // Ajustado para pegar 'cidade' do banco
            uf: lojaDB.uf || prev.uf,
            nomeResponsavel: lojaDB.nomeResponsavel || prev.nomeResponsavel,
            cpfResponsavel: lojaDB.cpfResponsavel || prev.cpfResponsavel,
            regimeTributario: lojaDB.regimeTributario || prev.regimeTributario,
          }));
        }
      } catch (error) {
        console.error('Erro ao buscar dados completos da loja na API:', error);
      }
    };

    carregarDadosDaLoja();
  }, []);

  const handleSave = async () => {
    try {
      console.log('Enviando dados para a API...', settings);

      const response = await api.put('/api/lojas/minha-loja', settings);

      alert('✅ Configurações salvas com sucesso!');
      
      const userStr = localStorage.getItem('@PDVUsuario');
      if (userStr) {
        const usuario = JSON.parse(userStr);
        usuario.loja = { ...usuario.loja, ...response.data.loja };
        localStorage.setItem('@PDVUsuario', JSON.stringify(usuario));
        window.dispatchEvent(new Event('lojaAtualizada'));
      }

      // 🚀 3. VOLTA PARA O MENU INICIAL APÓS SALVAR
      // Se a sua rota principal for "/dashboard", troque a linha abaixo para navigate('/dashboard')
      navigate('/'); 

    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert('❌ Erro ao salvar configurações. Tente novamente.');
    }
  };

  const updateSetting = (key: keyof CompanySettings, value: string | boolean | File | null) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const inputClass = "flex h-11 w-full rounded-xl border border-white/10 bg-[#050913]/50 px-4 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all backdrop-blur-sm";
  const labelClass = "text-[11px] font-bold text-slate-400 mb-1.5 block uppercase tracking-[0.1em]";
  const cardClass = "rounded-2xl border border-white/10 bg-white/[0.02] p-5 backdrop-blur-md";

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 rounded-2xl border border-white/10 bg-[#08101f]/40 p-6 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Configurações da Empresa</h1>
          <p className="text-sm text-slate-400 mt-1">Gerencie os dados fiscais, de contato e endereço do seu Tenant.</p>
        </div>
        <button 
          onClick={handleSave} 
          className="flex items-center space-x-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white px-6 py-2.5 rounded-xl font-bold shadow-[0_0_20px_rgba(139,92,246,0.3)] transition-all duration-300"
        >
          <Save className="w-4 h-4" />
          <span>SALVAR ALTERAÇÕES</span>
        </button>
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#08101f]/40 p-2 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] min-h-[600px]">
        
        {/* NAVEGAÇÃO DE ABAS */}
        <div className="flex space-x-1 bg-black/20 p-1.5 rounded-xl mb-6 overflow-x-auto border border-white/5 custom-scrollbar">
          {[
            { id: 'identificacao', label: 'Identificação', icon: Building2 },
            { id: 'contato', label: 'Contato', icon: Phone },
            { id: 'endereco', label: 'Endereço', icon: MapPin },
            { id: 'responsavel', label: 'Responsável', icon: UserSquare2 },
            { id: 'documentos', label: 'Documentos Fiscais', icon: FileText }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-1 items-center justify-center gap-2 py-2.5 px-4 text-sm font-semibold rounded-lg whitespace-nowrap transition-all duration-200 ${
                  isActive 
                    ? 'bg-white/[0.08] text-white shadow-sm border border-white/10' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] border border-transparent'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-violet-400' : 'text-slate-500'}`} />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* CONTEÚDO DAS ABAS */}
        <div className="p-4">
          
          {/* ABA 1: IDENTIFICAÇÃO */}
          {activeTab === 'identificacao' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/[0.02] p-5 rounded-2xl border border-white/10">
                <div className="flex items-center space-x-3">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={settings.pessoaFisica}
                      onChange={(e) => updateSetting('pessoaFisica', e.target.checked)}
                    />
                    <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-violet-500"></div>
                    <span className="ml-3 text-sm font-bold text-slate-300 uppercase tracking-wider">Pessoa Física</span>
                  </label>
                </div>
                
                <div className="flex items-center space-x-3">
                  <input
                    type="file"
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateSetting('logo', e.target.files?.[0] || null)}
                    className="hidden"
                    id="logo-upload"
                    accept="image/*"
                  />
                  <button 
                    onClick={() => document.getElementById('logo-upload')?.click()}
                    className="flex items-center text-sm font-semibold bg-white/5 border border-white/10 hover:bg-white/10 text-white px-4 py-2.5 rounded-xl transition-colors"
                  >
                    <Upload className="w-4 h-4 mr-2 text-violet-400" /> 
                    {settings.logo ? settings.logo.name : 'Anexar Logo'}
                  </button>
                </div>
              </div>

              <div className={cardClass}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className={labelClass}>Razão Social</label>
                    <input type="text" className={inputClass} placeholder="Razão Social" value={settings.razaoSocial} onChange={(e) => updateSetting('razaoSocial', e.target.value)} />
                  </div>
                  <div>
                    <label className={labelClass}>Nome Fantasia</label>
                    <input type="text" className={inputClass} placeholder="Nome Fantasia" value={settings.nomeFantasia} onChange={(e) => updateSetting('nomeFantasia', e.target.value)} />
                  </div>
                  <div>
                    <label className={labelClass}>{settings.pessoaFisica ? 'CPF' : 'CNPJ'}</label>
                    <input type="text" className={inputClass} placeholder={settings.pessoaFisica ? '000.000.000-00' : '00.000.000/0000-00'} value={settings.cnpj} onChange={(e) => updateSetting('cnpj', e.target.value)} />
                  </div>
                  <div>
                    <label className={labelClass}>Inscrição Estadual</label>
                    <input type="text" className={inputClass} placeholder="Inscrição Estadual" value={settings.inscricaoEstadual} onChange={(e) => updateSetting('inscricaoEstadual', e.target.value)} />
                  </div>
                  <div>
                    <label className={labelClass}>Inscrição Municipal</label>
                    <input type="text" className={inputClass} placeholder="Inscrição Municipal" value={settings.inscricaoMunicipal} onChange={(e) => updateSetting('inscricaoMunicipal', e.target.value)} />
                  </div>
                  <div>
                    <label className={labelClass}>Regime Tributário</label>
                    <select className={`${inputClass} appearance-none`} value={settings.regimeTributario} onChange={(e) => updateSetting('regimeTributario', e.target.value)}>
                      <option value="" className="bg-[#0b1020]">Selecione...</option>
                      <option value="SIMPLES_NACIONAL" className="bg-[#0b1020]">Simples Nacional</option>
                      <option value="LUCRO_PRESUMIDO" className="bg-[#0b1020]">Lucro Presumido</option>
                      <option value="LUCRO_REAL" className="bg-[#0b1020]">Lucro Real</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ABA 2: CONTATO */}
          {activeTab === 'contato' && (
            <div className={`animate-in fade-in duration-300 ${cardClass}`}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className={labelClass}>E-mail de Contato</label>
                  <input type="email" className={inputClass} placeholder="contato@empresa.com" value={settings.email} onChange={(e) => updateSetting('email', e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>Telefone / WhatsApp</label>
                  <input type="text" className={inputClass} placeholder="(00) 00000-0000" value={settings.telefone} onChange={(e) => updateSetting('telefone', e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {/* ABA 3: ENDEREÇO */}
          {activeTab === 'endereco' && (
            <div className={`animate-in fade-in duration-300 ${cardClass}`}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <label className={labelClass}>CEP</label>
                  <input type="text" className={inputClass} placeholder="00000-000" value={settings.cep} onChange={(e) => updateSetting('cep', e.target.value)} />
                </div>
                <div className="md:col-span-2">
                  <label className={labelClass}>Logradouro</label>
                  <input type="text" className={inputClass} placeholder="Rua, Avenida, etc." value={settings.logradouro} onChange={(e) => updateSetting('logradouro', e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>Número</label>
                  <input type="text" className={inputClass} placeholder="123" value={settings.numero} onChange={(e) => updateSetting('numero', e.target.value)} />
                </div>
                <div className="md:col-span-2">
                  <label className={labelClass}>Complemento</label>
                  <input type="text" className={inputClass} placeholder="Sala, Andar, Galpão" value={settings.complemento} onChange={(e) => updateSetting('complemento', e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>Bairro</label>
                  <input type="text" className={inputClass} placeholder="Bairro" value={settings.bairro} onChange={(e) => updateSetting('bairro', e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>Município</label>
                  <input type="text" className={inputClass} placeholder="Cidade" value={settings.municipio} onChange={(e) => updateSetting('municipio', e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>UF</label>
                  <input type="text" className={inputClass} placeholder="SP" maxLength={2} value={settings.uf} onChange={(e) => updateSetting('uf', e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {/* ABA 4: RESPONSÁVEL */}
          {activeTab === 'responsavel' && (
            <div className={`animate-in fade-in duration-300 ${cardClass}`}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className={labelClass}>Nome do Responsável</label>
                  <input type="text" className={inputClass} placeholder="Nome Completo" value={settings.nomeResponsavel} onChange={(e) => updateSetting('nomeResponsavel', e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>CPF do Responsável</label>
                  <input type="text" className={inputClass} placeholder="000.000.000-00" value={settings.cpfResponsavel} onChange={(e) => updateSetting('cpfResponsavel', e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {/* ABA 5: DOCUMENTOS FISCAIS */}
          {activeTab === 'documentos' && (
            <div className="space-y-5 animate-in fade-in duration-300">
              
              {/* 🚀 NOVA SEÇÃO: CERTIFICADO DIGITAL E CSC */}
              <div className={cardClass}>
                <div className="flex items-center space-x-3 mb-5 border-b border-white/5 pb-4">
                  <ShieldCheck className="w-5 h-5 text-violet-400" />
                  <h3 className="font-bold text-lg text-white">Certificado Digital & Credenciais</h3>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Bloco Certificado A1 */}
                  <div className="space-y-4 bg-white/[0.01] p-4 rounded-xl border border-white/5">
                    <h4 className="font-bold text-sm text-slate-300 mb-3">Certificado A1 (.pfx ou .p12)</h4>
                    <div>
                      <label className={labelClass}>Arquivo do Certificado</label>
                      <div className="flex items-center space-x-3">
                        <input
                          type="file"
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateSetting('certificado', e.target.files?.[0] || null)}
                          className="hidden"
                          id="certificado-upload"
                          accept=".pfx,.p12"
                        />
                        <button 
                          onClick={() => document.getElementById('certificado-upload')?.click()}
                          className="flex w-full items-center justify-center text-sm font-semibold bg-white/5 border border-white/10 hover:bg-white/10 text-white px-4 py-2.5 rounded-xl transition-colors"
                        >
                          <Upload className="w-4 h-4 mr-2 text-violet-400" /> 
                          {settings.certificado ? settings.certificado.name : 'Selecionar Arquivo'}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className={labelClass}>Senha do Certificado</label>
                      <div className="relative">
                        <Key className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                        <input 
                          type="password" 
                          className={`${inputClass} pl-11`} 
                          placeholder="••••••••" 
                          value={settings.senhaCertificado} 
                          onChange={(e) => updateSetting('senhaCertificado', e.target.value)} 
                        />
                      </div>
                    </div>
                  </div>

                  {/* Bloco CSC / Token NFC-e */}
                  <div className="space-y-4 bg-white/[0.01] p-4 rounded-xl border border-white/5">
                    <h4 className="font-bold text-sm text-slate-300 mb-3">Credenciais SEFAZ (NFC-e)</h4>
                    <div>
                      <label className={labelClass}>ID do Token (CSC)</label>
                      <div className="relative">
                        <Hash className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                        <input 
                          type="text" 
                          className={`${inputClass} pl-11`} 
                          placeholder="Ex: 000001" 
                          value={settings.cscId} 
                          onChange={(e) => updateSetting('cscId', e.target.value)} 
                        />
                      </div>
                    </div>
                    <div>
                      <label className={labelClass}>Código Hash (CSC)</label>
                      <div className="relative">
                        <ShieldCheck className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                        <input 
                          type="text" 
                          className={`${inputClass} pl-11 font-mono text-xs`} 
                          placeholder="Hash alfanumérico gerado no portal da SEFAZ" 
                          value={settings.cscHash} 
                          onChange={(e) => updateSetting('cscHash', e.target.value)} 
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* SEÇÃO RNTRC */}
              <div className={cardClass}>
                <div className="w-full md:w-1/3">
                  <label className={labelClass}>RNTRC (Para Transporte/CTe)</label>
                  <input type="text" className={inputClass} placeholder="Registro Nacional" value={settings.rntrc} onChange={(e) => updateSetting('rntrc', e.target.value)} />
                </div>
              </div>

              {/* SEÇÃO SÉRIES E NÚMEROS */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {[
                  { title: 'NFe', toggleKey: 'nfeToggle', prefix: 'nfe' },
                  { title: 'NFCe', toggleKey: 'nfceToggle', prefix: 'nfce' },
                  { title: 'NFSe (Serviços)', toggleKey: 'nfseToggle', prefix: 'nfse' },
                  { title: 'CTe (Transporte)', toggleKey: 'cteToggle', prefix: 'cte' },
                  { title: 'MDFe (Manifesto)', toggleKey: 'mdfeToggle', prefix: 'mdfe' },
                ].map((doc) => (
                  <div key={doc.prefix} className={cardClass}>
                    <div className="flex items-center justify-between mb-5 border-b border-white/5 pb-4">
                      <div className="flex items-center space-x-3">
                        <FileText className="w-5 h-5 text-violet-400" />
                        <h3 className="font-bold text-lg text-white">{doc.title}</h3>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="sr-only peer" 
                          checked={settings[doc.toggleKey as keyof CompanySettings] as boolean}
                          onChange={(e) => updateSetting(doc.toggleKey as keyof CompanySettings, e.target.checked)}
                        />
                        <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-violet-500"></div>
                      </label>
                    </div>
                    
                    <div className="space-y-4">
                      {/* Homologação */}
                      <div className="bg-white/[0.02] p-4 rounded-xl border border-white/5">
                        <h4 className="font-bold text-sm text-slate-300 mb-3 flex items-center"><span className="w-2 h-2 bg-blue-400 rounded-full mr-2 shadow-[0_0_8px_rgba(96,165,250,0.8)]"></span> AMBIENTE: HOMOLOGAÇÃO</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className={labelClass}>Série</label>
                            <input type="text" className={inputClass} value={settings[`${doc.prefix}HomologacaoSerie` as keyof CompanySettings] as string} onChange={(e) => updateSetting(`${doc.prefix}HomologacaoSerie` as keyof CompanySettings, e.target.value)} />
                          </div>
                          <div>
                            <label className={labelClass}>Próximo Número</label>
                            <input type="text" className={inputClass} value={settings[`${doc.prefix}HomologacaoNumero` as keyof CompanySettings] as string} onChange={(e) => updateSetting(`${doc.prefix}HomologacaoNumero` as keyof CompanySettings, e.target.value)} />
                          </div>
                        </div>
                      </div>
                      
                      {/* Produção */}
                      <div className="bg-white/[0.02] p-4 rounded-xl border border-white/5">
                        <h4 className="font-bold text-sm text-slate-300 mb-3 flex items-center"><span className="w-2 h-2 bg-emerald-400 rounded-full mr-2 shadow-[0_0_8px_rgba(52,211,153,0.8)]"></span> AMBIENTE: PRODUÇÃO</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className={labelClass}>Série</label>
                            <input type="text" className={inputClass} value={settings[`${doc.prefix}ProducaoSerie` as keyof CompanySettings] as string} onChange={(e) => updateSetting(`${doc.prefix}ProducaoSerie` as keyof CompanySettings, e.target.value)} />
                          </div>
                          <div>
                            <label className={labelClass}>Próximo Número</label>
                            <input type="text" className={inputClass} value={settings[`${doc.prefix}ProducaoNumero` as keyof CompanySettings] as string} onChange={(e) => updateSetting(`${doc.prefix}ProducaoNumero` as keyof CompanySettings, e.target.value)} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default ConfiguracoesLoja;