import React, { useState, useEffect, useRef } from 'react';
import { Layout } from '../../components/Layout';
import { api } from '../../services/api';
import { 
  Search, Plus, Trash2, BrainCircuit, Sparkles, 
  TrendingUp, Flame, Star, QrCode, CreditCard, 
  Banknote, ArrowRight, ShieldCheck, AlertTriangle, ExternalLink,
  Loader2, Lock, Clock, ListOrdered, PauseCircle, PlayCircle, X, ShieldAlert, Key, Keyboard, Power
} from 'lucide-react';
import { AxiosError } from 'axios'; 
import { IUsuario } from '../../types/auth'; 

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

export interface IUsuarioStorage extends IUsuario {
  loja?: {
    regimeTributario?: string;
    [key: string]: unknown;
  }
}

export interface IPayloadVendaPDV {
  sessaoCaixaId: string; 
  clienteId?: string;
  terminal?: string; 
  itens: Array<{
    produtoId: string;
    quantidade: number;
    valorUnitario: number;
  }>;
  pagamentos: Array<{
    tipoPagamento: string;
    valor: number;
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
}

export interface ISessaoCaixa {
  id: string;
  status: string;
  saldoAbertura: number;
  dataAbertura: string;
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

export function FrenteCaixa() {
  const [busca, setBusca] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [produtosFiltrados, setProdutosFiltrados] = useState<IProdutoPDV[]>([]);
  const [carrinho, setCarrinho] = useState<IItemCarrinho[]>([]);
  
  const [formaPagamento, setFormaPagamento] = useState<'PIX' | 'CARTAO_DEBITO' | 'DINHEIRO' | 'CREDIARIO'>('PIX');
  const [valorRecebido, setValorRecebido] = useState<string>('');
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
  const [valorFechamento, setValorFechamento] = useState('');
  const [fechandoCaixa, setFechandoCaixa] = useState(false);

  const [modalVendasEspera, setModalVendasEspera] = useState(false);
  const [vendasPendentes, setVendasPendentes] = useState<IVendaPendente[]>([]);
  const [carregandoPendentes, setCarregandoPendentes] = useState(false);
  const [pausandoVenda, setPausandoVenda] = useState(false);

  const [modalSupervisor, setModalSupervisor] = useState(false);
  const [senhaSupervisor, setSenhaSupervisor] = useState('');
  const [acaoPendente, setAcaoPendente] = useState<(() => void) | null>(null);
  const [validandoSupervisor, setValidandoSupervisor] = useState(false);

  const [terminalAtivo, setTerminalAtivo] = useState<string>('Carregando...'); 

  const buscaInputRef = useRef<HTMLInputElement>(null);
  const senhaSupervisorRef = useRef<HTMLInputElement>(null);

  let regimeLoja = 'LUCRO_PRESUMIDO'; 
  let nomeOperador = 'Operador';
  try {
    const usuarioRaw = localStorage.getItem('@PDVUsuario');
    if (usuarioRaw) {
      const usuario = JSON.parse(usuarioRaw) as IUsuarioStorage;
      if (usuario.loja?.regimeTributario) regimeLoja = usuario.loja.regimeTributario;
      if (usuario.nome) nomeOperador = usuario.nome;
    }
  } catch (e) {
    console.error("Erro ao ler dados do usuário no PDV");
  }

  useEffect(() => {
    let nomeTerminal = localStorage.getItem('@PDV_Terminal_Name');
    if (!nomeTerminal) {
      nomeTerminal = prompt("Bem-vindo! Identifique esta máquina para o PDV.\nEx: Caixa 01, Terminal Balcão, etc.");
      if (!nomeTerminal || nomeTerminal.trim() === '') {
        nomeTerminal = `Terminal-${Math.floor(Math.random() * 10000)}`;
      }
      localStorage.setItem('@PDV_Terminal_Name', nomeTerminal);
    }
    setTerminalAtivo(nomeTerminal);
  }, []);

  useEffect(() => {
    verificarCaixa(); 
    carregarClientes();
    carregarProdutosEstrategicos();
  }, []);

  useEffect(() => {
    if (modalSupervisor) {
      setTimeout(() => senhaSupervisorRef.current?.focus(), 100);
    }
  }, [modalSupervisor]);

  const verificarCaixa = async () => {
    try {
      const response = await api.get<ISessaoCaixa>('/api/pdv/caixa/verificar');
      if (response.data) {
        setSessaoCaixa(response.data);
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
    setAbrindoCaixa(true);
    try {
      const response = await api.post<ISessaoCaixa>('/api/pdv/caixa/abrir', {
        saldoAbertura: Number(fundoTroco),
        observacao: "Abertura Padrão",
        terminal: terminalAtivo 
      });
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
    setValorFechamento('');
    setModalFechamento(true);
  };

  const executarFechamentoCaixa = async () => {
    if (!sessaoCaixa) return;
    if (!valorFechamento || isNaN(Number(valorFechamento))) return alert("Informe o valor físico contado na gaveta.");

    setFechandoCaixa(true);
    try {
      await api.put(`/api/pdv/caixa/${sessaoCaixa.id}/fechar`, {
        saldoFechamento: Number(valorFechamento),
        observacao: "Fechamento pelo PDV - Contagem Cega"
      });
      
      alert("✅ Caixa fechado com sucesso! Turno encerrado.");
      setSessaoCaixa(null);
      setModalFechamento(false);
      setModalCaixaAberto(true); 
    } catch (err) {
      const error = err as AxiosError<{error?: string}>;
      alert(`❌ Erro: ${error.response?.data?.error || "Não foi possível fechar o caixa."}`);
    } finally {
      setFechandoCaixa(false);
    }
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
      setValorRecebido('');
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
        return {
          ...item,
          quantidade: novaQuantidade,
          subtotal: novaQuantidade * Number(item.precoVenda)
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
    if (valorNum >= totaisBrutos.totalVenda) return alert("O desconto não pode ser maior ou igual ao total da venda.");

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

      const novoCarrinho: IItemCarrinho[] = vendaResgatada.itens.map((item: any) => ({
        id: item.produtoId,
        nome: item.produto.nome,
        codigo: item.produto.codigo,
        codigoBarras: item.produto.codigoBarras,
        precoVenda: item.valorUnitario,
        precoCusto: item.valorUnitario * 0.6, 
        quantidade: Number(item.quantidade),
        subtotal: Number(item.valorTotal)
      }));

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
      const response = await api.get<IClientePDV[]>('/api/pessoas');
      setClientes(response.data);
    } catch (err) {
      console.error("Erro ao buscar clientes", err);
    }
  };

  const carregarProdutosEstrategicos = async () => {
    try {
      const response = await api.get<IProdutoPDV[]>('/api/produtos');
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
    if (busca.length > 2) {
      const buscarProdutos = async () => {
        try {
          const response = await api.get<IProdutoPDV[]>(`/api/produtos?busca=${encodeURIComponent(busca)}`);
          setProdutosFiltrados(response.data);
        } catch (err) {
          console.error("Erro ao buscar produtos", err);
        }
      };
      buscarProdutos();
    } else {
      setProdutosFiltrados([]);
    }
  }, [busca]);

  const adicionarAoCarrinho = (produto: IProdutoPDV) => {
    const precoVendaNum = Number(produto.precoVenda) || 0;
    const precoCustoNum = produto.precoCusto ? Number(produto.precoCusto) : precoVendaNum * 0.6; 

    setCarrinho(prev => {
      const existe = prev.find(item => item.id === produto.id);
      if (existe) {
        return prev.map(item => 
          item.id === produto.id 
            ? { ...item, quantidade: item.quantidade + 1, subtotal: (item.quantidade + 1) * precoVendaNum }
            : item
        );
      }
      return [...prev, { ...produto, precoVenda: precoVendaNum, precoCusto: precoCustoNum, quantidade: 1, subtotal: precoVendaNum }];
    });
    setBusca('');
    setProdutosFiltrados([]); // Limpa a lista
    buscaInputRef.current?.focus();
  };

  // 🚀 NOVA LÓGICA DE ENTER: FORÇA A BUSCA DE CÓDIGOS CURTOS (EX: "5", "01")
  const handleKeyDownBusca = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && busca.trim().length > 0) {
      e.preventDefault();
      
      // Se já buscou e tem 1 resultado na tela, adiciona ele
      if (produtosFiltrados.length === 1) {
        adicionarAoCarrinho(produtosFiltrados[0]);
        return;
      }

      // Se não, força uma busca exata na API (ideal para código curto ou leitor de código de barras rápido)
      try {
        const response = await api.get<IProdutoPDV[]>(`/api/produtos?busca=${encodeURIComponent(busca)}`);
        
        // Procura match exato pelo novo 'codigo' ou 'codigoBarras'
        const matchExato = response.data.find(p => p.codigo === busca || p.codigoBarras === busca);
        
        if (matchExato) {
          adicionarAoCarrinho(matchExato);
        } else if (response.data.length === 1) {
          adicionarAoCarrinho(response.data[0]);
        } else if (response.data.length > 1) {
          setProdutosFiltrados(response.data); // Abre a lista para o usuário escolher
        } else {
          alert(`Nenhum produto encontrado com o código "${busca}".`);
          setBusca('');
        }
      } catch (err) {
        console.error("Erro na busca forçada:", err);
      }
    }
  };

  const totaisBrutos = carrinho.reduce((acc, item) => {
    const venda = Number(item.precoVenda) * item.quantidade;
    const custo = Number(item.precoCusto) * item.quantidade;
    return { totalVenda: acc.totalVenda + venda, totalCusto: acc.totalCusto + custo };
  }, { totalVenda: 0, totalCusto: 0 });

  const totais = {
    totalVenda: Math.max(0, totaisBrutos.totalVenda - descontoVenda),
    totalCusto: totaisBrutos.totalCusto
  };

  const lucroReal = totais.totalVenda - totais.totalCusto;
  
  const valorRec = valorRecebido ? Number(valorRecebido.replace(',', '.')) : 0;
  const troco = formaPagamento === 'DINHEIRO' && valorRec >= totais.totalVenda 
    ? valorRec - totais.totalVenda 
    : 0;

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

  const finalizarVenda = async () => {
    if (carrinho.length === 0) return alert("O carrinho está vazio!");
    if (!sessaoCaixa) return alert("Caixa não está aberto!");
    if (bloqueioFiscal) return alert("⚠️ Existem pendências fiscais! Corrija os erros listados antes de emitir a nota.");
    
    if (formaPagamento === 'DINHEIRO') {
      if (!valorRecebido || isNaN(valorRec) || valorRec < totais.totalVenda) {
        return alert(`⚠️ O valor recebido (R$ ${valorRec.toFixed(2)}) não pode ser menor que o total da venda!`);
      }
    }

    setFinalizando(true);
    try {
      let parcelasPayload = undefined;
      if (formaPagamento === 'CREDIARIO' && qtdParcelas > 0) {
        parcelasPayload = gerarParcelas(totais.totalVenda, qtdParcelas);
      }

      const payload: IPayloadVendaPDV = {
        sessaoCaixaId: sessaoCaixa.id, 
        clienteId: clienteSelecionado || undefined,
        terminal: terminalAtivo, 
        itens: carrinho.map(item => ({
          produtoId: item.id,
          quantidade: item.quantidade,
          valorUnitario: Number(item.precoVenda) 
        })),
        pagamentos: [{ tipoPagamento: formaPagamento, valor: totais.totalVenda }],
        tipoPagamento: formaPagamento,
        formaPagamento: formaPagamento, 
        valorTotal: totais.totalVenda,
        valorDesconto: descontoVenda, 
        modeloNota,
        parcelas: parcelasPayload
      };

      await api.post<{message?: string, vendaId?: string}>('/api/vendas', payload);
      
      alert("✅ Venda finalizada, estoque baixado e nota enviada para a SEFAZ com sucesso!");
      
      setCarrinho([]);
      setValorRecebido('');
      setBusca('');
      setClienteSelecionado('');
      setModeloNota('65');
      setFormaPagamento('PIX');
      setQtdParcelas(1);
      setDescontoVenda(0);
      setValorDescontoInput('');
      buscaInputRef.current?.focus();

    } catch (err) {
      const error = err as AxiosError<{error?: string, erro?: string}>;
      const mensagemErro = error.response?.data?.erro || error.response?.data?.error || "Erro ao finalizar venda.";
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

  const statesRef = useRef({ modalSupervisor, modalCaixaAberto, modalVendasEspera, modalFechamento });

  useEffect(() => {
    actionsRef.current = {
      finalizarVenda,
      pausarVendaSegura,
      abrirFilaDeEspera,
      aplicarDescontoSeguro,
      solicitarFechamentoCaixa,
      focarBusca: () => buscaInputRef.current?.focus()
    };
    statesRef.current = { modalSupervisor, modalCaixaAberto, modalVendasEspera, modalFechamento };
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const { modalSupervisor, modalCaixaAberto, modalVendasEspera, modalFechamento } = statesRef.current;

      if (e.key === 'Escape') {
        if (modalSupervisor) { setModalSupervisor(false); setAcaoPendente(null); }
        if (modalVendasEspera) setModalVendasEspera(false);
        if (modalFechamento) setModalFechamento(false);
        return;
      }

      if (modalSupervisor || modalCaixaAberto || modalVendasEspera || modalFechamento) return;

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
  }, []);

  return (
    <Layout>
      <style>{`
        @keyframes glow { 0% { box-shadow: 0 0 15px rgba(16, 185, 129, 0.4); } 50% { box-shadow: 0 0 30px rgba(16, 185, 129, 0.8); } 100% { box-shadow: 0 0 15px rgba(16, 185, 129, 0.4); } }
        .btn-glow { animation: glow 2s infinite; }
        @keyframes fadeInDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in-down { animation: fadeInDown 0.4s ease-out forwards; }
        @keyframes modalEnter { from { opacity: 0; transform: scale(0.95) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        .animate-modal { animation: modalEnter 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>

      {modalFechamento && (
        <div className="fixed inset-0 bg-[#020617]/85 backdrop-blur-md flex items-center justify-center z-[70] p-4">
          <div className="bg-[#08101f] border border-orange-500/30 rounded-[30px] shadow-[0_25px_80px_rgba(0,0,0,0.60)] w-full max-w-md flex flex-col relative overflow-hidden animate-modal">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-violet-600 to-fuchsia-600"></div>
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-violet-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-violet-500/20">
                <Power className="w-8 h-8 text-violet-300" />
              </div>
              <h2 className="text-xl font-black text-white mb-2">Fechamento de Caixa</h2>
              <p className="text-slate-400 text-xs mb-6">Realize a contagem cega. Informe o valor total em <strong className="text-white">Dinheiro Físico</strong> presente na gaveta neste momento.</p>
              
              <div className="text-left mb-6">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 pl-1">Saldo em Gaveta (R$)</label>
                <input 
                  type="number" 
                  autoFocus
                  placeholder="Ex: 550.00"
                  className="w-full p-4 bg-slate-950 border border-slate-700 text-white rounded-xl focus:ring-2 focus:ring-violet-500 outline-none text-2xl font-black font-mono shadow-inner text-center"
                  value={valorFechamento}
                  onChange={(e) => setValorFechamento(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && executarFechamentoCaixa()}
                />
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setModalFechamento(false)}
                  className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold text-sm transition-colors"
                >
                  Cancelar [ESC]
                </button>
                <button 
                  onClick={executarFechamentoCaixa}
                  disabled={fechandoCaixa || !valorFechamento}
                  className="flex-1 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white rounded-xl font-black text-sm uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(139,92,246,0.30)] disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {fechandoCaixa ? <Loader2 className="w-4 h-4 animate-spin"/> : 'Encerrar Turno'}
                </button>
              </div>
            </div>
          </div>
        </div>
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
                className="w-full p-3.5 pl-12 text-lg font-bold bg-[#0b1324] border border-white/10 rounded-xl focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500/40 outline-none text-white placeholder:text-slate-500 transition-all shadow-inner"
                value={busca}
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
                {carrinho.map((item, idx) => (
                  <div key={idx} className="bg-[#0b1324]/80 border border-white/10 p-3 rounded-xl flex items-center justify-between group shadow-sm hover:border-white/20 transition-colors">
                    <div className="flex-1">
                      {/* 🚀 EXIBINDO O CÓDIGO CURTO NO CARRINHO */}
                      <p className="text-white font-bold text-sm truncate pr-2">
                        {item.codigo ? <span className="text-violet-400 font-mono mr-1">[{item.codigo}]</span> : ''}
                        {item.nome}
                      </p>
                      <p className="text-violet-300 font-black text-xs font-mono mt-0.5">R$ {Number(item.precoVenda).toFixed(2)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center bg-[#08101f] rounded-lg border border-white/10 shadow-inner">
                        <button onClick={() => alterarQuantidadeSeguro(item.id, -1)} className="px-2.5 py-1 text-slate-400 hover:text-white font-bold">-</button>
                        <span className="text-white font-black px-1.5 text-sm min-w-[1.5rem] text-center">{item.quantidade}</span>
                        <button onClick={() => alterarQuantidadeSeguro(item.id, 1)} className="px-2.5 py-1 text-slate-400 hover:text-white font-bold">+</button>
                      </div>
                      <p className="text-white font-black w-16 text-right text-sm font-mono">R$ {(Number(item.precoVenda) * item.quantidade).toFixed(2)}</p>
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
              <div>
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-0.5">Total a Pagar</p>
                {descontoVenda > 0 && (
                  <p className="text-red-400 text-xs font-bold line-through mb-0.5">R$ {totaisBrutos.totalVenda.toFixed(2)}</p>
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

            <div className="mb-2">
              <div className="grid grid-cols-4 gap-2">
                {(['PIX', 'CARTAO_DEBITO', 'DINHEIRO', 'CREDIARIO'] as const).map(forma => (
                  <button
                    key={forma}
                    onClick={() => { setFormaPagamento(forma); if (forma !== 'CREDIARIO') setQtdParcelas(1); }}
                    className={`py-2 rounded-lg flex flex-col items-center gap-1 font-black text-[9px] uppercase tracking-wider border-2 transition-all ${
                      formaPagamento === forma ? 'bg-violet-500/15 border-violet-500/40 text-violet-300 shadow-[0_0_10px_rgba(139,92,246,0.25)]' : 'bg-[#08101f] border-white/10 text-slate-500'
                    }`}
                  >
                    {forma === 'PIX' && <QrCode className="w-4 h-4" />}
                    {forma === 'CARTAO_DEBITO' && <CreditCard className="w-4 h-4" />}
                    {forma === 'DINHEIRO' && <Banknote className="w-4 h-4" />}
                    {forma === 'CREDIARIO' && <ShieldCheck className="w-4 h-4" />}
                    {forma === 'CARTAO_DEBITO' ? 'DÉBITO' : forma === 'CREDIARIO' ? 'PRAZO' : forma}
                  </button>
                ))}
              </div>
            </div>

            {formaPagamento === 'CREDIARIO' && (
              <div className="mb-2">
                <select 
                  className="w-full p-2 bg-[#08101f] border border-white/10 text-white font-bold text-xs rounded-lg focus:ring-2 focus:ring-violet-500/20 outline-none"
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
            )}

            {formaPagamento === 'DINHEIRO' && (
              <div className="mb-2 flex gap-2 items-center">
                <input 
                  type="number" 
                  placeholder="Recebido (R$)"
                  className="flex-1 p-2 bg-[#08101f] border border-white/10 text-white rounded-lg focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500/40 outline-none text-sm font-black font-mono shadow-inner"
                  value={valorRecebido}
                  onChange={(e) => setValorRecebido(e.target.value)}
                />
                {valorRecebido && troco >= 0 && (
                  <p className="text-emerald-400 font-black text-xs bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20 whitespace-nowrap">
                    Troco: R$ {troco.toFixed(2)}
                  </p>
                )}
              </div>
            )}

            <button 
              onClick={finalizarVenda}
              disabled={carrinho.length === 0 || finalizando || bloqueioFiscal || !sessaoCaixa}
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
      <div className="text-center mt-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center justify-center gap-4">
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