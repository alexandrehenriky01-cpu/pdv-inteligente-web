import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Layout } from '../../components/Layout';
import { api } from '../../services/api';
import { TefPinpadModal } from './TefPinpadModal';
import { 
  Search, Plus, Trash2, BrainCircuit, Sparkles, 
  TrendingUp, Flame, Star, QrCode, CreditCard, Tag,
  Banknote, ArrowRight, ShieldCheck, AlertTriangle, ExternalLink,
  Loader2, Lock, Clock, ListOrdered, PauseCircle, PlayCircle, X, ShieldAlert, Key, Keyboard, Power
} from 'lucide-react';
import { AxiosError } from 'axios';
import { toast } from 'react-toastify';
import { IUsuario } from '../../types/auth';
import { useHardwareAgent } from '../../hooks/useHardwareAgent';
import { getHardwareAgent } from '../../services/hardwareAgent';
import {
  tefCancelarAutorizacaoPendente,
  tefFalhaSalvarVendaCnc,
  tefPosVendaSucessoCnc,
} from '../../services/tefCncFlow';
import { montarCupomTextoPlano } from './cupomPdvTexto';
import { PagamentoValorParcialModal } from './PagamentoValorParcialModal';
import { FechamentoCaixaModal } from './FechamentoCaixaModal';
import { parseValorMonetarioPdv, validarValorParcialPdv } from './pdvPagamentoParcialUtils';
import { parseBarcode } from '../../utils/barcodeParser';
import {
  descobrirEstacaoPorIp,
  getCaixaFiscalIdPdv,
  getEstacaoTrabalhoIdPdv,
  getNomeEstacaoExibicaoPdv,
  getTerminalFiscalPdv,
  montarUrlVerificarCaixa,
  persistirContextoPosAberturaCaixa,
  persistirTerminalFiscalPdv,
} from '../../utils/estacaoWorkstationStorage';

export interface IProdutoPDV {
  id: string;
  nome: string;
  codigo?: string; // 🚀 ADICIONADO: O nosso novo Código Curto
  codigoBarras: string;
  precoVenda: number | string; 
  precoCusto?: number | string; 
  estoqueAtual?: number;
  cst_csosn?: string; 
  cstCsosn?: string;
  ncm?: string; 
  cfop?: string;
  cfopPadrao?: string;
}

export interface IItemCarrinho extends IProdutoPDV {
  quantidade: number;
  subtotal: number;
  /** Preço unitário da tabela de preços (base antes do motor de promoções). */
  precoUnitarioBase?: number;
  promocaoAplicada?: boolean;
  promocaoResumo?: string;
}

export interface IClientePDV {
  id: string;
  razaoSocial: string;
  cnpjCpf: string;
  limiteCredito?: number;
  prazoPadrao?: number;
  cep?: string;        
  logradouro?: string; 
  numero?: string;     
}

export interface IUsuarioStorage extends Omit<IUsuario, 'loja'> {
  loja?: {
    regimeTributario?: string;
    modulosAtivos?: string[];
    nome?: string;
    [key: string]: unknown;
  }
}

export interface IPayloadVendaPDV {
  sessaoCaixaId: string; 
  clienteId?: string;
  terminal?: string;
  estacaoTrabalhoId?: string;
  caixaFiscalId?: string;
  itens: Array<{
    produtoId: string;
    quantidade: number;
    valorUnitario: number;
  }>;
  pagamentos: Array<{
    tipoPagamento: string;
    valor: number;
    transacaoTefId?: string;
    /** POS = manual; TEF = PinPad — usado no ERP para escolher adquirente do caixa. */
    canalAdquirente?: 'POS' | 'TEF';
    parcelas?: Array<{ numero: number; valor: number; vencimento: string }>;
  }>;
  tipoPagamento: string;
  formaPagamento: string;
  valorTotal: number;
  valorDesconto: number; 
  modeloNota: string;
  parcelas?: Array<{
    numero: number;
    valor: number;
    vencimento: string;
  }>;
  /** Comprovante SiTef filtrado (agente); usado no pacote único de impressão pós-NFC-e. */
  comprovanteTefLimpo?: string;
}

/** Linha já confirmada (pagamento parcial / misto) antes de finalizar a venda. */
export interface LinhaPagamentoCaixaAcumulada {
  id: string;
  tipoPagamentoApi: string;
  valor: number;
  transacaoTefId?: string;
  canalAdquirente?: 'POS' | 'TEF';
  parcelas?: IPayloadVendaPDV['parcelas'];
}

export interface ISessaoCaixa {
  id: string;
  status: string;
  saldoAbertura: number;
  dataAbertura: string;
  /** Identificador fiscal da sessão (ex.: nome do caixa na estação) — gravado pelo backend na abertura. */
  terminal?: string | null;
}

export type FormaPagamentoPDV =
  | 'PIX'
  | 'CARTAO_DEBITO'
  | 'CARTAO_CREDITO'
  | 'DINHEIRO'
  | 'CREDIARIO'
  | 'CARTAO_CREDITO_TEF'
  | 'CARTAO_DEBITO_TEF';

type AlvoModalPagamentoParcialCaixa =
  | { kind: 'sem_tef'; forma: Exclude<FormaPagamentoPDV, 'CARTAO_CREDITO_TEF' | 'CARTAO_DEBITO_TEF'> }
  | { kind: 'tef'; cartao: 'CREDITO' | 'DEBITO' };

function novoIdLinhaPdv(): string {
  if (
    typeof globalThis.crypto !== 'undefined' &&
    typeof globalThis.crypto.randomUUID === 'function'
  ) {
    return globalThis.crypto.randomUUID();
  }
  return `pdv-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/** Query obrigatória do PDV: origem=PDV força resolução estrita de preço na API (sem preço legado). */
function montarQueryProdutos(busca?: string, codigoBalanca?: number): string {
  const q = new URLSearchParams();
  q.set('origem', 'PDV');
  if (codigoBalanca !== undefined && Number.isFinite(codigoBalanca)) {
    q.set('codigoBalanca', String(Math.trunc(codigoBalanca)));
  }
  if (busca !== undefined && busca.trim() !== '') {
    q.set('busca', busca.trim());
  }
  const est = getEstacaoTrabalhoIdPdv();
  if (est) {
    q.set('estacaoTrabalhoId', est);
  }
  return `?${q.toString()}`;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export interface AdicionarItemPdvOpts {
  /** Etiqueta de balança: quantidade em kg e subtotal = valor da etiqueta. */
  linhaBalcao?: { kg: number; valorTotalReais: number };
}

/** Bip curto de erro (Web Audio API) — falha silenciosa se o navegador bloquear áudio. */
function tocarSomErroPdv(): void {
  try {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AC();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 220;
    osc.type = 'sawtooth';
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.22);
    ctx.resume?.().catch(() => undefined);
  } catch {
    /* sem áudio */
  }
}

export interface IVendaPendente {
  id: string;
  nomeCliente: string;
  valorTotal: number;
  createdAt: string;
  itens: Array<{
    produtoId: string;
    quantidade: number;
    valorUnitario: number;
    valorTotal: number;
    produto: { nome: string; codigoBarras: string; codigo?: string };
  }>;
}

type PdvEstacaoDiscovery = 'ready' | 'loading' | 'unknown_ip' | 'erro_rede';

export function FrenteCaixa() {
  const [estacaoDiscovery, setEstacaoDiscovery] = useState<PdvEstacaoDiscovery>(() =>
    getEstacaoTrabalhoIdPdv() ? 'ready' : 'loading'
  );

  useEffect(() => {
    if (getEstacaoTrabalhoIdPdv()) {
      setEstacaoDiscovery('ready');
      return;
    }
    let cancelled = false;
    void (async () => {
      const r = await descobrirEstacaoPorIp(api);
      if (cancelled) return;
      if (r === 'ja_configurado' || r === 'descoberto') setEstacaoDiscovery('ready');
      else if (r === 'nao_cadastrado') setEstacaoDiscovery('unknown_ip');
      else setEstacaoDiscovery('erro_rede');
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const tentarDescobrirEstacaoNovamente = () => {
    setEstacaoDiscovery('loading');
    void (async () => {
      const r = await descobrirEstacaoPorIp(api);
      if (r === 'ja_configurado' || r === 'descoberto') setEstacaoDiscovery('ready');
      else if (r === 'nao_cadastrado') setEstacaoDiscovery('unknown_ip');
      else setEstacaoDiscovery('erro_rede');
    })();
  };

  /** Sem estação resolvida (IP + retaguarda) = PDV bloqueado. */
  const pdvTerminalBloqueado = estacaoDiscovery !== 'ready';

  const [busca, setBusca] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [produtosFiltrados, setProdutosFiltrados] = useState<IProdutoPDV[]>([]);
  const [carrinho, setCarrinho] = useState<IItemCarrinho[]>([]);
  
  const [linhasPagamento, setLinhasPagamento] = useState<LinhaPagamentoCaixaAcumulada[]>([]);
  const [modalParcialAberto, setModalParcialAberto] = useState(false);
  const [alvoModalParcial, setAlvoModalParcial] = useState<AlvoModalPagamentoParcialCaixa | null>(
    null
  );
  const [campoValorParcial, setCampoValorParcial] = useState('');
  const [erroModalParcial, setErroModalParcial] = useState<string | null>(null);
  const [modalPinpadTef, setModalPinpadTef] = useState(false);
  const [tefCarregando, setTefCarregando] = useState(false);
  const [tefErroModal, setTefErroModal] = useState<string | null>(null);
  const [tefStatusMensagem, setTefStatusMensagem] = useState<string | null>(null);
  const [finalizando, setFinalizando] = useState(false);
  const [descontoVenda, setDescontoVenda] = useState<number>(0); 
  const [valorDescontoInput, setValorDescontoInput] = useState<string>('');
  
  const [modeloNota, setModeloNota] = useState('65'); 
  const [clienteSelecionado, setClienteSelecionado] = useState('');
  const [clientes, setClientes] = useState<IClientePDV[]>([]);
  const [qtdParcelas, setQtdParcelas] = useState(1);
  
  const [sugestoes, setSugestoes] = useState<IProdutoPDV[]>([]);
  const [upsellProduto, setUpsellProduto] = useState<IProdutoPDV | null>(null);

  const [sessaoCaixa, setSessaoCaixa] = useState<ISessaoCaixa | null>(null);
  const [modalCaixaAberto, setModalCaixaAberto] = useState(false);
  const [fundoTroco, setFundoTroco] = useState('');
  const [abrindoCaixa, setAbrindoCaixa] = useState(false);
  
  const [modalFechamento, setModalFechamento] = useState(false);

  const [modalVendasEspera, setModalVendasEspera] = useState(false);
  const [vendasPendentes, setVendasPendentes] = useState<IVendaPendente[]>([]);
  const [carregandoPendentes, setCarregandoPendentes] = useState(false);
  const [pausandoVenda, setPausandoVenda] = useState(false);

  const [modalSupervisor, setModalSupervisor] = useState(false);
  const [senhaSupervisor, setSenhaSupervisor] = useState('');
  const [acaoPendente, setAcaoPendente] = useState<(() => void) | null>(null);
  const [validandoSupervisor, setValidandoSupervisor] = useState(false);

  const [terminalAtivo, setTerminalAtivo] = useState<string>(() => {
    const nome = getNomeEstacaoExibicaoPdv();
    const term = getTerminalFiscalPdv();
    return nome?.trim() || term?.trim() || 'Carregando...';
  });

  const buscaInputRef = useRef<HTMLInputElement>(null);
  const senhaSupervisorRef = useRef<HTMLInputElement>(null);
  const tefWsUnsubRef = useRef<(() => void) | null>(null);
  const tefComprovanteLimpoRef = useRef<string | null>(null);
  const tefComprovantePorTidRef = useRef<Map<string, string>>(new Map());
  const carrinhoRef = useRef<IItemCarrinho[]>([]);
  const calcPromoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [recalculandoPromocoes, setRecalculandoPromocoes] = useState(false);
  const [resumoPromo, setResumoPromo] = useState<{
    totalBruto: number;
    totalDescontoPromocoes: number;
    totalLiquido: number;
  } | null>(null);

  const { connected: hardwareConectado, send: enviarHardware } = useHardwareAgent();

  let regimeLoja = 'LUCRO_PRESUMIDO';
  let nomeOperador = 'Operador';
  let nomeLojaPdV = 'Loja';
  try {
    const usuarioRaw = localStorage.getItem('@PDVUsuario');
    if (usuarioRaw) {
      const usuario = JSON.parse(usuarioRaw) as IUsuarioStorage;
      if (usuario.loja?.regimeTributario) regimeLoja = usuario.loja.regimeTributario;
      if (usuario.nome) nomeOperador = usuario.nome;
      const lojaExtra = usuario.loja as Record<string, unknown> | undefined;
      const nome = lojaExtra?.nome ?? lojaExtra?.razaoSocial;
      if (typeof nome === 'string' && nome.trim()) nomeLojaPdV = nome.trim();
    }
  } catch (e) {
    console.error("Erro ao ler dados do usuário no PDV");
  }

  useEffect(() => {
    if (pdvTerminalBloqueado) {
      setTerminalAtivo('—');
      return;
    }
    const nome = getNomeEstacaoExibicaoPdv()?.trim();
    const term = getTerminalFiscalPdv()?.trim();
    setTerminalAtivo(nome || term || 'Estação identificada — abra o caixa');
  }, [pdvTerminalBloqueado, estacaoDiscovery]);

  useEffect(() => {
    if (pdvTerminalBloqueado) return;
    verificarCaixa();
    carregarClientes();
    carregarProdutosEstrategicos();
  }, [pdvTerminalBloqueado]);

  useEffect(() => {
    return () => {
      tefWsUnsubRef.current?.();
      tefWsUnsubRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (modalSupervisor) {
      setTimeout(() => senhaSupervisorRef.current?.focus(), 100);
    }
  }, [modalSupervisor]);

  carrinhoRef.current = carrinho;

  const assinaturaCarrinhoPromo = useMemo(
    () =>
      JSON.stringify(
        carrinho.map((i) => ({
          id: i.id,
          q: i.quantidade,
          b: round2(Number(i.precoUnitarioBase ?? i.precoVenda)),
        }))
      ),
    [carrinho]
  );

  useEffect(() => {
    if (pdvTerminalBloqueado) {
      if (calcPromoTimerRef.current) {
        clearTimeout(calcPromoTimerRef.current);
        calcPromoTimerRef.current = null;
      }
      setResumoPromo(null);
      return;
    }

    if (calcPromoTimerRef.current) {
      clearTimeout(calcPromoTimerRef.current);
      calcPromoTimerRef.current = null;
    }

    if (carrinhoRef.current.length === 0) {
      setResumoPromo(null);
      return;
    }

    calcPromoTimerRef.current = setTimeout(async () => {
      calcPromoTimerRef.current = null;
      setRecalculandoPromocoes(true);
      try {
        const atual = carrinhoRef.current;
        const payload = {
          clienteId: clienteSelecionado || undefined,
          itens: atual.map((item) => ({
            produtoId: item.id,
            quantidade: item.quantidade,
            precoUnitarioBase: round2(Number(item.precoUnitarioBase ?? item.precoVenda)),
          })),
        };
        const { data } = await api.post<{
          sucesso: boolean;
          dados?: {
            itens: Array<{
              produtoId: string;
              precoUnitarioBase: number;
              precoUnitarioFinal: number;
              subtotal: number;
              promocaoAplicada: boolean;
              campanhaNome?: string;
              regraTipo?: string;
            }>;
            totalBruto: number;
            totalDescontoPromocoes: number;
            totalLiquido: number;
          };
          erro?: string;
        }>('/api/vendas/calcular-carrinho', payload);

        if (!data.sucesso || !data.dados) {
          throw new Error(data.erro || 'Falha ao calcular promoções.');
        }

        setResumoPromo({
          totalBruto: data.dados.totalBruto,
          totalDescontoPromocoes: data.dados.totalDescontoPromocoes,
          totalLiquido: data.dados.totalLiquido,
        });

        setCarrinho((prev) =>
          prev.map((item) => {
            const hit = data.dados!.itens.find((i) => i.produtoId === item.id);
            if (!hit) return item;
            const resumo =
              hit.promocaoAplicada && (hit.campanhaNome || hit.regraTipo)
                ? [hit.campanhaNome, hit.regraTipo].filter(Boolean).join(' · ')
                : undefined;
            return {
              ...item,
              precoUnitarioBase: hit.precoUnitarioBase,
              precoVenda: hit.precoUnitarioFinal,
              subtotal: hit.subtotal,
              promocaoAplicada: hit.promocaoAplicada,
              promocaoResumo: resumo,
            };
          })
        );
      } catch (e) {
        console.error('calcular-carrinho:', e);
        setResumoPromo(null);
        setCarrinho((prev) =>
          prev.map((item) => {
            const base = round2(Number(item.precoUnitarioBase ?? item.precoVenda));
            return {
              ...item,
              precoVenda: base,
              subtotal: round2(item.quantidade * base),
              promocaoAplicada: false,
              promocaoResumo: undefined,
            };
          })
        );
      } finally {
        setRecalculandoPromocoes(false);
      }
    }, 300);

    return () => {
      if (calcPromoTimerRef.current) {
        clearTimeout(calcPromoTimerRef.current);
        calcPromoTimerRef.current = null;
      }
    };
  }, [assinaturaCarrinhoPromo, clienteSelecionado, pdvTerminalBloqueado]);

  useEffect(() => {
    setLinhasPagamento([]);
    tefComprovantePorTidRef.current = new Map();
    tefComprovanteLimpoRef.current = null;
    setModalParcialAberto(false);
    setAlvoModalParcial(null);
    setCampoValorParcial('');
    setErroModalParcial(null);
  }, [assinaturaCarrinhoPromo, descontoVenda]);

  const verificarCaixa = async () => {
    try {
      const urlVerificar = montarUrlVerificarCaixa() ?? '/api/pdv/caixa/verificar';
      const response = await api.get<ISessaoCaixa | null>(urlVerificar);
      if (response.data) {
        setSessaoCaixa(response.data);
        const term = response.data.terminal?.trim();
        if (term) {
          persistirTerminalFiscalPdv(term);
          const label = getNomeEstacaoExibicaoPdv()?.trim();
          setTerminalAtivo(label || term);
        }
        buscaInputRef.current?.focus();
      } else {
        setModalCaixaAberto(true); 
      }
    } catch (error) {
      console.error("Erro ao verificar caixa:", error);
    }
  };

  const abrirCaixa = async () => {
    if (!fundoTroco || isNaN(Number(fundoTroco))) return alert("Informe um valor válido para o Fundo de Troco.");
    const estId = getEstacaoTrabalhoIdPdv()?.trim();
    if (!estId) {
      return alert(
        'Estação de trabalho não identificada neste terminal. Cadastre o IP em Estações de Trabalho ou abra o turno pela Gestão de Caixas e Turnos neste mesmo navegador.'
      );
    }
    setAbrindoCaixa(true);
    try {
      const response = await api.post<ISessaoCaixa>('/api/pdv/caixa/abrir-manual', {
        estacaoTrabalhoId: estId,
        saldoAbertura: Number(fundoTroco),
        observacao: 'Abertura PDV — terminal vinculado à estação',
      });
      const term = response.data?.terminal?.trim() ?? '';
      if (term) {
        persistirContextoPosAberturaCaixa({
          estacaoTrabalhoId: estId,
          nomeEstacao: getNomeEstacaoExibicaoPdv(),
          caixaFiscalId: getCaixaFiscalIdPdv(),
          terminalResolvido: term,
          sessaoCaixaId: response.data?.id,
        });
        const label = getNomeEstacaoExibicaoPdv()?.trim();
        setTerminalAtivo(label || term);
      }
      setSessaoCaixa(response.data);
      setModalCaixaAberto(false);
      setFundoTroco('');
      buscaInputRef.current?.focus();
    } catch (err) {
      const error = err as AxiosError<{error?: string}>;
      alert(error.response?.data?.error || "Erro ao abrir o caixa.");
    } finally {
      setAbrindoCaixa(false);
    }
  };

  const solicitarFechamentoCaixa = () => {
    if (carrinho.length > 0) {
      return alert("Você possui itens no carrinho! Finalize, pause ou cancele a venda atual antes de fechar o caixa.");
    }
    setModalFechamento(true);
  };

  const solicitarAutorizacao = (acao: () => void) => {
    setAcaoPendente(() => acao);
    setSenhaSupervisor('');
    setModalSupervisor(true);
  };

  const autorizarAcao = async () => {
    if (!senhaSupervisor) return;
    setValidandoSupervisor(true);
    try {
      await api.post('/api/usuarios/validar-supervisor', { senha: senhaSupervisor });
      setModalSupervisor(false);
      if (acaoPendente) acaoPendente();
      setAcaoPendente(null);
      buscaInputRef.current?.focus();
    } catch (err) {
      const error = err as AxiosError<{error?: string}>;
      alert(error.response?.data?.error || "❌ Senha incorreta ou usuário sem permissão de Supervisor.");
      setSenhaSupervisor('');
      senhaSupervisorRef.current?.focus();
    } finally {
      setValidandoSupervisor(false);
    }
  };

  const pausarVendaSegura = () => {
    if (carrinho.length === 0) return alert("O carrinho está vazio.");
    solicitarAutorizacao(executarPausarVenda);
  };

  const executarPausarVenda = async () => {
    if (!sessaoCaixa) return;
    setPausandoVenda(true);
    try {
      const nomeCli = clienteSelecionado 
        ? clientes.find(c => c.id === clienteSelecionado)?.razaoSocial 
        : prompt("Nome do cliente para identificar esta venda na fila:");
      
      if (!nomeCli && !clienteSelecionado) {
         setPausandoVenda(false);
         return; 
      }

      await api.post('/api/pdv/vendas/pausar', {
        sessaoCaixaId: sessaoCaixa.id,
        nomeCliente: nomeCli,
        valorTotal: totais.totalVenda,
        itens: carrinho.map(item => ({
          produtoId: item.id,
          quantidade: item.quantidade,
          valorUnitario: Number(item.precoVenda),
          valorTotal: item.subtotal
        }))
      });

      setCarrinho([]);
      setBusca('');
      setClienteSelecionado('');
      setLinhasPagamento([]);
      tefComprovantePorTidRef.current = new Map();
      setDescontoVenda(0);
      setValorDescontoInput('');
      alert("✅ Venda colocada em espera!");
      buscaInputRef.current?.focus();
    } catch (err) {
      const error = err as AxiosError<{error?: string}>;
      alert(error.response?.data?.error || "Erro ao pausar a venda.");
    } finally {
      setPausandoVenda(false);
    }
  };

  const removerDoCarrinhoSeguro = (id: string) => {
    solicitarAutorizacao(() => {
      setCarrinho(prev => prev.filter(item => item.id !== id));
      if (carrinho.length === 1) {
        setDescontoVenda(0); 
        setValorDescontoInput('');
      }
    });
  };

  const alterarQuantidadeSeguro = (id: string, delta: number) => {
    if (delta < 0) {
      solicitarAutorizacao(() => executaAlterarQuantidade(id, delta));
    } else {
      executaAlterarQuantidade(id, delta);
    }
  };

  const executaAlterarQuantidade = (id: string, delta: number) => {
    setCarrinho(prev => prev.map(item => {
      if (item.id === id) {
        const novaQuantidade = item.quantidade + delta;
        if (novaQuantidade <= 0) return item; 
        const base = round2(Number(item.precoUnitarioBase ?? item.precoVenda));
        return {
          ...item,
          quantidade: novaQuantidade,
          precoUnitarioBase: item.precoUnitarioBase ?? base,
          subtotal: round2(novaQuantidade * base),
        };
      }
      return item;
    }));
  };

  const aplicarDescontoSeguro = () => {
    if (carrinho.length === 0) return alert("Adicione itens ao carrinho primeiro.");
    if (!valorDescontoInput) return alert("Digite um valor para o desconto.");
    
    const valorNum = Number(valorDescontoInput.replace(',', '.'));
    if (isNaN(valorNum) || valorNum <= 0) return alert("Valor de desconto inválido.");
    const liquidoAntesManual =
      resumoPromo !== null
        ? resumoPromo.totalLiquido
        : round2(carrinho.reduce((s, i) => s + Number(i.subtotal), 0));
    if (valorNum >= liquidoAntesManual) {
      return alert('O desconto não pode ser maior ou igual ao total da venda (após promoções).');
    }

    solicitarAutorizacao(() => {
      setDescontoVenda(valorNum);
      setValorDescontoInput(''); 
    });
  };

  const abrirFilaDeEspera = async () => {
    if (!sessaoCaixa) return;
    setModalVendasEspera(true);
    setCarregandoPendentes(true);
    try {
      const response = await api.get<IVendaPendente[]>(`/api/pdv/vendas/pendentes?sessaoCaixaId=${sessaoCaixa.id}`);
      setVendasPendentes(response.data);
    } catch (error) {
      console.error("Erro ao carregar fila:", error);
    } finally {
      setCarregandoPendentes(false);
    }
  };

  const resgatarVenda = async (vendaId: string) => {
    try {
      const response = await api.post(`/api/pdv/vendas/${vendaId}/resgatar`);
      const vendaResgatada = response.data;

      const novoCarrinho: IItemCarrinho[] = vendaResgatada.itens.map((item: any) => {
        const vu = Number(item.valorUnitario);
        const q = Number(item.quantidade);
        return {
          id: item.produtoId,
          nome: item.produto.nome,
          codigo: item.produto.codigo,
          codigoBarras: item.produto.codigoBarras,
          precoUnitarioBase: vu,
          precoVenda: vu,
          precoCusto: vu * 0.6,
          quantidade: q,
          subtotal: Number(item.valorTotal),
        };
      });

      setCarrinho(novoCarrinho);
      setDescontoVenda(0); 
      setValorDescontoInput('');
      setModalVendasEspera(false);
      alert(`✅ Venda de ${vendaResgatada.nomeCliente} resgatada com sucesso!`);
      buscaInputRef.current?.focus();
    } catch (err) {
      const error = err as AxiosError<{error?: string}>;
      alert(error.response?.data?.error || "Erro ao resgatar a venda.");
    }
  };

  const carregarClientes = async () => {
    try {
      const response = await api.get<IClientePDV[]>('/api/cadastros/pessoas');
      setClientes(response.data);
    } catch (err) {
      console.error("Erro ao buscar clientes", err);
    }
  };

  const carregarProdutosEstrategicos = async () => {
    try {
      const response = await api.get<IProdutoPDV[]>(`/api/cadastros/produtos${montarQueryProdutos()}`);
      if (response.data && response.data.length > 0) {
        setSugestoes(response.data.slice(0, 3));
        setUpsellProduto(response.data.length > 3 ? response.data[3] : response.data[0]); 
      }
    } catch (err) {
      console.error("Erro ao carregar produtos estratégicos:", err);
    }
  };

  // 🚀 BUSCA INTELIGENTE MANTIDA PARA AUTO-COMPLETE
  useEffect(() => {
    if (pdvTerminalBloqueado) {
      setProdutosFiltrados([]);
      return;
    }
    if (busca.length > 2) {
      const buscarProdutos = async () => {
        try {
          const response = await api.get<IProdutoPDV[]>(
            `/api/cadastros/produtos${montarQueryProdutos(busca)}`
          );
          setProdutosFiltrados(response.data);
        } catch (err) {
          console.error("Erro ao buscar produtos", err);
        }
      };
      buscarProdutos();
    } else {
      setProdutosFiltrados([]);
    }
  }, [busca, pdvTerminalBloqueado]);

  const adicionarAoCarrinho = (produto: IProdutoPDV, opts?: AdicionarItemPdvOpts) => {
    if (pdvTerminalBloqueado) return;

    const precoVendaNum = Number(produto.precoVenda) || 0;
    if (precoVendaNum <= 0) {
      toast.error(
        'ERRO: Produto não encontrado na Tabela de Preços vigente. Solicite atualização ao gerente.',
        { autoClose: 8000, className: 'border-l-4 border-red-500' }
      );
      tocarSomErroPdv();
      return;
    }

    const balcao = opts?.linhaBalcao;
    if (balcao) {
      const kg = round3(balcao.kg);
      const subEtiqueta = round2(balcao.valorTotalReais);
      if (kg <= 0 || subEtiqueta <= 0) {
        toast.error('Etiqueta de balança inválida (peso/valor).', {
          autoClose: 6000,
          className: 'border-l-4 border-red-500',
        });
        tocarSomErroPdv();
        return;
      }
    }

    const precoCustoNum = produto.precoCusto ? Number(produto.precoCusto) : precoVendaNum * 0.6;
    const precoCustoPorKg =
      produto.precoCusto && Number(produto.precoCusto) > 0
        ? Number(produto.precoCusto)
        : precoVendaNum * 0.6;

    setCarrinho((prev) => {
      const existe = prev.find((item) => item.id === produto.id);
      if (balcao) {
        const kg = round3(balcao.kg);
        const subEtiqueta = round2(balcao.valorTotalReais);
        const base = round2(Number(existe?.precoUnitarioBase ?? precoVendaNum));
        if (existe) {
          const novaQ = round3(existe.quantidade + kg);
          const novoSub = round2(existe.subtotal + subEtiqueta);
          return prev.map((item) =>
            item.id === produto.id
              ? {
                  ...item,
                  quantidade: novaQ,
                  precoUnitarioBase: base,
                  precoVenda: base,
                  subtotal: novoSub,
                }
              : item
          );
        }
        return [
          ...prev,
          {
            ...produto,
            precoUnitarioBase: precoVendaNum,
            precoVenda: precoVendaNum,
            precoCusto: precoCustoPorKg,
            quantidade: kg,
            subtotal: subEtiqueta,
          },
        ];
      }
      if (existe) {
        const base = round2(Number(existe.precoUnitarioBase ?? precoVendaNum));
        return prev.map((item) =>
          item.id === produto.id
            ? {
                ...item,
                quantidade: item.quantidade + 1,
                precoUnitarioBase: base,
                subtotal: round2((item.quantidade + 1) * base),
              }
            : item
        );
      }
      return [
        ...prev,
        {
          ...produto,
          precoUnitarioBase: precoVendaNum,
          precoVenda: precoVendaNum,
          precoCusto: precoCustoNum,
          quantidade: 1,
          subtotal: precoVendaNum,
        },
      ];
    });
    setBusca('');
    setProdutosFiltrados([]); // Limpa a lista
    buscaInputRef.current?.focus();
  };

  // 🚀 NOVA LÓGICA DE ENTER: FORÇA A BUSCA DE CÓDIGOS CURTOS (EX: "5", "01")
  const handleKeyDownBusca = async (e: KeyboardEvent<HTMLInputElement>) => {
    if (pdvTerminalBloqueado) return;
    if (e.key === 'Enter' && busca.trim().length > 0) {
      e.preventDefault();

      const rawBusca = busca.trim();
      const parsed = parseBarcode(rawBusca);

      if (parsed.isBalanca) {
        try {
          const response = await api.get<IProdutoPDV[]>(
            `/api/cadastros/produtos${montarQueryProdutos(undefined, parsed.codigoBalanca)}`
          );
          if (response.data.length !== 1) {
            alert(
              response.data.length === 0
                ? `Nenhum produto com código na balança ${parsed.codigoBalanca}.`
                : `Vários produtos para código na balança ${parsed.codigoBalanca} — cadastro duplicado.`
            );
            setBusca('');
            return;
          }
          const p = response.data[0];
          const precoKg = Number(p.precoVenda) || 0;
          if (precoKg <= 0) {
            toast.error('Produto sem preço/kg na tabela vigente.', {
              autoClose: 8000,
              className: 'border-l-4 border-red-500',
            });
            tocarSomErroPdv();
            setBusca('');
            return;
          }
          const kg = round3(parsed.valorTotal / precoKg);
          adicionarAoCarrinho(p, {
            linhaBalcao: { kg, valorTotalReais: parsed.valorTotal },
          });
        } catch (err) {
          console.error('Erro na busca por código de balança:', err);
        }
        return;
      }

      // Se já buscou e tem 1 resultado na tela, adiciona ele
      if (produtosFiltrados.length === 1) {
        adicionarAoCarrinho(produtosFiltrados[0]);
        return;
      }

      // Se não, força uma busca exata na API (ideal para código curto ou leitor de código de barras rápido)
      try {
        const response = await api.get<IProdutoPDV[]>(
          `/api/cadastros/produtos${montarQueryProdutos(rawBusca)}`
        );

        // Procura match exato pelo novo 'codigo' ou 'codigoBarras'
        const matchExato = response.data.find(
          (p) => p.codigo === rawBusca || p.codigoBarras === rawBusca
        );

        if (matchExato) {
          adicionarAoCarrinho(matchExato);
        } else if (response.data.length === 1) {
          adicionarAoCarrinho(response.data[0]);
        } else if (response.data.length > 1) {
          setProdutosFiltrados(response.data); // Abre a lista para o usuário escolher
        } else {
          alert(`Nenhum produto encontrado com o código "${rawBusca}".`);
          setBusca('');
        }
      } catch (err) {
        console.error('Erro na busca forçada:', err);
      }
    }
  };

  const totaisBrutos = carrinho.reduce(
    (acc, item) => {
      const baseLinha = round2(Number(item.precoUnitarioBase ?? item.precoVenda) * item.quantidade);
      const custo = Number(item.precoCusto) * item.quantidade;
      return { totalVenda: acc.totalVenda + baseLinha, totalCusto: acc.totalCusto + custo };
    },
    { totalVenda: 0, totalCusto: 0 }
  );

  const liquidoPosPromo =
    resumoPromo !== null
      ? resumoPromo.totalLiquido
      : round2(carrinho.reduce((s, i) => s + Number(i.subtotal), 0));

  const totais = {
    totalVenda: Math.max(0, liquidoPosPromo - descontoVenda),
    totalCusto: totaisBrutos.totalCusto,
  };

  const lucroReal = totais.totalVenda - totais.totalCusto;

  const totalPagoLinhas = round2(linhasPagamento.reduce((acc, l) => acc + l.valor, 0));
  const valorRestante = round2(Math.max(0, totais.totalVenda - totalPagoLinhas));

  const clienteAtual = clientes.find(c => c.id === clienteSelecionado);
  const errosFiscais: { id: string; tipo: string; mensagem: string; acao: () => void; textoAcao: string }[] = [];

  if (modeloNota === '55') {
    if (!clienteAtual) {
      errosFiscais.push({
        id: 'cliente_ausente',
        tipo: 'Cliente Ausente',
        mensagem: 'Para emitir NF-e (Modelo 55), é obrigatório selecionar um cliente.',
        acao: () => document.getElementById('select-cliente')?.focus(),
        textoAcao: 'Selecionar Cliente'
      });
    }
  }

  carrinho.forEach(item => {
    const codTributario = item.cstCsosn || item.cst_csosn || ''; 
    if (regimeLoja !== 'SIMPLES_NACIONAL' && codTributario.length === 3) {
      errosFiscais.push({
        id: `trib_${item.id}`,
        tipo: 'Tributação Incompatível',
        mensagem: `O produto "${item.nome}" usa CSOSN (${codTributario}), mas a loja é Regime Normal.`,
        acao: () => window.open(`/produtos?busca=${encodeURIComponent(item.nome)}`, '_blank'),
        textoAcao: `Corrigir Imposto`
      });
    }
  });

  const bloqueioFiscal = errosFiscais.length > 0;

  const gerarParcelas = (total: number, parcelas: number) => {
    const arrayParcelas = [];
    const valorParcela = Number((total / parcelas).toFixed(2));
    const valorUltimaParcela = total - (valorParcela * (parcelas - 1));

    for (let i = 1; i <= parcelas; i++) {
      const dataVencimento = new Date();
      dataVencimento.setDate(dataVencimento.getDate() + (i * 30)); 
      arrayParcelas.push({
        numero: i,
        valor: i === parcelas ? Number(valorUltimaParcela.toFixed(2)) : valorParcela,
        vencimento: dataVencimento.toISOString().split('T')[0]
      });
    }
    return arrayParcelas;
  };

  const resolveTipoPagamentoApi = (f: FormaPagamentoPDV): string => {
    if (f === 'CARTAO_CREDITO_TEF') return 'CARTAO_CREDITO';
    if (f === 'CARTAO_DEBITO_TEF') return 'CARTAO_DEBITO';
    return f;
  };

  const rotuloFormaPdv = (tipoApi: string): string => {
    const m: Record<string, string> = {
      PIX: 'PIX',
      CARTAO_DEBITO: 'Débito',
      CARTAO_CREDITO: 'Crédito',
      DINHEIRO: 'Dinheiro',
      CREDIARIO: 'Crediário',
    };
    return m[tipoApi] ?? tipoApi;
  };

  const abrirModalPagamentoParcial = (alvo: AlvoModalPagamentoParcialCaixa) => {
    if (carrinho.length === 0) {
      alert('Adicione itens ao carrinho.');
      return;
    }
    if (bloqueioFiscal) {
      alert('Corrija as pendências fiscais antes de receber.');
      return;
    }
    const totalPago = round2(linhasPagamento.reduce((s, l) => s + l.valor, 0));
    const vr = round2(Math.max(0, totais.totalVenda - totalPago));
    if (vr <= 0) {
      toast.info('Total já coberto. Finalize a venda (F10) ou remova uma linha.');
      return;
    }
    setAlvoModalParcial(alvo);
    setCampoValorParcial(vr.toFixed(2));
    setErroModalParcial(null);
    if (alvo.kind === 'sem_tef' && alvo.forma !== 'CREDIARIO') setQtdParcelas(1);
    setModalParcialAberto(true);
  };

  const fecharModalPagamentoParcial = () => {
    setModalParcialAberto(false);
    setAlvoModalParcial(null);
    setCampoValorParcial('');
    setErroModalParcial(null);
  };

  const adicionarLinhaSemTefConfirmada = (
    forma: Exclude<FormaPagamentoPDV, 'CARTAO_CREDITO_TEF' | 'CARTAO_DEBITO_TEF'>,
    valor: number
  ) => {
    const tipoApi = resolveTipoPagamentoApi(forma);
    let parcelas: IPayloadVendaPDV['parcelas'] | undefined;
    if (forma === 'CREDIARIO' && qtdParcelas > 0) {
      parcelas = gerarParcelas(valor, qtdParcelas);
    } else if (forma === 'CARTAO_CREDITO') {
      parcelas = gerarParcelas(valor, 1);
    }
    const canalAdquirente: 'POS' | undefined =
      forma === 'CARTAO_CREDITO' || forma === 'CARTAO_DEBITO' ? 'POS' : undefined;
    setLinhasPagamento((prev) => [
      ...prev,
      {
        id: novoIdLinhaPdv(),
        tipoPagamentoApi: tipoApi,
        valor,
        ...(canalAdquirente ? { canalAdquirente } : {}),
        ...(parcelas ? { parcelas } : {}),
      },
    ]);
    toast.success(`${rotuloFormaPdv(tipoApi)}: R$ ${valor.toFixed(2)} lançado.`);
  };

  const confirmarModalPagamentoParcial = () => {
    if (!alvoModalParcial) return;
    const totalPago = round2(linhasPagamento.reduce((s, l) => s + l.valor, 0));
    const vr = round2(Math.max(0, totais.totalVenda - totalPago));
    const parsed = parseValorMonetarioPdv(campoValorParcial);
    if (parsed === null) {
      setErroModalParcial('Valor inválido.');
      return;
    }
    const msgVal = validarValorParcialPdv(parsed, vr);
    if (msgVal) {
      setErroModalParcial(msgVal);
      return;
    }
    const valor = round2(parsed);

    if (alvoModalParcial.kind === 'sem_tef') {
      adicionarLinhaSemTefConfirmada(alvoModalParcial.forma, valor);
      fecharModalPagamentoParcial();
      return;
    }

    fecharModalPagamentoParcial();
    void solicitarTefPinpad(alvoModalParcial.cartao, valor);
  };

  const removerLinhaPagamento = (id: string) => {
    const linha = linhasPagamento.find((l) => l.id === id);
    if (linha?.transacaoTefId) {
      void tefCancelarAutorizacaoPendente(linha.transacaoTefId).catch(() => undefined);
      tefComprovantePorTidRef.current.delete(linha.transacaoTefId);
    }
    setLinhasPagamento((prev) => prev.filter((l) => l.id !== id));
  };

  const solicitarTefPinpad = async (tipoCartao: 'CREDITO' | 'DEBITO', valorTransacao: number) => {
    if (carrinho.length === 0) return alert('Adicione itens ao carrinho antes do TEF.');
    if (!(valorTransacao > 0)) return alert('Valor inválido para TEF.');

    tefWsUnsubRef.current?.();
    tefWsUnsubRef.current = null;

    setModalPinpadTef(true);
    setTefErroModal(null);
    setTefStatusMensagem('Conectando ao agente local...');
    setTefCarregando(true);

    const agent = getHardwareAgent();
    agent.connect();

    if (!agent.isConnected) {
      await new Promise((r) => setTimeout(r, 500));
    }
    if (!agent.isConnected) {
      setTefErroModal(
        'Hardware local offline. Inicie o AuryaHardwareAgent (dotnet run) neste PC e verifique ws://localhost:8080.'
      );
      setTefStatusMensagem(null);
      setTefCarregando(false);
      return;
    }

    let finalizado = false;
    const unsub = agent.subscribe(async (msg) => {
      if (finalizado) return;
      if (msg.tipo !== 'RESPOSTA_TEF') return;

      const status = String(msg.status ?? '');

      if (status === 'AGUARDANDO_SENHA') {
        setTefStatusMensagem('Aguardando senha ou cartão no PinPad...');
        return;
      }
      if (status === 'PROCESSANDO') {
        setTefStatusMensagem(
          msg.mensagem != null && String(msg.mensagem).trim() !== ''
            ? String(msg.mensagem)
            : 'Processando na adquirente…'
        );
        return;
      }

      if (status === 'APROVADO') {
        finalizado = true;
        unsub();
        if (tefWsUnsubRef.current === unsub) tefWsUnsubRef.current = null;

        const nsu = msg.nsu != null ? String(msg.nsu) : '';
        const codigoAutorizacao =
          msg.codigoAutorizacao != null ? String(msg.codigoAutorizacao) : undefined;
        const bandeiraCartao = msg.bandeira != null ? String(msg.bandeira) : undefined;
        const comprovanteLimpoWs =
          (msg as { comprovanteLimpo?: unknown }).comprovanteLimpo != null &&
          String((msg as { comprovanteLimpo?: unknown }).comprovanteLimpo).trim() !== ''
            ? String((msg as { comprovanteLimpo?: unknown }).comprovanteLimpo).trim()
            : '';

        const comprovanteLinhas = [
          '--- COMPROVANTE TEF (HARDWARE LOCAL) ---',
          nsu ? `NSU: ${nsu}` : '',
          codigoAutorizacao ? `AUTORIZACAO: ${codigoAutorizacao}` : '',
          bandeiraCartao ? `BANDEIRA: ${bandeiraCartao}` : '',
          `VALOR: R$ ${valorTransacao.toFixed(2)}`,
          `TIPO: ${tipoCartao}`,
          msg.mensagem != null ? String(msg.mensagem) : '',
        ]
          .filter(Boolean)
          .join('\n');

        const comprovanteParaRegistro = comprovanteLimpoWs || comprovanteLinhas;

        try {
          const idEstacaoTef = getEstacaoTrabalhoIdPdv()?.trim() ?? '';
          const termTef =
            sessaoCaixa?.terminal?.trim() || getTerminalFiscalPdv()?.trim() || '';
          if (!termTef) {
            throw new Error('Sessão sem terminal fiscal. Abra o caixa novamente pela estação correta.');
          }
          const res = await api.post<{
            sucesso: boolean;
            dados?: { transacaoTefId: string };
            erro?: string;
          }>('/api/tef/registrar-hardware', {
            valor: valorTransacao,
            tipoCartao,
            terminal: termTef,
            nsu: nsu || `HW-${Date.now()}`,
            codigoAutorizacao,
            bandeiraCartao,
            comprovanteImpressaoLimpo: comprovanteParaRegistro,
            comprovanteImpressao: comprovanteLinhas,
            ...(idEstacaoTef ? { estacaoTrabalhoId: idEstacaoTef } : {}),
          });
          if (res.status !== 200) {
            throw new Error(`HTTP ${res.status}: falha ao registrar TEF.`);
          }
          const { data } = res;
          if (!data.sucesso || !data.dados?.transacaoTefId) {
            throw new Error(data.erro || 'Falha ao registrar TEF no servidor.');
          }
          const tid = data.dados.transacaoTefId;
          tefComprovantePorTidRef.current.set(tid, comprovanteParaRegistro);
          const tipoForma: FormaPagamentoPDV =
            tipoCartao === 'CREDITO' ? 'CARTAO_CREDITO_TEF' : 'CARTAO_DEBITO_TEF';
          const tipoApi = resolveTipoPagamentoApi(tipoForma);
          const parcelasTef =
            tipoCartao === 'CREDITO' ? gerarParcelas(valorTransacao, 1) : undefined;
          setLinhasPagamento((prev) => [
            ...prev,
            {
              id: novoIdLinhaPdv(),
              tipoPagamentoApi: tipoApi,
              valor: round2(valorTransacao),
              transacaoTefId: tid,
              canalAdquirente: 'TEF',
              ...(parcelasTef ? { parcelas: parcelasTef } : {}),
            },
          ]);
          setModalPinpadTef(false);
          setTefStatusMensagem(null);
          toast.success(
            'PinPad: autorizado (CNC). Linha lançada — finalize a venda (F10) após cobrir o total.'
          );
        } catch (err) {
          getHardwareAgent().send({ acao: 'FINALIZAR_SITEF', confirmar: false });
          const ax = err as AxiosError<{ erro?: string; error?: string }>;
          setTefErroModal(
            ax.response?.data?.erro ||
              ax.response?.data?.error ||
              (err instanceof Error ? err.message : 'Falha ao registrar TEF.')
          );
        } finally {
          setTefCarregando(false);
        }
        return;
      }

      if (status === 'ERRO' || status === 'NEGADO' || status === 'CANCELADO') {
        finalizado = true;
        unsub();
        tefWsUnsubRef.current = null;
        setTefErroModal(
          String(msg.mensagem ?? msg.erro ?? `Status: ${status}`)
        );
        setTefStatusMensagem(null);
        setTefCarregando(false);
      }
    });

    tefWsUnsubRef.current = unsub;
    setTefStatusMensagem('Enviando comando ao PinPad...');

    const enviado = agent.send({
      acao: 'INICIAR_TEF',
      valor: valorTransacao,
      tipo: tipoCartao,
      parcelas: 1,
    });

    if (!enviado) {
      finalizado = true;
      unsub();
      tefWsUnsubRef.current = null;
      setTefErroModal('Não foi possível enviar o comando TEF ao agente local.');
      setTefStatusMensagem(null);
      setTefCarregando(false);
    }
  };

  const imprimirComprovantesTef = (textos: string[]) => {
    if (textos.length === 0) return;
    const janela = window.open('', '_blank');
    if (!janela) {
      console.warn('Popup bloqueado — comprovante TEF disponível no console.');
      console.log(textos.join('\n---\n'));
      return;
    }
    const pre = janela.document.createElement('pre');
    pre.style.whiteSpace = 'pre-wrap';
    pre.style.fontFamily = 'monospace';
    pre.style.padding = '16px';
    pre.textContent = textos.join('\n---\n');
    janela.document.body.appendChild(pre);
    janela.focus();
    janela.print();
  };

  const finalizarVenda = async () => {
    if (carrinho.length === 0) return alert("O carrinho está vazio!");
    if (!sessaoCaixa) return alert("Caixa não está aberto!");
    if (bloqueioFiscal) return alert("⚠️ Existem pendências fiscais! Corrija os erros listados antes de emitir a nota.");
    
    if (linhasPagamento.length === 0) {
      return alert('Inclua ao menos uma forma de pagamento.');
    }
    if (valorRestante > 0.009) {
      return alert(
        `Falta cobrir R$ ${valorRestante.toFixed(2)}. Lançe mais pagamentos ou ajuste os valores.`
      );
    }

    const tefIdsLinhas = linhasPagamento
      .map((l) => l.transacaoTefId)
      .filter((id): id is string => typeof id === 'string' && id.trim().length > 0);

    setFinalizando(true);
    const terminalFiscal =
      sessaoCaixa.terminal?.trim() || getTerminalFiscalPdv()?.trim() || '';
    if (!terminalFiscal) {
      setFinalizando(false);
      return alert(
        'Terminal fiscal da sessão não encontrado. Refaça a abertura do caixa pela estação correta (Gestão de Turnos ou PDV com estação identificada).'
      );
    }
    const estacaoIdVenda = getEstacaoTrabalhoIdPdv()?.trim();
    const caixaFiscalIdVenda = getCaixaFiscalIdPdv()?.trim();

    const comprovanteMerge =
      tefIdsLinhas.length > 0
        ? tefIdsLinhas
            .map((id) => tefComprovantePorTidRef.current.get(id))
            .filter((s): s is string => typeof s === 'string' && s.trim() !== '')
            .join('\n---\n')
        : '';
    tefComprovanteLimpoRef.current = comprovanteMerge.trim() !== '' ? comprovanteMerge : null;

    const tipoPrincipal = linhasPagamento[0]?.tipoPagamentoApi ?? 'PIX';
    const rotuloCupom =
      linhasPagamento.length > 1 ? 'MISTO' : rotuloFormaPdv(tipoPrincipal);

    try {
      const pagamentosPayload: IPayloadVendaPDV['pagamentos'] = linhasPagamento.map((l) => {
        const pl: IPayloadVendaPDV['pagamentos'][0] = {
          tipoPagamento: l.tipoPagamentoApi,
          valor: l.valor,
        };
        if (l.transacaoTefId) {
          pl.transacaoTefId = l.transacaoTefId;
          pl.canalAdquirente = 'TEF';
        } else if (
          l.tipoPagamentoApi === 'CARTAO_CREDITO' ||
          l.tipoPagamentoApi === 'CARTAO_DEBITO'
        ) {
          pl.canalAdquirente = 'POS';
        }
        if (l.parcelas != null && l.parcelas.length > 0) {
          pl.parcelas = l.parcelas;
        }
        return pl;
      });

      const payload: IPayloadVendaPDV = {
        sessaoCaixaId: sessaoCaixa.id,
        clienteId: clienteSelecionado || undefined,
        terminal: terminalFiscal,
        ...(estacaoIdVenda ? { estacaoTrabalhoId: estacaoIdVenda } : {}),
        ...(caixaFiscalIdVenda ? { caixaFiscalId: caixaFiscalIdVenda } : {}),
        itens: carrinho.map((item) => ({
          produtoId: item.id,
          quantidade: item.quantidade,
          valorUnitario: Number(item.precoVenda),
        })),
        pagamentos: pagamentosPayload,
        tipoPagamento: tipoPrincipal,
        formaPagamento: tipoPrincipal,
        valorTotal: totais.totalVenda,
        valorDesconto: descontoVenda,
        modeloNota,
        ...(comprovanteMerge.trim() !== '' ? { comprovanteTefLimpo: comprovanteMerge } : {}),
      };

      const resVenda = await api.post<{
        mensagem?: string;
        venda?: { id: string };
        comprovantesTef?: string[];
        pacoteImpressaoPos?: { formato: string; payload: string } | null;
        auryaCorrecoesTributarias?: { nomeProduto: string; cstAnterior: string; csosnNovo: string }[];
        requerConfirmacaoTef?: boolean;
      }>('/api/vendas', payload);

      if (tefIdsLinhas.length > 0) {
        try {
          await tefPosVendaSucessoCnc(tefIdsLinhas, {
            vendaId: resVenda.data.venda?.id ?? '',
          });
        } catch (tefErr) {
          console.error(tefErr);
          toast.error(
            'Venda gravada, mas a confirmação TEF falhou. Verifique a maquininha e concilie no ERP.'
          );
        }
      }


      const correcoes = resVenda.data.auryaCorrecoesTributarias ?? [];
      for (const c of correcoes) {
        toast.success(
          `Aurya: CST do produto ${c.nomeProduto} corrigido automaticamente para Simples Nacional`,
          { autoClose: 4500 }
        );
      }

      const vendaId = resVenda.data.venda?.id ?? '—';
      const comps = resVenda.data.comprovantesTef ?? [];
      const pacotePos = resVenda.data.pacoteImpressaoPos;
      const temPacotePos =
        pacotePos?.formato === 'base64' &&
        typeof pacotePos.payload === 'string' &&
        pacotePos.payload.trim() !== '';
      const subtotalCupom =
        resumoPromo?.totalBruto ??
        round2(
          carrinho.reduce((s, i) => s + i.quantidade * Number(i.precoUnitarioBase ?? i.precoVenda), 0)
        );
      const textoCupom = montarCupomTextoPlano({
        nomeLoja: nomeLojaPdV,
        terminal: getNomeEstacaoExibicaoPdv()?.trim() || terminalFiscal,
        operador: nomeOperador,
        vendaId,
        modeloNota,
        formaPagamento: rotuloCupom,
        itens: carrinho.map((i) => ({
          nome: i.nome,
          quantidade: i.quantidade,
          precoVenda: Number(i.precoVenda),
          subtotal: Number(i.subtotal),
        })),
        subtotal: subtotalCupom,
        desconto: round2((resumoPromo?.totalDescontoPromocoes ?? 0) + descontoVenda),
        total: totais.totalVenda,
        comprovantesTef: temPacotePos ? undefined : comps.length > 0 ? comps : undefined,
      });

      const cupomEnviado = temPacotePos
        ? enviarHardware({
            acao: 'IMPRIMIR_CUPOM',
            formato: 'base64',
            payload: pacotePos!.payload,
          })
        : enviarHardware({
            acao: 'IMPRIMIR_CUPOM',
            formato: 'texto',
            payload: textoCupom,
          });
      if (cupomEnviado) {
        toast.success(
          temPacotePos
            ? 'Venda finalizada. Cupom fiscal + TEF enviados à impressora (pacote único).'
            : 'Venda finalizada. Cupom enviado à impressora (agente local).'
        );
      } else {
        if (comps.length > 0) {
          imprimirComprovantesTef(comps);
          toast.success('Venda finalizada. Comprovante aberto no navegador (agente local offline).');
        } else {
          toast.success('Venda finalizada.');
          toast.info('Hardware local offline — cupom não impresso. Inicie o AuryaHardwareAgent.');
        }
      }
      
      setCarrinho([]);
      setLinhasPagamento([]);
      tefComprovantePorTidRef.current = new Map();
      setBusca('');
      setClienteSelecionado('');
      setModeloNota('65');
      tefComprovanteLimpoRef.current = null;
      setQtdParcelas(1);
      setDescontoVenda(0);
      setValorDescontoInput('');
      buscaInputRef.current?.focus();

    } catch (err) {
      const error = err as AxiosError<{error?: string, erro?: string}>;
      const mensagemErro = error.response?.data?.erro || error.response?.data?.error || "Erro ao finalizar venda.";
      if (tefIdsLinhas.length > 0) {
        await tefFalhaSalvarVendaCnc(tefIdsLinhas).catch(() => undefined);
      }
      tefComprovanteLimpoRef.current = null;
      alert(`❌ ${mensagemErro}`);
    } finally {
      setFinalizando(false);
    }
  };

  const actionsRef = useRef({
    finalizarVenda,
    pausarVendaSegura,
    abrirFilaDeEspera,
    aplicarDescontoSeguro,
    solicitarFechamentoCaixa, 
    focarBusca: () => buscaInputRef.current?.focus()
  });

  const statesRef = useRef({
    modalSupervisor,
    modalCaixaAberto,
    modalVendasEspera,
    modalFechamento,
    modalPinpadTef,
    tefCarregando,
    modalParcialAberto,
  });

  useEffect(() => {
    actionsRef.current = {
      finalizarVenda,
      pausarVendaSegura,
      abrirFilaDeEspera,
      aplicarDescontoSeguro,
      solicitarFechamentoCaixa,
      focarBusca: () => buscaInputRef.current?.focus()
    };
    statesRef.current = {
      modalSupervisor,
      modalCaixaAberto,
      modalVendasEspera,
      modalFechamento,
      modalPinpadTef,
      tefCarregando,
      modalParcialAberto,
    };
  });

  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (pdvTerminalBloqueado) return;

      const { modalSupervisor, modalCaixaAberto, modalVendasEspera, modalFechamento } = statesRef.current;

      if (e.key === 'Escape') {
        if (modalSupervisor) { setModalSupervisor(false); setAcaoPendente(null); }
        if (modalVendasEspera) setModalVendasEspera(false);
        if (modalFechamento) setModalFechamento(false);
        if (statesRef.current.modalParcialAberto) {
          setModalParcialAberto(false);
          setAlvoModalParcial(null);
          setCampoValorParcial('');
          setErroModalParcial(null);
        }
        if (statesRef.current.modalPinpadTef) {
          tefWsUnsubRef.current?.();
          tefWsUnsubRef.current = null;
          setModalPinpadTef(false);
          setTefErroModal(null);
          setTefStatusMensagem(null);
          setTefCarregando(false);
        }
        return;
      }

      if (
        modalSupervisor ||
        modalCaixaAberto ||
        modalVendasEspera ||
        modalFechamento ||
        statesRef.current.modalPinpadTef ||
        statesRef.current.modalParcialAberto
      ) {
        return;
      }

      switch(e.key) {
        case 'F2':
          e.preventDefault();
          actionsRef.current.focarBusca();
          break;
        case 'F4':
          e.preventDefault();
          actionsRef.current.aplicarDescontoSeguro();
          break;
        case 'F8':
          e.preventDefault();
          actionsRef.current.pausarVendaSegura();
          break;
        case 'F9':
          e.preventDefault();
          actionsRef.current.abrirFilaDeEspera();
          break;
        case 'F10':
          e.preventDefault();
          actionsRef.current.finalizarVenda();
          break;
        case 'F12':
          e.preventDefault();
          actionsRef.current.solicitarFechamentoCaixa();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pdvTerminalBloqueado]);

  return (
    <Layout>
      <PagamentoValorParcialModal
        aberto={modalParcialAberto}
        titulo={
          alvoModalParcial?.kind === 'tef'
            ? alvoModalParcial.cartao === 'CREDITO'
              ? 'Valor — crédito TEF'
              : 'Valor — débito TEF'
            : alvoModalParcial?.kind === 'sem_tef'
              ? `Valor — ${rotuloFormaPdv(resolveTipoPagamentoApi(alvoModalParcial.forma))}`
              : 'Valor do pagamento'
        }
        subtitulo={
          alvoModalParcial?.kind === 'tef'
            ? 'Depois de confirmar aqui, autorize no PinPad pelo valor informado.'
            : 'Informe quanto entra nesta forma de pagamento (pagamento misto).'
        }
        valorRestante={valorRestante}
        valorCampo={campoValorParcial}
        onValorCampoChange={setCampoValorParcial}
        erroTexto={erroModalParcial}
        onConfirmar={() => {
          confirmarModalPagamentoParcial();
        }}
        onFechar={fecharModalPagamentoParcial}
        ocupado={false}
      >
        {alvoModalParcial?.kind === 'sem_tef' && alvoModalParcial.forma === 'CREDIARIO' ? (
          <div>
            <label
              htmlFor="pdv-parcial-parcelas"
              className="mb-1.5 block text-xs font-bold text-slate-400"
            >
              Parcelas (crediário)
            </label>
            <select
              id="pdv-parcial-parcelas"
              className="w-full rounded-xl border border-white/10 bg-[#0b1324] px-3 py-2.5 text-sm font-bold text-white outline-none focus:border-violet-500/45"
              value={qtdParcelas}
              onChange={(e) => setQtdParcelas(Number(e.target.value))}
            >
              <option value={1}>1x (30 dias)</option>
              <option value={2}>2x (30 e 60 dias)</option>
              <option value={3}>3x (30, 60 e 90 dias)</option>
              <option value={4}>4x</option>
              <option value={5}>5x</option>
              <option value={6}>6x</option>
            </select>
          </div>
        ) : null}
      </PagamentoValorParcialModal>

      <TefPinpadModal
        aberto={modalPinpadTef}
        carregando={tefCarregando}
        mensagemErro={tefErroModal}
        mensagemStatus={tefStatusMensagem}
        titulo="PinPad — autorização TEF"
        subtitulo="Siga as instruções no terminal Gertec. Agente local (WebSocket)."
        onFechar={() => {
          tefWsUnsubRef.current?.();
          tefWsUnsubRef.current = null;
          setModalPinpadTef(false);
          setTefErroModal(null);
          setTefStatusMensagem(null);
          setTefCarregando(false);
        }}
      />

      {pdvTerminalBloqueado && estacaoDiscovery === 'loading' && (
        <div
          className="fixed inset-0 z-[300] flex flex-col items-center justify-center gap-4 bg-[#020617]/95 backdrop-blur-md p-6"
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <Loader2 className="h-12 w-12 text-violet-400 animate-spin" aria-hidden />
          <p className="text-slate-300 font-medium">Identificando terminal…</p>
        </div>
      )}

      {pdvTerminalBloqueado && estacaoDiscovery === 'unknown_ip' && (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center bg-[#020617]/95 backdrop-blur-md p-6"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="pdv-terminal-bloqueado-msg"
        >
          <div className="max-w-lg w-full rounded-[28px] border border-amber-500/40 bg-[#08101f] shadow-[0_25px_80px_rgba(0,0,0,0.65)] p-8 text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-amber-500/30 bg-amber-500/10">
              <AlertTriangle className="h-9 w-9 text-amber-400" aria-hidden />
            </div>
            <p id="pdv-terminal-bloqueado-msg" className="text-lg font-bold text-white leading-relaxed">
              Computador não reconhecido. Cadastre o IP deste terminal na tela de Estações de Trabalho na
              retaguarda.
            </p>
          </div>
        </div>
      )}

      {pdvTerminalBloqueado && estacaoDiscovery === 'erro_rede' && (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center bg-[#020617]/95 backdrop-blur-md p-6"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="pdv-estacao-erro-rede"
        >
          <div className="max-w-lg w-full rounded-[28px] border border-red-500/35 bg-[#08101f] shadow-[0_25px_80px_rgba(0,0,0,0.65)] p-8 text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-red-500/30 bg-red-500/10">
              <ShieldAlert className="h-9 w-9 text-red-400" aria-hidden />
            </div>
            <p id="pdv-estacao-erro-rede" className="text-lg font-bold text-white leading-relaxed mb-6">
              Não foi possível identificar o terminal. Verifique a conexão com o servidor e tente novamente.
            </p>
            <button
              type="button"
              onClick={tentarDescobrirEstacaoNovamente}
              className="w-full rounded-xl bg-violet-600 px-4 py-3 font-bold text-white hover:bg-violet-700 transition-colors"
            >
              Tentar novamente
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes glow { 0% { box-shadow: 0 0 15px rgba(16, 185, 129, 0.4); } 50% { box-shadow: 0 0 30px rgba(16, 185, 129, 0.8); } 100% { box-shadow: 0 0 15px rgba(16, 185, 129, 0.4); } }
        .btn-glow { animation: glow 2s infinite; }
        @keyframes fadeInDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in-down { animation: fadeInDown 0.4s ease-out forwards; }
        @keyframes modalEnter { from { opacity: 0; transform: scale(0.95) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        .animate-modal { animation: modalEnter 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>

      {modalFechamento && sessaoCaixa && (
        <FechamentoCaixaModal
          aberto={modalFechamento}
          sessaoCaixaId={sessaoCaixa.id}
          modo="pdv"
          titulo="Fechamento de caixa"
          subtitulo="Contagem cega: informe os valores contados em dinheiro, cartões e PIX."
          onFechar={() => setModalFechamento(false)}
          onConcluido={() => {
            toast.success('Caixa fechado com sucesso. Turno encerrado.');
            setSessaoCaixa(null);
            setModalFechamento(false);
            setModalCaixaAberto(true);
          }}
        />
      )}

      {modalSupervisor && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center z-[60] p-4">
          <div className="bg-[#08101f] border border-red-500/30 rounded-[30px] shadow-[0_25px_80px_rgba(0,0,0,0.60)] w-full max-w-sm flex flex-col relative overflow-hidden animate-modal">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-violet-600 to-fuchsia-600"></div>
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/30">
                <ShieldAlert className="w-8 h-8 text-red-400" />
              </div>
              <h2 className="text-xl font-black text-white mb-2">Ação Restrita</h2>
              <p className="text-slate-400 text-xs mb-6">Esta operação exige autorização. Informe a senha do supervisor.</p>
              
              <div className="text-left mb-6 relative">
                <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
                <input 
                  ref={senhaSupervisorRef}
                  type="password" 
                  placeholder="Senha do Supervisor"
                  className="w-full p-3.5 pl-12 bg-slate-950 border border-slate-700 text-white rounded-xl focus:ring-2 focus:ring-red-500 outline-none font-black shadow-inner"
                  value={senhaSupervisor}
                  onChange={(e) => setSenhaSupervisor(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && autorizarAcao()}
                />
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => { setModalSupervisor(false); setAcaoPendente(null); }}
                  className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold text-sm transition-colors"
                >
                  Cancelar [ESC]
                </button>
                <button 
                  onClick={autorizarAcao}
                  disabled={validandoSupervisor || !senhaSupervisor}
                  className="flex-1 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white rounded-xl font-black text-sm uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(139,92,246,0.30)] disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {validandoSupervisor ? <Loader2 className="w-4 h-4 animate-spin"/> : 'Autorizar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {modalCaixaAberto && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-[#08101f] border border-white/10 rounded-[30px] shadow-[0_25px_80px_rgba(0,0,0,0.60)] w-full max-w-md flex flex-col relative overflow-hidden animate-modal">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-violet-600 to-fuchsia-600"></div>
            <div className="p-8 text-center">
              <div className="w-20 h-20 bg-violet-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-violet-500/20">
                <Lock className="w-10 h-10 text-violet-300" />
              </div>
              <h2 className="text-2xl font-black text-white mb-2">Caixa Fechado</h2>
              <p className="text-slate-400 text-sm mb-8">Para iniciar as vendas, informe o valor do fundo de troco atual na gaveta.</p>
              
              <div className="text-left mb-6">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 pl-1">Fundo de Troco (R$)</label>
                <input 
                  type="number" 
                  autoFocus
                  placeholder="Ex: 100.00"
                  className="w-full p-4 bg-[#0b1324] border border-white/10 text-white rounded-xl focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500/40 outline-none text-2xl font-black font-mono shadow-inner text-center"
                  value={fundoTroco}
                  onChange={(e) => setFundoTroco(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && abrirCaixa()}
                />
              </div>

              <button 
                onClick={abrirCaixa}
                disabled={abrindoCaixa || !fundoTroco}
                className="w-full py-4 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white rounded-xl font-black text-lg uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(139,92,246,0.30)] disabled:opacity-50 flex items-center justify-center gap-3"
              >
                {abrindoCaixa ? <Loader2 className="w-6 h-6 animate-spin"/> : <PlayCircle className="w-6 h-6"/>}
                Abrir Caixa
              </button>
            </div>
          </div>
        </div>
      )}

      {modalVendasEspera && (
        <div className="fixed inset-0 bg-[#020617]/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-[#08101f] border border-white/10 rounded-[30px] shadow-[0_25px_80px_rgba(0,0,0,0.60)] w-full max-w-3xl flex flex-col relative overflow-hidden animate-modal max-h-[80vh]">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-amber-500 to-orange-500"></div>
            
            <div className="p-6 border-b border-white/10 bg-[#0b1324]/70 flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-xl font-black text-white flex items-center gap-3">
                  <Clock className="w-6 h-6 text-violet-300"/> Fila de Espera
                </h3>
                <p className="text-xs text-slate-400 mt-1">Vendas pausadas aguardando finalização.</p>
              </div>
              <button onClick={() => setModalVendasEspera(false)} className="p-2 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white rounded-full border border-white/10 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
              {carregandoPendentes ? (
                <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 text-amber-500 animate-spin"/></div>
              ) : vendasPendentes.length === 0 ? (
                <div className="text-center p-12 text-slate-500 font-medium">Nenhuma venda em espera no momento.</div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {vendasPendentes.map(vp => (
                    <div key={vp.id} className="bg-[#0b1324]/70 border border-white/10 rounded-2xl p-5 flex items-center justify-between hover:border-violet-500/30 transition-colors group">
                      <div>
                        <h4 className="text-white font-bold text-lg mb-1">{vp.nomeCliente}</h4>
                        <p className="text-slate-400 text-xs font-medium flex items-center gap-2">
                          <ListOrdered className="w-3.5 h-3.5"/> {vp.itens.length} itens no carrinho
                          <span className="text-slate-600">|</span>
                          <Clock className="w-3.5 h-3.5"/> {new Date(vp.createdAt).toLocaleTimeString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-6">
                        <p className="text-violet-300 font-black text-2xl font-mono">R$ {Number(vp.valorTotal).toFixed(2)}</p>
                        <button 
                          onClick={() => resgatarVenda(vp.id)}
                          className="bg-violet-500/10 hover:bg-violet-500/20 text-violet-300 hover:text-white border border-violet-500/30 px-6 py-3 rounded-xl font-black uppercase tracking-[0.16em] transition-all shadow-lg flex items-center gap-2"
                        >
                          <PlayCircle className="w-5 h-5"/> Resgatar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="mb-4 flex flex-col md:flex-row gap-4 items-stretch justify-between">
        <div className="flex-1 bg-[radial-gradient(circle_at_top_left,_rgba(139,92,246,0.16),_transparent_26%),linear-gradient(135deg,_#0b1020_0%,_#08101f_48%,_#0a1224_100%)] border border-white/10 p-4 rounded-[26px] flex items-center justify-between shadow-[0_20px_50px_rgba(0,0,0,0.35)] backdrop-blur-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-violet-600/10 rounded-full blur-[60px] pointer-events-none"></div>
          <div className="flex items-center gap-4 relative z-10">
            <div className="p-2.5 bg-violet-500/10 rounded-xl border border-violet-500/20 shadow-inner">
              <BrainCircuit className="w-6 h-6 text-violet-300" />
            </div>
            <div>
              <h3 className="text-white font-black text-sm flex items-center gap-2 uppercase tracking-[0.18em]">
                Assistente Aurya <Sparkles className="w-3.5 h-3.5 text-violet-300 animate-pulse"/>
              </h3>
              <p className="text-slate-300 text-sm font-medium mt-0.5">
                "Identifiquei produtos com <strong className="text-emerald-300 font-bold">alta margem</strong> no estoque. Ofereça itens complementares para aumentar o ticket."
              </p>
            </div>
          </div>
        </div>

        {sessaoCaixa && (
          <div className="flex gap-3 shrink-0 items-center">
            
            <div className="hidden md:flex flex-col items-end mr-2 border-r border-slate-700/50 pr-5">
              <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-0.5">
                {terminalAtivo}
              </span>
              <span className="text-sm font-bold text-white flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse"></div>
                {nomeOperador}
              </span>
            </div>

            <button 
              onClick={abrirFilaDeEspera}
              className="bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-300 px-5 py-4 rounded-2xl flex flex-col items-center justify-center gap-1 transition-colors shadow-inner min-w-[100px]"
            >
              <Clock className="w-5 h-5"/>
              <span className="text-[10px] font-black uppercase tracking-widest">Fila <span className="text-amber-500 ml-1">[F9]</span></span>
            </button>
            <button 
              onClick={pausarVendaSegura}
              disabled={carrinho.length === 0 || pausandoVenda}
              className="bg-[#08101f] hover:bg-white/5 border border-white/10 text-white px-5 py-4 rounded-2xl flex flex-col items-center justify-center gap-1 transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed min-w-[100px]"
            >
              {pausandoVenda ? <Loader2 className="w-5 h-5 animate-spin"/> : <PauseCircle className="w-5 h-5 text-sky-300"/>}
              <span className="text-[10px] font-black uppercase tracking-widest">Pausar <span className="text-cyan-500 ml-1">[F8]</span></span>
            </button>
            
            <button 
              onClick={solicitarFechamentoCaixa}
              className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-300 px-5 py-4 rounded-2xl flex flex-col items-center justify-center gap-1 transition-colors shadow-inner min-w-[100px]"
            >
              <Power className="w-5 h-5"/>
              <span className="text-[10px] font-black uppercase tracking-widest">Fechar <span className="text-red-500 ml-1">[F12]</span></span>
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-col lg:flex-row h-[calc(100vh-16rem)] min-h-[400px] gap-4 pb-2">
        
        {/* LADO ESQUERDO */}
        <div className="w-full lg:w-5/12 flex flex-col gap-4">
          <div className="bg-[#08101f]/90 backdrop-blur-xl p-5 rounded-[30px] shadow-[0_25px_60px_rgba(0,0,0,0.35)] border border-white/10 relative overflow-hidden shrink-0">
            <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/10 rounded-full blur-[50px] pointer-events-none"></div>
            <h2 className="text-lg font-black text-white mb-3 flex items-center uppercase tracking-widest relative z-10">
              <Search className="w-5 h-5 text-violet-300 mr-2" /> Adicionar Produto 
              <span className="ml-3 px-2 py-0.5 bg-[#0b1324] border border-white/10 text-slate-400 text-[10px] rounded shadow-inner">F2</span>
            </h2>
            <div className="relative z-10">
              <input 
                ref={buscaInputRef}
                type="text" 
                placeholder="Nome, Código Curto ou Cód. Barras..." // 🚀 ADICIONADO AVISO DE CÓDIGO CURTO
                className="w-full p-3.5 pl-12 text-lg font-bold bg-[#0b1324] border border-white/10 rounded-xl focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500/40 outline-none text-white placeholder:text-slate-500 transition-all shadow-inner disabled:opacity-40 disabled:cursor-not-allowed"
                value={busca}
                disabled={pdvTerminalBloqueado}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                onChange={(e) => setBusca(e.target.value)}
                onKeyDown={handleKeyDownBusca} // 🚀 SUBSTITUÍDO PELO NOVO MOTOR DE BUSCA FORÇADA
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-violet-300 w-5 h-5" />
            </div>
          </div>

          {busca.length > 2 && (
            <div className="flex-1 bg-[#08101f]/90 backdrop-blur-xl rounded-[30px] shadow-[0_25px_60px_rgba(0,0,0,0.35)] border border-white/10 overflow-hidden flex flex-col animate-fade-in-down">
              <div className="p-3 bg-[#0b1324] border-b border-white/10 font-black text-slate-400 text-[10px] uppercase tracking-[0.18em]">
                Resultados da Busca
              </div>
              <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
                {produtosFiltrados.map(produto => (
                  <button 
                    key={produto.id}
                    onClick={() => adicionarAoCarrinho(produto)}
                    className="w-full p-3 text-left bg-[#0b1324]/70 border border-white/10 rounded-xl hover:border-violet-500/30 hover:bg-white/5 transition-all flex justify-between items-center group mb-2"
                  >
                    <div>
                      {/* 🚀 ADICIONADA A EXIBIÇÃO DO CÓDIGO CURTO NO RESULTADO */}
                      <p className="font-bold text-white text-sm group-hover:text-violet-300 transition-colors">
                        {produto.codigo ? <span className="text-violet-400 font-mono mr-1">[{produto.codigo}]</span> : ''}
                        {produto.nome}
                      </p>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">{produto.codigoBarras || 'Sem código de barras'}</p>
                    </div>
                    <p className="font-black text-emerald-400 text-base font-mono">R$ {Number(produto.precoVenda).toFixed(2)}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* LADO DIREITO: CARRINHO E PAGAMENTO */}
        <div className="w-full lg:w-7/12 bg-[#08101f]/90 backdrop-blur-xl rounded-[30px] shadow-[0_25px_60px_rgba(0,0,0,0.35)] border border-white/10 flex flex-col overflow-hidden relative">
          
          <div className="p-4 bg-[#0b1324] text-white flex justify-between items-center border-b border-white/10 shrink-0 relative z-10">
            <h2 className="text-base font-black uppercase tracking-widest flex items-center gap-2">
              🛒 Resumo da Venda
            </h2>
            <span className="bg-violet-500/10 text-violet-300 border border-violet-500/20 px-3 py-1 rounded-lg text-xs font-black tracking-[0.18em] shadow-inner">
              {carrinho.length} ITENS
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar relative z-10">
            {carrinho.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center">
                <div className="w-20 h-20 bg-[#0b1324] rounded-full flex items-center justify-center mb-4 border border-white/10 shadow-inner">
                  <BrainCircuit className="w-10 h-10 text-violet-300/50" />
                </div>
                <h3 className="text-lg font-black text-white mb-2">Caixa Livre</h3>
                <p className="text-slate-400 text-xs mb-6 max-w-[250px]">Utilize a busca ao lado para adicionar produtos.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {carrinho.map((item) => (
                  <div
                    key={item.id}
                    className={`bg-[#0b1324]/80 border p-3 rounded-xl flex items-center justify-between group shadow-sm hover:border-white/20 transition-colors ${
                      item.promocaoAplicada
                        ? 'border-emerald-500/35 ring-1 ring-emerald-500/15'
                        : 'border-white/10'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      {/* 🚀 EXIBINDO O CÓDIGO CURTO NO CARRINHO */}
                      <p className="text-white font-bold text-sm truncate pr-2">
                        {item.codigo ? <span className="text-violet-400 font-mono mr-1">[{item.codigo}]</span> : ''}
                        {item.nome}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 mt-0.5">
                        <p className="text-violet-300 font-black text-xs font-mono">
                          R$ {Number(item.precoVenda).toFixed(2)}
                          {item.promocaoAplicada &&
                            item.precoUnitarioBase !== undefined &&
                            round2(Number(item.precoUnitarioBase)) > round2(Number(item.precoVenda)) + 0.001 && (
                              <span className="text-slate-500 line-through ml-1 font-normal">
                                {Number(item.precoUnitarioBase).toFixed(2)}
                              </span>
                            )}
                        </p>
                        {item.promocaoAplicada && (
                          <span className="inline-flex items-center gap-0.5 rounded-md bg-emerald-500/15 text-emerald-300 text-[9px] font-black uppercase tracking-wide px-1.5 py-0.5 border border-emerald-500/25">
                            <Tag className="w-3 h-3 shrink-0" />
                            Promo
                          </span>
                        )}
                      </div>
                      {item.promocaoResumo && (
                        <p className="text-emerald-400/90 text-[10px] mt-0.5 truncate" title={item.promocaoResumo}>
                          {item.promocaoResumo}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="flex items-center bg-[#08101f] rounded-lg border border-white/10 shadow-inner">
                        <button onClick={() => alterarQuantidadeSeguro(item.id, -1)} className="px-2.5 py-1 text-slate-400 hover:text-white font-bold">-</button>
                        <span className="text-white font-black px-1.5 text-sm min-w-[1.5rem] text-center">{item.quantidade}</span>
                        <button onClick={() => alterarQuantidadeSeguro(item.id, 1)} className="px-2.5 py-1 text-slate-400 hover:text-white font-bold">+</button>
                      </div>
                      <p className="text-white font-black w-16 text-right text-sm font-mono">R$ {Number(item.subtotal).toFixed(2)}</p>
                      <button onClick={() => removerDoCarrinhoSeguro(item.id)} className="text-slate-500 hover:text-red-300 bg-[#08101f] hover:bg-red-500/10 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all border border-white/10">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-[#0b1324]/90 p-3 border-t border-white/10 shrink-0 relative z-10 backdrop-blur-xl">
            
            <div className="grid grid-cols-2 gap-3 mb-2">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 pl-1">Modelo Fiscal</label>
                <select 
                  className="w-full p-2.5 bg-[#08101f] border border-white/10 text-white font-bold text-sm rounded-lg focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500/40 outline-none shadow-inner"
                  value={modeloNota}
                  onChange={(e) => setModeloNota(e.target.value)}
                >
                  <option value="65">NFC-e</option>
                  <option value="55">NF-e</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 pl-1">Cliente</label>
                <select 
                  className="w-full p-2.5 bg-[#08101f] border border-white/10 text-white font-bold text-sm rounded-lg focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500/40 outline-none shadow-inner"
                  value={clienteSelecionado}
                  onChange={(e) => setClienteSelecionado(e.target.value)}
                >
                  <option value="">Consumidor Final</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.razaoSocial}</option>)}
                </select>
              </div>
            </div>

            <div className="flex justify-between items-center mb-2 bg-[#08101f] p-3 rounded-xl border border-white/10 shadow-inner">
              <div className="min-w-0">
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-0.5 flex items-center gap-2">
                  Total a Pagar
                  {recalculandoPromocoes && (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-violet-400 shrink-0" aria-hidden />
                  )}
                </p>
                {resumoPromo && resumoPromo.totalDescontoPromocoes > 0 && (
                  <p className="text-emerald-400 text-[10px] font-bold mb-0.5">
                    Promoções: −R$ {resumoPromo.totalDescontoPromocoes.toFixed(2)}
                  </p>
                )}
                {descontoVenda > 0 && (
                  <p className="text-red-400 text-xs font-bold line-through mb-0.5">
                    R$ {liquidoPosPromo.toFixed(2)}
                  </p>
                )}
                <p className="text-3xl font-black text-white font-mono">R$ {totais.totalVenda.toFixed(2)}</p>
              </div>

              <div className="flex flex-col items-end gap-2">
                {descontoVenda === 0 ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      placeholder="Desc R$"
                      className="w-24 p-2 bg-[#0b1324] border border-white/10 text-white rounded-lg focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500/40 outline-none text-xs font-bold font-mono text-right shadow-inner placeholder:text-slate-600"
                      value={valorDescontoInput}
                      onChange={(e) => setValorDescontoInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && aplicarDescontoSeguro()}
                    />
                    <button
                      onClick={aplicarDescontoSeguro}
                      className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-[0.16em] transition-colors shadow-lg"
                    >
                      Aplicar <span className="text-violet-200 ml-1">[F4]</span>
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-lg">
                     <span className="text-emerald-300 text-xs font-bold">Desc: R$ {descontoVenda.toFixed(2)}</span>
                     <button onClick={() => setDescontoVenda(0)} className="text-emerald-400 hover:text-red-400 ml-2" title="Remover Desconto">
                       <X className="w-4 h-4" />
                     </button>
                  </div>
                )}

                <p className="text-emerald-400 font-black text-xs flex items-center gap-1 font-mono mt-1">
                  <TrendingUp className="w-3.5 h-3.5"/> Lucro: R$ {lucroReal.toFixed(2)}
                </p>
              </div>
            </div>

            <div className="mb-2 space-y-2">
              <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-slate-400 px-0.5">
                <span>Pagamentos lançados</span>
                <span className="font-mono text-amber-300">
                  Restante: R$ {valorRestante.toFixed(2)}
                </span>
              </div>
              {linhasPagamento.length > 0 && (
                <ul className="max-h-24 overflow-y-auto space-y-1 rounded-lg border border-white/10 bg-[#08101f]/80 p-2">
                  {linhasPagamento.map((linha) => (
                    <li
                      key={linha.id}
                      className="flex items-center justify-between gap-2 text-[11px] font-bold text-slate-200"
                    >
                      <span className="truncate">
                        {rotuloFormaPdv(linha.tipoPagamentoApi)}
                        {linha.transacaoTefId ? ' · TEF' : ''}
                      </span>
                      <span className="flex items-center gap-2 shrink-0 font-mono text-emerald-300">
                        R$ {linha.valor.toFixed(2)}
                        <button
                          type="button"
                          onClick={() => removerLinhaPagamento(linha.id)}
                          className="rounded border border-white/10 p-1 text-slate-500 hover:text-red-400"
                          title="Remover linha"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-[9px] text-slate-500 text-center">
                Toque na forma de pagamento — informe o valor (padrão = restante) para pagamento misto.
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                {(
                  [
                    { forma: 'PIX' as const, label: 'PIX' },
                    { forma: 'CARTAO_DEBITO' as const, label: 'DÉBITO' },
                    { forma: 'CARTAO_CREDITO' as const, label: 'CRÉDITO' },
                    { forma: 'DINHEIRO' as const, label: 'DINHEIRO' },
                    { forma: 'CREDIARIO' as const, label: 'PRAZO' },
                  ] as const
                ).map(({ forma, label }) => (
                  <button
                    key={forma}
                    type="button"
                    onClick={() => abrirModalPagamentoParcial({ kind: 'sem_tef', forma })}
                    className="py-2 rounded-lg flex flex-col items-center gap-1 font-black text-[9px] uppercase tracking-wider border-2 transition-all bg-[#08101f] border-white/10 text-slate-500 hover:border-violet-500/35 hover:text-violet-200"
                  >
                    {forma === 'PIX' && <QrCode className="w-4 h-4" />}
                    {(forma === 'CARTAO_DEBITO' || forma === 'CARTAO_CREDITO') && (
                      <CreditCard className="w-4 h-4" />
                    )}
                    {forma === 'DINHEIRO' && <Banknote className="w-4 h-4" />}
                    {forma === 'CREDIARIO' && <ShieldCheck className="w-4 h-4" />}
                    {label}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => abrirModalPagamentoParcial({ kind: 'tef', cartao: 'CREDITO' })}
                  disabled={carrinho.length === 0 || bloqueioFiscal}
                  className="py-2.5 rounded-lg flex flex-col items-center gap-1 font-black text-[9px] uppercase tracking-wider border-2 transition-all disabled:opacity-40 bg-[#08101f] border-cyan-500/25 text-cyan-400/90 hover:border-cyan-500/45"
                >
                  <CreditCard className="w-4 h-4" />
                  CREDITO TEF
                </button>
                <button
                  type="button"
                  onClick={() => abrirModalPagamentoParcial({ kind: 'tef', cartao: 'DEBITO' })}
                  disabled={carrinho.length === 0 || bloqueioFiscal}
                  className="py-2.5 rounded-lg flex flex-col items-center gap-1 font-black text-[9px] uppercase tracking-wider border-2 transition-all disabled:opacity-40 bg-[#08101f] border-cyan-500/25 text-cyan-400/90 hover:border-cyan-500/45"
                >
                  <CreditCard className="w-4 h-4" />
                  DEBITO TEF
                </button>
              </div>
              {linhasPagamento.some((l) => l.transacaoTefId) && valorRestante <= 0.009 && (
                <p className="text-[10px] text-emerald-400/90 font-bold text-center">
                  TEF autorizado (CNC) — F10 finaliza e confirma na maquininha após gravar no ERP.
                </p>
              )}
            </div>

            <button 
              onClick={finalizarVenda}
              disabled={
                carrinho.length === 0 ||
                finalizando ||
                bloqueioFiscal ||
                !sessaoCaixa ||
                linhasPagamento.length === 0 ||
                valorRestante > 0.009
              }
              className={`w-full py-3 rounded-xl font-black text-sm flex flex-col items-center justify-center transition-all ${
                carrinho.length > 0 && !bloqueioFiscal && sessaoCaixa
                  ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white btn-glow transform hover:-translate-y-0.5' 
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
              }`}
            >
              {finalizando ? (
                <div className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin"/> Emitindo...</div>
              ) : !sessaoCaixa ? (
                'Caixa Fechado'
              ) : (
                carrinho.length > 0 ? (
                  <div className="flex items-center gap-2 uppercase tracking-widest">
                    Finalizar Venda <span className="bg-emerald-500/20 text-emerald-200 px-2 py-0.5 rounded text-xs ml-2 border border-emerald-500/30">F10</span> <ArrowRight className="w-4 h-4 ml-1" />
                  </div>
                ) : (
                  'Caixa Livre'
                )
              )}
            </button>

          </div>
        </div>
      </div>
      
      {/* 🚀 RODAPÉ DE LEGENDA DOS ATALHOS */}
      <div className="text-center mt-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center justify-center gap-4 flex-wrap">
        <span
          className="flex items-center gap-1.5"
          title={
            hardwareConectado
              ? 'AuryaHardwareAgent conectado (impressora / PinPad)'
              : 'Agente local offline — execute dotnet run no AuryaHardwareAgent'
          }
        >
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${
              hardwareConectado
                ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.85)]'
                : 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.5)]'
            }`}
            aria-hidden
          />
          <span className="normal-case tracking-normal text-slate-400">Hardware local</span>
        </span>
        <span className="flex items-center gap-1"><Keyboard className="w-3.5 h-3.5"/> Atalhos:</span>
        <span><strong className="text-slate-400">F2</strong> Busca</span>
        <span><strong className="text-slate-400">F4</strong> Desconto</span>
        <span><strong className="text-slate-400">F8</strong> Pausar</span>
        <span><strong className="text-slate-400">F9</strong> Fila</span>
        <span><strong className="text-slate-400">F10</strong> Finalizar</span>
        <span><strong className="text-red-400">F12</strong> Fechar Caixa</span>
        <span><strong className="text-slate-400">ESC</strong> Cancelar</span>
      </div>

    </Layout>
  );
}