import { useEffect, useState, type ChangeEvent, type FC } from 'react';
import { isAxiosError } from 'axios';
import { Upload, Save, Building2, Phone, MapPin, UserSquare2, FileText, ShieldCheck, Key, Hash, CloudCog, Scale, Trash2, RefreshCw, Link2 } from 'lucide-react';
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
  cnaePrincipal: string;
  tipoLoja: 'MATRIZ' | 'FILIAL';
  matrizId: string;
  pessoaFisica: boolean;
  logo: File | null;
  /** URL absoluta ou data URL persistida no servidor */
  logoUrl: string;
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
  /** Metadados do A1 já salvos (GET não retorna o binário) */
  possuiCertificado: boolean;
  certificadoNome: string;
  certificadoValidade: string;
  senhaCertificado: string;
  cscId: string;
  cscHash: string;
  rntrc: string;

  /** Slug público do cardápio delivery (apenas minúsculas, números e hífens). */
  slug: string;
  
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

  /** HOMOLOGACAO | PRODUCAO — mensageria fiscal por loja */
  ambienteFiscal: string;
  focusTokenHomologacao: string;
  focusTokenProducao: string;
}

function formatarDataBr(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export const ConfiguracoesLoja: FC = () => {
  // 🚀 2. INICIALIZAMOS O NAVEGADOR
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<string>('identificacao');
  
  const [lojasMatriz, setLojasMatriz] = useState<
    { id: string; nome: string; nomeFantasia?: string | null; cnpj?: string | null }[]
  >([]);

  const [removerLogo, setRemoverLogo] = useState(false);
  const [removerCertificado, setRemoverCertificado] = useState(false);
  const [logoPreviewLocal, setLogoPreviewLocal] = useState<string | null>(null);

  const [settings, setSettings] = useState<CompanySettings>({
    nomeFantasia: '', razaoSocial: '', cnpj: '', inscricaoEstadual: '', inscricaoMunicipal: '',
    regimeTributario: '', cnaePrincipal: '', tipoLoja: 'MATRIZ', matrizId: '', pessoaFisica: false, logo: null, logoUrl: '', email: '', telefone: '',
    cep: '', logradouro: '', numero: '', complemento: '', bairro: '', municipio: '', uf: '',
    nomeResponsavel: '', cpfResponsavel: '', 
    certificado: null,
    possuiCertificado: false,
    certificadoNome: '',
    certificadoValidade: '',
    senhaCertificado: '', cscId: '', cscHash: '', rntrc: '', slug: '',
    nfeHomologacaoSerie: '', nfeHomologacaoNumero: '', nfeProducaoSerie: '', nfeProducaoNumero: '', nfeToggle: false,
    nfceHomologacaoSerie: '', nfceHomologacaoNumero: '', nfceProducaoSerie: '', nfceProducaoNumero: '', nfceToggle: false,
    nfseHomologacaoSerie: '', nfseHomologacaoNumero: '', nfseProducaoSerie: '', nfseProducaoNumero: '', nfseToggle: false,
    cteHomologacaoSerie: '', cteHomologacaoNumero: '', cteProducaoSerie: '', cteProducaoNumero: '', cteToggle: false,
    mdfeHomologacaoSerie: '', mdfeHomologacaoNumero: '', mdfeProducaoSerie: '', mdfeProducaoNumero: '', mdfeToggle: false,
    ambienteFiscal: 'HOMOLOGACAO',
    focusTokenHomologacao: '',
    focusTokenProducao: '',
  });

  useEffect(() => {
    const carregarMatrizes = async () => {
      try {
        const r = await api.get('/api/lojas/estabelecimentos-matriz');
        setLojasMatriz(Array.isArray(r.data) ? r.data : []);
      } catch {
        setLojasMatriz([]);
      }
    };
    void carregarMatrizes();
  }, []);

  useEffect(() => {
    if (!settings.logo) {
      setLogoPreviewLocal(null);
      return;
    }
    const u = URL.createObjectURL(settings.logo);
    setLogoPreviewLocal(u);
    return () => URL.revokeObjectURL(u);
  }, [settings.logo]);

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
                email: usuario.loja.emailContato ?? usuario.loja.email ?? prev.email,
                telefone: usuario.loja.telefoneContato ?? usuario.loja.telefone ?? prev.telefone,
             }));
          }
        }

        const response = await api.get('/api/lojas/minha-loja');
        const lojaDB = response.data;

        if (lojaDB) {
          setSettings(prev => ({
            ...prev,
            razaoSocial: lojaDB.razaoSocial ?? lojaDB.nome ?? prev.razaoSocial,
            nomeFantasia: lojaDB.nomeFantasia ?? lojaDB.nome ?? prev.nomeFantasia,
            cnpj: lojaDB.cnpj ?? prev.cnpj,
            inscricaoEstadual: lojaDB.inscricaoEstadual ?? prev.inscricaoEstadual,
            inscricaoMunicipal: lojaDB.inscricaoMunicipal ?? prev.inscricaoMunicipal,
            cnaePrincipal: lojaDB.cnaePrincipal ?? prev.cnaePrincipal,
            regimeTributario: lojaDB.regimeTributario ?? prev.regimeTributario,
            tipoLoja: lojaDB.tipoLoja === 'FILIAL' ? 'FILIAL' : 'MATRIZ',
            matrizId: lojaDB.matrizId ?? prev.matrizId,
            email: lojaDB.emailContato ?? lojaDB.email ?? prev.email,
            telefone: lojaDB.telefoneContato ?? lojaDB.telefone ?? prev.telefone,
            cep: lojaDB.cep ?? prev.cep,
            logradouro: lojaDB.logradouro ?? prev.logradouro,
            numero: lojaDB.numero ?? prev.numero,
            complemento: lojaDB.complemento ?? prev.complemento,
            bairro: lojaDB.bairro ?? prev.bairro,
            municipio: lojaDB.cidade ?? prev.municipio,
            uf: lojaDB.uf ?? prev.uf,
            nomeResponsavel: lojaDB.nomeResponsavel ?? prev.nomeResponsavel,
            cpfResponsavel: lojaDB.cpfResponsavel ?? prev.cpfResponsavel,
            pessoaFisica: Boolean(lojaDB.isPessoaFisica),
            ambienteFiscal: (lojaDB.ambienteFiscal || lojaDB.ambienteSefaz || 'HOMOLOGACAO').toString().toUpperCase(),
            focusTokenHomologacao: lojaDB.focusTokenHomologacao ?? prev.focusTokenHomologacao,
            focusTokenProducao: lojaDB.focusTokenProducao ?? prev.focusTokenProducao,
            senhaCertificado: lojaDB.senhaCertificado ?? prev.senhaCertificado,
            cscId: lojaDB.cscId ?? prev.cscId,
            cscHash: lojaDB.cscSecret ?? prev.cscHash,
            rntrc: lojaDB.rntrc ?? prev.rntrc,
            nfeToggle: Boolean(lojaDB.nfeAtivo),
            nfeHomologacaoSerie: lojaDB.nfeSerieHomologacao != null ? String(lojaDB.nfeSerieHomologacao) : prev.nfeHomologacaoSerie,
            nfeHomologacaoNumero: lojaDB.nfeNumeroHomologacao != null ? String(lojaDB.nfeNumeroHomologacao) : prev.nfeHomologacaoNumero,
            nfeProducaoSerie: lojaDB.nfeSerieProducao != null ? String(lojaDB.nfeSerieProducao) : prev.nfeProducaoSerie,
            nfeProducaoNumero: lojaDB.nfeNumeroProducao != null ? String(lojaDB.nfeNumeroProducao) : prev.nfeProducaoNumero,
            nfceToggle: Boolean(lojaDB.nfceAtivo),
            nfceHomologacaoSerie: lojaDB.nfceSerieHomologacao != null ? String(lojaDB.nfceSerieHomologacao) : prev.nfceHomologacaoSerie,
            nfceHomologacaoNumero: lojaDB.nfceNumeroHomologacao != null ? String(lojaDB.nfceNumeroHomologacao) : prev.nfceHomologacaoNumero,
            nfceProducaoSerie: lojaDB.nfceSerieProducao != null ? String(lojaDB.nfceSerieProducao) : prev.nfceProducaoSerie,
            nfceProducaoNumero: lojaDB.nfceNumeroProducao != null ? String(lojaDB.nfceNumeroProducao) : prev.nfceProducaoNumero,
            nfseToggle: Boolean(lojaDB.nfseAtivo),
            nfseHomologacaoSerie: lojaDB.nfseSerieHomologacao ?? prev.nfseHomologacaoSerie,
            nfseHomologacaoNumero: lojaDB.nfseNumeroHomologacao != null ? String(lojaDB.nfseNumeroHomologacao) : prev.nfseHomologacaoNumero,
            nfseProducaoSerie: lojaDB.nfseSerieProducao ?? prev.nfseProducaoSerie,
            nfseProducaoNumero: lojaDB.nfseNumeroProducao != null ? String(lojaDB.nfseNumeroProducao) : prev.nfseProducaoNumero,
            cteToggle: Boolean(lojaDB.cteAtivo),
            cteHomologacaoSerie: lojaDB.cteSerieHomologacao != null ? String(lojaDB.cteSerieHomologacao) : prev.cteHomologacaoSerie,
            cteHomologacaoNumero: lojaDB.cteNumeroHomologacao != null ? String(lojaDB.cteNumeroHomologacao) : prev.cteHomologacaoNumero,
            cteProducaoSerie: lojaDB.cteSerieProducao != null ? String(lojaDB.cteSerieProducao) : prev.cteProducaoSerie,
            cteProducaoNumero: lojaDB.cteNumeroProducao != null ? String(lojaDB.cteNumeroProducao) : prev.cteProducaoNumero,
            mdfeToggle: Boolean(lojaDB.mdfeAtivo),
            mdfeHomologacaoSerie: lojaDB.mdfeSerieHomologacao != null ? String(lojaDB.mdfeSerieHomologacao) : prev.mdfeHomologacaoSerie,
            mdfeHomologacaoNumero: lojaDB.mdfeNumeroHomologacao != null ? String(lojaDB.mdfeNumeroHomologacao) : prev.mdfeHomologacaoNumero,
            mdfeProducaoSerie: lojaDB.mdfeSerieProducao != null ? String(lojaDB.mdfeSerieProducao) : prev.mdfeProducaoSerie,
            mdfeProducaoNumero: lojaDB.mdfeNumeroProducao != null ? String(lojaDB.mdfeNumeroProducao) : prev.mdfeProducaoNumero,
            logoUrl: lojaDB.logoUrl ?? prev.logoUrl,
            slug: typeof lojaDB.slug === 'string' ? lojaDB.slug : prev.slug,
            possuiCertificado: Boolean(lojaDB.possuiCertificado),
            certificadoNome: lojaDB.certificadoNome ?? prev.certificadoNome,
            certificadoValidade: lojaDB.certificadoValidade ?? prev.certificadoValidade,
            logo: null,
            certificado: null,
          }));
          setRemoverLogo(false);
          setRemoverCertificado(false);
        }
      } catch (error) {
        console.error('Erro ao buscar dados completos da loja na API:', error);
      }
    };

    carregarDadosDaLoja();
  }, []);

  const handleSave = async () => {
    try {
      const { logo, certificado, logoUrl: _omitLogoUrl, ...restSemArquivos } = settings;
      const payload = {
        ...restSemArquivos,
        removerLogo,
        removerCertificado,
      };

      const precisaMultipart = logo != null || certificado != null;

      const response = precisaMultipart
        ? await (() => {
            const fd = new FormData();
            fd.append('payload', JSON.stringify(payload));
            if (logo) fd.append('logo', logo);
            if (certificado) fd.append('certificado', certificado);
            return api.put('/api/lojas/minha-loja', fd);
          })()
        : await api.put('/api/lojas/minha-loja', payload);

      const loja = response.data.loja as {
        logoUrl?: string | null;
        possuiCertificado?: boolean;
        certificadoNome?: string | null;
        certificadoValidade?: string | null;
      };

      setSettings((prev) => ({
        ...prev,
        logo: null,
        certificado: null,
        logoUrl: loja.logoUrl ?? (removerLogo ? '' : prev.logoUrl),
        possuiCertificado: Boolean(loja.possuiCertificado),
        certificadoNome: loja.certificadoNome ?? '',
        certificadoValidade: loja.certificadoValidade ?? '',
      }));
      setRemoverLogo(false);
      setRemoverCertificado(false);

      alert('✅ Configurações salvas com sucesso!');

      const userStr = localStorage.getItem('@PDVUsuario');
      if (userStr) {
        const usuario = JSON.parse(userStr);
        usuario.loja = { ...usuario.loja, ...response.data.loja };
        localStorage.setItem('@PDVUsuario', JSON.stringify(usuario));
        window.dispatchEvent(new Event('lojaAtualizada'));
      }

      navigate('/');
    } catch (error: unknown) {
      console.error('Erro ao salvar:', error);
      const apiMsg =
        isAxiosError<{ error?: string }>(error) && typeof error.response?.data?.error === 'string'
          ? error.response.data.error
          : null;
      alert(apiMsg ? `Erro: ${apiMsg}` : 'Erro ao salvar configurações. Tente novamente.');
    }
  };

  const updateSetting = (key: keyof CompanySettings, value: string | boolean | File | null) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const updateTipoLoja = (v: 'MATRIZ' | 'FILIAL') => {
    setSettings(prev => ({
      ...prev,
      tipoLoja: v,
      matrizId: v === 'MATRIZ' ? '' : prev.matrizId,
    }));
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
            { id: 'fiscal', label: 'Dados Fiscais', icon: Scale },
            { id: 'contato', label: 'Contato', icon: Phone },
            { id: 'endereco', label: 'Endereço', icon: MapPin },
            { id: 'responsavel', label: 'Responsável', icon: UserSquare2 },
            { id: 'documentos', label: 'Documentos Fiscais', icon: FileText },
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
                
                <div className="flex flex-col items-end gap-3 sm:flex-row sm:items-center">
                  <input
                    type="file"
                    id="logo-upload"
                    className="hidden"
                    accept="image/*"
                    onChange={(e: ChangeEvent<HTMLInputElement>) => {
                      setRemoverLogo(false);
                      updateSetting('logo', e.target.files?.[0] || null);
                    }}
                  />
                  {logoPreviewLocal || (settings.logoUrl && !removerLogo) ? (
                    <div className="flex items-center gap-4">
                      <div className="relative h-[100px] w-[100px] shrink-0 overflow-hidden rounded-2xl border border-white/15 bg-white/[0.04] shadow-inner">
                        <img
                          src={logoPreviewLocal ?? settings.logoUrl}
                          alt="Logo da empresa"
                          className="h-full w-full object-contain p-1"
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <button
                          type="button"
                          onClick={() => document.getElementById('logo-upload')?.click()}
                          className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-white hover:bg-white/10"
                        >
                          <RefreshCw className="h-3.5 w-3.5 text-violet-400" />
                          Trocar logo
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setRemoverLogo(true);
                            updateSetting('logo', null);
                          }}
                          className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-200 hover:bg-red-500/20"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Remover logo
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-end gap-2">
                      {removerLogo && (
                        <span className="text-[11px] font-medium text-amber-400/90">
                          Logo será removida ao salvar. Escolha um arquivo para desfazer.
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => document.getElementById('logo-upload')?.click()}
                        className="flex items-center text-sm font-semibold bg-white/5 border border-white/10 hover:bg-white/10 text-white px-4 py-2.5 rounded-xl transition-colors"
                      >
                        <Upload className="w-4 h-4 mr-2 text-violet-400" />
                        Anexar logo
                      </button>
                    </div>
                  )}
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
                  <div className="md:col-span-2">
                    <label className={labelClass}>
                      <span className="inline-flex items-center gap-1.5">
                        <Link2 className="h-3.5 w-3.5 text-violet-400" />
                        Link do Delivery (slug)
                      </span>
                    </label>
                    <input
                      type="text"
                      className={`${inputClass} font-mono text-sm`}
                      placeholder="ex.: minha-hamburgueria"
                      autoComplete="off"
                      spellCheck={false}
                      value={settings.slug}
                      onChange={(e) => {
                        const v = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
                        updateSetting('slug', v);
                      }}
                    />
                    <p className="mt-2 text-xs leading-relaxed text-slate-500">
                      Apenas letras minúsculas, números e hífens. Deixe em branco se não quiser usar um link curto ainda.
                    </p>
                    {settings.slug.trim() !== '' ? (
                      <p className="mt-2 text-xs text-slate-400">
                        Seu link será:{' '}
                        <span className="break-all font-mono text-[13px] text-violet-200/95">
                          {typeof window !== 'undefined'
                            ? `${window.location.origin}${window.location.pathname.replace(/\/$/, '')}`
                            : ''}
                          #/delivery/{settings.slug.trim()}
                        </span>
                      </p>
                    ) : null}
                  </div>
                  <div>
                    <label className={labelClass}>{settings.pessoaFisica ? 'CPF' : 'CNPJ'}</label>
                    <input type="text" className={inputClass} placeholder={settings.pessoaFisica ? '000.000.000-00' : '00.000.000/0000-00'} value={settings.cnpj} onChange={(e) => updateSetting('cnpj', e.target.value)} />
                  </div>
                  <div>
                    <label className={labelClass}>Tipo de Estabelecimento</label>
                    <select
                      className={`${inputClass} appearance-none`}
                      value={settings.tipoLoja}
                      onChange={(e) => updateTipoLoja(e.target.value === 'FILIAL' ? 'FILIAL' : 'MATRIZ')}
                    >
                      <option value="MATRIZ" className="bg-[#0b1020]">
                        Matriz
                      </option>
                      <option value="FILIAL" className="bg-[#0b1020]">
                        Filial
                      </option>
                    </select>
                  </div>
                  {settings.tipoLoja === 'FILIAL' && (
                    <div className="md:col-span-2">
                      <label className={labelClass}>Loja Matriz</label>
                      <select
                        className={`${inputClass} appearance-none`}
                        value={settings.matrizId}
                        onChange={(e) => updateSetting('matrizId', e.target.value)}
                      >
                        <option value="" className="bg-[#0b1020]">
                          Selecione a matriz…
                        </option>
                        {lojasMatriz.map((m) => (
                          <option key={m.id} value={m.id} className="bg-[#0b1020]">
                            {(m.nomeFantasia || m.nome).trim()}
                            {m.cnpj ? ` — ${m.cnpj}` : ''}
                          </option>
                        ))}
                      </select>
                      {lojasMatriz.length === 0 && (
                        <p className="mt-2 text-xs text-amber-400/90">
                          Não há outras lojas matriz no mesmo cliente. Cadastre vínculos de tenant ou defina esta loja
                          como matriz.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ABA: DADOS FISCAIS */}
          {activeTab === 'fiscal' && (
            <div className={`animate-in fade-in duration-300 ${cardClass}`}>
              <div className="mb-5 border-b border-white/5 pb-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">Checklist fiscal</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Dados usados na emissão e conformidade de documentos fiscais eletrônicos.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div>
                  <label className={labelClass}>Regime Tributário</label>
                  <select
                    className={`${inputClass} appearance-none`}
                    value={settings.regimeTributario}
                    onChange={(e) => updateSetting('regimeTributario', e.target.value)}
                  >
                    <option value="" className="bg-[#0b1020]">
                      Selecione…
                    </option>
                    <option value="SIMPLES_NACIONAL" className="bg-[#0b1020]">
                      Simples Nacional
                    </option>
                    <option value="LUCRO_PRESUMIDO" className="bg-[#0b1020]">
                      Lucro Presumido
                    </option>
                    <option value="LUCRO_REAL" className="bg-[#0b1020]">
                      Lucro Real
                    </option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>CNAE Principal</label>
                  <input
                    type="text"
                    className={`${inputClass} font-mono text-xs`}
                    placeholder="0000000"
                    value={settings.cnaePrincipal}
                    onChange={(e) => updateSetting('cnaePrincipal', e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelClass}>Inscrição Estadual</label>
                  <input
                    type="text"
                    className={inputClass}
                    placeholder="IE ou &quot;ISENTO&quot; quando aplicável"
                    value={settings.inscricaoEstadual}
                    onChange={(e) => updateSetting('inscricaoEstadual', e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelClass}>Inscrição Municipal</label>
                  <input
                    type="text"
                    className={inputClass}
                    placeholder="Inscrição municipal (IM)"
                    value={settings.inscricaoMunicipal}
                    onChange={(e) => updateSetting('inscricaoMunicipal', e.target.value)}
                  />
                </div>
                <div className="md:col-span-2 mt-1 rounded-xl border border-white/10 bg-[#050913]/35 px-4 py-3">
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Certificado digital (resumo)
                  </p>
                  {removerCertificado ? (
                    <span className="inline-flex items-center rounded-full border border-amber-500/40 bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-200">
                      Certificado será removido ao salvar
                    </span>
                  ) : settings.possuiCertificado || settings.certificadoNome ? (
                    <div className="space-y-1">
                      <span className="inline-flex items-center rounded-full border border-emerald-500/40 bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-200">
                        ✅ Certificado Digital Instalado
                      </span>
                      {formatarDataBr(settings.certificadoValidade) ? (
                        <p className="text-xs text-emerald-300/90">
                          Vence em: {formatarDataBr(settings.certificadoValidade)}
                        </p>
                      ) : null}
                    </div>
                  ) : (
                    <span className="inline-flex items-center rounded-full border border-slate-600/50 bg-slate-800/50 px-3 py-1 text-xs font-semibold text-slate-400">
                      ❌ Nenhum certificado configurado
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setActiveTab('documentos')}
                    className="mt-3 text-left text-xs font-semibold text-violet-400 hover:text-violet-300"
                  >
                    Gerenciar certificado e upload → aba Documentos fiscais
                  </button>
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
                    <div className="mb-4 rounded-xl border border-white/10 bg-[#050913]/40 px-4 py-3">
                      <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Status do certificado
                      </p>
                      {removerCertificado ? (
                        <span className="inline-flex items-center rounded-full border border-amber-500/40 bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-200">
                          Certificado será removido ao salvar
                        </span>
                      ) : settings.possuiCertificado || settings.certificadoNome ? (
                        <div className="space-y-1.5">
                          <span className="inline-flex items-center rounded-full border border-emerald-500/40 bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-200">
                            ✅ Certificado Digital Instalado
                          </span>
                          {settings.certificadoNome ? (
                            <p className="text-xs text-slate-400">{settings.certificadoNome}</p>
                          ) : null}
                          {formatarDataBr(settings.certificadoValidade) ? (
                            <p className="text-xs font-medium text-emerald-300/90">
                              Vence em: {formatarDataBr(settings.certificadoValidade)}
                            </p>
                          ) : (
                            <p className="text-[11px] text-slate-500">
                              Informe a senha ao enviar o arquivo para gravarmos a data de validade.
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex items-center rounded-full border border-red-500/35 bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-200/95">
                          ❌ Nenhum certificado configurado
                        </span>
                      )}
                    </div>
                    <div>
                      <label className={labelClass}>Arquivo do Certificado</label>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:space-x-3">
                        <input
                          type="file"
                          onChange={(e: ChangeEvent<HTMLInputElement>) => {
                            setRemoverCertificado(false);
                            updateSetting('certificado', e.target.files?.[0] || null);
                          }}
                          className="hidden"
                          id="certificado-upload"
                          accept=".pfx,.p12"
                        />
                        <button
                          type="button"
                          onClick={() => document.getElementById('certificado-upload')?.click()}
                          className="flex w-full items-center justify-center text-sm font-semibold bg-white/5 border border-white/10 hover:bg-white/10 text-white px-4 py-2.5 rounded-xl transition-colors sm:flex-1"
                        >
                          <Upload className="w-4 h-4 mr-2 text-violet-400" />
                          {settings.certificado
                            ? settings.certificado.name
                            : settings.possuiCertificado || settings.certificadoNome
                              ? 'Substituir certificado'
                              : 'Fazer upload do certificado'}
                        </button>
                        {(settings.possuiCertificado || settings.certificadoNome) && !settings.certificado ? (
                          <button
                            type="button"
                            onClick={() => {
                              setRemoverCertificado(true);
                              updateSetting('certificado', null);
                            }}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-xs font-semibold text-red-200 hover:bg-red-500/20 sm:w-auto"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Remover certificado
                          </button>
                        ) : null}
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

                  <div className={cardClass}>
                    <div className="mb-4 flex items-center gap-3 border-b border-white/5 pb-4">
                      <CloudCog className="h-6 w-6 text-cyan-400" />
                      <div>
                        <h3 className="text-lg font-bold text-white">MENSAGERIA FISCAL</h3>
                        <p className="text-xs font-medium text-slate-500">
                          Ambiente por loja; credenciais opcionais (própria) ou integração padrão no servidor.
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                      <div className="md:col-span-2">
                        <label className={labelClass}>Ambiente da mensageria fiscal</label>
                        <select
                          className={inputClass}
                          value={settings.ambienteFiscal === 'PRODUCAO' ? 'PRODUCAO' : 'HOMOLOGACAO'}
                          onChange={(e) => updateSetting('ambienteFiscal', e.target.value)}
                        >
                          <option value="HOMOLOGACAO">HOMOLOGAÇÃO</option>
                          <option value="PRODUCAO">PRODUÇÃO</option>
                        </select>
                      </div>
                      <div>
                        <label className={labelClass}>Credencial (homologação)</label>
                        <input
                          type="password"
                          autoComplete="off"
                          className={`${inputClass} font-mono text-xs`}
                          placeholder="Opcional — deixe em branco para integração padrão"
                          value={settings.focusTokenHomologacao}
                          onChange={(e) => updateSetting('focusTokenHomologacao', e.target.value)}
                        />
                        <p className="mt-1.5 text-xs text-slate-500">
                          Deixe em branco para utilizar a integração padrão do Aurya ERP.
                        </p>
                      </div>
                      <div>
                        <label className={labelClass}>Credencial (produção)</label>
                        <input
                          type="password"
                          autoComplete="off"
                          className={`${inputClass} font-mono text-xs`}
                          placeholder="Opcional — deixe em branco para integração padrão"
                          value={settings.focusTokenProducao}
                          onChange={(e) => updateSetting('focusTokenProducao', e.target.value)}
                        />
                        <p className="mt-1.5 text-xs text-slate-500">
                          Deixe em branco para utilizar a integração padrão do Aurya ERP.
                        </p>
                      </div>
                    </div>
                    <p className="mt-4 text-[11px] font-semibold uppercase tracking-wide text-amber-400/90">
                      Credenciais por ambiente na loja; se vazias, o servidor aplica a integração padrão (emissão e
                      consulta de documentos fiscais).
                    </p>
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