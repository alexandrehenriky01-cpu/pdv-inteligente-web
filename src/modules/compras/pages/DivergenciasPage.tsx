import { useEffect, useState } from 'react';
import { Layout } from '../../../components/Layout';
import { api } from '../../../services/api';
import {
  AlertOctagon,
  CheckCircle,
  Truck,
  FileText,
  Loader2,
  ShieldAlert,
  Sparkles,
  Shield,
  AlertTriangle,
} from 'lucide-react';
import { AxiosError } from 'axios';

export interface IFornecedorResumo {
  id: string;
  razaoSocial: string;
  nomeFantasia?: string;
}

export interface INotaFiscalDivergente {
  id: string;
  numero: string;
  serie: string;
  pedidoCompraId?: string;
  observacaoDivergencia?: string;
  fornecedor?: IFornecedorResumo;
}

interface IUsuarioStorage {
  role?: string;
  [key: string]: unknown;
}

export function DivergenciasPage() {
  const [divergencias, setDivergencias] = useState<INotaFiscalDivergente[]>([]);
  const [loading, setLoading] = useState(false);

  const usuarioLogado = JSON.parse(localStorage.getItem('@PDVUsuario') || '{}') as IUsuarioStorage;
  const isDiretoria =
    usuarioLogado.role === 'DIRETOR' ||
    usuarioLogado.role === 'GERENTE' ||
    usuarioLogado.role === 'SUPER_ADMIN';

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    setLoading(true);
    try {
      const res = await api.get<INotaFiscalDivergente[]>('/api/compras/recebimento/divergencias');
      setDivergencias(res.data);
    } catch (error) {
      console.error('Erro ao carregar divergências:', error);
    } finally {
      setLoading(false);
    }
  };

  const aprovarDivergencia = async (id: string) => {
    if (!window.confirm('ATENÇÃO: Ao aprovar, você aceita pagar a mais ou receber itens fora do pedido. Confirma a liberação desta NF?')) return;

    try {
      await api.put(`/api/compras/recebimento/notas/${id}/aprovar-divergencia`, {});
      alert('✅ Divergência aprovada! A nota fiscal foi liberada para o estoque e o financeiro gerado.');
      carregarDados();
    } catch (err) {
      const error = err as AxiosError<{ error?: string }>;
      alert(error.response?.data?.error || 'Erro ao aprovar divergência.');
    }
  };

  return (
    <Layout>
      <div className="mx-auto flex h-full max-w-7xl flex-col space-y-6 pb-12">
        <div className="relative overflow-hidden rounded-[30px] border border-rose-400/20 bg-[radial-gradient(circle_at_top_left,_rgba(244,63,94,0.14),_transparent_26%),linear-gradient(135deg,_#14080b_0%,_#0f0b14_45%,_#111827_100%)] p-6 shadow-[0_25px_70px_rgba(0,0,0,0.40)] sm:p-8">
          <div className="pointer-events-none absolute -left-10 top-0 h-52 w-52 rounded-full bg-rose-600/15 blur-[100px]" />
          <div className="pointer-events-none absolute right-0 top-0 h-56 w-56 rounded-full bg-orange-500/10 blur-[100px]" />

          <div className="relative z-10 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-rose-400/20 bg-rose-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-rose-300">
                <Sparkles className="h-3.5 w-3.5" />
                Auditoria crítica
              </div>

              <h1 className="flex items-center gap-4 text-3xl font-black tracking-tight text-white">
                <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 p-3 shadow-[0_0_20px_rgba(244,63,94,0.14)]">
                  <AlertOctagon className="h-8 w-8 text-rose-300" />
                </div>
                Auditoria de Doca
              </h1>

              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300 sm:text-[15px]">
                Notas fiscais retidas por divergência de preço, quantidade ou inconsistências
                em relação ao Pedido de Compra. Esta área exige validação crítica antes da liberação.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="h-8 w-2 rounded-full bg-gradient-to-b from-rose-400 to-orange-400" />
          <div>
            <h2 className="text-xl font-black tracking-tight text-white">
              Notas bloqueadas na doca
            </h2>
            <p className="text-sm text-slate-400">
              Itens retidos aguardando análise operacional e eventual liberação gerencial.
            </p>
          </div>
        </div>

        <div className="flex-1 space-y-6">
          {loading && divergencias.length === 0 ? (
            <div className="rounded-[30px] border border-white/10 bg-[#08101f]/90 p-12 text-center shadow-[0_20px_50px_rgba(0,0,0,0.35)]">
              <div className="flex flex-col items-center gap-4">
                <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 p-4">
                  <Loader2 className="h-8 w-8 animate-spin text-rose-300" />
                </div>
                <p className="text-base font-bold text-slate-300">
                  Buscando notas bloqueadas...
                </p>
              </div>
            </div>
          ) : divergencias.length === 0 ? (
            <div className="relative overflow-hidden rounded-[30px] border border-white/10 border-dashed bg-[#08101f]/90 py-20 text-center shadow-[0_20px_50px_rgba(0,0,0,0.35)]">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.10),_transparent_28%)]" />
              <div className="relative z-10 flex flex-col items-center">
                <div className="mb-4 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4">
                  <ShieldAlert className="h-12 w-12 text-emerald-300" />
                </div>
                <h3 className="mb-2 text-2xl font-black text-white">
                  Muralha fiscal limpa
                </h3>
                <p className="max-w-md text-base leading-7 text-slate-400">
                  Nenhuma divergência no momento. Todas as entregas estão batendo com os pedidos.
                </p>
              </div>
            </div>
          ) : (
            divergencias.map(nota => (
              <div
                key={nota.id}
                className="overflow-hidden rounded-[30px] border border-rose-400/20 bg-[#08101f]/90 shadow-[0_20px_50px_rgba(0,0,0,0.35)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-rose-400/30"
              >
                <div className="flex flex-col gap-4 border-b border-white/10 bg-black/10 p-6 md:flex-row md:items-start md:justify-between">
                  <div>
                    <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-rose-400/20 bg-rose-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.14)] animate-pulse">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Bloqueada na doca
                    </span>

                    <h3 className="text-xl font-black tracking-tight text-white">
                      NF-e: {nota.numero}
                      <span className="ml-2 text-sm font-bold text-slate-500">
                        (Série {nota.serie})
                      </span>
                    </h3>

                    <p className="mt-2 flex items-center gap-2 text-sm text-slate-400">
                      <Truck className="h-4 w-4 text-slate-500" />
                      Fornecedor:
                      <strong className="text-slate-200">
                        {nota.fornecedor?.nomeFantasia || nota.fornecedor?.razaoSocial}
                      </strong>
                    </p>
                  </div>

                  <div className="w-full rounded-2xl border border-white/10 bg-[#0b1324] p-4 md:w-auto md:min-w-[220px] md:text-right">
                    <p className="mb-1 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                      Pedido vinculado
                    </p>
                    <p className="flex items-center gap-2 text-lg font-black text-violet-300 md:justify-end">
                      <FileText className="h-5 w-5" />
                      PC #{nota.pedidoCompraId?.substring(0, 6).toUpperCase()}
                    </p>
                  </div>
                </div>

                <div className="p-6">
                  <div className="rounded-2xl border border-rose-400/15 bg-rose-500/10 p-5">
                    <p className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-rose-300">
                      <AlertOctagon className="h-4 w-4" />
                      Motivos do bloqueio
                    </p>

                    <ul className="space-y-2 text-sm font-medium text-rose-100">
                      {nota.observacaoDivergencia?.split('|').map((obs: string, i: number) => (
                        <li key={i} className="flex items-start gap-3 leading-7">
                          <span className="mt-[9px] h-2 w-2 shrink-0 rounded-full bg-rose-300" />
                          <span>{obs.trim()}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {isDiretoria ? (
                    <div className="mt-6 flex flex-col gap-4 border-t border-white/10 pt-6 sm:flex-row sm:justify-end">
                      <button
                        onClick={() => aprovarDivergencia(nota.id)}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-rose-400/20 bg-gradient-to-r from-rose-600 to-red-500 px-8 py-3.5 font-black text-white shadow-[0_0_25px_rgba(244,63,94,0.22)] transition-all hover:scale-[1.02] hover:brightness-110"
                      >
                        <CheckCircle className="h-5 w-5" />
                        Assumir risco e liberar nota
                      </button>
                    </div>
                  ) : (
                    <div className="mt-6 border-t border-white/10 pt-6">
                      <div className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-black/10 px-4 py-4 text-center text-sm text-slate-400">
                        <Shield className="h-4 w-4 text-slate-500" />
                        Aguardando liberação da Diretoria/Gerência para dar entrada nesta nota.
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
}