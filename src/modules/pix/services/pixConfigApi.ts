import { api } from '../../../services/api';

export type PixPspType = 'EFI' | 'ASAAS' | 'MERCADO_PAGO';

export type PixOrigemContexto = 'LOJA' | 'LOCAL_COBRANCA';

/** Resposta de GET /api/pix/config — segredos sempre mascarados pelo backend. */
export interface PixConfigResponse {
  pspPix: PixPspType | null;
  pixClientIdMascarado: string | null;
  pixClientSecretMascarado: string | null;
  pixChave: string | null;
  pixCertPath: string | null;
  pixWebhookUrl: string | null;
  pixSandbox: boolean;
  pixAtivo: boolean;
  configurado: boolean;

  pixOrigemDelivery: PixOrigemContexto | null;
  pixOrigemPdv: PixOrigemContexto | null;
  pixLocalCobrancaDeliveryId: string | null;
  pixLocalCobrancaPdvId: string | null;
}

/** Payload para POST /api/pix/config. */
export interface PixConfigPayload {
  pspPix: PixPspType;
  pixClientId: string;
  pixClientSecret: string;
  pixChave: string;
  pixCertPath?: string | null;
  pixWebhookUrl?: string | null;
  pixSandbox: boolean;
  pixAtivo: boolean;

  pixOrigemDelivery?: PixOrigemContexto | null;
  pixOrigemPdv?: PixOrigemContexto | null;
  pixLocalCobrancaDeliveryId?: string | null;
  pixLocalCobrancaPdvId?: string | null;
}

export interface PixLocalCobrancaItem {
  id: string;
  nome: string;
  chavePixMascarada: string | null;
  ativo: boolean;
}

export async function getPixConfig(): Promise<PixConfigResponse> {
  const { data } = await api.get<PixConfigResponse>('/api/pix/config');
  return data;
}

export async function updatePixConfig(payload: PixConfigPayload): Promise<PixConfigResponse> {
  const { data } = await api.post<PixConfigResponse>('/api/pix/config', payload);
  return data;
}

export async function listLocaisCobrancaPix(): Promise<PixLocalCobrancaItem[]> {
  const { data } = await api.get<PixLocalCobrancaItem[]>('/api/pix/config/locais-cobranca');
  return Array.isArray(data) ? data : [];
}

export interface PixTestarConexaoResp {
  ok: boolean;
  psp: PixPspType | null;
  ambiente: 'SANDBOX' | 'PRODUCAO';
  mensagem: string;
}

export async function testarConexaoPix(): Promise<PixTestarConexaoResp> {
  const { data } = await api.post<PixTestarConexaoResp>('/api/pix/config/testar-conexao', {});
  return data;
}

export interface PixWebhookInfo {
  registrado: boolean;
  webhookUrl: string | null;
  criadoEm: string | null;
  mensagem?: string;
}

export async function consultarWebhookPix(): Promise<PixWebhookInfo> {
  const { data } = await api.get<PixWebhookInfo>('/api/pix/config/webhook');
  return data;
}

export interface PixRegistrarWebhookResp {
  ok: boolean;
  webhookUrl?: string;
  mensagem: string;
}

export async function registrarWebhookPix(webhookUrl: string): Promise<PixRegistrarWebhookResp> {
  const { data } = await api.post<PixRegistrarWebhookResp>('/api/pix/config/registrar-webhook', {
    webhookUrl,
  });
  return data;
}

export interface PixCertificadoStatus {
  configurado: boolean;
  mensagem: string;
}

export async function getCertificadoStatus(): Promise<PixCertificadoStatus> {
  const { data } = await api.get<PixCertificadoStatus>('/api/pix/config/certificado-status');
  return data;
}

export interface PixUploadCertResp {
  ok: boolean;
  mensagem: string;
  configurado: boolean;
}

export async function uploadCertificadoPix(file: File): Promise<PixUploadCertResp> {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await api.post<PixUploadCertResp>(
    '/api/pix/config/upload-certificado',
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
  return data;
}

export async function removerCertificadoPix(): Promise<{ ok: boolean; mensagem: string }> {
  const { data } = await api.delete<{ ok: boolean; mensagem: string }>(
    '/api/pix/config/upload-certificado'
  );
  return data;
}
