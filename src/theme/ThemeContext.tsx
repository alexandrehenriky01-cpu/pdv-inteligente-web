import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { getAuryaTheme, ThemeMode } from './themeTokens';

interface ThemeContextValue {
  mode: ThemeMode;
  isDark: boolean;
  theme: ReturnType<typeof getAuryaTheme>;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
}

const STORAGE_KEY = '@AuryaThemeMode';
const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function getInitialMode(): ThemeMode {
  if (typeof window === 'undefined') return 'dark';
  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (saved === 'dark' || saved === 'light') return saved;
  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  return prefersDark ? 'dark' : 'light';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(getInitialMode);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, mode);
    document.documentElement.dataset.theme = mode;
    document.documentElement.classList.toggle('dark', mode === 'dark');
  }, [mode]);

  const setMode = useCallback((nextMode: ThemeMode) => {
    setModeState(nextMode);
  }, []);

  const toggleMode = useCallback(() => {
    setModeState(prev => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const theme = useMemo(() => getAuryaTheme(mode), [mode]);

  const value = useMemo(
    () => ({ mode, isDark: mode === 'dark', theme, setMode, toggleMode }),
    [mode, theme, setMode, toggleMode]
  );

  return (
    <ThemeContext.Provider value={value}>
      <div className={theme.classes.page} style={theme.variables}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export function useAuryaTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useAuryaTheme must be used inside ThemeProvider');
  }
  return context;
}
