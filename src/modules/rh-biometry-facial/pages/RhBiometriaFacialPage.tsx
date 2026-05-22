import { useEffect, useState } from 'react';
import { ScanFace, AlertTriangle, CheckCircle2, RefreshCw, ShieldCheck, Lock } from 'lucide-react';
import { RhPageShell } from '../../rh/components/RhPageShell';
import { listFuncionarios } from '../../rh/services/rhApi';
import type { RhFuncionarioListItem } from '../../rh/types/rh.types';
import {
  listEnrolls,
  registrarEnroll,
  revogarEnroll,
  type BiometriaStatusView,
} from '../../rh-biometry/services/rhBiometryApi';
import { getConsentStatus, type ConsentResponse } from '../../rh-biometry-lab/services/biometryLabApi';
import { FaceCapture, averageDescriptors, descriptorToBase64, base64ToDescriptor, faceDistance } from '../components/FaceCapture';

/// Threshold de match para verify. 0.55 é estrito (typical "same person" < 0.6).
const VERIFY_THRESHOLD = 0.55;

type Mode = 'idle' | 'enrolling' | 'verifying';

export default function RhBiometriaFacialPage(): JSX.Element {
  const [funcionarios, setFuncionarios] = useState<RhFuncionarioListItem[]>([]);
  const [funcionario, setFuncionario] = useState<RhFuncionarioListItem | null>(null);
  const [consent, setConsent] = useState<ConsentResponse | null>(null);
  const [enrolls, setEnrolls] = useState<readonly BiometriaStatusView[]>([]);
  const [mode, setMode] = useState<Mode>('idle');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [verifyResult, setVerifyResult] = useState<{ matched: boolean; distance: number; templateId: string | null } | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const r = await listFuncionarios({ pageSize: 100 });
        setFuncionarios([...r.items]);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Falha ao listar funcionários.');
      }
    })();
  }, []);

  useEffect(() => {
    setEnrolls([]);
    setConsent(null);
    setVerifyResult(null);
    if (!funcionario) return;
    void (async () => {
      try {
        const [c, list] = await Promise.all([
          getConsentStatus(funcionario.id),
          listEnrolls(funcionario.id, false),
        ]);
        setConsent(c);
        // Só mostra os FACIAIS aqui.
        setEnrolls(list.filter((e) => e.providerHint === 'FACIAL'));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Falha ao carregar dados.');
      }
    })();
  }, [funcionario]);

  const refreshEnrolls = async (): Promise<void> => {
    if (!funcionario) return;
    const list = await listEnrolls(funcionario.id, false);
    setEnrolls(list.filter((e) => e.providerHint === 'FACIAL'));
  };

  const handleEnrollComplete = async (descriptors: ReadonlyArray<Float32Array>): Promise<void> => {
    if (!funcionario) return;
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const avg = averageDescriptors(descriptors);
      const templateOpaqueId = descriptorToBase64(avg);
      await registrarEnroll({
        funcionarioId: funcionario.id,
        agentId: 'browser-face-api',
        templateOpaqueId,
        dedoLabel: 'FACE',
        qualityScore: Math.round(Math.min(100, Math.max(60, 100 - descriptors.length * 0))), // heurística simples; podemos refinar
        providerHint: 'FACIAL',
      });
      setInfo(`Cadastro facial salvo (${descriptors.length} amostras consolidadas).`);
      await refreshEnrolls();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao salvar enroll.');
    } finally {
      setBusy(false);
      setMode('idle');
    }
  };

  const handleVerifyComplete = (descriptors: ReadonlyArray<Float32Array>): void => {
    if (!funcionario) return;
    if (enrolls.length === 0) {
      setError('Nenhum cadastro facial para verificar.');
      setMode('idle');
      return;
    }
    const probe = descriptors[0];
    let best: { e: BiometriaStatusView; distance: number } | null = null;
    for (const e of enrolls) {
      try {
        const stored = base64ToDescriptor(e.templateOpaqueId);
        const d = faceDistance(probe, stored);
        if (best === null || d < best.distance) best = { e, distance: d };
      } catch {
        /* skip enroll com template corrompido */
      }
    }
    if (best) {
      const matched = best.distance < VERIFY_THRESHOLD;
      setVerifyResult({ matched, distance: best.distance, templateId: best.e.id });
      setInfo(matched ? `Match: ${funcionario.nome} (distância ${best.distance.toFixed(3)})` : `Sem match (menor distância ${best.distance.toFixed(3)}).`);
    } else {
      setError('Não foi possível comparar.');
    }
    setMode('idle');
  };

  const handleRevoke = async (id: string): Promise<void> => {
    if (!window.confirm('Revogar este cadastro facial?')) return;
    try {
      await revogarEnroll(id, 'revogado-via-ui-facial');
      setInfo('Cadastro revogado.');
      await refreshEnrolls();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao revogar.');
    }
  };

  const consentOk = consent?.status === 'ATIVO';

  return (
    <RhPageShell
      title="Biometria Facial"
      subtitle="Cadastro e verificação via webcam. Modelos rodam 100% no browser — o backend recebe apenas o vetor de 128 floats, nunca a imagem."
      icon={<ScanFace className="h-6 w-6" />}
      error={error}
    >
      <div className="space-y-4">
        <div className="flex items-start gap-2 rounded-2xl border border-violet-500/30 bg-violet-500/5 p-3 text-xs text-violet-100">
          <Lock className="mt-0.5 h-4 w-4 flex-none" />
          <div>
            <strong className="text-white">Privacidade.</strong> A imagem nunca sai do navegador.
            Apenas o vetor (template) é enviado ao backend, criptografado em trânsito.
            Consentimento LGPD do tipo <code>BIOMETRIA</code> deve estar ATIVO.
          </div>
        </div>

        <label className="block">
          <span className="text-xs uppercase tracking-wide text-slate-400">Funcionário</span>
          <select
            value={funcionario?.id ?? ''}
            onChange={(e) => setFuncionario(funcionarios.find((f) => f.id === e.target.value) ?? null)}
            className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-white"
          >
            <option value="">Selecione…</option>
            {funcionarios.map((f) => (
              <option key={f.id} value={f.id}>{f.matricula} · {f.nome}</option>
            ))}
          </select>
        </label>

        {funcionario ? (
          <section className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-3 rounded-2xl border border-white/10 bg-slate-900/40 p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">Consentimento LGPD</h3>
                <span
                  className={`rounded-full border px-2 py-0.5 text-xs ${
                    consentOk ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200' : 'border-rose-500/40 bg-rose-500/10 text-rose-200'
                  }`}
                >
                  {consent ? consent.status : '—'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {consentOk
                  ? 'Funcionário autorizou biometria. Pode cadastrar/verificar.'
                  : 'Sem consentimento ATIVO. Vá em /rh/consentimentos para conceder.'}
              </p>
            </div>

            <div className="space-y-3 rounded-2xl border border-white/10 bg-slate-900/40 p-4">
              <h3 className="text-sm font-semibold text-white">Cadastros faciais</h3>
              {enrolls.length === 0 ? (
                <p className="text-xs text-slate-400">Nenhum cadastro facial.</p>
              ) : (
                <ul className="space-y-1 text-xs">
                  {enrolls.map((e) => (
                    <li key={e.id} className="flex items-center justify-between gap-2 rounded-lg border border-white/5 bg-slate-950/40 px-3 py-2">
                      <span className="font-mono text-[10px] text-slate-400">{e.id.slice(0, 8)}…</span>
                      <span className="text-slate-300">{new Date(e.enrolledAt).toLocaleString('pt-BR')}</span>
                      <button
                        type="button"
                        onClick={() => void handleRevoke(e.id)}
                        className="rounded-md border border-rose-500/30 bg-rose-500/10 px-2 py-1 text-rose-200 hover:bg-rose-500/20"
                      >
                        Revogar
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        ) : null}

        {info ? (
          <div className="flex items-start gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-200">
            <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none" />
            <span>{info}</span>
          </div>
        ) : null}

        {verifyResult ? (
          <div className={`flex items-start gap-2 rounded-xl border p-3 text-sm ${verifyResult.matched ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200' : 'border-amber-500/40 bg-amber-500/10 text-amber-200'}`}>
            <ShieldCheck className="mt-0.5 h-4 w-4 flex-none" />
            <span>
              {verifyResult.matched ? 'CONFIRMADO' : 'NÃO RECONHECIDO'}
              {' '}— distância {verifyResult.distance.toFixed(3)} {verifyResult.matched ? '<' : '>='} threshold {VERIFY_THRESHOLD}
            </span>
          </div>
        ) : null}

        {funcionario && consentOk && mode === 'idle' ? (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { setMode('enrolling'); setError(null); setInfo(null); setVerifyResult(null); }}
              disabled={busy}
              className="rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              Cadastrar nova face (3 amostras)
            </button>
            <button
              type="button"
              onClick={() => { setMode('verifying'); setError(null); setInfo(null); setVerifyResult(null); }}
              disabled={busy || enrolls.length === 0}
              className="rounded-xl border border-violet-500/40 bg-violet-500/10 px-4 py-2 text-sm font-semibold text-violet-100 disabled:opacity-50"
            >
              Verificar face (1 amostra)
            </button>
          </div>
        ) : null}

        {mode === 'enrolling' && funcionario ? (
          <div className="space-y-3 rounded-2xl border border-violet-500/30 bg-slate-950/40 p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Capturando 3 amostras de {funcionario.nome}</h3>
              <button type="button" onClick={() => setMode('idle')} className="text-xs text-slate-400 hover:text-white">Cancelar</button>
            </div>
            <FaceCapture
              capturesNeeded={3}
              onComplete={(d) => void handleEnrollComplete(d)}
              onError={(err) => { setError(err.message); setMode('idle'); }}
            />
          </div>
        ) : null}

        {mode === 'verifying' && funcionario ? (
          <div className="space-y-3 rounded-2xl border border-violet-500/30 bg-slate-950/40 p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Verificando {funcionario.nome}</h3>
              <button type="button" onClick={() => setMode('idle')} className="text-xs text-slate-400 hover:text-white">Cancelar</button>
            </div>
            <FaceCapture
              capturesNeeded={1}
              onComplete={(d) => handleVerifyComplete(d)}
              onError={(err) => { setError(err.message); setMode('idle'); }}
            />
          </div>
        ) : null}

        {busy ? (
          <div className="inline-flex items-center gap-2 text-xs text-slate-400">
            <RefreshCw className="h-3 w-3 animate-spin" />
            Salvando…
          </div>
        ) : null}
      </div>
    </RhPageShell>
  );
}
