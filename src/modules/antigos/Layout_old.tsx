import { useEffect, useState, type ElementType, type ReactNode } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import {
  ChevronDown, ChevronRight, ChevronsLeft, ChevronsRight,
  LayoutDashboard, Database, Package, Tags, Users, UserCog,
  Scale, Settings, Monitor, ShoppingCart, ShoppingBag, ClipboardList,
  AlertTriangle, Inbox, FileText, BrainCircuit, Receipt, FileUp,
  Wallet, TrendingUp, CheckSquare, Landmark, CreditCard, BookOpen,
  ScanSearch, Smartphone, LogOut, Sparkles, ShieldCheck, Building2, UtensilsCrossed
} from 'lucide-react';

import { IUsuario } from '../../types/auth';
import { auryaBrandMark } from '../../assets/branding';

interface LayoutProps {
  children: ReactNode;
}

interface IUsuarioLayout extends Omit<IUsuario, 'role'> {
  role?: string;
  permissoes?: string[];
  loja?: {
    nome?: string;
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
  | 'adminSaaS';

interface MenuItemProps {
  to: string;
  icon: ElementType;
  label: string;
  target?: string;
  isAi?: boolean;
  isActive: boolean;
  collapsed: boolean;
}

const MenuItem = ({ to, icon: Icon, label, target, isAi = false, isActive, collapsed }: MenuItemProps) => {
  const activeClass = isAi
    ? 'bg-gradient-to-r from-violet-600/20 via-violet-500/15 to-fuchsia-500/15 text-white border border-violet-400/25 shadow-[0_0_20px_rgba(139,92,246,0.16)]'
    : 'bg-white/10 text-white border border-white/10 shadow-[0_0_18px_rgba(139,92,246,0.06)]';

  const idleClass = isAi
    ? 'text-violet-300 hover:text-white hover:bg-violet-500/10 border border-transparent hover:border-violet-500/15'
    : 'text-slate-400 hover:text-slate-100 hover:bg-white/5 border border-transparent hover:border-white/10';

  const iconClass = isActive
    ? 'text-violet-300'
    : isAi ? 'text-violet-400 group-hover:text-violet-300' : 'text-slate-500 group-hover:text-violet-300';

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
  icon: ElementType;
  isAi?: boolean;
  isOpen: boolean;
  collapsed: boolean;
  onToggle: (id: MenuSectionId) => void;
}

const SectionHeader = ({ id, title, icon: Icon, isAi = false, isOpen, collapsed, onToggle }: SectionHeaderProps) => {
  if (collapsed) {
    return (
      <button onClick={() => onToggle(id)} title={title} className={`mt-2 flex w-full items-center justify-center rounded-xl border p-3 transition-all duration-200 backdrop-blur-md ${isOpen ? (isAi ? 'bg-violet-500/15 border-violet-500/25 text-violet-300' : 'bg-white/10 border-white/10 text-white') : (isAi ? 'text-violet-400 hover:bg-violet-500/10 border-transparent hover:border-violet-500/15' : 'text-slate-400 hover:bg-white/5 border-transparent hover:border-white/10')}`}>
        <Icon className={`w-4 h-4 ${isOpen ? 'text-violet-300' : (isAi ? 'text-violet-500' : 'text-slate-500')}`} />
      </button>
    );
  }

  return (
    <button onClick={() => onToggle(id)} title={title} className={`mt-2 flex w-full items-center justify-between overflow-hidden rounded-xl border p-3 transition-all duration-200 backdrop-blur-md ${isOpen ? (isAi ? 'bg-violet-500/10 border-violet-500/20 text-violet-300' : 'bg-white/8 border-white/10 text-white') : (isAi ? 'text-violet-400 hover:bg-violet-500/8 border-transparent hover:border-violet-500/15' : 'text-slate-300 hover:bg-white/5 border-transparent hover:border-white/10')}`}>
      <div className="flex min-w-0 items-center gap-3 text-[11px] font-bold uppercase tracking-[0.16em]">
        <Icon className={`w-4 h-4 shrink-0 ${isOpen ? 'text-violet-300' : (isAi ? 'text-violet-500' : 'text-slate-500')}`} />
        <span className="truncate">{title}</span>
        {isAi && <Sparkles className="ml-1 h-3 w-3 shrink-0 animate-pulse text-violet-400" />}
      </div>
      {isOpen ? <ChevronDown className="h-4 w-4 shrink-0 text-violet-400" /> : <ChevronRight className="h-4 w-4 shrink-0 text-slate-600" />}
    </button>
  );
};

export function Layout({ children }: LayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();

  let usuario: Partial<IUsuarioLayout> = {};
  try {
    const userStr = localStorage.getItem('@PDVUsuario');
    if (userStr) {
      usuario = JSON.parse(userStr) as IUsuarioLayout;
    }
  } catch (error) {
    console.error('Falha ao ler dados do usuário no Layout:', error);
  }

  const temPermissao = (modulo: string) => {
    if (usuario?.role === 'SUPER_ADMIN') return true;
    return usuario?.permissoes?.includes(modulo) ?? false;
  };

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
    adminSaaS: false,
  });

  useEffect(() => {
    const path = location.pathname;
    setMenusAbertos(prev => ({
      ...prev,
      centralAurya: prev.centralAurya || path.includes('/aurya'),
      estruturaNegocio: prev.estruturaNegocio || path.includes('/produtos') || path.includes('/categorias') || path.includes('/pessoas') || path.includes('/equipe') || path.includes('/permissoes'),
      operacaoVendas: prev.operacaoVendas || path.includes('/frente-caixa') || path.includes('/pdv-food'),
      comprasSuprimentos: prev.comprasSuprimentos || path.includes('/compras') || path.includes('/entrada-notas') || path.includes('/ListarNfe'),
      fiscalInteligente: prev.fiscalInteligente || path.includes('/notas') || path.includes('/notas-fiscais') || path.includes('/regras-fiscais') || path.includes('/cadastrocfop'),
      financeiroInteligente: prev.financeiroInteligente || path.includes('/financeiro'),
      contabilidadeAnalise: prev.contabilidadeAnalise || path.includes('/contabil') || path.includes('/dre'),
      estoqueInteligente: prev.estoqueInteligente || path.includes('/estoque'),
      adminSaaS: prev.adminSaaS || path.includes('/admin'),
    }));
  }, [location.pathname]);

  const toggleMenu = (menu: MenuSectionId) => {
    setMenusAbertos(prev => ({ ...prev, [menu]: !prev[menu] }));
  };

  const handleLogout = () => {
    localStorage.removeItem('@PDVToken');
    localStorage.removeItem('@PDVUsuario');
    navigate('/');
  };

  return (
    <div className="flex h-screen bg-[#060816] text-slate-100">
      <aside className={`${sidebarCollapsed ? 'w-24' : 'w-72'} relative z-10 flex shrink-0 flex-col border-r border-white/10 bg-[#050913]/95 shadow-2xl backdrop-blur-xl transition-all duration-300`}>
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(139,92,246,0.16),_transparent_26%),linear-gradient(180deg,_rgba(255,255,255,0.02),_transparent_30%)]" />

        <div className={`relative z-10 ${sidebarCollapsed ? 'px-3 py-5' : 'px-5 py-5'} border-b border-white/10 flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-between gap-3'}`}>
          <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3'} min-w-0`}>
            <img src={auryaBrandMark} alt="Aurya Logo" className="h-11 w-11 shrink-0 rounded-xl border border-violet-500/30 object-cover shadow-[0_0_20px_rgba(139,92,246,0.25)]" />
            {!sidebarCollapsed && (
              <div className="flex min-w-0 flex-col">
                <span className="truncate bg-gradient-to-r from-violet-200 via-fuchsia-300 to-purple-400 bg-clip-text text-lg font-black tracking-[0.18em] text-transparent drop-shadow-[0_0_14px_rgba(139,92,246,0.35)]">AURYA</span>
                <span className="truncate text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">ERP AI-First</span>
              </div>
            )}
          </div>
          {!sidebarCollapsed && (
            <button onClick={() => setSidebarCollapsed(true)} className="rounded-xl border border-transparent p-2 text-slate-400 transition-all hover:border-white/10 hover:bg-white/5 hover:text-white" title="Recolher menu">
              <ChevronsLeft className="h-4 w-4" />
            </button>
          )}
        </div>

        {sidebarCollapsed && (
          <div className="relative z-10 px-3 pt-3">
            <button onClick={() => setSidebarCollapsed(false)} className="flex w-full items-center justify-center rounded-xl border border-transparent p-2.5 text-slate-400 transition-all hover:border-white/10 hover:bg-white/5 hover:text-white" title="Expandir menu">
              <ChevronsRight className="h-4 w-4" />
            </button>
          </div>
        )}

        <nav className="relative z-10 flex-1 space-y-1 overflow-y-auto p-3 custom-scrollbar">
          
          {temPermissao('dashboard') && (
            <Link to="/dashboard" title="Dashboard" className={`group mb-4 flex items-center ${sidebarCollapsed ? 'justify-center px-2' : 'gap-3 px-3'} overflow-hidden rounded-xl border py-3 text-sm font-semibold backdrop-blur-md transition-all ${location.pathname === '/dashboard' ? 'bg-gradient-to-r from-violet-600/80 to-fuchsia-600/60 text-white border-violet-400/30 shadow-[0_0_25px_rgba(139,92,246,0.25)]' : 'text-slate-300 border-transparent hover:border-white/10 hover:bg-white/5'}`}>
              <LayoutDashboard className={`h-5 w-5 shrink-0 ${location.pathname === '/dashboard' ? 'text-white' : 'text-slate-500 group-hover:text-violet-300'}`} />
              {!sidebarCollapsed && <span className="truncate flex-1">Dashboard</span>}
            </Link>
          )}

          {temPermissao('ia') && (
            <>
              <SectionHeader id="centralAurya" title="Central Aurya" icon={BrainCircuit} isAi={true} isOpen={menusAbertos.centralAurya} collapsed={sidebarCollapsed} onToggle={toggleMenu} />
              {menusAbertos.centralAurya && (
                <div className={`space-y-1 mt-1 mb-4 animate-in slide-in-from-top-2 fade-in duration-200 rounded-2xl border border-violet-500/15 bg-violet-500/5 backdrop-blur-md ${sidebarCollapsed ? 'p-1.5' : 'p-2'}`}>
                  <MenuItem to="/aurya/insights" icon={Sparkles} label="Insights" isAi={true} isActive={location.pathname === '/aurya/insights'} collapsed={sidebarCollapsed} />
                  <MenuItem to="/aurya/alertas" icon={AlertTriangle} label="Alertas" isAi={true} isActive={location.pathname === '/aurya/alertas'} collapsed={sidebarCollapsed} />
                  <MenuItem to="/aurya/oportunidades" icon={TrendingUp} label="Oportunidades" isAi={true} isActive={location.pathname === '/aurya/oportunidades'} collapsed={sidebarCollapsed} />
                </div>
              )}
            </>
          )}

          {temPermissao('estoque') && (
            <>
              <SectionHeader id="estruturaNegocio" title="Estrutura" icon={Database} isOpen={menusAbertos.estruturaNegocio} collapsed={sidebarCollapsed} onToggle={toggleMenu} />
              {menusAbertos.estruturaNegocio && (
                <div className={`space-y-1 mt-1 mb-2 ${sidebarCollapsed ? 'p-1' : 'pl-1'} animate-in slide-in-from-top-2 fade-in duration-200`}>
                  <MenuItem to="/produtos" icon={Package} label="Produtos" isActive={location.pathname === '/produtos'} collapsed={sidebarCollapsed} />
                  <MenuItem to="/categorias" icon={Tags} label="Categorias" isActive={location.pathname === '/categorias'} collapsed={sidebarCollapsed} />
                  <MenuItem to="/pessoas" icon={Users} label="Pessoas" isActive={location.pathname === '/pessoas'} collapsed={sidebarCollapsed} />
                  
                  {(usuario?.role === 'GERENTE' || usuario?.role === 'DIRETOR' || usuario?.role === 'SUPER_ADMIN') && (
                    <>
                      <MenuItem to="/equipe" icon={UserCog} label="Equipe" isActive={location.pathname === '/equipe'} collapsed={sidebarCollapsed} />
                      <MenuItem to="/permissoes" icon={ShieldCheck} label="Permissões" isActive={location.pathname === '/permissoes'} collapsed={sidebarCollapsed} />
                    </>
                  )}
                </div>
              )}
            </>
          )}

          {temPermissao('pdv') && (
            <>
              <SectionHeader id="operacaoVendas" title="Vendas" icon={Monitor} isOpen={menusAbertos.operacaoVendas} collapsed={sidebarCollapsed} onToggle={toggleMenu} />
              {menusAbertos.operacaoVendas && (
                <div className={`space-y-1 mt-1 mb-2 ${sidebarCollapsed ? 'p-1' : 'pl-1'} animate-in slide-in-from-top-2 fade-in duration-200`}>
                  <MenuItem to="/frente-caixa" icon={ShoppingCart} label="PDV Varejo" isActive={location.pathname === '/frente-caixa'} collapsed={sidebarCollapsed} />
                  <MenuItem to="/pdv-food" icon={UtensilsCrossed} label="PDV Food" isActive={location.pathname === '/pdv-food'} collapsed={sidebarCollapsed} />
                   <MenuItem to="/comanda-mobile" icon={Smartphone} label="Comanda Mobile" isActive={location.pathname === '/comanda-mobile'} collapsed={sidebarCollapsed} />
                </div>
              )}
            </>
          )}

          {temPermissao('estoque') && (
            <>
              <SectionHeader id="comprasSuprimentos" title="Compras" icon={ShoppingBag} isOpen={menusAbertos.comprasSuprimentos} collapsed={sidebarCollapsed} onToggle={toggleMenu} />
              {menusAbertos.comprasSuprimentos && (
                <div className={`space-y-1 mt-1 mb-2 ${sidebarCollapsed ? 'p-1' : 'pl-1'} animate-in slide-in-from-top-2 fade-in duration-200`}>
                  <MenuItem to="/compras/solicitacoes" icon={ClipboardList} label="Solicitações" isActive={location.pathname === '/compras/solicitacoes'} collapsed={sidebarCollapsed} />
                  <MenuItem to="/compras/cotacoes" icon={Scale} label="Cotações" isActive={location.pathname === '/compras/cotacoes'} collapsed={sidebarCollapsed} />
                  <MenuItem to="/compras/pedidos" icon={ShoppingCart} label="Pedidos" isActive={location.pathname === '/compras/pedidos'} collapsed={sidebarCollapsed} />
                  <MenuItem to="/compras/divergencias" icon={AlertTriangle} label="Divergências" isActive={location.pathname === '/compras/divergencias'} collapsed={sidebarCollapsed} />
                  <MenuItem to="/entrada-notas" icon={Inbox} label="XML" isActive={location.pathname === '/entrada-notas'} collapsed={sidebarCollapsed} />
                  <MenuItem to="/ListarNfe" icon={FileText} label="Notas Entrada" isActive={location.pathname === '/ListarNfe'} collapsed={sidebarCollapsed} />
                </div>
              )}
            </>
          )}

          {temPermissao('fiscal') && (
            <>
              <SectionHeader id="fiscalInteligente" title="Fiscal" icon={Receipt} isOpen={menusAbertos.fiscalInteligente} collapsed={sidebarCollapsed} onToggle={toggleMenu} />
              {menusAbertos.fiscalInteligente && (
                <div className={`space-y-1 mt-1 mb-2 ${sidebarCollapsed ? 'p-1' : 'pl-1'} animate-in slide-in-from-top-2 fade-in duration-200`}>
                  <MenuItem to="/notas" icon={Receipt} label="Notas PDV" isActive={location.pathname === '/notas'} collapsed={sidebarCollapsed} />
                  <MenuItem to="/notas-fiscais" icon={FileUp} label="NF-e" isActive={location.pathname === '/notas-fiscais'} collapsed={sidebarCollapsed} />
                  <MenuItem to="/regras-fiscais" icon={Scale} label="Motor Fiscal" isActive={location.pathname === '/regras-fiscais'} collapsed={sidebarCollapsed} />
                  <MenuItem to="/cadastrocfop" icon={Settings} label="CFOP" isActive={location.pathname === '/cadastrocfop'} collapsed={sidebarCollapsed} />
                </div>
              )}
            </>
          )}

          {temPermissao('financeiro') && (
            <>
              <SectionHeader id="financeiroInteligente" title="Financeiro" icon={Wallet} isOpen={menusAbertos.financeiroInteligente} collapsed={sidebarCollapsed} onToggle={toggleMenu} />
              {menusAbertos.financeiroInteligente && (
                <div className={`space-y-1 mt-1 mb-2 ${sidebarCollapsed ? 'p-1' : 'pl-1'} animate-in slide-in-from-top-2 fade-in duration-200`}>
                  <MenuItem to="/financeiro/dashboard" icon={BrainCircuit} label="Insights" isAi={true} isActive={location.pathname === '/financeiro/dashboard'} collapsed={sidebarCollapsed} />
                  
                  {/* 🚀 AS 3 TELAS PARA COMPARAÇÃO */}
                  <MenuItem to="/financeiro/gestao-titulos" icon={Landmark} label="GestaoTitulosPage" isActive={location.pathname === '/financeiro/gestao-titulos'} collapsed={sidebarCollapsed} />
                  <MenuItem to="/financeiro/titulos" icon={CheckSquare} label="TitulosPage" isActive={location.pathname === '/financeiro/titulos'} collapsed={sidebarCollapsed} />
                  <MenuItem to="/financeiro/gestao-financeira" icon={Wallet} label="GestaoFinanceira" isActive={location.pathname === '/financeiro/gestao-financeira'} collapsed={sidebarCollapsed} />
                  
                  <MenuItem to="/financeiro/cheques" icon={CreditCard} label="Cheques" isActive={location.pathname === '/financeiro/cheques'} collapsed={sidebarCollapsed} />
                </div>
              )}
            </>
          )}

          {temPermissao('financeiro') && (
            <>
              <SectionHeader id="contabilidadeAnalise" title="Contábil" icon={BookOpen} isOpen={menusAbertos.contabilidadeAnalise} collapsed={sidebarCollapsed} onToggle={toggleMenu} />
              {menusAbertos.contabilidadeAnalise && (
                <div className={`space-y-1 mt-1 mb-2 ${sidebarCollapsed ? 'p-1' : 'pl-1'} animate-in slide-in-from-top-2 fade-in duration-200`}>
                  <MenuItem to="/contabil/dashboard" icon={BrainCircuit} label="Diagnóstico" isAi={true} isActive={location.pathname === '/contabil/dashboard'} collapsed={sidebarCollapsed} />
                  <MenuItem to="/contabilidade/dre" icon={TrendingUp} label="DRE" isActive={location.pathname === '/contabilidade/dre'} collapsed={sidebarCollapsed} />
                  <MenuItem to="/financeiro/extrato" icon={FileText} label="Livro Razão" isActive={location.pathname === '/financeiro/extrato'} collapsed={sidebarCollapsed} />
                  <MenuItem to="/contabil/conciliacao" icon={Scale} label="Conciliação" isActive={location.pathname === '/contabil/conciliacao'} collapsed={sidebarCollapsed} />
                </div>
              )}
            </>
          )}

          {temPermissao('estoque') && (
            <>
              <SectionHeader id="estoqueInteligente" title="Estoque" icon={Package} isOpen={menusAbertos.estoqueInteligente} collapsed={sidebarCollapsed} onToggle={toggleMenu} />
              {menusAbertos.estoqueInteligente && (
                <div className={`space-y-1 mt-1 mb-2 ${sidebarCollapsed ? 'p-1' : 'pl-1'} animate-in slide-in-from-top-2 fade-in duration-200`}>
                  <MenuItem to="/estoque/inteligencia" icon={BrainCircuit} label="Inteligência" isAi={true} isActive={location.pathname === '/estoque/inteligencia'} collapsed={sidebarCollapsed} />
                  <MenuItem to="/estoque" icon={ClipboardList} label="Gestão" isActive={location.pathname === '/estoque'} collapsed={sidebarCollapsed} />
                  <MenuItem to="/estoque/inventario" icon={ScanSearch} label="Inventário" isActive={location.pathname === '/estoque/inventario'} collapsed={sidebarCollapsed} />
                  <MenuItem to="/estoque/bipador" icon={Smartphone} label="Bipador" target="_blank" isActive={location.pathname === '/estoque/bipador'} collapsed={sidebarCollapsed} />
                </div>
              )}
            </>
          )}

          {usuario?.role === 'SUPER_ADMIN' && (
            <>
              <SectionHeader id="adminSaaS" title="Admin SaaS" icon={ShieldCheck} isOpen={menusAbertos.adminSaaS} collapsed={sidebarCollapsed} onToggle={toggleMenu} />
              {menusAbertos.adminSaaS && (
                <div className={`space-y-1 mt-1 mb-2 ${sidebarCollapsed ? 'p-1' : 'pl-1'} animate-in slide-in-from-top-2 fade-in duration-200`}>
                  <MenuItem to="/admin/clientes" icon={Building2} label="Clientes" isActive={location.pathname === '/admin/clientes'} collapsed={sidebarCollapsed} />
                </div>
              )}
            </>
          )}
        </nav>

        <div className="relative z-10 shrink-0 border-t border-white/10 bg-black/10 p-4 backdrop-blur-xl">
          {!sidebarCollapsed ? (
            <>
              <div className="mb-4 flex items-center gap-3 overflow-hidden rounded-2xl border border-white/10 bg-white/5 px-3 py-3 backdrop-blur-md">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-violet-500/30 bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 text-lg font-bold text-violet-300">
                  {usuario.nome ? usuario.nome.charAt(0).toUpperCase() : 'U'}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-white" title={usuario.nome || 'Usuário'}>
                    {usuario.nome || 'Usuário'}
                  </p>
                  <p className="truncate text-xs text-violet-300" title={usuario.loja?.nome || 'Minha Loja'}>
                    {usuario.loja?.nome || 'Minha Loja'}
                  </p>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-2.5 text-sm font-bold text-slate-300 backdrop-blur-md transition-all hover:border-red-500/20 hover:bg-red-500/10 hover:text-red-300"
              >
                <LogOut className="h-4 w-4 shrink-0" />
                <span className="truncate">Sair</span>
              </button>
            </>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div
                className="flex h-11 w-11 items-center justify-center rounded-full border border-violet-500/30 bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 text-lg font-bold text-violet-300"
                title={usuario.nome || 'Usuário'}
              >
                {usuario.nome ? usuario.nome.charAt(0).toUpperCase() : 'U'}
              </div>

              <button
                onClick={handleLogout}
                title="Sair"
                className="flex w-full items-center justify-center rounded-xl border border-white/10 bg-white/5 py-2.5 text-slate-300 backdrop-blur-md transition-all hover:border-red-500/20 hover:bg-red-500/10 hover:text-red-300"
              >
                <LogOut className="h-4 w-4 shrink-0" />
              </button>
            </div>
          )}
        </div>
      </aside>

      <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden bg-[radial-gradient(circle_at_top,_rgba(139,92,246,0.16),_transparent_30%),linear-gradient(180deg,_#0b1020_0%,_#070b17_100%)] p-6 md:p-8">
        {children}
      </main>
    </div>
  );
}