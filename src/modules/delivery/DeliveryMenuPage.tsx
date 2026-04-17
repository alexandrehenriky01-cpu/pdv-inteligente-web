import { useEffect, useMemo, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Loader2, Plus, ShoppingBag } from 'lucide-react';
import { ProductModal } from '../totem/components/ProductModal';
import type { TotemMockCategoria, TotemMockProduto } from '../totem/types';
import {
  buildTotemCategoriasFromCardapio,
  getCardapioTotemPublic,
  mapCardapioItemToTotemProduto,
} from '../../services/api/cardapioTotemApi';
import { mensagemErroTotemApi } from '../../services/api/totemApi';
import {
  useDeliveryCartStore,
  selectTotalItensDelivery,
} from './store/deliveryCartStore';
import type { DeliveryOutletContext } from './deliveryOutletContext';

function formatBrl(n: number): string {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const PLACEHOLDER_FALLBACK = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600"%3E%3Crect fill="%231a1a2e" width="800" height="600"/%3E%3Ccircle cx="400" cy="300" r="120" fill="%232d2d44"/%3E%3C/svg%3E';

function isRealImage(url: string): boolean {
  return Boolean(url && !url.startsWith('data:') && !url.includes('placeholder') && !url.includes('fallback'));
}

export function DeliveryMenuPage() {
  const { lojaPublicKey, loja, carregandoLoja, erroLoja } = useOutletContext<DeliveryOutletContext>();
  const adicionarAoCarrinho = useDeliveryCartStore((s) => s.adicionarAoCarrinho);
  const totalItens = useDeliveryCartStore(selectTotalItensDelivery);

  const [carregando, setCarregando] = useState(true);
  const [categorias, setCategorias] = useState<TotemMockCategoria[]>([]);
  const [produtos, setProdutos] = useState<TotemMockProduto[]>([]);
  const [categoriaAtiva, setCategoriaAtiva] = useState('');
  const [produtoModal, setProdutoModal] = useState<TotemMockProduto | null>(null);
  const [modalAberto, setModalAberto] = useState(false);

  const produtosFiltrados = useMemo(
    () => produtos.filter((p) => p.categoriaId === categoriaAtiva),
    [produtos, categoriaAtiva]
  );

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
        console.log('CARDÁPIO RAW:', JSON.stringify(raw.slice(0, 2), null, 2));
        if (!ativo) return;
        const mapped = raw.map(mapCardapioItemToTotemProduto);
        console.log('CARDÁPIO MAPPED:', JSON.stringify(mapped.slice(0, 2), null, 2));
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

  const abrirProduto = (p: TotemMockProduto) => {
    if (loja && !loja.aberto) {
      toast.info('Estamos fechados no momento. Volte mais tarde!');
      return;
    }
    setProdutoModal(p);
    setModalAberto(true);
  };

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
      <div className="flex min-h-0 flex-col pb-24">
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
        </div>

        <div className="space-y-8 px-3 py-4">
          {categorias.map((cat) => {
            const produtosDaCategoria = produtosFiltrados.filter((p) => p.categoriaId === cat.id);
            if (produtosDaCategoria.length === 0) return null;
            return (
              <section key={cat.id} id={`cat-${cat.id}`}>
                <h2 className="mb-4 font-black tracking-widest text-white/80 uppercase text-sm border-b border-white/10 pb-2">
                  {cat.nome}
                </h2>
                <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {produtosDaCategoria.map((p) => {
                    const temImagem = isRealImage(p.imagemUrl);
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
                                src={p.imagemUrl}
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

        {produtosFiltrados.length === 0 && (
          <p className="py-16 text-center text-white/45">Nenhum item nesta categoria.</p>
        )}
      </div>

      {totalItens > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 flex justify-center pb-[max(0.75rem,env(safe-area-inset-bottom))] pointer-events-none">
          <div className="pointer-events-auto w-full max-w-md px-3">
            <Link
              to="checkout"
              className="flex min-h-[3.25rem] items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 text-base font-semibold text-white shadow-[0_12px_40px_rgba(109,40,217,0.45)] transition active:scale-[0.99]"
            >
              <ShoppingBag className="h-5 w-5" />
              Ver sacola ({totalItens})
            </Link>
          </div>
        </div>
      )}

      <ProductModal
        produto={produtoModal}
        aberto={modalAberto}
        presentation="sheet"
        onFechar={() => {
          setModalAberto(false);
          setProdutoModal(null);
        }}
        onAdicionarAoPedido={({ produto, quantidade, adicionais, observacao, total }) => {
          adicionarAoCarrinho({
            produto,
            quantidade,
            adicionais,
            observacao,
            subtotal: total,
          });
          toast.success(`${quantidade}× ${produto.nome} adicionado`, { toastId: `add-${produto.id}` });
        }}
      />
    </>
  );
}
