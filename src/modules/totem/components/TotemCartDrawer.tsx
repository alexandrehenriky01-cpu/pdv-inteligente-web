import { X, Trash2, Minus, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  useTotemStore,
  selectTotalItens,
  selectValorTotalCarrinho,
} from '../store/totemStore';
import type { CartItem } from '../types';

function formatBrl(n: number): string {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function textoAdicionais(item: CartItem): string {
  const partes: string[] = [];
  for (const ad of item.produto.adicionais) {
    const q = item.adicionais[ad.id] ?? 0;
    if (q > 0) partes.push(q > 1 ? `${q}× ${ad.nome}` : ad.nome);
  }
  return partes.length ? partes.join(' · ') : 'Sem adicionais';
}

interface TotemCartDrawerProps {
  aberto: boolean;
  onFechar: () => void;
}

export function TotemCartDrawer({ aberto, onFechar }: TotemCartDrawerProps) {
  const navigate = useNavigate();
  const carrinho = useTotemStore((s) => s.carrinho);
  const removerDoCarrinho = useTotemStore((s) => s.removerDoCarrinho);
  const alterarQuantidade = useTotemStore((s) => s.alterarQuantidade);
  const totalItens = useTotemStore(selectTotalItens);
  const valorTotal = useTotemStore(selectValorTotalCarrinho);

  const irPagamento = () => {
    if (carrinho.length === 0) return;
    onFechar();
    navigate('/totem-food/pagamento');
  };

  return (
    <>
      <button
        type="button"
        aria-hidden={!aberto}
        className={`fixed inset-0 z-[80] bg-black/55 transition-opacity duration-300 ${
          aberto ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onFechar}
      />

      <aside
        className={`fixed right-0 top-0 z-[90] flex h-full w-[min(100vw,26rem)] flex-col border-l border-white/10 bg-[#08101f]/95 shadow-[-20px_0_60px_rgba(0,0,0,0.45)] backdrop-blur-2xl transition-transform duration-300 ease-out ${
          aberto ? 'translate-x-0' : 'translate-x-full'
        }`}
        aria-hidden={!aberto}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-4 py-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Sua sacola</h2>
            <p className="text-sm text-white/50">
              {totalItens === 0
                ? 'Nenhum item ainda'
                : `${totalItens} ${totalItens === 1 ? 'item' : 'itens'}`}
            </p>
          </div>
          <button
            type="button"
            onClick={onFechar}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] text-white/80 transition hover:bg-white/10 active:scale-95"
            aria-label="Fechar sacola"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3">
          {carrinho.length === 0 ? (
            <p className="px-2 py-12 text-center text-sm text-white/45">
              Toque nos produtos do cardápio para adicionar ao pedido.
            </p>
          ) : (
            <ul className="space-y-3">
              {carrinho.map((item) => (
                <li
                  key={item.id}
                  className="rounded-2xl border border-white/10 bg-white/[0.05] p-4 backdrop-blur-md"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-white">{item.produto.nome}</p>
                      <p className="mt-1 text-xs leading-relaxed text-white/50">
                        {textoAdicionais(item)}
                      </p>
                      {item.observacao.trim() !== '' && (
                        <p className="mt-2 text-xs italic text-violet-200/85">
                          Obs.: {item.observacao}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => removerDoCarrinho(item.id)}
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-red-500/25 bg-red-500/10 text-red-300/90 transition hover:bg-red-500/20 active:scale-95"
                      aria-label={`Remover ${item.produto.nome}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-[#0a1020]/90 p-1">
                      <button
                        type="button"
                        onClick={() => alterarQuantidade(item.id, -1)}
                        className="flex h-10 w-10 items-center justify-center rounded-lg text-white/85 hover:bg-white/10"
                        aria-label="Menos"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="min-w-[1.75rem] text-center text-base font-semibold tabular-nums">
                        {item.quantidade}
                      </span>
                      <button
                        type="button"
                        onClick={() => alterarQuantidade(item.id, 1)}
                        className="flex h-10 w-10 items-center justify-center rounded-lg text-white/85 hover:bg-white/10"
                        aria-label="Mais"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                    <p className="text-base font-semibold tabular-nums text-emerald-300/95">
                      {formatBrl(item.subtotal)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="shrink-0 border-t border-white/10 bg-[#060816]/90 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 backdrop-blur-xl">
          <div className="mb-3 flex items-baseline justify-between gap-2">
            <span className="text-sm font-medium uppercase tracking-wider text-white/45">
              Total do pedido
            </span>
            <span className="text-2xl font-bold tabular-nums text-white">{formatBrl(valorTotal)}</span>
          </div>
          <button
            type="button"
            disabled={carrinho.length === 0}
            onClick={irPagamento}
            className="flex min-h-[3.5rem] w-full items-center justify-center rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 px-6 text-lg font-semibold text-white shadow-[0_16px_40px_rgba(16,185,129,0.35)] transition enabled:active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
          >
            Ir para pagamento
          </button>
        </div>
      </aside>
    </>
  );
}
