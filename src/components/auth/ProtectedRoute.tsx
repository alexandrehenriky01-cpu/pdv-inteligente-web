/**
 * COMPONENTE DE PROTEÇÃO DE ROTAS
 * 
 * Componente que protege rotas baseado em permissões.
 * Bloqueia acesso e redireciona para página de acesso negado.
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AxiosError } from 'axios';
import { useAuthorization, type RouteCheckConfig } from '../../hooks/useAuthorization';
import type { AuthUser } from '../../hooks/useAuth';

interface ApiErrorLike extends Error {
  status?: number;
}

export interface ProtectedRouteProps {
  children: React.ReactNode;
  user: AuthUser | null;
  config: RouteCheckConfig;
  fallback?: React.ReactNode;
  showAccessDenied?: boolean;
}

export function ProtectedRoute({
  children,
  user,
  config,
  fallback,
  showAccessDenied = true,
}: ProtectedRouteProps): JSX.Element {
  const navigate = useNavigate();
  const { checkRoute } = useAuthorization(user);
  const isLoading = false;

  React.useEffect(() => {
    if (isLoading) return;

    const result = checkRoute(config);

    if (!result.canAccess) {
      if (result.redirectTo) {
        navigate(result.redirectTo, { replace: true });
      }
    }
  }, [user, config, checkRoute, navigate, isLoading]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const result = checkRoute(config);

  if (!result.canAccess) {
    if (fallback) {
      return <>{fallback}</>;
    }

    if (showAccessDenied) {
      return <AccessDeniedPage reason={result.reason} />;
    }

    return <></>;
  }

  return <>{children}</>;
}

export interface AccessDeniedPageProps {
  reason?: string;
  showHomeButton?: boolean;
}

export function AccessDeniedPage({
  reason,
  showHomeButton = true,
}: AccessDeniedPageProps): JSX.Element {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <div className="max-w-md w-full p-8 bg-white rounded-lg shadow-lg">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
            <svg
              className="h-8 w-8 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Acesso Negado
          </h2>

          <p className="text-gray-600 mb-6">
            {reason || 'Você não tem permissão para acessar este recurso.'}
          </p>

          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              O que fazer?
            </h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Verifique se você está logado com a conta correta</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Entre em contato com o administrador se precisar de acesso</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Confirme se o módulo está ativo para sua loja</span>
              </li>
            </ul>
          </div>

          <div className="flex flex-col space-y-3">
            {showHomeButton && (
              <button
                onClick={() => navigate('/')}
                className="w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
              >
                Voltar para Home
              </button>
            )}
            <button
              onClick={() => navigate(-1)}
              className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Voltar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export interface PermissionGateProps {
  children: React.ReactNode;
  user: AuthUser | null;
  requiredPermission?: string;
  requiredFeature?: string;
  requiredModule?: string;
  fallback?: React.ReactNode;
  showDisabled?: boolean;
}

export function PermissionGate({
  children,
  user,
  requiredPermission,
  requiredFeature,
  requiredModule,
  fallback = null,
  showDisabled = false,
}: PermissionGateProps): JSX.Element | null {
  const { canExecuteAction, canAccessFeature, canAccessModule } = useAuthorization(user);

  if (requiredModule && !canAccessModule(requiredModule)) {
    return showDisabled ? (
      <div className="opacity-50 pointer-events-none">{children}</div>
    ) : (
      <>{fallback}</>
    );
  }

  if (requiredFeature && !canAccessFeature(requiredFeature)) {
    return showDisabled ? (
      <div className="opacity-50 pointer-events-none">{children}</div>
    ) : (
      <>{fallback}</>
    );
  }

  if (requiredPermission && !canExecuteAction(requiredPermission)) {
    return showDisabled ? (
      <div className="opacity-50 pointer-events-none">{children}</div>
    ) : (
      <>{fallback}</>
    );
  }

  return <>{children}</>;
}

export interface ApiErrorHandlerProps {
  error: Error | AxiosError | ApiErrorLike | null;
  children: React.ReactNode;
  on403?: () => void;
  on401?: () => void;
  onNetworkError?: () => void;
}

export function ApiErrorHandler({
  error,
  children,
  on403,
  on401,
  onNetworkError,
}: ApiErrorHandlerProps): JSX.Element | null {
  React.useEffect(() => {
    if (!error) return;

    if (error instanceof AxiosError) {
      switch (error.response?.status ?? 0) {
        case 403:
          on403?.();
          break;
        case 401:
          on401?.();
          break;
        case 0:
          onNetworkError?.();
          break;
      }
    }
  }, [error, on403, on401, onNetworkError]);

  if (!error) {
    return <>{children}</>;
  }

  if (error instanceof AxiosError) {
    switch (error.response?.status ?? 0) {
      case 403:
        return <AccessDeniedPage reason={String(error.response?.data ?? error.message)} />;
      case 401:
        return (
          <AccessDeniedPage
            reason="Sessão expirada. Por favor, faça login novamente."
            showHomeButton={false}
          />
        );
      case 0:
        return (
          <div className="flex flex-col items-center justify-center min-h-screen">
            <p className="text-gray-600">Erro de conexão. Verifique sua internet.</p>
          </div>
        );
    }
  }

  return <>{children}</>;
}