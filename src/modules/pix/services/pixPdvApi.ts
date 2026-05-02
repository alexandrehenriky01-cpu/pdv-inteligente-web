import { api } from '../../../services/api';

export type PixPdvTipo = 'DINAMICO' | 'ESTATICO';

export type PixPdvStatus = 'AGUARDANDO' | 'PAGO' | 'EXPIRADO' | 'CANCELADO' | 'MANUAL';

export interface PixPdvDinamico {
  tipo: 'DINAMICO';
  status: 'AGUARDANDO';
  txid: string;
  qrCodeBase64: string;
  pixCopiaCola: string;
  expiresAt: string | null;
  reaproveitada?: boolean;
}

export interface PixPdvEstatico {
  tipo: 'ESTATICO';
  status: 'MANUAL';
  chavePix: string;
  localCobrancaId: string | null;
  mensagem: string;
  /** BR Code estático (PNG base64) — gerado pelo backend quando há nome/cidade da loja. */
  qrCodeBase64?: string;
  /** Payload EMV TLV pronto para "copia e cola". */
  pixCopiaCola?: string;
}

export type PixPdvIniciarResp = PixPdvDinamico | PixPdvEstatico;

export interface PixPdvStatusResp {
  txid: string;
  status: PixPdvStatus;
  vendaId: string | null;
  pago: boolean;
  expiresAt: string | null;
}

export interface PixPdvRevalidarResp {
  txid: string;
  status:
    | 'CONFIRMADO'
    | 'JA_CONFIRMADO'
    | 'NAO_ENCONTRADO'
    | 'INCONSISTENTE'
    | 'EXPIRADO'
    | 'CANCELADO'
    | 'NAO_PAGO_NO_PSP';
  motivo?: string;
}

export interface PixPdvCancelarResp {
  txid: string;
  status: 'CANCELADO';
}

export async function iniciarPixPdv(
  vendaId: string,
  valor?: number
): Promise<PixPdvIniciarResp> {
  const body = typeof valor === 'number' ? { valor } : {};
  const { data } = await api.post<PixPdvIniciarResp>(
    `/api/pix/pdv/vendas/${encodeURIComponent(vendaId)}/iniciar`,
    body
  );
  return data;
}

export async function consultarStatusPixPdv(txid: string): Promise<PixPdvStatusResp> {
  const { data } = await api.get<PixPdvStatusResp>(
    `/api/pix/pdv/transacoes/${encodeURIComponent(txid)}/status`
  );
  return data;
}

export async function revalidarPixPdv(txid: string): Promise<PixPdvRevalidarResp> {
  const { data } = await api.post<PixPdvRevalidarResp>(
    `/api/pix/pdv/transacoes/${encodeURIComponent(txid)}/revalidar`,
    {}
  );
  return data;
}

export async function cancelarPixPdv(txid: string): Promise<PixPdvCancelarResp> {
  const { data } = await api.post<PixPdvCancelarResp>(
    `/api/pix/pdv/transacoes/${encodeURIComponent(txid)}/cancelar`,
    {}
  );
  return data;
}
