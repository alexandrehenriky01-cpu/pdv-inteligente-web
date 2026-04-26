/**
 * HOOK REACT DE AUTORIZAÇÃO
 * 
 * Hook principal para verificação de permissões no frontend.
 * Usa a camada central de autorização em useAuth.ts
 * 
 * @example
 * const { canAccessModule, canAccessFeature, canExecuteAction } = useAuthorization();
 * 
 * if (canAccessModule('FINANCEIRO')) {
 *   // mostrar módulo financeiro
 * }
 */

import { useMemo } from 'react';
import {
  createAuthorizationContext,
  canAccessModule as checkModule,
  canAccessFeature as checkFeature,
  canExecuteAction as checkAction,
  canAccessAnyFeature as checkAnyFeature,
  canAccessAllFeatures as checkAllFeatures,
  canAccessAnyModule as checkAnyModule,
  canAccessAllModules as checkAllModules,
  canExecuteAnyAction as checkAnyAction,
  canExecuteAllActions as checkAllActions,
  checkRouteAccess,
  getAvailableModules,
  getAvailableFeatures,
  getAvailablePermissions,
  getUserAccessSummary,
  isSuperAdmin,
  isPlatformUser,
  isLojaUser,
  type AuthorizationContext,
  type RouteGuard,
  type AuthUser,
} from './useAuth';

export interface UseAuthorizationReturn {
  permissions: string[];
  features: string[];
  modules: string[];
  isPlatform: boolean;
  isLoja: boolean;
  isSuperAdmin: boolean;
  canAccessModule: (moduleCode: string) => boolean;
  canAccessFeature: (featureCode: string) => boolean;
  canExecuteAction: (permissionCode: string) => boolean;
  canAccessAnyFeature: (featureCodes: string[]) => boolean;
  canAccessAllFeatures: (featureCodes: string[]) => boolean;
  canAccessAnyModule: (moduleCodes: string[]) => boolean;
  canAccessAllModules: (moduleCodes: string[]) => boolean;
  canExecuteAnyAction: (permissionCodes: string[]) => boolean;
  canExecuteAllActions: (permissionCodes: string[]) => boolean;
  checkRoute: (config: RouteCheckConfig) => RouteGuard;
  getAvailableModules: () => string[];
  getAvailableFeatures: () => string[];
  getAvailablePermissions: () => string[];
  getAccessSummary: () => ReturnType<typeof getUserAccessSummary>;
}

export interface RouteCheckConfig {
  requiredModules?: string[];
  requiredFeatures?: string[];
  requiredPermissions?: string[];
  platformOnly?: boolean;
  requireAll?: boolean;
}

export function useAuthorization(user: AuthUser | null): UseAuthorizationReturn {
  const context = useMemo(() => createAuthorizationContext(user), [user]);

  return {
    permissions: context.permissions,
    features: context.features,
    modules: context.modules,
    isPlatform: isPlatformUser(user?.role),
    isLoja: isLojaUser(user?.role),
    isSuperAdmin: isSuperAdmin(user?.role),

    canAccessModule: (moduleCode: string) => checkModule(context, moduleCode),
    canAccessFeature: (featureCode: string) => checkFeature(context, featureCode),
    canExecuteAction: (permissionCode: string) => checkAction(context, permissionCode),
    canAccessAnyFeature: (featureCodes: string[]) => checkAnyFeature(context, featureCodes),
    canAccessAllFeatures: (featureCodes: string[]) => checkAllFeatures(context, featureCodes),
    canAccessAnyModule: (moduleCodes: string[]) => checkAnyModule(context, moduleCodes),
    canAccessAllModules: (moduleCodes: string[]) => checkAllModules(context, moduleCodes),
    canExecuteAnyAction: (permissionCodes: string[]) => checkAnyAction(context, permissionCodes),
    canExecuteAllActions: (permissionCodes: string[]) => checkAllActions(context, permissionCodes),

    checkRoute: (config: RouteCheckConfig) => checkRouteAccess(context, config),
    getAvailableModules: () => getAvailableModules(context),
    getAvailableFeatures: () => getAvailableFeatures(context),
    getAvailablePermissions: () => getAvailablePermissions(context),
    getAccessSummary: () => getUserAccessSummary(context),
  };
}

export function usePlatformAuthorization(): UseAuthorizationReturn | null {
  return null;
}

export type { AuthorizationContext, RouteGuard, AuthUser };
export { isSuperAdmin, isPlatformUser, isLojaUser };