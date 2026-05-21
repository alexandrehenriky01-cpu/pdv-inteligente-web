import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';

// Rotas Públicas e Dashboard
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { DashboardFood } from './pages/DashboardFood';
import { SincronizacaoInicial } from './pages/SincronizacaoInicial';

// Cadastros Base
import { Categorias } from './pages/cadastros/Categorias'; 
import { Produtos } from './pages/cadastros/produtos'; 
import { Embalagens } from './pages/cadastros/embalagens';
import { CadastroPessoa } from './pages/cadastros/CadastroPessoa';

// Operacional e Vendas
import { FrenteCaixa } from './modules/operacoes/FrenteCaixa';
import { SelfCheckoutLayout } from './modules/selfcheckout/SelfCheckoutLayout';
import { SelfCheckoutPage } from './modules/selfcheckout/SelfCheckoutPage';
import { TotemLayout } from './modules/totem/TotemLayout';
import { TotemWelcomePage } from './modules/totem/pages/TotemWelcomePage';
import { TotemMenuPage } from './modules/totem/pages/TotemMenuPage';
import { TotemCheckoutPage } from './modules/totem/pages/TotemCheckoutPage';
import { PdvFoodService } from './modules/operacoes/PdvFoodService';
import { ComandaMobile } from './modules/operacoes/ComandaMobile';
import { KdsPage } from './modules/kds/KdsPage';
import { KdsChamadaBalcaoPage } from './modules/kds/KdsChamadaBalcaoPage';
import { PainelSenhasPage } from './modules/kds/PainelSenhasPage';
import { DeliveryLayout } from './modules/delivery/DeliveryLayout';
import { DeliveryMenuPage } from './modules/delivery/DeliveryMenuPage';
import { DeliveryCheckoutPage } from './modules/delivery/DeliveryCheckoutPage';
import { DeliveryTrackingPage } from './modules/delivery/DeliveryTrackingPage';
import { EntregasMobilePage } from './modules/delivery-tracking/pages/EntregasMobilePage';
import { EntregadorTrackPage } from './modules/delivery-tracking/pages/EntregadorTrackPage';
import { GestaoDeliveryPage } from './modules/delivery-tracking/pages/GestaoDeliveryPage';
import { CaixaMotoqueiroPage } from './modules/delivery-tracking/pages/CaixaMotoqueiroPage';

// Estoque
import { Estoque } from './modules/estoque/pages/Estoque';
import { TabelasPrecoPage } from './modules/estoque/pages/TabelasPrecoPage';
import IntegracaoBalancasPage from './modules/estoque/pages/IntegracaoBalancasPage';
import { DashboardEstoqueIA } from './modules/estoque/pages/DashboardEstoqueIA';
import { GestaoInventarioPage } from './modules/estoque/pages/GestaoInventarioPage';
import { ContagemCegaPage } from './modules/estoque/pages/ContagemCegaPage';

// 📦 MÓDULO WMS (Warehouse Management System)
import { RecebimentoIndustria } from './modules/producao/recebimento_expedicao/RecebimentoIndustria';
import { WmsArmazenagem } from './modules/producao/estocagem/WmsArmazenagem';
import { WmsConsultaEstoque } from './modules/producao/estocagem/WmsConsultaEstoque';
import { WmsAreas } from './modules/producao/estocagem/WmsAreas';

// Fiscal e Notas
import { GestaoNotas } from './modules/fiscal/GestaoNotas';
import { NotasFiscais } from './modules/fiscal/NotasFiscais';
import { EmissaoNotaManual } from './modules/fiscal/EmissaoNotaManual';
import { CadastroCfop } from './pages/cadastros/CadastroCfop';
import { RegrasFiscais } from './pages/cadastros/RegrasFiscais';

// Compras e Entrada de Notas
import { EntradaNotas } from './modules/fiscal/EntradaNotas';
import { ListarNfe } from './modules/fiscal/ListarNfe';
import { ImportarNfe } from './modules/fiscal/ImportarNfe';
import { SolicitacoesCompraPage } from './modules/compras/pages/SolicitacoesCompraPage';
import { AprovacaoSolicitacaoCompra } from './modules/compras/pages/AprovacaoSolicitacaoCompra';
import { CotacoesPage } from './modules/compras/pages/CotacoesPage';
import { GerenciarCotacoes } from './modules/compras/pages/GerenciarCotacoes';
import { PedidosCompraPage } from './modules/compras/pages/PedidosCompraPage';
import { AcompanhamentoComprasPage } from './modules/compras/pages/AcompanhamentoComprasPage';
import { RecebimentoMercadoriaPage } from './modules/compras/pages/RecebimentoMercadoriaPage';
import { DivergenciasPage } from './modules/compras/pages/DivergenciasPage';
import { AnaliseAuryaComprasPage } from './modules/compras/pages/AnaliseAuryaComprasPage';
import PainelComprasIA from "./modules/compras/pages/PainelComprasIA";
// ✅ NOVO: Importação da tela de Pedidos de Recebimento
import { PedidoRecebimentoPage } from './modules/compras/recebimento/PedidoRecebimentoPage';

// Financeiro
import { DashboardFinanceiro } from './modules/financeiro/pages/DashboardFinanceiro';
import { GestaoTitulosPage } from './modules/financeiro/pages/GestaoTitulosPage';
import { PainelChequesPage } from './modules/financeiro/pages/PainelChequesPage';
import { GestaoCaixasPage } from './modules/financeiro/pages/GestaoCaixasPage';
import { ExtratoFinanceiroPage } from './modules/financeiro/pages/ExtratoFinanceiroPage'; 

// Contábil
import { DashboardContabil } from './modules/contabil/pages/DashboardContabil';
import { ExtratoContabilPage } from './modules/contabil/pages/ExtratoContabilPage';
import { ConciliacaoPage } from './modules/contabil/pages/ConciliacaoPage';
import { DREPage } from './modules/contabil/pages/DREPage';
import { PlanoContasPage } from './modules/contabil/pages/PlanoContasPage';
import { DashboardGlobal } from './modules/contabil/pages/DashboardGlobal';

// IA e Admin
import { ConsultorIA } from './pages/ConsultorIA';
import { AdminClientesPage } from './pages/admin/AdminClientesPage';
import { AdminEmpresaFeaturesPage } from './pages/admin/AdminEmpresaFeaturesPage';
import { AdminRuntimePage } from './pages/admin/AdminRuntimePage';

// Gestão de Usuários, Equipe e Configurações
import { GestaoUsuariosPage } from './modules/configuracoes/pages/GestaoUsuariosPage';
import { GestaoPermissoesPage } from './modules/configuracoes/pages/GestaoPermissoesPage';
import { GestaoTefPage } from './modules/configuracoes/pages/GestaoTefPage';
import { PixConfigPage } from './modules/pix/pages/PixConfigPage';
import ConfiguracoesLoja from './modules/clientes_sistema/ConfiguracoesLoja';

// 🖨️ MÓDULO DE ETIQUETAS, ESTAÇÕES DE TRABALHO E BALANÇAS
import LayoutEtiquetasPage from './modules/producao/configuracoes/LayoutEtiquetasPage'; 
import LayoutEtiquetaEditorPage from './modules/producao/configuracoes/LayoutEtiquetaEditorPage'; 
import EstacoesTrabalhoPage from './modules/producao/configuracoes/EstacoesTrabalhoPage'; 
import BalancasPage from './modules/producao/configuracoes/BalancasPage';
import RhAgentDispositivosPage from './modules/rh-agent/pages/RhAgentDispositivosPage';
import RhDashboardPage from './modules/rh/pages/RhDashboardPage';
import RhFuncionariosPage from './modules/rh/pages/RhFuncionariosPage';
import RhDepartamentosPage from './modules/rh/pages/RhDepartamentosPage';
import RhCargosPage from './modules/rh/pages/RhCargosPage';
import RhJornadasPage from './modules/rh/pages/RhJornadasPage';
import RhEscalasPage from './modules/rh/pages/RhEscalasPage';
import RhDocumentosPage from './modules/rh/pages/RhDocumentosPage';
import RhConsentimentosPage from './modules/rh/pages/RhConsentimentosPage';
import RhMarcacoesPage from './modules/rh-ponto/pages/RhMarcacoesPage';
import RhAjustesPage from './modules/rh-ponto/pages/RhAjustesPage';
import RhJustificativasPage from './modules/rh-ponto/pages/RhJustificativasPage';
import RhBancoHorasPage from './modules/rh-ponto/pages/RhBancoHorasPage';
import RhFechamentosPage from './modules/rh-ponto/pages/RhFechamentosPage';
import RhCartaoPontoPage from './modules/rh-ponto/pages/RhCartaoPontoPage';
import TotemRhPage from './modules/rh-ponto/totem/TotemRhPage';
import RhBiometryLabPage from './modules/rh-biometry-lab/pages/RhBiometryLabPage';
import RhBiometriaFuncionarioPage from './modules/rh-biometry/pages/RhBiometriaFuncionarioPage';
import RhPortalPage from './modules/rh-portal/pages/RhPortalPage';
import RhOperacionalDashboardPage from './modules/rh-operacional/pages/RhDashboardPage';
import RhDivergenciasPage from './modules/rh-operacional/pages/RhDivergenciasPage';
import RhAssinaturasPage from './modules/rh-operacional/pages/RhAssinaturasPage';
import { CaixasConfigPage } from './modules/vendas/pages/CaixasConfigPage';
import { AdquirentesPage } from './modules/vendas/pages/AdquirentesPage';
import { CampanhasPromocionaisPage } from './modules/vendas/pages/CampanhasPromocionaisPage';
import { GestaoTurnosCaixaPage } from './modules/vendas/pages/GestaoTurnosCaixaPage';
import { GestaoVendasPage } from './modules/vendas/pages/GestaoVendasPage';
import { GestaoPedidosFoodPage } from './modules/vendas/pages/GestaoPedidosFoodPage';
import { GestaoCardapioPage } from './modules/vendas/pages/GestaoCardapioPage';
import { GarcomLayout } from './modules/garcom/GarcomLayout';
import { GarcomMesasPage } from './modules/garcom/pages/GarcomMesasPage';
import { GarcomMesaContaPage } from './modules/garcom/pages/GarcomMesaContaPage';
import { GarcomPedirPage } from './modules/garcom/pages/GarcomPedirPage';
import { GarcomFechamentoPage } from './modules/garcom/pages/GarcomFechamentoPage';

// IMPORTAÇÃO DO GUARDIÃO DE ROTAS TIPADO
import { PrivateRoute } from './components/PrivateRoute';
import { RenderIfModule } from './components/RenderIfModule';
import { AuthProvider } from './contexts/AuthContext';

// 🥩 MÓDULO DE PRODUÇÃO (AÇOUGUE / INDÚSTRIA)
import { OrdemProducao } from './modules/producao/desossa/OrdemProducao';
import { PesagemProducao } from './modules/producao/desossa/PesagemProducao';

function App() {
  return (
    <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
      <Routes>
        
        {/* 🔓 ROTAS PÚBLICAS */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />

        {/* RC1.13 — Tela de sincronização inicial (pós-login quando
            snapshotApplied=false). Intencionalmente fora do PrivateRoute:
            o backend já gateia operação real via SnapshotGate (412). */}
        <Route path="/sync-inicial" element={<SincronizacaoInicial />} />

        <Route path="/menu/:slug" element={<DeliveryLayout />}>
          <Route index element={<DeliveryMenuPage />} />
          <Route path="checkout" element={<DeliveryCheckoutPage />} />
          <Route path="pedido/:pedidoId" element={<DeliveryTrackingPage />} />
        </Route>

        {/* QR público do romaneio: o token na URL valida acesso (entregador
            não está logado no ERP). NÃO mover para dentro de PrivateRoute. */}
        <Route path="/entregas/mobile/:token" element={<EntregasMobilePage />} />
        <Route path="/track/:token" element={<EntregadorTrackPage />} />
        
        {/* 👑 ROTAS SAAS (ACESSO RESTRITO AO SUPER_ADMIN) */}
        <Route element={<PrivateRoute rolesPermitidas={['SUPER_ADMIN', 'SUPORTE_MASTER']} />}>
          <Route path="/admin/clientes" element={<AdminClientesPage />} />
          <Route path="/admin/empresas/:empresaId/features" element={<AdminEmpresaFeaturesPage />} />
          {/* Lote C7.C — dashboard runtime operacional */}
          <Route path="/admin/runtime" element={<AdminRuntimePage />} />
        </Route>

        {/* 🔒 ROTAS PRIVADAS PADRÃO (Acesso para usuários logados) */}
        <Route element={<PrivateRoute />}>
          
          {/* 📊 Visão Geral */}
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/dashboard-food" element={<DashboardFood />} />
          
          {/* 🧠 Central da Aurya */}
          <Route path="/ConsultorIA" element={<ConsultorIA />} />
          <Route path="/aurya/insights" element={<ConsultorIA />} />
          <Route path="/aurya/alertas" element={<ConsultorIA />} />
          <Route path="/aurya/oportunidades" element={<ConsultorIA />} />
          
          {/* 🏢 Cadastros Base */}
          <Route path="/categorias" element={<Categorias />} />
          <Route path="/embalagens" element={<Embalagens />} />
          <Route path="/produtos" element={<Produtos />} />
          <Route path="/pessoas" element={<CadastroPessoa />} />
          <Route path="/pessoas/novo" element={<CadastroPessoa />} />
          <Route path="/cadastro-pessoa" element={<CadastroPessoa />} />
          
          {/* 🚀 GESTÃO DE EQUIPE E ACESSOS (RBAC) */}
          <Route path="/equipe" element={<GestaoUsuariosPage />} />
          <Route path="/permissoes" element={<GestaoPermissoesPage />} />
          <Route path="/configuracao-tef" element={<GestaoTefPage />} />
          <Route path="/configuracao-pix" element={<PixConfigPage />} />
          <Route path="/configuracoes-loja" element={<ConfiguracoesLoja />} />
          
          {/* 👇 MÓDULO DE IMPRESSÃO E PRODUÇÃO E HARDWARE */}
          <Route path="/layout-etiquetas" element={<LayoutEtiquetasPage />} />
          <Route path="/configuracoes/etiquetas/:id/editor" element={<LayoutEtiquetaEditorPage />} />
          <Route path="/estacoes-trabalho" element={<EstacoesTrabalhoPage />} />
          <Route path="/locais-cobranca" element={<AdquirentesPage />} />
          <Route path="/configuracao-caixas-pdv" element={<CaixasConfigPage />} />
          <Route path="/balancas" element={<BalancasPage />} />
          <Route path="/rh-agent/dispositivos" element={<RhAgentDispositivosPage />} />
          <Route path="/rh" element={<RhDashboardPage />} />
          <Route path="/rh/funcionarios" element={<RhFuncionariosPage />} />
          <Route path="/rh/departamentos" element={<RhDepartamentosPage />} />
          <Route path="/rh/cargos" element={<RhCargosPage />} />
          <Route path="/rh/jornadas" element={<RhJornadasPage />} />
          <Route path="/rh/escalas" element={<RhEscalasPage />} />
          <Route path="/rh/documentos" element={<RhDocumentosPage />} />
          <Route path="/rh/consentimentos" element={<RhConsentimentosPage />} />
          <Route path="/rh-ponto/marcacoes" element={<RhMarcacoesPage />} />
          <Route path="/rh-ponto/ajustes" element={<RhAjustesPage />} />
          <Route path="/rh-ponto/justificativas" element={<RhJustificativasPage />} />
          <Route path="/rh-ponto/banco-horas" element={<RhBancoHorasPage />} />
          <Route path="/rh-ponto/fechamentos" element={<RhFechamentosPage />} />
          <Route path="/rh-ponto/cartao" element={<RhCartaoPontoPage />} />
          <Route path="/rh/biometric-lab" element={<RhBiometryLabPage />} />
          <Route path="/rh/biometria" element={<RhBiometriaFuncionarioPage />} />
          <Route path="/rh/portal" element={<RhPortalPage />} />
          <Route path="/rh/dashboard" element={<RhOperacionalDashboardPage />} />
          <Route path="/rh/divergencias" element={<RhDivergenciasPage />} />
          <Route path="/rh/assinaturas" element={<RhAssinaturasPage />} />

          {/* 🛒 Operacional & Vendas */}
          <Route path="/frente-caixa" element={<FrenteCaixa />} />
          <Route
            path="/self-checkout"
            element={
              <SelfCheckoutLayout>
                <SelfCheckoutPage />
              </SelfCheckoutLayout>
            }
          />
          <Route path="/totem-food" element={<TotemLayout />}>
            <Route index element={<TotemWelcomePage />} />
            <Route path="cardapio" element={<TotemMenuPage />} />
            <Route path="pagamento" element={<TotemCheckoutPage />} />
          </Route>
          <Route path="/totem-rh" element={<TotemRhPage />} />
          <Route path="/pdv-food" element={<PdvFoodService />} />
          <Route path="/kds" element={<KdsPage />} />
          <Route path="/kds-chamada-balcao" element={<KdsChamadaBalcaoPage />} />
          <Route path="/painel-senhas" element={<PainelSenhasPage />} />
          <Route path="/comanda-mobile" element={<ComandaMobile />} />
          {/* App do garçom — restrito por role para impedir acesso externo */}
          <Route element={<PrivateRoute rolesPermitidas={['GARCOM', 'GERENTE', 'DIRETOR', 'SUPER_ADMIN', 'SUPORTE_MASTER']} />}>
            <Route path="/garcom" element={<GarcomLayout />}>
              <Route index element={<Navigate to="/garcom/mesas" replace />} />
              <Route path="mesas" element={<GarcomMesasPage />} />
              <Route path="mesa/:numeroMesa" element={<GarcomMesaContaPage />} />
              <Route path="mesa/:numeroMesa/fechar" element={<GarcomFechamentoPage />} />
              <Route path="mesa/:numeroMesa/pedir" element={<GarcomPedirPage />} />
            </Route>
          </Route>
          <Route path="/vendas/campanhas-promocionais" element={<CampanhasPromocionaisPage />} />
          <Route path="/vendas/gestao-turnos-caixa" element={<GestaoTurnosCaixaPage />} />
          <Route path="/vendas/gestao-vendas" element={<GestaoVendasPage />} />
          <Route path="/gestao-food" element={<GestaoPedidosFoodPage />} />
          <Route path="/vendas/gestao-delivery" element={<GestaoDeliveryPage />} />
          <Route path="/caixa-motoqueiro" element={<CaixaMotoqueiroPage />} />
          <Route path="/entregas/mobile" element={<EntregasMobilePage />} />
          <Route
            path="/cardapio/gestao"
            element={
              <RenderIfModule module="FOOD_SERVICE">
                <GestaoCardapioPage />
              </RenderIfModule>
            }
          />
          
          {/* 📦 Estoque Inteligente */}
          <Route path="/estoque" element={<Estoque />} />
          <Route path="/estoque/entrada" element={<ImportarNfe />} />
          <Route path="/estoque/inteligencia" element={<DashboardEstoqueIA />} />
          <Route path="/estoque/inventario" element={<GestaoInventarioPage />} />
          <Route path="/estoque/bipador" element={<ContagemCegaPage />} />
          <Route path="/estoque/listas-preco" element={<TabelasPrecoPage />} />
          <Route path="/estoque/carga-balancas" element={<IntegracaoBalancasPage />} />

          {/* 🏭 Logística e WMS */}
          <Route path="/wms/recebimento" element={<RecebimentoIndustria />} />
          <Route path="/wms/armazenagem" element={<WmsArmazenagem />} />
          <Route path="/wms/estoque" element={<WmsConsultaEstoque />} />
          <Route path="/wms/areas" element={<WmsAreas />} />

          {/* 🧾 Fiscal Inteligente */}
          <Route path="/cadastrocfop" element={<CadastroCfop />} />
          <Route path="/regras-fiscais" element={<RegrasFiscais />} />
          <Route path="/notas-fiscais" element={<NotasFiscais />} />
          <Route path="/notas" element={<GestaoNotas />} />
          <Route path="/notas/emitir" element={<EmissaoNotaManual />} />
          
          {/* 🛍️ Compras & Suprimentos */}
          <Route path="/entrada-notas" element={<EntradaNotas />} />
          <Route path="/ListarNfe" element={<ListarNfe />} />
          <Route path="/compras/solicitacoes" element={<SolicitacoesCompraPage />} />             
          <Route path="/compras/AprovacaoSolicitacaoCompra" element={<AprovacaoSolicitacaoCompra />} />
          <Route path="/compras/cotacoes" element={<CotacoesPage />} />
          <Route path="/compras/gerenciar-cotacoes" element={<GerenciarCotacoes />} />
          <Route path="/compras/pedidos" element={<PedidosCompraPage />} />
          <Route path="/compras/acompanhamento" element={<AcompanhamentoComprasPage />} />
          <Route path="/compras/recebimento-mercadorias" element={<RecebimentoMercadoriaPage />} />
          {/* ✅ NOVO: Rota para a tela de Pedidos de Recebimento */}
          <Route path="/compras/pedidos-recebimento" element={<PedidoRecebimentoPage />} />
          <Route path="/compras/divergencias" element={<DivergenciasPage />} />
          <Route path="/compras/inteligencia" element={<AnaliseAuryaComprasPage />} />
          <Route path="/compras/InteligenciaComprasService" element={<PainelComprasIA />} />  

          {/* 💰 Financeiro Inteligente */}
          <Route path="/financeiro/dashboard" element={<DashboardFinanceiro />} />
          <Route path="/financeiro/gestao-titulos" element={<GestaoTitulosPage />} />
          <Route path="/financeiro/cheques" element={<PainelChequesPage />} />
          <Route path="/financeiro/caixas" element={<GestaoCaixasPage />} />
          <Route path="/financeiro/extrato" element={<ExtratoFinanceiroPage />} />

          {/* 📈 Contábil & Análise */}
          <Route path="/contabil/dashboard" element={<DashboardContabil />} />
          <Route path="/contabil/conciliacao" element={<ConciliacaoPage />} />
          <Route path="/contabilidade/dre" element={<DREPage />} />
          <Route path="/contabil/extrato" element={<ExtratoContabilPage />} />
          <Route path="/contabil/plano-contas" element={<PlanoContasPage />} />
          <Route path="/contabil/dashboardglobal" element={<DashboardGlobal />} />

          {/* 🥩 Produção e Desossa */}
          <Route path="/producao/op" element={<OrdemProducao />} />
          <Route path="/producao/pesagem" element={<PesagemProducao />} />

        </Route>
      </Routes>
      </AuthProvider>
    </HashRouter>
  );
}

export default App;
