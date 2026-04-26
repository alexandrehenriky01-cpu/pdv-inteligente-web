import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronsLeft, ChevronsRight, LogOut } from 'lucide-react';

import { IUsuario } from '../types/auth';
import { AUTH_USER_KEY } from '../services/authStorage';
import { clearAuthSessionAndAxios } from '../services/authSession';
import { useAuryaTheme } from '../theme/ThemeContext';
import { ThemeToggle } from '../theme/ThemeToggle';
import { auryaBrandMark } from '../assets/branding';
import { DynamicMenu } from './DynamicMenu';
import type { MenuUser } from '../config/filterMenu';

interface LayoutProps {
  children: ReactNode;
}

interface IUsuarioLayout extends Omit<IUsuario, 'role'> {
  role?: string;
  permissoes?: string[];
  loja?: {
    nome?: string;
    modulosAtivos?: string[];
    featuresAtivas?: string[];
    [key: string]: unknown;
  };
}

export function Layout({ children }: LayoutProps) {
  const navigate = useNavigate();
  const { theme, mode } = useAuryaTheme();

  let usuario: Partial<IUsuarioLayout> = {};
  try {
    const userStr = localStorage.getItem(AUTH_USER_KEY);
    if (userStr) {
      usuario = JSON.parse(userStr) as IUsuarioLayout;
    }
  } catch (error) {
    console.error('Falha ao ler dados do usuário no Layout:', error);
  }

  const menuUser: MenuUser = {
    role: usuario.role,
    permissoes: usuario.permissoes,
    featuresAtivas: usuario.featuresAtivas ?? (usuario.loja?.featuresAtivas as string[] | undefined),
    loja: usuario.loja
      ? {
          modulosAtivos: usuario.loja.modulosAtivos,
          featuresAtivas: usuario.loja.featuresAtivas,
        }
      : undefined,
  };

  // AUDITORIA: Log das permissões reais para debugging
  console.log('🔐 PERMISSÕES REAIS NO FRONTEND:', {
    role: usuario.role,
    featuresAtivas: menuUser.featuresAtivas,
    modulosAtivos: menuUser.loja?.modulosAtivos ?? menuUser.modulosAtivos,
    totalFeatures: (menuUser.featuresAtivas || []).length,
  });

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === AUTH_USER_KEY) {
        window.location.reload();
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const handleLogout = () => {
    clearAuthSessionAndAxios();
    navigate('/');
  };

  return (
    <div className={`flex h-screen overflow-hidden ${mode === 'dark' ? 'text-slate-100' : 'text-slate-900'}`} style={{ background: theme.colors.bgPrimary }}>
      <aside
        className={`${sidebarCollapsed ? 'w-24' : 'w-72'} relative z-10 flex shrink-0 flex-col backdrop-blur-xl transition-all duration-300 ${mode === 'dark' ? 'border-r border-white/10 bg-[#050913]/95 shadow-[0_25px_60px_rgba(0,0,0,0.45)]' : 'border-r border-slate-200 bg-white/95 shadow-[0_20px_50px_rgba(15,23,42,0.10)]'}`}
      >
        <div
          className={`pointer-events-none absolute inset-0 ${mode === 'dark' ? 'bg-[radial-gradient(circle_at_top_left,_rgba(139,92,246,0.18),_transparent_28%),linear-gradient(180deg,_rgba(255,255,255,0.02),_transparent_30%)]' : 'bg-[radial-gradient(circle_at_top_left,_rgba(139,92,246,0.10),_transparent_26%),linear-gradient(180deg,_rgba(15,23,42,0.01),_transparent_24%)]'}`}
        />

        <div
          className={`relative z-10 ${sidebarCollapsed ? 'px-3 py-5' : 'px-5 py-5'} flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-between gap-3'} ${mode === 'dark' ? 'border-b border-white/10 bg-[#08101f]/30' : 'border-b border-slate-200 bg-slate-50/80'}`}
        >
          <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3'} min-w-0`}>
            <img src={auryaBrandMark} alt="Aurya Logo" className="h-11 w-11 shrink-0 rounded-xl border border-violet-500/30 object-cover shadow-[0_0_20px_rgba(139,92,246,0.25)]" />
            {!sidebarCollapsed && (
              <div className="flex min-w-0 flex-col">
                <span className="truncate bg-gradient-to-r from-violet-200 via-fuchsia-300 to-purple-400 bg-clip-text text-lg font-black tracking-[0.18em] text-transparent drop-shadow-[0_0_14px_rgba(139,92,246,0.35)]">
                  AURYA
                </span>
                <span className="truncate text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">ERP AI-First</span>
              </div>
            )}
          </div>
          {!sidebarCollapsed && (
            <div className="flex items-center gap-2">
              <ThemeToggle compact />
              <button
                type="button"
                onClick={() => setSidebarCollapsed(true)}
                className={`rounded-xl border border-transparent p-2 transition-all ${mode === 'dark' ? 'text-slate-400 hover:border-white/10 hover:bg-white/[0.06] hover:text-white' : 'text-slate-500 hover:border-slate-200 hover:bg-slate-100 hover:text-slate-900'}`}
                title="Recolher menu"
              >
                <ChevronsLeft className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {sidebarCollapsed && (
          <div className="relative z-10 px-3 pt-3">
            <button
              type="button"
              onClick={() => setSidebarCollapsed(false)}
              className={`flex w-full items-center justify-center rounded-xl border border-transparent p-2.5 transition-all ${mode === 'dark' ? 'text-slate-400 hover:border-white/10 hover:bg-white/[0.06] hover:text-white' : 'text-slate-500 hover:border-slate-200 hover:bg-slate-100 hover:text-slate-900'}`}
              title="Expandir menu"
            >
              <ChevronsRight className="h-4 w-4" />
            </button>
          </div>
        )}

        <DynamicMenu usuario={menuUser} sidebarCollapsed={sidebarCollapsed} />

        <div
          className={`relative z-10 shrink-0 p-4 backdrop-blur-xl ${mode === 'dark' ? 'border-t border-white/10 bg-[#08101f]/40' : 'border-t border-slate-200 bg-slate-50/80'}`}
        >
          {!sidebarCollapsed ? (
            <>
              <div className="mb-3 flex justify-start">
                <ThemeToggle />
              </div>

              <div
                className={`mb-4 flex items-center gap-3 overflow-hidden rounded-2xl px-3 py-3 backdrop-blur-md ${mode === 'dark' ? 'border border-white/10 bg-white/[0.06]' : 'border border-slate-200 bg-white'}`}
              >
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg font-bold text-violet-300 ${mode === 'dark' ? 'border border-violet-500/30 bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20' : 'border border-violet-200 bg-gradient-to-br from-violet-100 to-fuchsia-100'}`}
                >
                  {usuario.nome ? usuario.nome.charAt(0).toUpperCase() : 'U'}
                </div>

                <div className="min-w-0 flex-1">
                  <p className={`truncate text-sm font-bold ${mode === 'dark' ? 'text-white' : 'text-slate-900'}`} title={usuario.nome || 'Usuário'}>
                    {usuario.nome || 'Usuário'}
                  </p>
                  <p className={`truncate text-xs ${mode === 'dark' ? 'text-violet-300' : 'text-violet-700'}`} title={usuario.loja?.nome || 'Minha Loja'}>
                    {usuario.loja?.nome || 'Minha Loja'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                className={`flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold backdrop-blur-md transition-all ${mode === 'dark' ? 'border border-white/10 bg-white/[0.06] text-slate-300 hover:border-red-500/20 hover:bg-red-500/10 hover:text-red-300' : 'border border-slate-200 bg-white text-slate-700 hover:border-red-300 hover:bg-red-50 hover:text-red-600'}`}
              >
                <LogOut className="h-4 w-4 shrink-0" />
                <span className="truncate">Sair</span>
              </button>
            </>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div
                className={`flex h-11 w-11 items-center justify-center rounded-full text-lg font-bold text-violet-300 ${mode === 'dark' ? 'border border-violet-500/30 bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20' : 'border border-violet-200 bg-gradient-to-br from-violet-100 to-fuchsia-100'}`}
                title={usuario.nome || 'Usuário'}
              >
                {usuario.nome ? usuario.nome.charAt(0).toUpperCase() : 'U'}
              </div>

              <button
                type="button"
                onClick={handleLogout}
                title="Sair"
                className={`flex w-full items-center justify-center rounded-xl py-2.5 backdrop-blur-md transition-all ${mode === 'dark' ? 'border border-white/10 bg-white/5 text-slate-300 hover:border-red-500/20 hover:bg-red-500/10 hover:text-red-300' : 'border border-slate-200 bg-white text-slate-700 hover:border-red-300 hover:bg-red-50 hover:text-red-600'}`}
              >
                <LogOut className="h-4 w-4 shrink-0" />
              </button>
            </div>
          )}
        </div>
      </aside>

      <main
        className={`flex-1 min-w-0 overflow-y-auto overflow-x-hidden p-6 md:p-8 ${mode === 'dark' ? 'bg-[radial-gradient(circle_at_top,_rgba(139,92,246,0.18),_transparent_30%),linear-gradient(180deg,_#0b1020_0%,_#070b17_100%)]' : 'bg-[radial-gradient(circle_at_top,_rgba(139,92,246,0.10),_transparent_26%),linear-gradient(180deg,_#ffffff_0%,_#f6f8fc_100%)]'}`}
      >
        {children}
      </main>
    </div>
  );
}
