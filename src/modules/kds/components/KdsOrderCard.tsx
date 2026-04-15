import { ChefHat, ChevronRight, Package, Truck, UtensilsCrossed } from 'lucide-react';
import type { ColunaKds, KdsPedido, OrigemVendaKds } from '../types';

function estiloOrigem(origem: OrigemVendaKds): { label: string; className: string; Icon: typeof Package } {
  const o = String(origem).toUpperCase();
  if (o === 'TOTEM') {
    return {
      label: 'Totem',
      className: 'border-violet-400/45 bg-violet-500/20 text-violet-100',
      Icon: ChefHat,
    };
  }
  if (o === 'DELIVERY') {
    return {
      label: 'Delivery',
      className: 'border-orange-400/45 bg-orange-500/20 text-orange-100',
      Icon: Truck,
    };
  }
  if (o === 'MESA') {
    return {
      label: 'Mesa',
      className: 'border-emerald-400/45 bg-emerald-500/20 text-emerald-100',
      Icon: UtensilsCrossed,
    };
  }
  return {
    label: o || 'PDV',
    className: 'border-white/15 bg-white/[0.08] text-white/80',
    Icon: Package,
  };
}

interface KdsOrderCardProps {
  pedido: KdsPedido;
  onAvancar: (id: string) => void;
  onConcluir: (id: string) => void;
  salvando?: boolean;
}

export function KdsOrderCard({ pedido, onAvancar, onConcluir, salvando }: KdsOrderCardProps) {
  const { label, className, Icon } = estiloOrigem(pedido.origem);
  const coluna = pedido.coluna;

  const rotuloAcao =
    coluna === 'TODO' ? 'Iniciar preparo' : coluna === 'PREPARANDO' ? 'Marcar pronto' : null;

  return (
    <article className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.06] shadow-[0_12px_40px_rgba(0,0,0,0.35)] backdrop-blur-md">
      <header className="flex items-start justify-between gap-2 border-b border-white/10 px-4 py-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/40">Senha</p>
          <p className="text-3xl font-bold tabular-nums leading-none text-white">{pedido.senha}</p>
        </div>
        <span
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold ${className}`}
        >
          <Icon className="h-3.5 w-3.5 opacity-90" />
          {label}
        </span>
      </header>

      <div className="min-h-0 flex-1 space-y-3 px-4 py-3">
        {pedido.observacoesGerais && (
          <p className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-sm italic text-amber-100/95">
            Pedido: {pedido.observacoesGerais}
          </p>
        )}

        <ul className="space-y-3">
          {pedido.itens.map((it, idx) => (
            <li key={idx} className="text-sm">
              <p className="text-white">
                <span className="font-bold tabular-nums">{it.quantidade}×</span>{' '}
                <span className="font-medium">{it.nome}</span>
              </p>
              {it.adicionais.length > 0 && (
                <ul className="mt-1.5 space-y-0.5 border-l-2 border-violet-500/35 pl-3">
                  {it.adicionais.map((a, i) => (
                    <li key={i} className="text-[13px] font-medium text-violet-200/90">
                      {a}
                    </li>
                  ))}
                </ul>
              )}
              {it.observacoes && (
                <p className="mt-1.5 text-[13px] italic text-amber-200/90">Obs.: {it.observacoes}</p>
              )}
            </li>
          ))}
        </ul>
      </div>

      <footer className="border-t border-white/10 px-3 py-3">
        {rotuloAcao && (
          <button
            type="button"
            disabled={salvando}
            onClick={() => onAvancar(pedido.id)}
            className="flex min-h-[2.75rem] w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(109,40,217,0.35)] transition enabled:active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {rotuloAcao}
            <ChevronRight className="h-4 w-4" />
          </button>
        )}
        {coluna === 'PRONTO' && (
          <button
            type="button"
            disabled={salvando}
            onClick={() => onConcluir(pedido.id)}
            className="flex min-h-[2.75rem] w-full items-center justify-center gap-2 rounded-xl border border-emerald-400/40 bg-emerald-500/15 px-4 text-sm font-semibold text-emerald-100 transition enabled:hover:bg-emerald-500/25 enabled:active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Retirado / Concluir
          </button>
        )}
      </footer>
    </article>
  );
}
