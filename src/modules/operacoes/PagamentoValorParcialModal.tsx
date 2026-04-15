import type { FormEvent, ReactNode } from 'react';
import { X } from 'lucide-react';

export interface PagamentoValorParcialModalProps {
  aberto: boolean;
  titulo: string;
  subtitulo?: string;
  valorRestante: number;
  valorCampo: string;
  onValorCampoChange: (valor: string) => void;
  erroTexto: string | null;
  onConfirmar: () => void;
  onFechar: () => void;
  rotuloConfirmar?: string;
  ocupado?: boolean;
  /** Ex.: seletor de parcelas (CREDIÁRIO) — renderizado abaixo do campo de valor. */
  children?: ReactNode;
}

export function PagamentoValorParcialModal(props: PagamentoValorParcialModalProps) {
  const {
    aberto,
    titulo,
    subtitulo,
    valorRestante,
    valorCampo,
    onValorCampoChange,
    erroTexto,
    onConfirmar,
    onFechar,
    rotuloConfirmar = 'Confirmar',
    ocupado = false,
    children,
  } = props;

  if (!aberto) return null;

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onConfirmar();
  };

  return (
    <div
      className="fixed inset-0 z-[280] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pdv-modal-valor-parcial-titulo"
    >
      <div className="w-full max-w-md rounded-2xl border border-white/15 bg-[#08101f] shadow-[0_25px_80px_rgba(0,0,0,0.55)] overflow-hidden">
        <div className="flex items-start justify-between gap-3 border-b border-white/10 px-5 py-4">
          <div className="min-w-0">
            <h2 id="pdv-modal-valor-parcial-titulo" className="text-lg font-black text-white truncate">
              {titulo}
            </h2>
            {subtitulo != null && subtitulo !== '' && (
              <p className="mt-1 text-xs text-slate-400 leading-snug">{subtitulo}</p>
            )}
            <p className="mt-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Restante:{' '}
              <span className="text-emerald-300 font-mono">R$ {valorRestante.toFixed(2)}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onFechar}
            disabled={ocupado}
            className="shrink-0 rounded-xl border border-white/10 bg-white/5 p-2 text-slate-300 hover:bg-white/10 disabled:opacity-40"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-5 space-y-4">
          <div>
            <label htmlFor="pdv-valor-parcial-input" className="mb-1.5 block text-xs font-bold text-slate-400">
              Valor desta forma de pagamento (R$)
            </label>
            <input
              id="pdv-valor-parcial-input"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={valorCampo}
              onChange={(e) => onValorCampoChange(e.target.value)}
              disabled={ocupado}
              className="w-full rounded-xl border border-white/10 bg-[#0b1324] px-4 py-3 text-lg font-mono font-bold text-white placeholder:text-slate-600 focus:border-violet-500/45 focus:ring-2 focus:ring-violet-500/20 outline-none disabled:opacity-50"
              placeholder="0,00"
            />
          </div>

          {children}

          {erroTexto != null && erroTexto !== '' && (
            <p className="text-sm font-medium text-red-400 bg-red-500/10 border border-red-500/25 rounded-lg px-3 py-2">
              {erroTexto}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onFechar}
              disabled={ocupado}
              className="flex-1 rounded-xl border border-white/10 bg-white/5 py-3 text-sm font-bold text-slate-300 hover:bg-white/10 disabled:opacity-40"
            >
              Voltar
            </button>
            <button
              type="submit"
              disabled={ocupado}
              className="flex-[2] rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 py-3 text-sm font-black text-white shadow-[0_0_18px_rgba(139,92,246,0.35)] hover:opacity-95 disabled:opacity-40"
            >
              {ocupado ? 'Aguarde…' : rotuloConfirmar}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
