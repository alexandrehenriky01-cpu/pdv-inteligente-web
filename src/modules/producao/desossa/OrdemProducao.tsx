import React, { useState, useEffect } from 'react';
import { Layout } from '../../../components/Layout';
import { api } from '../../../services/api';
import {
  Package, Plus, Search, Play, CheckCircle2,
  Scale, ArrowRight, ChevronLeft, Loader2,
  ClipboardList, Hash, Calendar, FileText, FileDigit, Trash2, Tag, DollarSign, X,
  Edit2, Ban, PauseCircle, MonitorSmartphone, Wifi, WifiOff
} from 'lucide-react';

// ==========================================
// TIPAGENS
// ==========================================
interface IProduto {
  id: string;
  nome: string;
  codigo: string;
  precoCusto: string | number;
  dadosProducao?: {
    pesoMedioPeca?: number;
  }
}

interface ILayoutEtiqueta {
  id: string;
  nome: string;
  tipo: 'INTERNA' | 'EXTERNA';
}

interface EstacaoTrabalho {
  id: string;
  nome: string;
}

interface IItemOrigem {
  produtoId: string;
  produto?: IProduto;
  quantidadePecasPrevista?: number;
  quantidadeKgPrevista?: number;
  quantidadeKgReal?: number;
  custoUnitario: number;
}

interface IItemDestino {
  produtoId: string;
  produto?: IProduto;
  quantidadePecas?: number;
  quantidadeEsperada: number;
  quantidadeReal?: number;
  vaiProduzir: boolean;
}

interface IOP {
  id: string;
  codigoOP: number;
  status: 'PROGRAMADA' | 'EM_PROCESSAMENTO' | 'PAUSADA' | 'CONCLUIDA' | 'CANCELADA';
  tipoFluxo: 'REAL' | 'ESTIMADO';
  dataAbertura: string;
  dataAbate?: string;
  dataProducao?: string;
  lote?: string;
  notaFiscal?: string;
  observacao?: string;
  itensOrigem: IItemOrigem[];
  itensDestino: IItemDestino[];
}

interface IItemDestinoForm {
  idTemp: string;
  produtoId: string;
  quantidadePecas: string;
  quantidadeEsperada: string;
  vaiProduzir: boolean;
  layoutInternoId: string;
  layoutExternoId: string;
}

export function OrdemProducao() {
  // ==========================================
  // ESTADOS GERAIS
  // ==========================================
  const [ops, setOps] = useState<IOP[]>([]);
  const [produtos, setProdutos] = useState<IProduto[]>([]);
  const [layoutsEtiqueta, setLayoutsEtiqueta] = useState<ILayoutEtiqueta[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados de Estação e Balança
  const [estacoes, setEstacoes] = useState<EstacaoTrabalho[]>([]);
  const [estacaoSelecionada, setEstacaoSelecionada] = useState<string>('');
  const [pesoRealTime, setPesoRealTime] = useState<number>(0);
  const [balancaConectada, setBalancaConectada] = useState<boolean>(false);
  const [imprimindo, setImprimindo] = useState<boolean>(false);

  const [modalBusca, setModalBusca] = useState<{ ativo: boolean, tipo: 'NF' | 'PRODUTO_ORIGEM' | 'PRODUTO_DESTINO', idTemp?: string }>({ ativo: false, tipo: 'NF' });
  const [termoBusca, setTermoBusca] = useState('');

  const notasFiscaisMock = [
    { id: '1', numero: '15420', fornecedor: 'FRIGORIFICO SILVA LTDA', chave: '35260411111111111111550010000154201111111111', data: '2026-04-05' },
    { id: '2', numero: '88741', fornecedor: 'DISTRIBUIDORA DE CARNES SA', chave: '35260422222222222222550010000887412222222222', data: '2026-04-06' },
  ];

  const [visaoAtual, setVisaoAtual] = useState<'LISTA' | 'NOVA' | 'ENTRADA' | 'SAIDA'>('LISTA');
  const [abaNovaOP, setAbaNovaOP] = useState<'ENTRADA' | 'SAIDA'>('ENTRADA');
  const [opSelecionada, setOpSelecionada] = useState<IOP | null>(null);
  const [opEditandoId, setOpEditandoId] = useState<string | null>(null);

  // Formulário Entrada
  const [novoFluxo, setNovoFluxo] = useState<'REAL' | 'ESTIMADO'>('REAL');
  const [dataAbertura, setDataAbertura] = useState(new Date().toISOString().split('T')[0]);
  const [dataAbate, setDataAbate] = useState('');
  const [dataProducao, setDataProducao] = useState('');
  const [lote, setLote] = useState('');
  const [notaFiscal, setNotaFiscal] = useState('');
  const [observacao, setObservacao] = useState('');
  const [produtoOrigemId, setProdutoOrigemId] = useState('');
  const [qtdPecasPrevista, setQtdPecasPrevista] = useState('');
  const [qtdPrevistaKg, setQtdPrevistaKg] = useState('');
  const [custoMateriaPrima, setCustoMateriaPrima] = useState(0);
  const [origemCusto, setOrigemCusto] = useState<'NF' | 'MEDIO' | 'NENHUM'>('NENHUM');

  // Formulário Saída
  const [itensDestinoForm, setItensDestinoForm] = useState<IItemDestinoForm[]>([]);
  const [salvando, setSalvando] = useState(false);

  // Pesagem
  const [pesoBalança, setPesoBalança] = useState('');
  const [produtoDestinoId, setProdutoDestinoId] = useState('');

  // ==========================================
  // FUNÇÕES AUXILIARES
  // ==========================================
  const toNumber = (value: unknown): number => {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  };

  const formatNumber = (value: unknown, casas: number = 3): string => {
    return toNumber(value).toFixed(casas);
  };

  // ==========================================
  // EFEITOS E BUSCAS
  // ==========================================
  useEffect(() => {
    carregarDados();
    carregarLayoutsMock();
  }, []);

  const carregarLayoutsMock = () => {
    setLayoutsEtiqueta([
      { id: '1', nome: 'Padrão Balança (Gôndola)', tipo: 'INTERNA' },
      { id: '2', nome: 'Etiqueta Simples (Sem EAN)', tipo: 'INTERNA' },
      { id: '3', nome: 'Caixa de Embarque (EAN-14)', tipo: 'EXTERNA' },
      { id: '4', nome: 'Etiqueta de Lote (Câmara Fria)', tipo: 'EXTERNA' },
    ]);
  };

  const carregarDados = async () => {
    setLoading(true);
    try {
      const [resOPs, resProd, resEstacoes] = await Promise.all([
        api.get<IOP[]>('/api/producao/op').catch(() => ({ data: [] })),
        api.get<IProduto[]>('/api/produtos'),
        api.get('/api/estacoes-trabalho').catch(() => ({ data: { data: [] as EstacaoTrabalho[] } }))
      ]);
      setOps(resOPs.data);
      const estPayload = resEstacoes.data as unknown;
      const listaEst: EstacaoTrabalho[] = Array.isArray(estPayload)
        ? estPayload
        : estPayload &&
            typeof estPayload === 'object' &&
            estPayload !== null &&
            'data' in estPayload &&
            Array.isArray((estPayload as { data: EstacaoTrabalho[] }).data)
          ? (estPayload as { data: EstacaoTrabalho[] }).data
          : [];
      setEstacoes(listaEst);

      if (listaEst.length > 0 && !estacaoSelecionada) {
        setEstacaoSelecionada(listaEst[0].id);
      }

      const produtosComPeso = resProd.data.map(p => ({
        ...p,
        dadosProducao: p.dadosProducao || { pesoMedioPeca: 25.5 }
      }));
      setProdutos(produtosComPeso);
    } catch (error) {
      console.error('Erro ao carregar dados', error);
    } finally {
      setLoading(false);
    }
  };

  // 🔥 CONEXÃO COM O AGENTE C# DA BALANÇA
  useEffect(() => {
    if (visaoAtual !== 'SAIDA') return;

    const ws = new WebSocket('ws://localhost:8080');
    
    ws.onopen = () => setBalancaConectada(true);
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.peso !== undefined) {
          setPesoRealTime(data.peso);
          setPesoBalança(data.peso.toString()); 
        }
      } catch (e) {
        console.error('Erro ao ler dados da balança', e);
      }
    };

    ws.onclose = () => setBalancaConectada(false);

    return () => {
      ws.close();
    };
  }, [visaoAtual]);

  const buscarCustoDinamico = async (produtoId: string, nf: string, qtdKg: number) => {
    try {
      if (nf.trim().length > 3) {
        const prod = produtos.find(p => p.id === produtoId);
        setCustoMateriaPrima(toNumber(prod?.precoCusto) * qtdKg);
        setOrigemCusto('NF');
      } else {
        const prod = produtos.find(p => p.id === produtoId);
        const custoBase = toNumber(prod?.precoCusto);
        setCustoMateriaPrima((custoBase > 0 ? custoBase * 1.05 : 0) * qtdKg);
        setOrigemCusto('MEDIO');
      }
    } catch (error) {
      console.error('Erro ao buscar custo dinâmico', error);
      setOrigemCusto('NENHUM');
    }
  };

  useEffect(() => {
    if (produtoOrigemId && qtdPrevistaKg) {
      buscarCustoDinamico(produtoOrigemId, notaFiscal, parseFloat(qtdPrevistaKg));
    } else {
      setCustoMateriaPrima(0);
      setOrigemCusto('NENHUM');
    }
  }, [produtoOrigemId, qtdPrevistaKg, notaFiscal, produtos]);

  // ==========================================
  // MANIPULADORES GERAIS DA OP
  // ==========================================
  const limparFormulario = () => {
    setOpEditandoId(null);
    setNovoFluxo('REAL');
    setDataAbertura(new Date().toISOString().split('T')[0]);
    setDataAbate('');
    setDataProducao('');
    setLote('');
    setNotaFiscal('');
    setObservacao('');
    setProdutoOrigemId('');
    setQtdPecasPrevista('');
    setQtdPrevistaKg('');
    setItensDestinoForm([]);
    setCustoMateriaPrima(0);
    setOrigemCusto('NENHUM');
    setAbaNovaOP('ENTRADA');
  };

  const handleExcluirOP = async (id: string) => {
    if (!window.confirm('🚨 ATENÇÃO: Deseja realmente excluir esta Ordem de Produção definitivamente?')) return;
    try {
      await api.delete(`/api/producao/op/${id}`);
      alert('✅ OP excluída com sucesso!');
      carregarDados();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erro ao excluir OP.');
    }
  };

  const handleMudarStatusOP = async (id: string, novoStatus: 'PAUSADA' | 'CANCELADA' | 'EM_PROCESSAMENTO' | 'CONCLUIDA') => {
    const acao = novoStatus === 'PAUSADA' ? 'Pausar' : novoStatus === 'CANCELADA' ? 'Cancelar' : novoStatus === 'CONCLUIDA' ? 'Concluir' : 'Retomar';
    if (!window.confirm(`Deseja realmente ${acao} esta Ordem de Produção?`)) return;
    try {
      await api.patch(`/api/producao/op/${id}/status`, { status: novoStatus });
      alert(`✅ OP ${novoStatus} com sucesso!`);
      carregarDados();
      if (novoStatus === 'CONCLUIDA') {
        setVisaoAtual('LISTA');
      }
    } catch (err: any) {
      alert(err.response?.data?.error || `Erro ao ${acao} OP.`);
    }
  };

  const handleEditarOP = (op: IOP) => {
    setOpEditandoId(op.id);
    setNovoFluxo(op.tipoFluxo);
    setDataAbertura(op.dataAbertura ? op.dataAbertura.split('T')[0] : '');
    setDataAbate(op.dataAbate ? op.dataAbate.split('T')[0] : '');
    setDataProducao(op.dataProducao ? op.dataProducao.split('T')[0] : '');
    setLote(op.lote || '');
    setNotaFiscal(op.notaFiscal || '');
    setObservacao(op.observacao || '');

    if (op.itensOrigem.length > 0) {
      setProdutoOrigemId(op.itensOrigem[0].produtoId);
      setQtdPecasPrevista(op.itensOrigem[0].quantidadePecasPrevista?.toString() || '');
      setQtdPrevistaKg(op.itensOrigem[0].quantidadeKgPrevista?.toString() || '');
    }

    const itensDestinoFormatados = op.itensDestino.map((item, index) => ({
      idTemp: `edit_${index}`,
      produtoId: item.produtoId,
      quantidadePecas: item.quantidadePecas?.toString() || '',
      quantidadeEsperada: item.quantidadeEsperada?.toString() || '',
      vaiProduzir: item.vaiProduzir,
      layoutInternoId: '', 
      layoutExternoId: ''
    }));
    setItensDestinoForm(itensDestinoFormatados);

    setVisaoAtual('NOVA');
    setAbaNovaOP('ENTRADA');
  };

  // ==========================================
  // MANIPULADORES DO FORMULÁRIO DE ITENS
  // ==========================================
  const handlePecasOrigemChange = (val: string) => {
    setQtdPecasPrevista(val);

    if (produtoOrigemId && val) {
      const prod = produtos.find(p => p.id === produtoOrigemId);
      const pesoMedio = prod?.dadosProducao?.pesoMedioPeca || 0;
      if (pesoMedio > 0) {
        setQtdPrevistaKg(formatNumber(parseInt(val) * pesoMedio));
      }
    }

    setItensDestinoForm(prev => prev.map(item => {
      const novaQtdPecas = val;
      let novaQtdEsperada = item.quantidadeEsperada;

      if (item.produtoId && novaQtdPecas) {
        const prodDestino = produtos.find(p => p.id === item.produtoId);
        const pesoMedioDestino = prodDestino?.dadosProducao?.pesoMedioPeca || 0;
        if (pesoMedioDestino > 0) {
          novaQtdEsperada = formatNumber(parseInt(novaQtdPecas) * pesoMedioDestino);
        }
      }

      return { ...item, quantidadePecas: novaQtdPecas, quantidadeEsperada: novaQtdEsperada };
    }));
  };

  const handleProdutoOrigemChange = (val: string) => {
    setProdutoOrigemId(val);
    if (qtdPecasPrevista && val) {
      const prod = produtos.find(p => p.id === val);
      const pesoMedio = prod?.dadosProducao?.pesoMedioPeca || 0;
      if (pesoMedio > 0) {
        setQtdPrevistaKg(formatNumber(parseInt(qtdPecasPrevista) * pesoMedio));
      }
    }
  };

  const adicionarItemDestino = () => {
    setItensDestinoForm([...itensDestinoForm, {
      idTemp: Date.now().toString(),
      produtoId: '',
      quantidadePecas: qtdPecasPrevista || '',
      quantidadeEsperada: '',
      vaiProduzir: true,
      layoutInternoId: '',
      layoutExternoId: ''
    }]);
  };

  const removerItemDestino = (idTemp: string) => {
    setItensDestinoForm(itensDestinoForm.filter(item => item.idTemp !== idTemp));
  };

  const atualizarItemDestino = (idTemp: string, campo: keyof IItemDestinoForm, valor: any) => {
    setItensDestinoForm(itensDestinoForm.map(item => {
      if (item.idTemp === idTemp) {
        const newItem = { ...item, [campo]: valor };
        if (campo === 'quantidadePecas' && newItem.produtoId && valor) {
          const prod = produtos.find(p => p.id === newItem.produtoId);
          const pesoMedio = prod?.dadosProducao?.pesoMedioPeca || 0;
          if (pesoMedio > 0) newItem.quantidadeEsperada = formatNumber(parseInt(valor) * pesoMedio);
        }
        if (campo === 'produtoId' && newItem.quantidadePecas && valor) {
          const prod = produtos.find(p => p.id === valor);
          const pesoMedio = prod?.dadosProducao?.pesoMedioPeca || 0;
          if (pesoMedio > 0) newItem.quantidadeEsperada = formatNumber(parseInt(newItem.quantidadePecas) * pesoMedio);
        }
        return newItem;
      }
      return item;
    }));
  };

  // ==========================================
  // BUSCA E MODAL (F2)
  // ==========================================
  const abrirModalBusca = (tipo: 'NF' | 'PRODUTO_ORIGEM' | 'PRODUTO_DESTINO', idTemp?: string) => {
    setModalBusca({ ativo: true, tipo, idTemp });
    setTermoBusca('');
  };

  const handleKeyDownF2 = (e: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement>, tipo: 'NF' | 'PRODUTO_ORIGEM' | 'PRODUTO_DESTINO', idTemp?: string) => {
    if (e.key === 'F2') {
      e.preventDefault();
      abrirModalBusca(tipo, idTemp);
    }
  };

  const selecionarBusca = (id: string, extraData?: any) => {
    if (modalBusca.tipo === 'NF') {
      setNotaFiscal(extraData.numero);
    } else if (modalBusca.tipo === 'PRODUTO_ORIGEM') {
      handleProdutoOrigemChange(id);
    } else if (modalBusca.tipo === 'PRODUTO_DESTINO' && modalBusca.idTemp) {
      atualizarItemDestino(modalBusca.idTemp, 'produtoId', id);
    }
    setModalBusca({ ativo: false, tipo: 'NF' });
    setTermoBusca('');
  };

  const produtosFiltrados = produtos.filter(p => p.nome.toLowerCase().includes(termoBusca.toLowerCase()) || p.codigo.includes(termoBusca));
  const notasFiltradas = notasFiscaisMock.filter(n => n.numero.includes(termoBusca) || n.fornecedor.toLowerCase().includes(termoBusca.toLowerCase()) || n.chave.includes(termoBusca));

  // ==========================================
  // AÇÕES FINAIS
  // ==========================================
  const handleSalvarOP = async () => {
    if (!produtoOrigemId || !qtdPrevistaKg) {
      alert('Volte na Aba 1 e preencha a matéria prima e a quantidade (KG) prevista.');
      return;
    }

    const itensDestinoValidos = itensDestinoForm.filter(item => item.produtoId && item.produtoId.trim() !== '');

    setSalvando(true);
    try {
      const payload = {
        tipoFluxo: novoFluxo,
        dataAbertura: dataAbertura ? new Date(dataAbertura).toISOString() : new Date().toISOString(),
        dataAbate: dataAbate ? new Date(dataAbate).toISOString() : undefined,
        dataProducao: dataProducao ? new Date(dataProducao).toISOString() : undefined,
        lote,
        notaFiscal,
        observacao,
        itensOrigem: [{
          produtoId: produtoOrigemId,
          quantidadePecasPrevista: parseInt(qtdPecasPrevista) || null,
          quantidadeKgPrevista: parseFloat(qtdPrevistaKg),
          custoUnitario: custoMateriaPrima / parseFloat(qtdPrevistaKg)
        }],
        itensDestino: itensDestinoValidos.map(item => ({
          produtoId: item.produtoId,
          quantidadePecas: parseInt(item.quantidadePecas) || null,
          quantidadeEsperada: parseFloat(item.quantidadeEsperada) || 0,
          vaiProduzir: item.vaiProduzir,
          layoutEtiquetaId: item.layoutInternoId || null 
        }))
      };

      if (opEditandoId) {
        await api.put(`/api/producao/op/${opEditandoId}`, payload);
        alert('✅ Ordem de Produção atualizada com sucesso!');
      } else {
        await api.post('/api/producao/op', payload);
        alert('✅ Ordem de Produção programada com sucesso!');
      }

      limparFormulario();
      setVisaoAtual('LISTA');
      carregarDados();
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.error || 'Erro ao salvar OP. Verifique o console (F12).');
    } finally {
      setSalvando(false);
    }
  };

  const handleIniciarProcessamento = async (opId: string) => {
    if (!window.confirm('Isso irá iniciar a OP. Confirmar?')) return;
    try {
      await api.post(`/api/producao/op/${opId}/iniciar`);
      alert('🔥 Produção Iniciada! A OP já está disponível para pesagem.');
      carregarDados();
      setVisaoAtual('LISTA');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erro ao iniciar OP.');
    }
  };

  const handleApontarPesagem = async () => {
    if (!opSelecionada || !produtoDestinoId || !pesoBalança) {
      alert('Preencha o produto e o peso lido na balança.');
      return;
    }
    if (!estacaoSelecionada) {
      alert('Selecione uma Estação de Trabalho para imprimir a etiqueta!');
      return;
    }
    
    setImprimindo(true);
    try {
      await api.post(`/api/producao/op/${opSelecionada.id}/pesagem`, { 
        produtoId: produtoDestinoId, 
        peso: parseFloat(pesoBalança), 
        tipo: 'SAIDA',
        estacaoTrabalhoId: estacaoSelecionada 
      });
      
      alert('✅ Peso registrado, Estoque atualizado e Etiqueta enviada para Impressão!');
      setPesoBalança('');
      carregarDados();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erro ao registrar pesagem.');
    } finally {
      setImprimindo(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PROGRAMADA': return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'EM_PROCESSAMENTO': return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'PAUSADA': return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
      case 'CONCLUIDA': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'CANCELADA': return 'bg-red-500/10 text-red-400 border-red-500/30';
      default: return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
    }
  };

  const inputClass = 'w-full bg-[#0b1324] border border-white/10 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 transition-all placeholder:text-slate-500';
  const labelClass = 'block text-[11px] font-bold text-slate-400 uppercase tracking-[0.16em] mb-2 pl-1';

  return (
    <Layout>
      {modalBusca.ativo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-[#08101f] border border-violet-500/30 rounded-[30px] shadow-[0_25px_80px_rgba(0,0,0,0.6)] w-full max-w-2xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
              <h3 className="text-xl font-black text-white flex items-center gap-3">
                <Search className="text-violet-400" />
                {modalBusca.tipo === 'NF' ? 'Buscar Nota Fiscal' : 'Buscar Produto'}
              </h3>
              <button onClick={() => setModalBusca({ ativo: false, tipo: 'NF' })} className="text-slate-400 hover:text-red-400 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6">
              <input type="text" autoFocus value={termoBusca} onChange={e => setTermoBusca(e.target.value)} placeholder="Digite para pesquisar..." className={inputClass} />
            </div>
            <div className="flex-1 overflow-y-auto p-6 pt-0 space-y-2 custom-scrollbar">
              {modalBusca.tipo === 'NF' ? (
                notasFiltradas.map(nf => (
                  <div key={nf.id} onClick={() => selecionarBusca(nf.id, nf)} className="p-4 rounded-xl border border-white/5 hover:border-violet-500/30 hover:bg-violet-500/10 cursor-pointer transition-all flex justify-between items-center">
                    <div>
                      <p className="text-white font-bold">NF: {nf.numero}</p>
                      <p className="text-xs text-slate-400">{nf.fornecedor}</p>
                    </div>
                    <span className="text-xs font-mono text-slate-500">{nf.chave}</span>
                  </div>
                ))
              ) : (
                produtosFiltrados.map(p => (
                  <div key={p.id} onClick={() => selecionarBusca(p.id, p)} className="p-4 rounded-xl border border-white/5 hover:border-violet-500/30 hover:bg-violet-500/10 cursor-pointer transition-all flex justify-between items-center">
                    <div>
                      <p className="text-white font-bold">{p.codigo} - {p.nome}</p>
                      <p className="text-xs text-slate-400">Custo: R$ {formatNumber(p.precoCusto, 2)}</p>
                    </div>
                    {p.dadosProducao?.pesoMedioPeca && (
                      <span className="text-xs bg-emerald-500/20 text-emerald-300 px-2 py-1 rounded-md">Peso Médio: {p.dadosProducao.pesoMedioPeca}kg</span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-7xl space-y-6 pb-12 animate-[fadeIn_0.5s_ease-out]">
        <div className="flex flex-col justify-between gap-6 rounded-[30px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(139,92,246,0.16),_transparent_26%),linear-gradient(135deg,_#0b1020_0%,_#08101f_45%,_#0a1224_100%)] p-6 shadow-[0_25px_70px_rgba(0,0,0,0.40)] sm:flex-row sm:items-center sm:p-8 relative overflow-hidden">
          <div className="relative z-10">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-violet-300">
              <Scale className="h-3.5 w-3.5" /> Controle de Desossa
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-white flex items-center gap-4 tracking-tight">Ordens de Produção (OP)</h1>
            <p className="text-slate-400 mt-2 font-medium">Gerencie o rendimento, quebras e rastreabilidade das carnes.</p>
          </div>
          {visaoAtual === 'LISTA' && (
            <button onClick={() => setVisaoAtual('NOVA')} className="relative z-10 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 text-white px-8 py-4 rounded-2xl font-black transition-all flex items-center gap-3 shadow-[0_0_20px_rgba(139,92,246,0.4)] transform hover:scale-105">
              <Plus className="w-6 h-6" /> Nova Programação
            </button>
          )}
          {visaoAtual !== 'LISTA' && (
            <button onClick={() => { setVisaoAtual('LISTA'); limparFormulario(); }} className="relative z-10 bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 px-6 py-3.5 rounded-2xl font-bold transition-all flex items-center gap-2">
              <ChevronLeft className="w-5 h-5" /> Voltar ao Painel
            </button>
          )}
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 font-bold flex justify-center items-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-violet-300" /> Carregando Ordens de Produção...
          </div>
        ) : (
          <>
            {visaoAtual === 'LISTA' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {ops.map(op => (
                  <div key={op.id} className="bg-[#08101f]/90 backdrop-blur-xl rounded-[24px] border border-white/10 p-6 flex flex-col justify-between shadow-[0_20px_50px_rgba(0,0,0,0.30)] hover:border-violet-500/30 transition-all group relative overflow-hidden">

                    <div className="absolute top-4 right-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-[#08101f]/80 backdrop-blur-md p-1 rounded-xl border border-white/10">
                      {op.status === 'PROGRAMADA' && (
                        <button onClick={() => handleEditarOP(op)} className="p-2 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 rounded-lg transition-colors" title="Editar OP">
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}
                      {op.status === 'EM_PROCESSAMENTO' && (
                        <button onClick={() => handleMudarStatusOP(op.id, 'PAUSADA')} className="p-2 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 rounded-lg transition-colors" title="Pausar Produção">
                          <PauseCircle className="w-4 h-4" />
                        </button>
                      )}
                      {(op.status === 'PROGRAMADA' || op.status === 'PAUSADA') && (
                        <button onClick={() => handleMudarStatusOP(op.id, 'CANCELADA')} className="p-2 bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 rounded-lg transition-colors" title="Cancelar OP">
                          <Ban className="w-4 h-4" />
                        </button>
                      )}
                      {(op.status === 'PROGRAMADA' || op.status === 'CANCELADA') && (
                        <button onClick={() => handleExcluirOP(op.id)} className="p-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors" title="Excluir OP do Banco">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div>
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <span className="text-slate-500 font-mono text-xs font-bold">OP #{op.codigoOP}</span>
                          <h3 className="text-white font-black text-xl mt-1 pr-24">
                            {op.itensOrigem[0]?.produto?.nome || 'Matéria Prima Indefinida'}
                          </h3>
                        </div>
                      </div>

                      <div className="mb-4">
                        <span className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider border ${getStatusColor(op.status)}`}>
                          {op.status.replace('_', ' ')}
                        </span>
                      </div>

                      <div className="space-y-2 mb-6">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-400">Qtd Peças:</span>
                          <span className="text-white font-bold">{op.itensOrigem[0]?.quantidadePecasPrevista || 0} PC</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-400">Peso Previsto:</span>
                          <span className="text-white font-bold">{formatNumber(op.itensOrigem[0]?.quantidadeKgPrevista)} KG</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-400">Lote:</span>
                          <span className="text-white font-mono">{op.lote || '-'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {op.status === 'PROGRAMADA' && (
                        <button onClick={() => { setOpSelecionada(op); setVisaoAtual('ENTRADA'); }} className="flex-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 py-3 rounded-xl font-bold flex justify-center items-center gap-2 transition-colors">
                          <Play className="w-4 h-4" /> Iniciar
                        </button>
                      )}

                      {op.status === 'EM_PROCESSAMENTO' && (
                        <button onClick={() => { setOpSelecionada(op); setVisaoAtual('SAIDA'); }} className="flex-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 py-3 rounded-xl font-bold flex justify-center items-center gap-2 transition-colors">
                          <Scale className="w-4 h-4" /> Apontar Saída
                        </button>
                      )}

                      {op.status === 'PAUSADA' && (
                        <button onClick={() => handleMudarStatusOP(op.id, 'EM_PROCESSAMENTO')} className="flex-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 py-3 rounded-xl font-bold flex justify-center items-center gap-2 transition-colors">
                          <Play className="w-4 h-4" /> Retomar
                        </button>
                      )}

                      {(op.status === 'CONCLUIDA' || op.status === 'CANCELADA') && (
                        <button onClick={() => alert('Visualizar Detalhes')} className="flex-1 bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 py-3 rounded-xl font-bold flex justify-center items-center gap-2 transition-colors">
                          <Search className="w-4 h-4" /> Ver Detalhes
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {ops.length === 0 && (
                  <div className="col-span-full py-12 text-center border border-dashed border-white/10 rounded-[30px] bg-white/5">
                    <ClipboardList className="w-12 h-12 text-slate-500 mx-auto mb-3" />
                    <h3 className="text-xl font-black text-white">Nenhuma OP encontrada</h3>
                    <p className="text-slate-400">Clique em "Nova Programação" para planejar uma desossa.</p>
                  </div>
                )}
              </div>
            )}

            {visaoAtual === 'NOVA' && (
              <div className="bg-[#08101f]/90 backdrop-blur-xl rounded-[30px] border border-white/10 p-8 shadow-[0_25px_60px_rgba(0,0,0,0.35)] max-w-6xl mx-auto">
                <h2 className="text-2xl font-black text-white mb-6 flex items-center gap-3">
                  <ClipboardList className="text-violet-400" /> {opEditandoId ? 'Editar Programação de OP' : 'Programar Nova OP'}
                </h2>

                <div className="flex gap-2 p-1.5 bg-[#0b1324] rounded-2xl border border-white/10 w-fit mb-8">
                  <button onClick={() => setAbaNovaOP('ENTRADA')} className={`px-6 py-3 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${abaNovaOP === 'ENTRADA' ? 'bg-violet-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                    <Package className="w-4 h-4" /> 1. Rastreabilidade e Matéria Prima
                  </button>
                  <button onClick={() => setAbaNovaOP('SAIDA')} className={`px-6 py-3 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${abaNovaOP === 'SAIDA' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                    <Scale className="w-4 h-4" /> 2. Produtos Gerados (Saída)
                  </button>
                </div>

                {abaNovaOP === 'ENTRADA' && (
                  <div className="space-y-8 animate-[fadeIn_0.3s_ease-out]">
                    <div className="bg-[#0b1324]/50 border border-white/10 p-6 rounded-2xl">
                      <h3 className="text-lg font-bold text-white mb-5 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-slate-400" /> Dados de Rastreabilidade (Opcional)
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                        <div className="flex flex-col justify-end">
                          <label className={labelClass}><Calendar className="inline w-3.5 h-3.5 mr-1" /> Data da OP</label>
                          <input type="date" value={dataAbertura} onChange={e => setDataAbertura(e.target.value)} className={inputClass} />
                        </div>
                        <div className="flex flex-col justify-end">
                          <label className={labelClass}><Calendar className="inline w-3.5 h-3.5 mr-1" /> Data do Abate</label>
                          <input type="date" value={dataAbate} onChange={e => setDataAbate(e.target.value)} className={inputClass} />
                        </div>
                        <div className="flex flex-col justify-end">
                          <label className={labelClass}><Calendar className="inline w-3.5 h-3.5 mr-1" /> Data de Produção</label>
                          <input type="date" value={dataProducao} onChange={e => setDataProducao(e.target.value)} className={inputClass} />
                        </div>
                        <div className="flex flex-col justify-end">
                          <label className={labelClass}><Hash className="inline w-3.5 h-3.5 mr-1" /> Lote Original</label>
                          <input type="text" value={lote} onChange={e => setLote(e.target.value.toUpperCase())} className={`${inputClass} uppercase`} placeholder="Ex: LOTE-001" />
                        </div>
                        <div className="md:col-span-4 relative flex flex-col justify-end">
                          <label className={labelClass}>
                            <FileDigit className="inline w-3.5 h-3.5 mr-1" /> Nota Fiscal de Recebimento (Compra)
                            <span className="ml-2 text-[9px] bg-violet-500/20 text-violet-300 px-2 py-0.5 rounded-md border border-violet-500/30">F2 BUSCAR</span>
                          </label>
                          <div className="relative">
                            <Search className="absolute left-4 top-4 text-violet-400 w-5 h-5 cursor-pointer" onClick={() => abrirModalBusca('NF')} />
                            <input type="text" value={notaFiscal} onChange={e => setNotaFiscal(e.target.value)} onKeyDown={e => handleKeyDownF2(e, 'NF')} className={`${inputClass} pl-12`} placeholder="Digite o número da NF ou pressione F2..." />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-[#0b1324]/50 border border-white/10 p-6 rounded-2xl border-l-4 border-l-amber-500 relative overflow-hidden">
                      <div className="absolute right-6 top-6 text-right">
                        <div className="flex flex-col items-end gap-1 mb-1">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Custo da Matéria Prima</span>
                          {origemCusto === 'NF' && <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30">CUSTO EXATO DA NF</span>}
                          {origemCusto === 'MEDIO' && <span className="text-[9px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded border border-amber-500/30">CUSTO MÉDIO DINÂMICO</span>}
                        </div>
                        <span className="text-2xl font-black text-amber-400 flex items-center justify-end gap-1">
                          <DollarSign className="w-5 h-5 opacity-50" />
                          {custoMateriaPrima > 0 ? custoMateriaPrima.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '---'}
                        </span>
                      </div>

                      <h3 className="text-lg font-bold text-white mb-5 flex items-center gap-2">
                        <Package className="w-5 h-5 text-amber-400" /> Matéria Prima (Entrada)
                      </h3>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mt-8">
                        <div className="md:col-span-2 relative flex flex-col justify-end">
                          <label className={labelClass}>
                            Produto a Desossar *
                            <span className="ml-2 text-[9px] bg-violet-500/20 text-violet-300 px-2 py-0.5 rounded-md border border-violet-500/30">F2 BUSCAR</span>
                          </label>
                          <div className="relative">
                            <Search className="absolute left-4 top-4 text-violet-400 w-5 h-5 cursor-pointer" onClick={() => abrirModalBusca('PRODUTO_ORIGEM')} />
                            <input type="text" readOnly value={produtos.find(p => p.id === produtoOrigemId)?.nome || ''} onClick={() => abrirModalBusca('PRODUTO_ORIGEM')} onKeyDown={e => handleKeyDownF2(e, 'PRODUTO_ORIGEM')} className={`${inputClass} pl-12 cursor-pointer`} placeholder="Pressione F2 ou clique para buscar..." />
                          </div>
                        </div>
                        <div className="flex flex-col justify-end">
                          <label className={labelClass}>Qtd Peças</label>
                          <input type="number" value={qtdPecasPrevista} onChange={e => handlePecasOrigemChange(e.target.value)} className={inputClass} placeholder="Ex: 2" />
                        </div>
                        <div className="flex flex-col justify-end">
                          <label className={labelClass}>Peso Total (KG) *</label>
                          <input type="number" step="0.001" value={qtdPrevistaKg} onChange={e => setQtdPrevistaKg(e.target.value)} className={inputClass} placeholder="Ex: 150.000" />
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end pt-4">
                      <button onClick={() => setAbaNovaOP('SAIDA')} className="bg-violet-600 hover:bg-violet-500 text-white px-8 py-4 rounded-2xl font-black transition-all flex items-center gap-3">
                        Avançar para Passo 2 <ArrowRight className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                )}

                {abaNovaOP === 'SAIDA' && (
                  <div className="space-y-8 animate-[fadeIn_0.3s_ease-out]">
                    <div className="bg-[#0b1324]/50 border border-white/10 p-6 rounded-2xl border-l-4 border-l-emerald-500">
                      <div className="flex justify-between items-center mb-5">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                          <Scale className="w-5 h-5 text-emerald-400" /> Produtos Acabados (Saída)
                        </h3>
                        <button onClick={adicionarItemDestino} className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-4 py-2 rounded-xl text-sm font-bold hover:bg-emerald-500/20 transition-all flex items-center gap-2">
                          <Plus className="w-4 h-4" /> Adicionar Produto
                        </button>
                      </div>

                      {itensDestinoForm.length === 0 ? (
                        <div className="text-center py-6 text-slate-500 text-sm border border-dashed border-white/10 rounded-xl">
                          Nenhum produto de saída configurado. Clique em "Adicionar Produto" para montar a grade de cortes.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="hidden lg:flex gap-3 px-3 pb-2 border-b border-white/5">
                            <div className="w-[25%]"><span className={labelClass}>Produto Gerado</span></div>
                            <div className="w-[10%]"><span className={labelClass}>Peças</span></div>
                            <div className="w-[15%]"><span className={labelClass}>Peso (KG)</span></div>
                            <div className="w-[20%]"><span className={labelClass}>Etiqueta Interna</span></div>
                            <div className="w-[20%]"><span className={labelClass}>Etiqueta Externa</span></div>
                            <div className="w-[10%] text-center"><span className={labelClass}>Ação</span></div>
                          </div>

                          {itensDestinoForm.map((item) => (
                            <div key={item.idTemp} className="flex flex-col lg:flex-row items-start lg:items-center gap-3 bg-[#08101f] p-3 rounded-xl border border-white/5">
                              <div className="w-full lg:w-[25%] relative">
                                <input type="text" readOnly value={produtos.find(p => p.id === item.produtoId)?.nome || ''} onClick={() => abrirModalBusca('PRODUTO_DESTINO', item.idTemp)} onKeyDown={e => handleKeyDownF2(e, 'PRODUTO_DESTINO', item.idTemp)} className={`${inputClass} text-sm py-2.5 cursor-pointer`} placeholder="F2 para buscar..." />
                              </div>
                              <div className="w-full lg:w-[10%]">
                                <input type="number" placeholder="PC" value={item.quantidadePecas} onChange={e => atualizarItemDestino(item.idTemp, 'quantidadePecas', e.target.value)} className={`${inputClass} text-sm py-2.5`} />
                              </div>
                              <div className="w-full lg:w-[15%]">
                                <input type="number" step="0.001" placeholder="KG" value={item.quantidadeEsperada} onChange={e => atualizarItemDestino(item.idTemp, 'quantidadeEsperada', e.target.value)} className={`${inputClass} text-sm py-2.5`} />
                              </div>
                              <div className="w-full lg:w-[20%]">
                                <div className="flex items-center gap-2">
                                  <Tag className="w-4 h-4 text-slate-500 shrink-0" />
                                  <select value={item.layoutInternoId} onChange={e => atualizarItemDestino(item.idTemp, 'layoutInternoId', e.target.value)} className={`${inputClass} text-sm py-2.5`}>
                                    <option value="">Selecione o Layout...</option>
                                    <option value="NENHUM">Não Imprimir Interna</option>
                                    {layoutsEtiqueta.filter(l => l.tipo === 'INTERNA').map(layout => <option key={layout.id} value={layout.id}>{layout.nome}</option>)}
                                  </select>
                                </div>
                              </div>
                              <div className="w-full lg:w-[20%]">
                                <div className="flex items-center gap-2">
                                  <Package className="w-4 h-4 text-slate-500 shrink-0" />
                                  <select value={item.layoutExternoId} onChange={e => atualizarItemDestino(item.idTemp, 'layoutExternoId', e.target.value)} className={`${inputClass} text-sm py-2.5`}>
                                    <option value="">Selecione o Layout...</option>
                                    <option value="NENHUM">Não Imprimir Externa</option>
                                    {layoutsEtiqueta.filter(l => l.tipo === 'EXTERNA').map(layout => <option key={layout.id} value={layout.id}>{layout.nome}</option>)}
                                  </select>
                                </div>
                              </div>
                              <div className="w-full lg:w-[10%] flex items-center justify-between lg:justify-center gap-2 mt-2 lg:mt-0">
                                <label className="flex items-center gap-2 cursor-pointer" title="Produzir este item?">
                                  <input type="checkbox" checked={item.vaiProduzir} onChange={e => atualizarItemDestino(item.idTemp, 'vaiProduzir', e.target.checked)} className="w-5 h-5 rounded border-white/20 bg-[#0b1324] text-emerald-500 focus:ring-emerald-500/30" />
                                </label>
                                <button onClick={() => removerItemDestino(item.idTemp)} className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors" title="Remover Produto">
                                  <Trash2 className="w-5 h-5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-[#0b1324]/30 p-6 rounded-2xl border border-white/5">
                      <div className="flex flex-col justify-end">
                        <label className={labelClass}>Tipo de Fluxo da OP *</label>
                        <select value={novoFluxo} onChange={e => setNovoFluxo(e.target.value as any)} className={inputClass}>
                          <option value="REAL">Real (Operador pesa tudo na balança)</option>
                          <option value="ESTIMADO">Estimado (Gera peso automático via Ficha Técnica)</option>
                        </select>
                      </div>
                      <div className="flex flex-col justify-end">
                        <label className={labelClass}>Observações da Produção</label>
                        <textarea value={observacao} onChange={e => setObservacao(e.target.value)} className={`${inputClass} min-h-[50px] resize-y`} placeholder="Instruções para o operador..." />
                      </div>
                    </div>

                    <div className="flex gap-4 pt-4">
                      <button onClick={() => setAbaNovaOP('ENTRADA')} className="bg-white/5 hover:bg-white/10 text-slate-300 px-8 py-4 rounded-2xl font-bold transition-all flex items-center gap-3">
                        <ChevronLeft className="w-5 h-5" /> Voltar
                      </button>
                      <button
                        onClick={handleSalvarOP}
                        disabled={salvando}
                        className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-500 text-white py-4 rounded-2xl font-black text-xl shadow-[0_0_30px_rgba(16,185,129,0.3)] hover:scale-[1.02] transition-all disabled:opacity-50 flex justify-center items-center gap-3"
                      >
                        {salvando ? <Loader2 className="w-7 h-7 animate-spin" /> : <CheckCircle2 className="w-7 h-7" />}
                        {opEditandoId ? 'Salvar Alterações' : 'Confirmar e Programar Produção'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {visaoAtual === 'ENTRADA' && opSelecionada && (
              <div className="bg-[#08101f]/90 backdrop-blur-xl rounded-[30px] border border-amber-500/30 p-8 shadow-[0_25px_60px_rgba(245,158,11,0.15)] max-w-2xl mx-auto text-center">
                <div className="w-24 h-24 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-amber-500/30">
                  <Play className="w-10 h-10 text-amber-400 ml-1" />
                </div>
                <h2 className="text-3xl font-black text-white mb-2">Iniciar Processamento</h2>
                <p className="text-slate-400 mb-8">OP #{opSelecionada.codigoOP} • {opSelecionada.itensOrigem[0]?.produto?.nome}</p>
                <div className="bg-[#0b1324] p-6 rounded-2xl border border-white/10 text-left mb-8">
                  <h4 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">Atenção Operador</h4>
                  <ul className="space-y-3 text-slate-300 font-medium">
                    <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-emerald-400" /> A OP ficará disponível para pesagem das bandejas.</li>
                    <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-emerald-400" /> A baixa de matéria prima será feita ao bipar a caixa.</li>
                  </ul>
                </div>
                <button onClick={() => handleIniciarProcessamento(opSelecionada.id)} className="w-full bg-amber-500 hover:bg-amber-400 text-slate-900 py-5 rounded-2xl font-black text-xl shadow-[0_0_30px_rgba(245,158,11,0.4)] hover:scale-[1.02] transition-all">
                  Confirmar e Iniciar Desossa
                </button>
              </div>
            )}

            {visaoAtual === 'SAIDA' && opSelecionada && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-[#08101f]/90 backdrop-blur-xl rounded-[30px] border border-emerald-500/30 p-8 shadow-[0_25px_60px_rgba(16,185,129,0.15)]">
                  <div className="flex justify-between items-center mb-4 pb-4 border-b border-white/10">
                    <div>
                      <h2 className="text-2xl font-black text-white flex items-center gap-3">
                        <Scale className="text-emerald-400" /> Estação de Pesagem
                      </h2>
                      <p className="text-emerald-400/70 font-mono mt-1">OP #{opSelecionada.codigoOP} EM ANDAMENTO</p>
                    </div>
                  </div>
                  {/* 🔥 SELEÇÃO DE ESTAÇÃO DE TRABALHO E STATUS DA BALANÇA */}
                  <div className="mb-6 bg-[#0b1324] p-4 rounded-xl border border-white/10 flex items-center gap-4">
                    <MonitorSmartphone className="text-violet-400 w-6 h-6" />
                    <div className="flex-1">
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Estação de Trabalho Atual</label>
                      <select 
                        value={estacaoSelecionada} 
                        onChange={e => setEstacaoSelecionada(e.target.value)} 
                        className="w-full bg-transparent text-white font-bold outline-none"
                      >
                        <option value="">Selecione sua estação...</option>
                        {estacoes.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
                      </select>
                    </div>
                    <div className="flex flex-col items-center gap-1 border-l border-white/10 pl-4" title={balancaConectada ? "Balança Conectada" : "Balança Desconectada"}>
                      {balancaConectada ? (
                        <>
                          <Wifi className="text-emerald-400 w-5 h-5" />
                          <span className="text-[9px] text-emerald-400 font-bold uppercase">Online</span>
                        </>
                      ) : (
                        <>
                          <WifiOff className="text-red-400 w-5 h-5" />
                          <span className="text-[9px] text-red-400 font-bold uppercase">Offline</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="space-y-8">
                    <div>
                      <label className="block text-sm font-black text-slate-400 uppercase tracking-widest mb-3">O que você está pesando agora?</label>
                      <div className="relative">
                        <select value={produtoDestinoId} onChange={e => setProdutoDestinoId(e.target.value)} className={`${inputClass} text-lg py-4`}>
                          <option value="">Selecione o produto na balança...</option>
                          {produtos.map(p => (
                            <option key={p.id} value={p.id}>{p.codigo} - {p.nome}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-black text-slate-400 uppercase tracking-widest mb-3">Peso Lido na Balança (KG)</label>
                      <div className="relative">
                        <input 
                          type="number" 
                          step="0.001" 
                          value={pesoBalança} 
                          onChange={e => setPesoBalança(e.target.value)} 
                          className={`${inputClass} text-4xl font-black py-6 text-emerald-400 font-mono`} 
                          placeholder="0.000" 
                          autoFocus 
                        />
                        <span className="absolute right-6 top-1/2 -translate-y-1/2 text-2xl font-black text-slate-600">KG</span>
                      </div>
                    </div>
                    <button 
                      onClick={handleApontarPesagem} 
                      disabled={imprimindo}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-5 rounded-2xl font-black text-xl shadow-[0_0_30px_rgba(16,185,129,0.4)] hover:scale-[1.02] transition-all flex justify-center items-center gap-3 disabled:opacity-50"
                    >
                      {imprimindo ? <Loader2 className="w-7 h-7 animate-spin" /> : <CheckCircle2 className="w-7 h-7" />}
                      {imprimindo ? 'Imprimindo Etiqueta...' : 'Registrar Peso e Gerar Etiqueta'}
                    </button>
                  </div>
                </div>
                <div className="bg-[#0b1324] rounded-[30px] border border-white/10 p-6 flex flex-col">
                  <h3 className="text-lg font-black text-white mb-6 border-b border-white/10 pb-4">Resumo da Produção</h3>
                  <div className="space-y-4 flex-1">
                    <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                      <span className="text-xs text-slate-500 font-bold uppercase block mb-1">Entrada Original</span>
                      <span className="text-lg text-white font-black">{formatNumber(opSelecionada.itensOrigem[0]?.quantidadeKgPrevista)} KG</span>
                      <span className="text-sm text-slate-400 block">{opSelecionada.itensOrigem[0]?.produto?.nome}</span>
                    </div>
                    <div className="bg-emerald-500/10 p-4 rounded-xl border border-emerald-500/20">
                      <span className="text-xs text-emerald-500 font-bold uppercase block mb-1">Total Já Pesado (Saída)</span>
                      <span className="text-2xl text-emerald-400 font-black">
                        0.000 KG
                      </span>
                      <span className="text-sm text-emerald-400/70 block">Rendimento Parcial: 0%</span>
                    </div>
                  </div>
                  <button onClick={() => handleMudarStatusOP(opSelecionada.id, 'CONCLUIDA')} className="w-full mt-6 bg-slate-800 hover:bg-slate-700 text-white py-4 rounded-xl font-bold transition-colors">
                    Finalizar e Apurar Custos
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
                  