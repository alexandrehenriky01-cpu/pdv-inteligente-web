import axios from 'axios';
import { api } from '../../../services/api';

const BASE = '/api/rh-biometry';
const PONTO_BASE = '/api/rh-ponto';

export interface ResolveMatriculaResponse {
  readonly sucesso: true;
  readonly funcionario: { readonly id: string; readonly nome: string; readonly matricula: string };
}

export async function resolverMatricula(matricula: string): Promise<ResolveMatriculaResponse> {
  const { data } = await api.get<ResolveMatriculaResponse>(
    `${PONTO_BASE}/totem/funcionario-por-matricula/${encodeURIComponent(matricula)}`
  );
  return data;
}

export interface BiometriaStatusView {
  readonly id: string;
  readonly funcionarioId: string;
  readonly agentId: string;
  readonly templateOpaqueId: string;
  readonly dedoLabel: string;
  readonly qualityScore: number;
  readonly providerHint: string;
  readonly enrolledAt: string;
  readonly revokedAt: string | null;
  readonly revokedReason: string | null;
}

export interface ProvisionarSecretResponse {
  readonly sucesso: true;
  readonly agentId: string;
  readonly attestationSecret: string;
  readonly aviso: string;
}

export async function listEnrolls(funcionarioId: string, includeRevoked = false): Promise<readonly BiometriaStatusView[]> {
  const { data } = await api.get<{ items: BiometriaStatusView[] }>(
    `${BASE}/funcionario/${encodeURIComponent(funcionarioId)}/enrolls`,
    { params: { includeRevoked } }
  );
  return data.items ?? [];
}

/// Sprint 7.4 — Lista enrolls FACIAL ATIVOS de toda a loja (para match 1:N no totem).
export interface FacialEnrollDaLoja {
  readonly id: string;
  readonly funcionarioId: string;
  readonly funcionarioNome: string;
  readonly funcionarioMatricula: string;
  readonly templateOpaqueId: string;
  readonly dedoLabel: string;
  readonly qualityScore: number;
  readonly enrolledAt: string;
}
export async function listFaciaisDaLoja(): Promise<readonly FacialEnrollDaLoja[]> {
  const { data } = await api.get<{ items: FacialEnrollDaLoja[] }>(`${BASE}/enrolls/facial-da-loja`);
  return data.items ?? [];
}

export async function registrarEnroll(input: {
  funcionarioId: string;
  agentId: string;
  templateOpaqueId: string;
  dedoLabel: string;
  qualityScore: number;
  providerHint: string;
}): Promise<BiometriaStatusView> {
  const { data } = await api.post<{ biometria: BiometriaStatusView }>(`${BASE}/enrolls`, input);
  return data.biometria;
}

export async function revogarEnroll(id: string, motivo: string): Promise<BiometriaStatusView> {
  const { data } = await api.post<{ biometria: BiometriaStatusView }>(`${BASE}/enrolls/${encodeURIComponent(id)}/revogar`, { motivo });
  return data.biometria;
}

export async function provisionarAttestationSecret(agentDeviceId: string): Promise<ProvisionarSecretResponse> {
  const { data } = await api.post<ProvisionarSecretResponse>(`${BASE}/agent/provisionar-secret`, { agentDeviceId });
  return data;
}

// ============================================================================
// Operacional — chamada DIRETA ao AuryaRhAgent (loopback)
// ============================================================================

export interface OperationalMatchResult {
  readonly matched: boolean;
  readonly disabled?: boolean;
  readonly attestation?: string;
  readonly scoreBand?: 'low' | 'mid' | 'good' | 'high';
  readonly durationMs?: number;
  readonly reason?: string;
}

export async function matchAtAgent(
  agentBaseUrl: string,
  labToken: string,
  body: { funcionarioOpaqueId: string; dedoLabel?: string; timeoutSeconds?: number; simulationSeed?: string }
): Promise<OperationalMatchResult> {
  const client = axios.create({
    baseURL: `${agentBaseUrl}/operational/biometry`,
    timeout: 30_000,
    headers: { 'X-Lab-Token': labToken },
  });
  try {
    const { data } = await client.post<OperationalMatchResult>('/match', body);
    return data;
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.data) {
      return err.response.data as OperationalMatchResult;
    }
    throw err;
  }
}

// ============================================================================
// Totem — registrar marcação biométrica (backend valida HMAC)
// ============================================================================

export interface MarcacaoBiometricaInput {
  readonly attestation: string;
  readonly funcionarioId: string;
  readonly tipoMarcacao: 'ENTRADA' | 'SAIDA' | 'INICIO_INTERVALO' | 'FIM_INTERVALO';
  readonly timezone: string;
  readonly observacao?: string;
}

export interface MarcacaoBiometricaResponse {
  readonly sucesso: true;
  readonly marcacao: {
    readonly id: string;
    readonly tipoMarcacao: string;
    readonly timestampServidor: string;
    readonly codigoComprovante: string;
    readonly status: string;
    readonly metodoAutenticacao: string;
  };
  readonly funcionario: { readonly id: string; readonly nome: string; readonly matricula: string };
  readonly attestation: {
    readonly agentId: string;
    readonly templateOpaqueId: string;
    readonly dedoLabel: string;
    readonly scoreBand: 'low' | 'mid' | 'good' | 'high';
  };
}

export async function totemMarcarBiometria(input: MarcacaoBiometricaInput): Promise<MarcacaoBiometricaResponse> {
  const { data } = await api.post<MarcacaoBiometricaResponse>(`${PONTO_BASE}/totem/marcar-biometria`, input);
  return data;
}
