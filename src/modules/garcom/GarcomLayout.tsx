import { useMemo } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { LogOut, UtensilsCrossed } from 'lucide-react';
import { clearAuthSessionAndAxios } from '../../services/authSession';
import { AUTH_USER_KEY } from '../../services/authStorage';
import { useInactivityLogout } from '../../hooks/useInactivityLogout';

interface UsuarioStorageMin {
  nome?: string;
  role?: string;
}

function lerUsuarioStorage(): UsuarioStorageMin | null {
  try {
    const raw = localStorage.getItem(AUTH_USER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === 'object') {
      const obj = parsed as Record<string, unknown>;
      return {
        nome: typeof obj.nome === 'string' ? obj.nome : undefined,
        role: typeof obj.role === 'string' ? obj.role : undefined,
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Shell mobile-first para o app do garçom (comanda eletrônica).
 *
 * Segurança operacional:
 *  - Logout automático por inatividade (15 min) — proteção contra celular
 *    deixado em cima da mesa.
 *  - Botão "Sair" explícito no header (limpa tokens e volta ao login).
 *  - Nome do garçom logado fica visível, evitando dúvida de "quem está usando".
 */
export function GarcomLayout(): JSX.Element {
  const navigate = useNavigate();
  useInactivityLogout(15);

  const usuario = useMemo<UsuarioStorageMin | null>(lerUsuarioStorage, []);
  const nomeGarcom = (usuario?.nome ?? '').trim() || 'Garçom';

  const sair = (): void => {
    if (!window.confirm('Sair do app do garçom?')) return;
    try {
      clearAuthSessionAndAxios();
      localStorage.removeItem(AUTH_USER_KEY);
    } catch {
      // segue para login mesmo se falhar a limpeza
    }
    navigate('/login', { replace: true });
  };

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
              <p className="truncate text-[11px] font-medium text-emerald-300/85">{nomeGarcom}</p>
            </div>
            <button
              type="button"
              onClick={sair}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.10]"
              aria-label="Sair do app"
              title="Sair"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>
        <main className="min-h-0 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
