import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  Landmark,
  Loader2,
  QrCode,
  Sparkles,
  Trash2,
} from 'lucide-react';
import {
  useTotemStore,
  selectValorTotalCarrinho,
} from '../store/totemStore';
import {
  extrairSenhaPedidoTotem,
  finalizarPedidoTotem,
  mensagemErroTotemApi,
  type LinhaPagamentoTotem,
} from '../../../services/api/totemApi';
import {
  aguardarAutorizacaoTefHardware,
  tefFalhaSalvarVendaCnc,
  tefPosVendaSucessoCnc,
} from '../../../services/tefCncFlow';
import { PagamentoValorParcialModal } from '../../operacoes/PagamentoValorParcialModal';
import {
  parseValorMonetarioPdv,
  validarValorParcialPdv,
} from '../../operacoes/pdvPagamentoParcialUtils';

function formatBrl(n: number): string {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function novoIdTotem(): string {
  if (
    typeof globalThis.crypto !== 'undefined' &&
    typeof globalThis.crypto.randomUUID === 'function'
  ) {
    return globalThis.crypto.randomUUID();
  }
  return `totem-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

type Etapa = 'checkout' | 'processando' | 'sucesso';

type FormaPagamento = 'CARTAO_CREDITO' | 'CARTAO_DEBITO' | 'PIX';

interface LinhaTotemUi extends LinhaPagamentoTotem {
  id: string;
}

export function TotemCheckoutPage() {
  const navigate = useNavigate();
  const tipoConsumo = useTotemStore((s) => s.tipoConsumo);
  const fluxoIniciado = useTotemStore((s) => s.fluxoIniciado);
  const carrinho = useTotemStore((s) => s.carrinho);
  const valorTotal = useTotemStore(selectValorTotalCarrinho);
  const limparCarrinho = useTotemStore((s) => s.limparCarrinho);
  const resetSessaoTotem = useTotemStore((s) => s.resetSessaoTotem);

  const [etapa, setEtapa] = useState<Etapa>('checkout');
  const [senhaPedido, setSenhaPedido] = useState('');
  const [totalPagoExibicao, setTotalPagoExibicao] = useState(0);

  const [linhasPagamento, setLinhasPagamento] = useState<LinhaTotemUi[]>([]);
  const [modalValorAberto, setModalValorAberto] = useState(false);
  const [formaModal, setFormaModal] = useState<FormaPagamento | null>(null);
  const [campoValorModal, setCampoValorModal] = useState('');
  const [erroModal, setErroModal] = useState<string | null>(null);
  const [adicionandoTef, setAdicionandoTef] = useState(false);

  const assinaturaCarrinho = useMemo(
    () => JSON.stringify(carrinho.map((c) => ({ id: c.id, q: c.quantidade }))),
    [carrinho]
  );

  useEffect(() => {
    setLinhasPagamento([]);
  }, [assinaturaCarrinho]);

  useEffect(() => {
    if (!tipoConsumo || !fluxoIniciado) {
      navigate('/totem-food', { replace: true });
      return;
    }
    if (carrinho.length === 0 && etapa !== 'sucesso') {
      navigate('/totem-food/cardapio', { replace: true });
    }
  }, [tipoConsumo, fluxoIniciado, carrinho.length, etapa, navigate]);

  const totalPagoLinhas = round2(linhasPagamento.reduce((s, l) => s + l.valor, 0));
  const valorRestante = round2(Math.max(0, valorTotal - totalPagoLinhas));

  const cancelarPedido = () => {
    limparCarrinho();
    resetSessaoTotem();
    navigate('/totem-food', { replace: true });
  };

  const rotuloForma = (f: FormaPagamento): string => {
    if (f === 'PIX') return 'PIX';
    if (f === 'CARTAO_CREDITO') return 'Crédito TEF';
    return 'Débito TEF';
  };

  const abrirModalValor = (f: FormaPagamento) => {
    if (valorRestante <= 0) {
      toast.info('Total já coberto. Conclua o pedido ou remova uma linha.');
      return;
    }
    setFormaModal(f);
    setCampoValorModal(valorRestante.toFixed(2));
    setErroModal(null);
    setModalValorAberto(true);
  };

  const fecharModalValor = () => {
    setModalValorAberto(false);
    setFormaModal(null);
    setCampoValorModal('');
    setErroModal(null);
  };

  const confirmarValorModal = async () => {
    if (!formaModal || !tipoConsumo) return;
    const parsed = parseValorMonetarioPdv(campoValorModal);
    if (parsed === null) {
      setErroModal('Valor inválido.');
      return;
    }
    const vMsg = validarValorParcialPdv(parsed, valorRestante);
    if (vMsg) {
      setErroModal(vMsg);
      return;
    }
    const valor = round2(parsed);

    if (formaModal === 'PIX') {
      setLinhasPagamento((prev) => [
        ...prev,
        { id: novoIdTotem(), formaPagamento: 'PIX', valor },
      ]);
      fecharModalValor();
      return;
    }

    fecharModalValor();
    setAdicionandoTef(true);
    let tid: string | undefined;
    try {
      const { transacaoTefId } = await aguardarAutorizacaoTefHardware({
        valor,
        tipoCartao: formaModal === 'CARTAO_CREDITO' ? 'CREDITO' : 'DEBITO',
        terminal: 'TOTEM-FOOD',
      });
      tid = transacaoTefId;
      setLinhasPagamento((prev) => [
        ...prev,
        {
          id: novoIdTotem(),
          formaPagamento: formaModal,
          valor,
          transacaoTefId: tid,
        },
      ]);
    } catch (err) {
      toast.error(mensagemErroTotemApi(err), { toastId: 'totem-tef-parcial' });
    } finally {
      setAdicionandoTef(false);
    }
  };

  const removerLinha = (id: string) => {
    setLinhasPagamento((prev) => prev.filter((l) => l.id !== id));
  };

  const concluirPedido = async () => {
    if (carrinho.length === 0 || !tipoConsumo) return;
    if (linhasPagamento.length === 0) {
      toast.error('Inclua ao menos um pagamento.');
      return;
    }
    if (valorRestante > 0.009) {
      toast.error(`Falta cobrir ${formatBrl(valorRestante)}.`);
      return;
    }

    const snapshotCarrinho = [...carrinho];
    const pagamentosPayload: LinhaPagamentoTotem[] = linhasPagamento.map(
      ({ id: _id, ...rest }) => rest
    );
    const tefIds = linhasPagamento
      .map((l) => l.transacaoTefId)
      .filter((x): x is string => typeof x === 'string' && x.trim().length > 0);

    setEtapa('processando');

    try {
      const resultado = await finalizarPedidoTotem({
        carrinho: snapshotCarrinho,
        tipoConsumo,
        pagamentos: pagamentosPayload,
      });

      if (tefIds.length > 0) {
        try {
          await tefPosVendaSucessoCnc(tefIds, {
            vendaId: resultado.venda?.id ?? '',
          });
        } catch (tefErr) {
          console.error(tefErr);
          toast.error(
            'Pedido gravado, mas falhou a confirmação TEF. Verifique a maquininha e o ERP.',
            { toastId: 'totem-tef-pos' }
          );
        }
      }

      const senha = extrairSenhaPedidoTotem(resultado.venda);
      setSenhaPedido(senha);
      setTotalPagoExibicao(valorTotal);
      limparCarrinho();
      setLinhasPagamento([]);
      setEtapa('sucesso');
    } catch (err) {
      if (tefIds.length > 0) {
        await tefFalhaSalvarVendaCnc(tefIds).catch(() => undefined);
      }
      toast.error(mensagemErroTotemApi(err), {
        toastId: 'totem-checkout-erro',
      });
      setEtapa('checkout');
    }
  };

  const novoPedido = () => {
    resetSessaoTotem();
    navigate('/totem-food', { replace: true });
  };

  if (etapa === 'processando') {
    return (
      <div className="flex h-full min-h-0 flex-col items-center justify-center px-6 py-12">
        <div className="mb-8 flex h-28 w-28 items-center justify-center rounded-3xl border border-white/10 bg-white/[0.06] shadow-[0_24px_60px_rgba(0,0,0,0.4)] backdrop-blur-xl">
          <Loader2 className="h-14 w-14 animate-spin text-emerald-400" />
        </div>
        <h1 className="text-center text-2xl font-semibold text-white md:text-3xl">
          Processando pagamento e gerando pedido…
        </h1>
        <p className="mt-3 max-w-md text-center text-white/55">
          Enviando pedido ao ERP e confirmando pagamentos (incl. TEF, se houver).
        </p>
        <p className="mt-6 text-sm text-white/40">Aguarde — não feche esta tela.</p>
      </div>
    );
  }

  if (etapa === 'sucesso') {
    return (
      <div className="flex h-full min-h-0 flex-col items-center justify-center px-6 py-12">
        <div className="mb-8 flex h-28 w-28 items-center justify-center rounded-3xl border border-emerald-500/30 bg-emerald-500/15 shadow-[0_0_40px_rgba(16,185,129,0.25)]">
          <CheckCircle2 className="h-16 w-16 text-emerald-400" strokeWidth={1.5} />
        </div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-300/90">
          Pedido confirmado
        </p>
        <h1 className="mt-3 text-center text-4xl font-bold tabular-nums text-white md:text-5xl">
          Senha {senhaPedido}
        </h1>
        <p className="mt-2 text-center text-lg text-white/60">
          Retire seu comprovante e aguarde no painel.
        </p>
        <p className="mt-6 text-sm text-white/45">
          Total pago:{' '}
          <span className="font-semibold text-white">{formatBrl(totalPagoExibicao)}</span>
        </p>
        <button
          type="button"
          onClick={novoPedido}
          className="mt-10 min-h-[3.25rem] w-full max-w-sm rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 px-8 text-lg font-semibold text-white shadow-[0_16px_40px_rgba(109,40,217,0.35)] transition active:scale-[0.99]"
        >
          Novo pedido
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <PagamentoValorParcialModal
        aberto={modalValorAberto}
        titulo={formaModal != null ? `Valor — ${rotuloForma(formaModal)}` : 'Valor do pagamento'}
        subtitulo={
          formaModal === 'PIX'
            ? 'Confirme o valor a registrar em PIX.'
            : 'Depois de confirmar, use o PinPad no valor informado.'
        }
        valorRestante={valorRestante}
        valorCampo={campoValorModal}
        onValorCampoChange={setCampoValorModal}
        erroTexto={erroModal}
        onConfirmar={() => {
          void confirmarValorModal();
        }}
        onFechar={fecharModalValor}
        ocupado={false}
      />

      {adicionandoTef && (
        <div className="fixed inset-0 z-[260] flex flex-col items-center justify-center bg-[#060816]/92 backdrop-blur-md px-6">
          <Loader2 className="h-14 w-14 animate-spin text-violet-400 mb-4" />
          <p className="text-center text-lg font-semibold text-white">Autorizando no PinPad…</p>
        </div>
      )}

      <header className="shrink-0 border-b border-white/10 bg-[#08101f]/85 px-4 py-3 backdrop-blur-xl md:px-6">
        <div className="mx-auto flex max-w-5xl items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/totem-food/cardapio')}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] text-white/85 transition hover:bg-white/10 active:scale-95"
            aria-label="Voltar ao cardápio"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <div className="flex min-w-0 items-center gap-2 text-violet-200/90">
            <Sparkles className="h-4 w-4 shrink-0" />
            <span className="truncate text-sm font-semibold uppercase tracking-[0.15em]">
              Pagamento
            </span>
          </div>
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-6 md:px-8">
        <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-2 lg:gap-12">
          <section className="rounded-2xl border border-white/10 bg-white/[0.05] p-5 backdrop-blur-md md:p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-white/45">
              Resumo do pedido
            </h2>
            <ul className="mt-4 space-y-3">
              {carrinho.map((item) => (
                <li
                  key={item.id}
                  className="flex justify-between gap-3 border-b border-white/5 pb-3 text-sm last:border-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-white">
                      {item.quantidade}× {item.produto.nome}
                    </p>
                    {item.observacao.trim() !== '' && (
                      <p className="mt-0.5 text-xs text-white/45">{item.observacao}</p>
                    )}
                  </div>
                  <p className="shrink-0 tabular-nums text-white/80">{formatBrl(item.subtotal)}</p>
                </li>
              ))}
            </ul>
            <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4">
              <span className="text-sm font-medium text-white/50">Total</span>
              <span className="text-2xl font-bold tabular-nums text-white">{formatBrl(valorTotal)}</span>
            </div>
          </section>

          <section className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.05] p-5 backdrop-blur-md md:p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-white/45">
              Forma de pagamento
            </h2>

            <div className="mt-3 flex justify-between text-xs font-semibold uppercase tracking-wide text-white/40">
              <span>Restante</span>
              <span className="tabular-nums text-amber-300">{formatBrl(valorRestante)}</span>
            </div>

            {linhasPagamento.length > 0 && (
              <ul className="mt-3 max-h-32 space-y-2 overflow-y-auto rounded-xl border border-white/10 bg-black/20 p-2">
                {linhasPagamento.map((l) => (
                  <li
                    key={l.id}
                    className="flex items-center justify-between gap-2 text-sm text-white/90"
                  >
                    <span>
                      {rotuloForma(l.formaPagamento)}
                      {l.transacaoTefId ? ' · TEF' : ''}
                    </span>
                    <span className="flex items-center gap-2 tabular-nums text-emerald-300">
                      {formatBrl(l.valor)}
                      <button
                        type="button"
                        onClick={() => removerLinha(l.id)}
                        className="rounded-lg border border-white/10 p-1 text-white/40 hover:text-red-400"
                        aria-label="Remover"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            )}

            <p className="mt-2 text-[11px] text-white/40">
              Toque na forma desejada e informe o valor (permite pagamento misto).
            </p>

            <div className="mt-4 flex flex-1 flex-col gap-3">
              <button
                type="button"
                onClick={() => abrirModalValor('CARTAO_CREDITO')}
                className="flex min-h-[4rem] w-full items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.06] px-5 text-left transition hover:border-violet-400/35 hover:bg-white/[0.09] active:scale-[0.99]"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500/20 text-violet-200">
                  <CreditCard className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-lg font-semibold text-white">CREDITO TEF</p>
                  <p className="text-sm text-white/45">PinPad / maquininha integrada</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => abrirModalValor('CARTAO_DEBITO')}
                className="flex min-h-[4rem] w-full items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.06] px-5 text-left transition hover:border-violet-400/35 hover:bg-white/[0.09] active:scale-[0.99]"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-500/20 text-sky-200">
                  <Landmark className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-lg font-semibold text-white">DEBITO TEF</p>
                  <p className="text-sm text-white/45">PinPad / maquininha integrada</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => abrirModalValor('PIX')}
                className="flex min-h-[4rem] w-full items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.06] px-5 text-left transition hover:border-violet-400/35 hover:bg-white/[0.09] active:scale-[0.99]"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-200">
                  <QrCode className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-lg font-semibold text-white">PIX</p>
                  <p className="text-sm text-white/45">QR Code ou copia e cola</p>
                </div>
              </button>
            </div>

            <button
              type="button"
              disabled={linhasPagamento.length === 0 || valorRestante > 0.009}
              onClick={() => void concluirPedido()}
              className="mt-4 min-h-[3rem] w-full rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 px-6 text-base font-bold text-white shadow-[0_12px_32px_rgba(16,185,129,0.25)] transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Concluir pedido
            </button>

            <button
              type="button"
              onClick={cancelarPedido}
              className="mt-4 w-full rounded-2xl border border-white/10 bg-transparent py-3 text-sm font-medium text-white/50 transition hover:border-white/20 hover:bg-white/[0.04] hover:text-white/70"
            >
              Cancelar pedido
            </button>
          </section>
        </div>
      </main>
    </div>
  );
}
