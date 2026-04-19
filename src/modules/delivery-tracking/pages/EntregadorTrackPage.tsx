import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  MapPin,
  Phone,
  Navigation,
  CheckCircle,
  Loader2,
  Package,
  Map,
  MessageCircle,
  DollarSign,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { api } from '../../../services/api';

interface EntregaItem {
  pedidoId: string;
  numeroPedido: number | null;
  clienteNome: string;
  telefoneCliente?: string;
  endereco: string;
  valorReceber: number;
  statusEntrega?: string;
}

interface RomaneioData {
  sucesso: boolean;
  token: string;
  status: string;
  lojaNome: string;
  lojaTelefone?: string;
  totalPedidos: number;
  totalReceber: number;
  entregas: EntregaItem[];
  error?: string;
}

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function getBairro(endereco: string): string {
  const parts = endereco.split(',');
  return parts.length > 1 ? parts[parts.length - 1].trim() : endereco;
}

export function EntregadorTrackPage() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [romaneio, setRomaneio] = useState<RomaneioData | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const carregarRomaneio = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setErro(null);

    try {
      const { data } = await api.get<RomaneioData>(`/api/vendas/gestao-food/public/romaneio/${token}`);

      if (!data.sucesso) {
        setErro(data.error || 'Erro ao carregar romaneio');
        return;
      }

      setRomaneio(data);
    } catch (e) {
      console.error('[Track] Erro:', e);
      setErro('Link inválido ou expirado');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void carregarRomaneio();
  }, [carregarRomaneio]);

  const confirmarEntrega = async (pedidoId: string) => {
    if (!token || !romaneio) return;
    setSubmitting(pedidoId);

    try {
      const { data } = await api.post<{ sucesso: boolean; error?: string }>(
        `/api/vendas/gestao-food/public/romaneio/${token}/entregar`,
        { pedidoId }
      );

      if (!data.sucesso) {
        toast.error(data.error || 'Erro ao confirmar');
        return;
      }

      toast.success('✅ Entrega confirmada!');

      setRomaneio((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          entregas: prev.entregas.map((e) =>
            e.pedidoId === pedidoId ? { ...e, statusEntrega: 'ENTREGUE' } : e
          ),
        };
      });
    } catch (e) {
      console.error('[Track] Erro confirmar:', e);
      toast.error('Erro ao confirmar entrega');
    } finally {
      setSubmitting(null);
    }
  };

  const abrirMapa = (endereco: string) => {
    const encoded = encodeURIComponent(endereco);
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${encoded}`, '_blank');
  };

  const abrirWhatsApp = (telefone: string) => {
    const numeros = telefone.replace(/\D/g, '');
    if (!numeros) return;
    window.open(`https://wa.me/55${numeros}`, '_blank');
  };

  const ligacaoTelefone = (telefone: string) => {
    const numeros = telefone.replace(/\D/g, '');
    if (!numeros) return;
    window.location.href = `tel:${numeros}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-sky-500 animate-spin" />
      </div>
    );
  }

  if (erro) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
        <div className="text-center">
          <Package className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">Ops!</h1>
          <p className="text-slate-400">{erro}</p>
        </div>
      </div>
    );
  }

  const entregasPendentes = romaneio?.entregas.filter((e) => e.statusEntrega !== 'ENTREGUE') || [];
  const entregasConcluidas = romaneio?.entregas.filter((e) => e.statusEntrega === 'ENTREGUE') || [];
  const totalReceber = romaneio?.entregas.reduce((sum, e) => sum + e.valorReceber, 0) || 0;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="bg-gradient-to-b from-sky-900 to-slate-950 pb-6">
        <div className="p-4 pb-2">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black">{romaneio?.lojaNome}</h1>
              <p className="text-slate-400 text-sm">
                {romaneio?.totalPedidos} entregas • {formatCurrency(totalReceber)}
              </p>
            </div>
            {romaneio?.lojaTelefone && (
              <button
                onClick={() => ligacaoTelefone(romaneio.lojaTelefone!)}
                className="p-3 bg-green-600 rounded-full"
              >
                <Phone className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 px-4 mt-4">
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <p className="text-2xl font-black text-amber-400">{entregasPendentes.length}</p>
            <p className="text-xs text-slate-400">Pendentes</p>
          </div>
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <p className="text-2xl font-black text-emerald-400">{entregasConcluidas.length}</p>
            <p className="text-xs text-slate-400">Entregues</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {entregasPendentes.map((entrega, idx) => (
          <div
            key={entrega.pedidoId}
            className="bg-slate-900 rounded-2xl p-4 border border-slate-800"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-sky-600 flex items-center justify-center font-bold">
                  {idx + 1}
                </div>
                <div>
                  <p className="font-bold">
                    #{entrega.numeroPedido || entrega.pedidoId.slice(0, 6)}
                  </p>
                  <p className="text-sm text-slate-400">{entrega.clienteNome}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-black text-emerald-400">{formatCurrency(entrega.valorReceber)}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-slate-400 text-sm mb-3">
              <MapPin className="w-4 h-4 shrink-0" />
              <span>{getBairro(entrega.endereco)}</span>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => abrirMapa(entrega.endereco)}
                className="flex-1 flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-500 py-3 rounded-xl font-bold transition-colors"
              >
                <Navigation className="w-4 h-4" />
                Rota
              </button>
              {entrega.telefoneCliente && (
                <button
                  onClick={() => abrirWhatsApp(entrega.telefoneCliente!)}
                  className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 py-3 rounded-xl font-bold transition-colors"
                >
                  <MessageCircle className="w-4 h-4" />
                  Whats
                </button>
              )}
              <button
                onClick={() => confirmarEntrega(entrega.pedidoId)}
                disabled={submitting === entrega.pedidoId}
                className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 py-3 rounded-xl font-bold transition-colors disabled:opacity-50"
              >
                {submitting === entrega.pedidoId ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Finalizar
                  </>
                )}
              </button>
            </div>
          </div>
        ))}

        {entregasConcluidas.length > 0 && (
          <div className="mt-6">
            <h2 className="text-sm font-bold text-slate-500 mb-3">ENTREGUES</h2>
            <div className="space-y-2">
              {entregasConcluidas.map((entrega) => (
                <div
                  key={entrega.pedidoId}
                  className="bg-slate-900/50 rounded-xl p-3 flex items-center justify-between opacity-60"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-emerald-500" />
                    <span className="font-medium">
                      #{entrega.numeroPedido || entrega.pedidoId.slice(0, 6)}
                    </span>
                    <span className="text-slate-400">{entrega.clienteNome}</span>
                  </div>
                  <span className="text-emerald-400 font-bold">
                    {formatCurrency(entrega.valorReceber)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {romaneio?.entregas.length === 0 && (
          <div className="text-center py-12">
            <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
            <p className="text-xl font-bold">Todas as entregas foram feitas!</p>
            <p className="text-slate-400 mt-2">Obrigado pelo trabalho! 🚀</p>
          </div>
        )}
      </div>
    </div>
  );
}