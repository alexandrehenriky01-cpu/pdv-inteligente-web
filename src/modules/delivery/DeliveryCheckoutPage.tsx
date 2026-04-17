import { useMemo, useState } from 'react';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import { toast } from 'react-toastify';
import { ArrowLeft, Copy, Loader2, MapPin, QrCode } from 'lucide-react';
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
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamentoDelivery>('NA_ENTREGA');
  const [enviando, setEnviando] = useState(false);
  const [copiaColaCopiado, setCopiaColaCopiado] = useState(false);

  const taxaEntrega = loja?.taxaEntregaPadrao ?? 0;

  const totalPedido = useMemo(
    () => Math.round((subtotalItens + taxaEntrega) * 100) / 100,
    [subtotalItens, taxaEntrega]
  );

  const buildTLV = (tag: string, value: string): string => {
    const len = String(value.length).padStart(2, '0');
    return `${tag}${len}${value}`;
  };

  const removeAccents = (text: string): string => {
    return text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Za-z0-9 ]/g, ' ');
  };

  const truncateUpper = (text: string, maxLen: number): string => {
    return removeAccents(text).toUpperCase().trim().substring(0, maxLen);
  };

  const crc16CCITT = (str: string): string => {
    let crc = 0xffff;

    for (let i = 0; i < str.length; i++) {
      crc ^= str.charCodeAt(i) << 8;

      for (let j = 0; j < 8; j++) {
        if ((crc & 0x8000) !== 0) {
          crc = (crc << 1) ^ 0x1021;
        } else {
          crc <<= 1;
        }
        crc &= 0xffff;
      }
    }

    return crc.toString(16).toUpperCase().padStart(4, '0');
  };

    const gerarPixCopiaCola = (
      valor: number,
      chavePix: string | null,
      nomeLoja: string,
    cidadeLoja: string
  ): string => {
    if (!chavePix || !chavePix.trim()) return '';

    const chave = chavePix.trim();
    const nome = truncateUpper(nomeLoja || 'LOJA', 25);
    const cidade = truncateUpper(cidadeLoja || 'SAO PAULO', 15);
    const gui = 'BR.GOV.BCB.PIX';
    const txid = '***';

    const guiTLV = buildTLV('00', gui);
    const chaveTLV = buildTLV('01', chave);
    const id26TLV = buildTLV('26', guiTLV + chaveTLV);

    const txidTLV = buildTLV('05', txid);
    const id62TLV = buildTLV('62', txidTLV);

    const payload =
      buildTLV('00', '01') +
      buildTLV('01', '11') +
      id26TLV +
      buildTLV('52', '0000') +
      buildTLV('53', '986') +
      buildTLV('54', valor.toFixed(2)) +
      buildTLV('58', 'BR') +
      buildTLV('59', nome) +
      buildTLV('60', cidade) +
      id62TLV;

    const crcInput = payload + '6304';
    const crcValue = crc16CCITT(crcInput);

    return payload + buildTLV('63', crcValue);
  };

  const pixCopiaCola =
    formaPagamento === 'PIX'
      ? gerarPixCopiaCola(totalPedido, loja?.chavePix ?? null, loja?.nome ?? 'LOJA', cidade.trim() || 'SAO PAULO')
      : '';

  const copiarCodigoPix = async () => {
    try {
      await navigator.clipboard.writeText(pixCopiaCola);
      setCopiaColaCopiado(true);
      toast.success('Código PIX copiado!');
      setTimeout(() => setCopiaColaCopiado(false), 2000);
    } catch {
      toast.error('Erro ao copiar código.');
    }
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
    if (!cep.trim() || !rua.trim() || !numero.trim() || !bairro.trim() || !cidade.trim()) {
      toast.error('Preencha CEP, rua, número, bairro e cidade.');
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

    const enderecoEntrega = montarEnderecoEntrega({ cep, rua, numero, bairro, cidade, complemento });
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
        taxaEntrega,
        cidade: cidade.trim(),
        enderecoEntrega,
        observacoesVenda,
        nomeCliente: nome.trim(),
        formaPagamento,
      });

      console.log('Final Payload:', JSON.stringify(body, null, 2));

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
        `/menu/${encodeURIComponent(lojaPublicKey)}/pedido/${encodeURIComponent(venda.id)}`,
        { replace: true }
      );
    } catch (e) {
      const err = e as { response?: { status?: number; data?: { error?: string } } };
      if (err.response?.status === 400) {
        const msg = err.response.data?.error || '';
        if (msg.includes('itens')) {
          toast.error('Seu pedido está vazio. Adicione itens ao carrinho.');
        } else if (msg.includes('pagamento')) {
          toast.error('Selecione uma forma de pagamento.');
        } else if (msg.includes('Cidade')) {
          toast.error('Preencha o campo Cidade corretamente.');
        } else if (msg.includes('taxa')) {
          toast.error('Taxa de entrega não configurada. Contate o restaurante.');
        } else {
          toast.error('Verifique se preencheu todos os campos (Cidade e Endereço) corretamente.');
        }
      } else {
        toast.error(mensagemErroDeliveryApi(e));
      }
    } finally {
      setEnviando(false);
    }
  };

  if (carrinho.length === 0) {
    return (
      <div className="px-4 py-12 text-center">
        <p className="text-white/60">Sua sacola está vazia.</p>
        <Link
          to={`/menu/${encodeURIComponent(lojaPublicKey)}`}
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
          to={`/menu/${encodeURIComponent(lojaPublicKey)}`}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] text-white/85"
          aria-label="Voltar"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h2 className="text-lg font-semibold">Finalizar pedido</h2>
      </div>

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
        <div className="grid grid-cols-2 gap-3">
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
            <label className="mb-1 block text-xs text-white/45">Cidade <span className="text-red-400">*</span></label>
            <input
              value={cidade}
              onChange={(e) => setCidade(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2.5 text-white placeholder:text-white/30 focus:border-violet-500/50 focus:outline-none focus:ring-2 focus:ring-violet-500/25"
              placeholder="Cidade"
            />
          </div>
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
          <div className="flex-1">
            <p className="font-medium text-white">PIX online</p>
            <p className="text-sm text-white/45">Pagamento instantâneo via PIX Copia e Cola.</p>
          </div>
        </label>

        {formaPagamento === 'PIX' && !loja?.chavePix && (
          <div className="mt-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
            <p className="text-center text-sm text-amber-300">
              Configure a chave PIX no painel da loja para ativar o pagamento instantâneo.
            </p>
          </div>
        )}

        {formaPagamento === 'PIX' && !!loja?.chavePix && (
          <div className="mt-3 rounded-2xl border border-violet-500/20 bg-[#0b1324] p-4">
            <div className="mb-3 flex items-center gap-2">
              <QrCode className="h-4 w-4 text-emerald-400" />
              <span className="text-xs font-medium uppercase tracking-wide text-emerald-400">
                QR Code PIX
              </span>
            </div>
            {pixCopiaCola ? (
              <>
                <div className="mb-4 flex justify-center rounded-xl border border-white/10 bg-white p-3">
                  <div className="flex h-32 w-32 items-center justify-center bg-white">
                    <QrCode className="h-24 w-24 text-[#060816]" />
                  </div>
                </div>
                <div className="mb-3">
                  <p className="mb-1 text-xs text-white/45">Código Copia e Cola:</p>
                  <div className="relative">
                    <textarea
                      readOnly
                      value={pixCopiaCola}
                      rows={3}
                      className="w-full resize-none rounded-xl border border-violet-500/20 bg-[#060816] px-3 py-2 text-[10px] leading-tight text-emerald-400 placeholder:text-white/20"
                      placeholder="Código PIX gerado automaticamente..."
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={copiarCodigoPix}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 py-2.5 text-sm font-medium text-emerald-300 transition hover:bg-emerald-500/20 active:scale-[0.99]"
                >
                  <Copy className="h-4 w-4" />
                  {copiaColaCopiado ? 'Copiado!' : 'Copiar Código PIX'}
                </button>
                <p className="mt-2 text-center text-[10px] text-white/35">
                  Valor: <span className="font-semibold text-emerald-400">{formatBrl(totalPedido)}</span>
                </p>
              </>
            ) : (
              <p className="text-center text-sm text-amber-300">
                Erro ao gerar código PIX. Verifique a configuração.
              </p>
            )}
          </div>
        )}
      </section>

      <section className="mb-6 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
        <div className="flex justify-between text-sm text-white/60">
          <span>Subtotal</span>
          <span className="tabular-nums text-white">{formatBrl(subtotalItens)}</span>
        </div>
        <div className="mt-2 flex justify-between text-sm text-white/60">
          <span>Taxa de entrega</span>
          <span className="tabular-nums text-white">{formatBrl(taxaEntrega)}</span>
        </div>
        <div className="mt-3 flex justify-between border-t border-white/10 pt-3 text-base font-semibold">
          <span>Total</span>
          <span className="tabular-nums text-violet-200">{formatBrl(totalPedido)}</span>
        </div>
      </section>

      <button
        type="button"
        disabled={enviando || (loja ? !loja.aberto : false)}
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
