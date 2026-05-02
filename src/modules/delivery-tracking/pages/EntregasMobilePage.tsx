import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Map as MapIcon,
  CheckCircle,
  Package,
  User,
  MapPin,
  Phone,
  Navigation,
  Loader2,
  RefreshCw,
  MessageCircle,
  Car,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { Layout } from '../../../components/Layout';
import type { RotaPublicaResponse } from '../types/rotaPublica.types';
import { resolveApiBaseUrl } from '../../../services/apiBaseUrl';

// URL absoluta para o host da API. Em produção o frontend está em
// `app.aurya...` e a API em domínio separado, então fetch com path
// relativo bate no host errado e retorna 405/404. Idêntico ao fix
// aplicado em criarRomaneio (cupomTemplateService.ts).
const API_BASE = resolveApiBaseUrl().replace(/\/$/, '');

interface Parada {
  pedidoId: string;
  numeroPedido: number | null;
  numeroVenda: number;
  clienteNome: string | null;
  clienteTelefone: string | null;
  endereco: string;
  valorReceber: number;
  observacoes?: string | null;
  status: 'PENDENTE' | 'ENTREGUE';
  /** `ordemParada` do romaneio (API pública). */
  ordemRomaneio?: number;
}

interface RomaneioData {
  uuid: string;
  lojaNome: string;
  dataRota?: string;
  horaSaida?: string;
  paradas: Parada[];
}

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function limparTelefone(telefone: string | null | undefined): string {
  if (!telefone) return '';
  return telefone.replace(/\D/g, '');
}

export function EntregasMobilePage() {
  const { token } = useParams<{ token: string }>();
  const [romaneio, setRomaneio] = useState<RomaneioData | null>(null);
  const [rotaPublica, setRotaPublica] = useState<RotaPublicaResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const carregarRomaneio = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const [response, responseRota] = await Promise.all([
        fetch(`${API_BASE}/api/public/romaneio/${token}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        }),
        fetch(`${API_BASE}/api/entregas/public/romaneio/${token}/rota-url`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        }),
      ]);

      const data = await response.json();

      if (!response.ok || !data.sucesso) {
        toast.error(data.error || data.erro || 'Romaneio não encontrado');
        setRotaPublica(null);
        return;
      }

      const nested = data.romaneio as
        | {
            token: string;
            lojaNome: string;
            paradas: Parada[];
          }
        | undefined;

      if (nested?.token && nested.paradas) {
        setRomaneio({
          uuid: nested.token.startsWith('rom_')
            ? nested.token.slice(4).toUpperCase()
            : nested.token.toUpperCase(),
          lojaNome: nested.lojaNome,
          paradas: nested.paradas,
        });
      } else {
        toast.error('Resposta do romaneio inválida');
      }

      const rotaJson = (await responseRota.json()) as RotaPublicaResponse;
      if (responseRota.ok && rotaJson.sucesso) {
        setRotaPublica(rotaJson);
      } else {
        setRotaPublica(null);
      }
    } catch (e) {
      console.error('Erro ao carregar romaneio:', e);
      toast.error('Erro ao carregar romaneio');
      setRotaPublica(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void carregarRomaneio();
  }, [carregarRomaneio]);

  const sequenciaPorPedido = useMemo(() => {
    const m = new Map<string, { ordemOtimizada: number; ordemOriginal: number }>();
    rotaPublica?.sequenciaOtimizada?.forEach((s) => {
      m.set(s.pedidoId, {
        ordemOtimizada: s.ordemOtimizada,
        ordemOriginal: s.ordemOriginal,
      });
    });
    return m;
  }, [rotaPublica]);

  const rankPorRomaneio = useMemo(() => {
    const m = new Map<string, number>();
    const sorted = [...(romaneio?.paradas ?? [])].sort(
      (a, b) => (a.ordemRomaneio ?? 0) - (b.ordemRomaneio ?? 0)
    );
    sorted.forEach((p, i) => {
      m.set(p.pedidoId, i);
    });
    return m;
  }, [romaneio?.paradas]);

  const rankPorSequencia = useMemo(() => {
    const m = new Map<string, number>();
    rotaPublica?.sequenciaOtimizada?.forEach((s, i) => {
      m.set(s.pedidoId, i);
    });
    return m;
  }, [rotaPublica?.sequenciaOtimizada]);

  /** Navegação pública por parada — sem JWT (link direto Waze). */
  const abrirRotaParadaWaze = (endereco: string) => {
    const linha = (endereco ?? '').trim();
    if (!linha) {
      toast.error('Endereço não disponível');
      return;
    }
    const destino = encodeURIComponent(linha);
    const wazeUrl = `https://www.waze.com/ul?q=${destino}&navigate=yes`;
    window.open(wazeUrl, '_blank', 'noopener,noreferrer');
  };

  const abrirWhatsApp = (telefone: string | null, nomeCliente: string | null) => {
    const telefoneLimpo = limparTelefone(telefone);
    if (!telefoneLimpo) {
      toast.error('Telefone não disponível');
      return;
    }
    const mensagem = `Olá ${nomeCliente || 'cliente'}, sou entregador da ${romaneio?.lojaNome || 'loja'} e estou a caminho do seu pedido!`;
    const url = `https://wa.me/55${telefoneLimpo}?text=${encodeURIComponent(mensagem)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleConfirmarEntrega = async (pedidoId: string) => {
    const confirmed = window.confirm('Confirmar entrega deste pedido?');
    if (!confirmed) return;

    setLoadingAction(pedidoId);
    try {
      const response = await fetch(`${API_BASE}/api/public/romaneio/${token}/entregar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pedidoId }),
      });

      const data = await response.json();

      if (!response.ok || !data.sucesso) {
        toast.error(data.error || 'Erro ao confirmar entrega');
        return;
      }

      toast.success('Entrega confirmada!');
      void carregarRomaneio();
    } catch (e) {
      console.error('Erro ao confirmar entrega:', e);
      toast.error('Erro ao confirmar entrega');
    } finally {
      setLoadingAction(null);
    }
  };

  const pendentes = useMemo(() => {
    const raw = romaneio?.paradas.filter((p) => p.status === 'PENDENTE') || [];
    const seq = rotaPublica?.sequenciaOtimizada;
    if (!seq?.length) {
      return [...raw].sort((a, b) => (a.ordemRomaneio ?? 0) - (b.ordemRomaneio ?? 0));
    }
    const rank = new Map(seq.map((s) => [s.pedidoId, s.ordemOtimizada] as const));
    return [...raw].sort((a, b) => (rank.get(a.pedidoId) ?? 9999) - (rank.get(b.pedidoId) ?? 9999));
  }, [romaneio?.paradas, rotaPublica?.sequenciaOtimizada]);

  const entregues = romaneio?.paradas.filter((p) => p.status === 'ENTREGUE') || [];

  const totalReceber = romaneio?.paradas
    .filter((p) => p.status === 'PENDENTE')
    .reduce((sum, p) => sum + (p.valorReceber || 0), 0) || 0;

  // Acesso via QR Code (token na URL) → entregador NÃO está logado no ERP,
  // renderiza limpo sem sidebar/header administrativo. Sem token → dashboard
  // interno usa o Layout admin com menu lateral.
  const ehAcessoPublico = Boolean(token);

  const conteudo = (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white pb-24">
        <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur-md border-b border-white/10 px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-black tracking-tight">
                {romaneio?.lojaNome || 'Entregas'}
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                {pendentes.length} pendente · {entregues.length} entregue
              </p>
            </div>
            <button
              type="button"
              onClick={() => void carregarRomaneio()}
              className="p-3 rounded-full bg-white/10 active:bg-white/20 transition-colors"
              aria-label="Atualizar"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
          {totalReceber > 0 && (
            <div className="mt-3 flex items-center justify-between bg-emerald-500/20 rounded-xl px-4 py-2 border border-emerald-500/30">
              <span className="text-xs text-emerald-300 uppercase font-bold">Total a Receber</span>
              <span className="text-lg font-black text-emerald-300">{formatCurrency(totalReceber)}</span>
            </div>
          )}

          {romaneio && rotaPublica?.googleMapsUrl ? (
            <div className="mt-3 grid grid-cols-1 gap-2">
              <button
                type="button"
                onClick={() =>
                  window.open(rotaPublica.googleMapsUrl, '_blank', 'noopener,noreferrer')
                }
                className="flex items-center justify-center gap-2 w-full rounded-xl bg-sky-600/40 hover:bg-sky-600/60 border border-sky-500/40 text-sky-100 text-xs font-black uppercase tracking-wide py-3 px-3 transition-colors"
              >
                <MapIcon className="w-4 h-4 shrink-0" />
                Rota completa no Google Maps
              </button>
              {rotaPublica.wazeProximaEntregaUrl ? (
                <button
                  type="button"
                  onClick={() => {
                    const url = rotaPublica.wazeProximaEntregaUrl;
                    if (url) window.open(url, '_blank', 'noopener,noreferrer');
                  }}
                  className="flex items-center justify-center gap-2 w-full rounded-xl bg-violet-600/40 hover:bg-violet-600/60 border border-violet-500/40 text-violet-100 text-xs font-black uppercase tracking-wide py-3 px-3 transition-colors"
                >
                  <Car className="w-4 h-4 shrink-0" />
                  Próxima entrega no Waze
                </button>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="p-4 space-y-6">
          {loading && !romaneio ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-12 h-12 text-amber-400 animate-spin mb-4" />
              <p className="text-slate-400">Carregando romaneio...</p>
            </div>
          ) : !token ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Package className="w-16 h-16 text-slate-600 mb-4" />
              <h2 className="text-lg font-bold text-slate-300">Acesse via QR Code</h2>
              <p className="text-sm text-slate-500 mt-2">
                Escaneie o QR Code do romaneio para acessar suas entregas
              </p>
            </div>
          ) : romaneio?.paradas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Package className="w-16 h-16 text-slate-600 mb-4" />
              <h2 className="text-lg font-bold text-slate-300">Romaneio vazio</h2>
              <p className="text-sm text-slate-500 mt-2">
                Nenhum pedido neste romaneio
              </p>
            </div>
          ) : (
            <>
              {pendentes.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <Navigation className="w-4 h-4 text-amber-400" />
                    <h2 className="text-sm font-black uppercase tracking-wider text-amber-300">
                      Próximas Entregas
                    </h2>
                    <span className="ml-auto bg-amber-500/20 text-amber-300 text-xs font-bold px-2 py-1 rounded-full">
                      {pendentes.length}
                    </span>
                  </div>
                  <div className="space-y-4">
                    {pendentes.map((parada, index) => {
                      const meta = sequenciaPorPedido.get(parada.pedidoId);
                      const ordemExibir =
                        meta?.ordemOtimizada ?? parada.ordemRomaneio ?? index + 1;
                      const mostrarBadgeOtimizado =
                        rotaPublica?.heuristicaRotaAtiva === true &&
                        rankPorRomaneio.get(parada.pedidoId) !==
                          rankPorSequencia.get(parada.pedidoId);
                      return (
                        <ParadaCard
                          key={parada.pedidoId}
                          parada={parada}
                          indice={ordemExibir}
                          mostrarBadgeOtimizado={mostrarBadgeOtimizado}
                          isLoading={loadingAction === parada.pedidoId}
                          onAbrirRota={() => abrirRotaParadaWaze(parada.endereco)}
                          onWhatsApp={() => abrirWhatsApp(parada.clienteTelefone, parada.clienteNome)}
                          onConfirmar={() => handleConfirmarEntrega(parada.pedidoId)}
                        />
                      );
                    })}
                  </div>
                </section>
              )}

              {entregues.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    <h2 className="text-sm font-black uppercase tracking-wider text-emerald-300">
                      Entregues
                    </h2>
                    <span className="ml-auto bg-emerald-500/20 text-emerald-300 text-xs font-bold px-2 py-1 rounded-full">
                      {entregues.length}
                    </span>
                  </div>
                  <div className="space-y-4">
                    {entregues.map((parada) => (
                      <ParadaCard
                        key={parada.pedidoId}
                        parada={parada}
                        indice={-1}
                        isLoading={false}
                        isEntregue
                      />
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </div>
  );

  return ehAcessoPublico ? conteudo : <Layout>{conteudo}</Layout>;
}

interface ParadaCardProps {
  parada: Parada;
  indice: number;
  /** Quando a sequência sugerida difere da ordem do romaneio. */
  mostrarBadgeOtimizado?: boolean;
  isLoading: boolean;
  isEntregue?: boolean;
  onAbrirRota?: () => void;
  onWhatsApp?: () => void;
  onConfirmar?: () => void;
}

function ParadaCard({
  parada,
  indice,
  mostrarBadgeOtimizado,
  isLoading,
  isEntregue,
  onAbrirRota,
  onWhatsApp,
  onConfirmar,
}: ParadaCardProps) {
  const numeroPedido = parada.numeroPedido || parada.numeroVenda || '';

  return (
    <div className={`bg-white/5 rounded-3xl border border-white/10 overflow-hidden shadow-xl ${isEntregue ? 'opacity-60' : ''}`}>
      <div className="bg-gradient-to-r from-amber-600/20 to-orange-600/20 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {indice > 0 ? (
            <div className="w-10 h-10 rounded-2xl bg-amber-500/30 flex items-center justify-center">
              <span className="text-lg font-black text-amber-200">{indice}</span>
            </div>
          ) : (
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/30 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-emerald-300" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-white">#{numeroPedido}</span>
              {mostrarBadgeOtimizado ? (
                <small className="text-amber-300/90 font-semibold uppercase tracking-wide">
                  (otimizado)
                </small>
              ) : null}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <User className="w-3 h-3 text-slate-400" />
              <span className="text-xs text-slate-400">
                {parada.clienteNome || 'Cliente'}
              </span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-400 uppercase tracking-wider">Receber</p>
          <p className="text-xl font-black text-emerald-400">
            {formatCurrency(parada.valorReceber)}
          </p>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-500/20 flex items-center justify-center shrink-0">
            <MapPin className="w-5 h-5 text-sky-400" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Endereço</p>
            <p className="text-sm text-white leading-relaxed">
              {parada.endereco || 'Endereço não disponível'}
            </p>
          </div>
        </div>

        {parada.observacoes && (
          <div className="bg-amber-500/10 rounded-xl p-3 border border-amber-500/20">
            <p className="text-xs text-amber-400 font-bold uppercase tracking-wider mb-1">
              Observação
            </p>
            <p className="text-sm text-amber-100">{parada.observacoes}</p>
          </div>
        )}

        {parada.clienteTelefone && !isEntregue && (
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Phone className="w-3 h-3" />
            <span>{parada.clienteTelefone}</span>
          </div>
        )}

        {!isEntregue && (
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              disabled={isLoading}
              onClick={() => onAbrirRota?.()}
              className="flex flex-col items-center gap-1 bg-violet-600/30 hover:bg-violet-600/50 border border-violet-500/30 text-violet-200 font-bold text-xs py-3 px-2 rounded-xl transition-all disabled:opacity-50"
            >
              <Car className="w-5 h-5" />
              <span>Waze</span>
            </button>
            <button
              type="button"
              disabled={isLoading}
              onClick={() => void onWhatsApp?.()}
              className="flex flex-col items-center gap-1 bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/30 text-emerald-200 font-bold text-xs py-3 px-2 rounded-xl transition-all disabled:opacity-50"
            >
              <MessageCircle className="w-5 h-5" />
              <span>WhatsApp</span>
            </button>
            <button
              type="button"
              disabled={isLoading}
              onClick={() => void onConfirmar?.()}
              className="flex flex-col items-center gap-1 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-xs py-3 px-2 rounded-xl shadow-lg shadow-emerald-500/30 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  <span>Entregue</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}