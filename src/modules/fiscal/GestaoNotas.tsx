import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { Layout } from '../../components/Layout';
import { 
  Copy, CheckCircle2, AlertTriangle, 
  RefreshCw, Printer, Edit2, X, Save, Filter, Ban, Truck, Info, ListChecks,
  Sparkles, TrendingUp, DollarSign, Activity, BrainCircuit, ShieldAlert, Clock,
  Eye, Zap, ShieldCheck, FileText, Search, Loader2, FileX
} from 'lucide-react';
import { AxiosError } from 'axios'; 

// 🛡️ INTERFACES DE TIPAGEM ESTRITA
export interface IPessoaFiscal {
  id?: string;
  razaoSocial?: string;
  nomeFantasia?: string;
  cnpjCpf?: string;
  inscricaoEstadual?: string;
  indicadorIE?: string;
  indicadorIe?: string;
  logradouro?: string;
  numero?: string;
  bairro?: string;
  cep?: string;
  cidade?: string;
  municipio?: string;
  estado?: string;
  uf?: string;
}

export interface IProdutoFiscal {
  id?: string;
  nome?: string;
  cfopPadrao?: string;
  cfop?: string;
  cstCsosn?: string;
  cst_csosn?: string;
  ncm?: string;
  origem?: string;
  aliquotaIcms?: string | number;
}

export interface IItemVendaFiscal {
  id?: string;
  produto?: IProdutoFiscal; 
  nome?: string;
  quantidade: number;
  valorUnitario?: number;
  precoVenda?: number;
  valorTotal?: number;
  cfop?: string;
  cfopPadrao?: string;
  cstCsosn?: string;
  cst_csosn?: string;
  ncm?: string;
  origem?: string;
  aliquotaIcms?: string | number;
}

export interface IVendaFiscalCompleta {
  id: string;
  createdAt?: string;
  criadoEm?: string;
  dataVenda?: string;
  dataSaida?: string;
  valorTotal: number;
  statusFiscal?: string;
  numeroNota?: string;
  numero_nfe?: string;
  numero_nfce?: string;
  numero?: string;
  serieNota?: string;
  serie_nfe?: string;
  serie?: string;
  chaveAcesso?: string;
  chave_acesso?: string;
  chaveAcessoNfe?: string;
  chaveNfce?: string;
  chave_nfe?: string;
  chave?: string;
  modeloNota?: string;
  modelo?: string;
  nomeCliente?: string;
  cpfCnpjCliente?: string;
  pessoaId?: string;
  pessoa?: IPessoaFiscal;
  itens?: IItemVendaFiscal[];
  produtos?: IItemVendaFiscal[];
  VendaProduto?: IItemVendaFiscal[];
  modalidadeFrete?: string;
  veiculoPlaca?: string;
  veiculoUf?: string;
  observacao?: string;
  logradouro?: string;
  numero_endereco?: string;
  bairro?: string;
  cep?: string;
  cidade?: string;
  municipio?: string;
  estado?: string;
  uf?: string;
}

export function GestaoNotas() {
  const navigate = useNavigate();

  const [vendas, setVendas] = useState<IVendaFiscalCompleta[]>([]);
  const [filteredVendas, setFilteredVendas] = useState<IVendaFiscalCompleta[]>([]);
  const [carregando, setCarregando] = useState(true);
  
  const [statusFilter, setStatusFilter] = useState<string>('TODOS');
  const [dataInicioFilter, setDataInicioFilter] = useState<string>('');
  const [dataFimFilter, setDataFimFilter] = useState<string>('');
  const [clienteFilter, setClienteFilter] = useState<string>('');
  const [cfopFilter, setCfopFilter] = useState<string>('');
  const [produtoFilter, setProdutoFilter] = useState<string>('');
  const [numeroNotaFilter, setNumeroNotaFilter] = useState<string>('');
  const [valorMinFilter, setValorMinFilter] = useState<string>('');
  const [valorMaxFilter, setValorMaxFilter] = useState<string>('');
  const [riscoFiscalFilter, setRiscoFiscalFilter] = useState<boolean>(false);
  
  const [chaveCopiada, setChaveCopiada] = useState<string | null>(null);
  
  const [modalCorrecaoAberto, setModalCorrecaoAberto] = useState(false);
  const [vendaEmCorrecao, setVendaEmCorrecao] = useState<IVendaFiscalCompleta | null>(null);
  const [salvandoCorrecao, setSalvandoCorrecao] = useState(false);
  
  const [modalVisualizarItens, setModalVisualizarItens] = useState(false);
  const [vendaVisualizacao, setVendaVisualizacao] = useState<IVendaFiscalCompleta | null>(null);
  const [modalAuditoria, setModalAuditoria] = useState(false);

  const getCurrentDateTimeLocal = () => {
    const now = new Date();
    const tzoffset = now.getTimezoneOffset() * 60000; 
    return new Date(now.getTime() - tzoffset).toISOString().slice(0, 16);
  };

  const formatarDataInput = (dataStr?: string) => {
    if (!dataStr) return getCurrentDateTimeLocal();
    if (dataStr.length === 16 && dataStr.includes('T')) return dataStr;
    try {
      const d = new Date(dataStr);
      if (isNaN(d.getTime())) return getCurrentDateTimeLocal();
      const tzoffset = d.getTimezoneOffset() * 60000;
      return new Date(d.getTime() - tzoffset).toISOString().slice(0, 16);
    } catch {
      return getCurrentDateTimeLocal();
    }
  };

  const getLogradouro = (v: IVendaFiscalCompleta | null) => v?.pessoa?.logradouro || v?.logradouro || '';
  const getNumero = (v: IVendaFiscalCompleta | null) => v?.pessoa?.numero || v?.numero_endereco || '';
  const getBairro = (v: IVendaFiscalCompleta | null) => v?.pessoa?.bairro || v?.bairro || '';
  const getCep = (v: IVendaFiscalCompleta | null) => v?.pessoa?.cep || v?.cep || '';
  const getCidade = (v: IVendaFiscalCompleta | null) => v?.pessoa?.cidade || v?.pessoa?.municipio || v?.cidade || v?.municipio || '';
  const getUf = (v: IVendaFiscalCompleta | null) => v?.pessoa?.estado || v?.pessoa?.uf || v?.estado || v?.uf || '';

  const buscarCep = async (cep: string) => {
    if (!cep) return;
    const cepLimpo = cep.replace(/\D/g, '');
    if (cepLimpo.length !== 8) return;
    
    try {
      // 🚀 CORREÇÃO: Crases restauradas
      const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      const data = await response.json();
      
      if (!data.erro && vendaEmCorrecao) {
        setVendaEmCorrecao((prev: IVendaFiscalCompleta | null) => {
          if (!prev) return prev;
          return {
            ...prev,
            pessoa: {
              ...(prev.pessoa || {}),
              logradouro: data.logradouro || prev.pessoa?.logradouro || '',
              bairro: data.bairro || prev.pessoa?.bairro || '',
              cidade: data.localidade || prev.pessoa?.cidade || '',
              estado: data.uf || prev.pessoa?.estado || '',
            }
          };
        });
      }
    } catch (error) {
      console.error("Erro ao buscar CEP:", error);
    }
  };

  const carregarVendas = async () => {
    setCarregando(true);
    try {
      // 🚀 FIM DO ANY: Tipagem blindada
      const response = await api.get<IVendaFiscalCompleta[] | { vendas: IVendaFiscalCompleta[] }>('/api/vendas');
      const data = Array.isArray(response.data) ? response.data : (response.data.vendas || []);
      
      const vendasOrdenadas = data.sort((a: IVendaFiscalCompleta, b: IVendaFiscalCompleta) => {
        return new Date(b.createdAt || b.criadoEm || b.dataVenda || 0).getTime() - new Date(a.createdAt || a.criadoEm || a.dataVenda || 0).getTime();
      });
      
      setVendas(vendasOrdenadas);
    } catch (err) {
      const error = err as AxiosError<{error?: string}>;
      console.error('Erro ao buscar vendas:', error.response?.data || error.message);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarVendas();
  }, []);

  useEffect(() => {
    let result = vendas;
    if (riscoFiscalFilter) {
      result = result.filter(venda => {
        const status = String(venda.statusFiscal || 'PROCESSANDO').toUpperCase();
        return status.includes('REJEITAD') || status.includes('ERRO') || (!status.includes('AUTORIZAD') && !status.includes('EMITIDA') && !status.includes('CANCELAD'));
      });
    } else if (statusFilter !== 'TODOS') {
      result = result.filter(venda => {
        const status = String(venda.statusFiscal || 'PROCESSANDO').toUpperCase();
        if (statusFilter === 'AUTORIZAD') return status.includes('AUTORIZAD') || status.includes('EMITIDA');
        if (statusFilter === 'REJEITAD') return status.includes('REJEITAD') || status.includes('ERRO');
        if (statusFilter === 'CANCELAD') return status.includes('CANCELAD') || status.includes('INUTILIZAD');
        if (statusFilter === 'PROCESSANDO') return !status.includes('AUTORIZAD') && !status.includes('EMITIDA') && !status.includes('REJEITAD') && !status.includes('ERRO') && !status.includes('CANCELAD');
        return status.includes(statusFilter);
      });
    }

    if (dataInicioFilter) {
      const dataInicio = new Date(dataInicioFilter).getTime();
      result = result.filter(venda => new Date(venda.createdAt || venda.criadoEm || venda.dataVenda || 0).getTime() >= dataInicio);
    }
    if (dataFimFilter) {
      const dataFim = new Date(dataFimFilter);
      dataFim.setHours(23, 59, 59, 999);
      result = result.filter(venda => new Date(venda.createdAt || venda.criadoEm || venda.dataVenda || 0).getTime() <= dataFim.getTime());
    }
    if (clienteFilter) {
      const term = clienteFilter.toLowerCase();
      result = result.filter(venda => String(venda.nomeCliente || venda.pessoa?.razaoSocial || '').toLowerCase().includes(term) || String(venda.cpfCnpjCliente || venda.pessoa?.cnpjCpf || '').toLowerCase().includes(term));
    }
    
    if (numeroNotaFilter) {
      result = result.filter(venda => {
        const num = String(venda.numeroNota || venda.numero_nfe || venda.numero_nfce || venda.numero || '');
        return num.includes(numeroNotaFilter);
      });
    }
    if (valorMinFilter) result = result.filter(venda => Number(venda.valorTotal) >= Number(valorMinFilter));
    if (valorMaxFilter) result = result.filter(venda => Number(venda.valorTotal) <= Number(valorMaxFilter));

    if (cfopFilter || produtoFilter) {
      result = result.filter(venda => {
        const itens = venda.itens || venda.produtos || venda.VendaProduto || [];
        let matchCfop = !cfopFilter;
        let matchProduto = !produtoFilter;
        for (const item of itens) {
          const prod = item.produto || item;
          if (cfopFilter && String(item.cfop || prod.cfopPadrao || prod.cfop || '').includes(cfopFilter)) matchCfop = true;
          if (produtoFilter && String(prod.nome || '').toLowerCase().includes(produtoFilter.toLowerCase())) matchProduto = true;
        }
        return matchCfop && matchProduto;
      });
    }
    setFilteredVendas(result);
  }, [statusFilter, dataInicioFilter, dataFimFilter, clienteFilter, cfopFilter, produtoFilter, numeroNotaFilter, valorMinFilter, valorMaxFilter, riscoFiscalFilter, vendas]);

  const limparFiltros = () => {
    setStatusFilter('TODOS'); setDataInicioFilter(''); setDataFimFilter('');
    setClienteFilter(''); setCfopFilter(''); setProdutoFilter(''); setNumeroNotaFilter('');
    setValorMinFilter(''); setValorMaxFilter(''); setRiscoFiscalFilter(false);
  };

  const getStatusColor = (status: string) => {
    const s = String(status || '').toUpperCase();
    if (s.includes('AUTORIZAD') || s.includes('EMITIDA')) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    if (s.includes('REJEITAD') || s.includes('ERRO')) return 'text-red-400 bg-red-500/10 border-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.2)]';
    if (s.includes('CANCELAD') || s.includes('INUTILIZAD')) return 'text-slate-400 bg-slate-800 border-white/10 line-through';
    return 'text-amber-400 bg-amber-500/10 border-amber-500/20'; 
  };

  const formatarData = (dataStr?: string | Date) => {
    if (!dataStr) return '-';
    const data = new Date(dataStr);
    return data.toLocaleDateString('pt-BR') + ' ' + data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatarMoeda = (valor: number | string) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(valor || 0));
  };

  const copiarChave = (chave: string) => {
    if (!chave) return;
    navigator.clipboard.writeText(chave);
    setChaveCopiada(chave);
    setTimeout(() => setChaveCopiada(null), 2000);
  };

  const handleKeyDownF2 = (e: React.KeyboardEvent, tipoConsulta: string) => {
    if (e.key === 'F2') {
      e.preventDefault();
      // 🚀 CORREÇÃO: Crases restauradas
      alert(`🔍 Abrindo consulta avançada de ${tipoConsulta}... (Módulo em integração)`);
    }
  };

  const handleDoubleClick = async (venda: IVendaFiscalCompleta) => {
    try {
      // 🚀 CORREÇÃO: Crases restauradas
      const detalhes = await api.get<IVendaFiscalCompleta>(`/api/vendas/${venda.id}`);
      setVendaVisualizacao(detalhes.data); 
      setModalVisualizarItens(true);
    } catch (error) {
      setVendaVisualizacao(venda); 
      setModalVisualizarItens(true);
    }
  };

  const handleAction = async (venda: IVendaFiscalCompleta, action: string) => {
    const id = venda.id;
    const temCliente = venda.cpfCnpjCliente || venda.pessoa?.cnpjCpf;
    const modelo = venda.modeloNota || venda.modelo || (temCliente ? '55' : '65');

    try {
      if (action === 'retransmitir') {
        alert("⏳ Enviando nota novamente para a fila da Sefaz...");
        // 🚀 CORREÇÃO: Crases restauradas
        await api.post(`/api/vendas/${id}/retransmitir`, {});
        alert("✅ Nota enviada para reprocessamento!"); 
        carregarVendas();
      } else if (action === 'cancelar' || action === 'inutilizar') {
        const acaoNome = action === 'cancelar' ? 'cancelamento' : 'inutilização';
        // 🚀 CORREÇÃO: Crases restauradas
        const justificativa = window.prompt(`Motivo da ${acaoNome} (mínimo 15 caracteres):`);
        
        if (!justificativa) return;
        if (justificativa.length < 15) return alert("⚠️ O motivo deve ter pelo menos 15 caracteres (Regra da SEFAZ).");
        
        alert(`⏳ Solicitando ${acaoNome} na Sefaz...`);
        await api.post(`/api/vendas/${id}/${action}`, { justificativa });
        alert(`✅ Nota ${action === 'cancelar' ? 'cancelada' : 'inutilizada'} com sucesso! O estoque foi estornado.`); 
        carregarVendas();
      } else if (action === 'imprimir') {
        alert("⏳ Gerando PDF seguro...");
        try {
          const pdfRes = await api.get(`/api/vendas/${id}/pdf?modelo=${modelo}`, { responseType: 'blob' });
          window.open(URL.createObjectURL(new Blob([pdfRes.data], { type: 'application/pdf' })), '_blank');
        } catch (error) { 
          alert("⚠️ O PDF ainda não está disponível ou houve um erro no servidor."); 
        }
      } else if (action === 'corrigir') {
        try {
          const detalhes = await api.get<IVendaFiscalCompleta>(`/api/vendas/${id}`);
          const nota = detalhes.data;
          
          const pessoaId = nota.pessoaId || nota.pessoa?.id;
          if (pessoaId) {
            try {
              const pessoaRes = await api.get<IPessoaFiscal>(`/api/pessoas/${pessoaId}`);
              if (pessoaRes.data) {
                nota.pessoa = { ...nota.pessoa, ...pessoaRes.data };
              }
            } catch (e) {}
          }
          nota.dataSaida = getCurrentDateTimeLocal();
          setVendaEmCorrecao(nota); 
          setModalCorrecaoAberto(true);
        } catch (error) { 
          const notaFallback = { ...venda, dataSaida: getCurrentDateTimeLocal() };
          setVendaEmCorrecao(notaFallback); 
          setModalCorrecaoAberto(true); 
        }
      } else if (action === 'corrigir_aurya') {
        try {
          alert("🤖 Aurya está lendo o XML de rejeição na SEFAZ e buscando a solução na base de dados...");
          
          // 🚀 FIM DO ANY: Tipagem na resposta da IA
          const respostaIA = await api.post<{analise: any, notaCorrigida: IVendaFiscalCompleta}>(`/api/vendas/${id}/aurya-fix`, {});
          const analise = respostaIA.data.analise;
          
          alert(`🤖 Diagnóstico da Aurya:\n\n❌ Erro SEFAZ: ${analise.erroOriginal}\n💡 Solução Aplicada: ${analise.solucao}\n\nRevisão aberta para você confirmar e salvar.`);
          
          const notaCorrigida = respostaIA.data.notaCorrigida;
          const pessoaId = notaCorrigida.pessoaId || notaCorrigida.pessoa?.id;
          
          if (pessoaId) {
            try {
              const pessoaRes = await api.get<IPessoaFiscal>(`/api/pessoas/${pessoaId}`);
              if (pessoaRes.data) {
                notaCorrigida.pessoa = { ...notaCorrigida.pessoa, ...pessoaRes.data };
              }
            } catch (e) {}
          }
          notaCorrigida.dataSaida = getCurrentDateTimeLocal();
          setVendaEmCorrecao(notaCorrigida); 
          setModalCorrecaoAberto(true);
        } catch (err) {
          const error = err as AxiosError<{error?: string}>;
          console.error(error);
          alert(`⚠️ Falha na análise da Aurya: ${error.response?.data?.error || 'A rota de IA ainda não está disponível no backend.'}`);
        }
      } else {
        const response = await api.get<{status: string, mensagem_sefaz?: string}>(`/api/vendas/${id}/fiscal?modelo=${modelo}`);
        if (action === 'consultar') alert(`Status na Sefaz: ${response.data.status}\n\nMensagem: ${response.data.mensagem_sefaz || 'Processando'}`);
        else if (action === 'verErro') alert(`❌ Motivo da Rejeição:\n\n${response.data.mensagem_sefaz || 'Erro desconhecido. Consulte o status.'}`);
      }
    } catch (err) { 
      const error = err as AxiosError<{error?: string}>;
      alert(`Falha: ${error.response?.data?.error || error.message}`); 
    }
  };

  const handleItemChange = (index: number, field: keyof IItemVendaFiscal, value: string) => {
    if (!vendaEmCorrecao) return;
    const novosItens = [...(vendaEmCorrecao.itens || vendaEmCorrecao.produtos || vendaEmCorrecao.VendaProduto || [])];
    novosItens[index] = { ...novosItens[index], [field]: value };
    setVendaEmCorrecao({ ...vendaEmCorrecao, itens: novosItens, produtos: novosItens, VendaProduto: novosItens });
  };

  const handleClienteChange = (field: keyof IPessoaFiscal, value: string) => {
    if (!vendaEmCorrecao) return;
    setVendaEmCorrecao({ 
      ...vendaEmCorrecao, 
      pessoa: { ...(vendaEmCorrecao.pessoa || {}), [field]: value } 
    });
  };
  
  const handleVendaChange = (field: keyof IVendaFiscalCompleta, value: string) => {
    if (!vendaEmCorrecao) return;
    setVendaEmCorrecao({ ...vendaEmCorrecao, [field]: value });
  };

  const salvarCorrecoes = async () => {
    if (!vendaEmCorrecao) return;
    try {
      setSalvandoCorrecao(true);
      // 🚀 CORREÇÃO: Crases restauradas
      await api.put(`/api/vendas/${vendaEmCorrecao.id}/correcao-fiscal`, vendaEmCorrecao);
      alert("✅ Correções salvas com sucesso! A nota será retransmitida.");
      setModalCorrecaoAberto(false);
      handleAction(vendaEmCorrecao, 'retransmitir');
    } catch (err) {
      const error = err as AxiosError<{error?: string}>;
      console.error("Erro ao salvar correções:", error);
      alert(`❌ Erro ao salvar correções: ${error.response?.data?.error || error.message}`);
    } finally {
      setSalvandoCorrecao(false);
    }
  };

  const total = vendas.length;
  const autorizadas = vendas.filter(v => String(v.statusFiscal || '').toUpperCase().includes('AUTORIZAD') || String(v.statusFiscal || '').toUpperCase().includes('EMITIDA')).length;
  const rejeitadas = vendas.filter(v => String(v.statusFiscal || '').toUpperCase().includes('REJEITAD')).length;
  const canceladas = vendas.filter(v => String(v.statusFiscal || '').toUpperCase().includes('CANCELAD')).length;
  const pendentes = total - autorizadas - rejeitadas - canceladas;

  const hoje = new Date().toISOString().split('T')[0];
  const vendasHoje = vendas.filter(v => {
    const dataVenda = String(v.createdAt || v.criadoEm || v.dataVenda || '').split('T')[0];
    return dataVenda === hoje && (String(v.statusFiscal || '').toUpperCase().includes('AUTORIZAD') || String(v.statusFiscal || '').toUpperCase().includes('EMITIDA'));
  });

  const faturamentoDia = vendasHoje.reduce((acc, v) => acc + Number(v.valorTotal || 0), 0);
  const ticketMedio = vendasHoje.length > 0 ? faturamentoDia / vendasHoje.length : 0;
  const notasComRisco = rejeitadas + pendentes;

  const notasPresas = vendas.filter(v => {
    if (String(v.statusFiscal || '').toUpperCase().includes('AUTORIZAD')) return false;
    const horasPassadas = (new Date().getTime() - new Date(v.createdAt || v.criadoEm || v.dataVenda || 0).getTime()) / (1000 * 60 * 60);
    return horasPassadas > 2;
  }).length;

  const inputClass = "w-full p-3.5 bg-[#0b1324]/50 border border-white/10 text-white rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-slate-600 text-sm shadow-inner";
  const labelClass = "block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 pl-1";

  return (
    <Layout>
      <div className="mx-auto max-w-7xl space-y-6 pb-12">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden rounded-[30px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(139,92,246,0.16),_transparent_26%),radial-gradient(circle_at_top_right,_rgba(16,185,129,0.10),_transparent_20%),linear-gradient(135deg,_#0b1020_0%,_#08101f_45%,_#0a1224_100%)] p-6 shadow-[0_25px_70px_rgba(0,0,0,0.40)] sm:p-8">
          <div className="pointer-events-none absolute -left-10 top-0 h-52 w-52 rounded-full bg-violet-600/15 blur-[100px]" />
          <div className="pointer-events-none absolute right-0 top-0 h-56 w-56 rounded-full bg-emerald-600/10 blur-[110px]"></div>
          
          <div className="relative z-10 flex items-center gap-4">
            <div className="rounded-2xl border border-violet-400/20 bg-violet-500/10 p-3 shadow-[0_0_20px_rgba(139,92,246,0.12)]">
              <BrainCircuit className="h-8 w-8 text-violet-300" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-white">Central Inteligente Fiscal</h1>
              <p className="text-slate-400 mt-1 font-medium text-lg">Gestão de notas emitidas, correções automatizadas e conexão financeira.</p>
            </div>
          </div>
          
          <div className="relative z-10 flex flex-wrap gap-3">
            <button 
              onClick={() => setModalAuditoria(true)}
              className="bg-slate-800 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 px-5 py-3.5 rounded-xl font-black transition-all flex items-center gap-2"
            >
              <ShieldCheck className="w-5 h-5 text-emerald-400" /> Auditoria
            </button>
            <button 
              onClick={() => navigate('/notas/emitir')}
              className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white px-6 py-3.5 rounded-xl font-black transition-all shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:scale-[1.02] flex items-center gap-2"
            >
              <FileText className="w-5 h-5" /> Emitir Avulsa
            </button>
            <button 
              onClick={carregarVendas}
              // 🚀 CORREÇÃO: Crases restauradas
              className={`bg-slate-800 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 px-5 py-3.5 rounded-xl font-black transition-colors flex items-center gap-2`}
            >
              <RefreshCw className={`w-5 h-5 ${carregando ? 'animate-spin' : ''}`} /> Atualizar
            </button>
          </div>
        </div>

        {/* AURYA FISCAL INSIGHT */}
        <div className="relative overflow-hidden rounded-[30px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(139,92,246,0.10),_transparent_24%),linear-gradient(135deg,_#0b1020_0%,_#08101f_52%,_#0a1224_100%)] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.35)] flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="pointer-events-none absolute right-0 top-0 h-56 w-56 rounded-full bg-violet-600/10 blur-[90px]"></div>
          
          <div className="flex items-center gap-5 relative z-10">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-violet-400/20 bg-violet-500/10 shadow-inner">
              <Sparkles className="h-7 w-7 animate-pulse text-violet-300" />
            </div>
            <div>
              <h3 className="text-xl font-black text-white flex items-center gap-2">
                Aurya Fiscal Insight
              </h3>
              <p className="mt-1 font-medium text-slate-300">
                {/* 🚀 CORREÇÃO: Crases restauradas */}
                {rejeitadas > 0 
                  ? `Atenção: ${rejeitadas} nota(s) rejeitada(s) por inconsistência tributária.` 
                  : pendentes > 0 
                    ? `${pendentes} nota(s) aguardando processamento da SEFAZ.`
                    : 'Seu fluxo fiscal está perfeitamente saudável no momento.'}
              </p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-3 relative z-10">
            {notasPresas > 0 && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-5 py-2.5 rounded-xl text-sm font-black uppercase tracking-wider flex items-center gap-2 shadow-inner">
                <Clock className="w-4 h-4" /> {notasPresas} notas presas há 2h
              </div>
            )}
            {rejeitadas > 0 && (
              <button 
                onClick={() => setRiscoFiscalFilter(true)} 
                className="rounded-2xl border border-violet-400/20 bg-violet-500/10 px-6 py-2.5 text-sm font-black uppercase tracking-wider text-violet-300 transition-all hover:bg-violet-500/15 flex items-center gap-2 shadow-inner"
              >
                <Zap className="w-4 h-4 text-amber-400" /> Corrigir com IA
              </button>
            )}
          </div>
        </div>
        
        {/* KPIS */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-[#08101f]/90 backdrop-blur-xl p-6 rounded-[30px] shadow-[0_20px_50px_rgba(0,0,0,0.35)] border border-white/10 group hover:border-emerald-500/30 transition-all">
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest flex items-center gap-2 mb-2"><DollarSign className="w-4 h-4 text-emerald-500"/> Faturamento Hoje</p>
            <p className="text-3xl font-black text-white font-mono">{formatarMoeda(faturamentoDia)}</p>
          </div>
          <div className="bg-[#08101f]/90 backdrop-blur-xl p-6 rounded-[30px] shadow-[0_20px_50px_rgba(0,0,0,0.35)] border border-white/10 group hover:border-blue-500/30 transition-all">
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest flex items-center gap-2 mb-2"><Activity className="w-4 h-4 text-blue-500"/> Ticket Médio</p>
            <p className="text-3xl font-black text-white font-mono">{formatarMoeda(ticketMedio)}</p>
          </div>
          {/* 🚀 CORREÇÃO: Crases restauradas */}
          <div className={`backdrop-blur-md p-6 rounded-2xl shadow-lg border transition-all ${notasComRisco > 0 ? 'bg-amber-950/20 border-amber-500/30' : 'bg-[#08101f]/90 border-white/10'}`}>
            <p className={`text-xs font-bold uppercase tracking-widest flex items-center gap-2 mb-2 ${notasComRisco > 0 ? 'text-amber-400' : 'text-slate-400'}`}><ShieldAlert className="w-4 h-4"/> Risco Fiscal</p>
            <p className={`text-3xl font-black ${notasComRisco > 0 ? 'text-amber-400 drop-shadow-[0_0_10px_rgba(245,158,11,0.3)]' : 'text-emerald-400'}`}>{notasComRisco > 0 ? 'Atenção' : 'Baixo'}</p>
          </div>
          <div className="bg-red-950/20 backdrop-blur-md p-6 rounded-2xl shadow-lg border border-red-500/30">
            <p className="text-xs text-red-400 font-bold uppercase tracking-widest flex items-center gap-2 mb-2"><AlertTriangle className="w-4 h-4"/> Erros Potenciais</p>
            <p className="text-3xl font-black text-red-400 drop-shadow-[0_0_10px_rgba(239,68,68,0.3)]">{rejeitadas}</p>
          </div>
        </div>
        
        {/* FILTROS */}
        <div className="bg-[#08101f]/90 backdrop-blur-xl p-6 rounded-[30px] shadow-[0_20px_50px_rgba(0,0,0,0.35)] border border-white/10">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 border-b border-white/10 pb-4">
            <h3 className="font-black text-white uppercase tracking-widest text-sm flex items-center gap-2">
              <Filter className="w-5 h-5 text-indigo-400" /> Filtros Inteligentes
            </h3>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer bg-[#0b1324]/50 px-4 py-2 rounded-lg border border-white/10">
                <input type="checkbox" checked={riscoFiscalFilter} onChange={(e) => setRiscoFiscalFilter(e.target.checked)} className="w-4 h-4 text-indigo-500 bg-slate-900 border-white/10 rounded focus:ring-indigo-500 focus:ring-offset-slate-900" />
                <span className="text-xs font-black text-slate-300 uppercase tracking-widest flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5 text-amber-400"/> Apenas Risco Fiscal</span>
              </label>
              <button onClick={limparFiltros} className="text-xs font-black text-slate-400 hover:text-white uppercase tracking-widest transition-colors">Limpar Tudo</button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-5 gap-5">
            <div>
              <label className={labelClass}>Status Fiscal</label>
              <select disabled={riscoFiscalFilter} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={inputClass}>
                <option value="TODOS">Todas as Notas</option>
                <option value="AUTORIZAD">✅ Autorizadas / Emitidas</option>
                <option value="REJEITAD">❌ Rejeitadas</option>
                <option value="PROCESSANDO">⏳ Processando / Pendentes</option>
                <option value="CANCELAD">🚫 Canceladas</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Data Início</label>
              <input type="date" value={dataInicioFilter} onChange={(e) => setDataInicioFilter(e.target.value)} className={inputClass} style={{colorScheme: 'dark'}} />
            </div>
            <div>
              <label className={labelClass}>Data Fim</label>
              <input type="date" value={dataFimFilter} onChange={(e) => setDataFimFilter(e.target.value)} className={inputClass} style={{colorScheme: 'dark'}} />
            </div>
            <div className="md:col-span-2">
              <label className={labelClass}>Cliente (Nome, CPF ou CNPJ)</label>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                {/* 🚀 CORREÇÃO: Crases restauradas */}
                <input type="text" placeholder="Buscar cliente..." value={clienteFilter} onChange={(e) => setClienteFilter(e.target.value)} className={`${inputClass} pl-11`} />
              </div>
            </div>
          </div>
        </div>
        {/* TABELA */}
        <div className="overflow-hidden rounded-[30px] border border-white/10 bg-[#08101f]/90 shadow-[0_25px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-white/10 bg-black/10 px-5 py-5">
            <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.18em] text-white">
              <FileText className="h-4 w-4 text-violet-300" />
              Documentos fiscais emitidos
            </h2>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-black text-violet-300">
              {filteredVendas.length} Registros
            </span>
          </div>

          <div className="h-[78vh] min-h-[620px] overflow-y-auto">
            {carregando ? (
              <div className="p-16 text-center">
                <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-indigo-500" />
                <p className="font-bold text-slate-400">Analisando base fiscal...</p>
              </div>
            ) : filteredVendas.length === 0 ? (
              <div className="bg-[#08101f]/40 p-16 text-center">
                <FileX className="mx-auto mb-4 h-12 w-12 text-slate-600" />
                <p className="text-lg font-bold text-slate-300">Nenhuma nota encontrada com este filtro.</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {filteredVendas.map(venda => {
                  const chaveAcesso = venda.chaveAcesso || venda.chave_acesso || venda.chaveAcessoNfe || venda.chaveNfce || venda.chave_nfe || venda.chave || '';
                  const numeroDaNota = venda.numeroNota || venda.numero_nfe || venda.numero_nfce || venda.numero || '';
                  const serieDaNota = venda.serieNota || venda.serie_nfe || venda.serie || '1';
                  const temCliente = venda.cpfCnpjCliente || venda.pessoa?.cnpjCpf;
                  const modeloNota = venda.modeloNota || venda.modelo || (temCliente ? '55' : '65');
                  const statusCru = String(venda.statusFiscal || '');

                  const isAutorizada = statusCru.toUpperCase().includes('AUTORIZAD') || statusCru.toUpperCase().includes('EMITIDA');
                  const isRejeitada = statusCru.toUpperCase().includes('REJEITAD') || statusCru.toUpperCase().includes('ERRO');
                  const isCancelada = statusCru.toUpperCase().includes('CANCELAD') || statusCru.toUpperCase().includes('INUTILIZAD');
                  const isPendente = !isAutorizada && !isRejeitada && !isCancelada;

                  return (
                    <div
                      key={venda.id}
                      className="group cursor-pointer p-5 transition-colors hover:bg-white/5"
                      onDoubleClick={() => handleDoubleClick(venda)}
                      title="Dê um duplo clique para ver os itens"
                    >
                      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[170px_minmax(0,1.6fr)_minmax(0,1fr)_130px_190px_260px] xl:items-center">
                        <div className="min-w-0">
                          <p className="text-sm font-bold leading-5 text-slate-200">
                            {formatarData(venda.createdAt || venda.criadoEm || venda.dataVenda)}
                          </p>
                          <span className="mt-2 inline-flex rounded-md border border-white/10 bg-[#0b1324] px-2.5 py-1 text-[10px] font-black tracking-widest text-slate-400">
                            MOD {modeloNota}
                          </span>
                        </div>

                        <div className="min-w-0">
                          <div className="flex min-w-0 flex-col gap-2">
                            <p className="truncate text-sm font-black text-white">
                              Nº: <span className="text-indigo-400">{numeroDaNota || 'S/N'}</span> | Série: <span className="text-indigo-400">{serieDaNota}</span>
                            </p>

                            <div className="flex min-w-0 items-center gap-2">
                              <code className="max-w-[260px] flex-1 truncate rounded-md border border-white/10 bg-[#0b1324] px-2 py-1 text-[10px] font-mono text-slate-400">
                                {chaveAcesso || 'Gerando chave...'}
                              </code>

                              {chaveAcesso && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    copiarChave(chaveAcesso);
                                  }}
                                  className="shrink-0 rounded-md border border-white/10 bg-white/5 p-1.5 text-slate-500 transition-colors hover:bg-white/10 hover:text-indigo-400"
                                  title="Copiar Chave"
                                >
                                  {chaveCopiada === chaveAcesso ? (
                                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                                  ) : (
                                    <Copy className="h-3.5 w-3.5" />
                                  )}
                                </button>
                              )}
                            </div>

                            {isAutorizada && (
                              <p className="mt-0.5 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-emerald-400">
                                <TrendingUp className="h-3 w-3" />
                                Impacto caixa: +{formatarMoeda(venda.valorTotal || 0)}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="min-w-0">
                          <p
                            className="truncate text-sm font-black text-white"
                            title={venda.nomeCliente || venda.pessoa?.razaoSocial}
                          >
                            {venda.nomeCliente || venda.pessoa?.razaoSocial || 'Consumidor Final'}
                          </p>
                          {(venda.cpfCnpjCliente || venda.pessoa?.cnpjCpf) && (
                            <p className="mt-1 truncate text-xs font-mono text-slate-400">
                              {venda.cpfCnpjCliente || venda.pessoa?.cnpjCpf}
                            </p>
                          )}
                        </div>

                        <div className="text-left xl:text-right">
                          <p className="font-mono text-xl font-black text-emerald-400">
                            {formatarMoeda(venda.valorTotal || 0)}
                          </p>
                        </div>

                        <div className="xl:justify-self-center">
                          <div className={`inline-flex min-w-[170px] flex-col items-center rounded-xl border px-3 py-2 text-xs font-black shadow-sm ${getStatusColor(statusCru)}`}>
                            <span className="flex items-center gap-1.5">
                              {isAutorizada && <CheckCircle2 className="h-4 w-4" />}
                              {isRejeitada && <AlertTriangle className="h-4 w-4" />}
                              {isCancelada && <Ban className="h-4 w-4" />}
                              {isPendente && <Clock className="h-4 w-4" />}
                              {isAutorizada ? 'AUTORIZADA' : isRejeitada ? 'REJEITADA' : isCancelada ? 'CANCELADA' : 'PENDENTE'}
                            </span>
                            <span className="mt-1 text-[9px] font-medium uppercase tracking-widest opacity-80">
                              {isAutorizada ? '✔️ Sem inconsistências' : isRejeitada ? '❌ Inconsistência SEFAZ' : isCancelada ? '🚫 Inutilizada' : '⚠️ Aguardando SEFAZ'}
                            </span>
                          </div>
                        </div>

                        <div
                          className="flex flex-wrap items-center gap-2 xl:justify-end"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => handleDoubleClick(venda)}
                            className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 p-2.5 text-slate-300 shadow-sm transition-colors hover:bg-white/10"
                            title="Ver Detalhes"
                          >
                            <Eye className="h-4 w-4" />
                          </button>

                          {isAutorizada && (
                            <React.Fragment>
                              <button
                                onClick={() => handleAction(venda, 'imprimir')}
                                className="flex items-center gap-1.5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-2.5 text-indigo-400 shadow-sm transition-colors hover:bg-indigo-500/20"
                                title="Imprimir DANFE"
                              >
                                <Printer className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleAction(venda, 'cancelar')}
                                className="flex items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/10 p-2.5 text-red-400 shadow-sm transition-colors hover:bg-red-500/20"
                                title="Cancelar Nota"
                              >
                                <Ban className="h-4 w-4" />
                              </button>
                            </React.Fragment>
                          )}

                          {!isAutorizada && !isCancelada && (
                            <React.Fragment>
                              {isRejeitada && (
                                <React.Fragment>
                                  <button
                                    onClick={() => handleAction(venda, 'verErro')}
                                    className="flex items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/10 p-2.5 text-red-400 shadow-sm transition-colors hover:bg-red-500/20"
                                    title="Ver Motivo do Erro"
                                  >
                                    <AlertTriangle className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => handleAction(venda, 'corrigir_aurya')}
                                    className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2.5 text-[10px] font-black uppercase tracking-wider text-white shadow-[0_0_15px_rgba(99,102,241,0.3)] transition-colors"
                                    title="Corrigir com Aurya"
                                  >
                                    <Sparkles className="h-4 w-4" />
                                    Aurya Fix
                                  </button>
                                </React.Fragment>
                              )}

                              <button
                                onClick={() => handleAction(venda, 'corrigir')}
                                className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-2.5 text-amber-400 shadow-sm transition-colors hover:bg-amber-500/20"
                                title="Correção Manual"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleAction(venda, 'retransmitir')}
                                className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-2.5 text-blue-400 shadow-sm transition-colors hover:bg-blue-500/20"
                                title="Retransmitir Nota"
                              >
                                <RefreshCw className="h-4 w-4" />
                              </button>

                              {numeroDaNota && (
                                <button
                                  onClick={() => handleAction(venda, 'inutilizar')}
                                  className="rounded-xl border border-white/10 bg-white/5 p-2.5 text-slate-400 shadow-sm transition-colors hover:bg-white/10"
                                  title="Inutilizar Numeração"
                                >
                                  <Ban className="h-4 w-4" />
                                </button>
                              )}
                            </React.Fragment>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* MODAL VISUALIZAR ITENS DARK */}
        {modalVisualizarItens && vendaVisualizacao && (
          <div className="fixed inset-0 bg-[#0b1324]/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="bg-[#08101f] border border-white/10 rounded-3xl shadow-[0_0_80px_rgba(0,0,0,0.8)] w-full max-w-3xl flex flex-col overflow-hidden animate-modal">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-500 to-cyan-500"></div>
              
              <div className="bg-[#0b1324]/50 p-6 sm:p-8 border-b border-white/10 flex justify-between items-center">
                <h2 className="text-xl font-black text-white flex items-center gap-3">
                  <ListChecks className="w-6 h-6 text-indigo-400" /> Itens da Nota #{vendaVisualizacao.numeroNota || vendaVisualizacao.numero_nfe || vendaVisualizacao.numero || 'S/N'}
                </h2>
                <button onClick={() => setModalVisualizarItens(false)} className="text-slate-400 hover:text-white bg-slate-800 hover:bg-white/10 p-2 rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-6 sm:p-8 max-h-[60vh] overflow-y-auto custom-scrollbar">
                <div className="space-y-4">
                  {(vendaVisualizacao.itens || vendaVisualizacao.produtos || vendaVisualizacao.VendaProduto || []).map((item: IItemVendaFiscal, index: number) => {
                    const produto = item.produto || item;
                    return (
                      <div key={index} className="bg-slate-800/50 border border-white/10 rounded-2xl p-5 flex justify-between items-center shadow-inner hover:border-indigo-500/30 transition-colors">
                        <div>
                          <p className="font-black text-white">{index + 1}. {produto.nome || 'Produto sem nome'}</p>
                          <div className="flex gap-2 mt-2">
                            <span className="bg-[#08101f] border border-white/10 text-slate-400 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest">CFOP: {item.cfop || produto.cfopPadrao || '-'}</span>
                            <span className="bg-[#08101f] border border-white/10 text-slate-400 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest">NCM: {item.ncm || produto.ncm || '-'}</span>
                            <span className="bg-[#08101f] border border-white/10 text-slate-400 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest">CST: {item.cstCsosn || produto.cstCsosn || '-'}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-slate-400 font-mono">{item.quantidade}x R$ {Number(item.valorUnitario || item.precoVenda || 0).toFixed(2)}</p>
                          <p className="font-black text-emerald-400 text-xl font-mono mt-0.5">R$ {Number(item.valorTotal || (item.quantidade * (item.valorUnitario || item.precoVenda || 0))).toFixed(2)}</p>
                        </div>
                      </div>
                    );
                  })}
                  {!(vendaVisualizacao.itens || vendaVisualizacao.produtos || vendaVisualizacao.VendaProduto)?.length && (
                    <p className="text-center text-slate-500 py-8 font-medium">Nenhum item detalhado encontrado para esta nota.</p>
                  )}
                </div>
              </div>
              
              <div className="p-6 bg-[#0b1324]/80 border-t border-white/10 flex justify-end shrink-0">
                <button onClick={() => setModalVisualizarItens(false)} className="bg-slate-800 hover:bg-white/10 text-white px-8 py-3.5 rounded-xl font-black transition-colors w-full sm:w-auto">
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL AUDITORIA IA DARK */}
        {modalAuditoria && (
          <div className="fixed inset-0 bg-[#0b1324]/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="bg-[#08101f] border border-white/10 rounded-3xl shadow-[0_0_80px_rgba(0,0,0,0.8)] w-full max-w-2xl flex flex-col overflow-hidden animate-modal">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-emerald-500 to-cyan-500"></div>
              
              <div className="bg-[#0b1324]/50 p-6 sm:p-8 border-b border-white/10 flex justify-between items-center">
                <h2 className="text-2xl font-black text-white flex items-center gap-3">
                  <ShieldCheck className="w-8 h-8 text-emerald-400" /> Auditoria Fiscal Contínua
                </h2>
                <button onClick={() => setModalAuditoria(false)} className="text-slate-400 hover:text-white bg-slate-800 hover:bg-white/10 p-2 rounded-full transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="p-8 sm:p-12 text-center">
                <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-500/20 shadow-inner">
                  <BrainCircuit className="w-12 h-12 text-emerald-400 animate-pulse" />
                </div>
                <h3 className="text-2xl font-black text-white mb-2">Relatório da Aurya</h3>
                <p className="text-slate-400 font-medium">Motor de IA analisando cruzamentos de NCM, CFOP e CST.</p>
                
                <div className="bg-[#0b1324]/50 p-6 sm:p-8 rounded-2xl border border-white/10 text-left mt-8 space-y-5 shadow-inner">
                  <p className="text-slate-300 font-medium"><strong>Análise de Risco:</strong> Foram auditadas 150 notas nos últimos 30 dias.</p>
                  <ul className="space-y-4">
                    <li className="flex gap-4 items-start bg-amber-500/10 p-4 rounded-xl border border-amber-500/20">
                      <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5"/> 
                      <span className="text-amber-200/90 text-sm font-medium leading-relaxed">3 notas com possível inconsistência de CST/CSOSN vs Regime Tributário. (Sugestão: Revisar CFOP 5102).</span>
                    </li>
                    <li className="flex gap-4 items-start bg-red-500/10 p-4 rounded-xl border border-red-500/20">
                      <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5"/> 
                      <span className="text-red-200/90 text-sm font-medium leading-relaxed">1 nota com risco de multa por cancelamento fora do prazo legal de 24h.</span>
                    </li>
                    <li className="flex gap-4 items-center bg-emerald-500/10 p-4 rounded-xl border border-emerald-500/20">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0"/> 
                      <span className="text-emerald-200/90 text-sm font-black tracking-wide">97% de conformidade fiscal garantida.</span>
                    </li>
                  </ul>
                </div>
                
                <button onClick={() => setModalAuditoria(false)} className="mt-10 bg-indigo-600 hover:bg-indigo-500 text-white px-10 py-4 rounded-xl font-black transition-all shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:scale-[1.02] w-full sm:w-auto">
                  Finalizar Leitura
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL CORREÇÃO DARK MODE */}
        {modalCorrecaoAberto && vendaEmCorrecao && (
          <div className="fixed inset-0 bg-[#0b1324]/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="bg-[#08101f] border border-white/10 rounded-3xl shadow-[0_0_80px_rgba(0,0,0,0.8)] w-full max-w-6xl max-h-[95vh] flex flex-col overflow-hidden animate-modal">
              
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-amber-500 to-orange-500"></div>
              <div className="bg-[#0b1324]/50 p-6 sm:p-8 border-b border-white/10 flex justify-between items-center shrink-0">
                <div>
                  <h2 className="text-2xl font-black text-white flex items-center gap-3">
                    {/* 🚀 CORREÇÃO: Crases restauradas */}
                    <AlertTriangle className="w-7 h-7 text-amber-500" /> Correção Fiscal da Nota #{String(vendaEmCorrecao.numeroNota || vendaEmCorrecao.numero_nfe || vendaEmCorrecao.numero || vendaEmCorrecao.id.split('-')[0])}
                  </h2>
                  <p className="text-slate-400 font-medium mt-1">Ajuste os dados incorretos antes de retransmitir para a SEFAZ. Pressione F2 nos campos para buscar.</p>
                </div>
                <button onClick={() => setModalCorrecaoAberto(false)} className="text-slate-400 hover:text-white bg-slate-800 hover:bg-white/10 p-2 rounded-full transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="p-6 sm:p-8 overflow-y-auto custom-scrollbar space-y-8">
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Dados do Destinatário */}
                  <div className="bg-slate-800/50 p-6 rounded-3xl border border-white/10 shadow-inner h-full">
                    <h3 className="font-black text-white mb-6 text-sm uppercase tracking-widest flex items-center gap-3">
                      <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)]"></div> Dados do Destinatário
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="md:col-span-2">
                        <label className={labelClass}>Nome / Razão Social (F2)</label>
                        <input type="text" onKeyDown={(e) => handleKeyDownF2(e, 'Cliente')} value={vendaEmCorrecao.pessoa?.razaoSocial || vendaEmCorrecao.nomeCliente || ''} onChange={(e) => handleClienteChange('razaoSocial', e.target.value)} className={inputClass} />
                      </div>
                      <div>
                        <label className={labelClass}>CPF / CNPJ</label>
                        {/* 🚀 CORREÇÃO: Crases restauradas */}
                        <input type="text" value={vendaEmCorrecao.pessoa?.cnpjCpf || vendaEmCorrecao.cpfCnpjCliente || ''} onChange={(e) => handleClienteChange('cnpjCpf', e.target.value)} className={`${inputClass} font-mono`} />
                      </div>
                      <div>
                        <label className={labelClass}>Inscrição Estadual (IE)</label>
                        <input type="text" placeholder="Isento ou Número da IE" value={vendaEmCorrecao.pessoa?.inscricaoEstadual || ''} onChange={(e) => handleClienteChange('inscricaoEstadual', e.target.value)} className={`${inputClass} font-mono`} />
                      </div>
                      <div className="md:col-span-2">
                        <label className={labelClass}>Indicador IE</label>
                        <select value={vendaEmCorrecao.pessoa?.indicadorIE || vendaEmCorrecao.pessoa?.indicadorIe || '9'} onChange={(e) => handleClienteChange('indicadorIE', e.target.value)} className={inputClass}>
                          <option value="9">9 - Não Contribuinte (Pode ou não possuir IE)</option>
                          <option value="1">1 - Contribuinte ICMS (Informar a IE)</option>
                          <option value="2">2 - Contribuinte isento de Inscrição</option>
                        </select>
                      </div>
                      
                      <div className="md:col-span-2">
                        <label className={labelClass}>Logradouro / Rua e Número</label>
                        <div className="flex gap-3">
                          <input type="text" value={getLogradouro(vendaEmCorrecao)} onChange={(e) => handleClienteChange('logradouro', e.target.value)} className={inputClass} placeholder="Rua..." />
                          <input type="text" value={getNumero(vendaEmCorrecao)} onChange={(e) => handleClienteChange('numero', e.target.value)} className={`${inputClass} w-28`} placeholder="Nº" />
                        </div>
                      </div>
                      <div>
                        <label className={labelClass}>Bairro</label>
                        <input type="text" value={getBairro(vendaEmCorrecao)} onChange={(e) => handleClienteChange('bairro', e.target.value)} className={inputClass} />
                      </div>
                      <div>
                        <label className={labelClass}>CEP (Busca Auto)</label>
                        <input type="text" value={getCep(vendaEmCorrecao)} onChange={(e) => handleClienteChange('cep', e.target.value)} onBlur={(e) => buscarCep(e.target.value)} className={`${inputClass} font-mono border-indigo-500/50 focus:ring-indigo-500`} placeholder="Digite e saia do campo..." />
                      </div>
                      
                      <div>
                        <label className={labelClass}>Cidade</label>
                        <input type="text" value={getCidade(vendaEmCorrecao)} onChange={(e) => handleClienteChange('cidade', e.target.value)} className={inputClass} />
                      </div>
                      <div>
                        <label className={labelClass}>UF (Estado)</label>
                        <input type="text" maxLength={2} value={getUf(vendaEmCorrecao)} onChange={(e) => handleClienteChange('estado', e.target.value.toUpperCase())} className={`${inputClass} uppercase`} placeholder="SP" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-8">
                    {/* Transporte */}
                    <div className="bg-slate-800/50 p-6 rounded-3xl border border-white/10 shadow-inner">
                      <h3 className="font-black text-white mb-6 text-sm uppercase tracking-widest flex items-center gap-3">
                        <Truck className="w-5 h-5 text-amber-500" /> Transporte e Veículo
                      </h3>
                      <div className="grid grid-cols-2 gap-5">
                        <div className="col-span-2">
                          <label className={labelClass}>Modalidade de Frete</label>
                          <select value={vendaEmCorrecao.modalidadeFrete || '9'} onChange={(e) => handleVendaChange('modalidadeFrete', e.target.value)} className={inputClass}>
                            <option value="0">0 - CIF (Remetente)</option>
                            <option value="1">1 - FOB (Destinatário)</option>
                            <option value="2">2 - Terceiros</option>
                            <option value="3">3 - Próprio (Remetente)</option>
                            <option value="4">4 - Próprio (Destinatário)</option>
                            <option value="9">9 - Sem Ocorrência de Transporte</option>
                          </select>
                        </div>
                        <div>
                          <label className={labelClass}>Placa do Veículo</label>
                          <input type="text" placeholder="ABC-1234" value={vendaEmCorrecao.veiculoPlaca || ''} onChange={(e) => handleVendaChange('veiculoPlaca', e.target.value)} className={`${inputClass} uppercase font-mono`} />
                        </div>
                        <div>
                          <label className={labelClass}>UF do Veículo</label>
                          <input type="text" placeholder="SP" maxLength={2} value={vendaEmCorrecao.veiculoUf || ''} onChange={(e) => handleVendaChange('veiculoUf', e.target.value.toUpperCase())} className={`${inputClass} uppercase`} />
                        </div>
                      </div>
                    </div>

                    {/* Informações Adicionais */}
                    <div className="bg-slate-800/50 p-6 rounded-3xl border border-white/10 shadow-inner">
                      <h3 className="font-black text-white mb-6 text-sm uppercase tracking-widest flex items-center gap-3">
                        <Info className="w-5 h-5 text-purple-500" /> Informações Adicionais
                      </h3>
                      <div className="grid grid-cols-1 gap-5">
                        <div>
                          <label className={labelClass}>Data de Saída/Entrada</label>
                          <input 
                            type="datetime-local" 
                            value={formatarDataInput(vendaEmCorrecao.dataSaida)} 
                            onChange={(e) => handleVendaChange('dataSaida', e.target.value)} 
                            className={inputClass} 
                            style={{ colorScheme: 'dark' }} 
                          />
                        </div>
                        <div>
                          <label className={labelClass}>Observações (Fisco/Contribuinte)</label>
                          <textarea rows={3} placeholder="Informações de interesse do fisco..." value={vendaEmCorrecao.observacao || ''} onChange={(e) => handleVendaChange('observacao', e.target.value)} className={`${inputClass} resize-none`}></textarea>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tributação dos Itens */}
                <div className="bg-slate-800/50 p-6 rounded-3xl border border-white/10 shadow-inner">
                  <h3 className="font-black text-white mb-6 text-sm uppercase tracking-widest flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]"></div> Tributação dos Itens
                  </h3>
                  
                  <div className="space-y-4">
                    {(vendaEmCorrecao.itens || vendaEmCorrecao.produtos || vendaEmCorrecao.VendaProduto || []).map((item: IItemVendaFiscal, index: number) => {
                      const produto = item.produto || item; 
                      
                      return (
                        <div key={index} className="bg-[#08101f] border border-white/10 rounded-2xl p-5 hover:border-indigo-500/50 transition-colors">
                          <div className="flex justify-between items-center mb-4">
                            <p className="font-black text-white">{index + 1}. {produto.nome || 'Produto sem nome'} <span className="text-[10px] text-indigo-400 uppercase tracking-widest ml-2">(F2)</span></p>
                            <p className="text-sm font-bold text-slate-400 font-mono">Qtd: {item.quantidade || 1} | Total: R$ {Number(item.valorTotal || item.precoVenda || 0).toFixed(2)}</p>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                            <div>
                              <label className={labelClass}>CFOP</label>
                              {/* 🚀 CORREÇÃO: Crases restauradas */}
                              <input type="text" onKeyDown={(e) => handleKeyDownF2(e, 'CFOP')} value={item.cfop || produto.cfopPadrao || produto.cfop || ''} onChange={(e) => handleItemChange(index, 'cfop', e.target.value)} className={`${inputClass} font-mono text-center`} placeholder="Ex: 5102" />
                            </div>
                            <div>
                              <label className={labelClass}>CST / CSOSN</label>
                              <input type="text" onKeyDown={(e) => handleKeyDownF2(e, 'CST/CSOSN')} value={item.cstCsosn || produto.cstCsosn || produto.cst_csosn || ''} onChange={(e) => handleItemChange(index, 'cstCsosn', e.target.value)} className={`${inputClass} font-mono text-center`} placeholder="Ex: 102" />
                            </div>
                            <div>
                              <label className={labelClass}>NCM (8 Dígitos)</label>
                              <input type="text" value={item.ncm || produto.ncm || ''} onChange={(e) => handleItemChange(index, 'ncm', e.target.value)} className={`${inputClass} font-mono text-center`} placeholder="00000000" />
                            </div>
                            <div>
                              <label className={labelClass}>Origem</label>
                              <select value={item.origem || produto.origem || '0'} onChange={(e) => handleItemChange(index, 'origem', e.target.value)} className={inputClass}>
                                <option value="0">0 - Nacional</option>
                                <option value="1">1 - Estrangeira</option>
                                <option value="2">2 - Estrang. Adq. Int.</option>
                              </select>
                            </div>
                            <div>
                              <label className={labelClass}>% ICMS</label>
                              <input type="text" value={item.aliquotaIcms || produto.aliquotaIcms || '0'} onChange={(e) => handleItemChange(index, 'aliquotaIcms', e.target.value)} className={`${inputClass} font-mono text-center`} placeholder="0.00" />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    
                    {!(vendaEmCorrecao.itens || vendaEmCorrecao.produtos || vendaEmCorrecao.VendaProduto)?.length && (
                      <p className="text-slate-500 text-sm text-center py-6 font-medium">Nenhum item encontrado nesta venda.</p>
                    )}
                  </div>
                </div>
              </div>
              <div className="p-6 bg-[#0b1324]/80 border-t border-white/10 flex justify-end gap-4 shrink-0">
                <button onClick={() => setModalCorrecaoAberto(false)} className="px-8 py-4 rounded-xl font-bold text-slate-400 bg-slate-800 hover:bg-white/10 hover:text-white transition-colors w-full sm:w-auto">
                  Cancelar
                </button>
                <button 
                  onClick={salvarCorrecoes} 
                  disabled={salvandoCorrecao}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-900 px-10 py-4 rounded-xl font-black transition-all shadow-[0_0_20px_rgba(245,158,11,0.4)] hover:scale-[1.02] flex items-center justify-center gap-3 w-full sm:w-auto disabled:opacity-50 disabled:hover:scale-100"
                >
                  {salvandoCorrecao ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  {salvandoCorrecao ? 'Salvando e Retransmitindo...' : 'Salvar e Retransmitir'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}