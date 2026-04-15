import { useEffect, useState } from 'react';
import { Layout } from '../../components/Layout';
import { api } from '../../services/api';
import {
  DollarSign, Search, CheckCircle, Clock, AlertCircle, HandCoins, X,
  Loader2, FileX, Sparkles, Landmark, Filter, ChevronDown, ChevronUp,
  Plus, Trash2, RotateCcw, Edit2, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import { AxiosError } from 'axios';

export interface IPessoa { nome: string; }
export interface IContaBancaria { id: string; descricao: string; }
export interface IPlanoContaResumo {
  id: string; codigoEstrutural: string; nomeConta: string;
  natureza: 'DEVEDORA' | 'CREDORA'; grupo: 'BALANCO' | 'DRE';
}
export interface ITitulo {
  id: string; descricao: string; tipo: 'PAGAR' | 'RECEBER';
  valor: number | string; saldoDevedor: number;
  dataVencimento: string | Date; dataEmissao?: string;
  status: string; pessoa: IPessoa; planoContas: string;
  origem: string; observacao?: string;
}

export function TitulosPage() {
  const [titulos, setTitulos] = useState<ITitulo[]>([]);
  const [contasBancarias, setContasBancarias] = useState<IContaBancaria[]>([]);
  const [planosContas, setPlanosContas] = useState<IPlanoContaResumo[]>([]);
  const [abaAtual, setAbaAtual] = useState<'RECEBER' | 'PAGAR'>('RECEBER');
  const [loading, setLoading] = useState(false);
  
  // Filtros Avançados
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<'TODOS' | 'ABERTOS' | 'PAGOS' | 'VENCIDOS'>('TODOS');
  const [filtroValorMin, setFiltroValorMin] = useState('');
  const [filtroValorMax, setFiltroValorMax] = useState('');
  const [filtroDataEmissaoInicio, setFiltroDataEmissaoInicio] = useState('');
  const [filtroDataEmissaoFim, setFiltroDataEmissaoFim] = useState('');
  const [filtroDataVencimentoInicio, setFiltroDataVencimentoInicio] = useState('');
  const [filtroDataVencimentoFim, setFiltroDataVencimentoFim] = useState('');
  const [filtroOrigem, setFiltroOrigem] = useState('TODAS');
  const [showFiltrosAvancados, setShowFiltrosAvancados] = useState(false);

  // Modais
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isNovoModalOpen, setIsNovoModalOpen] = useState(false);
  const [tituloSelecionado, setTituloSelecionado] = useState<ITitulo | null>(null);
  
  // Baixa
  const [valorPago, setValorPago] = useState('');
  const [contaSelecionada, setContaSelecionada] = useState('');
  const [tipoPagamento, setTipoPagamento] = useState('DINHEIRO');
  const [saving, setSaving] = useState(false);

  // Novo Título
  const [novoDescricao, setNovoDescricao] = useState('');
  const [novoValor, setNovoValor] = useState('');
  const [novoVencimento, setNovoVencimento] = useState('');
  const [novoPlanoContasId, setNovoPlanoContasId] = useState('');

  const isPago = (status: string) => ['PAGO', 'PAGO_TOTAL', 'CONCLUIDO', 'BAIXADO'].includes(status?.toUpperCase() || '');
  const isPendente = (status: string) => ['PENDENTE', 'ABERTO'].includes(status?.toUpperCase() || '');
  const isAtrasado = (status: string) => ['ATRASADO', 'VENCIDO'].includes(status?.toUpperCase() || '');

  useEffect(() => { carregarDadosBase(); }, []);
  useEffect(() => { carregarTitulos(); }, [abaAtual]);

  const carregarDadosBase = async () => {
    try {
      const [resContas, resCaixas] = await Promise.all([
        api.get<IPlanoContaResumo[]>('/api/contabilidade/planos').catch(() => ({ data: [] as IPlanoContaResumo[] })),
        api.get<IContaBancaria[]>('/api/caixas').catch(() => ({ data: [] as IContaBancaria[] }))
      ]);
      setPlanosContas(resContas.data);
      setContasBancarias(resCaixas.data);
      if (resCaixas.data.length > 0) setContaSelecionada(resCaixas.data[0].id);
    } catch (err) { console.error('Erro ao buscar dados base', err); }
  };

  const carregarTitulos = async () => {
    setLoading(true);
    try {
      const response = await api.get<ITitulo[]>(`/api/titulos?tipo=${abaAtual}`);
      setTitulos(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error('Erro ao buscar títulos', err);
      setTitulos([]);
    } finally { setLoading(false); }
  };

  const abrirModalBaixa = (titulo: ITitulo) => {
    setTituloSelecionado(titulo);
    const valorSugerido = titulo.saldoDevedor !== undefined ? titulo.saldoDevedor : titulo.valor;
    setValorPago(valorSugerido.toString());
    setIsModalOpen(true);
  };

  const abrirModalNovo = () => {
    setTituloSelecionado(null);
    setNovoDescricao(''); setNovoValor(''); setNovoVencimento(''); setNovoPlanoContasId('');
    setIsNovoModalOpen(true);
  };

  const handleBaixar = async () => {
    if (!tituloSelecionado || !valorPago || !contaSelecionada) return alert('Preencha valor e caixa.');
    setSaving(true);
    try {
      await api.post<{ message?: string }>(`/api/titulos/${tituloSelecionado.id}/baixar`, {
        valorPago: Number(valorPago), contaBancariaId: contaSelecionada, tipoPagamento,
      });
      alert('✅ Baixa realizada com sucesso!');
      setIsModalOpen(false); carregarTitulos();
    } catch (err: any) { alert(err.response?.data?.error || 'Erro ao realizar baixa.'); } 
    finally { setSaving(false); }
  };

  const salvarNovoTitulo = async () => {
    if (!novoDescricao || !novoValor || !novoVencimento) return alert('Preencha os campos obrigatórios!');
    setSaving(true);
    try {
      await api.post<{ message?: string }>('/api/financeiro/titulos', {
        descricao: novoDescricao, tipo: abaAtual, valor: Number(novoValor),
        dataVencimento: novoVencimento, planoContasId: novoPlanoContasId || undefined
      });
      alert('✅ Título criado!');
      setIsNovoModalOpen(false); carregarTitulos();
    } catch (err: any) { alert(err.response?.data?.error || 'Erro ao salvar o título.'); } 
    finally { setSaving(false); }
  };

  const confirmarEstorno = async (titulo: ITitulo) => {
    if (window.confirm(`Deseja estornar a baixa de "${titulo.descricao}"?`)) {
      try {
        await api.post<{ message?: string }>(`/api/financeiro/titulos/${titulo.id}/estornar`, {});
        alert('✅ Estorno realizado!'); carregarTitulos();
      } catch (err: any) { alert(err.response?.data?.error || 'Erro ao estornar.'); }
    }
  };

  const confirmarExclusao = async (titulo: ITitulo) => {
    if (window.confirm(`Deseja excluir o título "${titulo.descricao}"?`)) {
      try {
        await api.delete<{ message?: string }>(`/api/financeiro/titulos/${titulo.id}`);
        alert('✅ Título excluído!'); carregarTitulos();
      } catch (err: any) { alert(err.response?.data?.error || 'Erro ao excluir.'); }
    }
  };

  function limparFiltros() {
    setBusca(''); setFiltroStatus('TODOS'); setFiltroValorMin(''); setFiltroValorMax('');
    setFiltroDataEmissaoInicio(''); setFiltroDataEmissaoFim('');
    setFiltroDataVencimentoInicio(''); setFiltroDataVencimentoFim(''); setFiltroOrigem('TODAS');
  }

  const titulosFiltrados = titulos.filter(t => {
    if (!t) return false;
    const statusSeguro = String(t.status || '');
    if (filtroStatus === 'ABERTOS' && isPago(statusSeguro)) return false;
    if (filtroStatus === 'PAGOS' && !isPago(statusSeguro)) return false;
    if (filtroStatus === 'VENCIDOS' && !isAtrasado(statusSeguro)) return false;
    if (filtroOrigem !== 'TODAS' && t.origem !== filtroOrigem) return false;
    
    if (busca) {
      const txt = busca.toLowerCase();
      if (!String(t.descricao||'').toLowerCase().includes(txt) && 
          !String(t.observacao||'').toLowerCase().includes(txt) && 
          !String(t.pessoa?.nome||'').toLowerCase().includes(txt)) return false;
    }
    const val = Number(t.valor) || 0;
    if (filtroValorMin && val < Number(filtroValorMin)) return false;
    if (filtroValorMax && val > Number(filtroValorMax)) return false;
    if (filtroDataVencimentoInicio && new Date(t.dataVencimento) < new Date(filtroDataVencimentoInicio)) return false;
    if (filtroDataVencimentoFim && new Date(t.dataVencimento) > new Date(filtroDataVencimentoFim)) return false;
    if (t.dataEmissao) {
      if (filtroDataEmissaoInicio && new Date(t.dataEmissao) < new Date(filtroDataEmissaoInicio)) return false;
      if (filtroDataEmissaoFim && new Date(t.dataEmissao) > new Date(filtroDataEmissaoFim)) return false;
    }
    return true;
  });

  const totalAberto = titulos.filter(t => !isPago(t.status)).reduce((acc, t) => acc + (t.saldoDevedor !== undefined ? t.saldoDevedor : Number(t.valor)), 0);
  const totalAtrasado = titulos.filter(t => isAtrasado(t.status)).reduce((acc, t) => acc + (t.saldoDevedor !== undefined ? t.saldoDevedor : Number(t.valor)), 0);
  const totalLiquidado = titulos.filter(t => isPago(t.status)).reduce((acc, t) => acc + Number(t.valor), 0);

  const formatarMoeda = (val: number | string) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(val));

  const getStatusBadge = (status: string) => {
    if (isPago(status)) return <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-[10px] font-black uppercase text-emerald-300"><CheckCircle className="h-3 w-3" /> Pago</span>;
    if (isAtrasado(status)) return <span className="inline-flex items-center gap-1 rounded-full border border-rose-400/20 bg-rose-500/10 px-3 py-1 text-[10px] font-black uppercase text-rose-300 animate-pulse"><AlertCircle className="h-3 w-3" /> Atrasado</span>;
    if (isPendente(status)) return <span className="inline-flex items-center gap-1 rounded-full border border-sky-400/20 bg-sky-500/10 px-3 py-1 text-[10px] font-black uppercase text-sky-300"><Clock className="h-3 w-3" /> No Prazo</span>;
    return <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black uppercase text-slate-400">{status}</span>;
  };

  const inputClass = 'w-full rounded-2xl border border-white/10 bg-[#0d182d] px-4 py-3 text-sm text-white outline-none focus:border-violet-500/50';
  const labelClass = 'mb-2 block pl-1 text-xs font-bold uppercase tracking-[0.16em] text-slate-400';
  const focusBorderClass = abaAtual === 'RECEBER' ? 'focus:border-emerald-400/30' : 'focus:border-rose-400/30';
  const btnSubmitClass = abaAtual === 'RECEBER' ? 'bg-gradient-to-r from-emerald-600 to-teal-500' : 'bg-gradient-to-r from-rose-600 to-orange-500';
  const btnActionClass = abaAtual === 'RECEBER' ? 'border-emerald-400/20 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-600 hover:text-white' : 'border-rose-400/20 bg-rose-500/10 text-rose-300 hover:bg-rose-600 hover:text-white';
  const loaderClass = abaAtual === 'RECEBER' ? 'text-emerald-300' : 'text-rose-300';

  return (
    <Layout>
      <style>{`
        @keyframes modalEnter { from { opacity: 0; transform: scale(0.95) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        .animate-modal { animation: modalEnter 0.3s ease-out forwards; }
        .custom-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0,0,0,0.2); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(139,92,246,0.4); border-radius: 10px; }
      `}</style>

      <div className="mx-auto flex h-full max-w-7xl flex-col space-y-6 pb-12">
        {/* HEADER */}
        <div className="relative overflow-hidden rounded-[30px] border border-white/10 bg-[#08101f] p-6 shadow-2xl sm:p-8">
          <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className={`rounded-2xl border p-3 ${abaAtual === 'RECEBER' ? 'border-emerald-500/30 text-emerald-400' : 'border-rose-500/30 text-rose-400'}`}>
                <DollarSign className="h-8 w-8" />
              </div>
              <div>
                <h1 className="text-3xl font-black text-white">Gestão Financeira</h1>
                <p className="mt-1 text-slate-400">Controle de contas a pagar, receber e fluxo de caixa.</p>
              </div>
            </div>
            <button onClick={abrirModalNovo} className="inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-6 py-3 font-black text-white hover:bg-violet-500">
              <Plus className="h-5 w-5" /> Novo Título
            </button>
          </div>
        </div>

        {/* CARDS RESUMO */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="rounded-[26px] border border-emerald-400/20 bg-emerald-500/10 p-6">
            <p className="mb-2 text-xs font-black uppercase text-emerald-300">A {abaAtual === 'RECEBER' ? 'Receber' : 'Pagar'} (Aberto)</p>
            <p className="text-3xl font-black text-white">{formatarMoeda(totalAberto)}</p>
          </div>
          <div className="rounded-[26px] border border-rose-400/20 bg-rose-500/10 p-6">
            <p className="mb-2 text-xs font-black uppercase text-rose-300">Atrasados</p>
            <p className="text-3xl font-black text-white">{formatarMoeda(totalAtrasado)}</p>
          </div>
          <div className="rounded-[26px] border border-teal-400/20 bg-teal-500/10 p-6">
            <p className="mb-2 text-xs font-black uppercase text-teal-300">Liquidado (Pago)</p>
            <p className="text-3xl font-black text-white">{formatarMoeda(totalLiquidado)}</p>
          </div>
        </div>

        {/* ABAS GRANDES */}
        <div className="flex rounded-2xl border border-white/10 bg-[#0b1324] p-1.5">
          <button onClick={() => setAbaAtual('RECEBER')} className={`flex-1 px-6 py-4 rounded-xl font-black uppercase ${abaAtual === 'RECEBER' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:bg-white/5'}`}>
            Contas a Receber
          </button>
          <button onClick={() => setAbaAtual('PAGAR')} className={`flex-1 px-6 py-4 rounded-xl font-black uppercase ${abaAtual === 'PAGAR' ? 'bg-[#1e1b4b] text-white' : 'text-slate-400 hover:bg-white/5'}`}>
            Contas a Pagar
          </button>
        </div>

        {/* TABELA & FILTROS */}
        <div className="flex flex-col rounded-[30px] border border-white/10 bg-[#08101f]/90 shadow-2xl">
          <div className="flex flex-col items-center justify-between gap-4 border-b border-white/10 p-5 lg:flex-row">
            <div className="relative w-full lg:w-[400px]">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
              <input type="text" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar..." className={`${inputClass} pl-12`} />
            </div>
            <button onClick={() => setShowFiltrosAvancados(!showFiltrosAvancados)} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-[#0b1324] px-6 py-3 font-black text-slate-400 hover:text-white">
              <Filter className="h-4 w-4" /> Filtros Avançados
            </button>
          </div>

          {showFiltrosAvancados && (
            <div className="border-b border-white/10 p-6 animate-modal">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <div><label className={labelClass}>Status</label><select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value as any)} className={inputClass}><option value="TODOS">Todos</option><option value="ABERTOS">Abertos</option><option value="PAGOS">Pagos</option><option value="VENCIDOS">Vencidos</option></select></div>
                <div><label className={labelClass}>Origem</label><select value={filtroOrigem} onChange={e => setFiltroOrigem(e.target.value)} className={inputClass}><option value="TODAS">Todas</option><option value="PDV">PDV</option><option value="MESA">Mesa</option><option value="NFE">NFe</option><option value="MANUAL">Manual</option></select></div>
                <div><label className={labelClass}>Vencimento (De)</label><input type="date" value={filtroDataVencimentoInicio} onChange={e => setFiltroDataVencimentoInicio(e.target.value)} className={inputClass} style={{colorScheme:'dark'}}/></div>
                <div><label className={labelClass}>Vencimento (Até)</label><input type="date" value={filtroDataVencimentoFim} onChange={e => setFiltroDataVencimentoFim(e.target.value)} className={inputClass} style={{colorScheme:'dark'}}/></div>
              </div>
              <div className="mt-4 flex justify-end"><button onClick={limparFiltros} className="text-slate-400 font-bold hover:text-white">Limpar Filtros</button></div>
            </div>
          )}

          <div className="custom-scrollbar overflow-x-auto overflow-y-auto max-h-[600px] w-full">
            <table className="w-full min-w-[1000px] text-left">
              <thead className="sticky top-0 z-10 bg-[#0b1324] border-b border-white/10">
                <tr>
                  <th className="p-5 text-xs font-black text-slate-400 uppercase">Vencimento</th>
                  <th className="p-5 text-xs font-black text-slate-400 uppercase">Descrição / Origem</th>
                  <th className="p-5 text-xs font-black text-slate-400 uppercase">Pessoa</th>
                  <th className="p-5 text-right text-xs font-black text-slate-400 uppercase">Valor Total</th>
                  <th className="p-5 text-right text-xs font-black text-slate-400 uppercase">Saldo Devedor</th>
                  <th className="p-5 text-center text-xs font-black text-slate-400 uppercase">Status</th>
                  <th className="p-5 text-right text-xs font-black text-slate-400 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  <tr><td colSpan={7} className="p-16 text-center"><Loader2 className={`w-8 h-8 animate-spin mx-auto mb-4 ${loaderClass}`} /></td></tr>
                ) : titulosFiltrados.length === 0 ? (
                  <tr><td colSpan={7} className="p-16 text-center text-slate-500 font-bold">Nenhum título encontrado.</td></tr>
                ) : (
                  titulosFiltrados.map((titulo) => (
                    <tr key={titulo.id} className="hover:bg-white/5">
                      <td className="p-5 font-bold text-slate-300">{new Date(titulo.dataVencimento).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</td>
                      <td className="p-5"><div className="font-black text-white">{titulo.descricao}</div><div className="text-xs text-slate-500">ORIGEM: {titulo.origem}</div></td>
                      <td className="p-5 text-slate-300">{titulo.pessoa?.nome || 'DIVERSOS'}</td>
                      <td className="p-5 text-right font-mono font-black text-slate-300">{formatarMoeda(titulo.valor)}</td>
                      <td className={`p-5 text-right font-mono font-black ${abaAtual === 'RECEBER' ? 'text-emerald-300' : 'text-rose-300'}`}>{formatarMoeda(titulo.saldoDevedor !== undefined ? titulo.saldoDevedor : titulo.valor)}</td>
                      <td className="p-5 text-center">{getStatusBadge(titulo.status)}</td>
                      <td className="p-5 text-right">
                        {!isPago(titulo.status) ? (
                          <button onClick={() => abrirModalBaixa(titulo)} className={`px-4 py-2 rounded-xl font-black text-xs uppercase border ${btnActionClass}`}>Baixar</button>
                        ) : (
                          <button onClick={() => confirmarEstorno(titulo)} className="px-4 py-2 rounded-xl font-black text-xs uppercase text-amber-300 border border-amber-400/20 bg-amber-500/10">Estornar</button>
                        )}
                        {titulo.origem === 'MANUAL' && <button onClick={() => confirmarExclusao(titulo)} className="ml-2 px-3 py-2 rounded-xl text-rose-300 border border-rose-400/20 bg-rose-500/10"><Trash2 className="w-4 h-4"/></button>}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* MODAL BAIXA */}
        {isModalOpen && tituloSelecionado && (
          <div className="fixed inset-0 bg-[#020617]/90 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
            <div className="bg-[#08101f] border border-white/10 rounded-[30px] w-full max-w-md p-6 animate-modal">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-black text-white">Baixar Título</h2>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400"><X/></button>
              </div>
              <div className="space-y-4">
                <div><label className={labelClass}>Valor a Baixar</label><input type="number" value={valorPago} onChange={e => setValorPago(e.target.value)} className={inputClass} /></div>
                <div><label className={labelClass}>Conta / Caixa</label><select value={contaSelecionada} onChange={e => setContaSelecionada(e.target.value)} className={inputClass}>{contasBancarias.map(c => <option key={c.id} value={c.id}>{c.descricao}</option>)}</select></div>
                <div><label className={labelClass}>Pagamento</label><select value={tipoPagamento} onChange={e => setTipoPagamento(e.target.value)} className={inputClass}><option value="PIX">PIX</option><option value="DINHEIRO">Dinheiro</option><option value="CARTAO_CREDITO">Crédito</option></select></div>
              </div>
              <div className="mt-6 flex justify-end gap-4">
                <button onClick={() => setIsModalOpen(false)} className="px-6 py-3 text-slate-300 font-bold">Cancelar</button>
                <button onClick={handleBaixar} disabled={saving} className={`px-6 py-3 text-white font-black rounded-xl ${btnSubmitClass}`}>{saving ? 'Processando...' : 'Confirmar'}</button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL NOVO TÍTULO */}
        {isNovoModalOpen && (
          <div className="fixed inset-0 bg-[#020617]/90 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
            <div className="bg-[#08101f] border border-white/10 rounded-[30px] w-full max-w-lg p-6 animate-modal">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-black text-white">Novo Título</h2>
                <button onClick={() => setIsNovoModalOpen(false)} className="text-slate-400"><X/></button>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div><label className={labelClass}>Tipo</label><input type="text" value={abaAtual} disabled className={inputClass} /></div>
                <div><label className={labelClass}>Valor Total</label><input type="number" value={novoValor} onChange={e => setNovoValor(e.target.value)} className={inputClass} /></div>
              </div>
              <div className="mb-4"><label className={labelClass}>Descrição</label><input type="text" value={novoDescricao} onChange={e => setNovoDescricao(e.target.value)} className={inputClass} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className={labelClass}>Vencimento</label><input type="date" value={novoVencimento} onChange={e => setNovoVencimento(e.target.value)} className={inputClass} style={{colorScheme:'dark'}}/></div>
                <div><label className={labelClass}>Conta Contábil</label><select value={novoPlanoContasId} onChange={e => setNovoPlanoContasId(e.target.value)} className={inputClass}><option value="">Pendente</option>{planosContas.map(c => <option key={c.id} value={c.id}>{c.nomeConta}</option>)}</select></div>
              </div>
              <div className="mt-6 flex justify-end gap-4">
                <button onClick={() => setIsNovoModalOpen(false)} className="px-6 py-3 text-slate-300 font-bold">Cancelar</button>
                <button onClick={salvarNovoTitulo} disabled={saving} className={`px-6 py-3 text-white font-black rounded-xl bg-violet-600`}>{saving ? 'Processando...' : 'Salvar'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}