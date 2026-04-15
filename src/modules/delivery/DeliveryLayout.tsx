import { useEffect, useMemo, useState } from 'react';
import { Outlet, useParams, useSearchParams } from 'react-router-dom';
import { Store } from 'lucide-react';
import { api } from '../../services/api';
import type { DeliveryOutletContext, LojaDeliveryPublic } from './deliveryOutletContext';

export function DeliveryLayout() {
  const { slug: slugParam } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const lojaPublicKey = slugParam?.trim() ?? '';

  const estacaoTrabalhoId = useMemo(() => {
    const q = searchParams.get('estacao')?.trim();
    if (q) return q;
    const env = (import.meta.env.VITE_DELIVERY_ESTACAO_TRABALHO_ID as string | undefined)?.trim();
    return env || undefined;
  }, [searchParams]);

  const [loja, setLoja] = useState<LojaDeliveryPublic | null>(null);
  const [carregandoLoja, setCarregandoLoja] = useState(true);
  const [erroLoja, setErroLoja] = useState<string | null>(null);

  useEffect(() => {
    if (!lojaPublicKey) {
      setCarregandoLoja(false);
      setErroLoja('Loja não informada.');
      setLoja(null);
      return;
    }

    let ativo = true;
    (async () => {
      setCarregandoLoja(true);
      setErroLoja(null);
      try {
        const { data } = await api.get<LojaDeliveryPublic>(
          `/api/public/delivery/loja/${encodeURIComponent(lojaPublicKey)}`
        );
        if (ativo) setLoja(data);
      } catch {
        if (ativo) {
          setLoja(null);
          setErroLoja('Não foi possível carregar esta loja.');
        }
      } finally {
        if (ativo) setCarregandoLoja(false);
      }
    })();

    return () => {
      ativo = false;
    };
  }, [lojaPublicKey]);

  const ctx: DeliveryOutletContext = {
    lojaPublicKey,
    loja,
    carregandoLoja,
    erroLoja,
    estacaoTrabalhoId,
  };

  return (
    <div className="min-h-screen bg-[#060816] text-white antialiased">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(139,92,246,0.1),transparent_45%)]" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col shadow-[0_0_80px_rgba(0,0,0,0.35)]">
        <header className="sticky top-0 z-50 border-b border-white/10 bg-[#08101f]/92 backdrop-blur-xl">
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white/[0.06]">
              {loja?.logoUrl ? (
                <img src={loja.logoUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <Store className="h-6 w-6 text-violet-300" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-lg font-semibold leading-tight">
                {carregandoLoja ? 'Carregando…' : loja?.nome ?? 'Delivery'}
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                {loja && (
                  <span
                    className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
                      loja.aberto
                        ? 'border-emerald-500/35 bg-emerald-500/15 text-emerald-200'
                        : 'border-amber-500/35 bg-amber-500/12 text-amber-100'
                    }`}
                  >
                    {loja.aberto ? 'Aberto' : 'Fechado'}
                  </span>
                )}
                {!carregandoLoja && erroLoja && (
                  <span className="text-[11px] text-red-300/90">{erroLoja}</span>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="min-h-0 flex-1">
          <Outlet context={ctx} />
        </main>
      </div>
    </div>
  );
}
