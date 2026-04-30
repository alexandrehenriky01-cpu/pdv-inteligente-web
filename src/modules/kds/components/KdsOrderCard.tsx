import {
  Building2,
  ChevronRight,
  Clock,
  Truck,
  User,
  UtensilsCrossed,
} from 'lucide-react';
import { colunaKdsPermiteCancelar } from '../kdsPedidoUtils';
import type { ColunaKds, KdsItemLinha, KdsPedido, TipoAtendimentoKds } from '../types';

function formatHoraPedido(ts: number): string {
  return new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function formatDecorrido(mmssFromMs: number): string {
  const s = Math.max(0, Math.floor(mmssFromMs / 1000));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

function tipoAtendimentoUi(t: TipoAtendimentoKds): {
  label: string;
  Icon: typeof Truck;
  chipClass: string;
} {
  switch (t) {
    case 'DELIVERY':
      return {
        label: 'DELIVERY',
        Icon: Truck,
        chipClass: 'border-orange-400/50 bg-orange-500/15 text-orange-100',
      };
    case 'BALCAO':
      return {
        label: 'BALCÃO',
        Icon: Building2,
        chipClass: 'border-violet-400/50 bg-violet-500/15 text-violet-100',
      };
    case 'MESA':
      return {
        label: 'MESA',
        Icon: UtensilsCrossed,
        chipClass: 'border-emerald-400/50 bg-emerald-500/15 text-emerald-100',
      };
  }
}

function shellClasses(coluna: ColunaKds, urgente: boolean): string {
  if (urgente) {
    return [
      'border-2 border-red-500/85',
      'bg-gradient-to-br from-red-950/90 via-red-900/50 to-[#1a0508]/95',
      'shadow-[0_0_28px_rgba(239,68,68,0.38)]',
    ].join(' ');
  }
  if (coluna === 'PRONTO') {
    return [
      'border-2 border-emerald-500/55',
      'bg-gradient-to-br from-emerald-950/80 via-emerald-900/35 to-[#051a12]/90',
      'shadow-[0_12px_40px_rgba(16,185,129,0.18)]',
    ].join(' ');
  }
  if (coluna === 'PREPARANDO') {
    return [
      'border-2 border-amber-400/55',
      'bg-gradient-to-br from-amber-950/85 via-yellow-900/35 to-[#1a1405]/90',
      'shadow-[0_12px_36px_rgba(245,158,11,0.2)]',
    ].join(' ');
  }
  return [
    'border-2 border-violet-500/45',
    'bg-gradient-to-br from-violet-950/85 via-indigo-950/55 to-[#12081f]/95',
    'shadow-[0_12px_40px_rgba(139,92,246,0.22)]',
  ].join(' ');
}

function statusEtiqueta(coluna: ColunaKds, urgente: boolean): { texto: string; className: string } {
  if (urgente) {
    return {
      texto: 'ATRASADO',
      className: 'border-red-400/60 bg-red-600/25 text-red-100',
    };
  }
  if (coluna === 'PRONTO') {
    return {
      texto: 'PRONTO',
      className: 'border-emerald-400/55 bg-emerald-600/20 text-emerald-100',
    };
  }
  if (coluna === 'PREPARANDO') {
    return {
      texto: 'EM PREPARO',
      className: 'border-amber-400/55 bg-amber-600/20 text-amber-100',
    };
  }
  return {
    texto: 'NOVO',
    className: 'border-violet-400/55 bg-violet-600/25 text-violet-100',
  };
}

function saboresLinha(it: KdsItemLinha): string | null {
  if (!it.saboresNomes?.length) return null;
  return it.saboresNomes.map((s) => String(s).trim().toUpperCase()).filter(Boolean).join(' / ');
}

interface KdsOrderCardProps {
  pedido: KdsPedido;
  nowMs: number;
  onAvancar: (id: string) => void;
  onConcluir: (id: string) => void;
  onCancelar?: (id: string) => void;
  salvando?: boolean;
  urgente?: boolean;
}

export function KdsOrderCard({
  pedido,
  nowMs,
  onAvancar,
  onConcluir,
  onCancelar,
  salvando,
  urgente = false,
}: KdsOrderCardProps) {
  const coluna = pedido.coluna;
  const decorridoMs = nowMs - pedido.recebidoEm;
  const tipoUi = tipoAtendimentoUi(pedido.tipoAtendimento);
  /** `urgente` altera só o visual (ATRASADO); não é status persistido. */
  const status = statusEtiqueta(coluna, urgente);
  const { Icon: TipoIcon } = tipoUi;

  const rotuloAcao =
    coluna === 'TODO' ? 'Iniciar preparo' : coluna === 'PREPARANDO' ? 'Finalizar pedido' : null;

  const senhaDiferente =
    String(pedido.senha).trim() !== String(pedido.numeroPedidoExibicao).trim();

  return (
    <article
      className={`flex w-full flex-col rounded-2xl backdrop-blur-md transition-all duration-300 ${shellClasses(coluna, urgente)}`}
    >
      <header className="space-y-3 border-b border-white/10 px-4 py-3.5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">
              Pedido
            </p>
            <p className="mt-0.5 text-2xl font-bold tabular-nums leading-tight tracking-tight text-white md:text-3xl">
              #{pedido.numeroPedidoExibicao}
            </p>
            {senhaDiferente && (
              <p className="mt-1 text-xs font-medium text-white/50">
                Senha <span className="tabular-nums text-white/80">{pedido.senha}</span>
              </p>
            )}
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${status.className}`}
            >
              {urgente && <Clock className="h-3.5 w-3.5" />}
              {status.texto}
            </span>
            <span
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold ${tipoUi.chipClass}`}
            >
              <TipoIcon className="h-3.5 w-3.5 opacity-95" />
              {tipoUi.label}
            </span>
          </div>
        </div>

        {pedido.nomeCliente ? (
          <div className="flex items-center gap-2 rounded-xl border border-violet-400/35 bg-violet-500/10 px-3 py-2 text-sm font-semibold text-violet-100">
            <User className="h-4 w-4 shrink-0 text-violet-300" aria-hidden />
            <span className="truncate">{pedido.nomeCliente}</span>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-3 text-sm">
          <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2">
            <Clock className="h-4 w-4 shrink-0 text-white/55" />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-white/40">
                Horário
              </p>
              <p className="font-semibold tabular-nums text-white">{formatHoraPedido(pedido.recebidoEm)}</p>
            </div>
          </div>
          <div
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 font-mono text-base font-bold tabular-nums ${
              urgente
                ? 'border-red-400/50 bg-red-500/15 text-red-100'
                : 'border-white/10 bg-black/20 text-white'
            }`}
          >
            <span className="text-[10px] font-semibold uppercase tracking-wide text-white/40">
              Tempo
            </span>
            {formatDecorrido(decorridoMs)}
          </div>
        </div>
      </header>

      <div className="space-y-3 px-4 py-3.5">
        {pedido.observacoesGerais && (
          <p className="rounded-xl border-2 border-amber-400/40 bg-amber-500/15 px-3 py-2.5 text-sm font-medium leading-snug text-amber-50">
            <span className="font-bold text-amber-200">Obs. pedido: </span>
            {pedido.observacoesGerais}
          </p>
        )}

        <ul className="space-y-4">
          {pedido.itens.map((it, idx) => {
            const saboresTxt = saboresLinha(it);
            return (
              <li key={idx} className="rounded-xl border border-white/10 bg-black/15 px-3 py-2.5">
                <p className="text-[15px] text-white">
                  <span className="font-bold tabular-nums text-violet-200">{it.quantidade}×</span>{' '}
                  <span className="font-semibold">{it.nome}</span>
                </p>
                {it.tamanho && (
                  <p className="mt-1.5 text-xs font-bold uppercase tracking-wider text-white/70">
                    {it.tamanho}
                  </p>
                )}
                {saboresTxt && (
                  <p className="mt-2 border-l-2 border-emerald-400/60 pl-2.5 text-[13px] font-bold uppercase leading-snug tracking-wide text-emerald-100/95">
                    {it.pizzaMultiSabores && (
                      <span className="mr-1.5 text-[11px] font-extrabold tracking-wide text-emerald-200/95">
                        Sabores:{' '}
                      </span>
                    )}
                    {saboresTxt}
                  </p>
                )}
                {it.adicionais.length > 0 && (
                  <ul className="mt-2 space-y-1 border-l-2 border-violet-400/45 pl-2.5">
                    {it.adicionais.map((a, i) => (
                      <li key={i} className="text-[13px] font-medium text-violet-100/90">
                        {a}
                      </li>
                    ))}
                  </ul>
                )}
                {!it.exibirSemObservacoes && it.observacoes && (
                  <p className="mt-2.5 rounded-lg border border-amber-500/35 bg-amber-500/10 px-2.5 py-2 text-[13px] font-medium leading-snug text-amber-100">
                    {it.observacoes}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      <footer className="space-y-2.5 border-t border-white/10 px-3 py-3.5">
        {rotuloAcao && (
          <div className="flex min-h-[3.25rem] gap-2">
            <button
              type="button"
              disabled={salvando}
              onClick={() => onAvancar(pedido.id)}
              className={`flex min-h-[3.25rem] min-w-0 flex-1 items-center justify-center gap-2 rounded-xl px-3 text-base font-bold text-white shadow-lg transition enabled:active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 ${
                urgente
                  ? 'bg-gradient-to-r from-red-600 to-red-700 shadow-red-900/40'
                  : coluna === 'PREPARANDO'
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-stone-900 shadow-amber-900/30'
                    : 'bg-gradient-to-r from-violet-600 via-violet-500 to-indigo-600 shadow-violet-900/35'
              }`}
            >
              {rotuloAcao}
              <ChevronRight className="h-5 w-5 shrink-0" />
            </button>
            {onCancelar && colunaKdsPermiteCancelar(coluna) && (
              <button
                type="button"
                disabled={salvando}
                onClick={() => onCancelar(pedido.id)}
                className="shrink-0 rounded-xl border-2 border-red-500/60 bg-red-600/25 px-4 text-sm font-bold text-red-100 shadow-md transition enabled:active:scale-[0.99] enabled:hover:bg-red-600/40 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancelar
              </button>
            )}
          </div>
        )}
        {coluna === 'PRONTO' && (
          <button
            type="button"
            disabled={salvando}
            onClick={() => onConcluir(pedido.id)}
            className="flex min-h-[3.25rem] w-full items-center justify-center gap-2 rounded-xl border-2 border-emerald-400/55 bg-emerald-500/20 px-4 text-base font-bold text-emerald-50 shadow-lg transition enabled:hover:bg-emerald-500/30 enabled:active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Retirado / Concluir
          </button>
        )}
      </footer>
    </article>
  );
}
