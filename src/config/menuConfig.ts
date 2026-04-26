/**
 * Menu lateral 100% declarativo: ícones como chaves Lucide (ver `DynamicMenu.tsx`).
 */
export type MenuItemConfig = {
  label: string;
  path: string;
  icon: string;
  feature: string;
  target?: string;
  isAi?: boolean;
  /** Ex.: apenas SUPER_ADMIN */
  anyRole?: string[];
  /** Itens de gestão (equipe, permissões, …) */
  requireGestor?: boolean;
  /** Quando presente, o item não fica ativo se a URL contiver este trecho (ex.: delivery vs expedição). */
  activeUnlessPathIncludes?: string;
  /** Exige também acesso a estas features (todas). */
  extraRequiredFeatures?: string[];
  /**
   * Se true, a `feature` deve constar nas features efetivas da loja (JWT pós-`resolveFeaturesForLoja`),
   * além do mapeamento RBAC em `FEATURE_MASTER_MAP`.
   */
  requireLojaFeature?: boolean;
};

export type MenuSectionConfig = {
  section: string;
  label: string;
  icon: string;
  isAi?: boolean;
  items: MenuItemConfig[];
};

export type MenuMacroConfig = {
  macroTitle: string;
};

export type MenuFlatLinksConfig = {
  flatLinks: MenuItemConfig[];
};

export type MenuConfigEntry = MenuMacroConfig | MenuSectionConfig | MenuFlatLinksConfig;

export function isMenuMacro(e: MenuConfigEntry): e is MenuMacroConfig {
  return 'macroTitle' in e;
}

export function isMenuSection(e: MenuConfigEntry): e is MenuSectionConfig {
  return 'section' in e;
}

export function isMenuFlatLinks(e: MenuConfigEntry): e is MenuFlatLinksConfig {
  return 'flatLinks' in e;
}

export const MENU_CONFIG: MenuConfigEntry[] = [
  { macroTitle: 'Visão Geral' },
  {
    flatLinks: [
      { label: 'Dashboard', path: '/dashboard', icon: 'LayoutDashboard', feature: 'DASHBOARD.VIEW' },
      {
        label: 'BI Food Service',
        path: '/dashboard-food',
        icon: 'Pizza',
        feature: 'DASHBOARD.VIEW',
        extraRequiredFeatures: ['PDV.VENDA_VIEW'],
      },
    ],
  },
  {
    section: 'centralAurya',
    label: 'Central Aurya',
    icon: 'BrainCircuit',
    isAi: true,
    items: [
      { label: 'Insights', path: '/aurya/insights', icon: 'Sparkles', feature: 'IA.INSIGHT_VIEW', isAi: true },
      { label: 'Alertas', path: '/aurya/alertas', icon: 'AlertTriangle', feature: 'IA.ALERT_VIEW', isAi: true },
      { label: 'Oportunidades', path: '/aurya/oportunidades', icon: 'TrendingUp', feature: 'IA.OPPORTUNITY_VIEW', isAi: true },
    ],
  },
  { macroTitle: 'Administrativo' },
  {
    section: 'estruturaNegocio',
    label: 'Estrutura',
    icon: 'Database',
    items: [
      { label: 'Produtos', path: '/produtos', icon: 'Package', feature: 'ESTRUTURA.PRODUTO_VIEW' },
      { label: 'Categorias', path: '/categorias', icon: 'Tags', feature: 'ESTRUTURA.CATEGORIA_VIEW' },
      { label: 'Embalagens (BOM)', path: '/embalagens', icon: 'Box', feature: 'ESTRUTURA.EMBALAGEM_VIEW' },
      { label: 'Pessoas', path: '/pessoas', icon: 'Users', feature: 'ESTRUTURA.PESSOA_VIEW' },
      { label: 'Equipe', path: '/equipe', icon: 'UserCog', feature: 'ESTRUTURA.EQUIPE_VIEW', requireGestor: true },
      { label: 'Permissões', path: '/permissoes', icon: 'ShieldCheck', feature: 'ESTRUTURA.PERMISSAO_VIEW', requireGestor: true },
      { label: 'Minha Loja', path: '/configuracoes-loja', icon: 'Settings', feature: 'ESTRUTURA.LOJA_VIEW', requireGestor: true },
      { label: 'Layout Etiquetas', path: '/layout-etiquetas', icon: 'Printer', feature: 'ESTRUTURA.ETIQUETA_VIEW', requireGestor: true },
      { label: 'Estações de Trabalho', path: '/estacoes-trabalho', icon: 'Monitor', feature: 'ESTRUTURA.ESTACAO_VIEW', requireGestor: true },
      { label: 'Locais de cobrança', path: '/locais-cobranca', icon: 'BadgePercent', feature: 'ESTRUTURA.LOCAL_COBRANCA_VIEW', requireGestor: true },
      { label: 'Caixas PDV', path: '/configuracao-caixas-pdv', icon: 'Banknote', feature: 'ESTRUTURA.CAIXA_PDV_VIEW', requireGestor: true },
      { label: 'Gestão TEF', path: '/configuracao-tef', icon: 'CreditCard', feature: 'ESTRUTURA.TEF_VIEW', requireGestor: true },
      { label: 'Balanças', path: '/balancas', icon: 'Scale', feature: 'ESTRUTURA.BALANCA_VIEW', requireGestor: true },
    ],
  },
  {
    section: 'adminSaaS',
    label: 'Admin SaaS',
    icon: 'ShieldCheck',
    items: [{ label: 'Clientes', path: '/admin/clientes', icon: 'Building2', feature: 'TENANT.CLIENT_VIEW', anyRole: ['SUPER_ADMIN', 'SUPORTE_MASTER'] }],
  },
  { macroTitle: 'Comercial' },
  {
    section: 'operacaoVendas',
    label: 'Vendas',
    icon: 'Monitor',
    items: [
      { label: 'PDV Varejo', path: '/frente-caixa', icon: 'ShoppingCart', feature: 'PDV.VENDA_VIEW' },
      { label: 'Autoatendimento', path: '/self-checkout', icon: 'ScanLine', feature: 'PDV.SELF_CHECKOUT_VIEW' },
      { label: 'PDV Food', path: '/pdv-food', icon: 'UtensilsCrossed', feature: 'PDV.FOOD_VIEW' },
      { label: 'Cadastro de Cardápio', path: '/cardapio/gestao', icon: 'Pizza', feature: 'FOOD_SERVICE.CARDAPIO_VIEW' },
      { label: 'KDS (Cozinha)', path: '/kds', icon: 'ChefHat', feature: 'FOOD_SERVICE.KDS_VIEW' },
      {
        label: 'KDS Chamada (Balcão)',
        path: '/kds-chamada-balcao',
        icon: 'Megaphone',
        feature: 'FOOD_SERVICE.KDS_VIEW',
      },
      { label: 'Gestão Delivery / Pedidos', path: '/vendas/gestao-delivery', icon: 'Truck', feature: 'FOOD_SERVICE.DELIVERY_VIEW' },
      {
        label: 'Gestão Food / Expedição',
        path: '/gestao-food',
        icon: 'PackageSearch',
        feature: 'FOOD_SERVICE.EXPEDICAO_VIEW',
        activeUnlessPathIncludes: '/vendas/gestao-delivery',
      },
      { label: 'Entregas Mobile', path: '/entregas/mobile', icon: 'Smartphone', feature: 'FOOD_SERVICE.DELIVERY_VIEW' },
      { label: 'Comanda Mobile', path: '/comanda-mobile', icon: 'Smartphone', feature: 'FOOD_SERVICE.COMANDA_MOBILE_VIEW' },
      { label: 'Garçom (mesas)', path: '/garcom/mesas', icon: 'UtensilsCrossed', feature: 'FOOD_SERVICE.MESAS_VIEW' },
      { label: 'Campanhas e promoções', path: '/vendas/campanhas-promocionais', icon: 'Sparkles', feature: 'COMERCIAL.CAMPAIGN_VIEW' },
      { label: 'Gestão de turnos / caixa', path: '/vendas/gestao-turnos-caixa', icon: 'Timer', feature: 'PDV.TURNO_VIEW' },
      {
        label: 'Gestão de Vendas',
        path: '/vendas/gestao-vendas',
        icon: 'ListOrdered',
        feature: 'VENDAS.GESTAO_VENDAS_VIEW',
        requireLojaFeature: true,
      },
    ],
  },
  { macroTitle: 'Suprimentos & Logística' },
  {
    section: 'comprasSuprimentos',
    label: 'Compras',
    icon: 'ShoppingBag',
    items: [
      { label: 'Solicitações', path: '/compras/solicitacoes', icon: 'ClipboardList', feature: 'COMPRAS.SOLICITACAO_VIEW' },
      { label: 'Cotações', path: '/compras/cotacoes', icon: 'Scale', feature: 'COMPRAS.COTACAO_VIEW' },
      { label: 'Gerenciar Cotações', path: '/compras/gerenciar-cotacoes', icon: 'Scale', feature: 'COMPRAS.COTACAO_MANAGE_VIEW' },
      { label: 'Aprovação de Compras', path: '/compras/AprovacaoSolicitacaoCompra', icon: 'ShoppingCart', feature: 'COMPRAS.APROVACAO_VIEW' },
      { label: 'Pedidos', path: '/compras/pedidos', icon: 'ShoppingCart', feature: 'COMPRAS.PEDIDO_VIEW' },
      { label: 'Acompanhamento P2P', path: '/compras/acompanhamento', icon: 'Radar', feature: 'COMPRAS.ACOMPANHAMENTO_VIEW' },
      { label: 'Pedidos de Recebimento', path: '/compras/pedidos-recebimento', icon: 'Truck', feature: 'COMPRAS.RECEBIMENTO_ORDER_VIEW' },
      { label: 'Recebimento mercadorias', path: '/compras/recebimento-mercadorias', icon: 'PackageCheck', feature: 'COMPRAS.RECEBIMENTO_VIEW' },
      { label: 'Divergências', path: '/compras/divergencias', icon: 'AlertTriangle', feature: 'COMPRAS.DIVERGENCIA_VIEW' },
      { label: 'XML', path: '/entrada-notas', icon: 'Inbox', feature: 'COMPRAS.XML_VIEW' },
      { label: 'Notas Entrada', path: '/ListarNfe', icon: 'FileText', feature: 'COMPRAS.NOTA_ENTRADA_VIEW' },
      { label: 'Análise Aurya', path: '/compras/InteligenciaComprasService', icon: 'BrainCircuit', feature: 'COMPRAS.AURYA_VIEW', isAi: true },
    ],
  },
  {
    section: 'estoqueInteligente',
    label: 'Estoque',
    icon: 'Package',
    items: [
      { label: 'Inteligência', path: '/estoque/inteligencia', icon: 'BrainCircuit', feature: 'WMS.INTELIGENCIA_VIEW', isAi: true },
      { label: 'Gestão', path: '/estoque', icon: 'ClipboardList', feature: 'WMS.ESTOQUE_VIEW' },
      { label: 'Inventário', path: '/estoque/inventario', icon: 'ScanSearch', feature: 'WMS.INVENTARIO_VIEW' },
      { label: 'Bipador', path: '/estoque/bipador', icon: 'Smartphone', feature: 'WMS.BIPADOR_VIEW', target: '_blank' },
      { label: 'Listas de preços', path: '/estoque/listas-preco', icon: 'ListOrdered', feature: 'WMS.LISTA_PRECO_VIEW' },
      { label: 'Carga de balanças', path: '/estoque/carga-balancas', icon: 'Scale', feature: 'WMS.CARGA_BALANCA_VIEW' },
    ],
  },
  {
    section: 'logisticaWms',
    label: 'Logística WMS',
    icon: 'Network',
    items: [
      { label: 'Recebimento (Doca)', path: '/wms/recebimento', icon: 'Package', feature: 'WMS.DOCA_RECEBIMENTO_VIEW' },
      { label: 'Armazenagem (Putaway)', path: '/wms/armazenagem', icon: 'ArrowRightLeft', feature: 'WMS.PUTAWAY_VIEW' },
      { label: 'Mapa de Estoque', path: '/wms/estoque', icon: 'Map', feature: 'WMS.MAPA_VIEW' },
      { label: 'Câmaras Frias & Áreas', path: '/wms/areas', icon: 'Layers', feature: 'WMS.AREA_VIEW' },
    ],
  },
  { macroTitle: 'Produção' },
  {
    section: 'producaoIndustria',
    label: 'Produção',
    icon: 'Factory',
    items: [
      { label: 'Ordem de Produção', path: '/producao/op', icon: 'ClipboardList', feature: 'PRODUCAO.ORDEM_VIEW' },
      { label: 'Terminal de Balança', path: '/producao/pesagem', icon: 'Scale', feature: 'PRODUCAO.BALANCA_VIEW' },
    ],
  },
  { macroTitle: 'Financeiro & Contábil' },
  {
    section: 'fiscalInteligente',
    label: 'Fiscal',
    icon: 'Receipt',
    items: [
      { label: 'Notas PDV', path: '/notas', icon: 'Receipt', feature: 'NFE.PDV_NOTA_VIEW' },
      { label: 'NF-e', path: '/notas-fiscais', icon: 'FileUp', feature: 'NFE.EMISSAO_VIEW' },
      { label: 'Motor Fiscal', path: '/regras-fiscais', icon: 'Scale', feature: 'NFE.MOTOR_VIEW' },
      { label: 'CFOP', path: '/cadastrocfop', icon: 'Settings', feature: 'NFE.CFOP_VIEW' },
    ],
  },
  {
    section: 'financeiroInteligente',
    label: 'Financeiro',
    icon: 'Wallet',
    items: [
      { label: 'Insights', path: '/financeiro/dashboard', icon: 'BrainCircuit', feature: 'FINANCEIRO.INSIGHT_VIEW', isAi: true },
      { label: 'Títulos (Pagar/Receber)', path: '/financeiro/gestao-titulos', icon: 'CheckSquare', feature: 'FINANCEIRO.TITULO_VIEW' },
      { label: 'Contas e Caixas', path: '/financeiro/caixas', icon: 'Landmark', feature: 'FINANCEIRO.CONTA_VIEW' },
      { label: 'Extrato de Contas', path: '/financeiro/extrato', icon: 'ListOrdered', feature: 'FINANCEIRO.EXTRATO_VIEW' },
      { label: 'Cheques', path: '/financeiro/cheques', icon: 'CreditCard', feature: 'FINANCEIRO.CHEQUE_VIEW' },
    ],
  },
  {
    section: 'contabilidadeAnalise',
    label: 'Contábil',
    icon: 'BookOpen',
    items: [
      { label: 'Diagnóstico', path: '/contabil/dashboard', icon: 'BrainCircuit', feature: 'CONTABIL.INSIGHT_VIEW', isAi: true },
      { label: 'DRE', path: '/contabilidade/dre', icon: 'TrendingUp', feature: 'CONTABIL.DRE_VIEW' },
      { label: 'Plano de Contas', path: '/contabil/plano-contas', icon: 'Network', feature: 'CONTABIL.PLANO_VIEW' },
      { label: 'Livro Razão', path: '/contabil/extrato', icon: 'FileText', feature: 'CONTABIL.RAZAO_VIEW' },
      { label: 'Conciliação', path: '/contabil/conciliacao', icon: 'Scale', feature: 'CONTABIL.CONCILIACAO_VIEW' },
      { label: 'Fechamento Contábil', path: '/contabil/dashboardglobal', icon: 'CheckSquare', feature: 'CONTABIL.FECHAMENTO_VIEW' },
    ],
  },
];
