import { useCallback, useEffect, useState } from 'react';
import { Bike, CheckCircle2, Loader2, LogOut, PackageCheck, RefreshCw } from 'lucide-react';
import { toast } from 'react-toastify';
import { Layout } from '../../../components/Layout';
import {
  type EntregadorCaixa,
  type RomaneioCaixaResumo,
  finalizarRomaneio,
  listarEntregadores,
  listarRomaneiosCaixa,
  registrarSaidaRomaneio,
} from '../services/caixaMotoqueiroService';

type Aba = 'saida' | 'retorno';

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export function CaixaMotoqueiroPage() {
  const [aba, setAba] = useState<Aba>('saida');
  const [loading, setLoading] = useState(true);
  const [romaneios, setRomaneios] = useState<RomaneioCaixaResumo[]>([]);
  const [entregadores, setEntregadores] = useState<EntregadorCaixa[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [selecaoEntregador, setSelecaoEntregador] = useState<Record<string, string>>({});

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const statusFiltro = aba === 'saida' ? 'ABERTO' : 'EM_ROTA';
      const [list, ents] = await Promise.all([
        listarRomaneiosCaixa(statusFiltro),
        aba === 'saida' ? listarEntregadores() : Promise.resolve([] as EntregadorCaixa[]),
      ]);
      setRomaneios(list);
      if (aba === 'saida') setEntregadores(ents);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao carregar romaneios.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [aba]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const handleSair = async (romaneioId: string) => {
    const entregadorId = selecaoEntregador[romaneioId];
    if (!entregadorId) {
      toast.warn('Selecione um entregador antes de registrar a saída.');
      return;
    }
    setSavingId(romaneioId);
    try {
      await registrarSaidaRomaneio(romaneioId, entregadorId);
      toast.success('Saída registrada — romaneio em rota.');
      await carregar();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao registrar saída.';
      toast.error(msg);
    } finally {
      setSavingId(null);
    }
  };

  const handleFinalizar = async (romaneioId: string) => {
    setSavingId(romaneioId);
    try {
      await finalizarRomaneio(romaneioId);
      toast.success('Romaneio finalizado.');
      await carregar();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao finalizar romaneio.';
      toast.error(msg);
    } finally {
      setSavingId(null);
    }
  };

  return (
    <Layout>
      <div className="px-4 py-6 lg:px-8">
        <header className="mb-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-500/15 p-2 text-amber-300">
              <Bike className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-slate-100">Caixa do Motoqueiro</h1>
              <p className="text-sm text-slate-400">
                Registro de saída e retorno dos romaneios de delivery.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void carregar()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 hover:bg-slate-700 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        </header>

        <div className="mb-4 inline-flex rounded-lg border border-slate-700 bg-slate-900 p-1">
          <button
            type="button"
            onClick={() => setAba('saida')}
            className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition ${
              aba === 'saida' ? 'bg-amber-500 text-slate-950' : 'text-slate-300 hover:text-slate-100'
            }`}
          >
            <LogOut className="h-4 w-4" />
            Saída
          </button>
          <button
            type="button"
            onClick={() => setAba('retorno')}
            className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition ${
              aba === 'retorno' ? 'bg-emerald-500 text-slate-950' : 'text-slate-300 hover:text-slate-100'
            }`}
          >
            <PackageCheck className="h-4 w-4" />
            Retorno
          </button>
        </div>

        {loading && romaneios.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-slate-400">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Carregando…
          </div>
        ) : romaneios.length === 0 ? (
          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-10 text-center text-slate-400">
            {aba === 'saida'
              ? 'Nenhum romaneio aberto aguardando saída.'
              : 'Nenhum romaneio em rota no momento.'}
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-slate-800">
            <table className="min-w-full divide-y divide-slate-800 text-sm">
              <thead className="bg-slate-900 text-xs uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-4 py-3 text-left">Romaneio</th>
                  <th className="px-4 py-3 text-right">Pedidos</th>
                  <th className="px-4 py-3 text-right">Valor</th>
                  {aba === 'retorno' && (
                    <>
                      <th className="px-4 py-3 text-left">Entregador</th>
                      <th className="px-4 py-3 text-center">Entregues / Pendentes</th>
                      <th className="px-4 py-3 text-left">Saída</th>
                    </>
                  )}
                  {aba === 'saida' && <th className="px-4 py-3 text-left">Criado</th>}
                  <th className="px-4 py-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-950">
                {romaneios.map((r) => {
                  const isSaving = savingId === r.id;
                  return (
                    <tr key={r.id} className="hover:bg-slate-900">
                      <td className="px-4 py-3 font-mono text-xs text-slate-300">
                        {r.uuid.replace('rom_', '').toUpperCase()}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-200">{r.totalPedidos}</td>
                      <td className="px-4 py-3 text-right text-slate-200">{formatCurrency(r.totalValor)}</td>
                      {aba === 'retorno' && (
                        <>
                          <td className="px-4 py-3 text-slate-200">{r.entregador?.nome ?? '—'}</td>
                          <td className="px-4 py-3 text-center">
                            <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-emerald-300">
                              {r.totalEntregues}
                            </span>
                            <span className="px-1 text-slate-500">/</span>
                            <span className="rounded-md bg-amber-500/15 px-2 py-0.5 text-amber-300">
                              {r.totalPendentes}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-400">{formatDateTime(r.dataSaida)}</td>
                        </>
                      )}
                      {aba === 'saida' && (
                        <td className="px-4 py-3 text-slate-400">{formatDateTime(r.createdAt)}</td>
                      )}
                      <td className="px-4 py-3 text-right">
                        {aba === 'saida' ? (
                          <div className="flex items-center justify-end gap-2">
                            <select
                              value={selecaoEntregador[r.id] ?? ''}
                              onChange={(e) =>
                                setSelecaoEntregador((s) => ({ ...s, [r.id]: e.target.value }))
                              }
                              disabled={isSaving || entregadores.length === 0}
                              className="rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-sm text-slate-200 disabled:opacity-50"
                            >
                              <option value="">
                                {entregadores.length === 0 ? 'Sem entregadores cadastrados' : 'Selecione…'}
                              </option>
                              {entregadores.map((e) => (
                                <option key={e.id} value={e.id}>
                                  {e.nome}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={() => void handleSair(r.id)}
                              disabled={isSaving || !selecaoEntregador[r.id]}
                              className="inline-flex items-center gap-1 rounded-md bg-amber-500 px-3 py-1.5 text-sm font-medium text-slate-950 hover:bg-amber-400 disabled:opacity-50"
                            >
                              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
                              Sair
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => void handleFinalizar(r.id)}
                            disabled={isSaving}
                            className="inline-flex items-center gap-1 rounded-md bg-emerald-500 px-3 py-1.5 text-sm font-medium text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
                          >
                            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                            Finalizar
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {aba === 'saida' && entregadores.length === 0 && !loading && (
          <p className="mt-3 text-xs text-amber-300/80">
            Nenhum usuário com role <code className="font-mono">ENTREGADOR</code> ativo nesta loja.
            Cadastre em <strong>Equipe</strong> e marque o role correspondente.
          </p>
        )}
      </div>
    </Layout>
  );
}
