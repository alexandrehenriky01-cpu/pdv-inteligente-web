/**
 * Handshake Socket.io para acompanhamento de pedido (sem JWT).
 * O backend valida se o pedido existe, é DELIVERY e pertence à loja informada.
 */
export function buildDeliveryTrackingSocketAuth(lojaId: string, pedidoId: string) {
  return {
    tracking: 'DELIVERY' as const,
    lojaId: lojaId.trim(),
    pedidoId: pedidoId.trim(),
  };
}
