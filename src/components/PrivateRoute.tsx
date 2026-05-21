// src/components/PrivateRoute.tsx
import { Navigate, Outlet } from 'react-router-dom';
import { IUsuario } from '../types/auth';
import { AUTH_TOKEN_KEY, AUTH_USER_KEY } from '../services/authStorage';
import { clearAuthSessionAndAxios } from '../services/authSession';

interface PrivateRouteProps {
  rolesPermitidas?: Array<IUsuario['role']>;
}

/** Normaliza string de role para comparação tolerante (case + trim). */
function normalizarRole(valor: unknown): string {
  if (typeof valor !== 'string') return '';
  return valor.trim().toUpperCase();
}

/**
 * SUPER_ADMIN/SUPORTE_MASTER são "break-glass": acessam qualquer rota protegida
 * por role mesmo que não estejam explicitamente na lista. Evita bloquear o dono
 * do sistema por um typo na lista de uma rota específica.
 */
const ROLES_BREAK_GLASS = new Set(['SUPER_ADMIN', 'SUPORTE_MASTER']);

/**
 * Roles cujo acesso é EXCLUSIVO a uma rota específica do sistema. Outros
 * caminhos redirecionam para o destino designado.
 *
 * - FUNCIONARIO / FUNCIONARIO_PORTAL: só pode navegar para `/rh/portal`.
 *   Sem acesso a PDV, módulos administrativos, dashboards executivos etc.
 * - ENTREGADOR: rastreio público pelo /track/:token (não usa PrivateRoute, mas
 *   se cair aqui é redirect para a landing de entregadores).
 */
const ROLE_LANDING_LOCK: Record<string, string> = {
  FUNCIONARIO: '/rh/portal',
  FUNCIONARIO_PORTAL: '/rh/portal',
  ENTREGADOR: '/entregas/mobile',
};

export function PrivateRoute({ rolesPermitidas }: PrivateRouteProps) {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  const usuarioRaw = localStorage.getItem(AUTH_USER_KEY);

  // 1. Verifica se está logado (se não tem token ou dados do usuário)
  if (!token || !usuarioRaw) {
    return <Navigate to="/" replace />;
  }

  try {
    const usuario = JSON.parse(usuarioRaw) as IUsuario;
    const roleAtual = normalizarRole(usuario.role);

    // 2. Roles "trancadas": só podem acessar a rota dedicada.
    // Se o role tem landing exclusiva e a rota atual exige outra coisa,
    // redireciona para a landing.
    const lockedLanding = ROLE_LANDING_LOCK[roleAtual];
    if (lockedLanding) {
      const currentPath = window.location.hash.replace(/^#/, '') || '/';
      if (!currentPath.startsWith(lockedLanding)) {
        return <Navigate to={lockedLanding} replace />;
      }
      // Está na rota correta — segue.
      return <Outlet />;
    }

    // 3. Verifica se a rota exige um cargo específico (RBAC) e se o usuário possui
    if (rolesPermitidas && rolesPermitidas.length > 0) {
      const permitidasNorm = rolesPermitidas.map(normalizarRole);
      const possuiRole = permitidasNorm.includes(roleAtual);
      const ehBreakGlass = ROLES_BREAK_GLASS.has(roleAtual);

      if (!possuiRole && !ehBreakGlass) {
        return <Navigate to="/dashboard" replace />;
      }
    }

    // 4. Tudo certo, renderiza a tela solicitada
    return <Outlet />;
  } catch {
    clearAuthSessionAndAxios();
    return <Navigate to="/" replace />;
  }
}