import { ReactNode, useMemo } from 'react';
import { type MesaApi, num } from '../modules/mesas/types';

export interface MesaResumoCardProps {
  mesa: MesaApi;
  showActions?: boolean;
  isReadOnly?: boolean;
  onSubtotalClick?: () => void;
  children?: ReactNode;
}

const TAXA_SERVICO_PADRAO = 0.1;
const COUVERT_ARTISTICO = 0;

function roundBr2(n: number): number {
  return Math.round(n * 100) / 100;
}

function formatBrl(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function MesaResumoCard({
  mesa,
  showActions = true,
  isReadOnly = false,
  onSubtotalClick,
  children,
}: MesaResumoCardProps) {
  const totals = useMemo(() => {
    const itens = Array.isArray(mesa.itens) ? mesa.itens : [];
    const subtotal = itens.reduce((acc, it) => acc + num(it.valorTotal), 0);
    const taxaServico = roundBr2(subtotal * TAXA_SERVICO_PADRAO);
    const couvert = COUVERT_ARTISTICO;
    const total = roundBr2(subtotal + taxaServico + couvert);

    return {
      subtotal,
      taxaServico,
      couvert,
      total,
      quantidadeItens: itens.length,
    };
  }, [mesa.itens]);

  if (!mesa || totals.quantidadeItens === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <p className="text-slate-400">Nenhum item nesta mesa ainda.</p>
        <p className="mt-1 text-xs text-slate-500">Adicione itens para iniciar o pedido.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {mesa.itens.map((item) => (
          <div key={item.id} className="flex items-center gap-3 py-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-sm font-bold text-white">
              {num(item.quantidade)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-white text-sm">
                {item.itemCardapio?.nome ?? item.produto?.nome ?? 'Item'}
              </p>
              {item.observacao && (
                <p className="mt-0.5 truncate text-xs italic text-amber-200/70">
                  Obs: {item.observacao}
                </p>
              )}
            </div>
            <p className="shrink-0 text-sm font-bold text-emerald-200">
              {formatBrl(num(item.valorTotal))}
            </p>
          </div>
        ))}
      </div>

      <div className="border-t border-white/10 pt-3 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-slate-400">Subtotal</span>
          <button
            type="button"
            onClick={onSubtotalClick}
            className={`font-bold text-white ${onSubtotalClick ? 'hover:text-violet-300 cursor-pointer' : ''}`}
            disabled={isReadOnly}
          >
            {formatBrl(totals.subtotal)}
          </button>
        </div>

        {totals.taxaServico > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Taxa Serviço (10%)</span>
            <span className="font-bold text-slate-300">{formatBrl(totals.taxaServico)}</span>
          </div>
        )}

        {totals.couvert > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Couvert Artístico</span>
            <span className="font-bold text-slate-300">{formatBrl(totals.couvert)}</span>
          </div>
        )}

        <div className="flex justify-between border-t border-white/10 pt-2">
          <span className="font-bold text-white">Total</span>
          <span className="font-black text-emerald-300 text-lg">
            {formatBrl(totals.total)}
          </span>
        </div>
      </div>

      {showActions && !isReadOnly && children && (
        <div className="flex gap-2 pt-2">
          {children}
        </div>
      )}
    </div>
  );
}