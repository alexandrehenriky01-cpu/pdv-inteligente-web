import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useAuryaTheme } from './ThemeContext';

interface ThemeToggleProps {
  compact?: boolean;
}

export function ThemeToggle({ compact = false }: ThemeToggleProps) {
  const { mode, toggleMode, isDark } = useAuryaTheme();

  if (compact) {
    return (
      <button
        onClick={toggleMode}
        type="button"
        className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 p-2.5 text-slate-300 transition-all hover:bg-white/10 hover:text-white"
        title={isDark ? 'Ativar modo claro' : 'Ativar modo escuro'}
      >
        {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </button>
    );
  }

  return (
    <button
      onClick={toggleMode}
      type="button"
      className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-bold text-slate-200 transition-all hover:border-violet-400/20 hover:bg-violet-500/10 hover:text-white"
      title={isDark ? 'Ativar modo claro' : 'Ativar modo escuro'}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      {mode === 'dark' ? 'Modo escuro' : 'Modo claro'}
    </button>
  );
}
