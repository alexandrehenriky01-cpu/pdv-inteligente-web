import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { ArrowLeft, Loader2, ShoppingBag, Sparkles } from 'lucide-react';
import { ProductCard } from '../components/ProductCard';
import { ProductModal } from '../components/ProductModal';
import { TotemCartDrawer } from '../components/TotemCartDrawer';
import { useTotemStore, selectTotalItens } from '../store/totemStore';
import type { TotemMockCategoria, TotemMockProduto } from '../types';
import {
  buildTotemCategoriasFromCardapio,
  getCardapioTotem,
  mapCardapioItemToTotemProduto,
} from '../../../services/api/cardapioTotemApi';
import { mensagemErroTotemApi } from '../../../services/api/totemApi';

export function TotemMenuPage() {
  const navigate = useNavigate();
  const tipoConsumo = useTotemStore((s) => s.tipoConsumo);
  const fluxoIniciado = useTotemStore((s) => s.fluxoIniciado);
  const adicionarAoCarrinho = useTotemStore((s) => s.adicionarAoCarrinho);
  const totalItensSacola = useTotemStore(selectTotalItens);
  const [sacolaAberta, setSacolaAberta] = useState(false);
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

  const abrirProduto = (p: TotemMockProduto) => {
    setProdutoModal(p);
    setModalAberto(true);
  };

  const labelConsumo =
    tipoConsumo === 'LOCAL' ? 'Comer aqui' : tipoConsumo === 'VIAGEM' ? 'Levar' : '—';

  useEffect(() => {
    if (!tipoConsumo || !fluxoIniciado) {
      navigate('/totem-food', { replace: true });
    }
  }, [tipoConsumo, fluxoIniciado, navigate]);

  useEffect(() => {
    let ativo = true;

    (async () => {
      try {
        setCarregando(true);
        const { itens: raw } = await getCardapioTotem();
        if (!ativo) return;

        const mapped = raw.map(mapCardapioItemToTotemProduto);
        setProdutos(mapped);
        const cats = buildTotemCategoriasFromCardapio(raw);
        setCategorias(cats);
        setCategoriaAtiva(cats[0]?.id ?? '');
      } catch (e) {
        if (!ativo) return;
        const msg = mensagemErroTotemApi(e);
        toast.error(msg, { toastId: 'totem-cardapio-erro' });
      } finally {
        if (ativo) setCarregando(false);
      }
    })();

    return () => {
      ativo = false;
    };
  }, []);

  if (carregando) {
    return (
      <div className="flex h-full min-h-0 flex-col items-center justify-center gap-4 px-6">
        <Loader2 className="h-14 w-14 animate-spin text-violet-400" />
        <p className="text-center text-lg text-white/70">Carregando cardápio…</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex h-full min-h-0 flex-col">
        <header className="shrink-0 border-b border-white/10 bg-[#08101f]/85 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3 px-4 py-3 md:px-6">
            <button
              type="button"
              onClick={() => navigate('/totem-food')}
              className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] text-white/85 transition hover:bg-white/10 active:scale-95"
              aria-label="Voltar"
            >
              <ArrowLeft className="h-6 w-6" />
            </button>
            <div className="flex min-w-0 flex-1 flex-col items-center text-center">
              <div className="flex items-center gap-2 text-violet-200/90">
                <Sparkles className="h-4 w-4 shrink-0" />
                <span className="text-xs font-semibold uppercase tracking-[0.18em]">Cardápio</span>
              </div>
              <p className="truncate text-sm text-white/50">
                {labelConsumo}
                <span className="mx-2 text-white/25">·</span>
                Toque no item para personalizar
              </p>
            </div>
            <button
              type="button"
              className="relative flex h-12 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-4 text-sm font-medium text-white/90 backdrop-blur-md transition hover:bg-white/10 active:scale-[0.98]"
              onClick={() => setSacolaAberta(true)}
            >
              <ShoppingBag className="h-5 w-5 text-violet-200" />
              <span className="hidden sm:inline">Sacola</span>
              {totalItensSacola > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-emerald-500 px-1 text-[11px] font-bold text-white shadow-[0_0_12px_rgba(16,185,129,0.5)]">
                  {totalItensSacola > 99 ? '99+' : totalItensSacola}
                </span>
              )}
            </button>
          </div>

          <div className="flex gap-2 overflow-x-auto px-4 pb-3 [scrollbar-width:none] md:px-6 [&::-webkit-scrollbar]:hidden">
            {categorias.map((cat) => {
              const ativo = cat.id === categoriaAtiva;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategoriaAtiva(cat.id)}
                  className={`shrink-0 rounded-full border px-5 py-2.5 text-sm font-semibold transition active:scale-[0.98] ${
                    ativo
                      ? 'border-violet-400/50 bg-violet-500/25 text-white shadow-[0_0_20px_rgba(139,92,246,0.2)]'
                      : 'border-white/10 bg-white/[0.05] text-white/70 hover:border-white/20 hover:text-white'
                  }`}
                >
                  {cat.nome}
                </button>
              );
            })}
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 md:px-6">
          <div className="mx-auto grid max-w-6xl grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {produtosFiltrados.map((p) => (
              <ProductCard key={p.id} produto={p} onSelect={abrirProduto} />
            ))}
          </div>
          {produtos.length === 0 && (
            <p className="py-20 text-center text-white/45">
              Nenhum item ativo no cardápio com ficha técnica. Cadastre insumos no ERP.
            </p>
          )}
          {produtos.length > 0 && produtosFiltrados.length === 0 && (
            <p className="py-20 text-center text-white/45">Nenhum item nesta categoria.</p>
          )}
        </main>
      </div>

      <ProductModal
        produto={produtoModal}
        aberto={modalAberto}
        onFechar={() => {
          setModalAberto(false);
          setProdutoModal(null);
        }}
        onAdicionarAoPedido={(payload) => {
          adicionarAoCarrinho({
            produto: payload.produto,
            quantidade: payload.quantidade,
            adicionais: payload.adicionais,
            observacao: payload.observacao,
            subtotal: payload.total,
          });
        }}
      />

      <TotemCartDrawer aberto={sacolaAberta} onFechar={() => setSacolaAberta(false)} />
    </>
  );
}
