import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { toast } from 'react-toastify';
import { ImageIcon, Loader2, Plus, Sparkles } from 'lucide-react';
import { ProductModal } from '../totem/components/ProductModal';
import type { CartItem, TotemMockCategoria, TotemMockProduto } from '../totem/types';
import {
  buildTotemCategoriasFromCardapio,
  getCardapioTotemPublic,
  mapCardapioItemToTotemProduto,
} from '../../services/api/cardapioTotemApi';
import { mensagemErroTotemApi } from '../../services/api/totemApi';
import {
  useDeliveryCartStore,
  selectTotalItensDelivery,
  calcularSubtotalLinhaDelivery,
} from './store/deliveryCartStore';
import type { DeliveryOutletContext } from './deliveryOutletContext';
import { DeliveryCartPanel } from './components/DeliveryCartPanel';
import { resolveCardapioImageUrl } from '../../utils/resolveCardapioImageUrl';

interface PizzaComposicaoTemporaria {
  produtoBase: TotemMockProduto;
  quantidade: number;
  adicionais: Record<string, number>;
  observacao: string;
  itemCardapioTamanhoId?: string | null;
  saboresItemCardapioIds: string[];
  maxSabores: number;
}

function resolverSaborIdParaPizza(produto: TotemMockProduto): string {
  const opcoes = produto.saboresOpcoes ?? [];
  const idDireto = produto.id.trim();
  if (opcoes.some((s) => s.id === idDireto)) return idDireto;
  const idCardapio = (produto.itemCardapioId ?? '').trim();
  if (idCardapio && opcoes.some((s) => s.id === idCardapio)) return idCardapio;
  const byNome = opcoes.find((s) => s.nome.trim().toLowerCase() === produto.nome.trim().toLowerCase())?.id;
  if (byNome) return byNome;
  return idDireto || idCardapio;
}

function formatBrl(n: number): string {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const PLACEHOLDER_FALLBACK = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600"%3E%3Crect fill="%231a1a2e" width="800" height="600"/%3E%3Ccircle cx="400" cy="300" r="120" fill="%232d2d44"/%3E%3C/svg%3E';

function isRealImage(url: string): boolean {
  return Boolean(url && !url.startsWith('data:') && !url.includes('placeholder') && !url.includes('fallback'));
}

/**
 * Resolve a URL final da imagem do item para o menu online.
 * - Lê dos campos conhecidos (imagemUrl, imageUrl, fotoUrl, produto.*) para tolerar variações da API.
 * - Aplica resolveCardapioImageUrl como camada defensiva para que `/uploads/...` vire URL absoluta da API
 *   mesmo se o objeto chegar não-resolvido por algum caminho legado.
 * - Não tem efeito sobre URLs externas válidas (http(s) já absolutas).
 */
function resolveItemImage(item: TotemMockProduto): string {
  const fromProduto = item as TotemMockProduto & {
    imageUrl?: string | null;
    fotoUrl?: string | null;
    imageBase64?: string | null;
    produto?: {
      imagemUrl?: string | null;
      imageUrl?: string | null;
      fotoUrl?: string | null;
    } | null;
  };

  const candidates = [
    item.imagemUrl,
    fromProduto.imageUrl,
    fromProduto.fotoUrl,
    fromProduto.produto?.imagemUrl,
    fromProduto.produto?.imageUrl,
    fromProduto.produto?.fotoUrl,
  ];

  for (const c of candidates) {
    const value = c?.trim();
    if (!value) continue;
    const resolved = resolveCardapioImageUrl(value);
    if (resolved) return resolved;
  }

  const base64 = fromProduto.imageBase64?.trim();
  if (base64) {
    return base64.startsWith('data:') ? base64 : `data:image/png;base64,${base64}`;
  }

  return PLACEHOLDER_FALLBACK;
}

export function DeliveryMenuPage() {
  const { lojaPublicKey, loja, carregandoLoja, erroLoja } = useOutletContext<DeliveryOutletContext>();
  const adicionarAoCarrinho = useDeliveryCartStore((s) => s.adicionarAoCarrinho);
  const substituirLinhaCarrinho = useDeliveryCartStore((s) => s.substituirLinhaCarrinho);
  const totalItens = useDeliveryCartStore(selectTotalItensDelivery);
  const carrinho = useDeliveryCartStore((s) => s.carrinho);

  const [carregando, setCarregando] = useState(true);
  const [categorias, setCategorias] = useState<TotemMockCategoria[]>([]);
  const [produtos, setProdutos] = useState<TotemMockProduto[]>([]);
  const [categoriaAtiva, setCategoriaAtiva] = useState('');
  const [produtoModal, setProdutoModal] = useState<TotemMockProduto | null>(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [linhaEdicao, setLinhaEdicao] = useState<CartItem | null>(null);
  const [pizzaEmComposicao, setPizzaEmComposicao] = useState<PizzaComposicaoTemporaria | null>(null);
  // Set de URLs que falharam ao carregar — alimenta o fallback visual no lugar do ícone quebrado.
  const [imagensFalhas, setImagensFalhas] = useState<Set<string>>(new Set());

  const marcarImagemFalha = (src: string) => {
    setImagensFalhas((prev) => {
      if (prev.has(src)) return prev;
      const next = new Set(prev);
      next.add(src);
      return next;
    });
  };

const produtosFiltrados = categoriaAtiva
    ? produtos.filter((p) => p.categoriaId === categoriaAtiva)
    : produtos;

  const finalizarPizzaEmComposicao = (ctx: PizzaComposicaoTemporaria) => {
    const sub = calcularSubtotalLinhaDelivery(
      ctx.produtoBase,
      ctx.adicionais,
      ctx.quantidade,
      ctx.itemCardapioTamanhoId,
      ctx.saboresItemCardapioIds
    );
    adicionarAoCarrinho({
      produto: ctx.produtoBase,
      quantidade: ctx.quantidade,
      adicionais: ctx.adicionais,
      observacao: ctx.observacao,
      itemCardapioTamanhoId: ctx.itemCardapioTamanhoId,
      saboresItemCardapioIds: [...ctx.saboresItemCardapioIds],
      subtotal: sub,
    });
    setPizzaEmComposicao(null);
    toast.success(`${ctx.quantidade}× ${ctx.produtoBase.nome} adicionado`, {
      toastId: `add-split-${ctx.produtoBase.id}-${ctx.saboresItemCardapioIds.join('-')}`,
    });
  };

  const abrirProduto = (p: TotemMockProduto) => {
    if (loja && !loja.aberto) {
      toast.info('Estamos fechados no momento. Volte mais tarde!');
      return;
    }
    if (pizzaEmComposicao) {
      const saborId = resolverSaborIdParaPizza(p);
      const idsAtuais = pizzaEmComposicao.saboresItemCardapioIds;
      if (!saborId) {
        toast.error('Sabor inválido.');
        return;
      }
      if (idsAtuais.includes(saborId)) {
        toast.info('Este sabor já foi adicionado nesta pizza.');
        return;
      }
      const permitidos = (pizzaEmComposicao.produtoBase.saboresOpcoes ?? []).map((s) => s.id);
      if (permitidos.length > 0 && !permitidos.includes(saborId)) {
        toast.error('Este sabor não é permitido para a pizza em montagem.');
        return;
      }
      if (idsAtuais.length >= pizzaEmComposicao.maxSabores) {
        toast.info(`Limite de ${pizzaEmComposicao.maxSabores} sabores atingido.`);
        return;
      }
      const nextCtx: PizzaComposicaoTemporaria = {
        ...pizzaEmComposicao,
        saboresItemCardapioIds: [...idsAtuais, saborId],
      };
      setPizzaEmComposicao(nextCtx);
      if (nextCtx.saboresItemCardapioIds.length >= nextCtx.maxSabores) {
        finalizarPizzaEmComposicao(nextCtx);
        return;
      }
      toast.info(
        `Sabor adicionado (${nextCtx.saboresItemCardapioIds.length}/${nextCtx.maxSabores}). Escolha outro sabor ou finalize.`
      );
      return;
    }
    setLinhaEdicao(null);
    setProdutoModal(p);
    setModalAberto(true);
  };

  const abrirEdicaoItem = (item: CartItem) => {
    setLinhaEdicao(item);
    setProdutoModal(item.produto);
    setModalAberto(true);
  };

  useEffect(() => {
    if (!lojaPublicKey || erroLoja) {
      setCarregando(false);
      return;
    }

    let ativo = true;
    (async () => {
      try {
        setCarregando(true);
        const { itens: raw } = await getCardapioTotemPublic(lojaPublicKey);
        if (!ativo) return;
        // DEBUG TEMPORÁRIO: imprime os campos crus de imagem que a API pública retorna,
        // para comparar com o que aparece no cadastro. Remover quando o problema for resolvido.
        console.log('[DELIVERY IMAGE DEBUG] API_BASE_URL:', import.meta.env.VITE_API_URL ?? '(usando fallback)');
        for (const item of raw) {
          const r = item as typeof item & {
            imageUrl?: string | null;
            fotoUrl?: string | null;
            imagem?: string | null;
            image?: string | null;
            urlImagem?: string | null;
            produto?: { imagemUrl?: string | null; imageUrl?: string | null; fotoUrl?: string | null } | null;
          };
          console.log('[DELIVERY IMAGE DEBUG]', {
            itemId: item.id,
            nome: item.nome,
            rawImageFields: {
              imagemUrl: item.imagemUrl,
              imageUrl: r.imageUrl ?? null,
              fotoUrl: r.fotoUrl ?? null,
              imagem: r.imagem ?? null,
              image: r.image ?? null,
              urlImagem: r.urlImagem ?? null,
              produtoImagemUrl: r.produto?.imagemUrl ?? null,
            },
          });
        }
        const mapped = raw.map(mapCardapioItemToTotemProduto);
        // Após o mapping, mostra a URL resolvida que será usada pelo <img>
        for (const p of mapped) {
          console.log('[DELIVERY IMAGE DEBUG resolved]', {
            itemId: p.id,
            nome: p.nome,
            resolvedImageSrc: p.imagemUrl,
          });
        }
        setProdutos(mapped);
        const cats = buildTotemCategoriasFromCardapio(raw);
        setCategorias(cats);
        setCategoriaAtiva(cats[0]?.id ?? '');
      } catch (e) {
        if (!ativo) return;
        toast.error(mensagemErroTotemApi(e), { toastId: 'delivery-cardapio' });
      } finally {
        if (ativo) setCarregando(false);
      }
    })();

    return () => {
      ativo = false;
    };
  }, [lojaPublicKey, erroLoja]);

  if (carregandoLoja || carregando) {
    return (
      <div className="flex flex-col items-center justify-center gap-5 px-6 py-24">
        <Loader2 className="h-12 w-12 animate-spin text-accent-purple" />
        <p className="text-center text-sm font-medium text-text-secondary">Carregando cardápio…</p>
      </div>
    );
  }

  if (erroLoja || !loja) {
    return (
      <div className="px-6 py-20 text-center">
        <div className="mx-auto max-w-xs rounded-card border border-bg-border bg-bg-surface p-6 shadow-card">
          <p className="text-sm text-text-secondary">Não foi possível exibir o cardápio.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={`flex min-h-0 flex-col ${carrinho.length > 0 ? 'pb-44 sm:pb-48' : 'pb-24'}`}>
        <div className="sticky top-0 z-20 border-b border-bg-border bg-bg-base/95 backdrop-blur-xl">
          <div className="flex gap-2 overflow-x-auto px-4 py-3 scrollbar-none">
            {categorias.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setCategoriaAtiva(c.id);
                  document.getElementById(`cat-${c.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                className={`shrink-0 rounded-pill h-10 px-4 text-sm font-semibold uppercase tracking-wide flex items-center justify-center transition-all duration-200 active:scale-95 ${
                  categoriaAtiva === c.id
                    ? 'bg-cta text-white shadow-cta'
                    : 'bg-bg-raised border border-bg-border text-text-secondary hover:text-text-primary'
                }`}
              >
                {c.nome}
              </button>
            ))}
          </div>
          {pizzaEmComposicao ? (
            <div className="border-t border-accent-magenta/30 bg-accent-magenta/5 px-4 py-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-accent-magenta" />
                <p className="text-xs font-semibold text-text-primary">
                  Escolha o próximo sabor da pizza ({pizzaEmComposicao.saboresItemCardapioIds.length}/
                  {pizzaEmComposicao.maxSabores})
                </p>
              </div>
              <div className="mt-2.5 flex gap-2">
                <button
                  type="button"
                  onClick={() => setPizzaEmComposicao(null)}
                  className="rounded-pill border border-bg-border bg-bg-raised px-3 py-1.5 text-xs font-semibold text-text-secondary transition hover:text-text-primary active:scale-95"
                >
                  Cancelar divisão
                </button>
                <button
                  type="button"
                  onClick={() => finalizarPizzaEmComposicao(pizzaEmComposicao)}
                  className="rounded-pill bg-cta px-3 py-1.5 text-xs font-bold text-white shadow-cta transition active:scale-95"
                >
                  Finalizar pizza
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <div className="space-y-8 px-4 py-5">
          {categorias.map((cat) => {
            const produtosDaCategoria = categoriaAtiva
              ? produtosFiltrados.filter((p) => p.categoriaId === cat.id)
              : produtos.filter((p) => p.categoriaId === cat.id);
            if (produtosDaCategoria.length === 0) return null;
            const tipos = new Set(produtosDaCategoria.map((p) => p.tipoItem));
            const ehBebida = tipos.size === 1 && tipos.has('BEBIDA');
            const gridCols = ehBebida ? 'grid-cols-3' : 'grid-cols-2';
            return (
              <section key={cat.id} id={`cat-${cat.id}`}>
                <div className="mb-3 flex items-center gap-2">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-text-primary">
                    {cat.nome}
                  </h2>
                </div>
                <ul className={`grid ${gridCols} gap-3`}>
                  {produtosDaCategoria.map((p) => {
                    const imageSrc = resolveItemImage(p);
                    const carregavel = isRealImage(imageSrc) && !imagensFalhas.has(imageSrc);
                    return (
                      <li key={p.id}>
                        <button
                          type="button"
                          onClick={() => abrirProduto(p)}
                          className="group relative flex w-full flex-col overflow-hidden rounded-card border border-bg-border bg-bg-surface text-left shadow-card transition-transform duration-200 hover:-translate-y-0.5 active:scale-[0.98]"
                        >
                          <div className="relative aspect-square w-full overflow-hidden bg-bg-raised">
                            {carregavel ? (
                              <img
                                src={imageSrc}
                                alt=""
                                loading="lazy"
                                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                                onError={(ev) => {
                                  // DEBUG TEMPORÁRIO: mostra exatamente qual URL falhou.
                                  // Verifique a aba Network do navegador para ver o status HTTP (200/404/403/CORS).
                                  console.error('[DELIVERY IMAGE ERROR]', {
                                    itemId: p.id,
                                    nome: p.nome,
                                    imageSrc,
                                    naturalWidth: (ev.target as HTMLImageElement).naturalWidth,
                                  });
                                  marcarImagemFalha(imageSrc);
                                }}
                              />
                            ) : (
                              <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 bg-gradient-to-br from-bg-raised to-bg-base">
                                <ImageIcon className="h-7 w-7 text-text-muted" strokeWidth={1.5} />
                                <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                                  Imagem indisponível
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="flex flex-1 flex-col gap-1 p-3">
                            <h3 className="line-clamp-1 text-sm font-bold uppercase leading-tight text-text-primary">{p.nome}</h3>
                            <p className="line-clamp-2 min-h-[2rem] text-xs leading-relaxed text-text-secondary">
                              {p.descricaoCurta || ' '}
                            </p>
                            <div className="mt-2 flex items-center justify-between gap-2">
                              <p className="whitespace-nowrap text-base font-bold tabular-nums leading-none text-price">
                                {formatBrl(p.precoBase)}
                              </p>
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cta text-white shadow-cta transition-transform duration-200 group-hover:scale-110">
                                <Plus className="h-4 w-4" strokeWidth={3} />
                              </div>
                            </div>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>

        {produtos.length === 0 && (
          <p className="py-16 text-center text-text-muted">Nenhum item nesta categoria.</p>
        )}
      </div>

      {totalItens > 0 && (
        <DeliveryCartPanel lojaSlug={lojaPublicKey} onEditarItem={(item) => abrirEdicaoItem(item)} />
      )}

      <ProductModal
        produto={produtoModal}
        aberto={modalAberto}
        presentation="sheet"
        varianteVisual="menu-online"
        linhaCarrinhoParaEdicao={linhaEdicao}
        modoPizzaSequencial
        onFechar={() => {
          setModalAberto(false);
          setProdutoModal(null);
          setLinhaEdicao(null);
        }}
        onAdicionarAoPedido={({
          produto,
          quantidade,
          adicionais,
          observacao,
          itemCardapioTamanhoId,
          partidoAoMeio,
          saboresItemCardapioIds,
          substituirLinhaId,
          iniciarDivisaoSabores,
        }) => {
          const saborBaseId = resolverSaborIdParaPizza(produto);
          const saboresNormalizados =
            saboresItemCardapioIds && saboresItemCardapioIds.length > 0
              ? [...saboresItemCardapioIds]
              : produto.tipoItem === 'PIZZA' && produto.permiteMultiplosSabores
                ? [saborBaseId]
                : [];
          if (iniciarDivisaoSabores && produto.tipoItem === 'PIZZA' && produto.permiteMultiplosSabores) {
            const maxSabores = Math.min(20, Math.max(1, produto.maxSabores ?? 1));
            setPizzaEmComposicao({
              produtoBase: produto,
              quantidade,
              adicionais,
              observacao,
              itemCardapioTamanhoId,
              saboresItemCardapioIds: saboresNormalizados.length > 0 ? saboresNormalizados : [saborBaseId],
              maxSabores,
            });
            toast.info('Escolha o próximo sabor da pizza.');
            return;
          }
          const sub = calcularSubtotalLinhaDelivery(
            produto,
            adicionais,
            quantidade,
            itemCardapioTamanhoId,
            saboresNormalizados.length > 0 ? saboresNormalizados : undefined
          );
          const payload = {
            produto,
            quantidade,
            adicionais,
            observacao,
            itemCardapioTamanhoId,
            partidoAoMeio,
            ...(saboresNormalizados.length > 0
              ? { saboresItemCardapioIds: [...saboresNormalizados] }
              : {}),
            subtotal: sub,
          };
          if (substituirLinhaId) {
            substituirLinhaCarrinho(substituirLinhaId, payload);
            toast.success('Item atualizado na sacola.', { toastId: `upd-${substituirLinhaId}` });
          } else {
            adicionarAoCarrinho(payload);
            toast.success(`${quantidade}× ${produto.nome} adicionado`, { toastId: `add-${produto.id}` });
          }
        }}
      />
    </>
  );
}
