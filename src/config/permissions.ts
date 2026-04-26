export type ModuleConfig = {
  id: string;
  label: string;
  permissions: Array<{ code: string; label: string }>;
};

/**
 * Catálogo de permissões por módulo (frontend).
 * Usa códigos CANÔNICOS alinhados ao rbacPermissions.ts do backend.
 * O painel de usuários usa este catálogo para exibir e enviar permissões corretas.
 * Atualizado para refletir o catálogo oficial (access-catalog.ts).
 */
export const MODULES_CONFIG: ModuleConfig[] = [
  {
    id: 'ESTRUTURA',
    label: 'Administrativo (Estrutura)',
    permissions: [
      { code: 'ESTRUTURA_PRODUTO_VIEW', label: 'Visualizar produtos' },
      { code: 'ESTRUTURA_PRODUTO_CREATE', label: 'Criar produtos' },
      { code: 'ESTRUTURA_PRODUTO_UPDATE', label: 'Editar produtos' },
      { code: 'ESTRUTURA_PRODUTO_DELETE', label: 'Excluir produtos' },
      { code: 'ESTRUTURA_CATEGORIA_VIEW', label: 'Visualizar categorias' },
      { code: 'ESTRUTURA_CATEGORIA_CREATE', label: 'Criar categorias' },
      { code: 'ESTRUTURA_CATEGORIA_UPDATE', label: 'Editar categorias' },
      { code: 'ESTRUTURA_EMBALAGEM_VIEW', label: 'Visualizar embalagens (BOM)' },
      { code: 'ESTRUTURA_EMBALAGEM_CREATE', label: 'Criar embalagens' },
      { code: 'ESTRUTURA_PESSOA_VIEW', label: 'Visualizar pessoas' },
      { code: 'ESTRUTURA_PESSOA_CREATE', label: 'Criar pessoas' },
      { code: 'ESTRUTURA_PESSOA_UPDATE', label: 'Editar pessoas' },
      { code: 'ESTRUTURA_PRICE_TABLE_VIEW', label: 'Visualizar tabelas de preço' },
      { code: 'ESTRUTURA_PRICE_TABLE_CREATE', label: 'Criar tabelas de preço' },
      { code: 'ADMIN_USER_VIEW', label: 'Visualizar equipe' },
      { code: 'ADMIN_USER_CREATE', label: 'Criar usuários' },
      { code: 'ADMIN_USER_UPDATE', label: 'Editar usuários' },
      { code: 'ADMIN_PERMISSION_VIEW', label: 'Visualizar permissões' },
      { code: 'ADMIN_PERMISSION_UPDATE', label: 'Editar permissões' },
      { code: 'ADMIN_CONFIGURAR', label: 'Configurar loja' },
    ],
  },
  {
    id: 'PDV',
    label: 'PDV / Frente de Caixa',
    permissions: [
      { code: 'PDV_SELL', label: 'Realizar vendas (PDV Varejo)' },
      { code: 'PDV_CANCEL', label: 'Cancelar vendas' },
      { code: 'PDV_OPEN_CASH', label: 'Abrir caixa' },
      { code: 'PDV_CLOSE_CASH', label: 'Fechar caixa / turnos' },
      { code: 'PDV_VIEW', label: 'Visualizar PDV / Autoatendimento' },
    ],
  },
  {
    id: 'FOOD_SERVICE',
    label: 'Food Service',
    permissions: [
      { code: 'FOOD_SERVE', label: 'Servir comanda / PDV Food' },
      { code: 'FOOD_ORDER_CREATE', label: 'Criar pedidos' },
      { code: 'FOOD_ORDER_VIEW', label: 'Visualizar pedidos' },
      { code: 'FOOD_ORDER_UPDATE', label: 'Editar pedidos' },
      { code: 'FOOD_MENU_VIEW', label: 'Visualizar cardápio' },
      { code: 'FOOD_MENU_CREATE', label: 'Criar itens do cardápio' },
      { code: 'FOOD_MENU_UPDATE', label: 'Editar cardápio' },
      { code: 'FOOD_MENU_DELETE', label: 'Excluir itens do cardápio' },
      { code: 'FOOD_TABLE_VIEW', label: 'Visualizar mesas / Garçom' },
      { code: 'FOOD_TABLE_CREATE', label: 'Criar mesas' },
      { code: 'FOOD_TABLE_UPDATE', label: 'Editar mesas' },
      { code: 'FOOD_DELIVERY_VIEW', label: 'Visualizar delivery / iFood' },
      { code: 'FOOD_DELIVERY_CREATE', label: 'Criar entregas' },
      { code: 'FOOD_DELIVERY_UPDATE', label: 'Editar entregas' },
      { code: 'FOOD_KDS_VIEW', label: 'KDS (Cozinha)' },
    ],
  },
  {
    id: 'COMERCIAL',
    label: 'Comercial',
    permissions: [
      { code: 'COMERCIAL_CAMPAIGN_VIEW', label: 'Visualizar campanhas e promoções' },
      { code: 'COMERCIAL_CAMPAIGN_CREATE', label: 'Criar campanhas' },
      { code: 'COMERCIAL_CAMPAIGN_UPDATE', label: 'Editar campanhas' },
      { code: 'COMERCIAL_PROMO_VIEW', label: 'Visualizar promoções' },
      { code: 'COMERCIAL_PROMO_CREATE', label: 'Criar promoções' },
    ],
  },
  {
    id: 'COMPRAS',
    label: 'Compras / Suprimentos',
    permissions: [
      { code: 'COMPRAS_REQUEST_VIEW', label: 'Visualizar solicitações' },
      { code: 'COMPRAS_REQUEST_CREATE', label: 'Criar solicitações' },
      { code: 'COMPRAS_REQUEST_UPDATE', label: 'Editar solicitações' },
      { code: 'COMPRAS_REQUEST_DELETE', label: 'Excluir solicitações' },
      { code: 'COMPRAS_QUOTE_VIEW', label: 'Visualizar cotações' },
      { code: 'COMPRAS_QUOTE_CREATE', label: 'Criar cotações' },
      { code: 'COMPRAS_QUOTE_UPDATE', label: 'Gerenciar cotações' },
      { code: 'COMPRAS_APPROVE', label: 'Aprovar compras' },
      { code: 'COMPRAS_ORDER_VIEW', label: 'Visualizar pedidos de compra' },
      { code: 'COMPRAS_ORDER_CREATE', label: 'Criar pedidos de compra' },
      { code: 'COMPRAS_ORDER_UPDATE', label: 'Editar pedidos de compra' },
      { code: 'COMPRAS_RECEIVE', label: 'Receber mercadorias' },
    ],
  },
  {
    id: 'ESTOQUE',
    label: 'Estoque',
    permissions: [
      { code: 'ESTOQUE_VIEW', label: 'Visualizar estoque' },
      { code: 'ESTOQUE_CREATE', label: 'Criar movimentações' },
      { code: 'ESTOQUE_UPDATE', label: 'Editar estoque' },
      { code: 'ESTOQUE_DELETE', label: 'Excluir movimentações' },
      { code: 'ESTOQUE_OUTPUT', label: 'Baixar estoque' },
      { code: 'ESTOQUE_ADJUST', label: 'Ajustar estoque' },
      { code: 'ESTOQUE_INVENTORY_VIEW', label: 'Visualizar inventário' },
      { code: 'ESTOQUE_INVENTORY_CREATE', label: 'Realizar inventário' },
    ],
  },
  {
    id: 'WMS',
    label: 'Logística WMS',
    permissions: [
      { code: 'PRODUCTION_WMS_VIEW', label: 'Visualizar WMS' },
      { code: 'PRODUCTION_WMS_CREATE', label: 'Recebimento na doca / Armazenagem' },
      { code: 'PRODUCTION_WMS_UPDATE', label: 'Editar WMS' },
    ],
  },
  {
    id: 'PRODUCAO',
    label: 'Produção',
    permissions: [
      { code: 'PRODUCTION_ORDER_VIEW', label: 'Visualizar ordens de produção' },
      { code: 'PRODUCTION_ORDER_CREATE', label: 'Criar ordens de produção' },
      { code: 'PRODUCTION_ORDER_UPDATE', label: 'Editar ordens de produção' },
      { code: 'PRODUCTION_SCALE_VIEW', label: 'Terminal de balança' },
    ],
  },
  {
    id: 'FISCAL',
    label: 'Fiscal',
    permissions: [
      { code: 'FISCAL_VIEW', label: 'Visualizar fiscal / Notas PDV' },
      { code: 'FISCAL_NFE_EMIT', label: 'Emitir NF-e' },
      { code: 'FISCAL_NFCE_EMIT', label: 'Emitir NFC-e' },
      { code: 'FISCAL_CTE_EMIT', label: 'Emitir CT-e' },
      { code: 'FISCAL_NFSE_EMIT', label: 'Emitir NFS-e' },
      { code: 'FISCAL_CONFIG_UPDATE', label: 'Motor Fiscal / CFOP' },
      { code: 'FISCAL_XML_IMPORT', label: 'Importar XML' },
    ],
  },
  {
    id: 'FINANCEIRO',
    label: 'Financeiro',
    permissions: [
      { code: 'FINANCEIRO_VIEW', label: 'Visualizar financeiro' },
      { code: 'FINANCEIRO_CREATE', label: 'Lançar títulos' },
      { code: 'FINANCEIRO_UPDATE', label: 'Editar lançamentos' },
      { code: 'FINANCEIRO_DELETE', label: 'Excluir lançamentos' },
      { code: 'FINANCEIRO_REVERSE', label: 'Estornar lançamentos' },
      { code: 'FINANCEIRO_CONCILIATE', label: 'Conciliar contas' },
    ],
  },
  {
    id: 'CONTABIL',
    label: 'Contabilidade',
    permissions: [
      { code: 'CONTABIL_VIEW', label: 'Visualizar contábil' },
      { code: 'CONTABIL_UPDATE', label: 'Editar plano de contas / fechamento' },
      { code: 'CONTABIL_DRE_VIEW', label: 'DRE' },
      { code: 'CONTABIL_LEDGER_VIEW', label: 'Livro Razão' },
    ],
  },
  {
    id: 'IA',
    label: 'Central Aurya (IA)',
    permissions: [
      { code: 'IA_USE', label: 'Usar Central Aurya (Insights / Alertas / Oportunidades)' },
    ],
  },
  {
    id: 'DASHBOARD',
    label: 'Dashboards',
    permissions: [
      { code: 'DASHBOARD_VIEW', label: 'Visualizar dashboards' },
      { code: 'REPORT_VIEW', label: 'Visualizar relatórios' },
    ],
  },
];

export const MODULE_IDS = MODULES_CONFIG.map((m) => m.id);
export const PERMISSION_CODES = MODULES_CONFIG.flatMap((m) => m.permissions.map((p) => p.code));

export function permissionsForModules(modules: string[]): string[] {
  const wanted = new Set(modules.map((m) => String(m).trim().toUpperCase()));
  return MODULES_CONFIG.flatMap((m) => (wanted.has(m.id) ? m.permissions.map((p) => p.code) : []));
}