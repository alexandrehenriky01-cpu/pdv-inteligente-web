/**
 * CAMADA CENTRAL DE AUTORIZAÇÃO FRONTEND
 * 
 * @important
 * ESTE É O ÚNICO ARQUIVO ONDE A AUTORIZAÇÃO DEVE SER IMPLEMENTADA.
 * TODAS AS VERIFICAÇÕES DE ACESSO DEVEM PASSAR POR AQUI.
 * 
 * PRINCÍPIOS:
 * 1. FRONTEND NÃO DECIDE ACESSO - BACKEND É AUTORIDADE FINAL
 * 2. Usuários de loja (incluindo MASTER) estão limitados aos módulos da loja
 * 3. SUPER_ADMIN de plataforma tem contexto separado de loja
 * 4. NÃO usar role como critério de liberação de módulo
 */

import { useMemo } from 'react';
import { FEATURE_MASTER_MAP } from '../config/featureMasterMap';
import { normalizeFeature, normalizeFeatures } from '../config/normalizeFeature';
import { resolvePermission } from '../config/resolvePermission';

export interface AuthUser {
  role: string;
  permissions: string[];
  featuresAtivas: string[];
  modulosAtivos: string[];
  loja?: {
    modulosAtivos?: string[];
    featuresAtivas?: string[];
  };
}

export interface AuthorizationContext {
  user: AuthUser | null;
  isLoading: boolean;
  permissions: string[];
  features: string[];
  modules: string[];
}

export function isSuperAdmin(role: string | undefined): boolean {
  if (!role) return false;
  const r = role.toUpperCase();
  return r === 'SUPER_ADMIN' || r === 'SUPORTE_MASTER';
}

export function isPlatformUser(role: string | undefined): boolean {
  return isSuperAdmin(role);
}

export function isLojaUser(role: string | undefined): boolean {
  if (!role) return false;
  const r = role.toUpperCase();
  return r === 'MASTER' || r === 'ADMIN_LOJA' || r === 'GERENTE' || r === 'DIRETOR' || r === 'VENDEDOR' || r === 'CAIXA';
}

function buildEffectivePermissionSet(user: AuthUser | null): Set<string> {
  if (!user) return new Set();
  
  const directPerms = (user.permissions || []).map(p => resolvePermission(String(p).trim().toUpperCase()));
  
  const fromFeatures: string[] = [];
  const allFeatures = normalizeFeatures([
    ...(user.featuresAtivas || []),
    ...(user.loja?.featuresAtivas || []),
  ]);
  
  for (const f of allFeatures) {
    const meta = FEATURE_MASTER_MAP[f];
    if (meta) {
      for (const p of meta.permissions) {
        fromFeatures.push(resolvePermission(p));
      }
    }
  }
  
  return new Set([...directPerms, ...fromFeatures]);
}

export function createAuthorizationContext(user: AuthUser | null): AuthorizationContext {
  const effectivePerms = buildEffectivePermissionSet(user);
  
  return {
    user,
    isLoading: user === null,
    permissions: Array.from(effectivePerms),
    features: normalizeFeatures([
      ...(user?.featuresAtivas || []),
      ...(user?.loja?.featuresAtivas || []),
    ]),
    modules: user?.modulosAtivos || user?.loja?.modulosAtivos || [],
  };
}

export function canAccessModule(
  context: AuthorizationContext,
  moduleCode: string
): boolean {
  if (!context.user) return false;
  
  if (isSuperAdmin(context.user.role)) {
    return true;
  }
  
  const normalizedModule = moduleCode.toUpperCase();
  const modules = [
    ...(context.user.modulosAtivos || []),
    ...(context.user.loja?.modulosAtivos || []),
  ];
  
  return modules.some(m => m.toUpperCase() === normalizedModule);
}

export function canAccessFeature(
  context: AuthorizationContext,
  featureCode: string
): boolean {
  if (!context.user) return false;
  
  if (isSuperAdmin(context.user.role)) {
    return true;
  }
  
  const normalizedFeature = normalizeFeature(featureCode);
  const meta = FEATURE_MASTER_MAP[normalizedFeature];
  
  if (!meta) return false;
  
  const effectivePerms = new Set(context.permissions);
  return meta.permissions.some(p => effectivePerms.has(resolvePermission(p.toUpperCase())));
}

export function canExecuteAction(
  context: AuthorizationContext,
  permissionCode: string
): boolean {
  if (!context.user) return false;
  
  if (isSuperAdmin(context.user.role)) {
    return true;
  }
  
  const normalized = resolvePermission(permissionCode.toUpperCase());
  return context.permissions.some(p => resolvePermission(p.toUpperCase()) === normalized);
}

export function canAccessAnyFeature(
  context: AuthorizationContext,
  featureCodes: string[]
): boolean {
  if (!context.user) return false;
  
  if (isSuperAdmin(context.user.role)) {
    return true;
  }
  
  return featureCodes.some(f => canAccessFeature(context, f));
}

export function canAccessAllFeatures(
  context: AuthorizationContext,
  featureCodes: string[]
): boolean {
  if (!context.user) return false;
  
  if (isSuperAdmin(context.user.role)) {
    return true;
  }
  
  return featureCodes.every(f => canAccessFeature(context, f));
}

export function canAccessAnyModule(
  context: AuthorizationContext,
  moduleCodes: string[]
): boolean {
  if (!context.user) return false;
  
  if (isSuperAdmin(context.user.role)) {
    return true;
  }
  
  return moduleCodes.some(m => canAccessModule(context, m));
}

export function canAccessAllModules(
  context: AuthorizationContext,
  moduleCodes: string[]
): boolean {
  if (!context.user) return false;
  
  if (isSuperAdmin(context.user.role)) {
    return true;
  }
  
  return moduleCodes.every(m => canAccessModule(context, m));
}

export function canExecuteAnyAction(
  context: AuthorizationContext,
  permissionCodes: string[]
): boolean {
  if (!context.user) return false;
  
  if (isSuperAdmin(context.user.role)) {
    return true;
  }
  
  return permissionCodes.some(p => canExecuteAction(context, p));
}

export function canExecuteAllActions(
  context: AuthorizationContext,
  permissionCodes: string[]
): boolean {
  if (!context.user) return false;
  
  if (isSuperAdmin(context.user.role)) {
    return true;
  }
  
  return permissionCodes.every(p => canExecuteAction(context, p));
}

export interface RouteGuard {
  canAccess: boolean;
  reason?: string;
  redirectTo?: string;
}

export function checkRouteAccess(
  context: AuthorizationContext,
  routeConfig: {
    requiredModules?: string[];
    requiredFeatures?: string[];
    requiredPermissions?: string[];
    platformOnly?: boolean;
    requireAll?: boolean;
  }
): RouteGuard {
  if (!context.user) {
    return {
      canAccess: false,
      reason: 'Usuário não autenticado',
      redirectTo: '/login',
    };
  }

  const { requiredModules = [], requiredFeatures = [], requiredPermissions = [], platformOnly = false, requireAll = false } = routeConfig;

  if (platformOnly && !isPlatformUser(context.user.role)) {
    return {
      canAccess: false,
      reason: 'Esta área é restrita à plataforma',
      redirectTo: '/acesso-negado',
    };
  }

  if (isSuperAdmin(context.user.role)) {
    return { canAccess: true };
  }

  if (requiredModules.length > 0) {
    const hasModuleAccess = requireAll
      ? canAccessAllModules(context, requiredModules)
      : canAccessAnyModule(context, requiredModules);
    
    if (!hasModuleAccess) {
      return {
        canAccess: false,
        reason: `Módulo requerido não disponível: ${requiredModules.join(', ')}`,
        redirectTo: '/acesso-negado',
      };
    }
  }

  if (requiredFeatures.length > 0) {
    const hasFeatureAccess = requireAll
      ? canAccessAllFeatures(context, requiredFeatures)
      : canAccessAnyFeature(context, requiredFeatures);
    
    if (!hasFeatureAccess) {
      return {
        canAccess: false,
        reason: `Feature requerida não disponível: ${requiredFeatures.join(', ')}`,
        redirectTo: '/acesso-negado',
      };
    }
  }

  if (requiredPermissions.length > 0) {
    const hasPermissionAccess = requireAll
      ? canExecuteAllActions(context, requiredPermissions)
      : canExecuteAnyAction(context, requiredPermissions);
    
    if (!hasPermissionAccess) {
      return {
        canAccess: false,
        reason: `Permissão requerida não disponível: ${requiredPermissions.join(', ')}`,
        redirectTo: '/acesso-negado',
      };
    }
  }

  return { canAccess: true };
}

export function getAvailableModules(context: AuthorizationContext): string[] {
  if (!context.user) return [];
  
  if (isSuperAdmin(context.user.role)) {
    return ['PLATFORM', 'ADMIN', 'TENANT', 'FISCAL', 'FINANCEIRO', 'ESTOQUE', 'COMPRAS', 'IA'];
  }
  
  const modules = new Set<string>();
  
  for (const mod of (context.modules || [])) {
    modules.add(mod.toUpperCase());
  }
  
  return Array.from(modules);
}

export function getAvailableFeatures(context: AuthorizationContext): string[] {
  if (!context.user) return [];
  
  if (isSuperAdmin(context.user.role)) {
    return Object.keys(FEATURE_MASTER_MAP);
  }
  
  return context.features;
}

export function getAvailablePermissions(context: AuthorizationContext): string[] {
  if (!context.user) return [];
  
  if (isSuperAdmin(context.user.role)) {
    return ['*'];
  }
  
  return context.permissions;
}

export function getUserAccessSummary(context: AuthorizationContext): {
  role: string;
  isPlatform: boolean;
  modulesCount: number;
  featuresCount: number;
  permissionsCount: number;
  availableModules: string[];
} {
  return {
    role: context.user?.role || 'unknown',
    isPlatform: isSuperAdmin(context.user?.role),
    modulesCount: context.modules.length,
    featuresCount: context.features.length,
    permissionsCount: context.permissions.length,
    availableModules: getAvailableModules(context),
  };
}