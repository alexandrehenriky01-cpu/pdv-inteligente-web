import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { Minus, Plus, X } from 'lucide-react';
import type { CartItem, TotemMockProduto, TotemSaborOpcao } from '../types';

function formatBrl(n: number): string {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function precoSaborComTamanhoNome(sabor: TotemSaborOpcao, tamanhoNomeRef: string | undefined): number {
  const ref = tamanhoNomeRef?.trim().toLowerCase();
  const ativos = sabor.tamanhos.filter((t) => t.ativo !== false);
  if (ativos.length > 0 && ref) {
    const hit = ativos.find((t) => t.nome.trim().toLowerCase() === ref);
    if (hit) return hit.preco;
  }
  if (ativos.length > 0) return ativos[0].preco;
  return sabor.precoVenda;
}

function resolverSaborInicialId(produto: TotemMockProduto): string {
  const opcoes = produto.saboresOpcoes ?? [];
  const idDireto = produto.id.trim();
  if (opcoes.some((s) => s.id === idDireto)) return idDireto;
  const idCardapio = (produto.itemCardapioId ?? '').trim();
  if (idCardapio && opcoes.some((s) => s.id === idCardapio)) return idCardapio;
  const byNome = opcoes.find((s) => s.nome.trim().toLowerCase() === produto.nome.trim().toLowerCase())?.id;
  if (byNome) return byNome;
  return idDireto || idCardapio;
}

const OBS_RAPIDAS_COMIDA = [
  'Sem cebola',
  'Bem passado',
  'Ao ponto',
  'Mal passado',
  'Massa bem assada',
];

interface ProductModalProps {
  produto: TotemMockProduto | null;
  aberto: boolean;
  onFechar: () => void;
  /** `sheet` = bottom sheet mobile-first (Delivery); `fullscreen` = totem padrão. */
  presentation?: 'fullscreen' | 'sheet';
  /** Delivery: edição de linha existente — preenche o modal e envia `substituirLinhaId` no callback. */
  linhaCarrinhoParaEdicao?: CartItem | null;
  /** Delivery: fluxo sequencial para pizza multi-sabor no cardápio (sem chips obrigatórios no modal). */
  modoPizzaSequencial?: boolean;
  /** Persistido no Zustand (`adicionarAoCarrinho`) a partir da TotemMenuPage. */
  onAdicionarAoPedido?: (payload: {
    produto: TotemMockProduto;
    quantidade: number;
    adicionais: Record<string, number>;
    observacao: string;
    total: number;
    itemCardapioTamanhoId?: string | null;
    partidoAoMeio?: boolean;
    saboresItemCardapioIds?: string[];
    substituirLinhaId?: string;
    iniciarDivisaoSabores?: boolean;
  }) => void;
}

export function ProductModal({
  produto,
  aberto,
  onFechar,
  presentation = 'fullscreen',
  linhaCarrinhoParaEdicao = null,
  modoPizzaSequencial = false,
  onAdicionarAoPedido,
}: ProductModalProps) {
  const [quantidade, setQuantidade] = useState(1);
  const [qtdAdicional, setQtdAdicional] = useState<Record<string, number>>({});
  const [observacao, setObservacao] = useState('');
  const [tamanhoId, setTamanhoId] = useState<string | null>(null);
  const [partidoAoMeio, setPartidoAoMeio] = useState(false);
  const [saboresSelecionados, setSaboresSelecionados] = useState<string[]>([]);

  useEffect(() => {
    if (!aberto || !produto) return;
    const edicao =
      linhaCarrinhoParaEdicao && linhaCarrinhoParaEdicao.produto.id === produto.id
        ? linhaCarrinhoParaEdicao
        : null;

    if (edicao) {
      setQuantidade(Math.max(1, edicao.quantidade));
      setQtdAdicional({ ...edicao.adicionais });
      setObservacao(edicao.observacao ?? '');
      setPartidoAoMeio(edicao.partidoAoMeio === true);
      setSaboresSelecionados(
        edicao.saboresItemCardapioIds && edicao.saboresItemCardapioIds.length > 0
          ? [...edicao.saboresItemCardapioIds]
          : []
      );
      const ativos = produto.tamanhos.filter((t) => t.ativo !== false);
      if (ativos.length === 0) {
        setTamanhoId(null);
      } else if (edicao.itemCardapioTamanhoId) {
        setTamanhoId(edicao.itemCardapioTamanhoId);
      } else {
        setTamanhoId(ativos.length === 1 ? ativos[0].id : null);
      }
      return;
    }

    setQuantidade(1);
    setQtdAdicional({});
    setObservacao('');
    setPartidoAoMeio(false);
    const saborBaseId = resolverSaborInicialId(produto);
    if (modoPizzaSequencial && produto.tipoItem === 'PIZZA' && produto.permiteMultiplosSabores === true) {
      setSaboresSelecionados(saborBaseId ? [saborBaseId] : []);
    } else {
      setSaboresSelecionados([]);
    }
    const ativos = produto.tamanhos.filter((t) => t.ativo !== false);
    setTamanhoId(ativos.length === 1 ? ativos[0].id : null);
  }, [aberto, produto?.id, linhaCarrinhoParaEdicao?.id, modoPizzaSequencial]);

  const tamanhosAtivos = useMemo(
    () => (produto?.tamanhos ?? []).filter((t) => t.ativo !== false),
    [produto]
  );

  const tamanhoNomeRef = useMemo(() => {
    if (!tamanhoId) return undefined;
    return tamanhosAtivos.find((x) => x.id === tamanhoId)?.nome;
  }, [tamanhoId, tamanhosAtivos]);

  const precoBaseLinha = useMemo(() => {
    if (!produto) return 0;
    let base =
      tamanhosAtivos.length === 0
        ? produto.precoBase
        : (tamanhosAtivos.find((x) => x.id === tamanhoId)?.preco ?? produto.precoBase);

    const pizzaMulti =
      produto.tipoItem === 'PIZZA' &&
      produto.permiteMultiplosSabores === true &&
      (produto.saboresOpcoes?.length ?? 0) > 0 &&
      saboresSelecionados.length > 0;

    if (pizzaMulti && produto.saboresOpcoes) {
      let maxP = 0;
      for (const sid of saboresSelecionados) {
        const s = produto.saboresOpcoes.find((o) => o.id === sid);
        if (!s) continue;
        maxP = Math.max(maxP, precoSaborComTamanhoNome(s, tamanhoNomeRef));
      }
      if (maxP > 0) base = maxP;
    }
    return base;
  }, [produto, tamanhosAtivos, tamanhoId, saboresSelecionados, tamanhoNomeRef]);

  const extrasTotal = useMemo(() => {
    if (!produto) return 0;
    return produto.adicionais.reduce((acc, ad) => {
      const q = qtdAdicional[ad.id] ?? 0;
      return acc + ad.preco * q;
    }, 0);
  }, [produto, qtdAdicional]);

  const totalLinha = useMemo(() => {
    if (!produto) return 0;
    return (precoBaseLinha + extrasTotal) * quantidade;
  }, [produto, precoBaseLinha, extrasTotal, quantidade]);

  if (!aberto || !produto) return null;

  const isSheet = presentation === 'sheet';
  const isBebida = produto.tipoItem === 'BEBIDA';
  const isComida = produto.tipoItem === 'COMIDA';
  const isPizza = produto.tipoItem === 'PIZZA';
  const isPizzaMulti =
    isPizza && produto.permiteMultiplosSabores === true && (produto.saboresOpcoes?.length ?? 0) > 0;
  const maxSabores = Math.min(20, Math.max(1, produto.maxSabores ?? 1));
  const precisaTamanho = tamanhosAtivos.length > 0;
  const saboresOk =
    !isPizzaMulti ||
    (saboresSelecionados.length >= 1 && saboresSelecionados.length <= maxSabores);
  const podeAdicionar = (!precisaTamanho || tamanhoId != null) && saboresOk;
  const modoEdicao = Boolean(linhaCarrinhoParaEdicao && linhaCarrinhoParaEdicao.produto.id === produto.id);
  const mostrarObservacoes = !isBebida;

  const alterarAdicional = (id: string, delta: number) => {
    const ad = produto.adicionais.find((a) => a.id === id);
    const maxQ =
      ad?.maxQuantidade != null && ad.maxQuantidade > 0 ? Math.min(99, ad.maxQuantidade) : 99;
    setQtdAdicional((prev) => {
      const atual = prev[id] ?? 0;
      const next = Math.min(maxQ, Math.max(0, atual + delta));
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

  const toggleSabor = (id: string) => {
    setSaboresSelecionados((prev) => {
      if (prev.includes(id)) {
        return prev.filter((x) => x !== id);
      }
      if (prev.length >= maxSabores) {
        toast.info(`No máximo ${maxSabores} sabores.`);
        return prev;
      }
      return [...prev, id];
    });
  };

  const iniciarDivisaoSabores = () => {
    if (!podeAdicionar || !isPizzaMulti || modoEdicao) return;
    onAdicionarAoPedido?.({
      produto,
      quantidade,
      adicionais: qtdAdicional,
      observacao: mostrarObservacoes ? observacao.trim() : '',
      total: totalLinha,
      itemCardapioTamanhoId: precisaTamanho ? tamanhoId : null,
      partidoAoMeio: false,
      ...(saboresSelecionados.length > 0 ? { saboresItemCardapioIds: [...saboresSelecionados] } : {}),
      iniciarDivisaoSabores: true,
    });
    onFechar();
  };

  const adicionar = () => {
    if (!podeAdicionar) return;
    onAdicionarAoPedido?.({
      produto,
      quantidade,
      adicionais: qtdAdicional,
      observacao: mostrarObservacoes ? observacao.trim() : '',
      total: totalLinha,
      itemCardapioTamanhoId: precisaTamanho ? tamanhoId : null,
      partidoAoMeio: isComida ? partidoAoMeio : false,
      ...(isPizzaMulti && saboresSelecionados.length > 0
        ? { saboresItemCardapioIds: [...saboresSelecionados] }
        : {}),
      ...(modoEdicao && linhaCarrinhoParaEdicao ? { substituirLinhaId: linhaCarrinhoParaEdicao.id } : {}),
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
            <img src={produto.imagemUrl} alt={produto.nome} className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#060816] via-[#060816]/40 to-transparent" />
          </div>

          <div className={`mx-auto max-w-3xl space-y-8 px-4 pt-6 ${isSheet ? 'pb-32' : 'pb-36'}`}>
            <div>
              <p className="text-2xl font-semibold text-violet-200">{formatBrl(precoBaseLinha)}</p>
              {precisaTamanho && !tamanhoId && (
                <p className="mt-1 text-xs text-amber-300/90">Selecione um tamanho para continuar.</p>
              )}
              {isPizzaMulti && !modoPizzaSequencial && (!precisaTamanho || tamanhoId) && !saboresOk && (
                <p className="mt-1 text-xs text-amber-300/90">Selecione ao menos um sabor.</p>
              )}
            </div>

            {precisaTamanho && (
              <section>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-white/45">
                  Tamanho
                </h3>
                <ul className="space-y-2">
                  {tamanhosAtivos.map((t) => (
                    <li key={t.id}>
                      <button
                        type="button"
                        onClick={() => setTamanhoId(t.id)}
                        className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${
                          tamanhoId === t.id
                            ? 'border-violet-400/60 bg-violet-500/20 text-white'
                            : 'border-white/10 bg-white/[0.05] text-white/80 hover:border-white/20'
                        }`}
                      >
                        <span className="font-medium">{t.nome}</span>
                        <span className="text-violet-200">{formatBrl(t.preco)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {isPizzaMulti && !modoPizzaSequencial && (!precisaTamanho || tamanhoId) && (
              <section>
                <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-white/45">
                  Sabores
                </h3>
                <p className="mb-3 text-xs text-white/50">
                  De 1 a {maxSabores} sabor{maxSabores > 1 ? 'es' : ''} — não é obrigatório usar todos. Preço pelo
                  sabor mais caro entre os selecionados.
                </p>
                <ul className="flex flex-wrap gap-2">
                  {(produto.saboresOpcoes ?? []).map((s) => {
                    const ativo = saboresSelecionados.includes(s.id);
                    const precoS = precoSaborComTamanhoNome(s, tamanhoNomeRef);
                    return (
                      <li key={s.id}>
                        <button
                          type="button"
                          onClick={() => toggleSabor(s.id)}
                          className={`rounded-full border px-4 py-2 text-sm font-medium transition active:scale-[0.98] ${
                            ativo
                              ? 'border-violet-400/60 bg-violet-500/25 text-violet-100'
                              : 'border-white/10 bg-white/[0.06] text-white/75 hover:border-white/20'
                          }`}
                        >
                          {s.nome}
                          <span className="ml-1.5 text-violet-200/90 tabular-nums">{formatBrl(precoS)}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}

            {produto.descricao && (
              <section className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                <h3 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-violet-400">
                  Ingredientes
                </h3>
                <p className="text-xs leading-relaxed italic text-slate-300">{produto.descricao}</p>
              </section>
            )}

            <section>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-white/45">
                Adicionais
              </h3>
              <ul className="space-y-2">
                {produto.adicionais.map((ad) => {
                  const q = qtdAdicional[ad.id] ?? 0;
                  const maxQ =
                    ad.maxQuantidade != null && ad.maxQuantidade > 0
                      ? Math.min(99, ad.maxQuantidade)
                      : 99;
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
                          className="flex h-11 w-11 items-center justify-center rounded-lg text-white/80 transition hover:bg-white/10 disabled:opacity-30"
                          disabled={q >= maxQ}
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

            {mostrarObservacoes && (
              <>
                <section>
                  <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-white/45">
                    Observações
                  </h3>
                  <div className="mb-3 flex flex-wrap gap-2">
                    {OBS_RAPIDAS_COMIDA.map((t) => {
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

                {isComida && (
                  <section className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3">
                    <label className="flex cursor-pointer items-center gap-3 text-sm text-white/90">
                      <input
                        type="checkbox"
                        checked={partidoAoMeio}
                        onChange={(e) => setPartidoAoMeio(e.target.checked)}
                        className="h-5 w-5 rounded border-white/20 bg-[#0a1020]"
                      />
                      Partido ao meio
                    </label>
                  </section>
                )}
              </>
            )}

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
              <p className="text-xs text-white/40">Base + adicionais × {quantidade}</p>
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-[280px]">
              {isPizzaMulti && modoPizzaSequencial && !modoEdicao ? (
                <button
                  type="button"
                  onClick={iniciarDivisaoSabores}
                  disabled={!podeAdicionar}
                  className="flex min-h-[3.1rem] w-full items-center justify-center rounded-2xl border border-violet-400/40 bg-violet-500/20 px-6 text-sm font-semibold text-violet-100 transition enabled:hover:bg-violet-500/30 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Dividir sabor / adicionar outro sabor
                </button>
              ) : null}
              <button
                type="button"
                onClick={adicionar}
                disabled={!podeAdicionar}
                className="flex min-h-[3.5rem] w-full items-center justify-center rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 px-8 text-lg font-semibold text-white shadow-[0_16px_40px_rgba(109,40,217,0.4)] transition enabled:active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {modoEdicao ? 'Atualizar item' : 'Adicionar ao pedido'}
              </button>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
