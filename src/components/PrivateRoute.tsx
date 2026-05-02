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

export function PrivateRoute({ rolesPermitidas }: PrivateRouteProps) {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  const usuarioRaw = localStorage.getItem(AUTH_USER_KEY);

  // 1. Verifica se está logado (se não tem token ou dados do usuário)
  if (!token || !usuarioRaw) {
    return <Navigate to="/" replace />;
  }

  try {
    const usuario = JSON.parse(usuarioRaw) as IUsuario;

    // 2. Verifica se a rota exige um cargo específico (RBAC) e se o usuário possui
    if (rolesPermitidas && rolesPermitidas.length > 0) {
      const roleAtual = normalizarRole(usuario.role);
      const permitidasNorm = rolesPermitidas.map(normalizarRole);
      const possuiRole = permitidasNorm.includes(roleAtual);
      const ehBreakGlass = ROLES_BREAK_GLASS.has(roleAtual);

      if (!possuiRole && !ehBreakGlass) {
        // Sem permissão: manda para o dashboard padrão
        return <Navigate to="/dashboard" replace />;
      }
    }

    // 3. Tudo certo, renderiza a tela solicitada
    return <Outlet />;
  } catch {
    clearAuthSessionAndAxios();
    return <Navigate to="/" replace />;
  }
}