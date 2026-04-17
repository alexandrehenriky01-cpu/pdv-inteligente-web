import { useEffect, useMemo, useState } from 'react';
import { Minus, Plus, X } from 'lucide-react';
import type { TotemMockProduto } from '../types';

function formatBrl(n: number): string {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const OBS_RAPIDAS = ['Sem cebola', 'Sem molho', 'Ponto mal passado', 'Bem passado', 'Sem gelo'];

interface ProductModalProps {
  produto: TotemMockProduto | null;
  aberto: boolean;
  onFechar: () => void;
  /** `sheet` = bottom sheet mobile-first (Delivery); `fullscreen` = totem padrão. */
  presentation?: 'fullscreen' | 'sheet';
  /** Persistido no Zustand (`adicionarAoCarrinho`) a partir da TotemMenuPage. */
  onAdicionarAoPedido?: (payload: {
    produto: TotemMockProduto;
    quantidade: number;
    adicionais: Record<string, number>;
    observacao: string;
    total: number;
  }) => void;
}

export function ProductModal({
  produto,
  aberto,
  onFechar,
  presentation = 'fullscreen',
  onAdicionarAoPedido,
}: ProductModalProps) {
  const [quantidade, setQuantidade] = useState(1);
  const [qtdAdicional, setQtdAdicional] = useState<Record<string, number>>({});
  const [observacao, setObservacao] = useState('');

  useEffect(() => {
    if (aberto && produto) {
      console.log('DADOS DO PRODUTO NO MODAL:', produto);
      setQuantidade(1);
      setQtdAdicional({});
      setObservacao('');
    }
  }, [aberto, produto?.id]);

  const extrasTotal = useMemo(() => {
    if (!produto) return 0;
    return produto.adicionais.reduce((acc, ad) => {
      const q = qtdAdicional[ad.id] ?? 0;
      return acc + ad.preco * q;
    }, 0);
  }, [produto, qtdAdicional]);

  const totalLinha = useMemo(() => {
    if (!produto) return 0;
    return (produto.precoBase + extrasTotal) * quantidade;
  }, [produto, extrasTotal, quantidade]);

  if (!aberto || !produto) return null;

  const isSheet = presentation === 'sheet';

  const alterarAdicional = (id: string, delta: number) => {
    setQtdAdicional((prev) => {
      const atual = prev[id] ?? 0;
      const next = Math.max(0, atual + delta);
      if (next === 0) {
        const { [id]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [id]: next };
    });
  };

  const toggleObsRapida = (texto: string) => {
    setObservacao((prev) => {
      if (prev.includes(texto)) {
        return prev
          .split(',')
          .map((s) => s.trim())
          .filter((s) => s && s !== texto)
          .join(', ');
      }
      return prev ? `${prev}, ${texto}` : texto;
    });
  };

  const adicionar = () => {
    onAdicionarAoPedido?.({
      produto,
      quantidade,
      adicionais: qtdAdicional,
      observacao: observacao.trim(),
      total: totalLinha,
    });
    onFechar();
  };

  const shellClass = isSheet
    ? 'fixed inset-0 z-[100] flex items-end justify-center sm:items-end'
    : 'fixed inset-0 z-[100] relative flex h-full min-h-0 flex-col bg-[#060816]';

  const panelClass = isSheet
    ? 'relative z-10 flex max-h-[92vh] w-full max-w-md flex-col rounded-t-3xl border border-white/10 border-b-0 bg-[#060816] shadow-[0_-20px_60px_rgba(0,0,0,0.45)]'
    : 'relative z-10 flex min-h-0 flex-1 flex-col';

  return (
    <div className={shellClass} role="dialog" aria-modal="true" aria-labelledby="totem-product-title">
      {isSheet ? (
        <button
          type="button"
          className="absolute inset-0 z-0 bg-black/55 backdrop-blur-[2px]"
          aria-label="Fechar"
          onClick={onFechar}
        />
      ) : (
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(139,92,246,0.12),transparent_50%)]" />
      )}

      <div className={panelClass}>
      <header className="relative z-10 flex shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-[#060816]/80 px-4 py-3 backdrop-blur-xl">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium uppercase tracking-wider text-violet-300/80">
            Personalizar
          </p>
          <h2 id="totem-product-title" className="truncate text-xl font-semibold text-white">
            {produto.nome}
          </h2>
        </div>
        <button
          type="button"
          onClick={onFechar}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] text-white/80 transition hover:bg-white/10 active:scale-95"
          aria-label="Fechar"
        >
          <X className="h-6 w-6" />
        </button>
      </header>

      <div className="relative z-10 min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div
          className={
            isSheet
              ? 'relative mx-auto max-h-36 w-full overflow-hidden'
              : 'relative mx-auto max-h-[42vh] w-full max-w-3xl overflow-hidden sm:max-h-[46vh]'
          }
        >
          <img
            src={produto.imagemUrl}
            alt={produto.nome}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#060816] via-[#060816]/40 to-transparent" />
        </div>

        <div className={`mx-auto max-w-3xl space-y-8 px-4 pt-6 ${isSheet ? 'pb-32' : 'pb-36'}`}>
          <div>
            <p className="text-2xl font-semibold text-violet-200">{formatBrl(produto.precoBase)}</p>
          </div>

          {produto.descricao && (
            <section className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
              <h3 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-violet-400">
                Ingredientes
              </h3>
              <p className="text-xs leading-relaxed italic text-slate-300">
                {produto.descricao}
              </p>
            </section>
          )}

          <section>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-white/45">
              Adicionais
            </h3>
            <ul className="space-y-2">
              {produto.adicionais.map((ad) => {
                const q = qtdAdicional[ad.id] ?? 0;
                return (
                  <li
                    key={ad.id}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 backdrop-blur-md"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-white">{ad.nome}</p>
                      <p className="text-sm text-violet-200/90">+ {formatBrl(ad.preco)}</p>
                    </div>
                    <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-[#0a1020]/80 p-1">
                      <button
                        type="button"
                        onClick={() => alterarAdicional(ad.id, -1)}
                        className="flex h-11 w-11 items-center justify-center rounded-lg text-white/80 transition hover:bg-white/10 disabled:opacity-30"
                        disabled={q <= 0}
                        aria-label={`Menos ${ad.nome}`}
                      >
                        <Minus className="h-5 w-5" />
                      </button>
                      <span className="min-w-[2rem] text-center text-lg font-semibold tabular-nums">
                        {q}
                      </span>
                      <button
                        type="button"
                        onClick={() => alterarAdicional(ad.id, 1)}
                        className="flex h-11 w-11 items-center justify-center rounded-lg text-white/80 transition hover:bg-white/10"
                        aria-label={`Mais ${ad.nome}`}
                      >
                        <Plus className="h-5 w-5" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          <section>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-white/45">
              Observações
            </h3>
            <div className="mb-3 flex flex-wrap gap-2">
              {OBS_RAPIDAS.map((t) => {
                const ativo = observacao.split(',').some((s) => s.trim() === t);
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggleObsRapida(t)}
                    className={`rounded-full border px-4 py-2 text-sm font-medium transition active:scale-[0.98] ${
                      ativo
                        ? 'border-violet-400/50 bg-violet-500/25 text-violet-100'
                        : 'border-white/10 bg-white/[0.06] text-white/75 hover:border-white/20'
                    }`}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
            <textarea
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Alguma observação extra? (opcional)"
              rows={3}
              className="w-full resize-none rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-base text-white placeholder:text-white/35 backdrop-blur-md focus:border-violet-500/50 focus:outline-none focus:ring-2 focus:ring-violet-500/30"
            />
          </section>

          <section className="flex items-center justify-center gap-4 rounded-2xl border border-white/10 bg-white/[0.05] py-4 backdrop-blur-md">
            <span className="text-sm font-medium text-white/50">Quantidade</span>
            <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-[#0a1020]/90 p-1">
              <button
                type="button"
                onClick={() => setQuantidade((q) => Math.max(1, q - 1))}
                className="flex h-12 w-12 items-center justify-center rounded-lg hover:bg-white/10"
                aria-label="Menos unidades"
              >
                <Minus className="h-5 w-5" />
              </button>
              <span className="min-w-[2.5rem] text-center text-2xl font-semibold tabular-nums">
                {quantidade}
              </span>
              <button
                type="button"
                onClick={() => setQuantidade((q) => q + 1)}
                className="flex h-12 w-12 items-center justify-center rounded-lg hover:bg-white/10"
                aria-label="Mais unidades"
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>
          </section>
        </div>
      </div>

      <footer className="relative z-20 shrink-0 rounded-b-none border-t border-white/10 bg-[#060816]/95 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-white/45">Total</p>
            <p className="text-3xl font-bold tabular-nums text-white">{formatBrl(totalLinha)}</p>
            <p className="text-xs text-white/40">
              Base + adicionais × {quantidade}
            </p>
          </div>
          <button
            type="button"
            onClick={adicionar}
            className="flex min-h-[3.5rem] w-full items-center justify-center rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 px-8 text-lg font-semibold text-white shadow-[0_16px_40px_rgba(109,40,217,0.4)] transition active:scale-[0.99] sm:w-auto sm:min-w-[280px]"
          >
            Adicionar ao pedido
          </button>
        </div>
      </footer>
      </div>
    </div>
  );
}
