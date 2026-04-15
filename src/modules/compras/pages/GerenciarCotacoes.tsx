import { useEffect, useState, type FC } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '../../../components/Layout';
import { 
  CheckCircle2, XCircle, Clock, Search, Filter, FileText, 
  Truck, Package, Loader2, Calendar, DollarSign, CircleDollarSign 
} from 'lucide-react';
import { api } from '../../../services/api';
import {
  AnaliseCotacaoPrecosModal,
  AnalisePrecosResponse,
} from '../components/AnaliseCotacaoPrecosModal';

interface Fornecedor {
  id: string;
  razaoSocial: string;
  nomeFantasia?: string;
}

interface Produto {
  id: string;
  nome: string;
  codigo?: string;
}

interface ItemCotacao {
  id: string;
  quantidadeCotada: number;
  valorUnitario: number;
  fornecedorId?: string;
  produto?: Produto;
  fornecedor?: Fornecedor;
  quantidade?: number;
}

interface CotacaoCompra {
  id: string;
  createdAt: string;
  observacao: string;
  status: string;
  solicitacaoCompraId?: string | null;
  itens: ItemCotacao[];
}

export const GerenciarCotacoes: FC = () => {
  const [cotacoes, setCotacoes] = useState<CotacaoCompra[]>([]);
  const [cotacoesFiltradas, setCotacoesFiltradas] = useState<CotacaoCompra[]>([]);
  const [cotacaoSelecionada, setCotacaoSelecionada] = useState<CotacaoCompra | null>(null);
  
  const [itensEditados, setItensEditados] = useState<Record<string, { quantidadeCotada: number, valorUnitario: number }>>({});

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const [analiseOpen, setAnaliseOpen] = useState(false);
  const [analiseDados, setAnaliseDados] = useState<AnalisePrecosResponse | null>(null);
  const [analiseSolicitacaoId, setAnaliseSolicitacaoId] = useState('');
  const [analiseCarregando, setAnaliseCarregando] = useState(false);

  // Filtros
  const [filtroStatus, setFiltroStatus] = useState<string>('');
  const [filtroData, setFiltroData] = useState<string>('');
  const [filtroFornecedor, setFiltroFornecedor] = useState<string>('');

  const buscarCotacoes = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/compras/cotacoes');
      setCotacoes(response.data);
    } catch (error) {
      console.error('Erro ao buscar cotações:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { buscarCotacoes(); }, []);

  useEffect(() => {
    let result = cotacoes;
    if (filtroStatus) result = result.filter(c => c.status === filtroStatus);
    if (filtroData) result = result.filter(c => c.createdAt?.startsWith(filtroData));
    if (filtroFornecedor) {
      const termo = filtroFornecedor.toLowerCase();
      result = result.filter(c => 
        c.itens?.some(item => 
          item.fornecedor?.nomeFantasia?.toLowerCase().includes(termo) || 
          item.fornecedor?.razaoSocial?.toLowerCase().includes(termo)
        )
      );
    }
    setCotacoesFiltradas(result);
  }, [cotacoes, filtroStatus, filtroData, filtroFornecedor]);

  const abrirAnalisePrecos = async () => {
    const sid = cotacaoSelecionada?.solicitacaoCompraId;
    if (!sid) {
      alert('Esta cotação não possui vínculo com solicitação de compra. Registre cotações a partir da tela de Cotações.');
      return;
    }
    setAnaliseCarregando(true);
    try {
      const r = await api.get<AnalisePrecosResponse>(
        `/api/compras/solicitacoes/${sid}/analise-precos`,
      );
      setAnaliseDados(r.data);
      setAnaliseSolicitacaoId(sid);
      setAnaliseOpen(true);
    } catch {
      alert(
        'Não foi possível carregar a análise. É necessário ao menos uma cotação vinculada à solicitação (status aberta ou finalizada) com preços por item.',
      );
    } finally {
      setAnaliseCarregando(false);
    }
  };

  const handleSelecionar = (cot: CotacaoCompra) => {
    setCotacaoSelecionada(cot);
    const iniciais: Record<string, { quantidadeCotada: number, valorUnitario: number }> = {};
    
    cot.itens?.forEach(item => {
      const qtdReal = Number(item.quantidadeCotada) || Number(item.quantidade) || 0;
      
      iniciais[item.id] = {
        quantidadeCotada: qtdReal,
        valorUnitario: Number(item.valorUnitario) || 0
      };
    });
    setItensEditados(iniciais);
  };

    const handleAvaliarCotacao = async (id: string, status: 'APROVADA' | 'REPROVADA') => {
    if (!window.confirm(`Tem certeza que deseja marcar esta cotação como ${status}?`)) return;
    
    try {
      setActionLoading(true);
      await api.put(`/api/compras/cotacoes/${id}/status`, { 
        status,
        itensEditados
      });
      alert(`✅ Cotação ${status.toLowerCase()} com sucesso!`);
      await buscarCotacoes();
      setCotacaoSelecionada(null);
    } catch (error: any) {
      console.error('Erro ao avaliar cotação:', error);
      // 🚀 Agora a tela vai te mostrar exatamente o que o banco de dados reclamou!
      const mensagemErro = error.response?.data?.error || 'Erro desconhecido no servidor';
      alert(`❌ Erro ao processar a cotação:\n\n${mensagemErro}`);
    } finally {
      setActionLoading(false);
    }
  };

  const formatarData = (dataString: string) => {
    if (!dataString) return '';
    return new Date(dataString).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const getStatusColor = (status: string) => {
    if (status === 'ABERTA') return 'bg-sky-500/20 text-sky-300 border-sky-500/30';
    if (status === 'FINALIZADA') return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    if (status === 'APROVADA') return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    if (status === 'CANCELADA' || status === 'REPROVADA') return 'bg-red-500/20 text-red-400 border-red-500/30';
    return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
  };

  // 🚀 TIPAGEM FORÇADA: O Typescript agora sabe que isso retorna um NUMBER
  const calcularTotalCotacao = (cotacao: CotacaoCompra): number => {
    if (!cotacao.itens) return 0;
    return cotacao.itens.reduce((acc: number, item: ItemCotacao) => {
      const qtdReal = Number(item.quantidadeCotada) || Number(item.quantidade) || 0;
      const editado = itensEditados[item.id] || { quantidadeCotada: qtdReal, valorUnitario: item.valorUnitario };
      return acc + (Number(editado.quantidadeCotada) * Number(editado.valorUnitario));
    }, 0); // 🚀 O zero no final garante que o acumulador é um número
  };

  const inputClass = "w-full bg-[#0b1324] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:ring-2 focus:ring-violet-500/50 outline-none";

  if (loading && cotacoes.length === 0) {
    return (
      <Layout>
        <div className="flex h-96 flex-col items-center justify-center text-violet-500">
          <Loader2 className="mb-4 h-10 w-10 animate-spin" />
          <p className="font-bold text-white">Carregando cotações...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
    <div className="w-full space-y-6 pb-10">
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4 backdrop-blur-xl sm:flex-row sm:items-center">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-200">Cérebro da economia</p>
          <p className="mt-1 text-sm text-amber-100/90">
            Selecione uma cotação vinculada a uma solicitação e abra a <strong>Análise de cotação</strong> para ver a
            matriz de preços, troféus 🏆 por item e gerar pedidos (global ou fatiado).
          </p>
        </div>
        <Link
          to="/compras/cotacoes"
          className="shrink-0 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-center text-xs font-black uppercase tracking-wide text-white hover:bg-white/15"
        >
          Ir para nova cotação
        </Link>
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#08101f]/40 p-6 backdrop-blur-xl shadow-lg flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
            <CircleDollarSign className="w-8 h-8 text-violet-500" /> Gerenciar Cotações
          </h1>
          <p className="text-sm text-slate-400 mt-1">Acompanhe, filtre e aprove os preços negociados com fornecedores.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <div className="lg:col-span-1 space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input type="text" placeholder="Buscar por fornecedor..." value={filtroFornecedor} onChange={(e) => setFiltroFornecedor(e.target.value)} className={inputClass} />
            </div>
            <button onClick={() => setShowFilters(!showFilters)} className={`p-2.5 border rounded-xl transition-colors ${showFilters ? 'bg-violet-600/20 border-violet-500/50 text-violet-400' : 'bg-[#0b1324] border-white/10 text-slate-400 hover:text-white'}`}>
              <Filter className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3 max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
            {cotacoesFiltradas.map(cot => {
              const total = calcularTotalCotacao(cot);
              const fornecedorPrincipal = cot.itens?.[0]?.fornecedor;

              return (
                <div key={cot.id} onClick={() => handleSelecionar(cot)} className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 ${cotacaoSelecionada?.id === cot.id ? 'bg-violet-600/10 border-violet-500/50 shadow-[0_0_15px_rgba(139,92,246,0.15)]' : 'bg-[#08101f]/60 border-white/5 hover:border-white/20'}`}>
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-bold text-violet-400 bg-violet-400/10 px-2 py-1 rounded-md">COT-{cot.id.substring(0,6).toUpperCase()}</span>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-md border ${getStatusColor(cot.status || 'PENDENTE')}`}>
                      {cot.status === 'FINALIZADA' ? 'AGUARDANDO APROVAÇÃO' : cot.status}
                    </span>
                  </div>
                  <h3 className="text-white font-bold text-sm mb-1 flex items-center gap-2 truncate">
                    <Truck className="w-3 h-3 text-slate-400 shrink-0" /> 
                    {fornecedorPrincipal?.nomeFantasia || fornecedorPrincipal?.razaoSocial || 'Múltiplos Fornecedores'}
                  </h3>
                  <div className="flex justify-between items-center pt-3 border-t border-white/5 mt-2">
                    <span className="text-xs text-slate-500 flex items-center gap-1"><Calendar className="w-3 h-3" /> {formatarData(cot.createdAt).split(' ')[0]}</span>
                    <span className="text-sm font-black text-emerald-400">R$ {total.toFixed(2)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-2">
          {cotacaoSelecionada ? (
            <div className="rounded-2xl border border-white/10 bg-[#08101f]/80 backdrop-blur-xl flex flex-col h-full animate-in fade-in">
              <div className="p-6 border-b border-white/10 flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-2xl font-black text-white">COT-{cotacaoSelecionada.id.substring(0,6).toUpperCase()}</h2>
                    <span className={`text-xs font-bold px-3 py-1 rounded-full border ${getStatusColor(cotacaoSelecionada.status || 'PENDENTE')}`}>
                      {cotacaoSelecionada.status === 'FINALIZADA' ? 'AGUARDANDO APROVAÇÃO' : cotacaoSelecionada.status}
                    </span>
                  </div>
                  <p className="text-slate-400 text-sm flex items-center gap-2">
                    <Calendar className="w-4 h-4" /> Registrada em {formatarData(cotacaoSelecionada.createdAt)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Valor Total Negociado</p>
                  <p className="text-3xl font-black text-emerald-400">R$ {calcularTotalCotacao(cotacaoSelecionada).toFixed(2)}</p>
                </div>
              </div>

              <div className="p-6 flex-1 space-y-6">
                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2"><Package className="w-4 h-4" /> Itens Cotados ({cotacaoSelecionada.itens?.length || 0})</h4>
                  <div className="border border-white/10 rounded-xl overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-black/20 border-b border-white/10 text-[10px] uppercase tracking-wider text-slate-500">
                          <th className="p-3 font-bold">Produto</th>
                          <th className="p-3 font-bold">Fornecedor</th>
                          <th className="p-3 font-bold text-center">Qtd</th>
                          <th className="p-3 font-bold text-right">Valor Unit.</th>
                          <th className="p-3 font-bold text-right text-emerald-300">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm">
                        {cotacaoSelecionada.itens?.map(item => {
                          const qtdReal = Number(item.quantidadeCotada) || Number(item.quantidade) || 0;
                          const editado = itensEditados[item.id] || { quantidadeCotada: qtdReal, valorUnitario: item.valorUnitario };
                          const subtotal = Number(editado.quantidadeCotada) * Number(editado.valorUnitario);
                          const podeEditar = cotacaoSelecionada.status === 'FINALIZADA';
                          
                          return (
                            <tr key={item.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                              <td className="p-3 text-white font-medium">{item.produto?.nome || 'Removido'}</td>
                              <td className="p-3 text-slate-400 text-xs">{item.fornecedor?.nomeFantasia || item.fornecedor?.razaoSocial || '-'}</td>
                              <td className="p-3 text-center">
                                {podeEditar ? (
                                  <input 
                                    type="number" 
                                    className="w-20 bg-[#0b1324] border border-violet-500/30 rounded-lg px-2 py-1 text-center text-white font-bold focus:ring-2 focus:ring-violet-500/50 outline-none"
                                    value={editado.quantidadeCotada}
                                    onChange={e => setItensEditados({...itensEditados, [item.id]: { ...editado, quantidadeCotada: Number(e.target.value) }})}
                                  />
                                ) : (
                                  <span className="text-slate-300 font-bold">{editado.quantidadeCotada}</span>
                                )}
                              </td>
                              <td className="p-3 text-right">
                                {podeEditar ? (
                                  <input 
                                    type="number" 
                                    step="0.01"
                                    className="w-24 bg-[#0b1324] border border-violet-500/30 rounded-lg px-2 py-1 text-right text-emerald-300 font-bold focus:ring-2 focus:ring-violet-500/50 outline-none"
                                    value={editado.valorUnitario}
                                    onChange={e => setItensEditados({...itensEditados, [item.id]: { ...editado, valorUnitario: Number(e.target.value) }})}
                                  />
                                ) : (
                                  <span className="text-slate-400">R$ {Number(editado.valorUnitario).toFixed(2)}</span>
                                )}
                              </td>
                              <td className="p-3 text-right font-black text-emerald-400">R$ {subtotal.toFixed(2)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-white/10 bg-black/20 flex flex-wrap justify-end gap-3 rounded-b-2xl">
                {cotacaoSelecionada.solicitacaoCompraId &&
                  ['ABERTA', 'FINALIZADA'].includes(cotacaoSelecionada.status) && (
                  <button
                    type="button"
                    onClick={() => void abrirAnalisePrecos()}
                    disabled={analiseCarregando || actionLoading}
                    className="px-6 py-2.5 rounded-xl font-bold text-sm text-amber-200 hover:bg-amber-500/10 border border-amber-500/30 transition-all flex items-center gap-2"
                  >
                    {analiseCarregando ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <span className="text-lg">🏆</span>
                    )}
                    Análise de cotação (matriz)
                  </button>
                )}
                {cotacaoSelecionada.status !== 'REPROVADA' && (
                  <button onClick={() => handleAvaliarCotacao(cotacaoSelecionada.id, 'REPROVADA')} disabled={actionLoading} className="px-6 py-2.5 rounded-xl font-bold text-sm text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/30 transition-all flex items-center gap-2">
                    <XCircle className="w-4 h-4" /> Reprovar Valores
                  </button>
                )}
                {cotacaoSelecionada.status !== 'APROVADA' && (
                  <button onClick={() => handleAvaliarCotacao(cotacaoSelecionada.id, 'APROVADA')} disabled={actionLoading} className="px-6 py-2.5 rounded-xl font-bold text-sm bg-emerald-500 hover:bg-emerald-400 text-slate-900 transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:scale-105">
                    {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    Aprovar Pedido de Compra
                  </button>
                )}
              </div>

            </div>
          ) : (
             <div className="rounded-2xl border border-dashed border-white/10 bg-[#08101f]/20 flex flex-col items-center justify-center h-full min-h-[400px] text-slate-500">
               <DollarSign className="w-16 h-16 mb-4 opacity-20" />
               <p className="text-lg font-bold text-slate-400">Nenhuma cotação selecionada</p>
             </div>
          )}
        </div>

      </div>

      <AnaliseCotacaoPrecosModal
        open={analiseOpen}
        dados={analiseDados}
        solicitacaoId={analiseSolicitacaoId}
        onClose={() => {
          setAnaliseOpen(false);
          setAnaliseDados(null);
        }}
        onGerouPedidos={() => void buscarCotacoes()}
      />
    </div>
    </Layout>
  );
};