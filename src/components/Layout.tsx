import { ReactNode, useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import {
  ChevronDown, ChevronRight, ChevronsLeft, ChevronsRight,
  LayoutDashboard, Database, Package, Tags, Users, UserCog,
  Scale, Settings, Monitor, ShoppingCart, ShoppingBag, ClipboardList,
  AlertTriangle, Inbox, FileText, BrainCircuit, Receipt, FileUp,
  Wallet, TrendingUp, CheckSquare, Landmark, CreditCard, BookOpen,
  ScanSearch, Smartphone, LogOut, Sparkles, ShieldCheck, Building2, UtensilsCrossed,
  ListOrdered, Network, Factory, Printer, ArrowRightLeft, Map, Layers, Truck, Box, Radar, PackageCheck
} from 'lucide-react'; // ✅ NOVO: Adicionado ícone Truck

import { IUsuario } from '../types/auth';
import { AUTH_USER_KEY } from '../services/authStorage';
import { clearAuthSessionAndAxios } from '../services/authSession';
import { useAuryaTheme } from '../theme/ThemeContext';
import { ThemeToggle } from '../theme/ThemeToggle';

interface LayoutProps {
  children: ReactNode;
}

interface IUsuarioLayout extends Omit<IUsuario, 'role'> {
  role?: string;
  permissoes?: string[];
  loja?: {
    nome?: string;
    modulosAtivos?: string[]; 
    [key: string]: unknown;
  };
}

type MenuSectionId =
  | 'centralAurya'
  | 'estruturaNegocio'
  | 'operacaoVendas'
  | 'comprasSuprimentos'
  | 'fiscalInteligente'
  | 'financeiroInteligente'
  | 'contabilidadeAnalise'
  | 'estoqueInteligente'
  | 'logisticaWms'
  | 'producaoIndustria'
  | 'adminSaaS';

interface MenuItemProps {
  to: string;
  icon: React.ElementType;
  label: string;
  target?: string;
  isAi?: boolean;
  isActive: boolean;
  collapsed: boolean;
  mode: 'dark' | 'light';
  theme: ReturnType<typeof useAuryaTheme>['theme'];
}

const MenuItem = ({ to, icon: Icon, label, target, isAi = false, isActive, collapsed, mode, theme }: MenuItemProps) => {
  const activeClass = isAi
    ? mode === 'dark'
      ? 'bg-gradient-to-r from-violet-600/25 via-violet-500/20 to-fuchsia-500/20 text-white border border-violet-400/25 shadow-[0_0_20px_rgba(139,92,246,0.20)]'
      : 'bg-gradient-to-r from-violet-100 to-fuchsia-100 text-slate-900 border border-violet-300 shadow-[0_0_0_1px_rgba(139,92,246,0.08)]'
    : mode === 'dark'
      ? 'bg-white/8 text-white border border-white/10 shadow-[0_0_18px_rgba(139,92,246,0.08)]'
      : 'bg-slate-100 text-slate-900 border border-slate-200 shadow-[0_4px_12px_rgba(15,23,42,0.05)]';

  const idleClass = isAi
    ? mode === 'dark'
      ? 'text-violet-300 hover:text-white hover:bg-violet-500/12 border border-transparent hover:border-violet-500/15'
      : 'text-violet-700 hover:text-slate-900 hover:bg-violet-50 border border-transparent hover:border-violet-200'
    : `${theme.classes.sidebarMuted} ${theme.classes.sidebarHover} border border-transparent`;

  const iconClass = isActive
    ? mode === 'dark' ? 'text-violet-300' : 'text-violet-700'
    : isAi
      ? mode === 'dark' ? 'text-violet-400 group-hover:text-violet-300' : 'text-violet-600 group-hover:text-violet-700'
      : mode === 'dark' ? 'text-slate-500 group-hover:text-violet-300' : 'text-slate-500 group-hover:text-violet-700';

  return (
    <Link to={to} target={target} title={label} className={`group flex items-center ${collapsed ? 'justify-center px-2' : 'gap-3 px-3'} py-2.5 rounded-xl text-sm font-medium transition-all duration-200 overflow-hidden backdrop-blur-md ${isActive ? activeClass : idleClass}`}>
      <Icon className={`w-4 h-4 shrink-0 ${iconClass}`} />
      {!collapsed && (
        <>
          <span className="truncate flex-1">{label}</span>
          {isAi && <Sparkles className={`w-3 h-3 shrink-0 ${isActive ? 'text-violet-300' : 'text-violet-500'} animate-pulse`} />}
        </>
      )}
    </Link>
  );
};

interface SectionHeaderProps {
  id: MenuSectionId;
  title: string;
  icon: React.ElementType;
  isAi?: boolean;
  isOpen: boolean;
  collapsed: boolean;
  onToggle: (id: MenuSectionId) => void;
  mode: 'dark' | 'light';
  theme: ReturnType<typeof useAuryaTheme>['theme'];
}

const SectionHeader = ({ id, title, icon: Icon, isAi = false, isOpen, collapsed, onToggle, mode, theme }: SectionHeaderProps) => {
  if (collapsed) {
    return (
      <button onClick={() => onToggle(id)} title={title} className={`mt-2 flex w-full items-center justify-center rounded-xl border p-3 transition-all duration-200 backdrop-blur-md ${isOpen ? (isAi ? (mode === 'dark' ? 'bg-violet-500/12 border-violet-500/20 text-violet-300' : 'bg-violet-50 border-violet-200 text-violet-700') : (mode === 'dark' ? 'bg-white/[0.07] border-white/10 text-white' : 'bg-slate-100 border-slate-200 text-slate-900')) : (isAi ? (mode === 'dark' ? 'text-violet-400 hover:bg-violet-500/12 border-transparent hover:border-violet-500/15' : 'text-violet-600 hover:bg-violet-50 border-transparent hover:border-violet-200') : (mode === 'dark' ? 'text-slate-400 hover:bg-white/[0.06] border-transparent hover:border-white/10' : 'text-slate-500 hover:bg-slate-100 border-transparent hover:border-slate-200'))}`}>
        <Icon className={`w-4 h-4 ${isOpen ? (mode === 'dark' ? 'text-violet-300' : 'text-violet-700') : (isAi ? (mode === 'dark' ? 'text-violet-500' : 'text-violet-600') : 'text-slate-500')}`} />
      </button>
    );
  }

  return (
    <button onClick={() => onToggle(id)} title={title} className={`mt-2 flex w-full items-center justify-between overflow-hidden rounded-xl border p-3 transition-all duration-200 backdrop-blur-md ${isOpen ? (isAi ? (mode === 'dark' ? 'bg-violet-500/12 border-violet-500/20 text-violet-300' : 'bg-violet-50 border-violet-200 text-violet-700') : (mode === 'dark' ? 'bg-white/[0.07] border-white/10 text-white' : 'bg-slate-100 border-slate-200 text-slate-900')) : (isAi ? (mode === 'dark' ? 'text-violet-400 hover:bg-violet-500/10 border-transparent hover:border-violet-500/15' : 'text-violet-700 hover:bg-violet-50 border-transparent hover:border-violet-200') : `${theme.classes.sidebarText} ${theme.classes.sidebarHover}`)}`}>
      <div className="flex min-w-0 items-center gap-3 text-[11px] font-bold uppercase tracking-[0.16em]">
        <Icon className={`w-4 h-4 shrink-0 ${isOpen ? (mode === 'dark' ? 'text-violet-300' : 'text-violet-700') : (isAi ? (mode === 'dark' ? 'text-violet-500' : 'text-violet-600') : 'text-slate-500')}`} />
        <span className="truncate">{title}</span>
        {isAi && <Sparkles className={`ml-1 h-3 w-3 shrink-0 animate-pulse ${mode === 'dark' ? 'text-violet-400' : 'text-violet-600'}`} />}
      </div>
      {isOpen ? <ChevronDown className={`h-4 w-4 shrink-0 ${mode === 'dark' ? 'text-violet-400' : 'text-violet-600'}`} /> : <ChevronRight className="h-4 w-4 shrink-0 text-slate-500" />}
    </button>
  );
};

const MacroGroupTitle = ({ title, collapsed, mode }: { title: string; collapsed: boolean; mode: 'dark' | 'light' }) => {
  if (collapsed) {
    return <div className={`my-4 border-t ${mode === 'dark' ? 'border-white/10' : 'border-slate-200'}`} />;
  }
  return (
    <div className={`mt-6 mb-2 px-3 text-[10px] font-black uppercase tracking-[0.25em] ${mode === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
      {title}
    </div>
  );
};

export function Layout({ children }: LayoutProps) {
  const navigate = useNavigate();
  const { theme, mode } = useAuryaTheme();
  const location = useLocation();

  let usuario: Partial<IUsuarioLayout> = {};
  try {
    const userStr = localStorage.getItem(AUTH_USER_KEY);
    if (userStr) {
      usuario = JSON.parse(userStr) as IUsuarioLayout;
    }
  } catch (error) {
    console.error('Falha ao ler dados do usuário no Layout:', error);
  }

  const temPermissao = (modulo: string) => {
    if (usuario?.role === 'SUPER_ADMIN' || usuario?.role === 'SUPORTE_MASTER') return true;

    const modulosLoja = (usuario?.loja?.modulosAtivos as string[]) || [];
    const permissoesUser = usuario?.permissoes || [];
    
    const acessos = [...modulosLoja, ...permissoesUser].map(a => String(a).toUpperCase());
    const modReq = modulo.toUpperCase();

    if (modReq === 'DASHBOARD' || modReq === 'IA' || modReq === 'ESTRUTURA' || modReq === 'PRODUCAO') return true; 
    if (modReq === 'FISCAL' && acessos.includes('NFE')) return true; 
    
    return acessos.includes(modReq);
  };

  const role = usuario?.role ? String(usuario.role).toUpperCase() : '';
  
  const isGestor = 
    role === 'SUPER_ADMIN' ||
    role === 'SUPORTE_MASTER' ||
    role === 'ADMIN' ||
    role === 'ADMIN_LOJA' ||
    role === 'GERENTE' || role === 'DIRETOR' || role === 'DONO' ||
    role === 'PROPRIETARIO' || role === 'USER' || role === '' || !usuario?.role;

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const [menusAbertos, setMenusAbertos] = useState<Record<MenuSectionId, boolean>>({
    centralAurya: true,
    estruturaNegocio: false,
    operacaoVendas: false,
    comprasSuprimentos: false,
    fiscalInteligente: false,
    financeiroInteligente: false,
    contabilidadeAnalise: false,
    estoqueInteligente: false,
    logisticaWms: false,
    producaoIndustria: false,
    adminSaaS: false,
  });

  useEffect(() => {
    const path = location.pathname;
    setMenusAbertos(prev => ({
      ...prev,
      centralAurya: prev.centralAurya || path.includes('/aurya'),
      estruturaNegocio: prev.estruturaNegocio || path.includes('/produtos') || path.includes('/categorias') || path.includes('/embalagens') || path.includes('/pessoas') || path.includes('/equipe') || path.includes('/permissoes') || path.includes('/configuracoes-loja') || path.includes('/layout-etiquetas') || path.includes('/estacoes-trabalho') || path.includes('/balancas'),
      operacaoVendas: prev.operacaoVendas || path.includes('/frente-caixa') || path.includes('/pdv-food'),
      comprasSuprimentos: prev.comprasSuprimentos || path.includes('/compras') || path.includes('/entrada-notas') || path.includes('/ListarNfe'),
      fiscalInteligente: prev.fiscalInteligente || path.includes('/notas') || path.includes('/notas-fiscais') || path.includes('/regras-fiscais') || path.includes('/cadastrocfop'),
      financeiroInteligente: prev.financeiroInteligente || path.includes('/financeiro'),
      contabilidadeAnalise: prev.contabilidadeAnalise || path.includes('/contabil') || path.includes('/dre'),
      estoqueInteligente: prev.estoqueInteligente || path.includes('/estoque'),
      logisticaWms: prev.logisticaWms || path.includes('/wms'),
      producaoIndustria: prev.producaoIndustria || path.includes('/producao'),
      adminSaaS: prev.adminSaaS || path.includes('/admin'),
    }));
  }, [location.pathname]);

  const toggleMenu = (menu: MenuSectionId) => {
    setMenusAbertos(prev => ({ ...prev, [menu]: !prev[menu] }));
  };

  const handleLogout = () => {
    clearAuthSessionAndAxios();
    navigate('/');
  };

  const showAdministrativo =
    temPermissao('estrutura') ||
    usuario?.role === 'SUPER_ADMIN' ||
    usuario?.role === 'SUPORTE_MASTER';
  const showComercial = temPermissao('pdv');
  const showLogistica = temPermissao('compras') || temPermissao('estoque');
  const showProducao = temPermissao('producao');
  const showFinanceiro = temPermissao('fiscal') || temPermissao('financeiro') || temPermissao('contabil');

  return (
    <div className={`flex h-screen overflow-hidden ${mode === "dark" ? "text-slate-100" : "text-slate-900"}`} style={{ background: theme.colors.bgPrimary }}>
      <aside className={`${sidebarCollapsed ? 'w-24' : 'w-72'} relative z-10 flex shrink-0 flex-col backdrop-blur-xl transition-all duration-300 ${mode === "dark" ? "border-r border-white/10 bg-[#050913]/95 shadow-[0_25px_60px_rgba(0,0,0,0.45)]" : "border-r border-slate-200 bg-white/95 shadow-[0_20px_50px_rgba(15,23,42,0.10)]"}`}>
        <div className={`pointer-events-none absolute inset-0 ${mode === "dark" ? "bg-[radial-gradient(circle_at_top_left,_rgba(139,92,246,0.18),_transparent_28%),linear-gradient(180deg,_rgba(255,255,255,0.02),_transparent_30%)]" : "bg-[radial-gradient(circle_at_top_left,_rgba(139,92,246,0.10),_transparent_26%),linear-gradient(180deg,_rgba(15,23,42,0.01),_transparent_24%)]"}`} />

        <div className={`relative z-10 ${sidebarCollapsed ? 'px-3 py-5' : 'px-5 py-5'} flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-between gap-3'} ${mode === "dark" ? "border-b border-white/10 bg-[#08101f]/30" : "border-b border-slate-200 bg-slate-50/80"}`}>
          <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3'} min-w-0`}>
            <img src="/Aurya.jpeg" alt="Aurya Logo" className="h-11 w-11 shrink-0 rounded-xl border border-violet-500/30 object-cover shadow-[0_0_20px_rgba(139,92,246,0.25)]" />
            {!sidebarCollapsed && (
              <div className="flex min-w-0 flex-col">
                <span className="truncate bg-gradient-to-r from-violet-200 via-fuchsia-300 to-purple-400 bg-clip-text text-lg font-black tracking-[0.18em] text-transparent drop-shadow-[0_0_14px_rgba(139,92,246,0.35)]">AURYA</span>
                <span className="truncate text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">ERP AI-First</span>
              </div>
            )}
          </div>
          {!sidebarCollapsed && (
            <div className="flex items-center gap-2">
              <ThemeToggle compact />
              <button onClick={() => setSidebarCollapsed(true)} className={`rounded-xl border border-transparent p-2 transition-all ${mode === "dark" ? "text-slate-400 hover:border-white/10 hover:bg-white/[0.06] hover:text-white" : "text-slate-500 hover:border-slate-200 hover:bg-slate-100 hover:text-slate-900"}`} title="Recolher menu">
                <ChevronsLeft className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {sidebarCollapsed && (
          <div className="relative z-10 px-3 pt-3">
            <button onClick={() => setSidebarCollapsed(false)} className={`flex w-full items-center justify-center rounded-xl border border-transparent p-2.5 transition-all ${mode === "dark" ? "text-slate-400 hover:border-white/10 hover:bg-white/[0.06] hover:text-white" : "text-slate-500 hover:border-slate-200 hover:bg-slate-100 hover:text-slate-900"}`} title="Expandir menu">
              <ChevronsRight className="h-4 w-4" />
            </button>
          </div>
        )}

        <nav className="relative z-10 flex-1 space-y-1 overflow-y-auto p-3 custom-scrollbar">
          
          {/* VISÃO GERAL */}
          <MacroGroupTitle title="Visão Geral" collapsed={sidebarCollapsed} mode={mode} />
          
          {temPermissao('dashboard') && (
            <Link to="/dashboard" title="Dashboard" className={`group mb-2 flex items-center ${sidebarCollapsed ? 'justify-center px-2' : 'gap-3 px-3'} overflow-hidden rounded-xl border py-3 text-sm font-semibold backdrop-blur-md transition-all ${location.pathname === '/dashboard' ? mode === 'dark' ? 'bg-gradient-to-r from-violet-600/80 to-fuchsia-600/70 text-white border-violet-400/30 shadow-[0_0_25px_rgba(139,92,246,0.30)]' : 'bg-gradient-to-r from-violet-100 to-fuchsia-100 text-slate-900 border-violet-300 shadow-[0_0_0_1px_rgba(139,92,246,0.10)]' : `${theme.classes.sidebarText} ${theme.classes.sidebarHover} border-transparent`}`}>
              <LayoutDashboard className={`h-5 w-5 shrink-0 ${location.pathname === '/dashboard' ? (mode === 'dark' ? 'text-white' : 'text-violet-700') : (mode === 'dark' ? 'text-slate-500 group-hover:text-violet-300' : 'text-slate-500 group-hover:text-violet-700')}`} />
              {!sidebarCollapsed && <span className="truncate flex-1">Dashboard</span>}
            </Link>
          )}

          {temPermissao('ia') && (
            <>
              <SectionHeader id="centralAurya" mode={mode} theme={theme} title="Central Aurya" icon={BrainCircuit} isAi={true} isOpen={menusAbertos.centralAurya} collapsed={sidebarCollapsed} onToggle={toggleMenu} />
              {menusAbertos.centralAurya && (
                <div className={`space-y-1 mt-1 mb-2 animate-in slide-in-from-top-2 fade-in duration-200 rounded-2xl backdrop-blur-md ${mode === "dark" ? "border border-violet-500/15 bg-violet-500/[0.06]" : "border border-violet-200 bg-violet-50/70"} ${sidebarCollapsed ? "p-1.5" : "p-2"}`}>
                  <MenuItem to="/aurya/insights" icon={Sparkles} label="Insights" isAi={true} isActive={location.pathname.includes('/aurya/insights')} collapsed={sidebarCollapsed} mode={mode} theme={theme} />
                  <MenuItem to="/aurya/alertas" icon={AlertTriangle} label="Alertas" isAi={true} isActive={location.pathname.includes('/aurya/alertas')} collapsed={sidebarCollapsed} mode={mode} theme={theme} />
                  <MenuItem to="/aurya/oportunidades" icon={TrendingUp} label="Oportunidades" isAi={true} isActive={location.pathname.includes('/aurya/oportunidades')} collapsed={sidebarCollapsed} mode={mode} theme={theme} />
                </div>
              )}
            </>
          )}

          {/* ADMINISTRATIVO */}
          {showAdministrativo && <MacroGroupTitle title="Administrativo" collapsed={sidebarCollapsed} mode={mode} />}

          {temPermissao('estrutura') && (
            <>
              <SectionHeader id="estruturaNegocio" mode={mode} theme={theme} title="Estrutura" icon={Database} isOpen={menusAbertos.estruturaNegocio} collapsed={sidebarCollapsed} onToggle={toggleMenu} />
              {menusAbertos.estruturaNegocio && (
                <div className={`space-y-1 mt-1 mb-2 ${sidebarCollapsed ? 'p-1' : 'pl-1'} animate-in slide-in-from-top-2 fade-in duration-200`}>
                  <MenuItem to="/produtos" icon={Package} label="Produtos" isActive={location.pathname.includes('/produtos')} collapsed={sidebarCollapsed} mode={mode} theme={theme} />
                  <MenuItem to="/categorias" icon={Tags} label="Categorias" isActive={location.pathname.includes('/categorias')} collapsed={sidebarCollapsed} mode={mode} theme={theme} />
                  <MenuItem to="/embalagens" icon={Box} label="Embalagens (BOM)" isActive={location.pathname.includes('/embalagens')} collapsed={sidebarCollapsed} mode={mode} theme={theme} />
                  <MenuItem to="/pessoas" icon={Users} label="Pessoas" isActive={location.pathname.includes('/pessoas')} collapsed={sidebarCollapsed} mode={mode} theme={theme} />
                  {isGestor && (
                    <>
                      <MenuItem to="/equipe" icon={UserCog} label="Equipe" isActive={location.pathname.includes('/equipe')} collapsed={sidebarCollapsed} mode={mode} theme={theme} />
                      <MenuItem to="/permissoes" icon={ShieldCheck} label="Permissões" isActive={location.pathname.includes('/permissoes')} collapsed={sidebarCollapsed} mode={mode} theme={theme} />
                      <MenuItem to="/configuracoes-loja" icon={Settings} label="Minha Loja" isActive={location.pathname.includes('/configuracoes-loja')} collapsed={sidebarCollapsed} mode={mode} theme={theme} />
                      <MenuItem to="/layout-etiquetas" icon={Printer} label="Layout Etiquetas" isActive={location.pathname.includes('/layout-etiquetas')} collapsed={sidebarCollapsed} mode={mode} theme={theme} />
                      <MenuItem to="/estacoes-trabalho" icon={Monitor} label="Estações de Trabalho" isActive={location.pathname.includes('/estacoes-trabalho')} collapsed={sidebarCollapsed} mode={mode} theme={theme} />
                      <MenuItem to="/balancas" icon={Scale} label="Balanças" isActive={location.pathname.includes('/balancas')} collapsed={sidebarCollapsed} mode={mode} theme={theme} />
                    </>
                  )}
                </div>
              )}
            </>
          )}

          {(usuario?.role === 'SUPER_ADMIN' || usuario?.role === 'SUPORTE_MASTER') && (
            <>
              <SectionHeader id="adminSaaS" mode={mode} theme={theme} title="Admin SaaS" icon={ShieldCheck} isOpen={menusAbertos.adminSaaS} collapsed={sidebarCollapsed} onToggle={toggleMenu} />
              {menusAbertos.adminSaaS && (
                <div className={`space-y-1 mt-1 mb-2 ${sidebarCollapsed ? 'p-1' : 'pl-1'} animate-in slide-in-from-top-2 fade-in duration-200`}>
                  <MenuItem to="/admin/clientes" icon={Building2} label="Clientes" isActive={location.pathname.includes('/admin/clientes')} collapsed={sidebarCollapsed} mode={mode} theme={theme} />
                </div>
              )}
            </>
          )}

          {/* COMERCIAL */}
          {showComercial && <MacroGroupTitle title="Comercial" collapsed={sidebarCollapsed} mode={mode} />}

          {temPermissao('pdv') && (
            <>
              <SectionHeader id="operacaoVendas" mode={mode} theme={theme} title="Vendas" icon={Monitor} isOpen={menusAbertos.operacaoVendas} collapsed={sidebarCollapsed} onToggle={toggleMenu} />
              {menusAbertos.operacaoVendas && (
                <div className={`space-y-1 mt-1 mb-2 ${sidebarCollapsed ? 'p-1' : 'pl-1'} animate-in slide-in-from-top-2 fade-in duration-200`}>
                  <MenuItem to="/frente-caixa" icon={ShoppingCart} label="PDV Varejo" isActive={location.pathname.includes('/frente-caixa')} collapsed={sidebarCollapsed} mode={mode} theme={theme} />
                  <MenuItem to="/pdv-food" icon={UtensilsCrossed} label="PDV Food" isActive={location.pathname.includes('/pdv-food')} collapsed={sidebarCollapsed} mode={mode} theme={theme} />
                  <MenuItem to="/comanda-mobile" icon={Smartphone} label="Comanda Mobile" isActive={location.pathname.includes('/comanda-mobile')} collapsed={sidebarCollapsed} mode={mode} theme={theme} />
                </div>
              )}
            </>
          )}

          {/* SUPRIMENTOS & LOGÍSTICA */}
          {showLogistica && <MacroGroupTitle title="Suprimentos & Logística" collapsed={sidebarCollapsed} mode={mode} />}

          {temPermissao('compras') && (
            <>
              <SectionHeader id="comprasSuprimentos" mode={mode} theme={theme} title="Compras" icon={ShoppingBag} isOpen={menusAbertos.comprasSuprimentos} collapsed={sidebarCollapsed} onToggle={toggleMenu} />
              {menusAbertos.comprasSuprimentos && (
                <div className={`space-y-1 mt-1 mb-2 ${sidebarCollapsed ? 'p-1' : 'pl-1'} animate-in slide-in-from-top-2 fade-in duration-200`}>
                  <MenuItem to="/compras/solicitacoes" icon={ClipboardList} label="Solicitações" isActive={location.pathname.includes('/compras/solicitacoes')} collapsed={sidebarCollapsed} mode={mode} theme={theme} />
                  <MenuItem to="/compras/cotacoes" icon={Scale} label="Cotações" isActive={location.pathname.includes('/compras/cotacoes')} collapsed={sidebarCollapsed} mode={mode} theme={theme} />
                  <MenuItem to="/compras/gerenciar-cotacoes" icon={Scale} label="Gerenciar Cotações" isActive={location.pathname.includes('/compras/gerenciar-cotacoes')} collapsed={sidebarCollapsed} mode={mode} theme={theme} />
                  <MenuItem to="/compras/AprovacaoSolicitacaoCompra" icon={ShoppingCart} label="Aprovação de Compras" isActive={location.pathname.includes('/compras/AprovacaoCompra')} collapsed={sidebarCollapsed} mode={mode} theme={theme} />
                  
                  {/* ✅ BOTÃO ANTIGO DE PEDIDOS (Ajustado para não conflitar com o de Recebimento) */}
                  <MenuItem to="/compras/pedidos" icon={ShoppingCart} label="Pedidos" isActive={location.pathname === '/compras/pedidos'} collapsed={sidebarCollapsed} mode={mode} theme={theme} />
                  <MenuItem to="/compras/acompanhamento" icon={Radar} label="Acompanhamento P2P" isActive={location.pathname.includes('/compras/acompanhamento')} collapsed={sidebarCollapsed} mode={mode} theme={theme} />
                  
                  {/* ✅ NOVO: BOTÃO DE PEDIDOS DE RECEBIMENTO (INBOUND/DOCA) */}
                  <MenuItem to="/compras/pedidos-recebimento" icon={Truck} label="Pedidos de Recebimento" isActive={location.pathname.includes('/compras/pedidos-recebimento')} collapsed={sidebarCollapsed} mode={mode} theme={theme} />
                  <MenuItem to="/compras/recebimento-mercadorias" icon={PackageCheck} label="Recebimento mercadorias" isActive={location.pathname.includes('/compras/recebimento-mercadorias')} collapsed={sidebarCollapsed} mode={mode} theme={theme} />

                  <MenuItem to="/compras/divergencias" icon={AlertTriangle} label="Divergências" isActive={location.pathname.includes('/compras/divergencias')} collapsed={sidebarCollapsed} mode={mode} theme={theme} />
                  <MenuItem to="/entrada-notas" icon={Inbox} label="XML" isActive={location.pathname.includes('/entrada-notas')} collapsed={sidebarCollapsed} mode={mode} theme={theme} />
                  <MenuItem to="/ListarNfe" icon={FileText} label="Notas Entrada" isActive={location.pathname.includes('/ListarNfe')} collapsed={sidebarCollapsed} mode={mode} theme={theme} />
                  <MenuItem to="/compras/InteligenciaComprasService" icon={BrainCircuit} label="Análise Aurya" isAi={true} isActive={location.pathname.includes('/compras/InteligenciaComprasService')} collapsed={sidebarCollapsed} mode={mode} theme={theme} />
                </div>
              )}
            </>
          )}

          {temPermissao('estoque') && (
            <>
              <SectionHeader id="estoqueInteligente" mode={mode} theme={theme} title="Estoque" icon={Package} isOpen={menusAbertos.estoqueInteligente} collapsed={sidebarCollapsed} onToggle={toggleMenu} />
              {menusAbertos.estoqueInteligente && (
                <div className={`space-y-1 mt-1 mb-2 ${sidebarCollapsed ? 'p-1' : 'pl-1'} animate-in slide-in-from-top-2 fade-in duration-200`}>
                  <MenuItem to="/estoque/inteligencia" icon={BrainCircuit} label="Inteligência" isAi={true} isActive={location.pathname.includes('/estoque/inteligencia')} collapsed={sidebarCollapsed} mode={mode} theme={theme} />
                  <MenuItem to="/estoque" icon={ClipboardList} label="Gestão" isActive={location.pathname.includes('/estoque')} collapsed={sidebarCollapsed} mode={mode} theme={theme} />
                  <MenuItem to="/estoque/inventario" icon={ScanSearch} label="Inventário" isActive={location.pathname.includes('/estoque/inventario')} collapsed={sidebarCollapsed} mode={mode} theme={theme} />
                  <MenuItem to="/estoque/bipador" icon={Smartphone} label="Bipador" target="_blank" isActive={location.pathname.includes('/estoque/bipador')} collapsed={sidebarCollapsed} mode={mode} theme={theme} />
                </div>
              )}
            </>
          )}

          {/* ✅ NOVO: MENU WMS COMPLETO */}
          {temPermissao('estoque') && (
            <>
              <SectionHeader id="logisticaWms" mode={mode} theme={theme} title="Logística WMS" icon={Network} isOpen={menusAbertos.logisticaWms} collapsed={sidebarCollapsed} onToggle={toggleMenu} />
              {menusAbertos.logisticaWms && (
                <div className={`space-y-1 mt-1 mb-2 ${sidebarCollapsed ? 'p-1' : 'pl-1'} animate-in slide-in-from-top-2 fade-in duration-200`}>
                  <MenuItem to="/wms/recebimento" icon={Package} label="Recebimento (Doca)" isActive={location.pathname.includes('/wms/recebimento')} collapsed={sidebarCollapsed} mode={mode} theme={theme} />
                  <MenuItem to="/wms/armazenagem" icon={ArrowRightLeft} label="Armazenagem (Putaway)" isActive={location.pathname.includes('/wms/armazenagem')} collapsed={sidebarCollapsed} mode={mode} theme={theme} />
                  <MenuItem to="/wms/estoque" icon={Map} label="Mapa de Estoque" isActive={location.pathname.includes('/wms/estoque')} collapsed={sidebarCollapsed} mode={mode} theme={theme} />
                  <MenuItem to="/wms/areas" icon={Layers} label="Câmaras Frias & Áreas" isActive={location.pathname.includes('/wms/areas')} collapsed={sidebarCollapsed} mode={mode} theme={theme} />
                </div>
              )}
            </>
          )}

          {/* PRODUÇÃO */}
          {showProducao && <MacroGroupTitle title="Produção" collapsed={sidebarCollapsed} mode={mode} />}

          {temPermissao('producao') && (
            <>
              <SectionHeader id="producaoIndustria" mode={mode} theme={theme} title="Produção" icon={Factory} isOpen={menusAbertos.producaoIndustria} collapsed={sidebarCollapsed} onToggle={toggleMenu} />
              {menusAbertos.producaoIndustria && (
                <div className={`space-y-1 mt-1 mb-2 ${sidebarCollapsed ? 'p-1' : 'pl-1'} animate-in slide-in-from-top-2 fade-in duration-200`}>
                  <MenuItem to="/producao/op" icon={ClipboardList} label="Ordem de Produção" isActive={location.pathname.includes('/producao/op')} collapsed={sidebarCollapsed} mode={mode} theme={theme} />
                  <MenuItem to="/producao/pesagem" icon={Scale} label="Terminal de Balança" isActive={location.pathname.includes('/producao/pesagem')} collapsed={sidebarCollapsed} mode={mode} theme={theme} />
                </div>
              )}
            </>
          )}

          {/* FINANCEIRO & CONTÁBIL */}
          {showFinanceiro && <MacroGroupTitle title="Financeiro & Contábil" collapsed={sidebarCollapsed} mode={mode} />}

          {temPermissao('fiscal') && (
            <>
              <SectionHeader id="fiscalInteligente" mode={mode} theme={theme} title="Fiscal" icon={Receipt} isOpen={menusAbertos.fiscalInteligente} collapsed={sidebarCollapsed} onToggle={toggleMenu} />
              {menusAbertos.fiscalInteligente && (
                <div className={`space-y-1 mt-1 mb-2 ${sidebarCollapsed ? 'p-1' : 'pl-1'} animate-in slide-in-from-top-2 fade-in duration-200`}>
                  <MenuItem to="/notas" icon={Receipt} label="Notas PDV" isActive={location.pathname.includes('/notas')} collapsed={sidebarCollapsed} mode={mode} theme={theme} />
                  <MenuItem to="/notas-fiscais" icon={FileUp} label="NF-e" isActive={location.pathname.includes('/notas-fiscais')} collapsed={sidebarCollapsed} mode={mode} theme={theme} />
                  <MenuItem to="/regras-fiscais" icon={Scale} label="Motor Fiscal" isActive={location.pathname.includes('/regras-fiscais')} collapsed={sidebarCollapsed} mode={mode} theme={theme} />
                  <MenuItem to="/cadastrocfop" icon={Settings} label="CFOP" isActive={location.pathname.includes('/cadastrocfop')} collapsed={sidebarCollapsed} mode={mode} theme={theme} />
                </div>
              )}
            </>
          )}

          {temPermissao('financeiro') && (
            <>
              <SectionHeader id="financeiroInteligente" mode={mode} theme={theme} title="Financeiro" icon={Wallet} isOpen={menusAbertos.financeiroInteligente} collapsed={sidebarCollapsed} onToggle={toggleMenu} />
              {menusAbertos.financeiroInteligente && (
                <div className={`space-y-1 mt-1 mb-2 ${sidebarCollapsed ? 'p-1' : 'pl-1'} animate-in slide-in-from-top-2 fade-in duration-200`}>
                  <MenuItem to="/financeiro/dashboard" icon={BrainCircuit} label="Insights" isAi={true} isActive={location.pathname.includes('/financeiro/dashboard')} collapsed={sidebarCollapsed} mode={mode} theme={theme} />
                  <MenuItem to="/financeiro/gestao-titulos" icon={CheckSquare} label="Títulos (Pagar/Receber)" isActive={location.pathname.includes('/financeiro/gestao-titulos')} collapsed={sidebarCollapsed} mode={mode} theme={theme} />
                  <MenuItem to="/financeiro/caixas" icon={Landmark} label="Contas e Caixas" isActive={location.pathname.includes('/financeiro/caixas')} collapsed={sidebarCollapsed} mode={mode} theme={theme} />
                  <MenuItem to="/financeiro/extrato" icon={ListOrdered} label="Extrato de Contas" isActive={location.pathname.includes('/financeiro/extrato')} collapsed={sidebarCollapsed} mode={mode} theme={theme} />
                  <MenuItem to="/financeiro/cheques" icon={CreditCard} label="Cheques" isActive={location.pathname.includes('/financeiro/cheques')} collapsed={sidebarCollapsed} mode={mode} theme={theme} />
                </div>
              )}
            </>
          )}

          {temPermissao('contabil') && (
            <>
              <SectionHeader id="contabilidadeAnalise" mode={mode} theme={theme} title="Contábil" icon={BookOpen} isOpen={menusAbertos.contabilidadeAnalise} collapsed={sidebarCollapsed} onToggle={toggleMenu} />
              {menusAbertos.contabilidadeAnalise && (
                <div className={`space-y-1 mt-1 mb-2 ${sidebarCollapsed ? 'p-1' : 'pl-1'} animate-in slide-in-from-top-2 fade-in duration-200`}>
                  <MenuItem to="/contabil/dashboard" icon={BrainCircuit} label="Diagnóstico" isAi={true} isActive={location.pathname.includes('/contabil/dashboard')} collapsed={sidebarCollapsed} mode={mode} theme={theme} />
                  <MenuItem to="/contabilidade/dre" icon={TrendingUp} label="DRE" isActive={location.pathname.includes('/contabilidade/dre')} collapsed={sidebarCollapsed} mode={mode} theme={theme} />
                  <MenuItem to="/contabil/plano-contas" icon={Network} label="Plano de Contas" isActive={location.pathname.includes('/contabil/plano-contas')} collapsed={sidebarCollapsed} mode={mode} theme={theme} />
                  <MenuItem to="/contabil/extrato" icon={FileText} label="Livro Razão" isActive={location.pathname.includes('/contabil/extrato')} collapsed={sidebarCollapsed} mode={mode} theme={theme} />
                  <MenuItem to="/contabil/conciliacao" icon={Scale} label="Conciliação" isActive={location.pathname.includes('/contabil/conciliacao')} collapsed={sidebarCollapsed} mode={mode} theme={theme} />
                  <MenuItem to="/contabil/dashboardglobal" icon={CheckSquare} label="Fechamento Contábil" isActive={location.pathname.includes('/contabil/fechamento')} collapsed={sidebarCollapsed} mode={mode} theme={theme} />
                </div>
              )}
            </>
          )}

        </nav>

        <div className={`relative z-10 shrink-0 p-4 backdrop-blur-xl ${mode === "dark" ? "border-t border-white/10 bg-[#08101f]/40" : "border-t border-slate-200 bg-slate-50/80"}`}>
          {!sidebarCollapsed ? (
            <>
              <div className="mb-3 flex justify-start">
                <ThemeToggle />
              </div>

              <div className={`mb-4 flex items-center gap-3 overflow-hidden rounded-2xl px-3 py-3 backdrop-blur-md ${mode === "dark" ? "border border-white/10 bg-white/[0.06]" : "border border-slate-200 bg-white"}`}>
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg font-bold text-violet-300 ${mode === "dark" ? "border border-violet-500/30 bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20" : "border border-violet-200 bg-gradient-to-br from-violet-100 to-fuchsia-100"}`}>
                  {usuario.nome ? usuario.nome.charAt(0).toUpperCase() : 'U'}
                </div>

                <div className="min-w-0 flex-1">
                  <p className={`truncate text-sm font-bold ${mode === "dark" ? "text-white" : "text-slate-900"}`} title={usuario.nome || 'Usuário'}>
                    {usuario.nome || 'Usuário'}
                  </p>
                  <p className={`truncate text-xs ${mode === "dark" ? "text-violet-300" : "text-violet-700"}`} title={usuario.loja?.nome || 'Minha Loja'}>
                    {usuario.loja?.nome || 'Minha Loja'}
                  </p>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className={`flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold backdrop-blur-md transition-all ${mode === "dark" ? "border border-white/10 bg-white/[0.06] text-slate-300 hover:border-red-500/20 hover:bg-red-500/10 hover:text-red-300" : "border border-slate-200 bg-white text-slate-700 hover:border-red-300 hover:bg-red-50 hover:text-red-600"}`}
              >
                <LogOut className="h-4 w-4 shrink-0" />
                <span className="truncate">Sair</span>
              </button>
            </>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div
                className={`flex h-11 w-11 items-center justify-center rounded-full text-lg font-bold text-violet-300 ${mode === "dark" ? "border border-violet-500/30 bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20" : "border border-violet-200 bg-gradient-to-br from-violet-100 to-fuchsia-100"}`}
                title={usuario.nome || 'Usuário'}
              >
                {usuario.nome ? usuario.nome.charAt(0).toUpperCase() : 'U'}
              </div>

              <button
                onClick={handleLogout}
                title="Sair"
                className={`flex w-full items-center justify-center rounded-xl py-2.5 backdrop-blur-md transition-all ${mode === "dark" ? "border border-white/10 bg-white/5 text-slate-300 hover:border-red-500/20 hover:bg-red-500/10 hover:text-red-300" : "border border-slate-200 bg-white text-slate-700 hover:border-red-300 hover:bg-red-50 hover:text-red-600"}`}
              >
                <LogOut className="h-4 w-4 shrink-0" />
              </button>
            </div>
          )}
        </div>
      </aside>

      <main className={`flex-1 min-w-0 overflow-y-auto overflow-x-hidden p-6 md:p-8 ${mode === "dark" ? "bg-[radial-gradient(circle_at_top,_rgba(139,92,246,0.18),_transparent_30%),linear-gradient(180deg,_#0b1020_0%,_#070b17_100%)]" : "bg-[radial-gradient(circle_at_top,_rgba(139,92,246,0.10),_transparent_26%),linear-gradient(180deg,_#ffffff_0%,_#f6f8fc_100%)]"}`}>
        {children}
      </main>
    </div>
  );
}