import { useCallback, useEffect, useState } from 'react';
import { FileSignature, CheckCircle2, ShieldCheck, RefreshCw, RotateCcw } from 'lucide-react';
import { RhPageShell } from '../../rh/components/RhPageShell';
import { listFechamentos } from '../../rh-ponto/services/pontoApi';
import type { FechamentoView } from '../../rh-ponto/types/ponto.types';
import {
  listAssinaturas,
  verificarIntegridade,
  assinarFechamentoOperacional,
  reabrirFechamento,
  type AssinaturaView,
  type IntegridadeFechamentoView,
} from '../services/rhOperacionalApi';

export default function RhAssinaturasPage(): JSX.Element {
  const [fechamentos, setFechamentos] = useState<FechamentoView[]>([]);
  const [selecionado, setSelecionado] = useState<FechamentoView | null>(null);
  const [assinaturas, setAssinaturas] = useState<AssinaturaView[]>([]);
  const [integridade, setIntegridade] = useState<IntegridadeFechamentoView | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setBusy(true); setErr(null);
    try {
      const r = await listFechamentos({});
      setFechamentos([...r.items]);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Falha ao listar fechamentos.');
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const carregarDetalhe = async (f: FechamentoView): Promise<void> => {
    setSelecionado(f); setBusy(true); setErr(null);
    try {
      const [a, i] = await Promise.all([listAssinaturas(f.id), verificarIntegridade(f.id)]);
      setAssinaturas([...a]);
      setIntegridade(i);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Falha ao carregar detalhes.');
    } finally {
      setBusy(false);
    }
  };

  const assinar = async (tipo: 'FUNCIONARIO' | 'GESTOR' | 'RH'): Promise<void> => {
    if (!selecionado) return;
    setBusy(true); setErr(null); setInfo(null);
    try {
      const r = await assinarFechamentoOperacional({ fechamentoId: selecionado.id, tipoAssinatura: tipo });
      setInfo(`Assinatura ${tipo} registrada (v${r.assinatura.versaoFechamento}).`);
      await carregarDetalhe(selecionado);
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Falha ao assinar.');
    } finally {
      setBusy(false);
    }
  };

  const reabrir = async (): Promise<void> => {
    if (!selecionado) return;
    const motivo = window.prompt('Motivo da reabertura (mín. 5 chars):') ?? '';
    if (motivo.trim().length < 5) return;
    setBusy(true); setErr(null); setInfo(null);
    try {
      const r = await reabrirFechamento(selecionado.id, motivo);
      setInfo(`Fechamento reaberto. Nova versão: v${r.versao}.`);
      await refresh();
      setSelecionado(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Falha ao reabrir.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <RhPageShell
      title="Assinaturas digitais"
      subtitle="Workflow FUNCIONARIO → GESTOR → RH com hash do documento."
      icon={<FileSignature className="h-6 w-6" />}
      onRefresh={() => void refresh()}
      loading={busy}
      error={err}
    >
      <div className="grid gap-4 lg:grid-cols-[2fr_3fr]">
        <section className="rounded-2xl border border-white/10 bg-slate-900/40 p-3">
          <h3 className="mb-2 px-1 text-sm font-semibold text-white">Fechamentos</h3>
          <ul className="max-h-[60vh] space-y-1 overflow-y-auto pr-1">
            {fechamentos.map((f) => (
              <li key={f.id}>
                <button
                  onClick={() => void carregarDetalhe(f)}
                  className={`w-full rounded-xl border px-3 py-2 text-left text-xs transition ${
                    selecionado?.id === f.id
                      ? 'border-violet-500/50 bg-violet-500/10 text-white'
                      : 'border-white/10 bg-slate-950/40 text-slate-200 hover:bg-white/5'
                  }`}
                >
                  <div className="font-mono">{String(f.mes).padStart(2, '0')}/{f.ano}</div>
                  <div className="text-[10px] text-slate-400">{f.status}</div>
                </button>
              </li>
            ))}
            {fechamentos.length === 0 ? <li className="px-3 py-2 text-xs text-slate-500">Sem fechamentos.</li> : null}
          </ul>
        </section>

        <section className="space-y-3 rounded-2xl border border-white/10 bg-slate-900/40 p-4">
          {info ? <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-2 text-sm text-emerald-200"><CheckCircle2 className="mr-1 inline h-3 w-3" /> {info}</div> : null}
          {!selecionado ? (
            <div className="text-sm text-slate-400">Selecione um fechamento à esquerda.</div>
          ) : (
            <>
              <div>
                <h3 className="text-sm font-semibold text-white">{String(selecionado.mes).padStart(2, '0')}/{selecionado.ano}</h3>
                <p className="text-xs text-slate-400">Status: <strong>{selecionado.status}</strong></p>
              </div>

              {integridade ? (
                <div className={`rounded-xl border p-3 text-xs ${integridade.ok ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200' : 'border-rose-500/30 bg-rose-500/10 text-rose-200'}`}>
                  <div className="flex items-center gap-2 font-semibold">
                    <ShieldCheck className="h-3 w-3" />
                    {integridade.ok ? 'Integridade OK' : 'Integridade COMPROMETIDA'}
                  </div>
                  <div className="mt-1">Hash do documento: <strong>{integridade.documentoOk ? 'válido' : 'divergente'}</strong></div>
                  {integridade.assinaturas.length > 0 ? (
                    <ul className="mt-1 space-y-0.5">
                      {integridade.assinaturas.map((a) => (
                        <li key={a.id}>{a.tipo}: <strong>{a.ok ? 'válida' : 'inválida'}</strong></li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : null}

              <div className="space-y-2">
                <h4 className="text-xs uppercase tracking-wide text-slate-400">Assinaturas</h4>
                {assinaturas.length === 0 ? (
                  <p className="text-xs text-slate-500">Sem assinaturas ainda.</p>
                ) : (
                  <ul className="space-y-1">
                    {assinaturas.map((a) => (
                      <li key={a.id} className="rounded border border-white/10 bg-black/30 p-2 text-xs">
                        <div className="flex items-center justify-between">
                          <div><strong className="text-white">{a.tipoAssinatura}</strong> · v{a.versaoFechamento}</div>
                          <div className="text-slate-400">{new Date(a.signedAt).toLocaleString('pt-BR')}</div>
                        </div>
                        <div className="mt-1 font-mono text-[10px] text-slate-500">{a.hashAssinatura.slice(0, 32)}…</div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                <button onClick={() => void assinar('FUNCIONARIO')} disabled={busy} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-200 hover:bg-white/10 disabled:opacity-50">Assinar como FUNCIONARIO</button>
                <button onClick={() => void assinar('GESTOR')} disabled={busy} className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200 hover:bg-amber-500/15 disabled:opacity-50">Assinar como GESTOR</button>
                <button onClick={() => void assinar('RH')} disabled={busy} className="rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-3 py-2 text-xs font-semibold text-white hover:from-violet-500 hover:to-fuchsia-500 disabled:opacity-50">Assinar como RH</button>
                <button onClick={() => void reabrir()} disabled={busy || selecionado.status !== 'ASSINADO'} className="inline-flex items-center gap-1 rounded-xl border border-rose-500/40 px-3 py-2 text-xs text-rose-200 hover:bg-rose-500/10 disabled:opacity-30">
                  <RotateCcw className="h-3 w-3" /> Reabrir
                </button>
                <button onClick={() => void carregarDetalhe(selecionado)} className="inline-flex items-center gap-1 rounded-xl border border-white/10 px-3 py-2 text-xs text-slate-300 hover:bg-white/5">
                  <RefreshCw className="h-3 w-3" /> Atualizar
                </button>
              </div>
            </>
          )}
        </section>
      </div>
    </RhPageShell>
  );
}
