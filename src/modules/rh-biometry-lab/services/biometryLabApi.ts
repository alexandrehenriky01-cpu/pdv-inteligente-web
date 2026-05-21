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

export async function getAgentStatus(bridge: AgentBridge, labToken: string): Promise<DeviceStatusView> {
  const client = agentClient(bridge, labToken);
  const { data } = await client.get<DeviceStatusView>('/status');
  return data;
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
    if (axios.isAxiosError(err) && err.response?.data) {
      return err.response.data as EnrollResultView;
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
    if (axios.isAxiosError(err) && err.response?.data) {
      return err.response.data as VerifyResultView;
    }
    throw err;
  }
}

export async function listTemplatesAtAgent(
  bridge: AgentBridge, labToken: string, funcionarioOpaqueId: string
): Promise<readonly TemplateMetadataView[]> {
  const client = agentClient(bridge, labToken);
  const { data } = await client.get<{ templates: TemplateMetadataView[] }>(
    `/templates/${encodeURIComponent(funcionarioOpaqueId)}`
  );
  return data.templates ?? [];
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
