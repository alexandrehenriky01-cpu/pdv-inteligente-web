import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Layout } from '../../../components/Layout';
import { api } from '../../../services/api';
import { toast } from 'react-toastify';
import {
  Scale, Keyboard, CheckCircle2, AlertTriangle, 
  X, Loader2, Wifi, WifiOff, MonitorSmartphone, Package, Calendar, Truck, ShieldCheck, Printer
} from 'lucide-react';

// Tipagem da Estação de Trabalho (Igual à Produção)
interface IEstacaoTrabalho {
  id: string;
  nome: string;
  layoutEtiquetaId?: string;
}

// Tipagem do Item do Pedido
interface ItemPedido {
  id: number;
  produtoNome: string;
  qtdPecasEsperada: number;
  pesoEsperado: number;
  qtdPecasRecebida: number;
  pesoRecebido: number;
  // Mock para exibição (Na vida real vem do banco)
  fornecedorNome?: string; 
  sifCispi?: string;
}

export function RecebimentoIndustria() {
  // 1. ESTADO DA ESTAÇÃO DE TRABALHO
  const [estacaoAtual, setEstacaoAtual] = useState<IEstacaoTrabalho | null>(null);
  const [loadingEstacao, setLoadingEstacao] = useState(true);

  // 2. ESTADOS DA BALANÇA
  const [pesoRealTime, setPesoRealTime] = useState<number>(0);
  const [statusBalanca, setStatusBalanca] = useState<'conectando' | 'online' | 'offline'>('conectando');
  const wsRef = useRef<WebSocket | null>(null);

  // 3. ESTADOS DA TELA E RASTREABILIDADE
  const [modoEntrada, setModoEntrada] = useState<'MANUAL' | 'BALANCA'>('BALANCA');
  const [pesoManual, setPesoManual] = useState<string>('');
  const [tara, setTara] = useState<string>('1.200'); // Palete padrão
  const [quantidadePecas, setQuantidadePecas] = useState<string>('1'); // Novo Campo
  
  // Novos Campos Frigorífico
  const [dataAbate, setDataAbate] = useState<string>('');
  const [dataProducao, setDataProducao] = useState<string>('');
  const [validade, setValidade] = useState<string>('');

  const [salvando, setSalvando] = useState(false);

  // Mock do item selecionado (Na vida real, você seleciona um pedido antes)
  const [itemAtual, setItemAtual] = useState<ItemPedido>({
    id: 1, // Esse ID tem que existir na tabela itemPedidoRecebimento do seu banco para testar
    produtoNome: "Picanha Bovina Resfriada",
    qtdPecasEsperada: 50,
    pesoEsperado: 600.000,
    qtdPecasRecebida: 0,
    pesoRecebido: 0,
    fornecedorNome: "Frigorífico Boi Gordo S/A", // Mock visual
    sifCispi: "SIF 1234" // Mock visual
  });

  // lojaId e usuarioId vêm do JWT no backend (AuthMiddleware); não enviar valores mock.

  // ==========================================
  // CARREGAR ESTAÇÃO DE TRABALHO
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
        console.error('Erro ao carregar estação', error);
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

    ws.onopen = () => setStatusBalanca('online');
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.peso !== undefined) setPesoRealTime(data.peso);
      } catch (error) {
        const pesoLido = parseFloat(event.data);
        if (!isNaN(pesoLido)) setPesoRealTime(pesoLido);
      }
    };

    ws.onclose = () => setStatusBalanca('offline');
    ws.onerror = () => setStatusBalanca('offline');

    return () => ws.close();
  }, []);

  // ==========================================
  // CÁLCULO DE PESO LÍQUIDO
  // ==========================================
  const pesoBrutoAtual = modoEntrada === 'BALANCA' ? pesoRealTime : Number(pesoManual);
  const taraAtual = Number(tara) || 0;
  
  const pesoLiquidoCalculado = useMemo(() => {
    const calc = pesoBrutoAtual - taraAtual;
    return calc > 0 ? calc : 0;
  }, [pesoBrutoAtual, taraAtual]);

  // ==========================================
  // IMPRIMIR ETIQUETA (FILA DO BANCO)
  // ==========================================
  const imprimirEtiqueta = async (loteGerado: string, pesoLiq: number) => {
    if (!estacaoAtual || !estacaoAtual.layoutEtiquetaId) return;

    try {
      const dadosImpressao = {
        produto: itemAtual.produtoNome,
        fornecedor: itemAtual.fornecedorNome,
        sif: itemAtual.sifCispi,
        lote: loteGerado,
        pesoLiquido: pesoLiq,
        pesoBruto: pesoBrutoAtual,
        tara: taraAtual,
        pecas: quantidadePecas,
        dataAbate: dataAbate || null,
        dataProducao: dataProducao || null,
        validade: validade || null,
        dataHora: new Date().toLocaleString('pt-BR')
      };

      await api.post('/api/print-queue', {
        workstationId: estacaoAtual.id,
        layoutId: estacaoAtual.layoutEtiquetaId,
        dados: dadosImpressao
      });

      console.log('🖨️ Etiqueta de recebimento enviada para a fila.');
    } catch (error) {
      console.error('Erro ao enviar para fila de impressão:', error);
      toast.error('Lote salvo, mas falha ao enviar para impressora.');
    }
  };

  // ==========================================
  // REGISTRAR RECEBIMENTO
  // ==========================================
  const handleRegistrar = async () => {
    if (pesoLiquidoCalculado <= 0) {
      toast.error("Peso líquido inválido para registro.");
      return;
    }
    if (!quantidadePecas || Number(quantidadePecas) <= 0) {
      toast.error("Informe a quantidade de peças/caixas no palete.");
      return;
    }
    if (!estacaoAtual?.id) {
      toast.error('Estação de trabalho não configurada neste terminal.');
      return;
    }

    setSalvando(true);
    try {
      // Contrato unificado com o backend: sempre `workstationId` (UUID da estação).
      const payload = {
        itemPedidoId: itemAtual.id,
        pesoBruto: pesoBrutoAtual,
        tara: taraAtual,
        quantidadePecas: Number(quantidadePecas),
        workstationId: estacaoAtual.id,
        dataAbate: dataAbate ? new Date(dataAbate).toISOString() : null,
        dataProducao: dataProducao ? new Date(dataProducao).toISOString() : null,
        validade: validade ? new Date(validade).toISOString() : null,
      };

      const response = await api.post<{
        sucesso: boolean;
        dados?: { lote: string; pesoLiquido: number; impresso: boolean };
        erro?: string;
      }>('/api/wms/recebimento', payload);

      const body = response.data;
      if (!body.sucesso || !body.dados) {
        toast.error(body.erro || 'Falha ao registrar recebimento.');
        return;
      }

      const pesoRegistrado = body.dados.pesoLiquido;
      const loteGerado = body.dados.lote;

      toast.success(`Palete recebido (Lote: ${loteGerado})!`);

      // Chama a impressão logo após o sucesso da API
      if (estacaoAtual?.layoutEtiquetaId) {
        await imprimirEtiqueta(loteGerado, pesoRegistrado);
      }

      // Atualiza o progresso na tela
      setItemAtual(prev => ({
        ...prev,
        qtdPecasRecebida: prev.qtdPecasRecebida + Number(quantidadePecas),
        pesoRecebido: prev.pesoRecebido + pesoRegistrado
      }));

      // Limpa os campos para o próximo bip (mantém as datas, geralmente o caminhão inteiro tem a mesma data)
      if (modoEntrada === 'MANUAL') setPesoManual('');
      setQuantidadePecas('1');

    } catch (error: unknown) {
      const axiosErr = error as { response?: { data?: { erro?: string } } };
      toast.error(axiosErr.response?.data?.erro || 'Erro ao registrar recebimento.');
    } finally {
      setSalvando(false);
    }
  };

  // ==========================================
  // BLOQUEIO DE ESTAÇÃO
  // ==========================================
  if (!loadingEstacao && !estacaoAtual) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-[70vh] text-center px-4">
          <div className="bg-amber-500/10 border border-amber-500/30 p-8 rounded-[30px] max-w-lg shadow-[0_0_50px_rgba(245,158,11,0.1)]">
            <MonitorSmartphone className="w-16 h-16 text-amber-400 mx-auto mb-4" />
            <h2 className="text-2xl font-black text-white mb-2">Terminal Não Configurado</h2>
            <p className="text-slate-400 mb-6">
              Esta máquina não está vinculada a nenhuma Estação de Trabalho. Configure o terminal para receber mercadorias.
            </p>
            <button onClick={() => { window.location.hash = '#/estacoes-trabalho'; }} className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold py-3 px-6 rounded-xl transition-colors">
              Configurar Estação
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  const isBotaoDesabilitado = salvando || pesoLiquidoCalculado <= 0 || (modoEntrada === 'BALANCA' && statusBalanca !== 'online');
  const inputClass = 'w-full bg-[#0b1324] border border-white/10 rounded-xl px-4 py-4 text-white focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 transition-all font-mono text-center';
  const smallInputClass = 'w-full bg-[#0b1324] border border-white/10 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all text-sm';

  return (
    <Layout>
      <div className="mx-auto max-w-6xl space-y-6 pb-12 animate-[fadeIn_0.5s_ease-out]">
        
        {/* HEADER */}
        <div className="flex flex-col justify-between gap-6 rounded-[30px] border border-white/10 bg-[#08101f] p-6 shadow-[0_25px_70px_rgba(0,0,0,0.40)] sm:flex-row sm:items-center sm:p-8">
          <div>
            <div className="flex items-center gap-3 mb-3 flex-wrap">
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-blue-300">
                <Package className="h-3.5 w-3.5" /> Doca de Recebimento
              </div>
              
              {estacaoAtual && (
                <div className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-violet-400">
                  <MonitorSmartphone className="w-3 h-3" /> {estacaoAtual.nome}
                </div>
              )}

              <div className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wider transition-all ${
                statusBalanca === 'online' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' 
                : statusBalanca === 'conectando' ? 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                : 'border-red-500/30 bg-red-500/10 text-red-400'
              }`}>
                {statusBalanca === 'online' ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                {statusBalanca === 'online' ? 'Balança Online' : statusBalanca === 'conectando' ? 'Conectando...' : 'Balança Offline'}
              </div>
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">Entrada de Mercadorias</h1>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* PAINEL ESQUERDO: BALANÇA E DADOS */}
          <div className="lg:col-span-2 bg-[#08101f]/90 backdrop-blur-xl rounded-[30px] border border-white/10 p-6 md:p-8 shadow-[0_25px_60px_rgba(0,0,0,0.35)]">
            
            <div className="flex flex-wrap gap-2 mb-8 bg-[#0b1324] p-1.5 rounded-2xl border border-white/10">
              <button onClick={() => setModoEntrada('BALANCA')} className={`flex-1 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${modoEntrada === 'BALANCA' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                <Scale className="w-4 h-4" /> Ler Balança
              </button>
              <button onClick={() => setModoEntrada('MANUAL')} className={`flex-1 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${modoEntrada === 'MANUAL' ? 'bg-violet-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                <Keyboard className="w-4 h-4" /> Digitação Manual
              </button>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-6">
              {/* PESO BRUTO */}
              <div className="col-span-2 md:col-span-1 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-6 text-center">
                <h3 className="text-sm font-black text-emerald-400 uppercase tracking-widest mb-2">Peso Bruto</h3>
                {modoEntrada === 'BALANCA' ? (
                  <div className={`text-6xl font-black font-mono transition-colors ${statusBalanca === 'online' ? 'text-white' : 'text-slate-600'}`}>
                    {pesoRealTime.toFixed(3)} <span className="text-2xl text-emerald-500/50">KG</span>
                  </div>
                ) : (
                  <input type="number" step="0.001" value={pesoManual} onChange={e => setPesoManual(e.target.value)} className={`${inputClass} text-5xl text-emerald-400 py-4`} placeholder="0.000" />
                )}
              </div>

              {/* TARA E PEÇAS */}
              <div className="col-span-2 md:col-span-1 flex flex-col gap-4">
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 text-center flex-1 flex flex-col justify-center">
                  <h3 className="text-xs font-black text-amber-400 uppercase tracking-widest mb-2">Tara (Palete/Caixa)</h3>
                  <input type="number" step="0.001" value={tara} onChange={e => setTara(e.target.value)} className={`${inputClass} text-3xl text-amber-400 py-2`} placeholder="0.000" />
                </div>
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-4 text-center flex-1 flex flex-col justify-center">
                  <h3 className="text-xs font-black text-blue-400 uppercase tracking-widest mb-2">Qtd. Peças/Caixas *</h3>
                  <input type="number" value={quantidadePecas} onChange={e => setQuantidadePecas(e.target.value)} className={`${inputClass} text-3xl text-blue-400 py-2`} placeholder="Ex: 50" />
                </div>
              </div>
            </div>

            {/* DADOS DE RASTREABILIDADE (NOVO BLOCO) */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-6">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Calendar className="w-4 h-4" /> Dados de Rastreabilidade (Opcional)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Data de Abate</label>
                  <input type="date" value={dataAbate} onChange={e => setDataAbate(e.target.value)} className={smallInputClass} />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Data de Produção</label>
                  <input type="date" value={dataProducao} onChange={e => setDataProducao(e.target.value)} className={smallInputClass} />
                </div>
                <div>
                  <label className="block text-xs text-emerald-400 mb-1 font-bold">Validade</label>
                  <input type="date" value={validade} onChange={e => setValidade(e.target.value)} className={`${smallInputClass} border-emerald-500/30 focus:border-emerald-500/50 text-emerald-100`} />
                </div>
              </div>
            </div>

            {/* PESO LÍQUIDO */}
            <div className="bg-blue-600/20 border border-blue-500/50 rounded-2xl p-6 text-center mb-8 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-500/10 to-transparent animate-[shimmer_2s_infinite]"></div>
              <h3 className="text-sm font-black text-blue-300 uppercase tracking-widest mb-2 relative z-10">Líquido a Receber</h3>
              <div className="text-7xl font-black font-mono text-white relative z-10 drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]">
                {pesoLiquidoCalculado.toFixed(3)} <span className="text-3xl text-blue-400/50">KG</span>
              </div>
            </div>

            <button 
              onClick={handleRegistrar} 
              disabled={isBotaoDesabilitado} 
              className={`w-full py-6 rounded-2xl font-black text-2xl flex justify-center items-center gap-3 transition-all ${
                isBotaoDesabilitado ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_40px_rgba(37,99,235,0.4)]'
              }`}
            >
              {salvando ? <Loader2 className="w-8 h-8 animate-spin" /> : <Printer className="w-8 h-8" />}
              Registrar Recebimento e Imprimir
            </button>
          </div>

          {/* PAINEL DIREITO: PROGRESSO DO PEDIDO */}
          <div className="bg-[#0b1324] rounded-[30px] border border-white/10 p-6 flex flex-col shadow-[0_25px_60px_rgba(0,0,0,0.40)]">
            <h3 className="text-lg font-black text-white mb-6 border-b border-white/10 pb-4">Detalhes do Recebimento</h3>
            
            {/* INFO DO FORNECEDOR (NOVO BLOCO) */}
            <div className="mb-6 bg-white/5 border border-white/5 rounded-xl p-4">
              <div className="flex items-start gap-3 mb-3">
                <Truck className="w-5 h-5 text-slate-400 mt-0.5" />
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Fornecedor</span>
                  <span className="text-sm font-bold text-white">{itemAtual.fornecedorNome}</span>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-400 mt-0.5" />
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Inspeção Fiscal</span>
                  <span className="text-sm font-bold text-emerald-400">{itemAtual.sifCispi}</span>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <span className="text-blue-400 font-mono text-sm font-bold block mb-1">Produto Esperado</span>
              <h2 className="text-xl font-black text-white">{itemAtual.produtoNome}</h2>
            </div>

            <div className="space-y-6">
              {/* PROGRESSO PEÇAS */}
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-400 mb-2">
                  <span>Caixas/Peças</span>
                  <span className="text-white">{itemAtual.qtdPecasRecebida} / {itemAtual.qtdPecasEsperada}</span>
                </div>
                <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: `${Math.min((itemAtual.qtdPecasRecebida / itemAtual.qtdPecasEsperada) * 100, 100)}%` }}></div>
                </div>
              </div>

              {/* PROGRESSO PESO */}
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-400 mb-2">
                  <span>Peso Recebido (Catch Weight)</span>
                  <span className="text-white">{itemAtual.pesoRecebido.toFixed(3)} / {itemAtual.pesoEsperado.toFixed(3)} kg</span>
                </div>
                <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${Math.min((itemAtual.pesoRecebido / itemAtual.pesoEsperado) * 100, 100)}%` }}></div>
                </div>
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </Layout>
  );
}