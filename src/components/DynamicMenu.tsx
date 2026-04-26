import { useEffect, useMemo, useState, type ElementType } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  ChevronDown,
  ChevronRight,
  LayoutDashboard,
  Database,
  Package,
  Tags,
  Users,
  UserCog,
  Scale,
  Settings,
  Monitor,
  ShoppingCart,
  ShoppingBag,
  ClipboardList,
  AlertTriangle,
  Inbox,
  FileText,
  BrainCircuit,
  Receipt,
  FileUp,
  Wallet,
  TrendingUp,
  CheckSquare,
  Landmark,
  CreditCard,
  BookOpen,
  ScanSearch,
  Smartphone,
  Sparkles,
  ShieldCheck,
  Building2,
  UtensilsCrossed,
  BadgePercent,
  ListOrdered,
  Network,
  Factory,
  Printer,
  ArrowRightLeft,
  Map,
  Layers,
  Truck,
  Box,
  Radar,
  PackageCheck,
  Banknote,
  ScanLine,
  Timer,
  PackageSearch,
  Pizza,
  ChefHat,
} from 'lucide-react';
import { useAuryaTheme } from '../theme/ThemeContext';
import { isMenuFlatLinks, isMenuMacro, isMenuSection } from '../config/menuConfig';
import { type MenuUser } from '../config/filterMenu';
import { buildMenu } from '../services/menuBuilder';
import { fetchAccessCatalog, type AccessCatalog } from '../services/accessCatalog';

const ICONS: Record<string, ElementType> = {
  LayoutDashboard,
  Database,
  Package,
  Tags,
  Users,
  UserCog,
  Scale,
  Settings,
  Monitor,
  ShoppingCart,
  ShoppingBag,
  ClipboardList,
  AlertTriangle,
  Inbox,
  FileText,
  BrainCircuit,
  Receipt,
  FileUp,
  Wallet,
  TrendingUp,
  CheckSquare,
  Landmark,
  CreditCard,
  BookOpen,
  ScanSearch,
  Smartphone,
  Sparkles,
  ShieldCheck,
  Building2,
  UtensilsCrossed,
  BadgePercent,
  ListOrdered,
  Network,
  Factory,
  Printer,
  ArrowRightLeft,
  Map,
  Layers,
  Truck,
  Box,
  Radar,
  PackageCheck,
  Banknote,
  ScanLine,
  Timer,
  PackageSearch,
  Pizza,
  ChefHat,
};

function iconComponent(name: string): ElementType {
  return ICONS[name] ?? LayoutDashboard;
}

function isItemActive(pathname: string, path: string, activeUnless?: string): boolean {
  if (activeUnless && pathname.includes(activeUnless)) return false;
  if (path === '/dashboard') return pathname === '/dashboard';
  return pathname.includes(path);
}

interface MenuItemProps {
  to: string;
  icon: ElementType;
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
    ? mode === 'dark'
      ? 'text-violet-300'
      : 'text-violet-700'
    : isAi
      ? mode === 'dark'
        ? 'text-violet-400 group-hover:text-violet-300'
        : 'text-violet-600 group-hover:text-violet-700'
      : mode === 'dark'
        ? 'text-slate-500 group-hover:text-violet-300'
        : 'text-slate-500 group-hover:text-violet-700';

  return (
    <Link
      to={to}
      target={target}
      title={label}
      className={`group flex items-center ${collapsed ? 'justify-center px-2' : 'gap-3 px-3'} py-2.5 rounded-xl text-sm font-medium transition-all duration-200 overflow-hidden backdrop-blur-md ${isActive ? activeClass : idleClass}`}
    >
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
  id: string;
  title: string;
  icon: ElementType;
  isAi?: boolean;
  isOpen: boolean;
  collapsed: boolean;
  onToggle: (id: string) => void;
  mode: 'dark' | 'light';
  theme: ReturnType<typeof useAuryaTheme>['theme'];
}

const SectionHeader = ({ id, title, icon: Icon, isAi = false, isOpen, collapsed, onToggle, mode, theme }: SectionHeaderProps) => {
  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => onToggle(id)}
        title={title}
        className={`mt-2 flex w-full items-center justify-center rounded-xl border p-3 transition-all duration-200 backdrop-blur-md ${isOpen ? (isAi ? (mode === 'dark' ? 'bg-violet-500/12 border-violet-500/20 text-violet-300' : 'bg-violet-50 border-violet-200 text-violet-700') : mode === 'dark' ? 'bg-white/[0.07] border-white/10 text-white' : 'bg-slate-100 border-slate-200 text-slate-900') : isAi ? (mode === 'dark' ? 'text-violet-400 hover:bg-violet-500/12 border-transparent hover:border-violet-500/15' : 'text-violet-600 hover:bg-violet-50 border-transparent hover:border-violet-200') : mode === 'dark' ? 'text-slate-400 hover:bg-white/[0.06] border-transparent hover:border-white/10' : 'text-slate-500 hover:bg-slate-100 border-transparent hover:border-slate-200'}`}
      >
        <Icon className={`w-4 h-4 ${isOpen ? (mode === 'dark' ? 'text-violet-300' : 'text-violet-700') : isAi ? (mode === 'dark' ? 'text-violet-500' : 'text-violet-600') : 'text-slate-500'}`} />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onToggle(id)}
      title={title}
      className={`mt-2 flex w-full items-center justify-between overflow-hidden rounded-xl border p-3 transition-all duration-200 backdrop-blur-md ${isOpen ? (isAi ? (mode === 'dark' ? 'bg-violet-500/12 border-violet-500/20 text-violet-300' : 'bg-violet-50 border-violet-200 text-violet-700') : mode === 'dark' ? 'bg-white/[0.07] border-white/10 text-white' : 'bg-slate-100 border-slate-200 text-slate-900') : isAi ? (mode === 'dark' ? 'text-violet-400 hover:bg-violet-500/10 border-transparent hover:border-violet-500/15' : 'text-violet-700 hover:bg-violet-50 border-transparent hover:border-violet-200') : `${theme.classes.sidebarText} ${theme.classes.sidebarHover}`}`}
    >
      <div className="flex min-w-0 items-center gap-3 text-[11px] font-bold uppercase tracking-[0.16em]">
        <Icon className={`w-4 h-4 shrink-0 ${isOpen ? (mode === 'dark' ? 'text-violet-300' : 'text-violet-700') : isAi ? (mode === 'dark' ? 'text-violet-500' : 'text-violet-600') : 'text-slate-500'}`} />
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

export type DynamicMenuProps = {
  usuario: MenuUser;
  sidebarCollapsed: boolean;
};

export function DynamicMenu({ usuario, sidebarCollapsed }: DynamicMenuProps) {
  const location = useLocation();
  const { theme, mode } = useAuryaTheme();

  const [catalog, setCatalog] = useState<AccessCatalog | null>(null);

  useEffect(() => {
    fetchAccessCatalog()
      .then(setCatalog)
      .catch((err) => console.error('[MENU] Falha ao carregar catálogo:', err));
  }, []);

  const filtered = useMemo(() => {
    if (!catalog) return [];
    return buildMenu({
      catalog,
      userFeatures: [
        ...(usuario.featuresAtivas ?? []),
        ...(usuario.loja?.featuresAtivas ?? []),
      ],
      userModules: [
        ...(usuario.modulosAtivos ?? []),
        ...(usuario.loja?.modulosAtivos ?? []),
      ],
      role: usuario.role ?? '',
    });
  }, [catalog, usuario]);

  const [menusAbertos, setMenusAbertos] = useState<Record<string, boolean>>({
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
    setMenusAbertos((prev) => ({
      ...prev,
      centralAurya: prev.centralAurya || path.includes('/aurya'),
      estruturaNegocio:
        prev.estruturaNegocio ||
        ['/produtos', '/categorias', '/embalagens', '/pessoas', '/equipe', '/permissoes', '/configuracoes-loja', '/layout-etiquetas', '/estacoes-trabalho', '/locais-cobranca', '/configuracao-caixas-pdv', '/configuracao-tef', '/balancas'].some((p) => path.includes(p)),
      operacaoVendas:
        prev.operacaoVendas ||
        ['/frente-caixa', '/self-checkout', '/pdv-food', '/cardapio/gestao', '/gestao-food', '/garcom', '/vendas/campanhas-promocionais', '/vendas/gestao-turnos-caixa', '/kds', '/vendas/gestao-delivery', '/entregas/mobile', '/comanda-mobile'].some((p) => path.includes(p)),
      comprasSuprimentos:
        prev.comprasSuprimentos || ['/compras', '/entrada-notas', '/ListarNfe'].some((p) => path.includes(p)),
      fiscalInteligente: prev.fiscalInteligente || ['/notas', '/notas-fiscais', '/regras-fiscais', '/cadastrocfop'].some((p) => path.includes(p)),
      financeiroInteligente: prev.financeiroInteligente || path.includes('/financeiro'),
      contabilidadeAnalise: prev.contabilidadeAnalise || ['/contabil', '/contabilidade/dre'].some((p) => path.includes(p)),
      estoqueInteligente: prev.estoqueInteligente || ['/estoque', '/estoque/listas-preco', '/estoque/carga-balancas'].some((p) => path.includes(p)),
      logisticaWms: prev.logisticaWms || path.includes('/wms'),
      producaoIndustria: prev.producaoIndustria || path.includes('/producao'),
      adminSaaS: prev.adminSaaS || path.includes('/admin'),
    }));
  }, [location.pathname]);

  const toggleMenu = (id: string) => {
    setMenusAbertos((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <nav className="relative z-10 flex-1 space-y-1 overflow-y-auto p-3 custom-scrollbar">
      {filtered.map((entry, idx) => {
        if (isMenuMacro(entry)) {
          return <MacroGroupTitle key={`m-${idx}`} title={entry.macroTitle} collapsed={sidebarCollapsed} mode={mode} />;
        }
        if (isMenuFlatLinks(entry)) {
          return (
            <div key={`f-${idx}`} className="space-y-1">
              {entry.flatLinks.map((item) => {
                const Icon = iconComponent(item.icon);
                const active = isItemActive(location.pathname, item.path, item.activeUnlessPathIncludes);
                if (item.path === '/dashboard') {
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      title={item.label}
                      className={`group mb-2 flex items-center ${sidebarCollapsed ? 'justify-center px-2' : 'gap-3 px-3'} overflow-hidden rounded-xl border py-3 text-sm font-semibold backdrop-blur-md transition-all ${
                        active
                          ? mode === 'dark'
                            ? 'bg-gradient-to-r from-violet-600/80 to-fuchsia-600/70 text-white border-violet-400/30 shadow-[0_0_25px_rgba(139,92,246,0.30)]'
                            : 'bg-gradient-to-r from-violet-100 to-fuchsia-100 text-slate-900 border-violet-300 shadow-[0_0_0_1px_rgba(139,92,246,0.10)]'
                          : `${theme.classes.sidebarText} ${theme.classes.sidebarHover} border-transparent`
                      }`}
                    >
                      <Icon className={`h-5 w-5 shrink-0 ${active ? (mode === 'dark' ? 'text-white' : 'text-violet-700') : mode === 'dark' ? 'text-slate-500 group-hover:text-violet-300' : 'text-slate-500 group-hover:text-violet-700'}`} />
                      {!sidebarCollapsed && <span className="truncate flex-1">{item.label}</span>}
                    </Link>
                  );
                }
                if (item.path === '/dashboard-food') {
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      title={item.label}
                      className={`group mb-2 flex items-center ${sidebarCollapsed ? 'justify-center px-2' : 'gap-3 px-3'} overflow-hidden rounded-xl border py-3 text-sm font-semibold backdrop-blur-md transition-all ${
                        location.pathname.includes('/dashboard-food')
                          ? mode === 'dark'
                            ? 'bg-gradient-to-r from-orange-600/50 to-violet-600/50 text-white border-orange-400/30 shadow-[0_0_20px_rgba(249,115,22,0.18)]'
                            : 'bg-gradient-to-r from-orange-50 to-violet-50 text-slate-900 border-orange-200'
                          : `${theme.classes.sidebarText} ${theme.classes.sidebarHover} border-transparent`
                      }`}
                    >
                      <Icon
                        className={`h-5 w-5 shrink-0 ${
                          location.pathname.includes('/dashboard-food')
                            ? mode === 'dark'
                              ? 'text-orange-200'
                              : 'text-orange-600'
                            : mode === 'dark'
                              ? 'text-slate-500 group-hover:text-orange-300'
                              : 'text-slate-500 group-hover:text-orange-600'
                        }`}
                      />
                      {!sidebarCollapsed && <span className="truncate flex-1">{item.label}</span>}
                    </Link>
                  );
                }
                return (
                  <MenuItem
                    key={item.path}
                    to={item.path}
                    icon={Icon}
                    label={item.label}
                    target={item.target}
                    isAi={item.isAi}
                    isActive={active}
                    collapsed={sidebarCollapsed}
                    mode={mode}
                    theme={theme}
                  />
                );
              })}
            </div>
          );
        }
        if (isMenuSection(entry)) {
          const SectionIcon = iconComponent(entry.icon);
          const isOpen = menusAbertos[entry.section] ?? false;
          return (
            <div key={entry.section}>
              <SectionHeader
                id={entry.section}
                mode={mode}
                theme={theme}
                title={entry.label}
                icon={SectionIcon}
                isAi={entry.isAi}
                isOpen={isOpen}
                collapsed={sidebarCollapsed}
                onToggle={toggleMenu}
              />
              {isOpen && (
                <div
                  className={`mt-1 mb-2 animate-in slide-in-from-top-2 fade-in duration-200 ${
                    entry.isAi
                      ? `${mode === 'dark' ? 'rounded-2xl border border-violet-500/15 bg-violet-500/[0.06]' : 'rounded-2xl border border-violet-200 bg-violet-50/70'} ${sidebarCollapsed ? 'p-1.5' : 'p-2'}`
                      : `${sidebarCollapsed ? 'p-1' : 'pl-1'} space-y-1`
                  }`}
                >
                  <div className={entry.isAi ? 'space-y-1' : 'space-y-1'}>
                    {entry.items.map((item) => {
                      const Icon = iconComponent(item.icon);
                      const active = isItemActive(location.pathname, item.path, item.activeUnlessPathIncludes);
                      return (
                        <MenuItem
                          key={item.path}
                          to={item.path}
                          icon={Icon}
                          label={item.label}
                          target={item.target}
                          isAi={item.isAi}
                          isActive={active}
                          collapsed={sidebarCollapsed}
                          mode={mode}
                          theme={theme}
                        />
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        }
        return null;
      })}
    </nav>
  );
}
