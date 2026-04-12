// src/components/PrivateRoute.tsx
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { IUsuario } from '../types/auth';
import { AUTH_TOKEN_KEY, AUTH_USER_KEY } from '../services/authStorage';
import { clearAuthSessionAndAxios } from '../services/authSession';

interface PrivateRouteProps {
  rolesPermitidas?: Array<IUsuario['role']>;
}

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
    if (rolesPermitidas && !rolesPermitidas.includes(usuario.role)) {
      // Sem permissão: manda para o dashboard padrão
      return <Navigate to="/dashboard" replace />;
    }

    // 3. Tudo certo, renderiza a tela solicitada
    return <Outlet />;
  } catch {
    clearAuthSessionAndAxios();
    return <Navigate to="/" replace />;
  }
}