import React, {
  createContext,
  ReactNode,
  useContext,
  useMemo,
  useState,
} from 'react';

interface Props {
  children: ReactNode;
}

interface TotemUiContextValue {
  welcomeActive: boolean;
  setWelcomeActive: (v: boolean) => void;
}

const TotemUiContext = createContext<TotemUiContextValue | null>(null);

export function useSelfCheckoutTotemUi(): TotemUiContextValue {
  const ctx = useContext(TotemUiContext);
  if (!ctx) {
    throw new Error('useSelfCheckoutTotemUi must be used within SelfCheckoutLayout');
  }
  return ctx;
}

/**
 * Layout full-screen totem — Aurya Design System (Dark Premium SaaS).
 * Na boas-vindas o header compacto some: a marca aparece em hero na própria página.
 */
export function SelfCheckoutLayout({ children }: Props) {
  const [welcomeActive, setWelcomeActive] = useState(true);

  const value = useMemo(
    () => ({ welcomeActive, setWelcomeActive }),
    [welcomeActive],
  );

  return (
    <TotemUiContext.Provider value={value}>
      <div className="min-h-[100dvh] min-w-full bg-[#060816] text-white antialiased selection:bg-violet-500/30">
        <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(139,92,246,0.12),transparent_50%)]" />
        <div className="relative z-10 min-h-[100dvh] flex flex-col">
          {!welcomeActive && (
            <header className="shrink-0 border-b border-white/10 bg-[#08101f]/90 backdrop-blur-xl px-4 py-3 md:py-4 shadow-[0_25px_60px_rgba(0,0,0,0.35)]">
              <img
                src="/logoAurya.png"
                alt="Aurya ERP"
                className="h-12 md:h-14 object-contain mx-auto drop-shadow-[0_0_12px_rgba(139,92,246,0.35)]"
              />
            </header>
          )}
          <div className="flex-1 flex flex-col min-h-0">{children}</div>
        </div>
      </div>
    </TotemUiContext.Provider>
  );
}
