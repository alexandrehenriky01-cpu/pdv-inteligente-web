import { useEffect, useMemo, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Loader2, ShoppingBag } from 'lucide-react';
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
                onClick={() => setCategoriaAtiva(c.id)}
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

        <ul className="divide-y divide-white/10 px-3">
          {produtosFiltrados.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => abrirProduto(p)}
                className="flex w-full gap-3 py-4 text-left transition active:bg-white/[0.04]"
              >
                <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]">
                  <img src={p.imagemUrl} alt="" className="h-full w-full object-cover" />
                </div>
                <div className="min-w-0 flex-1 py-0.5">
                  <p className="font-semibold text-white">{p.nome}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-white/50">{p.descricaoCurta}</p>
                  <p className="mt-2 text-base font-semibold text-violet-200">
                    {formatBrl(p.precoBase)}
                  </p>
                </div>
              </button>
            </li>
          ))}
        </ul>

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
