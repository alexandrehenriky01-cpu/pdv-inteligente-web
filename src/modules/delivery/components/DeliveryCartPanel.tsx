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
import { resolveCardapioImageUrl } from '../../../utils/resolveCardapioImageUrl';

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
  const [thumbsFalhas, setThumbsFalhas] = useState<Set<string>>(new Set());
  const marcarThumbFalha = (id: string) =>
    setThumbsFalhas((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });

  if (carrinho.length === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 pb-[max(0.5rem,env(safe-area-inset-bottom))] pointer-events-none">
      <div className="pointer-events-auto mx-auto w-full max-w-md px-3">
        <div className="relative overflow-hidden rounded-t-card border border-bg-border border-b-0 bg-bg-surface/95 shadow-[0_-20px_60px_rgba(0,0,0,0.55)] backdrop-blur-2xl">
          <button
            type="button"
            onClick={() => setAberto((v) => !v)}
            className="relative flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition hover:bg-bg-raised/50"
            aria-expanded={aberto}
          >
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-pill bg-cta shadow-cta">
                <ShoppingBag className="h-5 w-5 text-white" strokeWidth={2.4} />
                <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full border-2 border-bg-surface bg-price px-1 text-[10px] font-black tabular-nums text-bg-base">
                  {totalQtd}
                </span>
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-text-primary">
                  Sacola · {totalQtd} {totalQtd === 1 ? 'item' : 'itens'}
                </p>
                <p className="text-xs text-text-secondary">
                  Total <span className="font-bold tabular-nums text-price">{formatBrl(total)}</span>
                </p>
              </div>
            </div>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-bg-raised text-text-secondary">
              {aberto ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </div>
          </button>

          {aberto && (
            <div className="max-h-[min(52vh,420px)] space-y-2.5 overflow-y-auto border-t border-bg-border px-3 py-3">
              {carrinho.map((item) => {
                const rotulo = rotuloLinhaCarrinho(item);
                const adds = textoAdicionaisLinha(item);
                const pu = precoUnitarioLinha(item);
                return (
                  <div
                    key={item.id}
                    className="rounded-item border border-bg-border bg-bg-raised p-3 text-sm text-text-primary"
                  >
                    <div className="flex items-start gap-3">
                      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-item bg-bg-base ring-1 ring-bg-border">
                        {item.produto.imagemUrl && !thumbsFalhas.has(item.id) ? (
                          <img
                            src={resolveCardapioImageUrl(item.produto.imagemUrl)}
                            alt=""
                            loading="lazy"
                            className="h-full w-full object-cover"
                            onError={() => marcarThumbFalha(item.id)}
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <span className="text-xl font-black text-text-muted">{item.produto.nome.charAt(0).toUpperCase()}</span>
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold uppercase leading-snug text-text-primary">{rotulo.titulo}</p>
                        {rotulo.subtitulo ? (
                          <p className="mt-1 inline-flex rounded-pill bg-accent-purple/15 px-2 py-0.5 text-[11px] font-medium text-accent-purple">
                            {rotulo.subtitulo}
                          </p>
                        ) : null}
                        {adds.length > 0 ? (
                          <p className="mt-1.5 text-[11px] leading-snug text-text-secondary">
                            {adds.map((t) => `• ${t}`).join('  ')}
                          </p>
                        ) : null}
                        {item.observacao.trim() ? (
                          <p className="mt-1 text-[11px] italic text-text-muted">Obs.: {item.observacao}</p>
                        ) : null}
                        <p className="mt-1.5 whitespace-nowrap text-[11px] text-text-muted">
                          {item.quantidade}× @ {formatBrl(pu)} ={' '}
                          <span className="font-bold tabular-nums text-price">{formatBrl(item.subtotal)}</span>
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col gap-1.5">
                        <button
                          type="button"
                          onClick={() => onEditarItem(item)}
                          className="flex h-8 w-8 items-center justify-center rounded-full bg-bg-base text-text-secondary transition hover:bg-bg-border hover:text-text-primary active:scale-95"
                          aria-label="Editar item"
                          title="Editar"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removerDoCarrinho(item.id)}
                          className="flex h-8 w-8 items-center justify-center rounded-full bg-bg-base text-danger transition hover:bg-danger/15 active:scale-95"
                          aria-label="Remover item"
                          title="Remover"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-bg-border pt-2.5">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">Quantidade</span>
                      <div className="inline-flex items-center gap-1 rounded-pill bg-bg-base p-1">
                        <button
                          type="button"
                          onClick={() => alterarQuantidade(item.id, -1)}
                          className="flex h-8 w-8 items-center justify-center rounded-full text-text-secondary transition hover:bg-bg-border hover:text-text-primary active:scale-90"
                          aria-label="Diminuir"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="min-w-[1.75rem] text-center text-sm font-black tabular-nums text-text-primary">
                          {item.quantidade}
                        </span>
                        <button
                          type="button"
                          onClick={() => alterarQuantidade(item.id, 1)}
                          className="flex h-8 w-8 items-center justify-center rounded-full text-text-secondary transition hover:bg-bg-border hover:text-text-primary active:scale-90"
                          aria-label="Aumentar"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
              <Link
                to={`/menu/${encodeURIComponent(lojaSlug)}`}
                onClick={() => setAberto(false)}
                className="flex items-center justify-between gap-3 rounded-item border border-dashed border-bg-border bg-bg-raised/40 px-4 py-3 text-sm font-semibold text-text-secondary transition hover:border-accent-purple/40 hover:text-text-primary"
              >
                <span className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Adicionar mais itens
                </span>
                <ChevronUp className="h-4 w-4 rotate-90" />
              </Link>
              <div className="mt-2 flex items-center justify-between border-t border-bg-border pt-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">Subtotal</span>
                <span className="text-base font-black tabular-nums text-price">{formatBrl(total)}</span>
              </div>
            </div>
          )}

          <div className="border-t border-bg-border bg-gradient-to-b from-transparent to-black/20 p-3">
            <Link
              to={`/menu/${encodeURIComponent(lojaSlug)}/checkout`}
              className="flex min-h-[3.2rem] w-full items-center justify-center gap-2.5 rounded-pill bg-cta hover:bg-cta-hover shadow-cta px-4 text-base font-bold uppercase tracking-wide text-white transition-all duration-200 active:scale-[0.98]"
            >
              <ShoppingBag className="h-5 w-5" />
              <span>Finalizar pedido</span>
              <span className="ml-1 rounded-pill bg-white/15 px-2.5 py-0.5 text-xs font-black tabular-nums">
                {formatBrl(total)}
              </span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
