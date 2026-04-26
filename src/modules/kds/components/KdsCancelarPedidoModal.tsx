import { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import type { KdsPedido } from '../types';

const MOTIVOS = [
  { value: 'CLIENTE_DESISTIU', label: 'Cliente desistiu' },
  { value: 'PRODUTO_INDISPONIVEL', label: 'Produto indisponível' },
  { value: 'ERRO_NO_PEDIDO', label: 'Erro no pedido' },
  { value: 'FALHA_OPERACIONAL', label: 'Falha operacional' },
  { value: 'OUTRO', label: 'Outro' },
] as const;

export type MotivoCancelamentoCodigo = (typeof MOTIVOS)[number]['value'];

function montarMotivoParaApi(codigo: MotivoCancelamentoCodigo, outroDetalhe: string): string {
  if (codigo === 'OUTRO') {
    return `Outro: ${outroDetalhe.trim()}`;
  }
  const found = MOTIVOS.find((m) => m.value === codigo);
  return found?.label ?? codigo;
}

export interface KdsCancelarPedidoModalProps {
  pedido: KdsPedido;
  open: boolean;
  onClose: () => void;
  onConfirm: (payload: { motivo: string; observacao: string | null }) => Promise<void>;
}

export function KdsCancelarPedidoModal({
  pedido,
  open,
  onClose,
  onConfirm,
}: KdsCancelarPedidoModalProps) {
  const [motivoCodigo, setMotivoCodigo] = useState<MotivoCancelamentoCodigo>('CLIENTE_DESISTIU');
  const [outroTexto, setOutroTexto] = useState('');
  const [observacao, setObservacao] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erroLocal, setErroLocal] = useState<string | null>(null);

  const titulo = useMemo(
    () => `Cancelar pedido #${pedido.numeroPedidoExibicao}?`,
    [pedido.numeroPedidoExibicao]
  );

  if (!open) return null;

  const validar = (): string | null => {
    if (motivoCodigo === 'OUTRO') {
      const t = outroTexto.trim();
      if (t.length < 3) return 'Descreva o motivo (mínimo 3 caracteres).';
    }
    return null;
  };

  const handleConfirmar = async () => {
    const v = validar();
    if (v) {
      setErroLocal(v);
      return;
    }
    setErroLocal(null);
    setEnviando(true);
    try {
      const motivo = montarMotivoParaApi(motivoCodigo, outroTexto);
      const obs = observacao.trim() !== '' ? observacao.trim() : null;
      await onConfirm({ motivo, observacao: obs });
      setOutroTexto('');
      setObservacao('');
      setMotivoCodigo('CLIENTE_DESISTIU');
      onClose();
    } catch (e: unknown) {
      const msg = e && typeof e === 'object' && 'response' in e
        ? String((e as { response?: { data?: { error?: string } } }).response?.data?.error ?? '')
        : '';
      setErroLocal(msg || 'Não foi possível cancelar. Tente novamente.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="kds-cancelar-titulo"
    >
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-white/15 bg-[#0c1222] p-5 shadow-2xl shadow-black/50">
        <div className="flex items-start justify-between gap-3">
          <h2 id="kds-cancelar-titulo" className="text-lg font-bold text-white">
            {titulo}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={enviando}
            className="rounded-lg p-1.5 text-white/50 transition hover:bg-white/10 hover:text-white disabled:opacity-40"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mt-2 text-sm text-white/55">
          O cancelamento afeta estoque e financeiro conforme as regras do sistema. Esta ação não pode ser desfeita pelo KDS.
        </p>

        <div className="mt-4 space-y-2">
          <label htmlFor="kds-motivo-cancel" className="text-xs font-semibold uppercase tracking-wide text-white/45">
            Motivo
          </label>
          <select
            id="kds-motivo-cancel"
            value={motivoCodigo}
            onChange={(e) => setMotivoCodigo(e.target.value as MotivoCancelamentoCodigo)}
            disabled={enviando}
            className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2.5 text-sm text-white outline-none focus:border-red-500/50"
          >
            {MOTIVOS.map((m) => (
              <option key={m.value} value={m.value} className="bg-[#0c1222]">
                {m.label}
              </option>
            ))}
          </select>
        </div>

        {motivoCodigo === 'OUTRO' && (
          <div className="mt-3 space-y-2">
            <label htmlFor="kds-outro-motivo" className="text-xs font-semibold text-white/45">
              Descreva o motivo
            </label>
            <textarea
              id="kds-outro-motivo"
              value={outroTexto}
              onChange={(e) => setOutroTexto(e.target.value)}
              disabled={enviando}
              rows={3}
              className="w-full resize-none rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-red-500/50"
              placeholder="Obrigatório"
            />
          </div>
        )}

        <div className="mt-3 space-y-2">
          <label htmlFor="kds-obs-cancel" className="text-xs font-semibold text-white/45">
            Observação (opcional)
          </label>
          <textarea
            id="kds-obs-cancel"
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            disabled={enviando}
            rows={2}
            className="w-full resize-none rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-violet-500/40"
          />
        </div>

        {erroLocal && (
          <p className="mt-3 rounded-lg border border-red-500/35 bg-red-500/10 px-3 py-2 text-sm text-red-100">
            {erroLocal}
          </p>
        )}

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={enviando}
            className="rounded-xl border border-white/20 px-4 py-3 text-sm font-semibold text-white/85 transition hover:bg-white/10 disabled:opacity-50"
          >
            Voltar
          </button>
          <button
            type="button"
            onClick={() => void handleConfirmar()}
            disabled={enviando}
            className="rounded-xl bg-gradient-to-r from-red-600 to-red-700 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-red-900/30 transition enabled:active:scale-[0.99] disabled:opacity-50"
          >
            {enviando ? 'Cancelando…' : 'Confirmar cancelamento'}
          </button>
        </div>
      </div>
    </div>
  );
}
