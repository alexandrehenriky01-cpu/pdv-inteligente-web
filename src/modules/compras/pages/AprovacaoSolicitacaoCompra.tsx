import React, { useState, useEffect } from 'react';
import { Layout } from '../../../components/Layout';
import { 
  CheckCircle2, XCircle, Clock, Search, Filter, FileText, 
  AlertTriangle, User, Package, Loader2, Calendar, RotateCcw
} from 'lucide-react';
import { api } from '../../../services/api'; 

interface ItemSolicitacao {
  id: string;
  quantidade: number;
  quantidadeAprovada?: number;
  especificacao?: string | null;
  produto?: { nome: string; codigoBarras: string; codigo: string; };
}

interface SolicitacaoCompra {
  id: string;
  dataNecessidade: string;
  createdAt: string;
  dataAprovacao?: string;
  observacao: string;
  tipoNecessidade?: 'ESTOQUE' | 'APLICACAO_DIRETA';
  centroCusto?: string | null;
  status: string; 
  solicitante?: { nome: string };
  itens: ItemSolicitacao[];
}

type TabAprovacao = 'PENDENTES' | 'APROVADOS' | 'REPROVADOS' | 'CANCELADOS';

function statusNoGrupo(tab: TabAprovacao, status: string): boolean {
  if (tab === 'PENDENTES') {
    return status === 'AGUARDANDO_SUPERVISAO' || status === 'RASCUNHO';
  }
  if (tab === 'APROVADOS') {
    return ['APROVADA', 'EM_COTACAO', 'ATENDIDA'].includes(status);
  }
  if (tab === 'REPROVADOS') return status === 'REPROVADA';
  if (tab === 'CANCELADOS') return status === 'CANCELADA';
  return false;
}

export const AprovacaoSolicitacaoCompra: React.FC = () => {
  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoCompra[]>([]);
  const [solicitacoesFiltradas, setSolicitacoesFiltradas] = useState<SolicitacaoCompra[]>([]);
  const [solicitacaoSelecionada, setSolicitacaoSelecionada] = useState<SolicitacaoCompra | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  
  // 🚀 ESTADO PARA AS QUANTIDADES APROVADAS (PARCIAL)
  const [quantidadesEditadas, setQuantidadesEditadas] = useState<Record<string, number>>({});

  const [tabStatus, setTabStatus] = useState<TabAprovacao>('PENDENTES');

  // Filtros
  const [filtroStatus, setFiltroStatus] = useState<string>('');
  const [filtroDataSolicitacao, setFiltroDataSolicitacao] = useState<string>('');
  const [filtroDataMovimento, setFiltroDataMovimento] = useState<string>('');
  const [filtroSolicitante, setFiltroSolicitante] = useState<string>('');
  const [filtroProduto, setFiltroProduto] = useState<string>('');

  const buscarSolicitacoes = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/compras/solicitacoes');
      setSolicitacoes(response.data);
    } catch (error) {
      console.error('Erro ao buscar solicitações:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { buscarSolicitacoes(); }, []);

  useEffect(() => {
    let result = solicitacoes.filter((req) => statusNoGrupo(tabStatus, req.status));
    if (filtroStatus) result = result.filter(req => req.status === filtroStatus);
    if (filtroDataSolicitacao) result = result.filter(req => req.createdAt?.startsWith(filtroDataSolicitacao));
    if (filtroDataMovimento) result = result.filter(req => req.dataAprovacao?.startsWith(filtroDataMovimento));
    if (filtroSolicitante) result = result.filter(req => req.solicitante?.nome?.toLowerCase().includes(filtroSolicitante.toLowerCase()));
    if (filtroProduto) result = result.filter(req => req.itens?.some(item => item.produto?.nome?.toLowerCase().includes(filtroProduto.toLowerCase())));
    setSolicitacoesFiltradas(result);
  }, [solicitacoes, tabStatus, filtroStatus, filtroDataSolicitacao, filtroDataMovimento, filtroSolicitante, filtroProduto]);

  // 🚀 SELECIONAR SOLICITAÇÃO E PREPARAR QUANTIDADES
  const handleSelecionar = (req: SolicitacaoCompra) => {
    setSolicitacaoSelecionada(req);
    const qtdsIniciais: Record<string, number> = {};
    req.itens.forEach(item => {
      // Se já foi aprovado parcial antes, mostra o aprovado. Se não, mostra o total solicitado.
      qtdsIniciais[item.id] = item.quantidadeAprovada ?? item.quantidade;
    });
    setQuantidadesEditadas(qtdsIniciais);
  };

  const handleReabrir = async (id: string) => {
    if (!window.confirm('Reabrir esta solicitação para nova avaliação da supervisão?')) return;
    try {
      setActionLoading(true);
      await api.put(`/api/compras/solicitacoes/${id}/reabrir`);
      alert('✅ Solicitação reaberta para pendente.');
      await buscarSolicitacoes();
      setSolicitacaoSelecionada(null);
    } catch (e) {
      console.error(e);
      alert('❌ Não foi possível reabrir.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAvaliar = async (id: string, status: 'APROVADA' | 'REPROVADA') => {
    let motivo = undefined;

    if (status === 'REPROVADA') {
      const inputMotivo = window.prompt('Informe o motivo da reprovação (Obrigatório):');
      if (!inputMotivo || inputMotivo.trim() === '') {
        alert('Ação cancelada: O motivo é obrigatório para reprovar.');
        return;
      }
      motivo = inputMotivo;
    } else {
      if (!window.confirm('Tem certeza que deseja processar esta aprovação com as quantidades informadas?')) return;
    }
    
    try {
      setActionLoading(true);
      await api.put(`/api/compras/solicitacoes/${id}/avaliar`, {
        status,
        motivoReprovacao: motivo,
        quantidadesAprovadas: quantidadesEditadas // 🚀 Enviando as quantidades editadas para a API
      });
      
      alert(`✅ Solicitação ${status.toLowerCase()} com sucesso!`);
      await buscarSolicitacoes(); 
      // Atualiza o item selecionado para refletir a mudança imediatamente na tela
      const response = await api.get('/api/compras/solicitacoes');
      const atualizada = response.data.find((r: SolicitacaoCompra) => r.id === id);
      setSolicitacaoSelecionada(atualizada || null);
    } catch (error) {
      console.error(`Erro ao ${status.toLowerCase()}:`, error);
      alert(`❌ Erro ao processar a solicitação.`);
    } finally {
      setActionLoading(false);
    }
  };

  const formatarData = (dataString: string) => {
    if (!dataString) return '';
    return new Date(dataString).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const getStatusColor = (status: string) => {
    if (status === 'AGUARDANDO_SUPERVISAO') return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    if (status === 'APROVADA') return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    return 'bg-red-500/20 text-red-400 border-red-500/30';
  };

  const inputClass = "w-full bg-[#0b1324] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:ring-2 focus:ring-violet-500/50 outline-none";

  if (loading && solicitacoes.length === 0) {
    return (
      <Layout>
        <div className="flex h-96 flex-col items-center justify-center text-violet-500">
          <Loader2 className="mb-4 h-10 w-10 animate-spin" />
          <p className="font-bold text-white">Carregando requisições...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
    <div className="w-full space-y-6 pb-10">
      <div className="rounded-2xl border border-white/10 bg-[#08101f]/40 p-6 backdrop-blur-xl shadow-lg flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
            <CheckCircle2 className="w-8 h-8 text-violet-500" /> Aprovação de Compras
          </h1>
          <p className="text-sm text-slate-400 mt-1">Analise, filtre e autorize as requisições internas da loja.</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 rounded-xl border border-white/10 bg-[#0b1324]/80 p-2">
        {(['PENDENTES', 'APROVADOS', 'REPROVADOS', 'CANCELADOS'] as TabAprovacao[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTabStatus(t)}
            className={`rounded-lg px-4 py-2 text-xs font-black uppercase tracking-wider transition-colors ${
              tabStatus === t
                ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/20'
                : 'text-slate-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            {t === 'PENDENTES' && 'Pendentes'}
            {t === 'APROVADOS' && 'Aprovados'}
            {t === 'REPROVADOS' && 'Reprovados'}
            {t === 'CANCELADOS' && 'Cancelados'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LISTA E FILTROS */}
        <div className="lg:col-span-1 space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input type="text" placeholder="Buscar por produto..." value={filtroProduto} onChange={(e) => setFiltroProduto(e.target.value)} className={inputClass} />
            </div>
            <button onClick={() => setShowFilters(!showFilters)} className={`p-2.5 border rounded-xl transition-colors ${showFilters ? 'bg-violet-600/20 border-violet-500/50 text-violet-400' : 'bg-[#0b1324] border-white/10 text-slate-400 hover:text-white'}`}>
              <Filter className="w-4 h-4" />
            </button>
          </div>

          {showFilters && (
            <div className="bg-[#08101f]/80 border border-white/10 rounded-xl p-4 space-y-4 animate-in fade-in">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Refinar status (opcional)</label>
                  <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)} className={inputClass}>
                    <option value="">Todos nesta aba</option>
                    <option value="AGUARDANDO_SUPERVISAO">Aguardando supervisão</option>
                    <option value="APROVADA">Aprovada</option>
                    <option value="EM_COTACAO">Em cotação</option>
                    <option value="ATENDIDA">Atendida</option>
                    <option value="REPROVADA">Reprovada</option>
                    <option value="CANCELADA">Cancelada</option>
                  </select>
                </div>
                <div><label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Data Solicitação</label><input type="date" value={filtroDataSolicitacao} onChange={(e) => setFiltroDataSolicitacao(e.target.value)} className={inputClass} /></div>
                <div><label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Data Movimento</label><input type="date" value={filtroDataMovimento} onChange={(e) => setFiltroDataMovimento(e.target.value)} className={inputClass} /></div>
                <div className="col-span-2"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Solicitante</label><input type="text" placeholder="Nome" value={filtroSolicitante} onChange={(e) => setFiltroSolicitante(e.target.value)} className={inputClass} /></div>
              </div>
              <button onClick={() => { setFiltroStatus(''); setFiltroDataSolicitacao(''); setFiltroDataMovimento(''); setFiltroSolicitante(''); setFiltroProduto(''); }} className="w-full py-2 text-xs font-bold text-slate-400 hover:text-white border border-white/5 rounded-lg hover:bg-white/5 transition-colors">Limpar filtros refinados</button>
            </div>
          )}

          <div className="space-y-3 max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
            {solicitacoesFiltradas.map(req => (
              <div key={req.id} onClick={() => handleSelecionar(req)} className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 ${solicitacaoSelecionada?.id === req.id ? 'bg-violet-600/10 border-violet-500/50 shadow-[0_0_15px_rgba(139,92,246,0.15)]' : 'bg-[#08101f]/60 border-white/5 hover:border-white/20'}`}>
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-bold text-violet-400 bg-violet-400/10 px-2 py-1 rounded-md">REQ-{req.id.substring(0,6).toUpperCase()}</span>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-md border ${getStatusColor(req.status)}`}>{req.status === 'AGUARDANDO_SUPERVISAO' ? 'Pendente' : req.status}</span>
                </div>
                <h3 className="text-white font-bold text-sm mb-1 flex items-center gap-2"><User className="w-3 h-3 text-slate-400" /> {req.solicitante?.nome || 'Usuário Desconhecido'}</h3>
                <div className="flex justify-between items-center pt-3 border-t border-white/5">
                  <span className="text-xs text-slate-500 flex items-center gap-1"><Calendar className="w-3 h-3" /> {formatarData(req.createdAt).split(' ')[0]}</span>
                  <span className="text-xs font-bold text-slate-400">{req.itens?.length || 0} item(ns)</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* PAINEL DE DETALHES */}
        <div className="lg:col-span-2">
          {solicitacaoSelecionada ? (
            <div className="rounded-2xl border border-white/10 bg-[#08101f]/80 backdrop-blur-xl flex flex-col h-full animate-in fade-in">
              
              <div className="p-6 border-b border-white/10 flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-2xl font-black text-white">REQ-{solicitacaoSelecionada.id.substring(0,6).toUpperCase()}</h2>
                    <span className={`text-xs font-bold px-3 py-1 rounded-full border ${getStatusColor(solicitacaoSelecionada.status)}`}>{solicitacaoSelecionada.status === 'AGUARDANDO_SUPERVISAO' ? 'Pendente' : solicitacaoSelecionada.status}</span>
                  </div>
                  <p className="text-slate-400 text-sm">Solicitado por <strong className="text-white">{solicitacaoSelecionada.solicitante?.nome || 'Desconhecido'}</strong></p>
                  <p className="mt-2 text-xs text-slate-500">
                    Necessidade:{' '}
                    <span className="font-bold text-violet-300">
                      {solicitacaoSelecionada.tipoNecessidade === 'APLICACAO_DIRETA'
                        ? 'APLICAÇÃO DIRETA'
                        : 'ESTOQUE'}
                    </span>
                    {solicitacaoSelecionada.centroCusto && (
                      <>
                        {' '}
                        · CC:{' '}
                        <span className="text-slate-300">{solicitacaoSelecionada.centroCusto}</span>
                      </>
                    )}
                  </p>
                </div>
              </div>

              <div className="p-6 flex-1 space-y-6">
                {solicitacaoSelecionada.observacao && (
                  <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2"><FileText className="w-4 h-4" /> Observações do Solicitante</h4>
                    <p className="text-sm text-slate-300 italic">"{solicitacaoSelecionada.observacao}"</p>
                  </div>
                )}

                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2"><Package className="w-4 h-4" /> Lista de Produtos ({solicitacaoSelecionada.itens?.length || 0})</h4>
                  <div className="border border-white/10 rounded-xl overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-black/20 border-b border-white/10 text-[10px] uppercase tracking-wider text-slate-500">
                          <th className="p-3 font-bold">Produto</th>
                          <th className="p-3 font-bold text-center">Especificação</th>
                          <th className="p-3 font-bold text-center">Código</th>
                          <th className="p-3 font-bold text-center">Qtd Solicitada</th>
                          <th className="p-3 font-bold text-center bg-violet-900/20 text-violet-300">Qtd Aprovada</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm">
                        {solicitacaoSelecionada.itens?.map(item => (
                          <tr key={item.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                            <td className="p-3 text-white font-medium">{item.produto?.nome || 'Removido'}</td>
                            <td className="p-3 text-center text-slate-400 text-xs max-w-[140px] truncate" title={item.especificacao || ''}>
                              {item.especificacao || '—'}
                            </td>
                            <td className="p-3 text-center text-slate-400 text-xs font-mono">{item.produto?.codigo || '-'}</td>
                            <td className="p-3 text-center text-slate-300"><span className="font-bold text-white text-lg">{item.quantidade}</span></td>
                            <td className="p-3 text-center bg-violet-900/10">
                              {/* 🚀 INPUT DE APROVAÇÃO PARCIAL (CORRIGIDO) */}
                              <input 
                                type="number" 
                                min="0"
                                className="w-20 bg-[#0b1324] border border-violet-500/30 rounded-lg px-2 py-1.5 text-center text-white font-bold focus:ring-2 focus:ring-violet-500/50 outline-none"
                                value={quantidadesEditadas[item.id] !== undefined ? quantidadesEditadas[item.id] : (item.quantidadeAprovada ?? item.quantidade)}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setQuantidadesEditadas({
                                    ...quantidadesEditadas, 
                                    [item.id]: val === '' ? 0 : Number(val)
                                  });
                                }}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* AÇÕES (FOOTER) - SEMPRE VISÍVEIS PARA PERMITIR REAVALIAÇÃO E EDIÇÃO */}
              <div className="p-6 border-t border-white/10 bg-black/20 flex flex-wrap justify-end gap-3 rounded-b-2xl">
                {['APROVADA', 'REPROVADA', 'CANCELADA', 'EM_COTACAO'].includes(solicitacaoSelecionada.status) && (
                  <button
                    type="button"
                    onClick={() => handleReabrir(solicitacaoSelecionada.id)}
                    disabled={actionLoading}
                    className="px-6 py-2.5 rounded-xl font-bold text-sm text-amber-300 hover:bg-amber-500/10 border border-amber-500/30 transition-all flex items-center gap-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Desfazer / Reavaliar
                  </button>
                )}
                <button 
                  onClick={() => handleAvaliar(solicitacaoSelecionada.id, 'REPROVADA')}
                  disabled={actionLoading || solicitacaoSelecionada.status === 'REPROVADA'}
                  className="px-6 py-2.5 rounded-xl font-bold text-sm text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/30 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <XCircle className="w-4 h-4" /> 
                  {solicitacaoSelecionada.status === 'REPROVADA' ? 'Já Reprovada' : 'Reprovar'}
                </button>
                
                <button 
                  onClick={() => handleAvaliar(solicitacaoSelecionada.id, 'APROVADA')}
                  disabled={actionLoading}
                  className="px-6 py-2.5 rounded-xl font-bold text-sm bg-emerald-500 hover:bg-emerald-400 text-slate-900 transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  {solicitacaoSelecionada.status === 'APROVADA' ? 'Atualizar Quantidades' : 'Aprovar (Com Quantidades Acima)'}
                </button>
              </div>

            </div>
          ) : (
             <div className="rounded-2xl border border-dashed border-white/10 bg-[#08101f]/20 flex flex-col items-center justify-center h-full min-h-[400px] text-slate-500">
               <Package className="w-16 h-16 mb-4 opacity-20" />
               <p className="text-lg font-bold text-slate-400">Nenhuma solicitação selecionada</p>
             </div>
          )}
        </div>

      </div>
    </div>
    </Layout>
  );
};