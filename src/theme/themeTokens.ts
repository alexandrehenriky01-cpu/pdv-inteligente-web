import type { CSSProperties } from 'react';

export type ThemeMode = 'dark' | 'light';

export interface AuryaThemePalette {
  mode: ThemeMode;
  colors: {
    bgPrimary: string;
    bgSecondary: string;
    bgTertiary: string;
    card: string;
    cardSoft: string;
    border: string;
    borderStrong: string;
    textPrimary: string;
    textSecondary: string;
    textMuted: string;
    textMenu: string;
    textMenuMuted: string;
    accentFrom: string;
    accentTo: string;
    success: string;
    warning: string;
    danger: string;
    info: string;
  };
  classes: {
    page: string;
    panel: string;
    panelSoft: string;
    sectionTitle: string;
    input: string;
    textarea: string;
    select: string;
    label: string;
    btnPrimary: string;
    btnSecondary: string;
    btnDanger: string;
    headerShell: string;
    badge: string;
    tableWrap: string;
    tableHead: string;
    tableRow: string;
    footerNote: string;
    sidebar: string;
    sidebarTop: string;
    sidebarText: string;
    sidebarMuted: string;
    sidebarHover: string;
    sidebarActive: string;
    sidebarSection: string;
    userCard: string;
  };
  effects: {
    headerGradient: string;
    glowLeft: string;
    glowRight: string;
    mainGradient: string;
  };
  variables: CSSProperties;
}

const common = {
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#8b5cf6',
};

export const auryaThemes: Record<ThemeMode, AuryaThemePalette> = {
  dark: {
    mode: 'dark',
    colors: {
      bgPrimary: '#08101f',
      bgSecondary: '#0b1324',
      bgTertiary: '#0d182d',
      card: 'rgba(8, 16, 31, 0.90)',
      cardSoft: 'rgba(11, 19, 36, 0.92)',
      border: 'rgba(255,255,255,0.10)',
      borderStrong: 'rgba(139,92,246,0.20)',
      textPrimary: '#ffffff',
      textSecondary: '#94a3b8',
      textMuted: '#64748b',
      textMenu: '#cbd5e1',
      textMenuMuted: '#64748b',
      accentFrom: '#7c3aed',
      accentTo: '#d946ef',
      ...common,
    },
    classes: {
      page: 'min-h-screen bg-[#08101f] text-white',
      panel: 'rounded-[30px] border border-white/10 bg-[#08101f]/90 backdrop-blur-xl shadow-[0_25px_60px_rgba(0,0,0,0.35)]',
      panelSoft: 'rounded-[24px] border border-white/10 bg-[#0b1324]/95 shadow-inner',
      sectionTitle: 'text-sm font-black uppercase tracking-[0.18em] text-white',
      input: 'w-full rounded-2xl border border-white/10 bg-[#0d182d] px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none shadow-inner transition-all focus:border-violet-400/30 focus:ring-2 focus:ring-violet-500/15',
      textarea: 'w-full rounded-2xl border border-white/10 bg-[#0d182d] px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none shadow-inner transition-all focus:border-violet-400/30 focus:ring-2 focus:ring-violet-500/15 resize-none',
      select: 'w-full rounded-2xl border border-white/10 bg-[#0d182d] px-4 py-3 text-sm text-white outline-none shadow-inner transition-all focus:border-violet-400/30 focus:ring-2 focus:ring-violet-500/15',
      label: 'mb-2 block pl-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400',
      btnPrimary: 'inline-flex items-center justify-center gap-2 rounded-2xl border border-violet-400/20 bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-3.5 font-black text-white shadow-[0_0_20px_rgba(139,92,246,0.24)] transition-all hover:scale-[1.02] hover:brightness-110 disabled:opacity-50 disabled:hover:scale-100',
      btnSecondary: 'inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-6 py-3.5 font-bold text-slate-200 transition-all hover:border-violet-400/20 hover:bg-violet-500/10 hover:text-white disabled:opacity-50',
      btnDanger: 'inline-flex items-center justify-center gap-2 rounded-2xl border border-red-400/20 bg-red-500/10 px-6 py-3.5 font-bold text-red-300 transition-all hover:bg-red-500/15',
      headerShell: 'relative overflow-hidden rounded-[30px] border border-white/10 p-6 shadow-[0_25px_70px_rgba(0,0,0,0.40)] sm:p-8',
      badge: 'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em]',
      tableWrap: 'overflow-hidden rounded-[30px] border border-white/10 bg-[#08101f]/90 shadow-[0_25px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl',
      tableHead: 'sticky top-0 z-10 border-b border-white/10 bg-[#0b1324]',
      tableRow: 'transition-colors hover:bg-white/5',
      footerNote: 'rounded-[24px] border border-white/10 bg-black/10 px-6 py-4 text-xs font-medium text-slate-500',
      sidebar: 'border-r border-white/10 bg-[#050913]/95 shadow-[0_25px_60px_rgba(0,0,0,0.45)]',
      sidebarTop: 'border-b border-white/10 bg-[#08101f]/30',
      sidebarText: 'text-slate-300',
      sidebarMuted: 'text-slate-400',
      sidebarHover: 'hover:border-white/10 hover:bg-white/5 hover:text-white',
      sidebarActive: 'bg-gradient-to-r from-violet-600/80 to-fuchsia-600/70 text-white border-violet-400/30 shadow-[0_0_25px_rgba(139,92,246,0.30)]',
      sidebarSection: 'border border-violet-500/15 bg-violet-500/[0.06]',
      userCard: 'border border-white/10 bg-white/[0.06]',
    },
    effects: {
      headerGradient: 'bg-[radial-gradient(circle_at_top_left,_rgba(139,92,246,0.16),_transparent_26%),radial-gradient(circle_at_top_right,_rgba(16,185,129,0.10),_transparent_20%),linear-gradient(135deg,_#0b1020_0%,_#08101f_45%,_#0a1224_100%)]',
      glowLeft: 'pointer-events-none absolute -left-10 top-0 h-52 w-52 rounded-full bg-violet-600/15 blur-[100px]',
      glowRight: 'pointer-events-none absolute right-0 top-0 h-56 w-56 rounded-full bg-emerald-600/10 blur-[110px]',
      mainGradient: 'bg-[radial-gradient(circle_at_top,_rgba(139,92,246,0.18),_transparent_30%),linear-gradient(180deg,_#0b1020_0%,_#070b17_100%)]',
    },
    variables: {
      ['--aurya-bg-primary']: '#08101f',
      ['--aurya-bg-secondary']: '#0b1324',
      ['--aurya-text-primary']: '#ffffff',
      ['--aurya-text-secondary']: '#94a3b8',
      ['--aurya-border']: 'rgba(255,255,255,0.10)',
    } as CSSProperties,
  },

  light: {
    mode: 'light',
    colors: {
      bgPrimary: '#f3f6fb',
      bgSecondary: '#ffffff',
      bgTertiary: '#e9eef8',
      card: 'rgba(255,255,255,0.99)',
      cardSoft: 'rgba(248,250,252,0.98)',
      border: 'rgba(15,23,42,0.12)',
      borderStrong: 'rgba(139,92,246,0.24)',
      textPrimary: '#0f172a',
      textSecondary: '#1e293b',
      textMuted: '#475569',
      textMenu: '#334155',
      textMenuMuted: '#64748b',
      accentFrom: '#7c3aed',
      accentTo: '#d946ef',
      ...common,
    },
    classes: {
      page: 'min-h-screen bg-[#f3f6fb] text-slate-900',
      panel: 'rounded-[30px] border border-slate-200 bg-white/99 backdrop-blur-xl shadow-[0_14px_40px_rgba(15,23,42,0.08)]',
      panelSoft: 'rounded-[24px] border border-slate-200 bg-slate-50/98 shadow-inner',
      sectionTitle: 'text-sm font-black uppercase tracking-[0.18em] text-slate-900',
      input: 'w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none shadow-inner transition-all focus:border-violet-400/40 focus:ring-2 focus:ring-violet-200',
      textarea: 'w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none shadow-inner transition-all focus:border-violet-400/40 focus:ring-2 focus:ring-violet-200 resize-none',
      select: 'w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none shadow-inner transition-all focus:border-violet-400/40 focus:ring-2 focus:ring-violet-200',
      label: 'mb-2 block pl-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-600',
      btnPrimary: 'inline-flex items-center justify-center gap-2 rounded-2xl border border-violet-300 bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-3.5 font-black text-white shadow-[0_0_18px_rgba(139,92,246,0.16)] transition-all hover:scale-[1.02] hover:brightness-105 disabled:opacity-50 disabled:hover:scale-100',
      btnSecondary: 'inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-6 py-3.5 font-bold text-slate-700 transition-all hover:border-violet-300 hover:bg-violet-50 hover:text-slate-900 disabled:opacity-50',
      btnDanger: 'inline-flex items-center justify-center gap-2 rounded-2xl border border-red-300 bg-red-50 px-6 py-3.5 font-bold text-red-600 transition-all hover:bg-red-100',
      headerShell: 'relative overflow-hidden rounded-[30px] border border-slate-200 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.10)] sm:p-8',
      badge: 'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em]',
      tableWrap: 'overflow-hidden rounded-[30px] border border-slate-200 bg-white/99 shadow-[0_14px_40px_rgba(15,23,42,0.08)] backdrop-blur-xl',
      tableHead: 'sticky top-0 z-10 border-b border-slate-200 bg-slate-50',
      tableRow: 'transition-colors hover:bg-violet-50/70',
      footerNote: 'rounded-[24px] border border-slate-200 bg-slate-50 px-6 py-4 text-xs font-medium text-slate-600',
      sidebar: 'border-r border-slate-200 bg-white/98 shadow-[4px_0_20px_rgba(15,23,42,0.04)]',
      sidebarTop: 'border-b border-slate-200 bg-white/92',
      sidebarText: 'text-slate-700',
      sidebarMuted: 'text-slate-500',
      sidebarHover: 'hover:border-slate-200 hover:bg-slate-100 hover:text-slate-900',
      sidebarActive: 'bg-gradient-to-r from-violet-100 to-fuchsia-100 text-violet-700 border-violet-300 shadow-[0_0_0_1px_rgba(139,92,246,0.10)]',
      sidebarSection: 'border border-violet-200 bg-violet-50/70',
      userCard: 'border border-slate-200 bg-white',
    },
    effects: {
      headerGradient: 'bg-[radial-gradient(circle_at_top_left,_rgba(139,92,246,0.10),_transparent_24%),radial-gradient(circle_at_top_right,_rgba(16,185,129,0.06),_transparent_18%),linear-gradient(135deg,_#ffffff_0%,_#f8fafc_45%,_#eef2ff_100%)]',
      glowLeft: 'pointer-events-none absolute -left-10 top-0 h-52 w-52 rounded-full bg-violet-200/50 blur-[100px]',
      glowRight: 'pointer-events-none absolute right-0 top-0 h-56 w-56 rounded-full bg-emerald-200/45 blur-[110px]',
      mainGradient: 'bg-[radial-gradient(circle_at_top,_rgba(139,92,246,0.10),_transparent_26%),linear-gradient(180deg,_#ffffff_0%,_#f3f6fb_100%)]',
    },
    variables: {
      ['--aurya-bg-primary']: '#f3f6fb',
      ['--aurya-bg-secondary']: '#ffffff',
      ['--aurya-text-primary']: '#0f172a',
      ['--aurya-text-secondary']: '#1e293b',
      ['--aurya-border']: 'rgba(15,23,42,0.12)',
    } as CSSProperties,
  },
};

export const getAuryaTheme = (mode: ThemeMode) => auryaThemes[mode];
