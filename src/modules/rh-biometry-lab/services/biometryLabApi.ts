import axios from 'axios';
import { api } from '../../../services/api';

export type ConsentBackendStatus = 'ATIVO' | 'REVOGADO' | 'EXPIRADO' | 'MISSING';

export interface ConsentResponse {
  readonly funcionarioId: string;
  readonly status: ConsentBackendStatus;
  readonly versaoTermo: string | null;
  readonly dataAceite: string | null;
  readonly revokedAt: string | null;
}

export interface AgentBridge {
  readonly agentBaseUrl: string;
  readonly labPath: string;
  readonly tokenHeader: string;
}

export interface DeviceStatusView {
  readonly state: string;
  readonly sdkVersion: string;
  readonly driverInfo: string;
  readonly diagnosticMessage: string | null;
  readonly checkedAt: string;
}

export interface EnrollResultView {
  readonly ok: boolean;
  readonly templateId: string | null;
  readonly quality: number | null;
  readonly reason: string | null;
}

export interface VerifyResultView {
  readonly matchFound: boolean;
  readonly templateId: string | null;
  readonly scoreBand: 'low' | 'mid' | 'good' | 'high' | null;
  readonly durationMs: number | null;
  readonly reason: string | null;
}

export interface TemplateMetadataView {
  readonly id: string;
  readonly dedoLabel: string;
  readonly provider: 'Simulated' | 'IntelbrasLE311E' | string;
  readonly quality: number;
  readonly enrolledAt: string;
}

export interface BenchmarkReportView {
  readonly iterations: number;
  readonly providerId: string;
  readonly captureSuccessRate: number;
  readonly captureP50Ms: number;
  readonly captureP95Ms: number;
  readonly captureP99Ms: number;
  readonly matchSuccessRate: number;
  readonly matchP50Ms: number;
  readonly matchP95Ms: number;
  readonly matchP99Ms: number;
  readonly ranAt: string;
}

// ============================================================================
// Backend endpoints (consent + agent metadata)
// ============================================================================

export async function getConsentStatus(funcionarioId: string): Promise<ConsentResponse> {
  const { data } = await api.get<ConsentResponse>(`/api/rh-biometry-lab/consent/${encodeURIComponent(funcionarioId)}`);
  return data;
}

export async function getAgentBridge(): Promise<AgentBridge> {
  const { data } = await api.get<AgentBridge>('/api/rh-biometry-lab/agent-bridge');
  return data;
}

// ============================================================================
// Agent endpoints (chamada direta ao AuryaRhAgent localhost)
// ============================================================================

function agentClient(bridge: AgentBridge, labToken: string) {
  return axios.create({
    baseURL: `${bridge.agentBaseUrl}${bridge.labPath}`,
    timeout: 30_000,
    headers: { [bridge.tokenHeader]: labToken },
  });
}

/// Sentinela exportada para a UI detectar 401 e oferecer reset do token.
/// Lançada por qualquer chamada do agent quando o X-Lab-Token nao bate.
export class LabAuthError extends Error {
  constructor(message = 'Token X-Lab inválido. Verifique o campo "Lab Token" e tente novamente.') {
    super(message);
    this.name = 'LabAuthError';
  }
}

function throwIf401(err: unknown): never {
  if (axios.isAxiosError(err) && err.response?.status === 401) {
    throw new LabAuthError();
  }
  throw err as Error;
}

export async function getAgentStatus(bridge: AgentBridge, labToken: string): Promise<DeviceStatusView> {
  const client = agentClient(bridge, labToken);
  try {
    const { data } = await client.get<DeviceStatusView>('/status');
    return data;
  } catch (err) {
    throwIf401(err);
  }
}

export async function enrollAtAgent(
  bridge: AgentBridge, labToken: string,
  body: { funcionarioOpaqueId: string; dedoLabel: string; simulationSeed?: string; timeoutSeconds?: number }
): Promise<EnrollResultView> {
  const client = agentClient(bridge, labToken);
  try {
    const { data } = await client.post<EnrollResultView>('/enroll', body);
    return data;
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 401) throw new LabAuthError();
    if (axios.isAxiosError(err) && err.response?.data) {
      const body = err.response.data as EnrollResultView | string;
      if (typeof body === 'string') return { ok: false, reason: body } as EnrollResultView;
      return body;
    }
    throw err;
  }
}

export async function verifyAtAgent(
  bridge: AgentBridge, labToken: string,
  body: { funcionarioOpaqueId: string; simulationSeed?: string; timeoutSeconds?: number }
): Promise<VerifyResultView> {
  const client = agentClient(bridge, labToken);
  try {
    const { data } = await client.post<VerifyResultView>('/verify', body);
    return data;
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 401) throw new LabAuthError();
    if (axios.isAxiosError(err) && err.response?.data) {
      const body = err.response.data;
      if (typeof body === 'object') return body as VerifyResultView;
    }
    throw err;
  }
}

export async function listTemplatesAtAgent(
  bridge: AgentBridge, labToken: string, funcionarioOpaqueId: string
): Promise<readonly TemplateMetadataView[]> {
  const client = agentClient(bridge, labToken);
  try {
    const { data } = await client.get<{ templates: TemplateMetadataView[] }>(
      `/templates/${encodeURIComponent(funcionarioOpaqueId)}`
    );
    return data.templates ?? [];
  } catch (err) {
    throwIf401(err);
  }
}

export async function revokeAtAgent(
  bridge: AgentBridge, labToken: string, templateId: string, reason: string
): Promise<void> {
  const client = agentClient(bridge, labToken);
  await client.post(`/revoke/${encodeURIComponent(templateId)}`, { reason });
}

export async function benchmarkAtAgent(
  bridge: AgentBridge, labToken: string, iterations: number
): Promise<BenchmarkReportView> {
  const client = agentClient(bridge, labToken);
  const { data } = await client.post<BenchmarkReportView>('/benchmark', { iterations });
  return data;
}
