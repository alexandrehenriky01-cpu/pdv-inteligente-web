import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { AlertCircle, Check, Minus, Plus, X } from 'lucide-react';
import type { CartItem, TotemMockProduto, TotemSaborOpcao } from '../../totem/types';
import { getImagemItemFood } from '../imagemItemFood';

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

export interface FoodItemComposerModalProps {
  produto: TotemMockProduto | null;
  aberto: boolean;
  onFechar: () => void;
  /** `sheet` = bottom sheet mobile-first (Delivery / PDV Food); `fullscreen` = totem padrão. */
  presentation?: 'fullscreen' | 'sheet';
  /**
   * Variante visual:
   *  - `'menu-online'`: aplica tokens Aurya (bg-bg-*, text-price, bg-cta, shadow-glow-pink…).
   *  - `'padrao'` (default): mantém o tema atual usado por totem / garçom / PDV.
   */
  varianteVisual?: 'menu-online' | 'padrao';
  linhaCarrinhoParaEdicao?: CartItem | null;
  /** Pizza multi-sabor: fluxo igual ao Menu Online — sem chips no modal; botão para escolher próximo sabor no catálogo. */
  modoPizzaSequencial?: boolean;
  /**
   * Catálogo completo para resolver a foto de cada sabor (`ItemCardapio` id) como no Menu Online.
   */
  catalogoImagens?: TotemMockProduto[] | null;
  /** Modo sheet: largura do painel (default `max-w-md`). Ex.: PDV desktop `max-w-xl sm:max-w-2xl`. */
  sheetMaxWidthClass?: string;
  /**
   * Pré-preenche quantidade/tamanho/adicionais/obs/sabores sem ativar modo “edição de linha”
   * (ex.: retorno do catálogo na pizza sequencial).
   */
  rascunhoComposicao?: {
    quantidade: number;
    adicionais: Record<string, number>;
    observacao: string;
    itemCardapioTamanhoId?: string | null;
    partidoAoMeio?: boolean;
    saboresItemCardapioIds?: string[];
  } | null;
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

export function FoodItemComposerModal({
  produto,
  aberto,
  onFechar,
  presentation = 'fullscreen',
  varianteVisual = 'padrao',
  linhaCarrinhoParaEdicao = null,
  modoPizzaSequencial = false,
  catalogoImagens = null,
  sheetMaxWidthClass = 'max-w-md',
  rascunhoComposicao = null,
  onAdicionarAoPedido,
}: FoodItemComposerModalProps) {
  const isMenuOnline = varianteVisual === 'menu-online';
  const [quantidade, setQuantidade] = useState(1);
  const [qtdAdicional, setQtdAdicional] = useState<Record<string, number>>({});
  const [observacao, setObservacao] = useState('');
  const [tamanhoId, setTamanhoId] = useState<string | null>(null);
  const [partidoAoMeio, setPartidoAoMeio] = useState(false);
  const [saboresSelecionados, setSaboresSelecionados] = useState<string[]>([]);

  const rascunhoAssinatura = useMemo(() => {
    if (!rascunhoComposicao) return '';
    return [
      rascunhoComposicao.quantidade,
      rascunhoComposicao.itemCardapioTamanhoId ?? '',
      rascunhoComposicao.observacao ?? '',
      (rascunhoComposicao.saboresItemCardapioIds ?? []).join('\u001f'),
      JSON.stringify(rascunhoComposicao.adicionais),
      rascunhoComposicao.partidoAoMeio === true ? '1' : '0',
    ].join('|');
  }, [rascunhoComposicao]);

  useEffect(() => {
    if (!aberto || !produto) return;
    const itemId = (produto.itemCardapioId ?? produto.id).trim();
    const maxS = Math.min(20, Math.max(1, produto.maxSabores ?? 1));
    console.log('[FOOD COMPOSER][SABORES]', {
      itemId,
      tamanhoId,
      permiteMultiplosSabores: produto.permiteMultiplosSabores === true,
      maxSabores: maxS,
      saboresSelecionados,
    });
  }, [aberto, produto?.id, produto?.permiteMultiplosSabores, produto?.maxSabores, tamanhoId, saboresSelecionados]);

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

    if (rascunhoComposicao) {
      setQuantidade(Math.max(1, rascunhoComposicao.quantidade));
      setQtdAdicional({ ...rascunhoComposicao.adicionais });
      setObservacao(rascunhoComposicao.observacao ?? '');
      setPartidoAoMeio(rascunhoComposicao.partidoAoMeio === true);
      const ativosR = produto.tamanhos.filter((t) => t.ativo !== false);
      if (ativosR.length === 0) {
        setTamanhoId(null);
      } else if (rascunhoComposicao.itemCardapioTamanhoId) {
        setTamanhoId(rascunhoComposicao.itemCardapioTamanhoId);
      } else {
        setTamanhoId(ativosR.length === 1 ? ativosR[0].id : null);
      }
      const idsR = rascunhoComposicao.saboresItemCardapioIds;
      if (
        modoPizzaSequencial &&
        produto.tipoItem === 'PIZZA' &&
        produto.permiteMultiplosSabores === true &&
        idsR &&
        idsR.length > 0
      ) {
        setSaboresSelecionados([...idsR]);
      } else {
        const saborBaseIdR = resolverSaborInicialId(produto);
        if (modoPizzaSequencial && produto.tipoItem === 'PIZZA' && produto.permiteMultiplosSabores === true) {
          setSaboresSelecionados(saborBaseIdR ? [saborBaseIdR] : []);
        } else {
          setSaboresSelecionados([]);
        }
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
  }, [aberto, produto?.id, linhaCarrinhoParaEdicao?.id, modoPizzaSequencial, rascunhoAssinatura]);

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

  const imagemTopo = useMemo(() => {
    if (!produto) return '';
    return getImagemItemFood({
      produto,
      catalogo: catalogoImagens,
      saborIdsPrioridade: saboresSelecionados.length > 0 ? saboresSelecionados : null,
    });
  }, [produto, catalogoImagens, saboresSelecionados]);

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
  const tamanhoBloqueadoPizzaMulti =
    isPizzaMulti && modoPizzaSequencial && !modoEdicao && saboresSelecionados.length > 0 ? tamanhoId : null;
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

  const iniciarDivisaoSaboresClick = () => {
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
    const linhaFinal = {
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
    };
    console.log('[FOOD COMPOSER][CONFIRM]', linhaFinal);
    onAdicionarAoPedido?.(linhaFinal);
    onFechar();
  };

  const shellClass = isSheet
    ? 'fixed inset-0 z-[100] flex items-end justify-center sm:items-end'
    : `fixed inset-0 z-[100] relative flex h-full min-h-0 flex-col ${isMenuOnline ? 'bg-bg-base' : 'bg-[#08101f]'}`;

  const panelClass = isSheet
    ? `relative z-10 flex max-h-[92vh] w-full ${sheetMaxWidthClass} flex-col border-b-0 ${
        isMenuOnline
          ? 'rounded-t-card border border-bg-border bg-bg-surface shadow-[0_-30px_80px_rgba(0,0,0,0.55)]'
          : 'rounded-t-3xl border border-white/[0.08] bg-[#08101f] shadow-[0_-30px_80px_rgba(0,0,0,0.55)]'
      }`
    : 'relative z-10 flex min-h-0 flex-1 flex-col';

  return (
    <div className={shellClass} role="dialog" aria-modal="true" aria-labelledby="totem-product-title">
      {isSheet ? (
        <button
          type="button"
          className="absolute inset-0 z-0 bg-black/65 backdrop-blur-[3px]"
          aria-label="Fechar"
          onClick={onFechar}
        />
      ) : (
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(139,92,246,0.18),transparent_55%)]" />
      )}

      <div className={panelClass}>
        {isSheet && (
          <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-center pt-2">
            <span className={`h-1.5 w-12 rounded-full ${isMenuOnline ? 'bg-bg-border' : 'bg-white/20'}`} />
          </div>
        )}
        <header
          className={`relative z-10 flex shrink-0 items-center justify-between gap-3 px-5 py-4 backdrop-blur-2xl ${
            isMenuOnline
              ? 'border-b border-bg-border bg-bg-base/90'
              : 'border-b border-white/[0.07] bg-[#08101f]/85'
          }`}
        >
          {!isMenuOnline && (
            <div className="absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-violet-500/40 to-transparent" />
          )}
          <div className="min-w-0 flex-1">
            <p
              className={`truncate text-[10px] font-bold uppercase tracking-[0.2em] ${
                isMenuOnline ? 'text-text-muted' : 'text-violet-300/85'
              }`}
            >
              {isMenuOnline ? 'Detalhes do item' : 'Personalizar item'}
            </p>
            <h2
              id="totem-product-title"
              className={`mt-0.5 truncate text-xl font-black uppercase ${
                isMenuOnline ? 'text-text-primary' : 'text-white'
              }`}
            >
              {produto.nome}
            </h2>
          </div>
          <button
            type="button"
            onClick={onFechar}
            className={`flex h-12 w-12 shrink-0 items-center justify-center transition active:scale-95 ${
              isMenuOnline
                ? 'rounded-full bg-bg-raised text-text-secondary hover:text-text-primary'
                : 'rounded-2xl border border-white/[0.08] bg-white/[0.04] text-white/80 hover:border-white/20 hover:bg-white/10'
            }`}
            aria-label="Fechar"
          >
            <X className="h-6 w-6" />
          </button>
        </header>

        <div className="relative z-10 min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div
            className={
              isSheet
                ? 'relative mx-auto max-h-44 w-full overflow-hidden sm:max-h-48'
                : 'relative mx-auto max-h-[42vh] w-full max-w-3xl overflow-hidden sm:max-h-[46vh]'
            }
          >
            <img src={imagemTopo} alt={produto.nome} className="h-full w-full object-cover" />
            {isMenuOnline ? (
              <>
                <div className="absolute inset-0 bg-gradient-to-t from-bg-surface via-bg-surface/40 to-transparent" />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-bg-surface to-transparent" />
              </>
            ) : (
              <>
                <div className="absolute inset-0 bg-gradient-to-t from-[#08101f] via-[#08101f]/45 to-transparent" />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#08101f] to-transparent" />
              </>
            )}
          </div>

          <div className={`mx-auto max-w-3xl space-y-7 px-5 pt-5 ${isSheet ? 'pb-32' : 'pb-36'}`}>
            <div
              className={`p-4 ${
                isMenuOnline
                  ? 'rounded-card border border-bg-border bg-bg-raised'
                  : 'rounded-2xl border border-white/[0.06] bg-gradient-to-br from-white/[0.05] to-white/[0.02] backdrop-blur-md'
              }`}
            >
              <p
                className={`text-[10px] font-bold uppercase tracking-[0.18em] ${
                  isMenuOnline ? 'text-text-muted' : 'text-white/45'
                }`}
              >
                A partir de
              </p>
              <p
                className={`mt-0.5 text-3xl font-black tabular-nums ${
                  isMenuOnline
                    ? 'text-price'
                    : 'text-emerald-400 drop-shadow-[0_2px_10px_rgba(16,185,129,0.3)]'
                }`}
              >
                {formatBrl(precoBaseLinha)}
              </p>
              {precisaTamanho && !tamanhoId && (
                <div className="mt-3 flex items-center gap-2 rounded-item border border-amber-400/30 bg-amber-500/10 px-3 py-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-amber-300" />
                  <p className="text-xs font-medium text-amber-200">Selecione um tamanho para continuar</p>
                </div>
              )}
              {isPizzaMulti && !modoPizzaSequencial && (!precisaTamanho || tamanhoId) && !saboresOk && (
                <div className="mt-3 flex items-center gap-2 rounded-item border border-amber-400/30 bg-amber-500/10 px-3 py-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-amber-300" />
                  <p className="text-xs font-medium text-amber-200">Selecione ao menos um sabor</p>
                </div>
              )}
            </div>

            {precisaTamanho && (
              <section>
                <div className="mb-3 flex items-center justify-between">
                  <h3
                    className={`text-[11px] font-black uppercase tracking-[0.2em] ${
                      isMenuOnline ? 'text-text-secondary' : 'text-white/55'
                    }`}
                  >
                    {isMenuOnline ? (
                      <>
                        <span className="text-accent-purple">1.</span> Escolha o tamanho
                      </>
                    ) : (
                      'Tamanho'
                    )}
                  </h3>
                  {!tamanhoId && (
                    <span
                      className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        isMenuOnline
                          ? 'rounded-pill bg-bg-raised text-text-muted'
                          : 'rounded-full border border-amber-400/35 bg-amber-500/10 text-amber-200'
                      }`}
                    >
                      Obrigatório
                    </span>
                  )}
                </div>
                <ul className="space-y-2">
                  {tamanhosAtivos.map((t) => {
                    const selecionado = tamanhoId === t.id;
                    const bloqueado = Boolean(tamanhoBloqueadoPizzaMulti && tamanhoBloqueadoPizzaMulti !== t.id);
                    return (
                      <li key={t.id}>
                        <button
                          type="button"
                          onClick={() => {
                            if (tamanhoBloqueadoPizzaMulti && tamanhoBloqueadoPizzaMulti !== t.id) return;
                            setTamanhoId(t.id);
                          }}
                          disabled={bloqueado}
                          className={`flex w-full items-center justify-between px-4 py-4 text-left transition-all duration-200 active:scale-[0.99] ${
                            isMenuOnline
                              ? selecionado
                                ? 'rounded-item border-2 border-accent-magenta bg-bg-surface text-text-primary shadow-glow-pink'
                                : bloqueado
                                  ? 'rounded-item border border-bg-border bg-bg-raised/40 text-text-muted opacity-55'
                                  : 'rounded-item border border-bg-border bg-bg-surface text-text-primary hover:border-accent-purple/40'
                              : selecionado
                                ? 'rounded-2xl border border-violet-400/60 bg-gradient-to-r from-violet-500/25 to-fuchsia-500/15 text-white shadow-[0_6px_22px_rgba(139,92,246,0.3)]'
                                : bloqueado
                                  ? 'rounded-2xl border border-white/[0.06] bg-white/[0.02] text-white/35 opacity-55'
                                  : 'rounded-2xl border border-white/[0.08] bg-white/[0.04] text-white/85 hover:border-white/20 hover:bg-white/[0.07]'
                          }`}
                        >
                          <span className="flex items-center gap-3 font-bold">
                            {isMenuOnline ? null : (
                              <span
                                className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                                  selecionado ? 'border-violet-400 bg-violet-500' : 'border-white/25 bg-transparent'
                                }`}
                              >
                                {selecionado && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                              </span>
                            )}
                            <span className={isMenuOnline ? 'uppercase' : ''}>{t.nome}</span>
                          </span>
                          <span className="flex items-center gap-3">
                            <span
                              className={`font-bold tabular-nums ${
                                isMenuOnline
                                  ? 'text-price'
                                  : selecionado
                                    ? 'text-emerald-300'
                                    : 'text-violet-200'
                              }`}
                            >
                              {formatBrl(t.preco)}
                            </span>
                            {isMenuOnline && selecionado && (
                              <Check className="h-5 w-5 text-accent-magenta" strokeWidth={3} />
                            )}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
                {tamanhoBloqueadoPizzaMulti && (
                  <p
                    className={`mt-2 text-xs ${
                      isMenuOnline ? 'text-text-muted' : 'text-violet-200/80'
                    }`}
                  >
                    Tamanho travado pela base da pizza: {tamanhosAtivos.find((x) => x.id === tamanhoBloqueadoPizzaMulti)?.nome ?? 'selecionado'}.
                  </p>
                )}
              </section>
            )}

            {isPizzaMulti &&
              modoPizzaSequencial &&
              (!precisaTamanho || tamanhoId) &&
              saboresSelecionados.length > 0 && (
                <section
                  className={`px-4 py-3.5 ${
                    isMenuOnline
                      ? 'rounded-card border border-accent-magenta/40 bg-accent-magenta/5'
                      : 'rounded-2xl border border-violet-400/25 bg-gradient-to-br from-violet-500/15 to-fuchsia-500/10 backdrop-blur-md'
                  }`}
                >
                  <h3
                    className={`mb-2 text-[11px] font-black uppercase tracking-[0.2em] ${
                      isMenuOnline ? 'text-accent-magenta' : 'text-violet-200'
                    }`}
                  >
                    Sabores nesta pizza
                  </h3>
                  <p
                    className={`mb-3 text-xs ${
                      isMenuOnline ? 'text-text-secondary' : 'text-white/60'
                    }`}
                  >
                    Até {maxSabores} sabor{maxSabores > 1 ? 'es' : ''}. Preço pelo sabor mais caro no tamanho
                    escolhido. Toque em outro sabor no cardápio para acrescentar.
                  </p>
                  <ul className="flex flex-wrap gap-2">
                    {saboresSelecionados.map((sid) => {
                      const nome = produto.saboresOpcoes?.find((o) => o.id === sid)?.nome ?? sid;
                      return (
                        <li
                          key={sid}
                          className={`px-3 py-1 text-xs font-semibold ${
                            isMenuOnline
                              ? 'rounded-pill bg-cta text-white'
                              : 'rounded-full border border-violet-400/40 bg-violet-500/20 text-violet-100 shadow-[0_2px_8px_rgba(139,92,246,0.25)]'
                          }`}
                        >
                          {nome}
                        </li>
                      );
                    })}
                  </ul>
                </section>
              )}

            {isPizzaMulti && !modoPizzaSequencial && (!precisaTamanho || tamanhoId) && (
              <section>
                <div className="mb-2 flex items-center justify-between">
                  <h3
                    className={`text-[11px] font-black uppercase tracking-[0.2em] ${
                      isMenuOnline ? 'text-text-secondary' : 'text-white/55'
                    }`}
                  >
                    Sabores
                  </h3>
                  {!saboresOk && (
                    <span
                      className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        isMenuOnline
                          ? 'rounded-pill bg-bg-raised text-text-muted'
                          : 'rounded-full border border-amber-400/35 bg-amber-500/10 text-amber-200'
                      }`}
                    >
                      Obrigatório
                    </span>
                  )}
                </div>
                <p
                  className={`mb-3 text-xs ${
                    isMenuOnline ? 'text-text-secondary' : 'text-white/55'
                  }`}
                >
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
                          className={`px-4 py-2 text-sm font-semibold transition-all duration-200 active:scale-95 ${
                            isMenuOnline
                              ? ativo
                                ? 'rounded-pill bg-cta text-white shadow-cta'
                                : 'rounded-pill bg-bg-raised border border-bg-border text-text-secondary hover:text-text-primary'
                              : ativo
                                ? 'rounded-full border border-violet-400/60 bg-gradient-to-r from-violet-500/30 to-fuchsia-500/20 text-white shadow-[0_4px_14px_rgba(139,92,246,0.3)]'
                                : 'rounded-full border border-white/[0.08] bg-white/[0.04] text-white/75 hover:border-white/20 hover:bg-white/[0.08]'
                          }`}
                        >
                          {s.nome}
                          <span
                            className={`ml-2 tabular-nums ${
                              isMenuOnline
                                ? ativo
                                  ? 'text-white/90'
                                  : 'text-price'
                                : ativo
                                  ? 'text-emerald-300'
                                  : 'text-violet-200/85'
                            }`}
                          >
                            {formatBrl(precoS)}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}

            {produto.descricao && (
              <section
                className={`mt-4 p-4 ${
                  isMenuOnline
                    ? 'rounded-card border border-bg-border bg-bg-surface'
                    : 'rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-md'
                }`}
              >
                <h3
                  className={`mb-2 text-[10px] font-black uppercase tracking-[0.22em] ${
                    isMenuOnline ? 'text-accent-purple' : 'text-violet-300'
                  }`}
                >
                  Ingredientes
                </h3>
                <p
                  className={`text-xs leading-relaxed italic ${
                    isMenuOnline ? 'text-text-secondary' : 'text-white/70'
                  }`}
                >
                  {produto.descricao}
                </p>
              </section>
            )}

            {produto.adicionais.length > 0 && (
              <section>
                <h3
                  className={`mb-3 text-[11px] font-black uppercase tracking-[0.2em] ${
                    isMenuOnline ? 'text-text-secondary' : 'text-white/55'
                  }`}
                >
                  {isMenuOnline ? (
                    <>
                      <span className="text-accent-purple">2.</span> Adicionais{' '}
                      <span className="ml-1 font-medium normal-case tracking-normal text-text-muted">· opcional</span>
                    </>
                  ) : (
                    <>
                      Adicionais{' '}
                      <span className="ml-1 font-medium normal-case tracking-normal text-white/40">· opcional</span>
                    </>
                  )}
                </h3>
                <ul className="space-y-2">
                  {produto.adicionais.map((ad) => {
                    const q = qtdAdicional[ad.id] ?? 0;
                    const ativo = q > 0;
                    const maxQ =
                      ad.maxQuantidade != null && ad.maxQuantidade > 0
                        ? Math.min(99, ad.maxQuantidade)
                        : 99;
                    return (
                      <li
                        key={ad.id}
                        className={`flex items-center justify-between gap-3 px-4 py-3 transition ${
                          isMenuOnline
                            ? ativo
                              ? 'rounded-item border border-price/40 bg-price/[0.08]'
                              : 'rounded-item border border-bg-border bg-bg-surface'
                            : ativo
                              ? 'rounded-2xl border border-emerald-400/35 bg-emerald-500/[0.08] backdrop-blur-md'
                              : 'rounded-2xl border border-white/[0.07] bg-white/[0.04] backdrop-blur-md'
                        }`}
                      >
                        <div className="min-w-0">
                          <p
                            className={`font-bold ${isMenuOnline ? 'text-text-primary' : 'text-white'}`}
                          >
                            {ad.nome}
                          </p>
                          <p
                            className={`text-sm font-semibold tabular-nums ${
                              isMenuOnline ? 'text-price' : 'text-emerald-300'
                            }`}
                          >
                            + {formatBrl(ad.preco)}
                          </p>
                        </div>
                        <div
                          className={`flex items-center gap-1 p-1 transition ${
                            isMenuOnline
                              ? 'rounded-pill bg-bg-raised'
                              : ativo
                                ? 'rounded-2xl border border-emerald-400/40 bg-emerald-500/10'
                                : 'rounded-2xl border border-white/[0.08] bg-[#0a1020]/80'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => alterarAdicional(ad.id, -1)}
                            className={`flex items-center justify-center transition disabled:opacity-30 ${
                              isMenuOnline
                                ? 'h-8 w-8 rounded-full text-text-secondary hover:bg-bg-border hover:text-text-primary'
                                : 'h-11 w-11 rounded-xl text-white/85 hover:bg-white/10'
                            }`}
                            disabled={q <= 0}
                            aria-label={`Menos ${ad.nome}`}
                          >
                            <Minus className={isMenuOnline ? 'h-4 w-4' : 'h-5 w-5'} />
                          </button>
                          <span
                            className={`text-center font-black tabular-nums ${
                              isMenuOnline
                                ? 'min-w-[1.75rem] text-base text-text-primary'
                                : ativo
                                  ? 'min-w-[2rem] text-lg text-emerald-300'
                                  : 'min-w-[2rem] text-lg text-white'
                            }`}
                          >
                            {q}
                          </span>
                          <button
                            type="button"
                            onClick={() => alterarAdicional(ad.id, 1)}
                            className={`flex items-center justify-center transition disabled:opacity-30 ${
                              isMenuOnline
                                ? 'h-8 w-8 rounded-full text-text-secondary hover:bg-bg-border hover:text-text-primary'
                                : 'h-11 w-11 rounded-xl text-white/85 hover:bg-white/10'
                            }`}
                            disabled={q >= maxQ}
                            aria-label={`Mais ${ad.nome}`}
                          >
                            <Plus className={isMenuOnline ? 'h-4 w-4' : 'h-5 w-5'} />
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}

            {mostrarObservacoes && (
              <>
                <section>
                  <h3
                    className={`mb-3 text-[11px] font-black uppercase tracking-[0.2em] ${
                      isMenuOnline ? 'text-text-secondary' : 'text-white/55'
                    }`}
                  >
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
                          className={`px-3.5 py-1.5 text-sm font-semibold transition-all duration-200 active:scale-95 ${
                            isMenuOnline
                              ? ativo
                                ? 'rounded-pill bg-cta text-white shadow-cta'
                                : 'rounded-pill border border-bg-border bg-bg-raised text-text-secondary hover:text-text-primary'
                              : ativo
                                ? 'rounded-full border border-violet-400/60 bg-gradient-to-r from-violet-500/25 to-fuchsia-500/15 text-violet-100 shadow-[0_3px_12px_rgba(139,92,246,0.25)]'
                                : 'rounded-full border border-white/[0.08] bg-white/[0.04] text-white/75 hover:border-white/20 hover:bg-white/[0.08]'
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
                    className={`w-full resize-none px-4 py-3 text-base transition focus:outline-none focus:ring-2 ${
                      isMenuOnline
                        ? 'rounded-item border border-bg-border bg-bg-raised text-text-primary placeholder:text-text-muted focus:border-accent-purple focus:ring-accent-purple/20'
                        : 'rounded-2xl border border-white/[0.08] bg-white/[0.04] text-white placeholder:text-white/35 backdrop-blur-md focus:border-violet-500/60 focus:ring-violet-500/30'
                    }`}
                  />
                </section>

                {isComida && (
                  <section
                    className={`px-4 py-3 ${
                      isMenuOnline
                        ? 'rounded-item border border-bg-border bg-bg-surface'
                        : 'rounded-2xl border border-white/[0.07] bg-white/[0.04] backdrop-blur-md'
                    }`}
                  >
                    <label
                      className={`flex cursor-pointer items-center gap-3 text-sm font-semibold ${
                        isMenuOnline ? 'text-text-primary' : 'text-white/90'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={partidoAoMeio}
                        onChange={(e) => setPartidoAoMeio(e.target.checked)}
                        className={`h-5 w-5 rounded ${
                          isMenuOnline
                            ? 'border-bg-border bg-bg-raised accent-accent-magenta'
                            : 'border-white/20 bg-[#0a1020] accent-violet-500'
                        }`}
                      />
                      Partido ao meio
                    </label>
                  </section>
                )}
              </>
            )}

            <section
              className={`flex items-center justify-between gap-4 px-4 py-4 ${
                isMenuOnline
                  ? 'rounded-card border border-bg-border bg-bg-surface'
                  : 'rounded-2xl border border-white/[0.07] bg-gradient-to-br from-white/[0.05] to-white/[0.02] backdrop-blur-md'
              }`}
            >
              <span
                className={`text-[11px] font-black uppercase tracking-[0.2em] ${
                  isMenuOnline ? 'text-text-secondary' : 'text-white/55'
                }`}
              >
                Quantidade
              </span>
              <div
                className={`flex items-center gap-1 p-1 ${
                  isMenuOnline
                    ? 'rounded-pill bg-bg-raised'
                    : 'rounded-2xl border border-white/[0.08] bg-[#0a1020]/90'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setQuantidade((q) => Math.max(1, q - 1))}
                  className={`flex items-center justify-center transition active:scale-90 ${
                    isMenuOnline
                      ? 'h-9 w-9 rounded-full text-text-secondary hover:bg-bg-border hover:text-text-primary'
                      : 'h-12 w-12 rounded-xl text-white/85 hover:bg-white/10'
                  }`}
                  aria-label="Menos unidades"
                >
                  <Minus className={isMenuOnline ? 'h-4 w-4' : 'h-5 w-5'} />
                </button>
                <span
                  className={`text-center font-black tabular-nums ${
                    isMenuOnline
                      ? 'min-w-[2rem] text-lg text-text-primary'
                      : 'min-w-[2.5rem] text-2xl text-white'
                  }`}
                >
                  {quantidade}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantidade((q) => q + 1)}
                  className={`flex items-center justify-center transition active:scale-90 ${
                    isMenuOnline
                      ? 'h-9 w-9 rounded-full text-text-secondary hover:bg-bg-border hover:text-text-primary'
                      : 'h-12 w-12 rounded-xl text-white/85 hover:bg-white/10'
                  }`}
                  aria-label="Mais unidades"
                >
                  <Plus className={isMenuOnline ? 'h-4 w-4' : 'h-5 w-5'} />
                </button>
              </div>
            </section>
          </div>
        </div>

        <footer
          className={`relative z-20 shrink-0 rounded-b-none px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 backdrop-blur-2xl ${
            isMenuOnline
              ? 'border-t border-bg-border bg-bg-base/95'
              : 'border-t border-white/[0.07] bg-[#08101f]/95'
          }`}
        >
          {!isMenuOnline && (
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-500/40 to-transparent" />
          )}
          <div className="mx-auto flex max-w-3xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p
                className={`text-[10px] font-bold uppercase tracking-[0.18em] ${
                  isMenuOnline ? 'text-text-muted' : 'text-white/45'
                }`}
              >
                Total
              </p>
              <p
                className={`text-3xl font-black tabular-nums ${
                  isMenuOnline
                    ? 'text-price'
                    : 'text-emerald-400 drop-shadow-[0_2px_10px_rgba(16,185,129,0.3)]'
                }`}
              >
                {formatBrl(totalLinha)}
              </p>
              <p
                className={`text-xs ${isMenuOnline ? 'text-text-muted' : 'text-white/45'}`}
              >
                Base + adicionais × {quantidade}
              </p>
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-[280px]">
              {isPizzaMulti && modoPizzaSequencial && !modoEdicao ? (
                <button
                  type="button"
                  onClick={iniciarDivisaoSaboresClick}
                  disabled={!podeAdicionar}
                  className={`flex min-h-[3.1rem] w-full items-center justify-center px-6 text-sm font-bold transition enabled:active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40 ${
                    isMenuOnline
                      ? 'rounded-pill border-2 border-accent-magenta text-text-primary enabled:hover:bg-accent-magenta/10'
                      : 'rounded-2xl border border-violet-400/40 bg-violet-500/15 text-violet-100 enabled:hover:bg-violet-500/25'
                  }`}
                >
                  Dividir sabor / adicionar outro sabor
                </button>
              ) : null}
              <button
                type="button"
                onClick={adicionar}
                disabled={!podeAdicionar}
                className={
                  isMenuOnline
                    ? 'flex min-h-[3.5rem] w-full items-center justify-center rounded-pill bg-cta hover:bg-cta-hover shadow-cta px-8 text-base font-bold text-white tracking-wide uppercase transition-all duration-200 enabled:active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100'
                    : 'group relative flex min-h-[3.5rem] w-full items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-r from-violet-600 via-violet-500 to-fuchsia-600 px-8 text-base font-black text-white shadow-[0_16px_42px_rgba(139,92,246,0.5)] transition enabled:active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none'
                }
              >
                {!isMenuOnline && (
                  <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-enabled:group-hover:translate-x-full" />
                )}
                <span className={isMenuOnline ? '' : 'relative'}>
                  {modoEdicao ? 'Atualizar item' : 'Adicionar ao pedido'}
                </span>
              </button>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
