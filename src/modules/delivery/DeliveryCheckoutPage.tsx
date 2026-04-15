import { useMemo, useState } from 'react';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import { toast } from 'react-toastify';
import { ArrowLeft, Loader2, MapPin } from 'lucide-react';
import {
  finalizarPedidoDelivery,
  mensagemErroDeliveryApi,
  montarPayloadVendaDelivery,
  type FormaPagamentoDelivery,
} from '../../services/api/deliveryApi';
import { extrairSenhaPedidoTotem } from '../../services/api/totemApi';
import {
  useDeliveryCartStore,
  selectValorSubtotalCarrinhoDelivery,
} from './store/deliveryCartStore';
import type { DeliveryOutletContext } from './deliveryOutletContext';

const TAXA_ENTREGA_FIXA = 8;

function formatBrl(n: number): string {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function montarEnderecoEntrega(p: {
  cep: string;
  rua: string;
  numero: string;
  bairro: string;
  complemento: string;
}): string {
  const comp = p.complemento.trim();
  return `CEP ${p.cep.trim()} — ${p.rua.trim()}, ${p.numero.trim()}${comp ? ` — ${comp}` : ''} — ${p.bairro.trim()}`;
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

  const [nome, setNome] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [cep, setCep] = useState('');
  const [rua, setRua] = useState('');
  const [numero, setNumero] = useState('');
  const [bairro, setBairro] = useState('');
  const [complemento, setComplemento] = useState('');
  const [observacaoPedido, setObservacaoPedido] = useState('');
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamentoDelivery>('NA_ENTREGA');
  const [enviando, setEnviando] = useState(false);

  const totalPedido = useMemo(
    () => Math.round((subtotalItens + TAXA_ENTREGA_FIXA) * 100) / 100,
    [subtotalItens]
  );

  const estacaoOk = Boolean(estacaoTrabalhoId?.trim());

  const validar = (): boolean => {
    if (!nome.trim()) {
      toast.error('Informe seu nome.');
      return false;
    }
    if (!whatsapp.trim()) {
      toast.error('Informe seu WhatsApp.');
      return false;
    }
    if (!cep.trim() || !rua.trim() || !numero.trim() || !bairro.trim()) {
      toast.error('Preencha CEP, rua, número e bairro.');
      return false;
    }
    if (!estacaoOk) {
      toast.error(
        'Link incompleto: falta o parâmetro da estação (?estacao=…). Peça o link completo à loja.'
      );
      return false;
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
    if (!validar()) return;

    const enderecoEntrega = montarEnderecoEntrega({ cep, rua, numero, bairro, complemento });
    const observacoesVenda = montarObservacoesVenda({
      nome,
      whatsapp,
      observacaoPedido,
    });

    setEnviando(true);
    try {
      const body = montarPayloadVendaDelivery({
        lojaId: loja?.id ?? lojaPublicKey,
        estacaoTrabalhoId,
        carrinho,
        subtotalItens,
        taxaEntrega: TAXA_ENTREGA_FIXA,
        enderecoEntrega,
        observacoesVenda,
        nomeCliente: nome.trim(),
        formaPagamento,
      });

      const { mensagem, venda } = await finalizarPedidoDelivery(body);
      const senha = extrairSenhaPedidoTotem(venda);
      limparCarrinho();
      toast.success(`${mensagem} Senha: ${senha}`);
      if (formaPagamento === 'PIX') {
        toast.info('PIX online em modo demonstração — o restaurante confirma o pagamento.', {
          autoClose: 5000,
        });
      }
      navigate(
        `/delivery/${encodeURIComponent(lojaPublicKey)}/pedido/${encodeURIComponent(venda.id)}`,
        { replace: true }
      );
    } catch (e) {
      toast.error(mensagemErroDeliveryApi(e));
    } finally {
      setEnviando(false);
    }
  };

  if (carrinho.length === 0) {
    return (
      <div className="px-4 py-12 text-center">
        <p className="text-white/60">Sua sacola está vazia.</p>
        <Link
          to={`/delivery/${encodeURIComponent(lojaPublicKey)}`}
          className="mt-4 inline-block text-violet-300 underline"
        >
          Voltar ao cardápio
        </Link>
      </div>
    );
  }

  return (
    <div className="px-4 pb-28 pt-4">
      <div className="mb-4 flex items-center gap-2">
        <Link
          to={`/delivery/${encodeURIComponent(lojaPublicKey)}`}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] text-white/85"
          aria-label="Voltar"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h2 className="text-lg font-semibold">Finalizar pedido</h2>
      </div>

      {!estacaoOk && (
        <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
          Falta o parâmetro <code className="rounded bg-black/30 px-1">?estacao=</code> na URL (UUID da
          estação de trabalho / caixa do delivery). Sem isso o pedido não pode ser registrado.
        </div>
      )}

      <section className="mb-6 space-y-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-white/45">
          <MapPin className="h-4 w-4" />
          Entrega
        </h3>
        <div>
          <label className="mb-1 block text-xs text-white/45">Nome completo</label>
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2.5 text-white placeholder:text-white/30 focus:border-violet-500/50 focus:outline-none focus:ring-2 focus:ring-violet-500/25"
            placeholder="Seu nome"
            autoComplete="name"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-white/45">WhatsApp</label>
          <input
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2.5 text-white placeholder:text-white/30 focus:border-violet-500/50 focus:outline-none focus:ring-2 focus:ring-violet-500/25"
            placeholder="(00) 00000-0000"
            inputMode="tel"
            autoComplete="tel"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs text-white/45">CEP</label>
            <input
              value={cep}
              onChange={(e) => setCep(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2.5 text-white placeholder:text-white/30 focus:border-violet-500/50 focus:outline-none focus:ring-2 focus:ring-violet-500/25"
              placeholder="00000-000"
              autoComplete="postal-code"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-white/45">Número</label>
            <input
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2.5 text-white placeholder:text-white/30 focus:border-violet-500/50 focus:outline-none focus:ring-2 focus:ring-violet-500/25"
              placeholder="Nº"
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs text-white/45">Rua</label>
          <input
            value={rua}
            onChange={(e) => setRua(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2.5 text-white placeholder:text-white/30 focus:border-violet-500/50 focus:outline-none focus:ring-2 focus:ring-violet-500/25"
            placeholder="Logradouro"
            autoComplete="street-address"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-white/45">Bairro</label>
          <input
            value={bairro}
            onChange={(e) => setBairro(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2.5 text-white placeholder:text-white/30 focus:border-violet-500/50 focus:outline-none focus:ring-2 focus:ring-violet-500/25"
            placeholder="Bairro"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-white/45">Complemento (opcional)</label>
          <input
            value={complemento}
            onChange={(e) => setComplemento(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2.5 text-white placeholder:text-white/30 focus:border-violet-500/50 focus:outline-none focus:ring-2 focus:ring-violet-500/25"
            placeholder="Apto, bloco, referência…"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-white/45">Observações do pedido (opcional)</label>
          <textarea
            value={observacaoPedido}
            onChange={(e) => setObservacaoPedido(e.target.value)}
            rows={2}
            className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2.5 text-white placeholder:text-white/30 focus:border-violet-500/50 focus:outline-none focus:ring-2 focus:ring-violet-500/25"
            placeholder="Ex.: interfone, ponto da carne…"
          />
        </div>
      </section>

      <section className="mb-6 space-y-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-white/45">Pagamento</h3>
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-3">
          <input
            type="radio"
            name="pag"
            checked={formaPagamento === 'NA_ENTREGA'}
            onChange={() => setFormaPagamento('NA_ENTREGA')}
            className="mt-1"
          />
          <div>
            <p className="font-medium text-white">Pagar na entrega</p>
            <p className="text-sm text-white/45">Dinheiro ou cartão na porta (registrado como dinheiro no caixa).</p>
          </div>
        </label>
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-3">
          <input
            type="radio"
            name="pag"
            checked={formaPagamento === 'PIX'}
            onChange={() => setFormaPagamento('PIX')}
            className="mt-1"
          />
          <div>
            <p className="font-medium text-white">PIX online</p>
            <p className="text-sm text-white/45">Demonstração — sem QR Code nesta versão.</p>
          </div>
        </label>
      </section>

      <section className="mb-6 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
        <div className="flex justify-between text-sm text-white/60">
          <span>Subtotal</span>
          <span className="tabular-nums text-white">{formatBrl(subtotalItens)}</span>
        </div>
        <div className="mt-2 flex justify-between text-sm text-white/60">
          <span>Taxa de entrega</span>
          <span className="tabular-nums text-white">{formatBrl(TAXA_ENTREGA_FIXA)}</span>
        </div>
        <div className="mt-3 flex justify-between border-t border-white/10 pt-3 text-base font-semibold">
          <span>Total</span>
          <span className="tabular-nums text-violet-200">{formatBrl(totalPedido)}</span>
        </div>
      </section>

      <button
        type="button"
        disabled={enviando || !estacaoOk || (loja ? !loja.aberto : false)}
        onClick={() => void enviarPedido()}
        className="flex min-h-[3.25rem] w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 text-base font-semibold text-white shadow-[0_12px_40px_rgba(109,40,217,0.4)] transition enabled:active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-45"
      >
        {enviando ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Enviando…
          </>
        ) : (
          `Confirmar — ${formatBrl(totalPedido)}`
        )}
      </button>
    </div>
  );
}
