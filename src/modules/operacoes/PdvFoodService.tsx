import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Layout } from '../../components/Layout';
import { api } from '../../services/api';
import { 
  Search, ShoppingCart, CreditCard, Banknote, QrCode, 
  Trash2, Check, User, UtensilsCrossed, Monitor, 
  Bike, Plus, Minus, Tag, Coffee, Pizza, AlertCircle, RefreshCw,
  Users, Calculator, Bot, ShieldAlert, XCircle
} from 'lucide-react';
import { AxiosError } from 'axios';
import { toast } from 'react-toastify';
import { getCardapioTotem } from '../../services/api/cardapioTotemApi';
import {
  aguardarAutorizacaoTefHardware,
  tefCancelarAutorizacaoPendente,
  tefFalhaSalvarVendaCnc,
  tefPosVendaSucessoCnc,
} from '../../services/tefCncFlow';

// --- INTERFACES ---
interface IProduto {
  id: string;
  itemCardapioId: string;
  produtoId: string;
  nome: string;
  codigo?: string; // 🚀 ADICIONADO: Novo Código Curto
  codigoBarras?: string;
  precoVenda: number;
  categoria: string;
}

interface IItemCarrinho extends IProduto {
  quantidade: number;
  subtotal: number;
  observacao?: string;
}

type ModoAtendimento = 'BALCAO' | 'MESA' | 'DELIVERY';
type StatusMesa = 'LIVRE' | 'OCUPADA' | 'FECHANDO';

interface IMesa {
  numero: number;
  status: StatusMesa;
  itens: IItemCarrinho[];
}

interface IPagamentoParcial {
  id: string;
  tipoPagamento: string;
  valor: number;
  transacaoTefId?: string;
  canalAdquirente?: 'POS' | 'TEF';
}

export function PdvFoodService() {
  // --- ESTADOS GERAIS ---
  const [modoAtendimento, setModoAtendimento] = useState<ModoAtendimento>('BALCAO');
  const [produtos, setProdutos] = useState<IProduto[]>([]);
  const [categorias, setCategorias] = useState<string[]>([]);
  const [categoriaAtiva, setCategoriaAtiva] = useState<string>('Todas');
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(false);
  const [recarregandoMesas, setRecarregandoMesas] = useState(false);

  // --- ESTADOS DO CARRINHO ---
  const [carrinho, setCarrinho] = useState<IItemCarrinho[]>([]);
  const [clienteDelivery, setClienteDelivery] = useState({ nome: '', telefone: '', endereco: '' });

  // --- ESTADOS DE MESAS ---
  const [mesas, setMesas] = useState<IMesa[]>(
    Array.from({ length: 20 }, (_, i) => ({ numero: i + 1, status: 'LIVRE', itens: [] }))
  );
  const [mesaSelecionada, setMesaSelecionada] = useState<number | null>(null);

  // --- ESTADOS DE PAGAMENTO (SPLIT BILL) ---
  const [modalPagamento, setModalPagamento] = useState(false);
  const [formaPagamentoAtual, setFormaPagamentoAtual] = useState('PIX');
  const [valorDigitado, setValorDigitado] = useState<string>('');
  const [pagamentosAdicionados, setPagamentosAdicionados] = useState<IPagamentoParcial[]>([]);
  const [dividirPor, setDividirPor] = useState<number>(1);
  const [finalizando, setFinalizando] = useState(false);
  const [tefFoodBusy, setTefFoodBusy] = useState(false);

  // 🚀 ESTADOS: ESCUDO FISCAL E AUTO-RETENTATIVA
  const [alertaAurya, setAlertaAurya] = useState<string | null>(null);
  const [aguardandoFoco, setAguardandoFoco] = useState(false);

  const carregarProdutos = useCallback(async () => {
    setLoading(true);
    try {
      const { itens } = await getCardapioTotem();
      const prods: IProduto[] = itens.map((item) => ({
        id: item.id,
        itemCardapioId: item.id,
        produtoId: item.produtoId,
        nome: item.nome,
        precoVenda: Number(item.precoVenda),
        categoria: item.categoria || 'Geral',
      }));
      setProdutos(prods);
      const cats = Array.from(new Set(prods.map((p) => p.categoria || 'Geral'))) as string[];
      setCategorias(['Todas', ...cats]);
    } catch (error) {
      console.error('Erro ao carregar produtos', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const carregarMesas = useCallback(async () => {
    setRecarregandoMesas(true);
    try {
      const response = await api.get('/api/mesas');
      const mesasAtivas = response.data;

      const gridAtualizado = Array.from({ length: 20 }, (_, i) => {
        const numero = i + 1;
        const mesaBanco = mesasAtivas.find((m: any) => m.numero === numero);
        
        if (mesaBanco && mesaBanco.status !== 'LIVRE') {
          return {
            numero,
            status: mesaBanco.status,
            itens: mesaBanco.itens.map((item: any) => ({
              id: item.produto.id,
              itemCardapioId: item.itemCardapio?.id ?? item.produto.id,
              produtoId: item.produto.id,
              nome: item.produto.nome,
              codigo: item.produto.codigo, // 🚀 Mapeando o código
              codigoBarras: item.produto.codigoBarras,
              precoVenda: Number(item.produto.precoVenda),
              quantidade: Number(item.quantidade),
              subtotal: Number(item.valorTotal),
              observacao: item.observacao
            }))
          };
        }
        return { numero, status: 'LIVRE', itens: [] };
      });

      setMesas(gridAtualizado as IMesa[]);
    } catch (error) {
      console.error("Erro ao carregar mesas", error);
    } finally {
      setRecarregandoMesas(false);
    }
  }, []);

  useEffect(() => {
    void carregarProdutos();
    void carregarMesas();
  }, [carregarProdutos, carregarMesas]);

  // --- LÓGICA DE CARRINHO ---
  const getCarrinhoAtual = useCallback(() => {
    if (modoAtendimento === 'MESA' && mesaSelecionada) {
      return mesas.find(m => m.numero === mesaSelecionada)?.itens || [];
    }
    return carrinho;
  }, [modoAtendimento, mesaSelecionada, mesas, carrinho]);

  const adicionarAoCarrinho = (produto: IProduto) => {
    const atualizarLista = (listaAtual: IItemCarrinho[]) => {
      const index = listaAtual.findIndex(item => item.id === produto.id && !item.observacao);
      if (index >= 0) {
        const novaLista = [...listaAtual];
        novaLista[index].quantidade += 1;
        novaLista[index].subtotal = novaLista[index].quantidade * novaLista[index].precoVenda;
        return novaLista;
      }
      return [...listaAtual, { ...produto, quantidade: 1, subtotal: Number(produto.precoVenda) }];
    };

    if (modoAtendimento === 'MESA' && mesaSelecionada) {
      setMesas(prev => prev.map(m => m.numero === mesaSelecionada ? { ...m, status: 'OCUPADA', itens: atualizarLista(m.itens) } : m));
    } else {
      setCarrinho(prev => atualizarLista(prev));
    }
  };

  const alterarQuantidade = (id: string, delta: number, observacao?: string) => {
    const atualizarLista = (listaAtual: IItemCarrinho[]) => {
      return listaAtual.map(item => {
        if (item.id === id && item.observacao === observacao) {
          const novaQtd = Math.max(1, item.quantidade + delta);
          return { ...item, quantidade: novaQtd, subtotal: novaQtd * item.precoVenda };
        }
        return item;
      });
    };

    if (modoAtendimento === 'MESA' && mesaSelecionada) {
      setMesas(prev => prev.map(m => m.numero === mesaSelecionada ? { ...m, itens: atualizarLista(m.itens) } : m));
    } else {
      setCarrinho(prev => atualizarLista(prev));
    }
  };

  const removerItem = (id: string, observacao?: string) => {
    if (modoAtendimento === 'MESA' && mesaSelecionada) {
      setMesas(prev => prev.map(m => {
        if (m.numero === mesaSelecionada) {
          const novosItens = m.itens.filter(item => !(item.id === id && item.observacao === observacao));
          return { ...m, status: novosItens.length === 0 ? 'LIVRE' : m.status, itens: novosItens };
        }
        return m;
      }));
    } else {
      setCarrinho(prev => prev.filter(item => !(item.id === id && item.observacao === observacao)));
    }
  };

  // --- LÓGICA DE PAGAMENTO (SPLIT BILL) ---
  const totalCarrinho = useMemo(() => getCarrinhoAtual().reduce((acc, item) => acc + item.subtotal, 0), [getCarrinhoAtual]);
  
  const totalPago = useMemo(() => pagamentosAdicionados.reduce((acc, p) => acc + p.valor, 0), [pagamentosAdicionados]);
  const saldoDevedor = Math.max(0, totalCarrinho - totalPago);
  const troco = Math.max(0, totalPago - totalCarrinho);
  
  const valorPorPessoa = useMemo(() => totalCarrinho / dividirPor, [totalCarrinho, dividirPor]);

  useEffect(() => {
    if (modalPagamento) {
      if (dividirPor > 1 && pagamentosAdicionados.length < dividirPor - 1) {
        setValorDigitado(valorPorPessoa.toFixed(2));
      } else {
        setValorDigitado(saldoDevedor.toFixed(2));
      }
    }
  }, [modalPagamento, saldoDevedor, dividirPor, valorPorPessoa, pagamentosAdicionados.length]);

  const adicionarPagamentoParcial = async () => {
    const valor = Number(valorDigitado.replace(',', '.'));
    if (valor <= 0) return;
    if (valor > saldoDevedor + 0.009) {
      alert(
        `O valor (R$ ${valor.toFixed(2)}) não pode ser maior que o saldo devedor (R$ ${saldoDevedor.toFixed(2)}).`
      );
      return;
    }

    if (formaPagamentoAtual === 'CREDITO_TEF' || formaPagamentoAtual === 'DEBITO_TEF') {
      setTefFoodBusy(true);
      try {
        const { transacaoTefId } = await aguardarAutorizacaoTefHardware({
          valor,
          tipoCartao: formaPagamentoAtual === 'CREDITO_TEF' ? 'CREDITO' : 'DEBITO',
          terminal: 'FOOD-SERVICE',
        });
        setPagamentosAdicionados((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            tipoPagamento: formaPagamentoAtual === 'CREDITO_TEF' ? 'CARTAO_CREDITO' : 'CARTAO_DEBITO',
            valor,
            transacaoTefId,
            canalAdquirente: 'TEF',
          },
        ]);
      } catch (e) {
        alert(e instanceof Error ? e.message : 'Falha na autorização TEF.');
      } finally {
        setTefFoodBusy(false);
      }
      return;
    }

    setPagamentosAdicionados((prev) => [
      ...prev,
      { id: Date.now().toString(), tipoPagamento: formaPagamentoAtual, valor },
    ]);
  };

  const removerPagamentoParcial = (id: string) => {
    const pag = pagamentosAdicionados.find((p) => p.id === id);
    if (pag?.transacaoTefId) {
      void tefCancelarAutorizacaoPendente(pag.transacaoTefId).catch(() => undefined);
    }
    setPagamentosAdicionados((prev) => prev.filter((p) => p.id !== id));
  };

  const abrirModalPagamento = () => {
    setPagamentosAdicionados([]);
    setDividirPor(1);
    setModalPagamento(true);
  };

  // --- FINALIZAÇÃO DE VENDA ---
  const finalizarVenda = useCallback(async () => {
    if (getCarrinhoAtual().length === 0 || saldoDevedor > 0.01) return;
    setFinalizando(true);

    try {
      const pagamentosFinais = [...pagamentosAdicionados];
      if (troco > 0) {
        const pagDinheiro = pagamentosFinais.find(p => p.tipoPagamento === 'DINHEIRO');
        if (pagDinheiro) pagDinheiro.valor -= troco;
      }

      const tefIdsSnapshot = pagamentosFinais
        .map((p) => p.transacaoTefId)
        .filter((id): id is string => typeof id === 'string' && id.trim().length > 0);

      const payload = {
        modo: modoAtendimento,
        mesa: mesaSelecionada,
        clienteDelivery: modoAtendimento === 'DELIVERY' ? clienteDelivery : null,
        itens: getCarrinhoAtual().map(i => ({
          produtoId: i.produtoId || i.id,
          itemCardapioId: i.itemCardapioId || i.id,
          quantidade: i.quantidade,
          valorUnitario: i.precoVenda,
          valorTotal: i.subtotal
        })),
        valorTotal: totalCarrinho,
        pagamentos: pagamentosFinais.map((p) => ({
          tipoPagamento: p.tipoPagamento,
          valor: p.valor,
          ...(p.transacaoTefId
            ? { transacaoTefId: p.transacaoTefId, canalAdquirente: 'TEF' as const }
            : p.tipoPagamento === 'CARTAO_CREDITO' || p.tipoPagamento === 'CARTAO_DEBITO'
              ? { canalAdquirente: 'POS' as const }
              : {}),
        })),
      };

      const resVenda = await api.post<{
        venda?: { id: string };
        auryaCorrecoesTributarias?: { nomeProduto: string; cstAnterior: string; csosnNovo: string }[];
      }>('/api/vendas', payload);

      if (tefIdsSnapshot.length > 0) {
        try {
          await tefPosVendaSucessoCnc(tefIdsSnapshot, {
            vendaId: resVenda.data.venda?.id ?? '',
            contextoFood:
              modoAtendimento === 'MESA' && mesaSelecionada != null
                ? { modo: 'MESA', mesa: mesaSelecionada }
                : modoAtendimento === 'DELIVERY'
                  ? { modo: 'DELIVERY' }
                  : undefined,
          });
        } catch (tefErr) {
          console.error(tefErr);
          toast.error('Venda gravada, mas a confirmação TEF falhou. Verifique a maquininha e o ERP.');
        }
      }

      const correcoes = resVenda.data.auryaCorrecoesTributarias ?? [];
      for (const c of correcoes) {
        toast.success(
          `Aurya: CST do produto ${c.nomeProduto} corrigido automaticamente para Simples Nacional`,
          { autoClose: 4500 }
        );
      }

      alert('✅ Venda finalizada com sucesso! Mesa liberada.');
      
      if (modoAtendimento === 'MESA' && mesaSelecionada) {
        setMesas(prev => prev.map(m => m.numero === mesaSelecionada ? { ...m, status: 'LIVRE', itens: [] } : m));
        setMesaSelecionada(null);
        carregarMesas();
      } else {
        setCarrinho([]);
        setClienteDelivery({ nome: '', telefone: '', endereco: '' });
      }
      setModalPagamento(false);

    } catch (err) {
      const error = err as AxiosError<{error?: string}>;
      const mensagemErro = error.response?.data?.error || 'Erro desconhecido ao finalizar venda.';

      const tefIdsRollback = pagamentosAdicionados
        .map((p) => p.transacaoTefId)
        .filter((id): id is string => typeof id === 'string' && id.trim().length > 0);
      if (tefIdsRollback.length > 0) {
        void tefFalhaSalvarVendaCnc(tefIdsRollback).catch(() => undefined);
      }

      if (mensagemErro.includes('Rejeição Sefaz Evitada')) {
        setAlertaAurya(mensagemErro);
      } else {
        alert(`❌ Erro ao finalizar: ${mensagemErro}`);
      }
    } finally {
      setFinalizando(false);
    }
  }, [
    getCarrinhoAtual,
    saldoDevedor,
    troco,
    pagamentosAdicionados,
    modoAtendimento,
    mesaSelecionada,
    clienteDelivery,
    totalCarrinho,
    carregarMesas,
  ]);

  // ============================================================================
  // 🚀 MÁGICA DA AURYA: AUTO-RETENTATIVA APÓS CORREÇÃO EM OUTRA ABA
  // ============================================================================
  
  const finalizarVendaRef = useRef(finalizarVenda);
  useEffect(() => {
    finalizarVendaRef.current = finalizarVenda;
  }, [finalizarVenda]);

  useEffect(() => {
    const handleFocus = () => {
      if (aguardandoFoco && alertaAurya) {
        setAguardandoFoco(false);
        setAlertaAurya(null);
        
        setTimeout(() => {
          finalizarVendaRef.current();
        }, 800);
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [aguardandoFoco, alertaAurya]);

  const matchProduto = alertaAurya?.match(/O produto "(.*?)" possui/);
  const nomeProdutoErro = matchProduto ? matchProduto[1] : null;
  const produtoComErro = getCarrinhoAtual().find(item => item.nome === nomeProdutoErro);
  const idProdutoErro = produtoComErro?.id;

  const abrirEdicaoProduto = () => {
    setAguardandoFoco(true);
    if (idProdutoErro) {
      window.open(`/produtos?edit=${idProdutoErro}`, '_blank');
    } else {
      window.open('/produtos', '_blank');
    }
  };

  const abrirEdicaoLoja = () => {
    setAguardandoFoco(true);
    window.open('/configuracoes', '_blank');
  };

  // ============================================================================
  // 🚀 LÓGICA DE BUSCA INTELIGENTE E ENTER
  // ============================================================================

  const produtosFiltrados = produtos.filter(p => {
    const matchCategoria = categoriaAtiva === 'Todas' || (p.categoria || 'Geral') === categoriaAtiva;
    const matchBusca = p.nome.toLowerCase().includes(busca.toLowerCase()) || 
                       p.codigoBarras?.includes(busca) ||
                       p.codigo?.includes(busca); // 🚀 Permite filtrar pelo código curto
    return matchCategoria && matchBusca;
  });

  // 🚀 Bipagem rápida / Digitar código e dar Enter
  const handleKeyDownBusca = async (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && busca.trim().length > 0) {
      e.preventDefault();
      
      if (produtosFiltrados.length === 1) {
        adicionarAoCarrinho(produtosFiltrados[0]);
        setBusca('');
        return;
      }

      // Procura match exato na lista carregada
      const matchExato = produtos.find(p => p.codigo === busca || p.codigoBarras === busca);
      
      if (matchExato) {
        adicionarAoCarrinho(matchExato);
        setBusca('');
      } else {
        // Se não achou, tenta bater na API (Fallback de segurança)
        try {
          const response = await api.get<IProduto[]>(`/api/cadastros/produtos?busca=${encodeURIComponent(busca)}`);
          const matchExatoApi = response.data.find(p => p.codigo === busca || p.codigoBarras === busca);
          
          if (matchExatoApi) {
            adicionarAoCarrinho(matchExatoApi);
            setBusca('');
          } else if (response.data.length === 1) {
            adicionarAoCarrinho(response.data[0]);
            setBusca('');
          } else {
            alert(`Nenhum produto encontrado com o código "${busca}".`);
            setBusca('');
          }
        } catch (err) {
          console.error("Erro na busca forçada:", err);
        }
      }
    }
  };

  const nomesFormasPagamento: Record<string, string> = {
    DINHEIRO: 'Dinheiro',
    PIX: 'PIX',
    CARTAO_CREDITO: 'Crédito (POS)',
    CARTAO_DEBITO: 'Débito (POS)',
    CREDITO_TEF: 'CREDITO TEF',
    DEBITO_TEF: 'DEBITO TEF',
  };

  const rotuloPagamento = (pag: IPagamentoParcial) => {
    if (pag.transacaoTefId) {
      if (pag.tipoPagamento === 'CARTAO_CREDITO') return 'CREDITO TEF';
      if (pag.tipoPagamento === 'CARTAO_DEBITO') return 'DEBITO TEF';
    }
    return nomesFormasPagamento[pag.tipoPagamento] || pag.tipoPagamento;
  };

  return (
    <Layout>
      <div className="h-[calc(100vh-80px)] flex flex-col lg:flex-row gap-4">
        
        {/* LADO ESQUERDO: CATÁLOGO / MESAS */}
        <div className="flex-1 flex flex-col gap-4 bg-[#08101f]/90 backdrop-blur-xl rounded-[30px] border border-white/10 p-4 shadow-[0_25px_60px_rgba(0,0,0,0.35)] overflow-hidden">
          
          {/* SELETOR DE MODO DE ATENDIMENTO */}
          <div className="flex p-1 bg-[#0b1324] rounded-xl border border-white/10 shrink-0">
            <button 
              onClick={() => { setModoAtendimento('BALCAO'); setMesaSelecionada(null); }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold transition-all ${modoAtendimento === 'BALCAO' ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-[0_0_15px_rgba(139,92,246,0.30)]' : 'text-slate-400 hover:bg-white/5'}`}
            >
              <Monitor className="w-4 h-4" /> Balcão Rápido
            </button>
            <button 
              onClick={() => { setModoAtendimento('MESA'); carregarMesas(); }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold transition-all ${modoAtendimento === 'MESA' ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-[0_0_15px_rgba(139,92,246,0.30)]' : 'text-slate-400 hover:bg-white/5'}`}
            >
              <UtensilsCrossed className="w-4 h-4" /> Controle de Mesas
            </button>
            <button 
              onClick={() => { setModoAtendimento('DELIVERY'); setMesaSelecionada(null); }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold transition-all ${modoAtendimento === 'DELIVERY' ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-[0_0_15px_rgba(139,92,246,0.30)]' : 'text-slate-400 hover:bg-white/5'}`}
            >
              <Bike className="w-4 h-4" /> Delivery
            </button>
          </div>

          {/* ÁREA DINÂMICA: PRODUTOS OU MAPA DE MESAS */}
          {modoAtendimento === 'MESA' && !mesaSelecionada ? (
            // MAPA DE MESAS
            <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-black flex items-center gap-2">
                  <UtensilsCrossed className="w-5 h-5 text-violet-300"/> Mapa do Salão
                </h3>
                <button 
                  onClick={carregarMesas}
                  className="flex items-center gap-2 text-xs font-bold text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg border border-white/10 transition-all"
                >
                  <RefreshCw className={`w-3 h-3 ${recarregandoMesas ? 'animate-spin text-fuchsia-400' : ''}`} />
                  Atualizar Pedidos
                </button>
              </div>

              <div className="grid grid-cols-4 md:grid-cols-5 gap-4">
                {mesas.map(mesa => (
                  <button
                    key={mesa.numero}
                    onClick={() => setMesaSelecionada(mesa.numero)}
                    className={`aspect-square rounded-2xl flex flex-col items-center justify-center gap-2 border-2 transition-all hover:scale-105 ${
                      mesa.status === 'LIVRE' ? 'bg-[#0b1324]/70 border-white/10 text-slate-400 hover:border-violet-500/30' :
                      mesa.status === 'OCUPADA' ? 'bg-violet-500/15 border-violet-500/40 text-white shadow-[0_0_15px_rgba(139,92,246,0.30)]' :
                      'bg-amber-500/15 border-amber-500/40 text-amber-300'
                    }`}
                  >
                    <span className="text-2xl font-black">{mesa.numero}</span>
                    <span className="text-[10px] font-bold uppercase tracking-widest">
                      {mesa.status === 'OCUPADA' ? `R$ ${mesa.itens.reduce((a, b) => a + b.subtotal, 0).toFixed(2)}` : 'Livre'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            // CATÁLOGO DE PRODUTOS
            <div className="flex-1 flex flex-col overflow-hidden">
              {modoAtendimento === 'MESA' && mesaSelecionada && (
                <div className="flex items-center justify-between bg-violet-500/10 border border-violet-500/20 p-3 rounded-xl mb-4 shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-violet-500/15 rounded-lg flex items-center justify-center text-violet-300 font-black border border-violet-500/20">
                      {mesaSelecionada}
                    </div>
                    <div>
                      <p className="text-white font-bold text-sm">Mesa {mesaSelecionada}</p>
                      <p className="text-violet-300 text-xs">Aguardando Pagamento / Novos Itens</p>
                    </div>
                  </div>
                  <button onClick={() => setMesaSelecionada(null)} className="text-sm font-bold text-slate-300 hover:text-white px-3 py-1 bg-white/5 border border-white/10 rounded-lg">Voltar ao Mapa</button>
                </div>
              )}

              <div className="flex flex-col gap-3 mb-4 shrink-0">
                <div className="relative">
                  <Search className="w-5 h-5 text-violet-300 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input 
                    type="text" 
                    placeholder="Buscar produto por nome, código curto ou cód. barras..." // 🚀 ATUALIZADO
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    onKeyDown={handleKeyDownBusca} // 🚀 ADICIONADO: Motor de busca rápida
                    className="w-full bg-[#0b1324] border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-violet-500/40 focus:ring-2 focus:ring-violet-500/20"
                  />
                </div>
                
                <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-2">
                  {categorias.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setCategoriaAtiva(cat)}
                      className={`whitespace-nowrap px-4 py-2 rounded-xl text-sm font-bold border transition-all ${
                        categoriaAtiva === cat 
                          ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 border-violet-500/30 text-white shadow-[0_0_15px_rgba(139,92,246,0.30)]' 
                          : 'bg-[#0b1324] border-white/10 text-slate-400 hover:bg-white/5'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {produtosFiltrados.map(produto => (
                    <button
                      key={produto.id}
                      onClick={() => adicionarAoCarrinho(produto)}
                      className="bg-[#0b1324]/70 border border-white/10 rounded-2xl p-3 flex flex-col items-center text-center hover:bg-white/5 hover:border-violet-500/20 transition-all group"
                    >
                      <div className="w-12 h-12 bg-[#08101f] rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-inner border border-white/10">
                        {produto.categoria?.toLowerCase().includes('bebida') ? <Coffee className="w-6 h-6 text-violet-300" /> : <Pizza className="w-6 h-6 text-amber-300" />}
                      </div>
                      <span className="text-white text-sm font-bold line-clamp-2 leading-tight mb-1">
                        {/* 🚀 EXIBE O CÓDIGO CURTO NO BOTÃO */}
                        {produto.codigo ? <span className="text-violet-400 font-mono mr-1">[{produto.codigo}]</span> : ''}
                        {produto.nome}
                      </span>
                      <span className="text-emerald-300 text-sm font-black mt-auto">R$ {Number(produto.precoVenda).toFixed(2)}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* LADO DIREITO: CARRINHO E PAGAMENTO */}
        <div className="w-full lg:w-[400px] flex flex-col bg-[#08101f]/90 backdrop-blur-xl rounded-[30px] border border-white/10 shadow-[0_25px_60px_rgba(0,0,0,0.35)] overflow-hidden shrink-0">
          
          <div className="bg-[#0b1324] p-5 border-b border-white/10 flex items-center justify-between">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-violet-300">Food Service Intelligence</div>
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-violet-300" /> Pedido Atual
            </h2>
            <span className="bg-violet-500/10 text-violet-300 text-xs font-bold px-3 py-1 rounded-full border border-violet-500/20">
              {getCarrinhoAtual().length} itens
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {getCarrinhoAtual().length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-3">
                <ShoppingCart className="w-12 h-12 opacity-20" />
                <p className="text-sm font-medium">Nenhum item no pedido</p>
              </div>
            ) : (
              getCarrinhoAtual().map(item => (
                <div key={`${item.id}-${item.observacao || ''}`} className="bg-[#0b1324]/70 border border-white/10 rounded-xl p-3 flex flex-col gap-2">
                  <div className="flex justify-between items-start">
                    <span className="text-white font-bold text-sm leading-tight pr-4">
                      {/* 🚀 EXIBE O CÓDIGO CURTO NO CARRINHO */}
                      {item.codigo ? <span className="text-violet-400 font-mono mr-1">[{item.codigo}]</span> : ''}
                      {item.nome}
                    </span>
                    <button onClick={() => removerItem(item.id, item.observacao)} className="text-slate-500 hover:text-red-300 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  {item.observacao && (
                    <p className="text-xs text-violet-300 italic">OBS: {item.observacao}</p>
                  )}
                  <div className="flex justify-between items-center mt-1">
                    <div className="flex items-center bg-[#08101f] rounded-lg border border-white/10 overflow-hidden">
                      <button onClick={() => alterarQuantidade(item.id, -1, item.observacao)} className="p-1.5 text-slate-400 hover:text-white hover:bg-white/5"><Minus className="w-3 h-3" /></button>
                      <span className="w-8 text-center text-sm font-bold text-white">{item.quantidade}</span>
                      <button onClick={() => alterarQuantidade(item.id, 1, item.observacao)} className="p-1.5 text-slate-400 hover:text-white hover:bg-white/5"><Plus className="w-3 h-3" /></button>
                    </div>
                    <span className="text-emerald-300 font-black text-sm">R$ {item.subtotal.toFixed(2)}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="bg-[#0b1324] p-5 border-t border-white/10 shrink-0">
            <div className="flex justify-between items-end mb-4">
              <span className="text-slate-400 text-sm font-bold uppercase tracking-widest">Total a Pagar</span>
              <span className="text-3xl font-black text-emerald-400">R$ {totalCarrinho.toFixed(2)}</span>
            </div>
            
            <button 
              onClick={abrirModalPagamento}
              disabled={getCarrinhoAtual().length === 0}
              className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-500 text-white rounded-xl font-black text-lg shadow-[0_0_20px_rgba(16,185,129,0.30)] transition-all disabled:opacity-50 disabled:transform-none transform hover:-translate-y-1"
            >
              COBRAR PEDIDO
            </button>
          </div>
        </div>

      </div>

      {/* MODAL DE PAGAMENTO (SPLIT BILL) */}
      {modalPagamento && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-[#020617]/80 backdrop-blur-sm relative">
          {tefFoodBusy && (
            <div
              className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-3 rounded-[30px] bg-[#020617]/85 px-6 text-center"
              role="status"
              aria-live="polite"
            >
              <CreditCard className="h-10 w-10 text-violet-400 animate-pulse" aria-hidden />
              <p className="text-sm font-bold text-white">CREDITO TEF / DEBITO TEF — aguarde o PinPad (CNC).</p>
            </div>
          )}
          <div className="bg-[#08101f] border border-white/10 rounded-[30px] w-full max-w-2xl overflow-hidden shadow-[0_25px_80px_rgba(0,0,0,0.60)] animate-in zoom-in-95 duration-200 flex flex-col md:flex-row">
            
            {/* Lado Esquerdo do Modal: Calculadora e Formas de Pagamento */}
            <div className="flex-1 p-6 border-b md:border-b-0 md:border-r border-white/10">
              <h2 className="text-xl font-black text-white mb-6 flex items-center gap-2">
                <Calculator className="w-5 h-5 text-violet-300" /> Detalhes do Pagamento
              </h2>

              {/* Calculadora de Divisão de Conta */}
              <div className="mb-6 bg-[#0b1324]/70 rounded-2xl p-4 border border-white/10">
                <div className="flex justify-between items-center mb-3">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Users className="w-4 h-4" /> Dividir Conta (Pessoas)
                  </label>
                  <div className="flex items-center bg-slate-900 rounded-lg border border-slate-700 overflow-hidden">
                    <button onClick={() => setDividirPor(Math.max(1, dividirPor - 1))} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5"><Minus className="w-3 h-3" /></button>
                    <span className="w-10 text-center text-sm font-bold text-white">{dividirPor}</span>
                    <button onClick={() => setDividirPor(dividirPor + 1)} className="w-8 h-8 flex items-center justify-center text-indigo-400 hover:text-white hover:bg-white/5"><Plus className="w-3 h-3" /></button>
                  </div>
                </div>
                {dividirPor > 1 && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-400">Total por pessoa:</span>
                    <span className="text-indigo-400 font-bold">R$ {valorPorPessoa.toFixed(2)}</span>
                  </div>
                )}
              </div>

              {/* Seleção de Forma de Pagamento */}
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Forma de Pagamento</label>
              <div className="grid grid-cols-2 gap-3 mb-6">
                {[
                  { id: 'PIX', label: 'PIX', icon: QrCode },
                  { id: 'CREDITO_TEF', label: 'CREDITO TEF', icon: CreditCard },
                  { id: 'DEBITO_TEF', label: 'DEBITO TEF', icon: CreditCard },
                  { id: 'CARTAO_CREDITO', label: 'Crédito (POS)', icon: CreditCard },
                  { id: 'CARTAO_DEBITO', label: 'Débito (POS)', icon: CreditCard },
                  { id: 'DINHEIRO', label: 'Dinheiro', icon: Banknote },
                ].map(forma => {
                  const Icon = forma.icon;
                  return (
                    <button
                      key={forma.id}
                      onClick={() => {
                        setFormaPagamentoAtual(forma.id);
                        setValorDigitado(saldoDevedor.toFixed(2));
                      }}
                      className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                        formaPagamentoAtual === forma.id 
                          ? 'bg-violet-500/15 border-violet-500/30 text-violet-300 shadow-[0_0_15px_rgba(139,92,246,0.20)]' 
                          : 'bg-[#0b1324]/70 border-white/10 text-slate-400 hover:border-white/20'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-[10px] font-bold uppercase">{forma.label}</span>
                    </button>
                  )
                })}
              </div>

              {/* Input de Valor para Adicionar */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">R$</span>
                  <input 
                    type="number" 
                    value={valorDigitado}
                    onChange={e => setValorDigitado(e.target.value)}
                    className="w-full bg-[#0b1324] border border-white/10 rounded-xl p-4 pl-12 text-white font-bold text-lg focus:border-violet-500/40 focus:ring-2 focus:ring-violet-500/20 outline-none"
                  />
                </div>
                <button 
                  onClick={() => void adicionarPagamentoParcial()}
                  disabled={tefFoodBusy || Number(valorDigitado) <= 0 || saldoDevedor <= 0}
                  className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white rounded-xl px-6 font-bold disabled:opacity-50 transition-colors"
                >
                  {tefFoodBusy ? 'PinPad…' : 'Adicionar'}
                </button>
              </div>
            </div>

            {/* Lado Direito do Modal: Resumo Financeiro */}
            <div className="flex-1 bg-[#0b1324]/80 p-6 flex flex-col">
              <div className="flex justify-between items-end mb-6 pb-4 border-b border-white/10">
                <span className="text-slate-400 text-sm font-bold uppercase tracking-widest">Total do Pedido</span>
                <span className="text-2xl font-black text-white">R$ {totalCarrinho.toFixed(2)}</span>
              </div>

              {/* Lista de Pagamentos Adicionados */}
              <div className="flex-1 overflow-y-auto mb-6 pr-2 custom-scrollbar">
                {pagamentosAdicionados.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-slate-600 text-sm">
                    Nenhum pagamento lançado.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {pagamentosAdicionados.map(pag => (
                      <div key={pag.id} className="flex justify-between items-center bg-[#08101f] border border-white/10 rounded-lg p-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-300 uppercase bg-white/5 border border-white/10 px-2 py-1 rounded">
                            {rotuloPagamento(pag)}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-emerald-300 font-bold text-sm">R$ {pag.valor.toFixed(2)}</span>
                          <button onClick={() => removerPagamentoParcial(pag.id)} className="text-slate-500 hover:text-red-400">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Status Final: Saldo ou Troco */}
              <div className={`p-4 rounded-xl border mb-6 ${saldoDevedor > 0 ? 'bg-amber-500/10 border-amber-500/20' : 'bg-emerald-500/10 border-emerald-500/20'}`}>
                <div className="flex justify-between items-center">
                  <span className={`text-sm font-bold uppercase tracking-widest ${saldoDevedor > 0 ? 'text-amber-300' : 'text-emerald-300'}`}>
                    {saldoDevedor > 0 ? 'Falta Pagar' : (troco > 0 ? 'Troco a Devolver' : 'Conta Paga')}
                  </span>
                  <span className={`text-2xl font-black ${saldoDevedor > 0 ? 'text-amber-300' : 'text-emerald-300'}`}>
                    R$ {(saldoDevedor > 0 ? saldoDevedor : troco).toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="flex gap-3 mt-auto">
                <button 
                  onClick={() => setModalPagamento(false)}
                  className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold border border-white/10 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={finalizarVenda}
                  disabled={finalizando || saldoDevedor > 0.01}
                  className="flex-[2] py-4 bg-gradient-to-r from-emerald-600 to-teal-500 text-white rounded-xl font-black shadow-[0_0_20px_rgba(16,185,129,0.30)] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {finalizando ? <span className="animate-spin border-2 border-white border-t-transparent rounded-full w-5 h-5"></span> : <Check className="w-5 h-5" />}
                  {finalizando ? 'Processando...' : 'FINALIZAR'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🚀 MODAL DO ESCUDO FISCAL DA AURYA */}
      {alertaAurya && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-[#020617]/90 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#08101f] border border-violet-500/30 rounded-[30px] w-full max-w-lg overflow-hidden shadow-[0_25px_80px_rgba(0,0,0,0.60)] animate-in zoom-in-95">
            
            {/* Header Aurya */}
            <div className="bg-gradient-to-r from-violet-900/30 to-[#0b1324] p-5 border-b border-violet-500/20 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-violet-500/15 border border-violet-500/30 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(139,92,246,0.25)]">
                <Bot className="w-6 h-6 text-violet-300" />
              </div>
              <div>
                <h2 className="text-xl font-black text-white flex items-center gap-2">
                  Aurya <span className="bg-violet-500 text-white text-[10px] px-2 py-0.5 rounded-full uppercase tracking-[0.18em]">Escudo Fiscal</span>
                </h2>
                <p className="text-violet-300 text-xs">Ação bloqueada para evitar multas.</p>
              </div>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                <ShieldAlert className="w-6 h-6 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-red-400 font-bold text-sm uppercase tracking-widest mb-1">Risco Detectado</h3>
                  <p className="text-slate-300 text-sm leading-relaxed">
                    {alertaAurya.replace('Rejeição Sefaz Evitada: ', '')}
                  </p>
                </div>
              </div>

              <div className="bg-[#0b1324] rounded-xl p-4 border border-white/10">
                <h4 className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-2">Como resolver:</h4>
                <ul className="text-sm text-slate-300 space-y-2 list-disc list-inside pl-2">
                  <li>Se sua loja <strong>É</strong> do Simples Nacional: Vá nas configurações da loja e ajuste o Regime Tributário.</li>
                  <li>Se sua loja <strong>NÃO É</strong> do Simples Nacional: Clique em "Editar Produto" abaixo e altere o CSOSN para o CST correto (ex: 00, 40).</li>
                </ul>
              </div>
            </div>

            {/* Footer com Ações Diretas */}
            <div className="p-5 border-t border-slate-800 bg-slate-950 flex flex-col sm:flex-row gap-3 justify-end">
              
              {/* Botão Dinâmico: Edita exatamente o produto que deu erro */}
              <button 
                onClick={abrirEdicaoProduto}
                className="px-4 py-2.5 bg-violet-500/10 hover:bg-violet-500/20 text-violet-300 border border-violet-500/30 rounded-xl font-bold transition-colors flex items-center gap-2"
              >
                <Tag className="w-4 h-4" /> Editar {nomeProdutoErro ? `"${nomeProdutoErro}"` : 'Produtos'}
              </button>

              <button 
                onClick={abrirEdicaoLoja}
                className="px-4 py-2.5 bg-violet-500/10 hover:bg-violet-500/20 text-violet-300 border border-violet-500/30 rounded-xl font-bold transition-colors flex items-center gap-2"
              >
                <Monitor className="w-4 h-4" /> Configuração da Loja
              </button>

              <button 
                onClick={() => { setAlertaAurya(null); setAguardandoFoco(false); }}
                className="px-6 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl font-bold transition-colors flex items-center gap-2 sm:ml-4"
              >
                <XCircle className="w-5 h-5" /> Fechar Aviso
              </button>
            </div>

          </div>
        </div>
      )}

    </Layout>
  );
}