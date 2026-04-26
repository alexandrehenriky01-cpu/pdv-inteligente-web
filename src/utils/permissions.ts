export function hasFeature(features: string[], feature: string): boolean {
  return Array.isArray(features) && features.includes(feature);
}

export function hasModulo(features: string[], modulo: string): boolean {
  if (!Array.isArray(features)) return false;
  return features.some((f) => f.startsWith(modulo + '.'));
}

export function getFeaturesByModulo(features: string[], modulo: string): string[] {
  if (!Array.isArray(features)) return [];
  return features.filter((f) => f.startsWith(modulo + '.'));
}

export const FEATURE_MENU_MAP: Record<string, string[]> = {
  'FOOD_SERVICE.DASHBOARD': ['DASHBOARD_VIEW'],
  'FOOD_SERVICE.PEDIDOS': ['PEDIDOS_VIEW', 'PEDIDOS_CREATE'],
  'FOOD_SERVICE.CARDAPIOS': ['CARDAPIO_VIEW'],
  'FOOD_SERVICE.MESAS': ['FOOD_TABLE_VIEW'],
  'FOOD_SERVICE.KDS': ['FOOD_KDS_VIEW'],
  'PDV.VENDA': ['PDV_SELL'],
  'ESTRUTURA.PRODUTO': ['ESTRUTURA_PRODUTO_VIEW'],
  'ESTRUTURA.PESSOA': ['ESTRUTURA_PESSOA_VIEW'],
  'ESTRUTURA.CATEGORIA': ['ESTRUTURA_CATEGORIA_VIEW'],
};

export const MENU_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', path: '/dashboard', feature: 'FOOD_SERVICE.DASHBOARD' },
  { id: 'pdv', label: 'Frente de Caixa', path: '/pdv', feature: 'PDV.VENDA' },
  { id: 'produtos', label: 'Produtos', path: '/cadastros/produtos', feature: 'ESTRUTURA.PRODUTO' },
  { id: 'pessoas', label: 'Pessoas', path: '/cadastros/pessoas', feature: 'ESTRUTURA.PESSOA' },
  { id: 'categorias', label: 'Categorias', path: '/cadastros/categorias', feature: 'ESTRUTURA.CATEGORIA' },
  { id: 'cardapio', label: 'Cardápio', path: '/food/cardapio', feature: 'FOOD_SERVICE.CARDAPIOS' },
  { id: 'mesas', label: 'Mesas', path: '/food/mesas', feature: 'FOOD_SERVICE.MESAS' },
  { id: 'kds', label: 'KDS', path: '/food/kds', feature: 'FOOD_SERVICE.KDS' },
  { id: 'pedidos', label: 'Pedidos', path: '/food/pedidos', feature: 'FOOD_SERVICE.PEDIDOS' },
];

export function getVisibleMenuItems(features: string[]): typeof MENU_ITEMS {
  return MENU_ITEMS.filter((item) => {
    if (!item.feature) return true;
    const modulo = item.feature.split('.')[0];
    return hasModulo(features, modulo);
  });
}