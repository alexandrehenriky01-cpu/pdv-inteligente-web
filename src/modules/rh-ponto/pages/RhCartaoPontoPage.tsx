import { useCallback, useEffect, useState } from 'react';
import { CalendarDays, Printer, Search } from 'lucide-react';
import { RhPageShell } from '../../rh/components/RhPageShell';
import { abrirCartaoPontoPdf, criarFechamento, listFechamentos, resumoFechamento } from '../services/pontoApi';
import { listFuncionarios } from '../../rh/services/rhApi';
import type { TotaisCalculadosView } from '../types/ponto.types';
import type { RhFuncionarioListItem } from '../../rh/types/rh.types';

function fmtMin(min: number): string {
  const abs = Math.abs(min);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  const sign = min < 0 ? '-' : '';
  return `${sign}${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

const DIA_LABEL: Record<string, string> = {
  SEGUNDA: 'Seg', TERCA: 'Ter', QUARTA: 'Qua', QUINTA: 'Qui',
  SEXTA: 'Sex', SABADO: 'Sáb', DOMINGO: 'Dom',
};

export default function RhCartaoPontoPage(): JSX.Element {
  const now = new Date();
  const [ano, setAno] = useState(now.getUTCFullYear());
  const [mes, setMes] = useState(now.getUTCMonth() + 1);
  const [search, setSearch] = useState('');
  const [funcionarios, setFuncionarios] = useState<RhFuncionarioListItem[]>([]);
  const [selected, setSelected] = useState<RhFuncionarioListItem | null>(null);
  const [resumo, setResumo] = useState<TotaisCalculadosView | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const run = async (): Promise<void> => {
      try {
        const r = await listFuncionarios({ search: search || undefined, pageSize: 20 });
        if (!cancelled) setFuncionarios([...r.items]);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Erro.');
      }
    };
    void run();
    return () => { cancelled = true; };
  }, [search]);

  const reload = useCallback(async () => {
    if (!selected) {
      setResumo(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const r = await resumoFechamento(selected.id, ano, mes);
      setResumo(r);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha.');
    } finally {
      setLoading(false);
    }
  }, [selected, ano, mes]);

  useEffect(() => { void reload(); }, [reload]);

  const imprimir = async (): Promise<void> => {
    if (!selected) return;
    setPrinting(true);
    setError(null);
    try {
      // 1) Busca fechamento existente do período
      const list = await listFechamentos({ funcionarioId: selected.id, ano, mes });
      let fechamentoId: string | undefined = list.items[0]?.id;
      // 2) Se não existir, cria ABERTO automaticamente (recalcula totais)
      if (!fechamentoId) {
        const novo = await criarFechamento({ funcionarioId: selected.id, ano, mes });
        fechamentoId = novo.id;
      }
      // 3) Baixa o PDF com auth e abre em nova aba
      await abrirCartaoPontoPdf(fechamentoId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao gerar PDF.');
    } finally {
      setPrinting(false);
    }
  };

  return (
    <RhPageShell
      title="Cartão de ponto"
      subtitle="Visualização do espelho mensal com totais calculados pelo motor de jornada."
      icon={<CalendarDays className="h-6 w-6" />}
      error={error}
      actions={
        selected ? (
          <button
            type="button"
            onClick={() => void imprimir()}
            disabled={printing || loading || !resumo}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-violet-900/30 hover:from-violet-500 hover:to-fuchsia-500 disabled:opacity-50"
          >
            <Printer className="h-4 w-4" /> {printing ? 'Gerando…' : 'Imprimir cartão'}
          </button>
        ) : null
      }
    >
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <aside className="rounded-2xl border border-white/10 bg-slate-950/30 p-3">
          <div className="mb-3 flex gap-2">
            <input
              type="number"
              min={2024}
              max={2100}
              value={ano}
              onChange={(e) => setAno(Number(e.target.value))}
              className="w-24 rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white"
            />
            <select
              value={mes}
              onChange={(e) => setMes(Number(e.target.value))}
              className="flex-1 rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>{String(m).padStart(2, '0')}</option>
              ))}
            </select>
          </div>
          <div className="relative mb-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              type="search"
              placeholder="Buscar funcionário…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-slate-900/60 py-2 pl-10 pr-3 text-sm text-white"
            />
          </div>
          <ul className="max-h-[50vh] space-y-1 overflow-auto">
            {funcionarios.map((f) => (
              <li key={f.id}>
                <button
                  type="button"
                  onClick={() => setSelected(f)}
                  className={`w-full rounded-md px-3 py-2 text-left text-sm hover:bg-white/5 ${selected?.id === f.id ? 'bg-violet-500/10 text-violet-100' : 'text-slate-200'}`}
                >
                  <div className="font-medium">{f.nome}</div>
                  <div className="text-xs text-slate-400">{f.matricula}</div>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <section className="lg:col-span-2">
          {!selected ? (
            <div className="rounded-2xl border border-dashed border-white/10 p-12 text-center text-slate-400">
              Selecione um funcionário.
            </div>
          ) : loading ? (
            <div className="rounded-2xl border border-white/10 p-12 text-center text-slate-400">Calculando…</div>
          ) : !resumo ? (
            <div className="rounded-2xl border border-white/10 p-12 text-center text-slate-400">Sem dados.</div>
          ) : (
            <>
              <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                <Stat label="Trabalhadas" value={fmtMin(resumo.totalTrabalhadoMinutos)} />
                <Stat label="Esperadas" value={fmtMin(resumo.totalEsperadoMinutos)} />
                <Stat label="Extras" value={fmtMin(resumo.totalExtrasMinutos)} tone="emerald" />
                <Stat label="Atrasos" value={fmtMin(resumo.totalAtrasosMinutos)} tone="amber" />
                <Stat label="Faltas" value={fmtMin(resumo.totalFaltasMinutos)} tone="rose" />
                <Stat label="Saldo mês" value={fmtMin(resumo.saldoBancoMinutos)} tone={resumo.saldoBancoMinutos < 0 ? 'rose' : 'emerald'} />
              </div>

              <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/30">
                <table className="w-full text-left text-sm">
                  <thead className="bg-white/5 text-xs uppercase tracking-wide text-slate-300">
                    <tr>
                      <th className="px-4 py-2">Data</th>
                      <th className="px-4 py-2">Dia</th>
                      <th className="px-4 py-2 text-right">Trab.</th>
                      <th className="px-4 py-2 text-right">Espera.</th>
                      <th className="px-4 py-2 text-right">Extra</th>
                      <th className="px-4 py-2 text-right">Atraso</th>
                      <th className="px-4 py-2">Obs</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resumo.dias.map((d) => (
                      <tr key={d.data} className="border-t border-white/5">
                        <td className="px-4 py-2 text-slate-300">{d.data}</td>
                        <td className="px-4 py-2 text-slate-400">{DIA_LABEL[d.diaSemana] ?? d.diaSemana}</td>
                        <td className="px-4 py-2 text-right font-mono">{fmtMin(d.trabalhouMinutos)}</td>
                        <td className="px-4 py-2 text-right font-mono text-slate-400">{fmtMin(d.esperadoMinutos)}</td>
                        <td className="px-4 py-2 text-right font-mono text-emerald-300">{fmtMin(d.extrasMinutos)}</td>
                        <td className="px-4 py-2 text-right font-mono text-amber-300">{fmtMin(d.atrasoMinutos)}</td>
                        <td className="px-4 py-2 text-xs text-slate-400">{d.observacao ?? ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      </div>
    </RhPageShell>
  );
}

function Stat(props: { label: string; value: string; tone?: 'emerald' | 'amber' | 'rose' }): JSX.Element {
  const cls =
    props.tone === 'emerald' ? 'text-emerald-300' :
    props.tone === 'amber' ? 'text-amber-300' :
    props.tone === 'rose' ? 'text-rose-300' :
    'text-white';
  return (
    <div className="rounded-xl border border-white/10 bg-slate-950/40 p-3">
      <div className="text-xs uppercase tracking-wide text-slate-400">{props.label}</div>
      <div className={`mt-1 font-mono text-xl ${cls}`}>{props.value}</div>
    </div>
  );
}
