import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronDown,
  ChevronUp,
  Minus,
  Pencil,
  Plus,
  ShoppingBag,
  Trash2,
} from 'lucide-react';
import type { CartItem } from '../../totem/types';
import { selectValorSubtotalCarrinhoDelivery, useDeliveryCartStore } from '../store/deliveryCartStore';
import { rotuloLinhaCarrinho } from '../cartItemDisplay';

function formatBrl(n: number): string {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function precoUnitarioLinha(item: CartItem): number {
  if (item.quantidade <= 0) return 0;
  return Math.round((item.subtotal / item.quantidade) * 100) / 100;
}

function textoAdicionaisLinha(item: CartItem): string[] {
  const linhas: string[] = [];
  for (const ad of item.produto.adicionais) {
    const q = item.adicionais[ad.id] ?? 0;
    if (q > 0) {
      linhas.push(q > 1 ? `${ad.nome} ×${q}` : ad.nome);
    }
  }
  return linhas;
}

export interface DeliveryCartPanelProps {
  lojaSlug: string;
  onEditarItem: (item: CartItem) => void;
}

export function DeliveryCartPanel({ lojaSlug, onEditarItem }: DeliveryCartPanelProps) {
  const [aberto, setAberto] = useState(false);
  const carrinho = useDeliveryCartStore((s) => s.carrinho);
  const alterarQuantidade = useDeliveryCartStore((s) => s.alterarQuantidade);
  const removerDoCarrinho = useDeliveryCartStore((s) => s.removerDoCarrinho);
  const total = useDeliveryCartStore(selectValorSubtotalCarrinhoDelivery);
  const totalQtd = useMemo(() => carrinho.reduce((a, i) => a + i.quantidade, 0), [carrinho]);

  if (carrinho.length === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 pb-[max(0.5rem,env(safe-area-inset-bottom))] pointer-events-none">
      <div className="pointer-events-auto mx-auto w-full max-w-md px-3">
        <div className="overflow-hidden rounded-t-2xl border border-white/10 border-b-0 bg-[#0b1324]/95 shadow-[0_-12px_40px_rgba(0,0,0,0.45)] backdrop-blur-md">
          <button
            type="button"
            onClick={() => setAberto((v) => !v)}
            className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
            aria-expanded={aberto}
          >
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <ShoppingBag className="h-5 w-5 shrink-0 text-violet-300" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">
                  Sacola · {totalQtd} {totalQtd === 1 ? 'item' : 'itens'}
                </p>
                <p className="text-xs text-white/50">Total {formatBrl(total)}</p>
              </div>
            </div>
            {aberto ? (
              <ChevronDown className="h-5 w-5 shrink-0 text-white/50" />
            ) : (
              <ChevronUp className="h-5 w-5 shrink-0 text-white/50" />
            )}
          </button>

          {aberto && (
            <div className="max-h-[min(52vh,420px)] space-y-2 overflow-y-auto border-t border-white/10 px-3 py-2">
              {carrinho.map((item) => {
                const rotulo = rotuloLinhaCarrinho(item);
                const adds = textoAdicionaisLinha(item);
                const pu = precoUnitarioLinha(item);
                return (
                  <div
                    key={item.id}
                    className="rounded-xl border border-white/10 bg-white/[0.04] p-3 text-sm text-white/90"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-white">{rotulo.titulo}</p>
                        {rotulo.subtitulo ? (
                          <p className="mt-0.5 text-xs text-violet-200/90">{rotulo.subtitulo}</p>
                        ) : null}
                        {adds.length > 0 ? (
                          <p className="mt-0.5 text-xs text-emerald-200/80">
                            {adds.map((t) => `+ ${t}`).join(' · ')}
                          </p>
                        ) : null}
                        {item.observacao.trim() ? (
                          <p className="mt-1 text-xs italic text-white/45">Obs.: {item.observacao}</p>
                        ) : null}
                        <p className="mt-1 text-xs text-white/50">
                          {item.quantidade}× @ {formatBrl(pu)} ={' '}
                          <span className="font-mono font-semibold text-emerald-300">{formatBrl(item.subtotal)}</span>
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col gap-1">
                        <button
                          type="button"
                          onClick={() => onEditarItem(item)}
                          className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/15 text-white/80 hover:bg-white/10"
                          aria-label="Editar item"
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removerDoCarrinho(item.id)}
                          className="flex h-9 w-9 items-center justify-center rounded-lg border border-red-500/30 text-red-300 hover:bg-red-500/10"
                          aria-label="Remover item"
                          title="Remover"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2 border-t border-white/5 pt-2">
                      <span className="text-xs text-white/40">Quantidade</span>
                      <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-[#060816]/80 p-0.5">
                        <button
                          type="button"
                          onClick={() => alterarQuantidade(item.id, -1)}
                          className="flex h-8 w-8 items-center justify-center rounded-md text-white/80 hover:bg-white/10"
                          aria-label="Diminuir"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="min-w-[1.75rem] text-center text-sm font-bold tabular-nums">
                          {item.quantidade}
                        </span>
                        <button
                          type="button"
                          onClick={() => alterarQuantidade(item.id, 1)}
                          className="flex h-8 w-8 items-center justify-center rounded-md text-white/80 hover:bg-white/10"
                          aria-label="Aumentar"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
              <p className="border-t border-white/10 pt-2 text-right text-sm font-bold text-white">
                Subtotal <span className="text-emerald-300">{formatBrl(total)}</span>
              </p>
            </div>
          )}

          <div className="border-t border-white/10 p-3">
            <Link
              to={`/menu/${encodeURIComponent(lojaSlug)}/checkout`}
              className="flex min-h-[3rem] w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 text-base font-semibold text-white shadow-[0_8px_28px_rgba(109,40,217,0.4)] transition active:scale-[0.99]"
            >
              <ShoppingBag className="h-5 w-5" />
              Finalizar pedido
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
