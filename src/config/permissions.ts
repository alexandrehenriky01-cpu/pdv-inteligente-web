export type ModuleConfig = {
  id: string;
  label: string;
  permissions: Array<{ code: string; label: string }>;
};

export const MODULES_CONFIG: ModuleConfig[] = [
  {
    id: 'ESTRUTURA',
    label: 'Administrativo (Estrutura)',
    permissions: [
      { code: 'MANUTENCAO_PRODUTOS', label: 'Produtos' },
      { code: 'MANUTENCAO_CATEGORIAS', label: 'Categorias' },
      { code: 'MANUTENCAO_EMBALAGENS', label: 'Embalagens (BOM)' },
      { code: 'MANUTENCAO_PESSOAS', label: 'Pessoas' },
      { code: 'MANUTENCAO_EQUIPES', label: 'Equipe' },
      { code: 'MANUTENCAO_PERMISSOES', label: 'Permissões' },
      { code: 'CONFIG_MINHA_LOJA', label: 'Minha Loja' },
      { code: 'MANUTENCAO_ETIQUETAS', label: 'Layout Etiquetas' },
      { code: 'CONFIG_ESTACOES', label: 'Estações de Trabalho' },
      { code: 'MANUTENCAO_LOCAIS_COBRANCA', label: 'Locais de Cobrança' },
      { code: 'CONFIG_CAIXAS_PDV', label: 'Caixas PDV' },
      { code: 'CONFIG_TEF', label: 'Gestão TEF' },
      { code: 'CONFIG_BALANCAS', label: 'Balanças' },
    ],
  },
  {
    id: 'PDV',
    label: 'Vendas PDV',
    permissions: [
      { code: 'VENDAS_VAREJO_PDV', label: 'PDV Varejo' },
      { code: 'VENDAS_VAREJO_AUTOATENDIMENTO', label: 'Autoatendimento' },
    ],
  },
  {
    id: 'FOOD_SERVICE',
    label: 'Food Service',
    permissions: [
      { code: 'FOOD_SERVICE_PDV', label: 'PDV Food' },
      { code: 'FOOD_SERVICE_AUTOATENDIMENTO', label: 'Autoatendimento FOODS' },
      { code: 'MANUTENCAO_CARDAPIOS', label: 'Cadastro de Cardápio' },
      { code: 'FOOD_SERVICE_KDS', label: 'KDS (Cozinha)' },
      { code: 'FOOD_SERVICE_DELIVERY', label: 'Gestão Delivery/Pedidos' },
      { code: 'FOOD_SERVICE_EXPEDICAO', label: 'Gestão Food/Expedição' },
      { code: 'FOOD_SERVICE_COMANDA_MOBILE', label: 'Comanda Mobile' },
      { code: 'FOOD_SERVICE_GARCOM', label: 'Garçom (Mesas)' },
      { code: 'FOOD_SERVICE_IFOOD', label: 'Pedidos IFOOD' },
    ],
  },
  {
    id: 'COMERCIAL',
    label: 'Comercial',
    permissions: [
      { code: 'COMERCIAL_CAMPANHAS', label: 'Campanhas e Promoções' },
      { code: 'COMERCIAL_LISTA_PRECO', label: 'Listas de Preços' },
      { code: 'COMERCIAL_CARGA_BALANCA', label: 'Carga de Balanças' },
    ],
  },
  {
    id: 'COMPRAS',
    label: 'Compras',
    permissions: [
      { code: 'COMPRAS_SOLICITACOES', label: 'Solicitações' },
      { code: 'COMPRAS_COTACOES', label: 'Cotações' },
      { code: 'COMPRAS_GER_COTACOES', label: 'Gerenciar Cotações' },
      { code: 'COMPRAS_APROVACAO', label: 'Aprovação de Compras' },
      { code: 'COMPRAS_PEDIDOS', label: 'Pedidos' },
      { code: 'COMPRAS_ACOMPANHAMENTO', label: 'Acompanhamento P2P' },
      { code: 'COMPRAS_PEDIDOS_RECEBIMENTO', label: 'Pedidos de Recebimento' },
      { code: 'COMPRAS_RECEBIMENTO', label: 'Recebimento Mercadorias' },
      { code: 'COMPRAS_DIVERGENCIAS', label: 'Divergências' },
      { code: 'COMPRAS_XML', label: 'XML' },
      { code: 'COMPRAS_NOTAS_ENTRADA', label: 'Notas de Entrada' },
      { code: 'COMPRAS_AURYA', label: 'Análise Aurya' },
    ],
  },
  {
    id: 'ESTOQUE',
    label: 'Estoque',
    permissions: [
      { code: 'ESTOQUE_AURYA', label: 'Inteligência de Estoque' },
      { code: 'ESTOQUE_GESTAO', label: 'Gestão' },
      { code: 'ESTOQUE_INVENTARIO', label: 'Inventário' },
      { code: 'ESTOQUE_BIPADOR', label: 'Bipador' },
      { code: 'COMERCIAL_LISTA_PRECO', label: 'Listas de Preços' },
      { code: 'COMERCIAL_CARGA_BALANCA', label: 'Carga de Balanças' },
    ],
  },
  {
    id: 'WMS',
    label: 'Logística WMS',
    permissions: [
      { code: 'WMS_RECEBIMENTO', label: 'Recebimento (Doca)' },
      { code: 'WMS_ARMAZENAGEM', label: 'Armazenagem (Putaway)' },
      { code: 'WMS_MAPA', label: 'Mapa de Estoque' },
      { code: 'WMS_CAMARAS', label: 'Câmaras Frias & Áreas' },
    ],
  },
  {
    id: 'PRODUCAO',
    label: 'Produção',
    permissions: [
      { code: 'PRODUCAO_ORDENS', label: 'Ordens de Produção' },
      { code: 'PRODUCAO_BALANCA', label: 'Terminal de Balança' },
    ],
  },
  {
    id: 'FISCAL',
    label: 'Fiscal',
    permissions: [
      { code: 'FISCAL_PDV', label: 'Notas PDV' },
      { code: 'FISCAL_NFE', label: 'NF-e' },
      { code: 'FISCAL_MOTOR', label: 'Motor Fiscal' },
      { code: 'FISCAL_CFOP', label: 'CFOP' },
    ],
  },
  {
    id: 'FINANCEIRO',
    label: 'Financeiro',
    permissions: [
      { code: 'FINANCEIRO_AURYA', label: 'Aurya Análise Financeiro' },
      { code: 'FINANCEIRO_TITULOS', label: 'Títulos (Pagar/Receber)' },
      { code: 'FINANCEIRO_CONTAS_CAIXAS', label: 'Contas e Caixas' },
      { code: 'FINANCEIRO_EXTRATO', label: 'Extrato de Contas' },
      { code: 'FINANCEIRO_CHEQUES', label: 'Cheques' },
    ],
  },
  {
    id: 'CONTABIL',
    label: 'Contabilidade',
    permissions: [
      { code: 'CONTABIL_AURYA', label: 'Aurya Diagnóstico Contábil' },
      { code: 'CONTABIL_DRE', label: 'DRE' },
      { code: 'CONTABIL_PLANO_CONTAS', label: 'Plano de Contas' },
      { code: 'CONTABIL_RAZAO', label: 'Livro Razão' },
      { code: 'CONTABIL_CONCILIACAO', label: 'Conciliação' },
      { code: 'CONTABIL_FECHAMENTO', label: 'Fechamento Contábil' },
    ],
  },
  {
    id: 'IA',
    label: 'Central Aurya',
    permissions: [
      { code: 'IA_USAR', label: 'Usar IA' },
      { code: 'IA_INSIGHTS', label: 'Insights' },
      { code: 'IA_ALERTAS', label: 'Alertas' },
      { code: 'IA_OPORTUNIDADES', label: 'Oportunidades' },
    ],
  },
  {
    id: 'DASHBOARD',
    label: 'Dashboards',
    permissions: [
      { code: 'DASHBOARDS_ACESSAR', label: 'Acessar Dashboards' },
    ],
  },
];

export const MODULE_IDS = MODULES_CONFIG.map((m) => m.id);
export const PERMISSION_CODES = MODULES_CONFIG.flatMap((m) => m.permissions.map((p) => p.code));

export function permissionsForModules(modules: string[]): string[] {
  const wanted = new Set(modules.map((m) => String(m).trim().toUpperCase()));
  return MODULES_CONFIG.flatMap((m) => (wanted.has(m.id) ? m.permissions.map((p) => p.code) : []));
}