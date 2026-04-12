import React, { useState, useEffect, useRef } from 'react';
import { Layout } from '../../../components/Layout';
import { api } from '../../../services/api';
import {
  Scale, Barcode, Keyboard, Printer, CheckCircle2,
  AlertTriangle, Search, Package, ArrowRight, X, Loader2, Play, Zap, ClipboardList, Trash2, Calendar, LockOpen, Lock, Wifi, WifiOff, MonitorSmartphone
} from 'lucide-react';

interface IProduto {
  id: string;
  nome: string;
  codigo: string;
  codigoBarras?: string;
  ean?: string;
  [key: string]: any;
}

interface IApontamento {
  id: string;
  peso: number;
  tipo: 'ENTRADA' | 'SAIDA';
  quantidadePecas?: number;
  createdAt: string;
  produto: IProduto;
}

interface IOP {
  id: string;
  codigoOP: number;
  status: string;
  dataAbate?: string;
  dataProducao?: string;
  observacao?: string;
  itensOrigem: { produtoId: string, produto: IProduto, quantidadeKgPrevista: number }[];
  itensDestino: { produtoId: string, produto: IProduto, quantidadeEsperada: number }[];
  apontamentosPesagem?: IApontamento[];
}

interface IPesagemRealizada {
  id: string;
  produtoNome: string;
  peso: number;
  pecas?: number;
  hora: string;
  timestamp: number;
  tipo: 'ENTRADA' | 'SAIDA';
  validade?: string;
}

// ✅ NOVA INTERFACE: Estação de Trabalho
interface IEstacaoTrabalho {
  id: string;
  nome: string;
  usarImpressoraPadrao: boolean;
  nomeImpressora?: string;
  layoutEtiquetaId?: string;
  balancaId?: string;
}

type ModoEntrada = 'MANUAL' | 'BALANCA' | 'BIPADOR_PESO' | 'AUTO';

export function PesagemProducao() {
  const [ops, setOps] = useState<IOP[]>([]);
  const [opSelecionada, setOpSelecionada] = useState<IOP | null>(null);
  const [loading, setLoading] = useState(true);

  // ✅ ESTADO DA ESTAÇÃO DE TRABALHO
  const [estacaoAtual, setEstacaoAtual] = useState<IEstacaoTrabalho | null>(null);
  const [loadingEstacao, setLoadingEstacao] = useState(true);

  const [modoEntrada, setModoEntrada] = useState<ModoEntrada>('MANUAL');
  const [tipoPesagem, setTipoPesagem] = useState<'ENTRADA' | 'SAIDA'>('ENTRADA');
  const [produtoSelecionadoId, setProdutoSelecionadoId] = useState('');
  const [pesoLido, setPesoLido] = useState('');
  const [quantidadePecas, setQuantidadePecas] = useState('');
  const [codigoBarrasLido, setCodigoBarrasLido] = useState('');
  const [lendoBalancaAuto, setLendoBalancaAuto] = useState(false);

  const [pesagensSessao, setPesagensSessao] = useState<IPesagemRealizada[]>([]);
  const [alertaPeso, setAlertaPeso] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const [manualEntradaFechada, setManualEntradaFechada] = useState(false);
  const [manualSaidaFechada, setManualSaidaFechada] = useState(false);

  const [pesoRealTime, setPesoRealTime] = useState<number>(0);
  const [statusBalanca, setStatusBalanca] = useState<'conectando' | 'online' | 'offline'>('conectando');

  const inputPesoRef = useRef<HTMLInputElement>(null);
  const inputBarcodeRef = useRef<HTMLInputElement>(null);
  const inputAutoRef = useRef<HTMLInputElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const toNumber = (value: unknown): number => {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  };

  const formatNumber = (value: unknown, casas: number = 3): string => {
    return toNumber(value).toFixed(casas);
  };

  // ==========================================
  // CARREGAR ESTAÇÃO DE TRABALHO DA MÁQUINA
  // ==========================================
  useEffect(() => {
    const carregarEstacao = async () => {
      const estacaoId = localStorage.getItem('estacao_trabalho_id');
      if (!estacaoId) {
        setLoadingEstacao(false);
        return;
      }
      try {
        const res = await api.get(`/api/estacoes-trabalho/${estacaoId}`);
        const raw = res.data as unknown;
        const est: IEstacaoTrabalho =
          raw &&
          typeof raw === 'object' &&
          raw !== null &&
          'data' in raw &&
          typeof (raw as { data: IEstacaoTrabalho }).data === 'object'
            ? (raw as { data: IEstacaoTrabalho }).data
            : (raw as IEstacaoTrabalho);
        setEstacaoAtual(est);
      } catch (error) {
        console.error('Erro ao carregar estação de trabalho configurada', error);
      } finally {
        setLoadingEstacao(false);
      }
    };
    carregarEstacao();
  }, []);

  // ==========================================
  // WEBSOCKET (BALANÇA FÍSICA)
  // ==========================================
  useEffect(() => {
    const ws = new WebSocket('ws://localhost:8080');
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('✅ Conectado ao Aurya Hardware Agent!');
      setStatusBalanca('online');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.peso !== undefined) {
          setPesoRealTime(data.peso);
        }
      } catch (error) {
        console.error("Erro ao processar peso do WebSocket", error);
      }
    };

    ws.onclose = () => {
      console.log('❌ Agente desconectado');
      setStatusBalanca('offline');
    };

    ws.onerror = () => {
      setStatusBalanca('offline');
    };

    return () => ws.close();
  }, []);

  useEffect(() => {
    carregarOPsEmProcessamento();
  }, []);

  useEffect(() => {
    if (modoEntrada === 'MANUAL' && inputPesoRef.current) inputPesoRef.current.focus();
    else if (modoEntrada === 'BIPADOR_PESO' && inputBarcodeRef.current) inputBarcodeRef.current.focus();
    else if (modoEntrada === 'AUTO' && inputAutoRef.current) inputAutoRef.current.focus();
  }, [modoEntrada, produtoSelecionadoId, lendoBalancaAuto, tipoPesagem]);

  const carregarOPsEmProcessamento = async () => {
    setLoading(true);
    try {
      const res = await api.get<IOP[]>('/api/producao/op');
      const opsAtivas = res.data.filter(op => op.status === 'EM_PROCESSAMENTO' || op.status === 'PROGRAMADA' || op.status === 'CONCLUIDA');
      setOps(opsAtivas);
    } catch (error) {
      console.error('Erro ao carregar OPs', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelecionarOP = (op: IOP) => {
    setOpSelecionada(op);
    setManualEntradaFechada(localStorage.getItem(`op_${op.id}_entrada`) === 'fechada');
    setManualSaidaFechada(localStorage.getItem(`op_${op.id}_saida`) === 'fechada');

    if (op.apontamentosPesagem && op.apontamentosPesagem.length > 0) {
      const historico: IPesagemRealizada[] = op.apontamentosPesagem.map(ap => {
        let validadeCalculada = undefined;
        if (ap.tipo === 'SAIDA') {
          validadeCalculada = calcularValidade(op.dataProducao, getDiasValidade(ap.produto));
        }
        return {
          id: ap.id,
          produtoNome: ap.produto?.nome || 'Produto',
          peso: toNumber(ap.peso),
          pecas: ap.quantidadePecas || undefined,
          hora: new Date(ap.createdAt || Date.now()).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          timestamp: new Date(ap.createdAt || Date.now()).getTime(),
          tipo: ap.tipo,
          validade: validadeCalculada
        };
      });
      historico.sort((a, b) => b.timestamp - a.timestamp);
      setPesagensSessao(historico);
    } else {
      setPesagensSessao([]);
    }
  };

  const handleMudarStatusOP = async (id: string, novoStatus: string) => {
    try {
      await api.patch(`/api/producao/op/${id}/status`, { status: novoStatus });
      setOpSelecionada(prev => prev ? { ...prev, status: novoStatus } : null);
      if (novoStatus === 'CONCLUIDA') {
        alert('🎉 Ordem de Produção finalizada com sucesso!');
      }
    } catch (error) {
      console.error('Erro ao mudar status:', error);
    }
  };

  const totalEntradaPesado = pesagensSessao.filter(p => p.tipo === 'ENTRADA').reduce((acc, curr) => acc + toNumber(curr.peso), 0);
  const totalSaidaPesado = pesagensSessao.filter(p => p.tipo === 'SAIDA').reduce((acc, curr) => acc + toNumber(curr.peso), 0);
  const totalEntradaPrevisto = opSelecionada?.itensOrigem.reduce((acc, curr) => acc + toNumber(curr.quantidadeKgPrevista), 0) || 0;
  const totalSaidaPrevisto = opSelecionada?.itensDestino.reduce((acc, curr) => acc + toNumber(curr.quantidadeEsperada), 0) || 0;

  const entradaAutoConcluida = totalEntradaPrevisto > 0 && totalEntradaPesado >= totalEntradaPrevisto;
  const saidaAutoConcluida = totalSaidaPrevisto > 0 && totalSaidaPesado >= totalSaidaPrevisto;

  const isEntradaFechada = entradaAutoConcluida || manualEntradaFechada || opSelecionada?.status === 'CONCLUIDA';
  const isSaidaFechada = saidaAutoConcluida || manualSaidaFechada || opSelecionada?.status === 'CONCLUIDA';

  useEffect(() => {
    if (opSelecionada && opSelecionada.status === 'EM_PROCESSAMENTO') {
      if (isEntradaFechada && isSaidaFechada) {
        handleMudarStatusOP(opSelecionada.id, 'CONCLUIDA');
      }
    }
  }, [isEntradaFechada, isSaidaFechada, opSelecionada]);

  const fecharOperacao = async (tipo: 'ENTRADA' | 'SAIDA', estornar: boolean = false) => {
    if (!opSelecionada) return;
    const key = `op_${opSelecionada.id}_${tipo.toLowerCase()}`;

    if (estornar) {
      if (!window.confirm(`Deseja reabrir a operação de ${tipo}?`)) return;
      localStorage.removeItem(key);
      if (tipo === 'ENTRADA') setManualEntradaFechada(false);
      else setManualSaidaFechada(false);

      if (opSelecionada.status === 'CONCLUIDA') {
        await handleMudarStatusOP(opSelecionada.id, 'EM_PROCESSAMENTO');
      }
    } else {
      if (!window.confirm(`Deseja encerrar a operação de ${tipo} manualmente?`)) return;
      localStorage.setItem(key, 'fechada');
      if (tipo === 'ENTRADA') setManualEntradaFechada(true);
      else setManualSaidaFechada(true);
    }
  };

  const handleTrocarTipoPesagem = (tipo: 'ENTRADA' | 'SAIDA') => {
    setTipoPesagem(tipo);
    setProdutoSelecionadoId('');
    setPesoLido('');
    setQuantidadePecas('');
    setAlertaPeso(null);
    if (tipo === 'SAIDA' && (modoEntrada === 'BIPADOR_PESO' || modoEntrada === 'AUTO')) {
      setModoEntrada('MANUAL');
    }
  };

  const getDiasValidade = (produto?: any) => {
    if (!produto) return undefined;
    const dias = produto.vencimento ?? produto.validade ?? produto.diasValidade ?? produto.diasVencimento ?? produto.prazoValidade;
    if (dias !== undefined && dias !== null) return Number(dias);

    for (const key in produto) {
      if (key.toLowerCase().includes('venci') || key.toLowerCase().includes('valid')) {
        const val = produto[key];
        if (val !== null && val !== undefined && !isNaN(Number(val))) return Number(val);
      }
    }
    if (produto.dadosProducao?.diasValidade) return Number(produto.dadosProducao.diasValidade);
    return undefined;
  };

  const calcularValidade = (dataProducaoStr?: string, diasValidade?: number) => {
    if (!dataProducaoStr) return 'Falta Data Produção';
    if (!diasValidade) return 'Falta config. dias';
    try {
      const datePart = dataProducaoStr.split('T')[0];
      const [year, month, day] = datePart.split('-');
      const data = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      data.setDate(data.getDate() + diasValidade);
      return data.toLocaleDateString('pt-BR');
    } catch (e) {
      return 'Erro no cálculo';
    }
  };

  const validarPeso = (peso: number, produtoId: string) => {
    if (!opSelecionada) return true;

    let itemOp;
    if (tipoPesagem === 'SAIDA') {
      itemOp = opSelecionada.itensDestino.find(i => i.produtoId === produtoId);
    } else {
      itemOp = opSelecionada.itensOrigem.find(i => i.produtoId === produtoId);
    }

    if (itemOp && itemOp.produto?.dadosProducao?.pesoMedioPeca) {
      const pesoMedio = itemOp.produto.dadosProducao.pesoMedioPeca;
      if (peso > pesoMedio * 1.5) {
        setAlertaPeso(`Atenção: O peso (${peso}kg) está muito acima do padrão (${pesoMedio}kg).`);
        return false;
      }
      if (peso < pesoMedio * 0.5) {
        setAlertaPeso(`Atenção: O peso (${peso}kg) está muito abaixo do padrão (${pesoMedio}kg).`);
        return false;
      }
    }

    if (peso > 100) {
      setAlertaPeso(`Erro: Peso de ${peso}kg excede o limite de segurança.`);
      return false;
    }

    setAlertaPeso(null);
    return true;
  };

  // ✅ ENVIAR COMANDO DE IMPRESSÃO ENRIQUECIDO COM DADOS DA ESTAÇÃO
    // ✅ NOVA FUNÇÃO DE IMPRESSÃO: Envia para a Fila do Banco de Dados
  const imprimirEtiqueta = async (pesagem: IPesagemRealizada) => {
    if (!estacaoAtual) {
      alert('⚠️ Estação não configurada. Etiqueta não impressa.');
      return;
    }

    if (!estacaoAtual.layoutEtiquetaId) {
      alert('⚠️ Nenhum Layout de Etiqueta vinculado a esta estação.');
      return;
    }

    try {
      // Monta os dados que o ZPL vai precisar
      const dadosImpressao = {
        produto: pesagem.produtoNome,
        peso: pesagem.peso,
        validade: pesagem.validade || null,
        dataHora: pesagem.hora,
        codigoBarras: pesagem.id // Ou o EAN gerado
      };

      // Envia para a fila no Backend Node.js
      await api.post('/api/print-queue', {
        workstationId: estacaoAtual.id,
        layoutId: estacaoAtual.layoutEtiquetaId,
        dados: dadosImpressao
      });

      console.log('🖨️ Etiqueta enviada para a fila de impressão com sucesso!');
      
      // Opcional: Mostrar um toast de sucesso rápido aqui
    } catch (error) {
      console.error('Erro ao enviar para fila de impressão:', error);
      alert('❌ Erro ao enviar etiqueta para a fila de impressão.');
    }
  };

    // ==========================================
  // WEBSOCKET (APENAS LEITURA DA BALANÇA FÍSICA)
  // ==========================================
  useEffect(() => {
    const ws = new WebSocket('ws://localhost:8080');
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('✅ Conectado ao Aurya Hardware Agent (Leitura de Peso)!');
      setStatusBalanca('online');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.peso !== undefined) {
          setPesoRealTime(data.peso);
        }
      } catch (error) {
        console.error("Erro ao processar peso do WebSocket", error);
      }
    };

    ws.onclose = () => {
      console.log('❌ Agente desconectado');
      setStatusBalanca('offline');
    };

    ws.onerror = () => {
      setStatusBalanca('offline');
    };

    return () => ws.close();
  }, []);

  const registrarPesoNoBanco = async (prodId: string, pesoNum: number) => {
    if (tipoPesagem === 'SAIDA' && (!quantidadePecas || parseInt(quantidadePecas) <= 0)) {
      setAlertaPeso('Informe a quantidade de peças geradas (caixa/bandeja).');
      return false;
    }

    if (!validarPeso(pesoNum, prodId)) return false;

    setSalvando(true);
    try {
      const res = await api.post(`/api/producao/op/${opSelecionada?.id}/pesagem`, {
        produtoId: prodId,
        peso: pesoNum,
        tipo: tipoPesagem,
        quantidadePecas: tipoPesagem === 'SAIDA' ? parseInt(quantidadePecas) : null,
        estacaoTrabalhoId: estacaoAtual?.id // Rastreabilidade
      });

      const idReal = res.data?.id || Date.now().toString();
      let produtoNome = 'Produto';
      let validadeCalculada = undefined;

      if (tipoPesagem === 'SAIDA') {
        const itemDestino = opSelecionada?.itensDestino.find(i => i.produtoId === prodId);
        produtoNome = itemDestino?.produto.nome || produtoNome;
        validadeCalculada = calcularValidade(opSelecionada?.dataProducao, getDiasValidade(itemDestino?.produto));
      } else {
        produtoNome = opSelecionada?.itensOrigem.find(i => i.produtoId === prodId)?.produto.nome || produtoNome;
      }

      const novaPesagem: IPesagemRealizada = {
        id: idReal,
        produtoNome,
        peso: pesoNum,
        pecas: tipoPesagem === 'SAIDA' ? parseInt(quantidadePecas) : undefined,
        hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        timestamp: Date.now(),
        tipo: tipoPesagem,
        validade: validadeCalculada
      };

      setPesagensSessao(prev => [novaPesagem, ...prev].sort((a, b) => b.timestamp - a.timestamp));
      setPesoLido('');
      setCodigoBarrasLido('');
      if (tipoPesagem === 'SAIDA') setQuantidadePecas('');
   

      return true;
    } catch (error) {
      setAlertaPeso('Erro ao comunicar com o servidor.');
      return false;
    } finally {
      setSalvando(false);
    }
  };

  const handleRegistrarPesoManual = async () => {
    if (!opSelecionada || !produtoSelecionadoId) return;
    
    const pesoNum = modoEntrada === 'BALANCA' ? pesoRealTime : parseFloat(pesoLido);
    
    if (isNaN(pesoNum) || pesoNum <= 0) {
      setAlertaPeso(modoEntrada === 'BALANCA' ? 'A balança está zerada. Coloque o produto.' : 'Digite um peso válido maior que zero.');
      return;
    }
    await registrarPesoNoBanco(produtoSelecionadoId, pesoNum);
  };

  const handleAutoBarcodeKeyPress = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && codigoBarrasLido) {
      const codigoBipado = codigoBarrasLido.trim();
      setCodigoBarrasLido('');

      let itemEncontrado;
      if (tipoPesagem === 'SAIDA') {
        itemEncontrado = opSelecionada?.itensDestino.find(i => i.produto.codigo === codigoBipado || i.produto.ean === codigoBipado);
      } else {
        itemEncontrado = opSelecionada?.itensOrigem.find(i => i.produto.codigo === codigoBipado || i.produto.ean === codigoBipado);
      }

      if (!itemEncontrado) {
        setAlertaPeso(`Produto com código ${codigoBipado} não pertence a esta OP.`);
        return;
      }

      setProdutoSelecionadoId(itemEncontrado.produtoId);
      
      if (pesoRealTime <= 0) {
        setAlertaPeso('Atenção: A balança está zerada. Coloque o produto antes de bipar.');
        return;
      }

      await registrarPesoNoBanco(itemEncontrado.produtoId, pesoRealTime);
    }
  };

  const handleBipadorPesoKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && codigoBarrasLido) {
      if (codigoBarrasLido.startsWith('2') && codigoBarrasLido.length === 13) {
        const pesoExtraido = parseInt(codigoBarrasLido.substring(7, 12)) / 1000;
        setPesoLido(pesoExtraido.toString());
        setAlertaPeso('Peso extraído da etiqueta. Confirme o produto e clique em Salvar.');
      } else {
        setAlertaPeso('Código não reconhecido como etiqueta de balança.');
      }
      setCodigoBarrasLido('');
    }
  };

  const handleEstornarPesagem = async (idPesagem: string) => {
    if (!window.confirm('⚠️ Deseja realmente ESTORNAR esta pesagem?')) return;
    try {
      await api.delete(`/api/producao/op/pesagem/${idPesagem}`);
      setPesagensSessao(prev => prev.filter(p => p.id !== idPesagem));
      alert('✅ Pesagem estornada!');
      if (opSelecionada?.status === 'CONCLUIDA') {
        handleMudarStatusOP(opSelecionada.id, 'EM_PROCESSAMENTO');
      }
    } catch (error) {
      console.error('Erro ao estornar pesagem:', error);
      alert('Erro ao estornar pesagem.');
    }
  };

  const formatarData = (dataStr?: string) => {
    if (!dataStr) return 'Não informada';
    try {
      const datePart = dataStr.split('T')[0];
      const [year, month, day] = datePart.split('-');
      return `${day}/${month}/${year}`;
    } catch (e) {
      return 'Inválida';
    }
  };

  const pesagensFiltradas = pesagensSessao.filter(p => p.tipo === tipoPesagem);
  const progresso = tipoPesagem === 'ENTRADA'
    ? (totalEntradaPrevisto > 0 ? (totalEntradaPesado / totalEntradaPrevisto) * 100 : 0)
    : (totalSaidaPrevisto > 0 ? (totalSaidaPesado / totalSaidaPrevisto) * 100 : 0);

  const inputClass = 'w-full bg-[#0b1324] border border-white/10 rounded-xl px-4 py-4 text-white focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 transition-all placeholder:text-slate-500 text-lg';

  const isBotaoSalvarDesabilitado = 
    salvando || 
    !produtoSelecionadoId || 
    (modoEntrada === 'MANUAL' && !pesoLido) || 
    (modoEntrada === 'BALANCA' && pesoRealTime <= 0) || 
    (tipoPesagem === 'SAIDA' && !quantidadePecas);

  // ✅ BLOQUEIO DE TELA SE NÃO HOUVER ESTAÇÃO CONFIGURADA
  if (!loadingEstacao && !estacaoAtual) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-[70vh] text-center px-4">
          <div className="bg-amber-500/10 border border-amber-500/30 p-8 rounded-[30px] max-w-lg shadow-[0_0_50px_rgba(245,158,11,0.1)]">
            <MonitorSmartphone className="w-16 h-16 text-amber-400 mx-auto mb-4" />
            <h2 className="text-2xl font-black text-white mb-2">Terminal Não Configurado</h2>
            <p className="text-slate-400 mb-6">
              Esta máquina não está vinculada a nenhuma Estação de Trabalho. Para realizar pesagens e impressões, você precisa configurar este terminal.
            </p>
            <button 
              onClick={() => window.location.href = '/estacoes-trabalho'} 
              className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold py-3 px-6 rounded-xl transition-colors shadow-lg"
            >
              Configurar Estação de Trabalho
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mx-auto max-w-7xl space-y-6 pb-12 animate-[fadeIn_0.5s_ease-out]">

        {/* HEADER */}
        <div className="flex flex-col justify-between gap-6 rounded-[30px] border border-white/10 bg-[#08101f] p-6 shadow-[0_25px_70px_rgba(0,0,0,0.40)] sm:flex-row sm:items-center sm:p-8 relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-3 flex-wrap">
              <div className="inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-violet-300">
                <Scale className="h-3.5 w-3.5" /> Terminal de Balança
              </div>
              
              {/* ✅ BADGE DA ESTAÇÃO ATUAL */}
              {estacaoAtual && (
                <div className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-blue-400">
                  <MonitorSmartphone className="w-3 h-3" /> {estacaoAtual.nome}
                </div>
              )}

              <div className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wider transition-all ${
                statusBalanca === 'online' 
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' 
                  : statusBalanca === 'conectando'
                  ? 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                  : 'border-red-500/30 bg-red-500/10 text-red-400'
              }`}>
                {statusBalanca === 'online' ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                {statusBalanca === 'online' ? 'Agent Online' : statusBalanca === 'conectando' ? 'Conectando...' : 'Agent Offline'}
              </div>
            </div>

            <h1 className="text-3xl md:text-4xl font-black text-white flex items-center gap-4 tracking-tight">
              Pesagem de Produção
            </h1>
            <p className="text-slate-400 mt-2 font-medium">Controle de rendimento, entrada e saída de produção.</p>
          </div>

          {opSelecionada && (
            <button onClick={() => { setOpSelecionada(null); setPesagensSessao([]); }} className="relative z-10 bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 px-6 py-3.5 rounded-2xl font-bold transition-all flex items-center gap-2">
              <X className="w-5 h-5" /> Trocar OP
            </button>
          )}
        </div>

        {/* SELEÇÃO DE OP */}
        {!opSelecionada && (
          <div className="bg-[#08101f]/90 backdrop-blur-xl rounded-[30px] border border-white/10 p-8 shadow-[0_25px_60px_rgba(0,0,0,0.35)]">
            <h2 className="text-2xl font-black text-white mb-6 flex items-center gap-3">
              <ClipboardList className="text-violet-400" /> Selecione a Ordem de Produção
            </h2>

            {loading ? (
              <div className="py-12 text-center text-slate-400 font-bold flex justify-center items-center gap-3">
                <Loader2 className="w-6 h-6 animate-spin text-violet-300" /> Carregando OPs ativas...
              </div>
            ) : ops.length === 0 ? (
              <div className="py-12 text-center border border-dashed border-white/10 rounded-[20px] bg-white/5">
                <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
                <h3 className="text-xl font-black text-white">Nenhuma OP Disponível</h3>
                <p className="text-slate-400">Não há OPs no status "Em Processamento" para pesar.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {ops.map(op => (
                  <div key={op.id} onClick={() => handleSelecionarOP(op)} className="bg-[#0b1324] border border-white/10 hover:border-violet-500/50 p-6 rounded-2xl cursor-pointer transition-all group">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-violet-400 font-mono font-bold text-sm">OP #{op.codigoOP}</span>
                      <span className={`text-[10px] px-2 py-1 rounded font-bold uppercase ${op.status === 'CONCLUIDA' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}`}>
                        {op.status.replace('_', ' ')}
                      </span>
                    </div>
                    <h3 className="text-white font-black text-lg mb-4">{op.itensOrigem[0]?.produto?.nome || 'Matéria Prima'}</h3>
                    <div className="flex items-center gap-2 text-slate-400 text-sm font-medium group-hover:text-white transition-colors">
                      <Play className="w-4 h-4 text-violet-400" /> {op.status === 'CONCLUIDA' ? 'Visualizar Pesagens' : 'Continuar Pesagem'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TELA DE PESAGEM DA OP SELECIONADA */}
        {opSelecionada && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-[fadeIn_0.3s_ease-out]">

            {/* COLUNA ESQUERDA: CONTROLES DE PESAGEM */}
            <div className="lg:col-span-2 space-y-6">

              <div className="bg-[#08101f]/90 backdrop-blur-xl rounded-[24px] border border-violet-500/30 p-6 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center shadow-[0_15px_40px_rgba(139,92,246,0.15)]">
                <div>
                  <span className="text-violet-400 font-mono text-sm font-bold block mb-1">OP #{opSelecionada.codigoOP}</span>
                  <h2 className="text-xl font-black text-white">{opSelecionada.itensOrigem[0]?.produto?.nome}</h2>

                  <div className="flex flex-wrap gap-4 mt-3 text-xs text-slate-400 bg-white/5 p-2.5 rounded-xl border border-white/5 w-fit">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      <span className="font-bold text-slate-500">Abate:</span>
                      <span className="text-white">{formatarData(opSelecionada.dataAbate)}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      <span className="font-bold text-slate-500">Produção:</span>
                      <span className="text-white">{formatarData(opSelecionada.dataProducao)}</span>
                    </div>

                    {tipoPesagem === 'SAIDA' && (
                      <div className="flex items-center gap-1.5 pl-2 border-l border-white/10">
                        <Calendar className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="font-bold text-slate-500">Validade:</span>
                        <span className="text-emerald-400 font-bold">
                          {produtoSelecionadoId
                            ? calcularValidade(opSelecionada.dataProducao, getDiasValidade(opSelecionada.itensDestino.find(i => i.produtoId === produtoSelecionadoId)?.produto))
                            : 'Selecione um produto'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex bg-[#0b1324] rounded-xl border border-white/10 p-1 w-full md:w-auto">
                  <button onClick={() => handleTrocarTipoPesagem('ENTRADA')} className={`flex-1 md:flex-none px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${tipoPesagem === 'ENTRADA' ? 'bg-amber-500 text-slate-900' : 'text-slate-400 hover:text-white'}`}>Entrada</button>
                  <button onClick={() => handleTrocarTipoPesagem('SAIDA')} className={`flex-1 md:flex-none px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${tipoPesagem === 'SAIDA' ? 'bg-emerald-500 text-slate-900' : 'text-slate-400 hover:text-white'}`}>Saída</button>
                </div>
              </div>

              <div className="bg-[#08101f]/90 backdrop-blur-xl rounded-[30px] border border-white/10 p-6 md:p-8 shadow-[0_25px_60px_rgba(0,0,0,0.35)]">
                {(tipoPesagem === 'ENTRADA' && isEntradaFechada) || (tipoPesagem === 'SAIDA' && isSaidaFechada) ? (
                  <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-[30px] p-12 text-center shadow-[0_0_50px_rgba(16,185,129,0.1)] animate-[fadeIn_0.3s_ease-out]">
                    <CheckCircle2 className="w-20 h-20 text-emerald-400 mx-auto mb-6" />
                    <h2 className="text-3xl font-black text-white mb-3">
                      {tipoPesagem === 'ENTRADA' ? 'Entrada Finalizada' : 'Saída Finalizada'}
                    </h2>
                    <p className="text-emerald-400/80 mb-8 text-lg">
                      {tipoPesagem === 'ENTRADA' && entradaAutoConcluida ? 'Meta de peso atingida automaticamente!' : ''}
                      {tipoPesagem === 'SAIDA' && saidaAutoConcluida ? 'Meta de peso atingida automaticamente!' : ''}
                      {(!entradaAutoConcluida && tipoPesagem === 'ENTRADA') || (!saidaAutoConcluida && tipoPesagem === 'SAIDA') ? 'Operação encerrada manualmente.' : ''}
                    </p>
                    <button onClick={() => fecharOperacao(tipoPesagem, true)} className="bg-[#0b1324] hover:bg-red-500/20 text-slate-300 hover:text-red-400 border border-white/10 hover:border-red-500/30 px-8 py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 mx-auto">
                      <LockOpen className="w-5 h-5" /> Estornar Fechamento (Reabrir)
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-wrap gap-2 mb-8 bg-[#0b1324] p-1.5 rounded-2xl border border-white/10">
                      <button onClick={() => setModoEntrada('MANUAL')} className={`flex-1 min-w-[120px] py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${modoEntrada === 'MANUAL' ? 'bg-violet-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                        <Keyboard className="w-4 h-4" /> Digitação
                      </button>
                      <button onClick={() => setModoEntrada('BALANCA')} className={`flex-1 min-w-[120px] py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${modoEntrada === 'BALANCA' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                        <Scale className="w-4 h-4" /> Ler Balança
                      </button>

                      {tipoPesagem === 'ENTRADA' && (
                        <>
                          <button onClick={() => setModoEntrada('BIPADOR_PESO')} className={`flex-1 min-w-[120px] py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${modoEntrada === 'BIPADOR_PESO' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                            <Barcode className="w-4 h-4" /> Etiqueta c/ Peso
                          </button>
                          <button onClick={() => setModoEntrada('AUTO')} className={`flex-1 min-w-[120px] py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${modoEntrada === 'AUTO' ? 'bg-fuchsia-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                            <Zap className="w-4 h-4" /> Bipar + Pesar
                          </button>
                        </>
                      )}
                    </div>

                    <div className="space-y-6">
                      {modoEntrada === 'AUTO' && tipoPesagem === 'ENTRADA' && (
                        <div className="bg-fuchsia-500/10 border border-fuchsia-500/30 rounded-2xl p-6 text-center">
                          <Zap className="w-12 h-12 text-fuchsia-400 mx-auto mb-4" />
                          <h3 className="text-xl font-black text-white mb-2">Modo Ultra Rápido</h3>
                          <p className="text-fuchsia-300/70 text-sm mb-6">Coloque o produto na balança e bipe o código.</p>
                          <div className="relative max-w-sm mx-auto mt-6">
                            <Barcode className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-fuchsia-500/50" />
                            <input
                              ref={inputAutoRef}
                              type="text"
                              value={codigoBarrasLido}
                              onChange={e => setCodigoBarrasLido(e.target.value)}
                              onKeyDown={handleAutoBarcodeKeyPress}
                              disabled={lendoBalancaAuto || salvando || statusBalanca !== 'online'}
                              className={`${inputClass} text-xl font-mono text-fuchsia-300 pl-14 py-4 text-center disabled:opacity-50`}
                              placeholder={statusBalanca !== 'online' ? 'Conecte a Balança...' : 'Bipe aqui...'}
                            />
                          </div>
                        </div>
                      )}

                      {modoEntrada !== 'AUTO' && (
                        <>
                          <div>
                            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-[0.16em] mb-2 pl-1">
                              {tipoPesagem === 'SAIDA' ? 'Produto Acabado (Corte)' : 'Matéria Prima'}
                            </label>
                            <select value={produtoSelecionadoId} onChange={e => setProdutoSelecionadoId(e.target.value)} className={`${inputClass} font-bold text-violet-100`}>
                              <option value="">Selecione o produto...</option>
                              {tipoPesagem === 'SAIDA'
                                ? opSelecionada.itensDestino.map(i => <option key={i.produtoId} value={i.produtoId}>{i.produto?.codigo} - {i.produto?.nome}</option>)
                                : opSelecionada.itensOrigem.map(i => <option key={i.produtoId} value={i.produtoId}>{i.produto?.codigo} - {i.produto?.nome}</option>)
                              }
                            </select>
                          </div>

                          {tipoPesagem === 'SAIDA' && (
                            <div>
                              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-[0.16em] mb-2 pl-1">Qtd Peças (Bandeja / Caixa) *</label>
                              <div className="relative">
                                <Package className={`absolute left-6 top-1/2 -translate-y-1/2 w-8 h-8 ${quantidadePecas ? 'text-emerald-400' : 'text-slate-600'}`} />
                                <input type="number" value={quantidadePecas} onChange={e => setQuantidadePecas(e.target.value)} className={`${inputClass} text-2xl font-black py-4 pl-20 ${quantidadePecas ? 'text-emerald-400' : 'text-white'} font-mono`} placeholder="Ex: 5" />
                              </div>
                            </div>
                          )}

                          {modoEntrada === 'BALANCA' && (
                            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-6 text-center">
                              <h3 className="text-lg font-black text-emerald-400 mb-2">Peso em Tempo Real</h3>
                              {statusBalanca !== 'online' && (
                                <p className="text-red-400 text-sm font-bold mb-4 animate-pulse">⚠️ Aguardando conexão com a balança...</p>
                              )}
                              <div className={`text-7xl font-black font-mono mb-2 transition-colors ${statusBalanca === 'online' ? 'text-white' : 'text-slate-600'}`}>
                                {formatNumber(pesoRealTime)} <span className="text-3xl text-emerald-500/50">KG</span>
                              </div>
                            </div>
                          )}

                          {modoEntrada === 'BIPADOR_PESO' && tipoPesagem === 'ENTRADA' && (
                            <div>
                              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-[0.16em] mb-2 pl-1">Bipar Etiqueta (EAN-13)</label>
                              <div className="relative">
                                <Barcode className="absolute left-6 top-1/2 -translate-y-1/2 w-8 h-8 text-blue-500/50" />
                                <input ref={inputBarcodeRef} type="text" value={codigoBarrasLido} onChange={e => setCodigoBarrasLido(e.target.value)} onKeyDown={handleBipadorPesoKeyPress} className={`${inputClass} text-2xl font-mono text-blue-300 pl-20 py-6`} placeholder="Bipe a etiqueta..." />
                              </div>
                              {pesoLido && <div className="mt-4 text-center text-blue-400 font-bold">Peso extraído: <span className="text-2xl">{pesoLido} KG</span></div>}
                            </div>
                          )}

                          {modoEntrada === 'MANUAL' && (
                            <div>
                              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-[0.16em] mb-2 pl-1">Peso Marcado na Balança (KG) *</label>
                              <div className="relative">
                                <Keyboard className={`absolute left-6 top-1/2 -translate-y-1/2 w-8 h-8 ${pesoLido ? 'text-violet-400' : 'text-slate-600'}`} />
                                <input ref={inputPesoRef} type="number" step="0.001" value={pesoLido} onChange={e => setPesoLido(e.target.value)} className={`${inputClass} text-5xl font-black py-8 pl-20 ${tipoPesagem === 'SAIDA' ? 'text-emerald-400' : 'text-amber-400'} font-mono`} placeholder="0.000" />
                                <span className="absolute right-8 top-1/2 -translate-y-1/2 text-2xl font-black text-slate-600">KG</span>
                              </div>
                            </div>
                          )}

                          <button 
                            onClick={handleRegistrarPesoManual} 
                            disabled={isBotaoSalvarDesabilitado} 
                            className={`w-full py-6 rounded-2xl font-black text-2xl flex justify-center items-center gap-3 transition-all mt-6 ${
                              isBotaoSalvarDesabilitado 
                                ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                                : tipoPesagem === 'SAIDA' 
                                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_30px_rgba(16,185,129,0.3)]' 
                                  : 'bg-amber-500 hover:bg-amber-400 text-slate-900 shadow-[0_0_30px_rgba(245,158,11,0.3)]'
                            }`}
                          >
                            {salvando ? <Loader2 className="w-8 h-8 animate-spin" /> : <CheckCircle2 className="w-8 h-8" />}
                            {tipoPesagem === 'SAIDA' ? 'Registrar e Imprimir Etiqueta' : 'Registrar Entrada'}
                          </button>
                        </>
                      )}

                      {alertaPeso && (
                        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-start gap-3">
                          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                          <p className="text-amber-200 text-sm font-medium">{alertaPeso}</p>
                        </div>
                      )}

                      <button onClick={() => fecharOperacao(tipoPesagem, false)} className="w-full bg-slate-800/50 hover:bg-slate-700/80 border border-slate-700 text-slate-400 hover:text-white py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 mt-8">
                        <Lock className="w-4 h-4" /> Encerrar {tipoPesagem} Manualmente
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* COLUNA DIREITA: HISTÓRICO */}
            <div className="bg-[#0b1324] rounded-[30px] border border-white/10 p-6 flex flex-col shadow-[0_25px_60px_rgba(0,0,0,0.40)]">
              <div className="flex justify-between items-center border-b border-white/10 pb-4 mb-6">
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-slate-400" /> Histórico ({tipoPesagem === 'ENTRADA' ? 'Entrada' : 'Saída'})
                </h3>
                <span className="bg-white/10 text-white text-xs font-bold px-3 py-1 rounded-full">{pesagensFiltradas.length} itens</span>
              </div>

              <div className="mb-6 bg-[#08101f] p-4 rounded-2xl border border-white/5">
                <div className="flex justify-between text-xs font-bold text-slate-400 mb-2">
                  <span>Progresso da {tipoPesagem}</span>
                  <span className={progresso >= 100 ? 'text-emerald-400' : 'text-violet-400'}>{formatNumber(progresso, 1)}%</span>
                </div>
                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-500 ${progresso >= 100 ? 'bg-emerald-500' : 'bg-violet-500'}`} style={{ width: `${Math.min(progresso, 100)}%` }}></div>
                </div>
                <div className="flex justify-between text-[10px] text-slate-500 mt-2 font-mono">
                  <span>Pesado: {formatNumber(tipoPesagem === 'ENTRADA' ? totalEntradaPesado : totalSaidaPesado)}kg</span>
                  <span>Meta: {formatNumber(tipoPesagem === 'ENTRADA' ? totalEntradaPrevisto : totalSaidaPrevisto)}kg</span>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-2 min-h-[300px]">
                {pesagensFiltradas.length === 0 ? (
                  <div className="text-center py-10 text-slate-500 text-sm">Nenhuma pesagem realizada.</div>
                ) : (
                  pesagensFiltradas.map((pesagem) => (
                    <div key={pesagem.id} className="bg-[#08101f] border border-white/5 p-4 rounded-xl flex items-center justify-between group hover:border-white/20 transition-all">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`w-2 h-2 rounded-full ${pesagem.tipo === 'SAIDA' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                          <span className="text-white font-bold text-sm">{pesagem.produtoNome}</span>
                        </div>
                        <div className="flex flex-wrap gap-2 items-center mt-0.5">
                          <span className="text-xs text-slate-500 font-mono">{pesagem.hora}</span>
                          {pesagem.pecas && <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">{pesagem.pecas} UN</span>}
                          {pesagem.validade && !pesagem.validade.includes('Falta') && !pesagem.validade.includes('Erro') && (
                            <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/20">Val: {pesagem.validade}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`font-black font-mono ${pesagem.tipo === 'SAIDA' ? 'text-emerald-400' : 'text-amber-400'}`}>{formatNumber(pesagem.peso)}</span>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {pesagem.tipo === 'SAIDA' && (
                            <button onClick={() => imprimirEtiqueta(pesagem)} className="p-2 bg-white/5 hover:bg-violet-600 hover:text-white text-slate-400 rounded-lg transition-colors" title="Reimprimir"><Printer className="w-4 h-4" /></button>
                          )}
                          <button onClick={() => handleEstornarPesagem(pesagem.id)} className="p-2 bg-white/5 hover:bg-red-600 hover:text-white text-slate-400 rounded-lg transition-colors" title="Estornar"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}