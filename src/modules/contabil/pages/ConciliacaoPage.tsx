import React, { useState, useEffect } from 'react';
import { api } from '../../../services/api';
import { Layout } from '../../../components/Layout';
import {
  FileSearch,
  CheckCircle2,
  AlertCircle,
  ArrowRightLeft,
  Loader2,
  ShieldCheck,
  Sparkles,
  Landmark,
} from 'lucide-react';
import { AxiosError } from 'axios';

export interface ILancamentoPerneta {
  id: string;
  dataLancamento: string | Date;
  descricao: string;
  valor: number | string;
  tipo: 'DEBITO' | 'CREDITO';
}

export interface IPlanoConta {
  id: string;
  codigo?: string;
  codigoEstrutural?: string;
  descricao?: string;
  nomeConta?: string;
  tipo?: 'RECEITA' | 'DESPESA' | 'ATIVO' | 'PASSIVO' | string;
}

export function ConciliacaoPage() {
  const [pernetas, setPernetas] = useState<ILancamentoPerneta[]>([]);
  const [planosContas, setPlanosContas] = useState<IPlanoConta[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlanos, setSelectedPlanos] = useState<{ [key: string]: string }>({});
  const [conciliandoId, setConciliandoId] = useState<string | null>(null);

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    try {
      setLoading(true);

      const [resPernetas, resPlanos] = await Promise.all([
        api.get<ILancamentoPerneta[]>('/api/contabilidade/pernetas'),
        api.get<IPlanoConta[]>('/api/contabilidade/planos')
      ]);

      setPernetas(resPernetas.data);
      setPlanosContas(resPlanos.data);
    } catch (error) {
      console.error('Erro ao carregar dados de conciliação:', error);
      alert('Erro ao carregar dados. Verifique sua conexão.');
    } finally {
      setLoading(false);
    }
  }

  const handleSelectChange = (lancamentoId: string, planoId: string) => {
    setSelectedPlanos(prev => ({ ...prev, [lancamentoId]: planoId }));
  };

  const handleConciliar = async (id: string) => {
    const planoContasId = selectedPlanos[id];
    if (!planoContasId) {
      alert('Por favor, selecione uma Conta Contábil antes de conciliar.');
      return;
    }

    try {
      setConciliandoId(id);

      await api.put(`/api/contabilidade/pernetas/${id}`, { planoContasId });

      setPernetas(prev => prev.filter(p => p.id !== id));

      const newSelected = { ...selectedPlanos };
      delete newSelected[id];
      setSelectedPlanos(newSelected);
    } catch (err) {
      const error = err as AxiosError<{ error?: string }>;
      console.error('Erro ao conciliar:', error);
      alert(error.response?.data?.error || 'Erro ao efetuar a conciliação contábil.');
    } finally {
      setConciliandoId(null);
    }
  };

  const formatarMoeda = (valor: number | string) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(valor));
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex h-[80vh] flex-col items-center justify-center gap-4">
          <div className="rounded-2xl border border-violet-400/20 bg-violet-500/10 p-4">
            <Loader2 className="h-12 w-12 animate-spin text-violet-300" />
          </div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-slate-400 animate-pulse">
            Analisando Livro Razão...
          </p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mx-auto flex h-full max-w-7xl flex-col space-y-6 pb-12">
        <div className="relative overflow-hidden rounded-[30px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(139,92,246,0.16),_transparent_26%),linear-gradient(135deg,_#0b1020_0%,_#08101f_45%,_#0a1224_100%)] p-6 shadow-[0_25px_70px_rgba(0,0,0,0.40)] sm:p-8">
          <div className="pointer-events-none absolute -left-10 top-0 h-52 w-52 rounded-full bg-violet-600/15 blur-[100px]" />
          <div className="pointer-events-none absolute right-0 top-0 h-56 w-56 rounded-full bg-fuchsia-600/10 blur-[110px]" />

          <div className="relative z-10 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-violet-300">
                <Sparkles className="h-3.5 w-3.5" />
                Accounting Integrity
              </div>

              <h1 className="flex items-center gap-4 text-3xl font-black tracking-tight text-white">
                <div className="rounded-2xl border border-violet-400/20 bg-violet-500/10 p-3 shadow-[0_0_20px_rgba(139,92,246,0.12)]">
                  <FileSearch className="h-8 w-8 text-violet-300" />
                </div>
                Conciliação Contábil
              </h1>

              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300 sm:text-[15px]">
                Classifique lançamentos órfãos e feche o Livro Razão com mais controle,
                consistência e velocidade operacional.
              </p>
            </div>

            <div className="inline-flex items-center gap-2 rounded-2xl border border-amber-400/20 bg-amber-500/10 px-5 py-3 font-black text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.10)]">
              <AlertCircle className="h-5 w-5" />
              {pernetas.length} Pendências
            </div>
          </div>
        </div>

        {pernetas.length === 0 ? (
          <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden rounded-[30px] border border-white/10 border-dashed bg-[#08101f]/90 py-20 text-center shadow-[0_20px_50px_rgba(0,0,0,0.35)]">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.10),_transparent_28%)]" />
            <div className="relative z-10 flex flex-col items-center">
              <div className="mb-6 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-5">
                <ShieldCheck className="h-16 w-16 text-emerald-300 drop-shadow-[0_0_12px_rgba(16,185,129,0.35)]" />
              </div>
              <h2 className="mb-2 text-3xl font-black tracking-tight text-white">
                Tudo conciliado!
              </h2>
              <p className="max-w-2xl text-base leading-8 text-slate-400">
                Não há lançamentos pernetas no sistema. O Livro Razão está íntegro
                e as partidas dobradas estão consistentes.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-hidden rounded-[30px] border border-white/10 bg-[#08101f]/90 shadow-[0_20px_50px_rgba(0,0,0,0.35)] backdrop-blur-xl">
            <div className="overflow-x-auto">
              <table className="min-w-[980px] w-full text-left">
                <thead className="border-b border-white/10 bg-black/10">
                  <tr>
                    <th className="p-5 text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                      Data
                    </th>
                    <th className="p-5 text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                      Descrição
                    </th>
                    <th className="p-5 text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                      Tipo
                    </th>
                    <th className="p-5 text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                      Valor
                    </th>
                    <th className="p-5 text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                      Conta Contábil (Destino)
                    </th>
                    <th className="p-5 text-center text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                      Ação
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-white/5">
                  {pernetas.map((perneta) => (
                    <tr key={perneta.id} className="group transition-colors hover:bg-white/5">
                      <td className="p-5 text-sm font-medium text-slate-400">
                        {new Date(perneta.dataLancamento).toLocaleDateString('pt-BR')}
                      </td>

                      <td className="p-5 text-sm font-bold text-white">
                        {perneta.descricao || 'Lançamento sem descrição'}
                      </td>

                      <td className="p-5">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${
                            perneta.tipo === 'CREDITO'
                              ? 'border-sky-400/20 bg-sky-500/10 text-sky-300'
                              : 'border-rose-400/20 bg-rose-500/10 text-rose-300'
                          }`}
                        >
                          {perneta.tipo}
                        </span>
                      </td>

                      <td className="p-5 font-mono text-base font-black text-slate-200">
                        {formatarMoeda(perneta.valor)}
                      </td>

                      <td className="w-1/3 p-5">
                        <div className="flex items-center gap-3">
                          <ArrowRightLeft className="h-5 w-5 shrink-0 text-slate-600" />
                          <select
                            className="w-full rounded-2xl border border-white/10 bg-[#0d182d] px-4 py-3 text-sm text-white outline-none shadow-inner transition-all focus:border-violet-400/30 focus:ring-2 focus:ring-violet-500/15"
                            value={selectedPlanos[perneta.id] || ''}
                            onChange={(e) => handleSelectChange(perneta.id, e.target.value)}
                          >
                            <option value="" className="text-slate-500">
                              -- Selecione a Conta Destino --
                            </option>
                            {planosContas.map((plano) => (
                              <option key={plano.id} value={plano.id}>
                                {plano.codigo || plano.codigoEstrutural} - {plano.descricao || plano.nomeConta}
                              </option>
                            ))}
                          </select>
                        </div>
                      </td>

                      <td className="p-5 text-center">
                        <button
                          onClick={() => handleConciliar(perneta.id)}
                          disabled={!selectedPlanos[perneta.id] || conciliandoId === perneta.id}
                          className={`inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-black transition-all ${
                            !selectedPlanos[perneta.id]
                              ? 'cursor-not-allowed border border-white/10 bg-white/5 text-slate-500'
                              : 'border border-violet-400/20 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-[0_0_20px_rgba(139,92,246,0.18)] hover:scale-[1.02] hover:brightness-110'
                          }`}
                        >
                          {conciliandoId === perneta.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4" />
                          )}
                          {conciliandoId === perneta.id ? 'Conciliando...' : 'Conciliar'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="border-t border-white/10 bg-black/10 px-6 py-4">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                <Landmark className="h-4 w-4 text-violet-300" />
                Selecione a conta contábil de destino e conclua a baixa das pendências.
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}