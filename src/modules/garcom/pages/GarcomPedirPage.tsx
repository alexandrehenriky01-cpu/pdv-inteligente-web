import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { ArrowLeft, Loader2, ChefHat } from 'lucide-react';
import { ProductModal } from '../../totem/components/ProductModal';
import type { TotemMockCategoria, TotemMockProduto } from '../../totem/types';
import {
  buildTotemCategoriasFromCardapio,
  getCardapioTotem,
  mapCardapioItemToTotemProduto,
} from '../../../services/api/cardapioTotemApi';
import { api } from '../../../services/api';
import {
  useGarcomCartStore,
  selectTotalItensGarcom,
  selectValorSubtotalGarcom,
} from '../store/garcomCartStore';

function formatBrl(n: number): string {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function GarcomPedirPage() {
  const { numeroMesa } = useParams<{ numeroMesa: string }>();
  const n = Number(numeroMesa);
  const navigate = useNavigate();

  const setMesaNumero = useGarcomCartStore((s) => s.setMesaNumero);
  const limparCarrinho = useGarcomCartStore((s) => s.limparCarrinho);
  const adicionarAoCarrinho = useGarcomCartStore((s) => s.adicionarAoCarrinho);
  const carrinho = useGarcomCartStore((s) => s.carrinho);
  const remover = useGarcomCartStore((s) => s.removerDoCarrinho);
  const alterarQtd = useGarcomCartStore((s) => s.alterarQuantidade);
  const totalItens = useGarcomCartStore(selectTotalItensGarcom);
  const totalBandeja = useGarcomCartStore(selectValorSubtotalGarcom);

  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [categorias, setCategorias] = useState<TotemMockCategoria[]>([]);
  const [produtos, setProdutos] = useState<TotemMockProduto[]>([]);
  const [categoriaAtiva, setCategoriaAtiva] = useState('');
  const [produtoModal, setProdutoModal] = useState<TotemMockProduto | null>(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [bandejaAberta, setBandejaAberta] = useState(false);

  useEffect(() => {
    if (!Number.isFinite(n) || n <= 0) return;
    const st = useGarcomCartStore.getState();
    if (st.mesaNumero != null && st.mesaNumero !== n) {
      st.limparCarrinho();
    }
    setMesaNumero(n);
  }, [n, setMesaNumero]);

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
      } catch {
        if (ativo) toast.error('Não foi possível carregar o cardápio.');
      } finally {
        if (ativo) setCarregando(false);
      }
    })();
    return () => {
      ativo = false;
    };
  }, []);

  const produtosFiltrados = useMemo(
    () => produtos.filter((p) => p.categoriaId === categoriaAtiva),
    [produtos, categoriaAtiva]
  );

  const abrirProduto = (p: TotemMockProduto) => {
    setProdutoModal(p);
    setModalAberto(true);
  };

  const lancarCozinha = async () => {
    if (!Number.isFinite(n) || n <= 0 || carrinho.length === 0) return;
    setEnviando(true);
    try {
      const itens = carrinho.map((line) => {
        const pid = line.produto.produtoId?.trim();
        if (!pid) throw new Error(`Produto «${line.produto.nome}» sem produtoId no cardápio.`);
        const adicionais = Object.entries(line.adicionais)
          .filter(([, q]) => q > 0)
          .map(([adicionalCardapioId, quantidade]) => ({ adicionalCardapioId, quantidade }));
        const vu = line.quantidade > 0 ? line.subtotal / line.quantidade : line.subtotal;
        return {
          produtoId: pid,
          nome: line.produto.nome,
          itemCardapioId: line.produto.itemCardapioId ?? line.produto.id,
          quantidade: line.quantidade,
          observacao: line.observacao.trim() || undefined,
          adicionais: adicionais.length > 0 ? adicionais : undefined,
          valorUnitario: Math.round(vu * 100) / 100,
          valorTotal: line.subtotal,
        };
      });

      await api.post(`/api/mesas/${n}/adicionar`, { itens });
      toast.success('Pedido lançado na cozinha!');
      limparCarrinho();
      navigate(`/garcom/mesa/${n}`);
    } catch (e: unknown) {
      const msg =
        e && typeof e === 'object' && 'response' in e
          ? String((e as { response?: { data?: { error?: string } } }).response?.data?.error ?? '')
          : '';
      toast.error(msg || 'Falha ao lançar pedido.');
    } finally {
      setEnviando(false);
    }
  };

  if (!Number.isFinite(n) || n <= 0) {
    return (
      <div className="px-4 py-8 text-center text-slate-400">
        Mesa inválida.{' '}
        <Link to="/garcom/mesas" className="text-emerald-400">
          Voltar
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="sticky top-0 z-30 border-b border-white/10 bg-[#08101f]/95 backdrop-blur-md">
        <div className="flex items-center gap-2 px-3 py-3">
          <Link
            to={`/garcom/mesa/${n}`}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5"
          >
            <ArrowLeft className="h-5 w-5 text-white" />
          </Link>
          <div className="min-w-0 flex-1">
            <h2 className="font-black text-white">Cardápio · Mesa {String(n).padStart(2, '0')}</h2>
            <button
              type="button"
              onClick={() => setBandejaAberta(true)}
              className="mt-1 text-xs font-bold text-emerald-300"
            >
              Bandeja ({totalItens}) · {formatBrl(totalBandeja)}
            </button>
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto px-3 pb-2 scrollbar-none">
          {categorias.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategoriaAtiva(c.id)}
              className={`shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition ${
                categoriaAtiva === c.id
                  ? 'border-emerald-400/50 bg-emerald-500/25 text-emerald-100'
                  : 'border-white/10 bg-white/[0.05] text-white/70'
              }`}
            >
              {c.nome}
            </button>
          ))}
        </div>
      </div>

      {carregando ? (
        <div className="flex flex-col items-center gap-3 py-20">
          <Loader2 className="h-12 w-12 animate-spin text-emerald-400" />
          <p className="text-white/50">Carregando cardápio…</p>
        </div>
      ) : (
        <ul className="divide-y divide-white/10 px-3 pb-32">
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
                  <p className="mt-2 text-base font-semibold text-emerald-200">{formatBrl(p.precoBase)}</p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {totalItens > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 flex justify-center pb-[max(0.75rem,env(safe-area-inset-bottom))] pointer-events-none">
          <div className="pointer-events-auto w-full max-w-md px-4">
            <button
              type="button"
              onClick={() => setBandejaAberta(true)}
              className="flex min-h-[3.25rem] w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 text-base font-black text-white shadow-[0_12px_40px_rgba(16,185,129,0.45)]"
            >
              <ChefHat className="h-5 w-5" />
              Bandeja ({totalItens}) · {formatBrl(totalBandeja)}
            </button>
          </div>
        </div>
      )}

      {bandejaAberta && (
        <div
          className="fixed inset-0 z-[60] flex flex-col justify-end bg-black/60 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="garcom-bandeja-titulo"
        >
          <button
            type="button"
            className="flex-1 cursor-default"
            aria-label="Fechar"
            onClick={() => setBandejaAberta(false)}
          />
          <div className="max-h-[75vh] overflow-hidden rounded-t-3xl border border-white/10 bg-[#0b1324] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <h3 id="garcom-bandeja-titulo" className="text-lg font-black text-white">
                Bandeja
              </h3>
              <button
                type="button"
                onClick={() => setBandejaAberta(false)}
                className="rounded-lg px-3 py-1 text-sm font-bold text-slate-400"
              >
                Fechar
              </button>
            </div>
            <ul className="max-h-[40vh] overflow-y-auto divide-y divide-white/10 px-4">
              {carrinho.map((line) => (
                <li key={line.id} className="flex gap-3 py-3">
                  <div className="flex flex-col items-center gap-1">
                    <button
                      type="button"
                      className="h-8 w-8 rounded-lg bg-white/10 text-lg font-bold"
                      onClick={() => alterarQtd(line.id, 1)}
                    >
                      +
                    </button>
                    <span className="text-sm font-black text-white">{line.quantidade}</span>
                    <button
                      type="button"
                      className="h-8 w-8 rounded-lg bg-white/10 text-lg font-bold"
                      onClick={() => alterarQtd(line.id, -1)}
                    >
                      −
                    </button>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-white">{line.produto.nome}</p>
                    {line.observacao ? (
                      <p className="text-xs italic text-amber-200/80">Obs.: {line.observacao}</p>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => remover(line.id)}
                      className="mt-1 text-xs font-bold text-red-400"
                    >
                      Remover
                    </button>
                  </div>
                  <p className="shrink-0 text-sm font-bold text-emerald-200">{formatBrl(line.subtotal)}</p>
                </li>
              ))}
            </ul>
            <div className="border-t border-white/10 p-4">
              <p className="mb-3 text-center text-sm text-slate-400">
                Total bandeja: <span className="font-bold text-white">{formatBrl(totalBandeja)}</span>
              </p>
              <button
                type="button"
                disabled={enviando || carrinho.length === 0}
                onClick={() => void lancarCozinha()}
                className="flex min-h-[3.5rem] w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-base font-black text-white shadow-[0_12px_36px_rgba(139,92,246,0.4)] disabled:opacity-50"
              >
                {enviando ? <Loader2 className="h-5 w-5 animate-spin" /> : <ChefHat className="h-5 w-5" />}
                Lançar pedido na cozinha
              </button>
            </div>
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
          toast.success(`${quantidade}× ${produto.nome} na bandeja`);
        }}
      />
    </>
  );
}
