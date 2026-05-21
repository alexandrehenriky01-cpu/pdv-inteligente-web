import { api } from '../../../services/api';

export type RhAgentTrustLevel = 'PENDING' | 'TRUSTED' | 'REVOKED' | 'BLOCKED';
export type RhAgentDeviceStatus = 'ONLINE' | 'OFFLINE' | 'UNKNOWN';
export type RhAgentCapability = 'RH_BIOMETRY' | 'RH_CAMERA' | 'RH_QRCODE' | 'RH_NFC' | 'RH_SIGNATURE';

export interface RhAgentDeviceView {
  readonly agentId: string;
  readonly installationId: string;
  readonly hostname: string | null;
  readonly osVersion: string | null;
  readonly agentVersion: string | null;
  readonly trustLevel: RhAgentTrustLevel;
  readonly status: RhAgentDeviceStatus;
  readonly supportedCapabilities: readonly RhAgentCapability[];
  readonly allowedCapabilities: readonly RhAgentCapability[];
  readonly lastSeenAt: string | null;
  readonly revokedAt: string | null;
  readonly revokedReason: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export async function listRhAgentDevices(): Promise<RhAgentDeviceView[]> {
  const response = await api.get<{ devices: RhAgentDeviceView[] }>('/rh-agent/devices');
  return response.data.devices ?? [];
}

export async function revokeRhAgentDevice(agentId: string, reason: string, hardBlock = false): Promise<RhAgentDeviceView> {
  const response = await api.post<RhAgentDeviceView & { sucesso: boolean }>('/rh-agent/revoke', {
    agentId,
    reason,
    hardBlock,
  });
  return response.data;
}

export async function setRhAgentTrust(agentId: string, trustLevel: Exclude<RhAgentTrustLevel, 'BLOCKED' | 'REVOKED'>): Promise<RhAgentDeviceView> {
  const response = await api.post<RhAgentDeviceView & { sucesso: boolean }>('/rh-agent/trust', {
    agentId,
    trustLevel,
  });
  return response.data;
}
