import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingBag,
  ScanLine,
  CreditCard,
  Smartphone,
  CheckCircle2,
  Search,
  X,
  Package,
  Sparkles,
  LogOut,
  Volume2,
  VolumeX,
  Loader2,
  ShieldAlert,
  Trash2,
} from 'lucide-react';
import { api } from '../../services/api';
import { AxiosError } from 'axios';
import { parseBarcode } from '../../utils/barcodeParser';
import { useVoiceGuidance } from '../../hooks/useVoiceGuidance';
import { useSelfCheckoutTotemUi } from './SelfCheckoutLayout';
import {
  descobrirEstacaoPorIp,
  getEstacaoTrabalhoIdPdv,
  montarUrlVerificarCaixa,
} from '../../utils/estacaoWorkstationStorage';
import {
  aguardarAutorizacaoTefHardware,
  tefFalhaSalvarVendaCnc,
  tefPosVendaSucessoCnc,
} from '../../services/tefCncFlow';
import { PagamentoValorParcialModal } from '../operacoes/PagamentoValorParcialModal';
import {
  parseValorMonetarioPdv,
  validarValorParcialPdv,
} from '../operacoes/pdvPagamentoParcialUtils';

type Step = 'welcome' | 'cpf' | 'scan' | 'payment' | 'done';

interface ProdutoApi {
  id: string;
  nome: string;
  codigo?: string;
  codigoBarras?: string;
  ean?: string | null;
  precoVenda: number | string;
  pesoConferencia?: string | number | null;
}

interface ItemCarrinho extends ProdutoApi {
  quantidade: number;
  precoUnitarioBase: number;
  precoVenda: number;
  subtotal: number;
  promocaoAplicada?: boolean;
  promocaoResumo?: string;
}

interface ISessaoCaixa {
  id: string;
  status: string;
  terminal?: string | null;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function montarQueryProdutos(busca?: string, codigoBalanca?: number): string {
  const q = new URLSearchParams();
  q.set('origem', 'PDV');
  if (codigoBalanca !== undefined && Number.isFinite(codigoBalanca)) {
    q.set('codigoBalanca', String(Math.trunc(codigoBalanca)));
  }
  if (busca !== undefined && busca.trim() !== '') q.set('busca', busca.trim());
  const est = getEstacaoTrabalhoIdPdv();
  if (est) q.set('estacaoTrabalhoId', est);
  return `?${q.toString()}`;
}

type TotemEstacaoDiscovery = 'ready' | 'loading' | 'unknown_ip' | 'erro_rede';

type FormaPagamentoSelf = 'PIX' | 'CARTAO_CREDITO' | 'CARTAO_DEBITO';

interface LinhaPagamentoSelfCheckout {
  id: string;
  tipoPagamento: FormaPagamentoSelf;
  valor: number;
  transacaoTefId?: string;
  canalAdquirente?: 'POS' | 'TEF';
}

function novoIdSelfCheckout(): string {
  if (
    typeof globalThis.crypto !== 'undefined' &&
    typeof globalThis.crypto.randomUUID === 'function'
  ) {
    return globalThis.crypto.randomUUID();
  }
  return `self-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function numPreco(v: number | string | undefined): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function formatCpfDigitos(d: string): string {
  const x = d.replace(/\D/g, '').slice(0, 11);
  if (x.length <= 3) return x;
  if (x.length <= 6) return `${x.slice(0, 3)}.${x.slice(3)}`;
  if (x.length <= 9) return `${x.slice(0, 3)}.${x.slice(3, 6)}.${x.slice(6)}`;
  return `${x.slice(0, 3)}.${x.slice(3, 6)}.${x.slice(6, 9)}-${x.slice(9)}`;
}

export function SelfCheckoutPage() {
  const navigate = useNavigate();
  const { welcomeActive, setWelcomeActive } = useSelfCheckoutTotemUi();
  const [step, setStep] = useState<Step>('welcome');
  const [cpfDigits, setCpfDigits] = useState('');
  const [sessaoCaixa, setSessaoCaixa] = useState<ISessaoCaixa | null>(null);
  const [caixaErro, setCaixaErro] = useState<string | null>(null);
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([]);
  const [busca, setBusca] = useState('');
  const [modalSacola, setModalSacola] = useState(false);
  const [modalBusca, setModalBusca] = useState(false);
  const [termoBusca, setTermoBusca] = useState('');
  const [listaBusca, setListaBusca] = useState<ProdutoApi[]>([]);
  const [carregandoBusca, setCarregandoBusca] = useState(false);
  const [finalizando, setFinalizando] = useState(false);
  const [overlayTefSimulado, setOverlayTefSimulado] = useState(false);
  const [modalBloqueioCaixa, setModalBloqueioCaixa] = useState(false);
  const [estacaoDiscovery, setEstacaoDiscovery] = useState<TotemEstacaoDiscovery>(() =>
    getEstacaoTrabalhoIdPdv() ? 'ready' : 'loading'
  );
  const [linhasPagamento, setLinhasPagamento] = useState<LinhaPagamentoSelfCheckout[]>([]);
  const [modalValorAberto, setModalValorAberto] = useState(false);
  const [formaModal, setFormaModal] = useState<FormaPagamentoSelf | null>(null);
  const [campoValorModal, setCampoValorModal] = useState('');
  const [erroModalValor, setErroModalValor] = useState<string | null>(null);
  const [resumoPromo, setResumoPromo] = useState<{
    totalBruto: number;
    totalDescontoPromocoes: number;
    totalLiquido: number;
  } | null>(null);
  const [recalculandoPromo, setRecalculandoPromo] = useState(false);

  const { falar, muted, toggleMute } = useVoiceGuidance();
  const speechGenRef = useRef(0);

  const inputBipRef = useRef<HTMLInputElement>(null);
  const carrinhoRef = useRef<ItemCarrinho[]>([]);
  const timerPromoRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  carrinhoRef.current = carrinho;

  useEffect(() => {
    setWelcomeActive(step === 'welcome');
  }, [step, setWelcomeActive]);

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

  const totemEstacaoPronta = estacaoDiscovery === 'ready';

  const assinaturaCarrinho = useMemo(
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

  const totalVenda = useMemo(() => {
    if (resumoPromo) return round2(resumoPromo.totalLiquido);
    return round2(carrinho.reduce((s, i) => s + Number(i.subtotal), 0));
  }, [carrinho, resumoPromo]);

  const totalPagoLinhas = useMemo(
    () => round2(linhasPagamento.reduce((s, l) => s + l.valor, 0)),
    [linhasPagamento]
  );
  const valorRestante = useMemo(
    () => round2(Math.max(0, totalVenda - totalPagoLinhas)),
    [totalVenda, totalPagoLinhas]
  );

  useEffect(() => {
    setLinhasPagamento([]);
  }, [assinaturaCarrinho]);

  const verificarCaixa = useCallback(async () => {
    const url = montarUrlVerificarCaixa();
    if (!url) {
      if (!totemEstacaoPronta) {
        return;
      }
      setSessaoCaixa(null);
      setCaixaErro(
        'Totem sem estação identificada. Verifique o cadastro do IP deste terminal em Estações de Trabalho.'
      );
      return;
    }

    setCaixaErro(null);
    try {
      const { data } = await api.get<ISessaoCaixa | null>(url);
      if (data?.id && String(data.status).toUpperCase() === 'ABERTA') {
        setSessaoCaixa(data);
        setCaixaErro(null);
      } else {
        setSessaoCaixa(null);
        setCaixaErro(
          'Não há caixa aberto para esta estação. Peça ao fiscal para abrir o turno de caixa neste terminal.'
        );
      }
    } catch {
      setSessaoCaixa(null);
      setCaixaErro('Não foi possível verificar o caixa.');
    }
  }, [totemEstacaoPronta]);

  useEffect(() => {
    if (step !== 'scan' || !totemEstacaoPronta) return;
    void verificarCaixa();
  }, [step, totemEstacaoPronta, verificarCaixa]);

  useEffect(() => {
    if (step !== 'scan' || carrinho.length === 0) {
      setResumoPromo(null);
      return;
    }
    if (timerPromoRef.current) clearTimeout(timerPromoRef.current);
    timerPromoRef.current = setTimeout(async () => {
      timerPromoRef.current = null;
      setRecalculandoPromo(true);
      try {
        const atual = carrinhoRef.current;
        const payload = {
          clienteId: undefined,
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

        if (!data.sucesso || !data.dados) throw new Error(data.erro || 'Promoções indisponíveis.');
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
      } catch {
        setResumoPromo(null);
      } finally {
        setRecalculandoPromo(false);
      }
    }, 320);
    return () => {
      if (timerPromoRef.current) clearTimeout(timerPromoRef.current);
    };
  }, [assinaturaCarrinho, step]);

  useEffect(() => {
    if (step === 'scan') {
      const t = window.setTimeout(() => inputBipRef.current?.focus(), 200);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [step, carrinho.length, modalSacola, modalBusca]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && (e.key === 'X' || e.key === 'x')) {
        e.preventDefault();
        if (window.confirm('Área do fiscal: encerrar o autoatendimento e voltar ao painel?')) {
          navigate('/dashboard');
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navigate]);

  useEffect(() => {
    if (muted) return;
    const id = ++speechGenRef.current;
    const t = window.setTimeout(() => {
      if (id !== speechGenRef.current) return;
      if (step === 'welcome') {
        falar('Bem-vindo! Toque na tela para iniciar suas compras.');
      } else if (step === 'scan') {
        falar('Passe o código de barras no leitor ou pesquise o produto na tela.');
      } else if (step === 'payment') {
        falar('Selecione a forma de pagamento.');
      } else if (step === 'done') {
        falar('Pagamento aprovado! Retire seu cupom. Obrigado pela preferência!');
      }
    }, 120);
    return () => {
      window.clearTimeout(t);
      speechGenRef.current += 1;
    };
  }, [step, muted, falar]);

  useEffect(() => {
    if (!modalSacola || muted) return;
    const id = ++speechGenRef.current;
    const t = window.setTimeout(() => {
      if (id !== speechGenRef.current) return;
      falar('Coloque o item na sacola.');
    }, 80);
    return () => {
      window.clearTimeout(t);
      speechGenRef.current += 1;
    };
  }, [modalSacola, muted, falar]);

  useEffect(() => {
    if (!modalBusca || termoBusca.trim().length < 2) {
      setListaBusca([]);
      return;
    }
    const t = window.setTimeout(() => {
      void (async () => {
        setCarregandoBusca(true);
        try {
          const { data } = await api.get<ProdutoApi[]>(`/api/cadastros/produtos${montarQueryProdutos(termoBusca)}`);
          setListaBusca(Array.isArray(data) ? data : []);
        } catch {
          setListaBusca([]);
        } finally {
          setCarregandoBusca(false);
        }
      })();
    }, 350);
    return () => clearTimeout(t);
  }, [termoBusca, modalBusca]);

  const adicionarProduto = async (
    produto: ProdutoApi,
    opts?: { balcao?: { kg: number; valorTotalReais: number } }
  ) => {
    const preco = numPreco(produto.precoVenda);
    if (preco <= 0) {
      alert('Produto sem preço na tabela vigente. Procure um atendente.');
      return;
    }

    const balcao = opts?.balcao;
    const deltaKg = balcao ? round3(balcao.kg) : 1;
    const deltaSub = balcao ? round2(balcao.valorTotalReais) : null;

    if (balcao && (deltaKg <= 0 || !deltaSub || deltaSub <= 0)) {
      alert('Etiqueta de balança inválida (peso/valor).');
      return;
    }

    const prev = carrinhoRef.current;
    let linhaAtualizada: ItemCarrinho;
    const existe = prev.find((x) => x.id === produto.id);
    if (balcao && deltaSub !== null) {
      if (existe) {
        const base = round2(Number(existe.precoUnitarioBase ?? preco));
        const q = round3(existe.quantidade + deltaKg);
        linhaAtualizada = {
          ...existe,
          quantidade: q,
          precoUnitarioBase: base,
          precoVenda: base,
          subtotal: round2(existe.subtotal + deltaSub),
        };
        setCarrinho((p) => p.map((x) => (x.id === produto.id ? linhaAtualizada : x)));
      } else {
        linhaAtualizada = {
          ...produto,
          precoVenda: preco,
          precoUnitarioBase: preco,
          quantidade: deltaKg,
          subtotal: deltaSub,
        };
        setCarrinho((p) => [...p, linhaAtualizada]);
      }
    } else if (existe) {
      const base = round2(Number(existe.precoUnitarioBase ?? preco));
      const q = existe.quantidade + 1;
      linhaAtualizada = {
        ...existe,
        quantidade: q,
        precoUnitarioBase: base,
        precoVenda: base,
        subtotal: round2(q * base),
      };
      setCarrinho((p) => p.map((x) => (x.id === produto.id ? linhaAtualizada : x)));
    } else {
      linhaAtualizada = {
        ...produto,
        precoVenda: preco,
        precoUnitarioBase: preco,
        quantidade: 1,
        subtotal: preco,
      };
      setCarrinho((p) => [...p, linhaAtualizada]);
    }

    setModalSacola(true);
    await new Promise((r) => window.setTimeout(r, 1000));
    setModalSacola(false);

    const reverterBalcao = () => {
      if (!balcao || deltaSub === null) return;
      setCarrinho((prev) => {
        const cur = prev.find((x) => x.id === produto.id);
        if (!cur) return prev;
        const nextQty = round3(cur.quantidade - deltaKg);
        const nextSub = round2(cur.subtotal - deltaSub);
        const base = round2(Number(cur.precoUnitarioBase ?? cur.precoVenda));
        if (nextQty <= 0.0005) return prev.filter((x) => x.id !== produto.id);
        return prev.map((x) =>
          x.id === produto.id
            ? { ...x, quantidade: nextQty, precoVenda: base, subtotal: nextSub }
            : x
        );
      });
    };

    const reverterUnidade = () => {
      setCarrinho((prev) => {
        const cur = prev.find((x) => x.id === produto.id);
        if (!cur) return prev;
        if (cur.quantidade <= 1) return prev.filter((x) => x.id !== produto.id);
        const q = cur.quantidade - 1;
        const base = round2(Number(cur.precoUnitarioBase ?? cur.precoVenda));
        return prev.map((x) =>
          x.id === produto.id
            ? { ...x, quantidade: q, precoVenda: base, subtotal: round2(q * base) }
            : x
        );
      });
    };

    try {
      const estacaoPeso = getEstacaoTrabalhoIdPdv();
      if (balcao) {
        const pesoSimulado = deltaKg;
        const { data } = await api.post<{
          sucesso: boolean;
          dados?: {
            sucesso: boolean;
            ignorado: boolean;
            esperadoKg: number;
            pesoLidoKg: number;
            mensagem?: string;
          };
        }>('/api/self-checkout/validar-peso-conferencia', {
          produtoId: produto.id,
          quantidade: deltaKg,
          pesoLidoKg: pesoSimulado,
          pesoDinamicoEsperadoKg: deltaKg,
          ...(estacaoPeso
            ? { estacaoTrabalhoId: estacaoPeso }
            : { toleranciaAbsolutaKg: 0.015 }),
        });
        const d = data.dados;
        if (data.sucesso && d && !d.ignorado && !d.sucesso) {
          alert(d.mensagem || 'Conferência de peso não aprovada. Item removido.');
          reverterBalcao();
        }
      } else {
        const pesoUnit = numPreco(produto.pesoConferencia ?? 0);
        if (pesoUnit > 0) {
          const pesoSimulado = round3(pesoUnit * linhaAtualizada.quantidade);
          const { data } = await api.post<{
            sucesso: boolean;
            dados?: {
              sucesso: boolean;
              ignorado: boolean;
              esperadoKg: number;
              pesoLidoKg: number;
              mensagem?: string;
            };
          }>('/api/self-checkout/validar-peso-conferencia', {
            produtoId: produto.id,
            quantidade: linhaAtualizada.quantidade,
            pesoLidoKg: pesoSimulado,
            ...(estacaoPeso ? { estacaoTrabalhoId: estacaoPeso } : {}),
          });
          const d = data.dados;
          if (data.sucesso && d && !d.ignorado && !d.sucesso) {
            alert(d.mensagem || 'Conferência de peso não aprovada. Item removido.');
            reverterUnidade();
          }
        }
      }
    } catch {
      /* falha de rede: não bloqueia venda em modo degradado */
    }

    setBusca('');
    inputBipRef.current?.focus();
  };

  const processarBip = async () => {
    const t = busca.trim();
    if (!t) return;
    try {
      const parsed = parseBarcode(t);
      if (parsed.isBalanca) {
        const { data } = await api.get<ProdutoApi[]>(
          `/api/cadastros/produtos${montarQueryProdutos(undefined, parsed.codigoBalanca)}`
        );
        const list = Array.isArray(data) ? data : [];
        if (list.length !== 1) {
          falar('Produto não encontrado.');
          alert(
            list.length === 0
              ? `Nenhum produto com código na balança ${parsed.codigoBalanca}.`
              : `Vários produtos para código na balança ${parsed.codigoBalanca} — cadastro duplicado.`
          );
          setBusca('');
          return;
        }
        const p = list[0];
        const precoKg = numPreco(p.precoVenda);
        if (precoKg <= 0) {
          setTermoBusca(t);
          setListaBusca([p]);
          setModalBusca(true);
          setBusca('');
          return;
        }
        const kg = round3(parsed.valorTotal / precoKg);
        await adicionarProduto(p, {
          balcao: { kg, valorTotalReais: parsed.valorTotal },
        });
        return;
      }

      const { data } = await api.get<ProdutoApi[]>(`/api/cadastros/produtos${montarQueryProdutos(t)}`);
      const list = Array.isArray(data) ? data : [];
      const exato =
        list.find(
          (p) =>
            p.codigoBarras === t ||
            p.ean === t ||
            p.codigo === t ||
            String(p.id) === t
        ) || (list.length === 1 ? list[0] : undefined);
      if (exato) {
        if (numPreco(exato.precoVenda) <= 0) {
          setTermoBusca(t);
          setListaBusca([exato]);
          setModalBusca(true);
          return;
        }
        await adicionarProduto(exato);
      } else if (list.length > 0) {
        setTermoBusca(t);
        setModalBusca(true);
        setListaBusca(list);
      } else {
        falar('Produto não encontrado.');
        alert('Produto não encontrado.');
      }
    } catch {
      alert('Erro ao buscar produto.');
    }
  };

  const iniciarPagamento = () => {
    if (carrinho.length === 0) return;
    if (!sessaoCaixa?.id) {
      setModalBloqueioCaixa(true);
      return;
    }
    setLinhasPagamento([]);
    setStep('payment');
  };

  const rotuloFormaSelf = (f: FormaPagamentoSelf): string => {
    if (f === 'PIX') return 'PIX';
    if (f === 'CARTAO_CREDITO') return 'Crédito TEF';
    return 'Débito TEF';
  };

  const abrirModalPagamentoSelf = (f: FormaPagamentoSelf) => {
    if (valorRestante <= 0) {
      alert('Total já coberto. Confirme o pagamento ou remova uma linha.');
      return;
    }
    setFormaModal(f);
    setCampoValorModal(valorRestante.toFixed(2));
    setErroModalValor(null);
    setModalValorAberto(true);
  };

  const fecharModalPagamentoSelf = () => {
    setModalValorAberto(false);
    setFormaModal(null);
    setCampoValorModal('');
    setErroModalValor(null);
  };

  const confirmarModalPagamentoSelf = async () => {
    if (!formaModal) return;
    const terminalNome =
      sessaoCaixa?.terminal?.trim() ||
      localStorage.getItem('@PDV_Terminal_Name')?.trim() ||
      'SELF-CHECKOUT';

    const parsed = parseValorMonetarioPdv(campoValorModal);
    if (parsed === null) {
      setErroModalValor('Valor inválido.');
      return;
    }
    const vMsg = validarValorParcialPdv(parsed, valorRestante);
    if (vMsg) {
      setErroModalValor(vMsg);
      return;
    }
    const valor = round2(parsed);

    if (formaModal === 'PIX') {
      setLinhasPagamento((prev) => [
        ...prev,
        {
          id: novoIdSelfCheckout(),
          tipoPagamento: 'PIX',
          valor,
          canalAdquirente: 'POS',
        },
      ]);
      fecharModalPagamentoSelf();
      return;
    }

    fecharModalPagamentoSelf();
    setOverlayTefSimulado(true);
    try {
      const { transacaoTefId: tid } = await aguardarAutorizacaoTefHardware({
        valor,
        tipoCartao: formaModal === 'CARTAO_CREDITO' ? 'CREDITO' : 'DEBITO',
        terminal: terminalNome,
        onStatus: () => undefined,
      });
      setLinhasPagamento((prev) => [
        ...prev,
        {
          id: novoIdSelfCheckout(),
          tipoPagamento: formaModal,
          valor,
          canalAdquirente: 'TEF',
          transacaoTefId: tid,
        },
      ]);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Falha na autorização TEF.');
    } finally {
      setOverlayTefSimulado(false);
    }
  };

  const removerLinhaPagamentoSelf = (id: string) => {
    setLinhasPagamento((prev) => prev.filter((l) => l.id !== id));
  };

  const executarVenda = async () => {
    if (carrinho.length === 0) return;
    if (!sessaoCaixa?.id) {
      setModalBloqueioCaixa(true);
      return;
    }
    if (linhasPagamento.length === 0) {
      alert('Inclua ao menos uma forma de pagamento.');
      return;
    }
    if (valorRestante > 0.009) {
      alert(`Falta cobrir R$ ${valorRestante.toFixed(2)}.`);
      return;
    }

    const terminalNome =
      sessaoCaixa.terminal?.trim() ||
      localStorage.getItem('@PDV_Terminal_Name')?.trim() ||
      'SELF-CHECKOUT';

    const tefIds = linhasPagamento
      .map((l) => l.transacaoTefId)
      .filter((id): id is string => typeof id === 'string' && id.trim().length > 0);

    const tipoPrincipal = linhasPagamento[0]?.tipoPagamento ?? 'PIX';

    setFinalizando(true);
    try {
      const docDigits = cpfDigits.replace(/\D/g, '');
      const estacaoId = getEstacaoTrabalhoIdPdv();
      const pagamentosPayload = linhasPagamento.map((l) => {
        if (l.transacaoTefId) {
          return {
            tipoPagamento: l.tipoPagamento,
            valor: l.valor,
            canalAdquirente: 'TEF' as const,
            transacaoTefId: l.transacaoTefId,
          };
        }
        return {
          tipoPagamento: l.tipoPagamento,
          valor: l.valor,
          canalAdquirente: 'POS' as const,
        };
      });

      const payload = {
        sessaoCaixaId: sessaoCaixa.id,
        ...(estacaoId ? { estacaoTrabalhoId: estacaoId } : {}),
        terminal: terminalNome,
        origem: 'SELF_CHECKOUT',
        modeloNota: '65',
        valorTotal: totalVenda,
        valorDesconto: 0,
        tipoPagamento: tipoPrincipal,
        formaPagamento: tipoPrincipal,
        cpfCnpjCliente: docDigits.length === 11 || docDigits.length === 14 ? docDigits : undefined,
        nomeCliente: docDigits.length >= 11 ? 'Consumidor' : undefined,
        itens: carrinho.map((item) => ({
          produtoId: item.id,
          quantidade: item.quantidade,
          valorUnitario: Number(item.precoVenda),
        })),
        pagamentos: pagamentosPayload,
      };

      const resVendaSelf = await api.post<{ venda?: { id: string } }>('/api/vendas', payload);

      if (tefIds.length > 0) {
        try {
          await tefPosVendaSucessoCnc(tefIds, {
            vendaId: resVendaSelf.data.venda?.id ?? '',
          });
        } catch (tefErr) {
          console.error(tefErr);
          alert(
            'Pagamento registrado, mas a confirmação TEF falhou. Verifique a maquininha e o ERP.'
          );
        }
      }

      setStep('done');
      window.setTimeout(() => {
        setCarrinho([]);
        setCpfDigits('');
        setResumoPromo(null);
        setLinhasPagamento([]);
        setStep('welcome');
      }, 5000);
    } catch (err) {
      if (tefIds.length > 0) {
        await tefFalhaSalvarVendaCnc(tefIds).catch(() => undefined);
      }
      const ax = err as AxiosError<{ error?: string }>;
      alert(ax.response?.data?.error || 'Não foi possível concluir o pagamento.');
      setStep('payment');
    } finally {
      setFinalizando(false);
    }
  };

  const abrirAreaFiscal = () => {
    if (window.confirm('Encerrar autoatendimento e ir ao painel?')) navigate('/dashboard');
  };

  return (
    <>
      <PagamentoValorParcialModal
        aberto={modalValorAberto}
        titulo={
          formaModal != null ? `Valor — ${rotuloFormaSelf(formaModal)}` : 'Valor do pagamento'
        }
        subtitulo={
          formaModal === 'PIX'
            ? 'Confirme o valor em PIX.'
            : 'Depois de confirmar, use o PinPad no valor informado.'
        }
        valorRestante={valorRestante}
        valorCampo={campoValorModal}
        onValorCampoChange={setCampoValorModal}
        erroTexto={erroModalValor}
        onConfirmar={() => {
          void confirmarModalPagamentoSelf();
        }}
        onFechar={fecharModalPagamentoSelf}
        ocupado={false}
      />

      {!totemEstacaoPronta && estacaoDiscovery === 'loading' && (
        <div
          className="fixed inset-0 z-[210] flex flex-col items-center justify-center gap-4 bg-[#060816]/95 backdrop-blur-md px-6"
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <Loader2 className="h-12 w-12 text-violet-400 animate-spin" aria-hidden />
          <p className="text-slate-300 font-medium text-center">Identificando terminal…</p>
        </div>
      )}

      {!totemEstacaoPronta && estacaoDiscovery === 'unknown_ip' && (
        <div
          className="fixed inset-0 z-[210] flex items-center justify-center bg-[#060816]/95 backdrop-blur-md px-6"
          role="alertdialog"
          aria-modal="true"
        >
          <div className="max-w-lg w-full rounded-[30px] border border-amber-500/35 bg-[#08101f]/95 backdrop-blur-xl p-8 text-center shadow-[0_25px_60px_rgba(0,0,0,0.45)]">
            <p className="text-xl font-black text-white leading-relaxed">
              Computador não reconhecido. Cadastre o IP deste terminal na tela de Estações de Trabalho na
              retaguarda.
            </p>
          </div>
        </div>
      )}

      {!totemEstacaoPronta && estacaoDiscovery === 'erro_rede' && (
        <div
          className="fixed inset-0 z-[210] flex items-center justify-center bg-[#060816]/95 backdrop-blur-md px-6"
          role="alertdialog"
          aria-modal="true"
        >
          <div className="max-w-lg w-full rounded-[30px] border border-red-500/35 bg-[#08101f]/95 backdrop-blur-xl p-8 text-center shadow-[0_25px_60px_rgba(0,0,0,0.45)]">
            <ShieldAlert className="h-14 w-14 text-red-400 mx-auto mb-4" aria-hidden />
            <p className="text-lg font-bold text-white leading-relaxed mb-6">
              Não foi possível identificar o terminal. Verifique a conexão com o servidor e tente novamente.
            </p>
            <button
              type="button"
              onClick={tentarDescobrirEstacaoNovamente}
              className="w-full py-4 rounded-xl font-black text-white bg-gradient-to-r from-violet-600 to-fuchsia-600 shadow-[0_0_15px_rgba(139,92,246,0.35)] hover:scale-[1.02] transition-all"
            >
              Tentar novamente
            </button>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={toggleMute}
        className={`fixed right-3 z-[200] flex items-center justify-center rounded-xl border border-white/10 bg-white/5 p-3 text-slate-300 shadow-[0_0_15px_rgba(0,0,0,0.35)] hover:bg-white/10 hover:text-white transition-all ${
          welcomeActive ? 'top-4 md:top-5' : 'top-[7.5rem] md:top-[9.5rem]'
        }`}
        title={muted ? 'Ativar orientação por voz' : 'Silenciar orientação por voz'}
        aria-pressed={muted}
        aria-label={muted ? 'Ativar som' : 'Mudo'}
      >
        {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
      </button>

      <button
        type="button"
        onClick={abrirAreaFiscal}
        className="fixed bottom-3 left-3 z-[200] flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:bg-white/10 hover:text-slate-200 transition-all"
        title="Área do fiscal (Ctrl+Shift+X)"
      >
        <LogOut className="h-3.5 w-3.5" />
        Fiscal
      </button>

      {modalSacola && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-sm px-6">
          <div className="max-w-lg rounded-[30px] border border-white/10 bg-[#08101f]/90 backdrop-blur-xl p-10 text-center shadow-[0_25px_60px_rgba(0,0,0,0.35)]">
            <Package className="mx-auto mb-4 h-16 w-16 text-violet-400" />
            <p className="text-2xl font-black text-white leading-tight">
              Coloque o item na sacola
            </p>
            <p className="mt-3 text-slate-400 text-sm">Conferência de peso em andamento…</p>
          </div>
        </div>
      )}

      {modalBloqueioCaixa && (
        <div className="fixed inset-0 z-[170] flex items-center justify-center bg-black/75 backdrop-blur-md px-6">
          <div className="w-full max-w-lg rounded-[30px] border border-red-500/35 bg-[#08101f]/95 backdrop-blur-xl p-8 text-center shadow-[0_25px_60px_rgba(0,0,0,0.45)]">
            <p className="text-2xl font-black text-white mb-3">Operação bloqueada</p>
            <p className="text-slate-300 text-lg leading-relaxed mb-8">
              Solicite ao fiscal a abertura do caixa neste terminal.
            </p>
            <button
              type="button"
              onClick={() => setModalBloqueioCaixa(false)}
              className="w-full py-4 rounded-xl font-black text-white bg-gradient-to-r from-violet-600 to-fuchsia-600 shadow-[0_0_15px_rgba(139,92,246,0.35)] hover:scale-[1.02] transition-all"
            >
              Entendi
            </button>
          </div>
        </div>
      )}

      {modalBusca && (
        <div className="fixed inset-0 z-[140] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-t-[30px] sm:rounded-[30px] border border-white/10 bg-[#08101f]/90 backdrop-blur-xl p-6 shadow-[0_25px_60px_rgba(0,0,0,0.35)] max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <Search className="w-5 h-5 text-fuchsia-400" />
                Pesquisar produto
              </h3>
              <button
                type="button"
                onClick={() => setModalBusca(false)}
                className="p-2 rounded-xl border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <input
              value={termoBusca}
              onChange={(e) => setTermoBusca(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-[#0b1324] px-4 py-4 text-lg font-bold text-white mb-3 placeholder:text-slate-500 focus:border-violet-500/40 focus:ring-2 focus:ring-violet-500/20 outline-none"
              placeholder="Nome ou código…"
              autoFocus
            />
            <div className="flex-1 overflow-y-auto space-y-2 min-h-[120px]">
              {carregandoBusca && <p className="text-slate-500 text-center py-8">Buscando…</p>}
              {!carregandoBusca &&
                listaBusca.map((p) => {
                  const semPreco = numPreco(p.precoVenda) <= 0;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      disabled={semPreco}
                      onClick={() => {
                        if (semPreco) return;
                        void adicionarProduto(p);
                        setModalBusca(false);
                      }}
                      className={`w-full flex flex-wrap items-center justify-between gap-2 rounded-2xl border p-4 text-left transition-all ${
                        semPreco
                          ? 'cursor-not-allowed border-white/5 bg-[#0b1324]/40 opacity-50'
                          : 'border-white/10 bg-[#0b1324]/70 hover:bg-white/5'
                      }`}
                    >
                      <span className="font-bold text-white pr-2 text-left min-w-0 flex-1">{p.nome}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        {semPreco && (
                          <span className="rounded-lg bg-amber-500/20 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-amber-400 border border-amber-500/30">
                            Sem Preço
                          </span>
                        )}
                        <span
                          className={`font-mono ${semPreco ? 'text-slate-500 line-through' : 'text-emerald-400 font-bold'}`}
                        >
                          R$ {numPreco(p.precoVenda).toFixed(2)}
                        </span>
                      </div>
                    </button>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {step === 'welcome' && (
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
          <img
            src="/logoAurya.png"
            alt="Aurya ERP"
            className="h-32 md:h-48 lg:h-56 w-auto max-w-[min(100%,28rem)] object-contain mx-auto mb-12 drop-shadow-[0_0_35px_rgba(139,92,246,0.6)]"
          />
          <button
            type="button"
            onClick={() => setStep('cpf')}
            className="w-full max-w-xl rounded-xl py-10 px-8 text-2xl sm:text-3xl font-black uppercase tracking-wide text-white bg-gradient-to-r from-violet-600 to-fuchsia-600 shadow-[0_0_15px_rgba(139,92,246,0.30)] hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <span className="flex items-center justify-center gap-4">
              <ShoppingBag className="w-10 h-10 sm:w-12 sm:h-12" />
              Toque para iniciar
            </span>
          </button>
          <div className="mt-8 text-center max-w-lg">
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
              Bem-vindo
            </h1>
            <p className="mt-3 text-base sm:text-lg text-slate-400 max-w-md mx-auto">
              Toque para iniciar suas compras com rapidez e segurança.
            </p>
          </div>
        </div>
      )}

      {step === 'cpf' && (
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 max-w-lg mx-auto w-full">
          <h2 className="text-2xl font-black text-center mb-2 text-white">CPF na nota?</h2>
          <p className="text-slate-400 text-center mb-8 text-sm">
            Opcional — informe para constar no cupom fiscal.
          </p>
          <div className="w-full rounded-[30px] border border-white/10 bg-[#08101f]/90 backdrop-blur-xl shadow-[0_25px_60px_rgba(0,0,0,0.35)] p-6 mb-6">
            <p className="text-center text-3xl font-mono tracking-widest text-white min-h-[2.5rem]">
              {cpfDigits.length > 0 ? formatCpfDigitos(cpfDigits) : '—'}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 w-full max-w-sm mb-6">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'limpa', '0', 'back'].map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => {
                  if (k === 'limpa') setCpfDigits('');
                  else if (k === 'back') setCpfDigits((d) => d.replace(/\D/g, '').slice(0, -1));
                  else if (cpfDigits.replace(/\D/g, '').length < 11) {
                    setCpfDigits((d) => (d.replace(/\D/g, '') + k).slice(0, 11));
                  }
                }}
                className="h-16 rounded-xl text-xl font-black bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all"
              >
                {k === 'limpa' ? 'Limpar' : k === 'back' ? '⌫' : k}
              </button>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
            <button
              type="button"
              onClick={() => setStep('scan')}
              className="flex-1 py-5 rounded-xl font-black bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10"
            >
              Pular
            </button>
            <button
              type="button"
              onClick={() => setStep('scan')}
              className="flex-1 py-5 rounded-xl font-black bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-[0_0_15px_rgba(139,92,246,0.30)] hover:scale-[1.02] transition-all"
            >
              Continuar
            </button>
          </div>
        </div>
      )}

      {step === 'scan' && (
        <div className="flex-1 flex flex-col min-h-0 p-4 sm:p-6">
          {caixaErro && (
            <div className="mb-4 rounded-2xl border border-amber-500/30 bg-amber-500/20 px-4 py-3 text-amber-400 text-sm font-medium">
              {caixaErro}
              <button
                type="button"
                onClick={() => void verificarCaixa()}
                className="ml-3 underline font-bold text-amber-300"
              >
                Tentar novamente
              </button>
            </div>
          )}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-0">
            <div className="flex flex-col rounded-[30px] border border-white/10 bg-[#08101f]/90 backdrop-blur-xl shadow-[0_25px_60px_rgba(0,0,0,0.35)] p-4 min-h-[280px]">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-violet-400" />
                Seus itens
              </h3>
              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {carrinho.length === 0 && (
                  <p className="text-slate-500 text-center py-12">Passe os produtos no leitor.</p>
                )}
                {carrinho.map((item) => (
                  <div
                    key={item.id}
                    className="flex gap-4 rounded-2xl border border-white/10 bg-[#0b1324]/70 p-3 hover:bg-white/5 transition-all"
                  >
                    <div className="w-20 h-20 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
                      <Package className="w-10 h-10 text-violet-300" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-white truncate">{item.nome}</p>
                      <p className="text-sm text-slate-400">
                        {item.quantidade} × R$ {Number(item.precoVenda).toFixed(2)}
                      </p>
                      {item.promocaoAplicada && item.promocaoResumo && (
                        <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1 font-medium">
                          <Sparkles className="w-3 h-3" />
                          {item.promocaoResumo}
                        </p>
                      )}
                      <p className="text-lg font-black text-emerald-400 mt-1">
                        R$ {Number(item.subtotal).toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              {carrinho.length > 0 && (
                <div className="mt-3 pt-3 border-t border-white/10 text-sm space-y-1">
                  {recalculandoPromo ? (
                    <p className="text-slate-500">Calculando ofertas…</p>
                  ) : resumoPromo ? (
                    <>
                      <div className="flex justify-between text-slate-400">
                        <span>Subtotal</span>
                        <span>R$ {resumoPromo.totalBruto.toFixed(2)}</span>
                      </div>
                      {resumoPromo.totalDescontoPromocoes > 0 && (
                        <div className="flex justify-between text-emerald-400 font-bold">
                          <span>Promoções</span>
                          <span>− R$ {resumoPromo.totalDescontoPromocoes.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-xl font-black text-white pt-2">
                        <span>Total</span>
                        <span>R$ {totalVenda.toFixed(2)}</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between text-xl font-black text-white pt-1">
                      <span>Total</span>
                      <span>R$ {totalVenda.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-col rounded-[30px] border border-white/10 bg-[#08101f]/90 backdrop-blur-xl shadow-[0_25px_60px_rgba(0,0,0,0.35)] p-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
                <ScanLine className="w-4 h-4 text-fuchsia-400" />
                Leitor
              </h3>
              <input
                ref={inputBipRef}
                type="text"
                inputMode="none"
                autoComplete="off"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void processarBip();
                }}
                className="w-full rounded-xl border-2 border-dashed border-violet-500/40 bg-[#0b1324] px-4 py-6 text-xl font-mono text-center text-white mb-4 placeholder:text-slate-500 focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/20 outline-none"
                placeholder="Bipe o código de barras"
              />
              <button
                type="button"
                onClick={() => {
                  setTermoBusca('');
                  setListaBusca([]);
                  setModalBusca(true);
                }}
                className="w-full py-5 rounded-xl font-black bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-[0_0_15px_rgba(139,92,246,0.30)] hover:scale-[1.02] transition-all mb-4"
              >
                Pesquisar produto
              </button>
              <div className="flex-1 flex flex-col justify-end">
                <button
                  type="button"
                  disabled={carrinho.length === 0}
                  onClick={() => iniciarPagamento()}
                  className={`w-full py-6 rounded-2xl text-xl font-black uppercase tracking-wide text-white bg-gradient-to-r from-emerald-600 to-teal-500 shadow-[0_0_20px_rgba(16,185,129,0.4)] hover:scale-[1.02] transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 ${
                    carrinho.length > 0 && !sessaoCaixa ? 'opacity-55' : ''
                  }`}
                >
                  Finalizar e pagar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {step === 'payment' && (
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-10">
          <p className="text-slate-400 text-sm mb-2">Total a pagar</p>
          <p className="text-5xl font-black text-white mb-4">R$ {totalVenda.toFixed(2)}</p>
          <p className="text-sm font-semibold text-amber-300/90 mb-6 tabular-nums">
            Restante: R$ {valorRestante.toFixed(2)}
          </p>

          {linhasPagamento.length > 0 && (
            <ul className="w-full max-w-md mb-6 space-y-2 rounded-2xl border border-white/10 bg-[#08101f]/80 p-3">
              {linhasPagamento.map((l) => (
                <li
                  key={l.id}
                  className="flex items-center justify-between gap-2 text-sm text-white/90"
                >
                  <span>
                    {rotuloFormaSelf(l.tipoPagamento)}
                    {l.transacaoTefId ? ' · TEF' : ''}
                  </span>
                  <span className="flex items-center gap-2 font-mono text-emerald-300">
                    R$ {l.valor.toFixed(2)}
                    <button
                      type="button"
                      onClick={() => removerLinhaPagamentoSelf(l.id)}
                      className="rounded-lg border border-white/10 p-1 text-slate-400 hover:text-red-400"
                      aria-label="Remover"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}

          <p className="text-lg font-bold text-slate-300 mb-6 text-center max-w-md">
            Toque na forma de pagamento e informe o valor (pagamento misto).
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-3xl">
            <button
              type="button"
              onClick={() => abrirModalPagamentoSelf('PIX')}
              className="flex flex-col items-center gap-3 py-10 rounded-[30px] border border-white/10 bg-[#0b1324]/70 hover:bg-white/5 transition-all"
            >
              <Smartphone className="w-12 h-12 text-cyan-400" />
              <span className="text-xl font-black text-white">PIX</span>
            </button>
            <button
              type="button"
              onClick={() => abrirModalPagamentoSelf('CARTAO_DEBITO')}
              className="flex flex-col items-center gap-3 py-10 rounded-[30px] border border-white/10 bg-[#0b1324]/70 hover:bg-white/5 transition-all"
            >
              <CreditCard className="w-12 h-12 text-violet-400" />
              <span className="text-xl font-black text-center leading-tight text-white">DEBITO TEF</span>
            </button>
            <button
              type="button"
              onClick={() => abrirModalPagamentoSelf('CARTAO_CREDITO')}
              className="flex flex-col items-center gap-3 py-10 rounded-[30px] border border-white/10 bg-[#0b1324]/70 hover:bg-white/5 transition-all"
            >
              <CreditCard className="w-12 h-12 text-fuchsia-400" />
              <span className="text-xl font-black text-center leading-tight text-white">CREDITO TEF</span>
            </button>
          </div>
          <button
            type="button"
            disabled={
              finalizando || linhasPagamento.length === 0 || valorRestante > 0.009
            }
            onClick={() => void executarVenda()}
            className="mt-10 w-full max-w-md py-5 rounded-2xl font-black text-lg text-white bg-gradient-to-r from-emerald-600 to-teal-500 shadow-[0_0_20px_rgba(16,185,129,0.4)] hover:scale-[1.02] transition-all disabled:opacity-50 disabled:hover:scale-100"
          >
            {finalizando ? 'Processando…' : 'Confirmar pagamento'}
          </button>
          <button
            type="button"
            onClick={() => setStep('scan')}
            className="mt-4 text-slate-400 underline text-sm hover:text-white"
          >
            Voltar aos itens
          </button>
        </div>
      )}

      {overlayTefSimulado && (
        <div className="fixed inset-0 z-[160] flex flex-col items-center justify-center bg-[#060816]/95 backdrop-blur-xl px-8 border-t border-white/10">
          <CreditCard className="w-20 h-20 text-violet-400 mb-6 animate-pulse drop-shadow-[0_0_15px_rgba(139,92,246,0.5)]" />
          <h2 className="text-3xl font-black text-center text-white mb-3">Terminal de pagamento</h2>
          <p className="text-slate-400 text-center text-lg max-w-md">
            CREDITO TEF / DEBITO TEF — use o PinPad. A maquininha só confirma após a venda gravar no ERP (CNC).
          </p>
        </div>
      )}

      {step === 'done' && (
        <div className="flex-1 flex flex-col items-center justify-center px-8 py-16">
          <CheckCircle2 className="w-28 h-28 text-emerald-400 mb-8 drop-shadow-[0_0_20px_rgba(16,185,129,0.45)]" />
          <h2 className="text-4xl font-black text-center text-white mb-4">Pagamento aprovado!</h2>
          <p className="text-xl text-slate-300 text-center max-w-lg">
            Retire seu cupom fiscal. Obrigado pela preferência.
          </p>
          <p className="mt-8 text-slate-500 text-sm">Esta tela será reiniciada automaticamente…</p>
        </div>
      )}
    </>
  );
}
