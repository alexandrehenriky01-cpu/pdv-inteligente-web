import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { clearAuthSessionAndAxios } from '../services/authSession';
import { AUTH_USER_KEY } from '../services/authStorage';

/**
 * Hook de logout automático por inatividade.
 *
 * Útil em telas mobile compartilhadas (ex.: tablet do salão usado por garçons),
 * onde o aparelho pode ser deixado sobre uma mesa e acessado por terceiros.
 *
 * - Conta inatividade pelos eventos `pointerdown`/`keydown`/`visibilitychange`.
 * - Renova o timer a cada interação real do usuário (sem polling).
 * - Ao expirar: limpa tokens, axios header e dados de usuário, e navega para `/login`.
 *
 * O hook NÃO altera fluxo de autenticação normal nem afeta outras páginas — ele
 * só roda enquanto o componente que o chama está montado.
 */
export function useInactivityLogout(minutos: number, redirectTo: string = '/login'): void {
  const navigate = useNavigate();
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!Number.isFinite(minutos) || minutos <= 0) return;

    const limiteMs = Math.floor(minutos * 60_000);

    const desligar = (): void => {
      try {
        clearAuthSessionAndAxios();
        // Limpa também o snapshot de usuário no localStorage
        localStorage.removeItem(AUTH_USER_KEY);
      } catch {
        // ignora — navegar mesmo assim
      }
      navigate(redirectTo, { replace: true });
    };

    const reagendar = (): void => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
      timerRef.current = window.setTimeout(desligar, limiteMs);
    };

    const aoInteragir = (): void => {
      reagendar();
    };

    const aoMudarVisibilidade = (): void => {
      // Quando volta a tela, reagenda. Quando some, mantém o timer atual.
      if (document.visibilityState === 'visible') {
        reagendar();
      }
    };

    reagendar();
    window.addEventListener('pointerdown', aoInteragir, { passive: true });
    window.addEventListener('keydown', aoInteragir);
    document.addEventListener('visibilitychange', aoMudarVisibilidade);

    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      window.removeEventListener('pointerdown', aoInteragir);
      window.removeEventListener('keydown', aoInteragir);
      document.removeEventListener('visibilitychange', aoMudarVisibilidade);
    };
  }, [minutos, redirectTo, navigate]);
}
