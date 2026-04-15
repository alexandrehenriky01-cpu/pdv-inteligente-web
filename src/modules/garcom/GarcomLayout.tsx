import { Outlet } from 'react-router-dom';
import { UtensilsCrossed } from 'lucide-react';

/**
 * Shell mobile-first para o app do garçom (comanda eletrônica).
 */
export function GarcomLayout() {
  return (
    <div className="min-h-screen bg-[#060816] text-white antialiased">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(16,185,129,0.08),transparent_45%)]" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col shadow-[0_0_80px_rgba(0,0,0,0.35)]">
        <header className="sticky top-0 z-50 border-b border-white/10 bg-[#08101f]/92 backdrop-blur-xl">
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-emerald-500/25 bg-emerald-500/10">
              <UtensilsCrossed className="h-6 w-6 text-emerald-300" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-lg font-bold leading-tight text-white">Comanda garçom</h1>
              <p className="text-[11px] font-medium text-slate-500">Mesas · Cardápio · Cozinha</p>
            </div>
          </div>
        </header>
        <main className="min-h-0 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
