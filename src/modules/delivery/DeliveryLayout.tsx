import { useEffect, useMemo, useState } from 'react';
import { Outlet, useParams, useSearchParams } from 'react-router-dom';
import { Store } from 'lucide-react';
import { api } from '../../services/api';
import type { DeliveryOutletContext, LojaDeliveryPublic } from './deliveryOutletContext';

if (typeof window !== 'undefined' && window.location.hash.includes('//')) {
  window.location.hash = window.location.hash.replace(/\/+/g, '/');
}

export function DeliveryLayout() {
  const { slug: slugParam } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const lojaPublicKey = slugParam?.trim() ?? '';

  const estacaoParam = searchParams.get('estacao')?.trim();
  const estacaoEnv = (import.meta.env.VITE_DELIVERY_ESTACAO_TRABALHO_ID as string | undefined)?.trim();

  const [estacaoTrabalhoId, setEstacaoTrabalhoId] = useState<string | undefined>(() => {
    if (estacaoParam) return estacaoParam;
    if (estacaoEnv) return estacaoEnv;
    return undefined;
  });

  const [loja, setLoja] = useState<LojaDeliveryPublic | null>(null);
  const [carregandoLoja, setCarregandoLoja] = useState(true);
  const [erroLoja, setErroLoja] = useState<string | null>(null);

  const buscarLoja = async (signal?: AbortSignal): Promise<LojaDeliveryPublic | null> => {
    const timestamp = Date.now();
    const { data } = await api.get<LojaDeliveryPublic>(
      `/api/public/delivery/loja/${encodeURIComponent(lojaPublicKey)}?_=${timestamp}`,
      { signal }
    );
    return data;
  };

  useEffect(() => {
    if (!lojaPublicKey) {
      setCarregandoLoja(false);
      setErroLoja('Loja não informada.');
      setLoja(null);
      return;
    }

    const controller = new AbortController();
    let ativo = true;

    (async () => {
      setCarregandoLoja(true);
      setErroLoja(null);
      try {
        const data = await buscarLoja(controller.signal);
        if (ativo && data) setLoja(data);

        if (!estacaoParam && !estacaoEnv && data?.id) {
          try {
            const timestamp = Date.now();
            const estacoesRes = await api.get<{ estacaoId: string | null }>(
              `/api/public/delivery/estacao-padrao/${encodeURIComponent(lojaPublicKey)}?_=${timestamp}`,
              { signal: controller.signal }
            );
            if (estacoesRes.data?.estacaoId) {
              setEstacaoTrabalhoId(estacoesRes.data.estacaoId);
              localStorage.setItem('estacao_trabalho', estacoesRes.data.estacaoId);
            } else {
              const estacaoTemp = '00000000-0000-0000-0000-000000000000';
              setEstacaoTrabalhoId(estacaoTemp);
              localStorage.setItem('estacao_trabalho', estacaoTemp);
            }
          } catch {
            const estacaoTemp = '00000000-0000-0000-0000-000000000000';
            setEstacaoTrabalhoId(estacaoTemp);
            localStorage.setItem('estacao_trabalho', estacaoTemp);
          }
        }
      } catch {
        if (ativo) {
          setLoja(null);
          setErroLoja('Estamos preparando o cardápio para você. Tente novamente em instantes.');
        }
      } finally {
        if (ativo) setCarregandoLoja(false);
      }
    })();

    return () => {
      ativo = false;
      controller.abort();
    };
  }, [lojaPublicKey, estacaoParam, estacaoEnv]);

  useEffect(() => {
    if (!lojaPublicKey) return;

    const intervalId = setInterval(async () => {
      try {
        const data = await buscarLoja();
        if (data) {
          setLoja((prev) => {
            if (!prev) return data;
            if (prev.aberto !== data.aberto) {
              console.log('[DeliveryLayout] Status da loja atualizado:', data.aberto ? 'ABERTO' : 'FECHADO');
            }
            return data;
          });
        }
      } catch {
        console.warn('[DeliveryLayout] Falha ao revalidar status da loja');
      }
    }, 60000);

    return () => clearInterval(intervalId);
  }, [lojaPublicKey]);

  useEffect(() => {
    if (estacaoTrabalhoId) {
      localStorage.setItem('estacao_trabalho', estacaoTrabalhoId);
    }
  }, [estacaoTrabalhoId]);

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
          <div className="flex items-center gap-4 px-4 py-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-violet-500/50 bg-[#0b1324] shadow-[0_0_20px_rgba(139,92,246,0.3)]">
              {loja?.logoUrl ? (
                <img src={loja.logoUrl} alt="" className="h-full w-full object-cover rounded-full" />
              ) : (
                <Store className="h-8 w-8 text-violet-300" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="truncate font-black text-2xl leading-tight text-white">
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
