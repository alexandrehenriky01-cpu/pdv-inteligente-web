import { api } from '../api';

export type TipoPedidoTracking = 'DELIVERY' | 'RETIRADA_BALCAO';

export type TrackingStatusCliente =
  | 'RECEBIDO'
  | 'NA_COZINHA'
  | 'SAIU_PARA_ENTREGA'
  | 'ENTREGUE'
  | 'PRONTO_PARA_RETIRADA'
  | 'RETIRADO';

export interface DeliveryPedidoTrackingDTO {
  id: string;
  lojaId: string;
  numeroPedido: number | null;
  numeroVenda?: number;
  tipoPedido?: TipoPedidoTracking;
  statusEntrega?: string | null;
  statusPreparo: string | null;
  trackingStatus?: TrackingStatusCliente;
  valorTotal: number;
  enderecoEntrega: string | null;
  itens: Array<{ nome: string; descricao: string | null; quantidade: number }>;
}

export async function getDeliveryPedidoTracking(pedidoId: string): Promise<DeliveryPedidoTrackingDTO> {
  const id = pedidoId.trim();
  if (!id) throw new Error('Pedido inválido.');
  const { data } = await api.get<DeliveryPedidoTrackingDTO>(
    `/api/public/delivery/pedido/${encodeURIComponent(id)}`
  );
  return data;
}
