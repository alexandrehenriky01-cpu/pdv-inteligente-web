import { useCallback, useEffect, useState } from 'react';
import { Fingerprint, ShieldAlert, AlertTriangle, CheckCircle2, ShieldOff, Trash2, Activity } from 'lucide-react';
import { RhPageShell } from '../../rh/components/RhPageShell';
import {
  benchmarkAtAgent,
  enrollAtAgent,
  getAgentBridge,
  getAgentStatus,
  getConsentStatus,
  listTemplatesAtAgent,
  revokeAtAgent,
  verifyAtAgent,
  type AgentBridge,
  type BenchmarkReportView,
  type ConsentResponse,
  type DeviceStatusView,
  type EnrollResultView,
  type TemplateMetadataView,
  type VerifyResultView,
} from '../services/biometryLabApi';
import { listFuncionarios } from '../../rh/services/rhApi';
import type { RhFuncionarioListItem } from '../../rh/types/rh.types';

const STATUS_COLOR: Record<string, string> = {
  ATIVO: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  REVOGADO: 'border-rose-500/30 bg-rose-500/10 text-rose-300',
  EXPIRADO: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  MISSING: 'border-slate-500/30 bg-slate-500/10 text-slate-300',
};

const DEVICE_LABEL: Record<string, string> = {
  SdkUnavailable: 'SDK não disponível',
  DeviceDisconnected: 'Leitor desconectado',
  SimulationActive: 'Simulação ativa',
  Ready: 'Pronto',
  Degraded: 'Degradado',
  ConsentBlocked: 'Bloqueado por consentimento',
};

export default function RhBiometryLabPage(): JSX.Element {
  const [funcionarios, setFuncionarios] = useState<RhFuncionarioListItem[]>([]);
  const [funcionario, setFuncionario] = useState<RhFuncionarioListItem | null>(null);
  const [bridge, setBridge] = useState<AgentBridge | null>(null);
  const [labToken, setLabToken] = useState<string>(() => sessionStorage.getItem('rh-biometry-lab-token') ?? '');
  const [agentStatus, setAgentStatus] = useState<DeviceStatusView | null>(null);
  const [consent, setConsent] = useState<ConsentResponse | null>(null);
  const [templates, setTemplates] = useState<readonly TemplateMetadataView[]>([]);
  const [enrollResult, setEnrollResult] = useState<EnrollResultView | null>(null);
  const [verifyResult, setVerifyResult] = useState<VerifyResultView | null>(null);
  const [benchmark, setBenchmark] = useState<BenchmarkReportView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const [fs, b] = await Promise.all([
          listFuncionarios({ pageSize: 30 }),
          getAgentBridge(),
        ]);
        setFuncionarios([...fs.items]);
        setBridge(b);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Falha ao inicializar laboratório.');
      }
    })();
  }, []);

  const refreshAgentStatus = useCallback(async () => {
    if (!bridge || !labToken) return;
    setLoading(true);
    setError(null);
    try {
      const s = await getAgentStatus(bridge, labToken);
      setAgentStatus(s);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao consultar o agent.');
    } finally {
      setLoading(false);
    }
  }, [bridge, labToken]);

  const refreshConsent = useCallback(async () => {
    if (!funcionario) return;
    try {
      const c = await getConsentStatus(funcionario.id);
      setConsent(c);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao consultar consentimento.');
    }
  }, [funcionario]);

  const refreshTemplates = useCallback(async () => {
    if (!bridge || !labToken || !funcionario) return;
    try {
      const list = await listTemplatesAtAgent(bridge, labToken, funcionario.id);
      setTemplates(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao listar templates.');
    }
  }, [bridge, labToken, funcionario]);

  useEffect(() => { void refreshConsent(); void refreshTemplates(); }, [refreshConsent, refreshTemplates]);

  const saveToken = (next: string): void => {
    setLabToken(next);
    if (next) sessionStorage.setItem('rh-biometry-lab-token', next);
    else sessionStorage.removeItem('rh-biometry-lab-token');
  };

  const runEnroll = async (): Promise<void> => {
    if (!bridge || !labToken || !funcionario) return;
    setEnrollResult(null);
    setError(null);
    try {
      const r = await enrollAtAgent(bridge, labToken, {
        funcionarioOpaqueId: funcionario.id,
        dedoLabel: 'POL_DIR',
        simulationSeed: `${funcionario.matricula}-poldir-${Date.now()}`,
      });
      setEnrollResult(r);
      await refreshTemplates();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha no enroll.');
    }
  };

  const runVerify = async (): Promise<void> => {
    if (!bridge || !labToken || !funcionario) return;
    setVerifyResult(null);
    setError(null);
    try {
      // No modo simulação determinístico, para "match", usamos a mesma seed do último enroll
      // (apenas para POC do pipeline).
      const lastTemplate = templates[0];
      const seed = lastTemplate ? `${funcionario.matricula}-poldir-replay` : `${funcionario.matricula}-poldir-other`;
      const r = await verifyAtAgent(bridge, labToken, {
        funcionarioOpaqueId: funcionario.id,
        simulationSeed: seed,
      });
      setVerifyResult(r);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha no verify.');
    }
  };

  const runRevoke = async (templateId: string): Promise<void> => {
    if (!bridge || !labToken) return;
    const reason = window.prompt('Motivo da revogação:');
    if (!reason || reason.trim().length < 3) return;
    try {
      await revokeAtAgent(bridge, labToken, templateId, reason.trim());
      await refreshTemplates();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao revogar.');
    }
  };

  const runBenchmark = async (): Promise<void> => {
    if (!bridge || !labToken) return;
    setBenchmark(null);
    setError(null);
    try {
      const r = await benchmarkAtAgent(bridge, labToken, 30);
      setBenchmark(r);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha no benchmark.');
    }
  };

  const consentBadge = consent ? (
    <span className={`rounded-md border px-2 py-0.5 text-xs ${STATUS_COLOR[consent.status]}`}>
      Consentimento: {consent.status}
      {consent.versaoTermo ? ` (v${consent.versaoTermo})` : ''}
    </span>
  ) : null;

  return (
    <RhPageShell
      title="Laboratório Biométrico"
      subtitle="POC isolado: valida SDK, captura e matching SEM tocar o ponto eletrônico. Templates LOCAL ONLY no AuryaRhAgent (AES-256-GCM + DPAPI)."
      icon={<Fingerprint className="h-6 w-6" />}
      error={error}
    >
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Sidebar — token + funcionário + status */}
        <aside className="space-y-3 lg:col-span-1">
          <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-3">
            <div className="mb-2 text-xs uppercase tracking-wide text-slate-400">Token do laboratório</div>
            <input
              type="password"
              value={labToken}
              onChange={(e) => saveToken(e.target.value)}
              placeholder="X-Lab-Token (provisionado pelo operador)"
              className="w-full rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white"
            />
            <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
              <span>{bridge ? bridge.agentBaseUrl + bridge.labPath : '—'}</span>
              <button
                type="button"
                disabled={!labToken || loading}
                onClick={() => void refreshAgentStatus()}
                className="rounded-md border border-white/10 bg-white/5 px-2 py-1 hover:bg-white/10 disabled:opacity-50"
              >
                Sondar agent
              </button>
            </div>
          </div>

          {agentStatus ? (
            <div className="rounded-2xl border border-violet-500/30 bg-violet-500/10 p-3">
              <div className="text-xs uppercase tracking-wide text-violet-200">Agent</div>
              <div className="mt-1 text-sm font-semibold text-white">{DEVICE_LABEL[agentStatus.state] ?? agentStatus.state}</div>
              <div className="text-xs text-slate-300">SDK: {agentStatus.sdkVersion}</div>
              <div className="text-xs text-slate-400">{agentStatus.driverInfo}</div>
              {agentStatus.diagnosticMessage ? (
                <div className="mt-2 text-xs text-slate-300">{agentStatus.diagnosticMessage}</div>
              ) : null}
            </div>
          ) : null}

          <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-3">
            <div className="mb-2 text-xs uppercase tracking-wide text-slate-400">Funcionário (POC)</div>
            <select
              value={funcionario?.id ?? ''}
              onChange={(e) => setFuncionario(funcionarios.find((f) => f.id === e.target.value) ?? null)}
              className="w-full rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white"
            >
              <option value="">— selecione —</option>
              {funcionarios.map((f) => (
                <option key={f.id} value={f.id}>{f.nome} ({f.matricula})</option>
              ))}
            </select>
            <div className="mt-2 text-xs">{consentBadge}</div>
          </div>
        </aside>

        {/* Ações principais */}
        <section className="space-y-3 lg:col-span-2">
          {consent && consent.status !== 'ATIVO' ? (
            <div className="flex items-start gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-200">
              <ShieldAlert className="mt-0.5 h-5 w-5 flex-shrink-0" />
              <div>
                <div className="font-semibold">Consentimento LGPD obrigatório</div>
                <div className="text-sm">
                  Captura biométrica BLOQUEADA. Registre o consentimento "BIOMETRIA" para este funcionário em
                  <span className="ml-1 font-mono text-xs">RH › Consentimentos LGPD</span>.
                </div>
              </div>
            </div>
          ) : null}

          <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm font-semibold text-white">Captura & Matching</div>
              <div className="text-xs text-slate-400">Apenas POC — não registra ponto</div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={!labToken || !funcionario || (consent?.status !== 'ATIVO')}
                onClick={() => void runEnroll()}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                <Fingerprint className="h-4 w-4" />
                Enroll
              </button>
              <button
                type="button"
                disabled={!labToken || !funcionario || (consent?.status !== 'ATIVO')}
                onClick={() => void runVerify()}
                className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-200 hover:bg-emerald-500/20 disabled:opacity-50"
              >
                <CheckCircle2 className="h-4 w-4" />
                Verify
              </button>
              <button
                type="button"
                disabled={!labToken}
                onClick={() => void runBenchmark()}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 hover:bg-white/10 disabled:opacity-50"
              >
                <Activity className="h-4 w-4" />
                Benchmark (30 iter)
              </button>
            </div>
            {enrollResult ? (
              <div className={`mt-3 rounded-xl border p-3 text-sm ${enrollResult.ok ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200' : 'border-rose-500/30 bg-rose-500/10 text-rose-200'}`}>
                {enrollResult.ok
                  ? <>Enroll OK. templateId: <code className="font-mono text-xs">{enrollResult.templateId}</code> · quality {enrollResult.quality}</>
                  : <><AlertTriangle className="mr-1 inline h-4 w-4" />Enroll recusado: {enrollResult.reason}</>}
              </div>
            ) : null}
            {verifyResult ? (
              <div className={`mt-3 rounded-xl border p-3 text-sm ${verifyResult.matchFound ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200' : 'border-rose-500/30 bg-rose-500/10 text-rose-200'}`}>
                {verifyResult.matchFound
                  ? <>Match! templateId: <code className="font-mono text-xs">{verifyResult.templateId}</code> · banda {verifyResult.scoreBand} · {verifyResult.durationMs?.toFixed(1)} ms</>
                  : verifyResult.reason
                    ? <>Recusado: {verifyResult.reason}</>
                    : <>Sem match · banda {verifyResult.scoreBand} · {verifyResult.durationMs?.toFixed(1)} ms</>}
              </div>
            ) : null}
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-4">
            <div className="mb-3 text-sm font-semibold text-white">Templates enrolados (deste funcionário)</div>
            {templates.length === 0 ? (
              <div className="text-xs text-slate-400">Nenhum template enrolado ainda.</div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="bg-white/5 text-xs uppercase tracking-wide text-slate-300">
                  <tr>
                    <th className="px-3 py-2">ID</th>
                    <th className="px-3 py-2">Dedo</th>
                    <th className="px-3 py-2">Provider</th>
                    <th className="px-3 py-2 text-right">Qualidade</th>
                    <th className="px-3 py-2">Enrolado em</th>
                    <th className="px-3 py-2 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {templates.map((t) => (
                    <tr key={t.id} className="border-t border-white/5">
                      <td className="px-3 py-2 font-mono text-xs">{t.id.slice(0, 8)}…</td>
                      <td className="px-3 py-2 text-slate-300">{t.dedoLabel}</td>
                      <td className="px-3 py-2 text-slate-400">{t.provider}</td>
                      <td className="px-3 py-2 text-right font-mono">{t.quality}</td>
                      <td className="px-3 py-2 text-xs text-slate-400">{new Date(t.enrolledAt).toLocaleString('pt-BR')}</td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => void runRevoke(t.id)}
                          className="inline-flex items-center gap-1 rounded-md border border-rose-500/30 bg-rose-500/10 px-2 py-1 text-xs text-rose-200 hover:bg-rose-500/20"
                        >
                          <ShieldOff className="h-3.5 w-3.5" />
                          Revogar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {benchmark ? (
            <div className="rounded-2xl border border-violet-500/30 bg-violet-500/5 p-4">
              <div className="mb-2 text-sm font-semibold text-white">Benchmark · {benchmark.iterations} iterações · {benchmark.providerId}</div>
              <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
                <Metric label="Captura p50" value={`${benchmark.captureP50Ms.toFixed(2)} ms`} />
                <Metric label="Captura p95" value={`${benchmark.captureP95Ms.toFixed(2)} ms`} />
                <Metric label="Captura p99" value={`${benchmark.captureP99Ms.toFixed(2)} ms`} />
                <Metric label="Match p50" value={`${benchmark.matchP50Ms.toFixed(2)} ms`} />
                <Metric label="Match p95" value={`${benchmark.matchP95Ms.toFixed(2)} ms`} />
                <Metric label="Match p99" value={`${benchmark.matchP99Ms.toFixed(2)} ms`} />
                <Metric label="Captura OK" value={`${(benchmark.captureSuccessRate * 100).toFixed(1)} %`} />
                <Metric label="Match OK" value={`${(benchmark.matchSuccessRate * 100).toFixed(1)} %`} />
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </RhPageShell>
  );
}

function Metric({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="rounded-xl border border-white/10 bg-slate-950/40 p-3">
      <div className="text-xs uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-1 font-mono text-base text-white">{value}</div>
    </div>
  );
}
