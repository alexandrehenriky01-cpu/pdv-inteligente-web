import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Loader2, Plus } from 'lucide-react';
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
    if (value) return value;
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
        const mapped = raw.map(mapCardapioItemToTotemProduto);
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
      <div className="flex flex-col items-center justify-center gap-4 px-6 py-20">
        <Loader2 className="h-12 w-12 animate-spin text-violet-400" />
        <p className="text-center text-white/65">Carregando cardápio…</p>
      </div>
    );
  }

  if (erroLoja || !loja) {
    return (
      <div className="px-6 py-16 text-center text-white/60">
        <p>Não foi possível exibir o cardápio.</p>
      </div>
    );
  }

  return (
    <>
      <div className={`flex min-h-0 flex-col ${carrinho.length > 0 ? 'pb-44 sm:pb-48' : 'pb-24'}`}>
        <div className="sticky top-0 z-20 border-b border-white/10 bg-[#060816]/90 backdrop-blur-md">
          <div className="flex gap-2 overflow-x-auto px-3 py-2 scrollbar-none">
            {categorias.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setCategoriaAtiva(c.id);
                  document.getElementById(`cat-${c.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                className={`shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition ${
                  categoriaAtiva === c.id
                    ? 'border-violet-400/50 bg-violet-500/25 text-violet-100'
                    : 'border-white/10 bg-white/[0.05] text-white/70'
                }`}
              >
                {c.nome}
              </button>
            ))}
          </div>
          {pizzaEmComposicao ? (
            <div className="border-t border-violet-400/20 bg-violet-500/10 px-3 py-2">
              <p className="text-xs font-semibold text-violet-100">
                Escolha o próximo sabor da pizza ({pizzaEmComposicao.saboresItemCardapioIds.length}/
                {pizzaEmComposicao.maxSabores})
              </p>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setPizzaEmComposicao(null)}
                  className="rounded-lg border border-white/15 bg-white/[0.08] px-3 py-1.5 text-xs font-semibold text-white/80"
                >
                  Cancelar divisão
                </button>
                <button
                  type="button"
                  onClick={() => finalizarPizzaEmComposicao(pizzaEmComposicao)}
                  className="rounded-lg border border-violet-400/40 bg-violet-500/30 px-3 py-1.5 text-xs font-semibold text-violet-100"
                >
                  Finalizar pizza
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <div className="space-y-8 px-3 py-4">
          {categorias.map((cat) => {
            const produtosDaCategoria = categoriaAtiva
              ? produtosFiltrados.filter((p) => p.categoriaId === cat.id)
              : produtos.filter((p) => p.categoriaId === cat.id);
            if (produtosDaCategoria.length === 0) return null;
            return (
              <section key={cat.id} id={`cat-${cat.id}`}>
                <h2 className="mb-4 font-black tracking-widest text-white/80 uppercase text-sm border-b border-white/10 pb-2">
                  {cat.nome}
                </h2>
                <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {produtosDaCategoria.map((p) => {
                    const imageSrc = resolveItemImage(p);
                    const temImagem = isRealImage(imageSrc);
                    return (
                      <li key={p.id}>
                        <button
                          type="button"
                          onClick={() => abrirProduto(p)}
                          className="group relative flex w-full flex-col overflow-hidden rounded-[20px] border border-white/10 bg-[#0b1324] text-left shadow-xl transition-all duration-500 hover:border-violet-400/40 hover:shadow-[0_8px_30px_rgba(139,92,246,0.2)] active:scale-[0.98]"
                        >
                          <div className="relative h-44 w-full overflow-hidden">
                            {temImagem ? (
                              <img
                                src={imageSrc}
                                alt=""
                                className="h-full w-full object-cover rounded-t-[20px] transition-all duration-500 hover:scale-105"
                              />
                            ) : (
                              <div className="h-full w-full bg-gradient-to-br from-slate-800 to-slate-900">
                                <div className="flex h-full w-full items-center justify-center">
                                  <span className="text-4xl text-white/20 capitalize">{p.nome.charAt(0)}</span>
                                </div>
                              </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-[#0b1324]/80 via-transparent to-transparent" />
                          </div>
                          <div className="flex flex-1 flex-col gap-1 p-3">
                            <p className="line-clamp-1 text-base font-semibold leading-tight text-white">{p.nome}</p>
                            <p className="line-clamp-2 text-xs leading-relaxed text-white/50">{p.descricaoCurta}</p>
                            <div className="mt-auto flex items-end justify-between pt-1">
                              <p className="text-lg font-black text-emerald-400">{formatBrl(p.precoBase)}</p>
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white shadow-lg transition-transform duration-300 group-hover:scale-110">
                                <Plus className="h-3 w-3" strokeWidth={2.5} />
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
          <p className="py-16 text-center text-white/45">Nenhum item nesta categoria.</p>
        )}
      </div>

      {totalItens > 0 && (
        <DeliveryCartPanel lojaSlug={lojaPublicKey} onEditarItem={(item) => abrirEdicaoItem(item)} />
      )}

      <ProductModal
        produto={produtoModal}
        aberto={modalAberto}
        presentation="sheet"
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
