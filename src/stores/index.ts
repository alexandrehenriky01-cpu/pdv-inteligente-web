/**
 * Módulo centralizado de stores do PDV Inteligente.
 * Exporta todas as stores de carrinho e factories.
 */

// ==========================================
// FACTORIES
// ==========================================

export {
  createCartStore,
  createSimpleCartStore,
  type CartStoreConfig,
  type BaseCartItem,
  type CartItemAdicional,
  type CartItemFiltro,
  type CarrinhoStore,
  type CarrinhoEstado,
  type CarrinhoAcoes,
} from './factories/createCartStore';

// ==========================================
// STORES DE CARRINHO
// ==========================================

export {
  useTotemCart,
  adicionarAoTotemCart,
  incrementarTotemCartItem,
  decrementarTotemCartItem,
  removerDoTotemCart,
  limparTotemCart,
  useTotemCartTotal,
  useTotemCartQuantidade,
  useTotemCartVazio,
  TotemCartParaPayload,
  type TotemCartItem,
  type TotemAdicionarItemPayload,
} from './useTotemCart';

export {
  useDeliveryCart,
  useDeliveryEndereco,
  adicionarAoDeliveryCart,
  incrementarDeliveryCartItem,
  decrementarDeliveryCartItem,
  removerDoDeliveryCart,
  limparDeliveryCart,
  useDeliveryCartTotal,
  useDeliveryEnderecoInfo,
  useDeliveryTaxaEntrega,
  DeliveryCartParaPayload,
  type DeliveryCartItem,
  type DeliveryAdicionarItemPayload,
  type EnderecoEntrega,
} from './useDeliveryCart';

export {
  useGarcomCart,
  useGarcomMesa,
  useGarcomComandas,
  adicionarAoGarcomCart,
  incrementarGarcomCartItem,
  decrementarGarcomCartItem,
  removerDoGarcomCart,
  limparGarcomCart,
  abrirNovaComanda,
  fecharComandaAtiva,
  useGarcomCartTotal,
  useGarcomMesaInfo,
  useGarcomResponsavel,
  GarcomCartParaPayload,
  type GarcomCartItem,
  type GarcomAdicionarItemPayload,
  type MesaInfo,
  type ComandaInfo,
} from './useGarcomCart';
