import React, { useState, useEffect } from 'react';
import { Layout } from '../../components/Layout';
import { api } from '../../services/api';
import { AxiosError } from 'axios';
import { 
  Search, Users, CheckCircle2, ChevronRight, ChevronLeft, Save, Sparkles,
  Building2, MapPin, Phone, Receipt, Wallet, Loader2, X, Edit2, Trash2, Hash
} from 'lucide-react';

import { 
  IPessoa, IIASugestoes, ICnpjResponse, IApiError, RegimeTributario 
} from '../../types/pessoa';

// Importação dos Componentes
import { FormDadosPrincipais } from '../../components/pessoas/FormDadosPrincipais';
import { FormDadosFiscais } from '../../components/pessoas/FormDadosFiscais';
import { FormEndereco } from '../../components/pessoas/FormEndereco';
import { FormContato } from '../../components/pessoas/FormContato';

export function CadastroPessoa() {
  const [pessoas, setPessoas] = useState<IPessoa[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [termoBusca, setTermoBusca] = useState<string>('');
  const [tipoFiltro, setTipoFiltro] = useState<string>('');
  
  const [modalAberto, setModalAberto] = useState<boolean>(false);
  const [stepAtual, setStepAtual] = useState<number>(1);
  const totalSteps = 5;

  const [iaLoading, setIaLoading] = useState<boolean>(false);
  const [iaSugestoes, setIaSugestoes] = useState<IIASugestoes | null>(null);

  const estadoInicial: IPessoa = { 
    id: '', 
    codigo: '', 
    tipo: 'JURIDICA', 
    cpfCnpj: '', 
    razaoSocial: '', 
    nomeFantasia: '', 
    indicadorIE: 'NAO_CONTRIBUINTE', 
    inscricaoEstadual: '', 
    inscricaoMunicipal: '', 
    regimeTributario: '', 
    cnae: '', 
    cep: '', 
    logradouro: '', 
    numero: '', 
    complemento: '', 
    bairro: '', 
    cidade: '', 
    estado: '', 
    telefone: '', 
    email: '', 
    contatoPrincipal: '', 
    limiteCredito: '', 
    prazoPadrao: '', 
    observacoes: '' 
  };

  const [formData, setFormData] = useState<IPessoa>(estadoInicial);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      carregarDados();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [termoBusca, tipoFiltro]);

  const carregarDados = async () => {
    setLoading(true);
    try {
      const response = await api.get<IPessoa[]>('/api/pessoas', { 
        params: { busca: termoBusca || undefined, tipo: tipoFiltro || undefined }
      });
      setPessoas(response.data);
    } catch (err) {
      const error = err as AxiosError<IApiError>;
      console.error("Erro ao carregar pessoas", error.response?.data || error.message);
    } finally {
      setLoading(false);
    }
  };

  const abrirModalNovo = () => {
    setFormData(estadoInicial);
    setStepAtual(1);
    setIaSugestoes(null);
    setModalAberto(true);
  };

  const abrirModalEditar = (pessoa: IPessoa) => {
    setFormData({
      ...pessoa,
      codigo: pessoa.codigo || '', 
      tipo: pessoa.tipo || 'JURIDICA',
      cpfCnpj: pessoa.cpfCnpj || pessoa.cnpjCpf || '',
      limiteCredito: pessoa.limiteCredito?.toString() || '',
      prazoPadrao: pessoa.prazoPadrao?.toString() || '',
      observacoes: pessoa.obsGerais || pessoa.observacoes || ''
    });
    setStepAtual(1);
    
    if (pessoa.limiteCredito) {
      setIaSugestoes({
        tipo: 'Cliente Ativo', categoria: 'Varejo / Serviços', risco: 'Baixo',
        prazo: `${pessoa.prazoPadrao || 28} dias`,
        insights: [
          "Este cliente tem histórico sólido e potencial de compra alto.",
          `Recomendado manter limite de crédito: R$ ${Number(pessoa.limiteCredito).toFixed(2)}`
        ]
      });
    } else {
      setIaSugestoes(null);
    }
    setModalAberto(true);
  };

  const preencherComAurya = async () => {
    const cnpjLimpo = formData.cpfCnpj.replace(/\D/g, '');
    if (cnpjLimpo.length !== 14) {
      alert("Por favor, digite um CNPJ válido com 14 dígitos.");
      return;
    }
    
    setIaLoading(true);
    try {
      const response = await api.get<ICnpjResponse>(`/api/cnpj/${cnpjLimpo}`);
      const dados = response.data;

      const razaoSocial = dados.razao_social || dados.nome || '';
      const nomeFantasia = dados.nome_fantasia || dados.fantasia || razaoSocial;
      const cnae = dados.cnae_fiscal || dados.atividade_principal?.[0]?.code?.replace(/\D/g, '') || '';
      const naturezaJuridica = dados.natureza_juridica || '';
      
      const regimeInferido = (naturezaJuridica.toUpperCase().includes('MICROEMPREENDEDOR') || naturezaJuridica.toUpperCase().includes('MEI'))
        ? 'SIMPLES_NACIONAL' : 'LUCRO_PRESUMIDO';

      setFormData(prev => ({
        ...prev,
        razaoSocial: razaoSocial || prev.razaoSocial,
        nomeFantasia: nomeFantasia || prev.nomeFantasia,
        cep: dados.cep?.replace(/\D/g, '') || prev.cep,
        logradouro: dados.logradouro || prev.logradouro,
        numero: dados.numero || prev.numero,
        complemento: dados.complemento || prev.complemento,
        bairro: dados.bairro || prev.bairro,
        cidade: dados.municipio || prev.cidade,
        estado: dados.uf || prev.estado,
        telefone: dados.ddd_telefone_1 || dados.telefone || prev.telefone,
        email: dados.email || prev.email,
        cnae: cnae || prev.cnae,
        regimeTributario: regimeInferido as RegimeTributario,
        indicadorIE: 'ISENTO', 
        inscricaoEstadual: 'ISENTO', 
        limiteCredito: '15000', 
        prazoPadrao: '21'       
      }));
      
      const descSituacao = dados.descricao_situacao_cadastral || dados.situacao || 'ATIVA';
      const descAtividade = dados.cnae_fiscal_descricao || dados.atividade_principal?.[0]?.text || 'Comércio/Serviços';

      setIaSugestoes({
        tipo: 'Cliente Potencial', categoria: descAtividade.split(' ')[0] || 'Varejo',
        risco: descSituacao === 'ATIVA' ? 'Baixo' : 'Alto', prazo: '21 dias',
        insights: [
          `Empresa com situação ${descSituacao} na Receita Federal.`,
          "Dados fiscais e tributários preenchidos automaticamente.",
          "Recomendado limite de crédito inicial: R$ 15.000,00",
          "Prazo ideal sugerido para primeira compra: 21 dias."
        ]
      });

    } catch (err) {
      const error = err as AxiosError<IApiError>;
      console.error("Erro na busca de CNPJ:", error.response?.data || error.message);
      alert("A Aurya não conseguiu localizar este CNPJ. Verifique o número digitado.");
    } finally {
      setIaLoading(false);
    }
  };

  const handleSalvar = async (forcarCadastro: boolean = false) => {
    // 🚀 ATUALIZADO: Removida a trava do código obrigatório. O Backend assume o controle se vier vazio!
    if (!formData.razaoSocial || formData.razaoSocial.trim() === '') {
      alert("⚠️ A Razão Social ou Nome é obrigatória!");
      setStepAtual(1);
      return;
    }

    try {
      const payload = {
        ...formData,
        codigo: formData.codigo ? formData.codigo.trim() : '', // ✅ Proteção ativada!
        limiteCredito: parseFloat(String(formData.limiteCredito)) || 0,
        prazoPadrao: parseInt(String(formData.prazoPadrao)) || 0,
        forceCadastro: forcarCadastro 
      };

      if (formData.id) {
        await api.put(`/api/pessoas/${formData.id}`, payload);
      } else {
        await api.post('/api/pessoas', payload);
      }

      alert(`✅ Parceiro salvo com sucesso!`);
      setModalAberto(false);
      carregarDados(); 
      
    } catch (err: any) {
      if (err.response?.status === 409 && err.response?.data?.precisaConfirmacao) {
        const confirmacao = window.confirm(err.response.data.mensagem);
        if (confirmacao) {
          handleSalvar(true); 
          return;
        } else {
          return; 
        }
      }

      const errorMessage = err.response?.data?.error || err.response?.data?.mensagem || "Ocorreu um erro ao salvar os dados.";
      alert(errorMessage);
    }
  };

  const excluirPessoa = async (id: string) => {
    if(!window.confirm("Deseja realmente excluir este parceiro?")) return;
    try {
      await api.delete(`/api/pessoas/${id}`);
      carregarDados();
    } catch (err) {
      const error = err as AxiosError<IApiError>;
      alert(error.response?.data?.error || error.response?.data?.mensagem || "Erro ao excluir parceiro.");
    }
  };

  const formatarDocumento = (doc?: string) => {
    if (!doc) return '-';
    const num = doc.replace(/\D/g, '');
    if (num.length === 14) return num.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
    if (num.length === 11) return num.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
    return doc;
  };

  const inputClass = "w-full bg-[#0b1324] border border-white/10 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 transition-all placeholder:text-slate-500 shadow-inner";
  const labelClass = "block text-xs font-bold text-slate-400 uppercase tracking-[0.16em] mb-2 pl-1";

  const formProps = { formData, setFormData, inputClass, labelClass };

  return (
    <Layout>
      <style>{`
        @keyframes modalEnter { from { opacity: 0; transform: scale(0.95) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        .animate-modal { animation: modalEnter 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes borderSpin { 100% { transform: rotate(360deg); } }
        .animate-border-spin { animation: borderSpin 4s linear infinite; }
        @keyframes fadeInDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in-down { animation: fadeInDown 0.4s ease-out forwards; }
      `}</style>
      
      <div className="mx-auto max-w-7xl space-y-6 pb-12 animate-[fadeIn_0.5s_ease-out]">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden rounded-[30px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(139,92,246,0.16),_transparent_26%),radial-gradient(circle_at_top_right,_rgba(16,185,129,0.10),_transparent_20%),linear-gradient(135deg,_#0b1020_0%,_#08101f_45%,_#0a1224_100%)] p-6 shadow-[0_25px_70px_rgba(0,0,0,0.40)] sm:p-8">
          <div className="pointer-events-none absolute -left-10 top-0 h-52 w-52 rounded-full bg-violet-600/15 blur-[100px]" /><div className="pointer-events-none absolute right-0 top-0 h-56 w-56 rounded-full bg-emerald-600/10 blur-[110px]"></div>
          <div className="relative z-10">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-violet-300">
              <Sparkles className="h-3.5 w-3.5" />
              Relationship Intelligence
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-white flex items-center gap-4 tracking-tight">
              <div className="rounded-2xl border border-violet-400/20 bg-violet-500/10 p-3 shadow-[0_0_20px_rgba(139,92,246,0.12)]"><Users className="h-8 w-8 text-violet-300" /></div>
              CRM & Parceiros
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300 sm:text-[15px]">Gerencie clientes e fornecedores com inteligência financeira da Aurya.</p>
          </div>
          <button onClick={abrirModalNovo} className="relative z-10 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white px-8 py-4 rounded-2xl font-black transition-all flex items-center gap-3 shadow-[0_0_25px_rgba(139,92,246,0.35)] transform hover:scale-[1.02] hover:brightness-110">
            <Sparkles className="w-6 h-6" /> Novo Parceiro Inteligente
          </button>
        </div>

        <div className="bg-[#08101f]/90 backdrop-blur-xl p-5 rounded-[24px] shadow-[0_20px_50px_rgba(0,0,0,0.35)] border border-white/10 flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 pl-1">Buscar Parceiro</label>
            <div className="relative">
              <Search className="absolute left-4 top-3.5 h-5 w-5 text-violet-300" />
              <input 
                type="text" 
                placeholder="Razão Social, Fantasia, Código ou CNPJ/CPF..." 
                value={termoBusca} 
                onChange={(e) => setTermoBusca(e.target.value)} 
                className={`${inputClass} pl-12`} 
              />
            </div>
          </div>
          <div className="w-full md:w-64">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 pl-1">Tipo de Parceiro</label>
            <select value={tipoFiltro} onChange={(e) => setTipoFiltro(e.target.value)} className={inputClass}>
              <option value="">Todos</option>
              <option value="CLIENTE">Clientes</option>
              <option value="FORNECEDOR">Fornecedores</option>
              <option value="AMBOS">Ambos</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 font-bold flex justify-center items-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-500" /> Carregando parceiros...
          </div>
        ) : pessoas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center bg-[#08101f]/60 rounded-[30px] border border-white/10 border-dashed relative overflow-hidden group">
            <img src="/Aurya.jpeg" alt="Aurya IA" className="w-24 h-24 rounded-full border-4 border-[#08101f] shadow-[0_0_30px_rgba(139,92,246,0.35)] mb-6" />
            <h3 className="text-3xl font-black text-white mb-2 tracking-tight">Vamos cadastrar seus parceiros com inteligência?</h3>
            <p className="text-slate-400 max-w-lg mb-8 text-lg">A Aurya analisa o CNPJ, preenche os dados fiscais e sugere limites de crédito automaticamente.</p>
            <button onClick={abrirModalNovo} className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white px-8 py-4 rounded-2xl font-black transition-all flex items-center gap-3 shadow-[0_0_20px_rgba(139,92,246,0.30)] hover:scale-[1.02]">
              <Sparkles className="w-5 h-5" /> Criar com IA
            </button>
          </div>
        ) : (
          <div className="bg-[#08101f]/90 backdrop-blur-xl rounded-[30px] shadow-[0_25px_60px_rgba(0,0,0,0.35)] border border-white/10 overflow-hidden mt-6">
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[900px]">
                <thead>
                  <tr className="bg-[#0b1324] text-xs font-black text-slate-400 uppercase tracking-widest border-b border-white/10">
                    <th className="p-6">Parceiro</th>
                    <th className="p-6">Documento</th>
                    <th className="p-6">Tipo</th>
                    <th className="p-6">Contato</th>
                    <th className="p-6">Vínculo Contábil</th>
                    <th className="p-6 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {pessoas.map((p) => (
                    <tr key={p.id} className="hover:bg-white/5 transition-colors group">
                      <td className="p-6">
                        <span className="inline-flex items-center rounded-md border border-slate-700 bg-slate-800/50 px-2 py-0.5 text-[11px] font-mono font-bold text-slate-300 mb-1.5">
                          CÓD: {p.codigo || 'SEM-CÓDIGO'}
                        </span>
                        <p className="font-black text-white text-lg">{p.nomeFantasia || p.razaoSocial}</p>
                        <p className="text-xs text-slate-500 font-medium mt-1">{p.razaoSocial}</p>
                      </td>
                      <td className="p-6">
                        <span className="px-3 py-1.5 bg-white/5 text-slate-300 rounded-lg text-xs font-bold border border-white/10 font-mono">
                          {formatarDocumento(p.cpfCnpj || p.cnpjCpf)}
                        </span>
                      </td>
                      <td className="p-6">
                        <span className={`px-3 py-1.5 rounded-lg text-[10px] font-black border uppercase tracking-wider ${
                          p.tipo === 'CLIENTE' || p.tipo === 'FISICA' ? 'bg-violet-500/10 text-violet-300 border-violet-500/20' : 
                          p.tipo === 'FORNECEDOR' || p.tipo === 'JURIDICA' ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' : 
                          'bg-sky-500/10 text-sky-300 border-sky-500/20'
                        }`}>
                          {p.tipo}
                        </span>
                      </td>
                      <td className="p-6">
                        <div className="flex flex-col gap-1">
                          <span className="text-sm text-slate-300 flex items-center gap-2"><Phone className="w-3 h-3 text-violet-300"/> {p.telefone || 'N/A'}</span>
                          <span className="text-xs text-slate-500">{p.cidade || '-'} / {p.estado || '-'}</span>
                        </div>
                      </td>
                      <td className="p-6 text-xs">
                        {(p.tipo === 'CLIENTE' || p.tipo === 'AMBOS' || p.tipo === 'FISICA') && (
                          <div className="flex items-center gap-2 mb-1.5" title={p.contaCliente?.nomeConta || 'Conta Padrão de Clientes'}>
                            <span className="font-bold text-violet-300 w-4">C:</span>
                            {p.contaCliente ? (
                              <span className="bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 rounded text-violet-300 font-mono">{p.contaCliente.codigoEstrutural}</span>
                            ) : (
                              <span className="text-slate-500 italic">Padrão (1.1.2)</span>
                            )}
                          </div>
                        )}
                        {(p.tipo === 'FORNECEDOR' || p.tipo === 'AMBOS' || p.tipo === 'JURIDICA') && (
                          <div className="flex items-center gap-2" title={p.contaFornecedor?.nomeConta || 'Conta Padrão de Fornecedores'}>
                            <span className="font-bold text-emerald-300 w-4">F:</span>
                            {p.contaFornecedor ? (
                              <span className="bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded text-emerald-300 font-mono">{p.contaFornecedor.codigoEstrutural}</span>
                            ) : (
                              <span className="text-slate-500 italic">Padrão (2.1.1)</span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="p-6 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => abrirModalEditar(p)} className="px-4 py-2 bg-violet-500/10 hover:bg-violet-500/20 text-violet-300 border border-violet-500/20 rounded-xl transition-colors font-bold text-sm flex items-center gap-2">
                            <Edit2 className="w-4 h-4" /> Detalhes
                          </button>
                          <button onClick={() => p.id && excluirPessoa(p.id)} className="p-2 bg-white/5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 border border-transparent hover:border-red-500/30 rounded-xl transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="bg-black/10 p-4 border-t border-white/10 text-sm text-slate-400 flex justify-between items-center px-6">
              <span>Mostrando <strong className="text-indigo-400">{pessoas.length}</strong> registro(s)</span>
              <span className="italic text-xs text-slate-500">Limitado aos 50 mais recentes</span>
            </div>
          </div>
        )}

        {modalAberto && (
          <div className="fixed inset-0 bg-[#020617]/80 backdrop-blur-md flex items-center justify-center z-[60] p-4 sm:p-6">
            <div className="bg-[#08101f] border border-white/10 rounded-[30px] shadow-[0_25px_80px_rgba(0,0,0,0.60)] w-full max-w-5xl flex flex-col relative overflow-hidden animate-modal">
              
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>

              <div className="p-6 sm:p-8 border-b border-white/10 flex justify-between items-center bg-[#0b1324]/70">
                <div>
                  <h2 className="text-2xl font-black text-white flex items-center gap-3">
                    {formData.id ? 'Ficha do Parceiro' : 'Novo Parceiro Inteligente'}
                  </h2>
                  <p className="text-slate-400 text-sm mt-1">Preenchimento automatizado e análise de crédito com IA.</p>
                </div>
                <button onClick={() => setModalAberto(false)} className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-full transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="bg-[#0b1324]/80 pt-6 pb-2 border-b border-white/10">
                <div className="flex justify-between items-center relative px-8 overflow-x-auto custom-scrollbar pb-4">
                  <div className="absolute left-14 right-14 top-5 h-0.5 bg-slate-800 -z-0"></div>
                  {[
                    { num: 1, label: '🧾 Dados', icon: Receipt },
                    { num: 2, label: '🏢 Fiscal', icon: Building2 },
                    { num: 3, label: '📍 Local', icon: MapPin },
                    { num: 4, label: '📞 Contato', icon: Phone },
                    { num: 5, label: '📊 Crédito', icon: Wallet }
                  ].map(step => (
                    <div key={step.num} className="relative z-10 flex flex-col items-center gap-3 bg-slate-900 px-4 cursor-pointer" onClick={() => setStepAtual(step.num)}>
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm border-2 transition-all duration-300 ${stepAtual === step.num ? 'bg-indigo-600 border-indigo-500 text-white shadow-[0_0_20px_rgba(79,70,229,0.6)] scale-110' : stepAtual > step.num ? 'bg-emerald-500 border-emerald-400 text-white' : 'bg-slate-800 border-slate-600 text-slate-500 hover:border-slate-500'}`}>
                        {stepAtual > step.num ? <CheckCircle2 className="w-6 h-6" /> : <step.icon className="w-4 h-4" />}
                      </div>
                      <span className={`text-xs font-bold uppercase tracking-widest whitespace-nowrap ${stepAtual === step.num ? 'text-indigo-400' : 'text-slate-500'}`}>{step.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-8 overflow-y-auto max-h-[60vh] custom-scrollbar">
                
                {stepAtual === 1 && (
                  <div className="space-y-6 animate-fade-in-down">
                    {/* 🚀 ATUALIZADO: Campo agora é visualmente OPCIONAL e sem a trava do required */}
                    <div className="bg-[#0b1324] border border-white/10 rounded-2xl p-6 shadow-inner">
                      <label className={labelClass}>
                        <Hash className="inline-block w-4 h-4 mr-1 -mt-0.5" />
                        Código Interno / ID <span className="text-slate-500 font-normal normal-case tracking-normal ml-1">(Opcional)</span>
                      </label>
                      <input 
                        type="text" 
                        value={formData.codigo || ''} 
                        onChange={e => setFormData({...formData, codigo: e.target.value.toUpperCase()})} 
                        className={`${inputClass} font-mono uppercase border-indigo-500/20 focus:border-indigo-500/50`} 
                        placeholder="Deixe em branco para gerar sequencial automático (1, 2, 3...)" 
                      />
                    </div>

                    <FormDadosPrincipais 
                      {...formProps} 
                      iaLoading={iaLoading} 
                      preencherComAurya={preencherComAurya} 
                      iaSugestoes={iaSugestoes} 
                    />
                  </div>
                )}
                {stepAtual === 2 && <FormDadosFiscais {...formProps} />}
                {stepAtual === 3 && <FormEndereco {...formProps} />}
                {stepAtual === 4 && <FormContato {...formProps} />}

                {stepAtual === 5 && (
                  <div className="space-y-6 animate-fade-in-down">
                    <div className="bg-emerald-950/20 p-8 rounded-3xl border border-emerald-500/30 shadow-inner mb-6">
                      <div className="flex items-center gap-3 mb-6">
                        <Wallet className="w-8 h-8 text-emerald-400" />
                        <div>
                          <h3 className="text-lg font-black text-emerald-400">Políticas de Crédito</h3>
                          <p className="text-sm text-emerald-400/70">Limites sugeridos pela Aurya ou definidos manualmente.</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-xs font-bold text-emerald-300 uppercase tracking-wider mb-2">Limite de Crédito Aprovado (R$)</label>
                          <input type="number" value={formData.limiteCredito} onChange={e => setFormData({...formData, limiteCredito: e.target.value})} className={`${inputClass} border-emerald-500/40 focus:border-emerald-500 focus:ring-emerald-500 text-xl font-black`} placeholder="0.00" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-emerald-300 uppercase tracking-wider mb-2">Prazo Padrão de Faturamento (Dias)</label>
                          <input type="number" value={formData.prazoPadrao} onChange={e => setFormData({...formData, prazoPadrao: e.target.value})} className={`${inputClass} border-emerald-500/40 focus:border-emerald-500 focus:ring-emerald-500 text-xl font-black`} placeholder="Ex: 28" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-6 bg-[#0b1324]/80 border-t border-white/10 flex flex-col-reverse sm:flex-row justify-between items-center gap-4 rounded-b-[30px]">
                <button onClick={() => setStepAtual(Math.max(1, stepAtual - 1))} className={`w-full sm:w-auto px-6 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors ${stepAtual === 1 ? 'opacity-0 pointer-events-none' : 'text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-700'}`}>
                  <ChevronLeft className="w-5 h-5" /> Voltar
                </button>

                {stepAtual < totalSteps ? (
                  <button onClick={() => setStepAtual(stepAtual + 1)} className="w-full sm:w-auto bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white px-8 py-3.5 rounded-xl font-black transition-all shadow-[0_0_20px_rgba(139,92,246,0.30)] flex items-center justify-center gap-2 hover:scale-[1.02]">
                    Próximo Passo <ChevronRight className="w-5 h-5" />
                  </button>
                ) : (
                  <button onClick={() => handleSalvar(false)} className="w-full sm:w-auto bg-gradient-to-r from-emerald-600 to-teal-500 text-white px-10 py-3.5 rounded-xl font-black transition-all shadow-[0_0_20px_rgba(16,185,129,0.30)] flex items-center justify-center gap-2 hover:scale-[1.02]">
                    <Save className="w-5 h-5" /> Salvar Parceiro
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}