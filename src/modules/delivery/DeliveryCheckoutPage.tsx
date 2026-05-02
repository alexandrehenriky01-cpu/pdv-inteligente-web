import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import { toast } from 'react-toastify';
import { ArrowLeft, Bike, Copy, Loader2, MapPin, QrCode, ShoppingBag, Sparkles, Store, User, Wallet } from 'lucide-react';
import {
  finalizarPedidoDelivery,
  mensagemErroDeliveryApi,
  montarPayloadVendaDelivery,
  type FormaPagamentoDelivery,
  type PixDeliveryResposta,
  type TipoPedidoDelivery,
} from '../../services/api/deliveryApi';
import { extrairSenhaPedidoTotem } from '../../services/api/totemApi';
import {
  useDeliveryCartStore,
  selectValorSubtotalCarrinhoDelivery,
  validarLinhasCarrinhoDelivery,
} from './store/deliveryCartStore';
import type { CartItem } from '../totem/types';
import { useCep } from '../../hooks/useCep';
import type { DeliveryOutletContext } from './deliveryOutletContext';
import { rotuloLinhaCarrinho } from './cartItemDisplay';

function formatBrl(n: number): string {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function montarEnderecoEntrega(p: {
  cep: string;
  rua: string;
  numero: string;
  bairro: string;
  cidade: string;
  complemento: string;
}): string {
  const comp = p.complemento.trim();
  return `CEP ${p.cep.trim()} — ${p.rua.trim()}, ${p.numero.trim()} — ${p.bairro.trim()}${p.cidade.trim() ? ` — ${p.cidade.trim()}` : ''}${comp ? ` — ${comp}` : ''}`;
}

function montarObservacoesVenda(p: {
  nome: string;
  whatsapp: string;
  observacaoPedido: string;
}): string {
  const base = `Cliente: ${p.nome.trim()}\nWhatsApp: ${p.whatsapp.trim()}`;
  const extra = p.observacaoPedido.trim();
  return extra ? `${base}\nObs. pedido: ${extra}` : base;
}

export function DeliveryCheckoutPage() {
  const navigate = useNavigate();
  const { lojaPublicKey, loja, estacaoTrabalhoId } = useOutletContext<DeliveryOutletContext>();
  const carrinho = useDeliveryCartStore((s) => s.carrinho);
  const limparCarrinho = useDeliveryCartStore((s) => s.limparCarrinho);
  const subtotalItens = useDeliveryCartStore(selectValorSubtotalCarrinhoDelivery);

  const estacaoId = estacaoTrabalhoId ?? localStorage.getItem('estacao_trabalho') ?? undefined;

  const [nome, setNome] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [cep, setCep] = useState('');
  const [rua, setRua] = useState('');
  const [numero, setNumero] = useState('');
  const [bairro, setBairro] = useState('');
  const [cidade, setCidade] = useState('');
  const [complemento, setComplemento] = useState('');
  const [observacaoPedido, setObservacaoPedido] = useState('');
  const [tipoPedido, setTipoPedido] = useState<TipoPedidoDelivery>('DELIVERY');
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamentoDelivery>('NA_ENTREGA');
  const [enviando, setEnviando] = useState(false);
  const [copiaColaCopiado, setCopiaColaCopiado] = useState(false);
  const [pixServidor, setPixServidor] = useState<PixDeliveryResposta | null>(null);
  const [vendaIdPosEnvio, setVendaIdPosEnvio] = useState<string | null>(null);

  const { addressData, isLoading: carregandoCep, error: erroCep, fetchAddress } = useCep();
  const [cepInput, setCepInput] = useState('');

  useEffect(() => {
    console.log('Checkout useEffect - addressData:', addressData);
    if (addressData) {
      console.log('Preenchendo campos com:', addressData);
      setRua(addressData.logradouro || '');
      setBairro(addressData.bairro || '');
      setCidade(addressData.cidade || '');
    }
  }, [addressData]);

  const handleCepChange = (value: string) => {
    const onlyNums = value.replace(/\D/g, '').slice(0, 8);
    setCepInput(onlyNums);
    setCep(onlyNums);
    if (onlyNums.length === 8) {
      fetchAddress(onlyNums);
    }
  };

  const taxaEntrega = tipoPedido === 'RETIRADA_BALCAO' ? 0 : (loja?.taxaEntregaPadrao ?? 0);

  const totalPedido = useMemo(
    () => Math.round((subtotalItens + taxaEntrega) * 100) / 100,
    [subtotalItens, taxaEntrega]
  );

  // PIX client-side legado removido — todo QR/copia-cola agora vem do backend (PSP real).

  /** Copia o código/chave do PIX retornado pelo backend (DINAMICO ou ESTATICO). */
  const copiarPixServidor = async () => {
    if (!pixServidor) return;
    // No estático, se temos o BR Code (copia-e-cola) preferimos ele — apps de banco
    // identificam valor e destinatário automaticamente. Só caímos na chave pura
    // quando o BR Code não foi gerado (loja sem nome/cidade ou erro no backend).
    const texto =
      pixServidor.tipo === 'DINAMICO'
        ? pixServidor.pixCopiaCola
        : pixServidor.pixCopiaCola ?? pixServidor.chavePix;
    if (!texto) return;
    try {
      await navigator.clipboard.writeText(texto);
      setCopiaColaCopiado(true);
      toast.success(pixServidor.tipo === 'DINAMICO' ? 'Código PIX copiado!' : 'Chave PIX copiada!');
      setTimeout(() => setCopiaColaCopiado(false), 2000);
    } catch {
      toast.error('Erro ao copiar.');
    }
  };

  const irParaAcompanhamento = () => {
    if (!vendaIdPosEnvio) return;
    // Carrinho só é limpo ao deixar a tela de PIX — assim o cliente vê o sumário
    // (subtotal/taxa/total) enquanto copia o código.
    limparCarrinho();
    navigate(
      `/menu/${encodeURIComponent(lojaPublicKey)}/pedido/${encodeURIComponent(vendaIdPosEnvio)}`,
      { replace: true }
    );
  };

  const validar = (): boolean => {
    if (!nome.trim()) {
      toast.error('Informe seu nome.');
      return false;
    }
    if (!whatsapp.trim()) {
      toast.error('Informe seu WhatsApp.');
      return false;
    }
    if (tipoPedido === 'DELIVERY') {
      if (!cep.trim() || !rua.trim() || !numero.trim() || !bairro.trim() || !cidade.trim()) {
        toast.error('Preencha CEP, rua, número, bairro e cidade.');
        return false;
      }
    }
    if (loja && !loja.aberto) {
      toast.error('A loja está fechada no momento.');
      return false;
    }
    return true;
  };

  const enviarPedido = async () => {
    if (carrinho.length === 0) {
      toast.error('Sua sacola está vazia.');
      return;
    }
    const errSacola = validarLinhasCarrinhoDelivery(carrinho);
    if (errSacola) {
      toast.error(errSacola);
      return;
    }
    if (!validar()) return;

    const enderecoEntrega =
      tipoPedido === 'DELIVERY'
        ? montarEnderecoEntrega({ cep, rua, numero, bairro, cidade, complemento })
        : '';
    const observacoesVenda = montarObservacoesVenda({
      nome,
      whatsapp,
      observacaoPedido,
    });

    setEnviando(true);
    try {
      const body = montarPayloadVendaDelivery({
        lojaId: loja?.id ?? lojaPublicKey,
        estacaoTrabalhoId: estacaoId,
        carrinho,
        subtotalItens,
        taxaEntrega: loja?.taxaEntregaPadrao ?? 0,
        tipoPedido,
        cidade: tipoPedido === 'DELIVERY' ? cidade.trim() : undefined,
        enderecoEntrega: tipoPedido === 'DELIVERY' ? enderecoEntrega : undefined,
        observacoesVenda,
        nomeCliente: nome.trim(),
        formaPagamento,
      });

      console.log('Final Payload:', JSON.stringify(body, null, 2));

      const respostaFinal = await finalizarPedidoDelivery(body);
      const { mensagem, venda, pix } = respostaFinal;

      const senha = extrairSenhaPedidoTotem(venda);
      toast.success(`${mensagem} Senha: ${senha}`);

      if (pix) {
        // PIX: mantém o cliente no checkout para escanear/copiar o QR.
        // O botão "Confirmar pedido" abaixo levará para a tela de acompanhamento.
        setPixServidor(pix);
        setVendaIdPosEnvio(venda.id);
        if (pix.tipo === 'DINAMICO') {
          toast.info('Escaneie o QR Code ou copie o código PIX para concluir o pagamento.', {
            autoClose: 6000,
          });
        } else {
          toast.info('Realize o pagamento via PIX e aguarde a confirmação manual da loja.', {
            autoClose: 6000,
          });
        }
        return;
      }

      // Pagamento na entrega: navega direto para o tracking.
      limparCarrinho();
      navigate(
        `/menu/${encodeURIComponent(lojaPublicKey)}/pedido/${encodeURIComponent(venda.id)}`,
        { replace: true }
      );
    } catch (e) {
      const err = e as { response?: { status?: number; data?: { error?: string } } };
      const statusCode = err.response?.status;
      const apiMsg = err.response?.data?.error || '';

      if (statusCode === 400 || statusCode === 409 || statusCode === 422) {
        if (apiMsg.includes('itens') || apiMsg.includes('carrinho')) {
          toast.error('Seu pedido está vazio. Adicione itens ao carrinho.');
        } else if (apiMsg.includes('pagamento')) {
          toast.error('Selecione uma forma de pagamento.');
        } else if (apiMsg.includes('Cidade') || apiMsg.includes('cidade')) {
          toast.error('Preencha o campo Cidade corretamente.');
        } else if (apiMsg.includes('taxa') || apiMsg.includes('Taxa')) {
          toast.error('Taxa de entrega não configurada. Contate o restaurante.');
        } else if (apiMsg.includes('idempotency') || apiMsg.includes('Idempotency')) {
          toast.error('Erro de chave de idempotência. Recarregue a página e tente novamente.');
        } else if (apiMsg) {
          toast.error(apiMsg);
        } else {
          toast.error(mensagemErroDeliveryApi(e));
        }
      } else {
        toast.error(mensagemErroDeliveryApi(e));
      }

      console.error('[DeliveryCheckout] erro ao enviar pedido', { statusCode, apiMsg, raw: e });
    } finally {
      setEnviando(false);
    }
  };

  // Após confirmar o pedido limpamos o carrinho — mas se ainda há um PIX pendente
  // para o cliente copiar/escanear, NÃO mostramos "sacola vazia" senão o card do
  // QR Code some imediatamente.
  if (carrinho.length === 0 && !pixServidor) {
    return (
      <div className="px-6 py-16 text-center">
        <div className="mx-auto max-w-xs rounded-card border border-bg-border bg-bg-surface p-6 shadow-card">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-pill bg-cta shadow-cta">
            <ShoppingBag className="h-6 w-6 text-white" />
          </div>
          <p className="text-sm font-medium text-text-secondary">Sua sacola está vazia.</p>
          <Link
            to={`/menu/${encodeURIComponent(lojaPublicKey)}`}
            className="mt-4 inline-flex items-center gap-1.5 rounded-pill border-2 border-accent-magenta px-4 py-2 text-sm font-bold uppercase tracking-wide text-text-primary transition hover:bg-accent-magenta/10"
          >
            Voltar ao cardápio
          </Link>
        </div>
      </div>
    );
  }

  const inputClass =
    'w-full h-12 rounded-item border border-bg-border bg-bg-raised px-4 text-[15px] text-text-primary placeholder:text-text-muted transition focus:border-accent-purple focus:outline-none focus:ring-2 focus:ring-accent-purple/20';

  return (
    <div className="px-4 pb-28 pt-4">
      <header className="mb-6 flex items-center justify-between gap-3">
        <Link
          to={`/menu/${encodeURIComponent(lojaPublicKey)}`}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-bg-raised text-text-secondary transition hover:text-text-primary active:scale-95"
          aria-label="Voltar"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="text-center min-w-0 flex-1">
          <h1 className="font-bold text-text-primary truncate">Finalizar pedido</h1>
          <p className="text-text-muted text-xs truncate">Confira seus dados antes de enviar</p>
        </div>
        <div className="w-9" aria-hidden />
      </header>

      <section className="mb-6 rounded-card border border-bg-border bg-bg-surface p-5 shadow-card">
        <div className="mb-3 flex items-center gap-2">
          <span className="text-accent-purple font-bold text-sm">1.</span>
          <h2 className="text-text-secondary font-semibold text-xs uppercase tracking-wider">Tipo do pedido</h2>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setTipoPedido('DELIVERY')}
            className={`flex flex-col items-center gap-2 p-4 text-sm font-bold uppercase transition-all duration-200 active:scale-[0.98] ${
              tipoPedido === 'DELIVERY'
                ? 'rounded-item border-2 border-accent-magenta bg-bg-raised text-text-primary shadow-glow-pink'
                : 'rounded-item border border-bg-border bg-bg-raised text-text-secondary hover:text-text-primary hover:border-accent-purple/40'
            }`}
          >
            <Bike className={`h-6 w-6 ${tipoPedido === 'DELIVERY' ? 'text-accent-magenta' : 'text-text-muted'}`} />
            Entrega
          </button>
          <button
            type="button"
            onClick={() => setTipoPedido('RETIRADA_BALCAO')}
            className={`flex flex-col items-center gap-2 p-4 text-sm font-bold uppercase transition-all duration-200 active:scale-[0.98] ${
              tipoPedido === 'RETIRADA_BALCAO'
                ? 'rounded-item border-2 border-accent-magenta bg-bg-raised text-text-primary shadow-glow-pink'
                : 'rounded-item border border-bg-border bg-bg-raised text-text-secondary hover:text-text-primary hover:border-accent-purple/40'
            }`}
          >
            <Store className={`h-6 w-6 ${tipoPedido === 'RETIRADA_BALCAO' ? 'text-accent-magenta' : 'text-text-muted'}`} />
            Retirar no balcão
          </button>
        </div>
      </section>

      <section className="mb-6 space-y-4 rounded-card border border-bg-border bg-bg-surface p-5 shadow-card">
        <div className="flex items-center gap-2">
          <span className="text-accent-purple font-bold text-sm">2.</span>
          <h2 className="flex items-center gap-2 text-text-secondary font-semibold text-xs uppercase tracking-wider">
            {tipoPedido === 'DELIVERY' ? <MapPin className="h-3.5 w-3.5 text-accent-purple" /> : <User className="h-3.5 w-3.5 text-accent-purple" />}
            {tipoPedido === 'DELIVERY' ? 'Entrega' : 'Seus dados'}
          </h2>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-text-secondary">Nome completo</label>
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className={inputClass}
            placeholder="Seu nome"
            autoComplete="name"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-text-secondary">WhatsApp</label>
          <input
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            className={inputClass}
            placeholder="(00) 00000-0000"
            inputMode="tel"
            autoComplete="tel"
          />
        </div>
        {tipoPedido === 'DELIVERY' && (
          <>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-text-secondary">CEP</label>
            <div className="relative">
              <input
                value={cepInput}
                onChange={(e) => handleCepChange(e.target.value)}
                className={`${inputClass} pr-10`}
                placeholder="00000000"
                inputMode="numeric"
                maxLength={8}
                autoComplete="postal-code"
              />
              {carregandoCep && (
                <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-text-muted" />
              )}
            </div>
            {erroCep && !carregandoCep && (
              <p className="mt-1.5 text-xs font-semibold text-danger">{erroCep}</p>
            )}
            {addressData && !carregandoCep && !erroCep && (
              <p className="mt-1.5 text-xs font-semibold text-price">CEP encontrado</p>
            )}
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-text-secondary">Número</label>
            <input
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
              className={inputClass}
              placeholder="Nº"
            />
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-text-secondary">Rua</label>
          <input
            value={rua}
            onChange={(e) => setRua(e.target.value)}
            className={inputClass}
            placeholder="Logradouro"
            autoComplete="street-address"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-text-secondary">Bairro</label>
            <input
              value={bairro}
              onChange={(e) => setBairro(e.target.value)}
              className={inputClass}
              placeholder="Bairro"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-text-secondary">Cidade <span className="text-red-400">*</span></label>
            <input
              value={cidade}
              onChange={(e) => setCidade(e.target.value)}
              className={inputClass}
              placeholder="Cidade"
            />
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-text-secondary">Complemento (opcional)</label>
          <input
            value={complemento}
            onChange={(e) => setComplemento(e.target.value)}
            className={inputClass}
            placeholder="Apto, bloco, referência…"
          />
        </div>
          </>
        )}
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-text-secondary">Observações do pedido (opcional)</label>
          <textarea
            value={observacaoPedido}
            onChange={(e) => setObservacaoPedido(e.target.value)}
            rows={2}
            className={`${inputClass} resize-none`}
            placeholder="Ex.: interfone, ponto da carne…"
          />
        </div>
        </section>

      <section className="mb-6 space-y-3 rounded-card border border-bg-border bg-bg-surface p-5 shadow-card">
        <div className="flex items-center gap-2">
          <span className="text-accent-purple font-bold text-sm">3.</span>
          <h2 className="flex items-center gap-2 text-text-secondary font-semibold text-xs uppercase tracking-wider">
            <Wallet className="h-3.5 w-3.5 text-accent-purple" />
            Pagamento
          </h2>
        </div>
        <label className={`flex cursor-pointer items-start gap-3 p-4 transition active:scale-[0.99] ${
          formaPagamento === 'NA_ENTREGA'
            ? 'rounded-item border-2 border-accent-magenta bg-bg-raised shadow-glow-pink'
            : 'rounded-item border border-bg-border bg-bg-raised hover:border-accent-purple/40'
        }`}>
          <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
            formaPagamento === 'NA_ENTREGA' ? 'border-accent-magenta bg-accent-magenta' : 'border-bg-border'
          }`}>
            {formaPagamento === 'NA_ENTREGA' && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
          </span>
          <input
            type="radio"
            name="pag"
            checked={formaPagamento === 'NA_ENTREGA'}
            onChange={() => setFormaPagamento('NA_ENTREGA')}
            className="sr-only"
          />
          <div className="min-w-0 flex-1">
            <p className="font-bold text-text-primary">Pagar na entrega</p>
            <p className="mt-0.5 text-xs text-text-muted">Dinheiro ou cartão na porta (registrado como dinheiro no caixa).</p>
          </div>
        </label>
        <label className={`relative flex cursor-pointer items-start gap-3 p-4 transition active:scale-[0.99] ${
          formaPagamento === 'PIX'
            ? 'rounded-item border-2 border-accent-magenta bg-bg-raised shadow-glow-pink'
            : 'rounded-item border border-bg-border bg-bg-raised hover:border-accent-purple/40'
        }`}>
          <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
            formaPagamento === 'PIX' ? 'border-accent-magenta bg-accent-magenta' : 'border-bg-border'
          }`}>
            {formaPagamento === 'PIX' && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
          </span>
          <input
            type="radio"
            name="pag"
            checked={formaPagamento === 'PIX'}
            onChange={() => setFormaPagamento('PIX')}
            className="sr-only"
          />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="font-bold text-text-primary">PIX online</p>
              <span className="inline-flex items-center gap-1 rounded-pill bg-price/15 text-price px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">
                <Sparkles className="h-2.5 w-2.5" /> Recomendado
              </span>
            </div>
            <p className="mt-0.5 text-xs text-text-muted">Pagamento instantâneo via PIX Copia e Cola.</p>
          </div>
        </label>

        {/* Antes do envio: apenas info — QR é gerado pelo servidor após confirmar pedido */}
        {formaPagamento === 'PIX' && !!loja?.chavePix && !pixServidor && (
          <div className="mt-3 rounded-item border border-bg-border bg-bg-raised p-4">
            <p className="text-center text-sm text-text-secondary">
              O QR Code PIX será gerado ao confirmar o pedido.
            </p>
          </div>
        )}

        {/* Depois do envio: PIX dinâmico (QR real do PSP) */}
        {pixServidor?.tipo === 'DINAMICO' && (
          <div className="mt-3 rounded-item border border-price/30 bg-bg-raised p-4">
            <div className="mb-3 flex items-center gap-2">
              <QrCode className="h-4 w-4 text-price" />
              <span className="text-xs font-bold uppercase tracking-wide text-price">
                QR Code PIX — escaneie ou copie o código
              </span>
            </div>
            {pixServidor.qrCodeBase64 && (
              <div className="mb-4 flex justify-center rounded-item border border-bg-border bg-white p-3">
                <img
                  src={`data:image/png;base64,${pixServidor.qrCodeBase64}`}
                  alt="QR Code PIX"
                  className="h-40 w-40 object-contain"
                />
              </div>
            )}
            <div className="mb-3">
              <p className="mb-1 text-xs text-text-muted">Código Copia e Cola:</p>
              <textarea
                readOnly
                value={pixServidor.pixCopiaCola}
                rows={3}
                className="w-full resize-none rounded-item border border-bg-border bg-bg-base px-3 py-2 text-[10px] leading-tight text-price"
              />
            </div>
            <button
              type="button"
              onClick={() => void copiarPixServidor()}
              className="flex w-full items-center justify-center gap-2 rounded-pill border border-price/40 bg-price/10 py-2.5 text-sm font-bold text-price transition hover:bg-price/20 active:scale-[0.99]"
            >
              <Copy className="h-4 w-4" />
              {copiaColaCopiado ? 'Copiado!' : 'Copiar Código PIX'}
            </button>
            <p className="mt-2 text-center text-[10px] text-text-muted">
              Aguardando confirmação do pagamento… Valor:{' '}
              <span className="font-bold text-price">{formatBrl(totalPedido)}</span>
            </p>
          </div>
        )}

        {/* Depois do envio: PIX estático (chave do local de cobrança) */}
        {pixServidor?.tipo === 'ESTATICO' && (
          <div className="mt-3 rounded-card border border-amber-500/30 bg-bg-base p-4">
            <div className="mb-3 flex items-center gap-2">
              <QrCode className="h-4 w-4 text-amber-300" />
              <span className="text-xs font-bold uppercase tracking-wide text-amber-300">
                {pixServidor.qrCodeBase64
                  ? 'PIX — escaneie ou copie o código'
                  : 'Chave PIX — confirmação manual'}
              </span>
            </div>
            <p className="mb-3 text-xs text-amber-200/85">
              {pixServidor.mensagem ?? 'Realize o pagamento e aguarde confirmação manual.'}
            </p>

            {pixServidor.qrCodeBase64 && (
              <div className="mb-4 flex justify-center rounded-item border border-bg-border bg-white p-3">
                <img
                  src={`data:image/png;base64,${pixServidor.qrCodeBase64}`}
                  alt="QR Code PIX"
                  className="h-40 w-40 object-contain"
                />
              </div>
            )}

            {pixServidor.pixCopiaCola ? (
              <div className="mb-3">
                <p className="mb-1 text-xs text-text-muted">Código Copia e Cola:</p>
                <textarea
                  readOnly
                  value={pixServidor.pixCopiaCola}
                  rows={3}
                  className="w-full resize-none rounded-item border border-amber-500/20 bg-bg-raised px-3 py-2 text-[10px] leading-tight text-amber-200"
                />
              </div>
            ) : (
              <div className="mb-3">
                <p className="mb-1 text-xs text-text-muted">Chave PIX da loja:</p>
                <input
                  readOnly
                  value={pixServidor.chavePix}
                  className="w-full rounded-item border border-amber-500/20 bg-bg-raised px-3 py-2 text-xs text-amber-200"
                />
              </div>
            )}

            <button
              type="button"
              onClick={() => void copiarPixServidor()}
              className="flex w-full items-center justify-center gap-2 rounded-pill border border-amber-500/30 bg-amber-500/10 py-2.5 text-sm font-bold text-amber-200 transition hover:bg-amber-500/20"
            >
              <Copy className="h-4 w-4" />
              {copiaColaCopiado
                ? 'Copiado!'
                : pixServidor.pixCopiaCola
                  ? 'Copiar código PIX'
                  : 'Copiar chave PIX'}
            </button>
            <p className="mt-2 text-center text-[10px] text-text-muted">
              Valor:{' '}
              <span className="font-semibold text-amber-300">{formatBrl(totalPedido)}</span>
            </p>
          </div>
        )}
      </section>

      <section className="mb-6 rounded-card border border-bg-border bg-bg-surface p-5 shadow-card">
        <div className="mb-3 flex items-center gap-2">
          <span className="text-accent-purple font-bold text-sm">4.</span>
          <h2 className="flex items-center gap-2 text-text-secondary font-semibold text-xs uppercase tracking-wider">
            <ShoppingBag className="h-3.5 w-3.5 text-accent-purple" />
            Resumo do pedido
          </h2>
        </div>
        <ul className="mb-4 space-y-2.5 border-b border-bg-border pb-4">
          {carrinho.map((it) => {
            const { titulo, subtitulo } = rotuloLinhaCarrinho(it);
            return (
              <li key={it.id} className="flex justify-between gap-3 text-sm text-text-primary">
                <div className="min-w-0">
                  <p className="font-semibold uppercase text-text-primary">
                    <span className="mr-1 inline-flex h-5 min-w-[1.5rem] items-center justify-center rounded-pill bg-accent-purple/15 px-1 text-[11px] font-black tabular-nums text-accent-purple">{it.quantidade}×</span>
                    {titulo}
                  </p>
                  {subtitulo && (
                    <p className="mt-0.5 text-xs leading-snug text-text-muted">{subtitulo}</p>
                  )}
                </div>
                <span className="shrink-0 font-bold tabular-nums text-price">{formatBrl(it.subtotal)}</span>
              </li>
            );
          })}
        </ul>
        <div className="flex justify-between text-sm text-text-secondary">
          <span>Subtotal</span>
          <span className="font-semibold tabular-nums text-price">{formatBrl(subtotalItens)}</span>
        </div>
        {tipoPedido === 'DELIVERY' && (
        <div className="mt-2 flex justify-between text-sm text-text-secondary">
          <span>Taxa de entrega</span>
          <span className="font-semibold tabular-nums text-price">{formatBrl(taxaEntrega)}</span>
        </div>
        )}
        <div className="mt-3 flex items-end justify-between border-t border-bg-border pt-3">
          <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-text-secondary">Total</span>
          <span className="text-3xl font-black tabular-nums text-price">{formatBrl(totalPedido)}</span>
        </div>
      </section>

      {pixServidor ? (
        <button
          type="button"
          onClick={irParaAcompanhamento}
          className="flex min-h-[3.5rem] w-full items-center justify-center gap-2 rounded-pill bg-cta hover:bg-cta-hover shadow-cta px-4 text-base font-bold uppercase tracking-wide text-white transition-all duration-200 active:scale-[0.98]"
        >
          <span>Confirmar pedido — Acompanhar</span>
        </button>
      ) : (
        <button
          type="button"
          disabled={enviando || (loja ? !loja.aberto : false)}
          onClick={() => void enviarPedido()}
          className="flex min-h-[3.5rem] w-full items-center justify-center gap-2 rounded-pill bg-cta hover:bg-cta-hover shadow-cta px-4 text-base font-bold uppercase tracking-wide text-white transition-all duration-200 enabled:active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100"
        >
          {enviando ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Enviando…</span>
            </>
          ) : formaPagamento === 'PIX' ? (
            <>
              <QrCode className="h-5 w-5" />
              <span>Gerar QR Code — {formatBrl(totalPedido)}</span>
            </>
          ) : (
            <span>Confirmar pedido — {formatBrl(totalPedido)}</span>
          )}
        </button>
      )}
    </div>
  );
}
