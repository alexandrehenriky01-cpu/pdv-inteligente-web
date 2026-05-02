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
    <div className="min-h-screen bg-bg-base text-text-primary font-sans antialiased">
      <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col">
        <header className="sticky top-0 z-50 bg-bg-base/95 backdrop-blur-xl border-b border-bg-border">
          <div className="flex items-center gap-3 p-4">
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full bg-bg-raised ring-1 ring-bg-border">
              {loja?.logoUrl ? (
                <img src={loja.logoUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <Store className="h-6 w-6 text-text-secondary" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-base font-bold uppercase tracking-wide text-text-primary">
                {carregandoLoja ? 'Carregando…' : loja?.nome ?? 'Delivery'}
              </h1>
              <div className="mt-1 flex items-center gap-2 min-w-0">
                {loja && (
                  <span
                    className={`inline-flex shrink-0 items-center gap-1 rounded-pill px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      loja.aberto ? 'bg-price/15 text-price' : 'bg-danger/15 text-danger'
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        loja.aberto
                          ? 'bg-price shadow-[0_0_8px_rgba(34,224,107,0.7)] animate-pulse'
                          : 'bg-danger'
                      }`}
                      aria-hidden
                    />
                    {loja.aberto ? 'Aberto' : 'Fechado'}
                  </span>
                )}
                {loja?.endereco && (
                  <span className="truncate text-[11px] text-text-muted">{loja.endereco}</span>
                )}
                {!carregandoLoja && erroLoja && (
                  <span className="truncate text-[11px] text-danger">{erroLoja}</span>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="min-h-0 flex-1">
          <Outlet context={ctx} />
        </main>

        <footer className="border-t border-bg-border/40 px-4 py-3 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-text-muted">
            <span className="text-accent-purple">Aurya</span>
            <span className="mx-1.5 text-bg-border">•</span>
            Gestão de cardápio online
          </p>
        </footer>
      </div>
    </div>
  );
}
