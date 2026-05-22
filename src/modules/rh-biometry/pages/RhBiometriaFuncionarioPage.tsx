import { useCallback, useEffect, useState } from 'react';
import { Fingerprint, ShieldOff, AlertTriangle, CheckCircle2, KeyRound, RefreshCw } from 'lucide-react';
import { RhPageShell } from '../../rh/components/RhPageShell';
import { listFuncionarios } from '../../rh/services/rhApi';
import type { RhFuncionarioListItem } from '../../rh/types/rh.types';
import {
  getAgentBridge,
  getAgentStatus,
  enrollAtAgent,
  LabAuthError,
  type AgentBridge,
  type DeviceStatusView,
} from '../../rh-biometry-lab/services/biometryLabApi';
import {
  listEnrolls,
  registrarEnroll,
  revogarEnroll,
  provisionarAttestationSecret,
  type BiometriaStatusView,
  type ProvisionarSecretResponse,
} from '../services/rhBiometryApi';
import { getConsentStatus, type ConsentResponse } from '../../rh-biometry-lab/services/biometryLabApi';

const DEDOS = [
  'POLEGAR_DIREITO',
  'INDICADOR_DIREITO',
  'MEDIO_DIREITO',
  'ANELAR_DIREITO',
  'MINIMO_DIREITO',
  'POLEGAR_ESQUERDO',
  'INDICADOR_ESQUERDO',
  'MEDIO_ESQUERDO',
  'ANELAR_ESQUERDO',
  'MINIMO_ESQUERDO',
] as const;

export default function RhBiometriaFuncionarioPage(): JSX.Element {
  const [funcionarios, setFuncionarios] = useState<RhFuncionarioListItem[]>([]);
  const [funcionario, setFuncionario] = useState<RhFuncionarioListItem | null>(null);
  const [bridge, setBridge] = useState<AgentBridge | null>(null);
  const [labToken, setLabToken] = useState<string>(() => {
    // Token padrão do agent em Dev (vem do appsettings.Development.json:
    // BiometricSandbox.LabApiToken). Se o sessionStorage tem algo claramente
    // inválido (< 16 chars), descarta e usa o default — evita prender o user
    // num 401 por causa de token velho/quebrado salvo no browser.
    const DEV_DEFAULT = 'dev-lab-token-change-me';
    const stored = sessionStorage.getItem('rh-biometry-lab-token');
    if (!stored || stored.length < 16) return DEV_DEFAULT;
    return stored;
  });
  const [agentStatus, setAgentStatus] = useState<DeviceStatusView | null>(null);
  const [consent, setConsent] = useState<ConsentResponse | null>(null);
  const [enrolls, setEnrolls] = useState<readonly BiometriaStatusView[]>([]);
  const [dedoLabel, setDedoLabel] = useState<string>(DEDOS[0]);
  const [agentDeviceId, setAgentDeviceId] = useState('');
  const [secretReveal, setSecretReveal] = useState<ProvisionarSecretResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const [fs, b] = await Promise.all([listFuncionarios({ pageSize: 50 }), getAgentBridge()]);
        setFuncionarios([...fs.items]);
        setBridge(b);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Falha ao inicializar.');
      }
    })();
  }, []);

  useEffect(() => {
    sessionStorage.setItem('rh-biometry-lab-token', labToken);
  }, [labToken]);

  const refreshEnrolls = useCallback(async () => {
    if (!funcionario) return;
    setEnrolls(await listEnrolls(funcionario.id, true));
  }, [funcionario]);

  useEffect(() => {
    setConsent(null);
    setEnrolls([]);
    if (!funcionario) return;
    void (async () => {
      try {
        const [c, list] = await Promise.all([
          getConsentStatus(funcionario.id),
          listEnrolls(funcionario.id, true),
        ]);
        setConsent(c);
        setEnrolls(list);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Falha ao carregar dados do funcionário.');
      }
    })();
  }, [funcionario]);

  const resetLabToken = (): void => {
    const DEV_DEFAULT = 'dev-lab-token-change-me';
    sessionStorage.setItem('rh-biometry-lab-token', DEV_DEFAULT);
    setLabToken(DEV_DEFAULT);
    setAgentStatus(null);
    setError(null);
    setInfo('Token resetado para o padrão Dev. Clique em "Atualizar status".');
  };

  const refreshAgent = useCallback(async () => {
    if (!bridge || !labToken) return;
    setBusy(true);
    setError(null);
    try {
      setAgentStatus(await getAgentStatus(bridge, labToken));
    } catch (err) {
      if (err instanceof LabAuthError) {
        resetLabToken();
        setError(err.message);
      } else {
        setError(err instanceof Error ? err.message : 'Falha ao consultar o agent.');
      }
    } finally {
      setBusy(false);
    }
  }, [bridge, labToken]);

  const handleEnroll = async (): Promise<void> => {
    if (!funcionario || !bridge || !labToken) return;
    if (consent?.status !== 'ATIVO') {
      setError('Consentimento BIOMETRIA não está ATIVO para este funcionário.');
      return;
    }
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const result = await enrollAtAgent(bridge, labToken, {
        funcionarioOpaqueId: funcionario.id,
        dedoLabel,
      });
      if (!result.ok || !result.templateId) {
        setError(`Enroll recusado: ${result.reason ?? '?'}`);
        return;
      }
      const status = await getAgentStatus(bridge, labToken);
      const providerHint = status.driverInfo?.includes('Intelbras') ? 'IntelbrasLE311E' : 'Simulated';
      await registrarEnroll({
        funcionarioId: funcionario.id,
        agentId: bridge.agentBaseUrl, // identificador funcional; substituído pelo agentId real do device
        templateOpaqueId: result.templateId,
        dedoLabel,
        qualityScore: Math.min(100, Math.max(0, result.quality ?? 0)),
        providerHint,
      });
      setInfo('Enroll cadastrado.');
      await refreshEnrolls();
    } catch (err) {
      if (err instanceof LabAuthError) {
        resetLabToken();
        setError(err.message);
      } else {
        setError(err instanceof Error ? err.message : 'Falha no enroll.');
      }
    } finally {
      setBusy(false);
    }
  };

  const handleRevoke = async (id: string): Promise<void> => {
    const motivo = window.prompt('Motivo da revogação (mín. 3 chars):');
    if (!motivo || motivo.trim().length < 3) return;
    setBusy(true);
    setError(null);
    try {
      await revogarEnroll(id, motivo);
      await refreshEnrolls();
      setInfo('Biometria revogada.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao revogar.');
    } finally {
      setBusy(false);
    }
  };

  const handleProvisionSecret = async (): Promise<void> => {
    if (!agentDeviceId.trim()) return;
    setBusy(true);
    setError(null);
    setSecretReveal(null);
    try {
      const r = await provisionarAttestationSecret(agentDeviceId.trim());
      setSecretReveal(r);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao provisionar segredo.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <RhPageShell
      title="Biometria — Cadastro Operacional"
      subtitle="Cadastre e revogue biometrias do funcionário. Templates ficam no PC da loja, cifrados; o backend só registra metadados."
      icon={<Fingerprint className="h-6 w-6" />}
    >
      <div className="space-y-6">
        <div className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-4 text-sm text-violet-100">
          <div className="flex items-start gap-3">
            <Fingerprint className="mt-0.5 h-5 w-5 flex-none" />
            <div>
              Templates biométricos ficam <strong>LOCAIS</strong> no agent, cifrados (AES-256-GCM + DPAPI).
              O backend só registra metadados opacos. Imagem do dedo nunca é capturada nem armazenada.
            </div>
          </div>
        </div>

        <section className="grid gap-4 lg:grid-cols-3">
          <label className="block lg:col-span-2">
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
          <label className="block">
            <span className="text-xs uppercase tracking-wide text-slate-400">X-Lab-Token</span>
            <div className="mt-1 flex gap-2">
              <input
                type="password"
                value={labToken}
                onChange={(e) => setLabToken(e.target.value)}
                placeholder="Token do agent"
                className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 font-mono text-sm text-white"
              />
              {labToken ? (
                <button
                  type="button"
                  onClick={resetLabToken}
                  title="Apagar token salvo (use se receber 401)"
                  className="rounded-xl border border-white/10 bg-slate-950/60 px-3 text-xs text-slate-300 hover:bg-rose-500/10 hover:text-rose-200"
                >
                  Limpar
                </button>
              ) : null}
            </div>
            <span className="mt-1 block text-[10px] text-slate-500">
              {labToken.length} chars. Token em <code>appsettings.Development.json</code> →
              <code className="ml-1">BiometricSandbox.LabApiToken</code>.
            </span>
          </label>
        </section>

        {error ? (
          <div className="flex items-start gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" />
            <span>{error}</span>
          </div>
        ) : null}
        {info ? (
          <div className="flex items-start gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-200">
            <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none" />
            <span>{info}</span>
          </div>
        ) : null}

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-3 rounded-2xl border border-white/10 bg-slate-900/40 p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Status do Agent</h3>
              <button
                onClick={() => void refreshAgent()}
                disabled={busy}
                className="flex items-center gap-1 rounded-lg border border-white/10 px-3 py-1 text-xs text-slate-200 hover:bg-white/5 disabled:opacity-50"
              >
                <RefreshCw className="h-3 w-3" /> Atualizar
              </button>
            </div>
            {agentStatus ? (
              <pre className="overflow-x-auto rounded-lg bg-black/40 p-3 text-xs text-slate-300">{JSON.stringify(agentStatus, null, 2)}</pre>
            ) : (
              <p className="text-xs text-slate-500">Cole o token e clique em Atualizar.</p>
            )}
          </div>
          <div className="space-y-3 rounded-2xl border border-white/10 bg-slate-900/40 p-4">
            <h3 className="text-sm font-semibold text-white">Consentimento BIOMETRIA</h3>
            {consent ? (
              <div className={`rounded-lg border p-3 text-sm ${consent.status === 'ATIVO' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200' : 'border-amber-500/30 bg-amber-500/10 text-amber-200'}`}>
                <div><strong>Status:</strong> {consent.status}</div>
                <div><strong>Versão:</strong> {consent.versaoTermo ?? '—'}</div>
                <div><strong>Aceite:</strong> {consent.dataAceite ? new Date(consent.dataAceite).toLocaleString('pt-BR') : '—'}</div>
                {consent.revokedAt ? <div><strong>Revogado em:</strong> {new Date(consent.revokedAt).toLocaleString('pt-BR')}</div> : null}
              </div>
            ) : (
              <p className="text-xs text-slate-500">Selecione um funcionário.</p>
            )}
          </div>
        </section>

        <section className="space-y-3 rounded-2xl border border-white/10 bg-slate-900/40 p-4">
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex-1 min-w-[180px]">
              <span className="text-xs uppercase tracking-wide text-slate-400">Dedo</span>
              <select
                value={dedoLabel}
                onChange={(e) => setDedoLabel(e.target.value)}
                className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-white"
              >
                {DEDOS.map((d) => (<option key={d} value={d}>{d}</option>))}
              </select>
            </label>
            <button
              onClick={() => void handleEnroll()}
              disabled={busy || !funcionario || !labToken || consent?.status !== 'ATIVO'}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2 text-sm font-semibold text-white hover:from-violet-500 hover:to-fuchsia-500 disabled:opacity-50"
            >
              <Fingerprint className="h-4 w-4" /> Cadastrar biometria
            </button>
          </div>

          <div className="overflow-hidden rounded-xl border border-white/10">
            <table className="min-w-full text-sm text-slate-200">
              <thead className="bg-white/5 text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-3 py-2 text-left">Dedo</th>
                  <th className="px-3 py-2 text-left">Provider</th>
                  <th className="px-3 py-2 text-left">Qualidade</th>
                  <th className="px-3 py-2 text-left">Cadastrado em</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {enrolls.length === 0 ? (
                  <tr><td colSpan={6} className="px-3 py-4 text-center text-xs text-slate-500">Sem biometrias cadastradas.</td></tr>
                ) : (
                  enrolls.map((e) => (
                    <tr key={e.id} className="border-t border-white/5">
                      <td className="px-3 py-2 font-mono text-xs">{e.dedoLabel}</td>
                      <td className="px-3 py-2 text-xs">{e.providerHint}</td>
                      <td className="px-3 py-2 text-xs">{e.qualityScore}</td>
                      <td className="px-3 py-2 text-xs">{new Date(e.enrolledAt).toLocaleString('pt-BR')}</td>
                      <td className="px-3 py-2 text-xs">{e.revokedAt ? `REVOGADO (${e.revokedReason ?? '?'})` : 'ATIVO'}</td>
                      <td className="px-3 py-2 text-right">
                        {!e.revokedAt ? (
                          <button
                            onClick={() => void handleRevoke(e.id)}
                            className="inline-flex items-center gap-1 rounded-lg border border-rose-500/40 px-2 py-1 text-xs text-rose-200 hover:bg-rose-500/10"
                          >
                            <ShieldOff className="h-3 w-3" /> Revogar
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="space-y-3 rounded-2xl border border-white/10 bg-slate-900/40 p-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
            <KeyRound className="h-4 w-4" /> Provisionar segredo HMAC do Agent
          </h3>
          <p className="text-xs text-slate-400">
            Gera um novo <code className="text-violet-300">AttestationSecret</code> para o agent assinar marcações biométricas. O segredo é exibido apenas uma vez.
          </p>
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex-1 min-w-[280px]">
              <span className="text-xs uppercase tracking-wide text-slate-400">RhAgentDevice ID</span>
              <input
                value={agentDeviceId}
                onChange={(e) => setAgentDeviceId(e.target.value)}
                placeholder="uuid do registro em rh_agent_devices"
                className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 font-mono text-sm text-white"
              />
            </label>
            <button
              onClick={() => void handleProvisionSecret()}
              disabled={busy || !agentDeviceId.trim()}
              className="rounded-xl border border-violet-500/40 px-4 py-2 text-sm text-violet-200 hover:bg-violet-500/10 disabled:opacity-50"
            >
              Gerar segredo
            </button>
          </div>
          {secretReveal ? (
            <div className="space-y-2 rounded-xl border border-emerald-500/40 bg-emerald-500/5 p-3 text-xs text-emerald-100">
              <div><strong>agentId:</strong> <code>{secretReveal.agentId}</code></div>
              <div><strong>attestationSecret (cole em appsettings):</strong></div>
              <pre className="overflow-x-auto rounded bg-black/40 p-2 font-mono text-emerald-200">{secretReveal.attestationSecret}</pre>
              <div className="text-amber-300">{secretReveal.aviso}</div>
            </div>
          ) : null}
        </section>
      </div>
    </RhPageShell>
  );
}
