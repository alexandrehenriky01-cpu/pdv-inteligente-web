import { api } from '../api';

export interface DeliveryPedidoTrackingDTO {
  id: string;
  lojaId: string;
  numeroPedido: number | null;
  numeroVenda?: number;
  statusPreparo: string | null;
  valorTotal: number;
  enderecoEntrega: string | null;
  itens: Array<{ nome: string; quantidade: number }>;
}

export async function getDeliveryPedidoTracking(pedidoId: string): Promise<DeliveryPedidoTrackingDTO> {
  const id = pedidoId.trim();
  if (!id) throw new Error('Pedido inválido.');
  const { data } = await api.get<DeliveryPedidoTrackingDTO>(
    `/api/public/delivery/pedido/${encodeURIComponent(id)}`
  );
  return data;
}
