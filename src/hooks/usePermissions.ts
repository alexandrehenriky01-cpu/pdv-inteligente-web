import { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '../services/api';

interface PermissionCatalog {
  version: string;
  updatedAt: string;
  permissions: string[];
  permissionsByModule: Record<string, string[]>;
  modules: Array<{ id: string; nome: string }>;
  roles: Array<{ id: string; nome: string }>;
}

interface UserPermissions {
  role: string;
  roles: string[];
  permissions: string[];
  lojaId: string | null;
  tenantId: string | null;
  mustChangePassword?: boolean;
  modulosAtivos?: string[];
  featuresAtivas?: string[];
}

interface UsePermissionsReturn {
  permissions: string[];
  role: string;
  roles: string[];
  isLoading: boolean;
  error: string | null;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
  can: (permission: string) => boolean;
  canAny: (permissions: string[]) => boolean;
  canAll: (permissions: string[]) => boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  mustChangePassword: boolean;
  catalogVersion: string | null;
  refresh: () => Promise<void>;
}

let cachedCatalog: PermissionCatalog | null = null;
let cachedUserPermissions: UserPermissions | null = null;

export function usePermissions(): UsePermissionsReturn {
  const [userPermissions, setUserPermissions] = useState<UserPermissions | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPermissions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.get<UserPermissions>('/api/auth/me/permissions');
      setUserPermissions(response.data);
      cachedUserPermissions = response.data;
    } catch (err: any) {
      console.error('Erro ao buscar permissões:', err);
      setError(err.response?.data?.error || 'Falha ao carregar permissões');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  const hasPermission = useCallback(
    (permission: string): boolean => {
      if (!userPermissions?.permissions || userPermissions.permissions.length === 0) {
        return false;
      }
      const normalized = permission.toUpperCase();
      return userPermissions.permissions.some(p => p.toUpperCase() === normalized);
    },
    [userPermissions]
  );

  const hasAnyPermission = useCallback(
    (permissions: string[]): boolean => {
      if (!userPermissions?.permissions || permissions.length === 0) return false;
      return permissions.some(p => hasPermission(p));
    },
    [userPermissions, hasPermission]
  );

  const hasAllPermissions = useCallback(
    (permissions: string[]): boolean => {
      if (!userPermissions?.permissions || permissions.length === 0) return true;
      return permissions.every(p => hasPermission(p));
    },
    [userPermissions, hasPermission]
  );

  // Aliases for cleaner API
  const can = hasPermission;
  const canAny = hasAnyPermission;
  const canAll = hasAllPermissions;

  const isAdmin = useMemo(() => {
    if (!userPermissions?.role) return false;
    const role = userPermissions.role.toUpperCase();
    return role === 'ADMIN_LOJA' || role === 'GERENTE' || role === 'DIRETOR';
  }, [userPermissions?.role]);

  /**
   * isSuperAdmin: indica se o usuário é SUPER_ADMIN da plataforma (não limitado por loja).
   * MASTER de loja NÃO deve ter bypass de módulos/features.
   */
  const isSuperAdmin = useMemo(() => {
    if (!userPermissions?.role) return false;
    const role = userPermissions.role.toUpperCase();
    return role === 'SUPER_ADMIN' || role === 'SUPORTE_MASTER';
  }, [userPermissions?.role]);

  const mustChangePassword = userPermissions?.mustChangePassword ?? false;
  const catalogVersion = cachedCatalog?.version ?? null;

  return {
    permissions: userPermissions?.permissions ?? [],
    role: userPermissions?.role ?? '',
    roles: userPermissions?.roles ?? [],
    isLoading,
    error,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    can,
    canAny,
    canAll,
    isAdmin,
    isSuperAdmin,
    mustChangePassword,
    catalogVersion,
    refresh: fetchPermissions,
  };
}

export async function fetchPermissionCatalog(): Promise<PermissionCatalog> {
  if (cachedCatalog) {
    return cachedCatalog;
  }
  
  const response = await api.get<PermissionCatalog>('/api/auth/catalog');
  cachedCatalog = response.data;
  return cachedCatalog;
}

export async function fetchUserPermissions(): Promise<UserPermissions> {
  const response = await api.get<UserPermissions>('/api/auth/me/permissions');
  return response.data;
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  await api.post('/api/auth/change-password', {
    currentPassword,
    newPassword,
  });
}

export function hasPermissionSync(permissions: string[], permission: string): boolean {
  if (!permissions || permissions.length === 0) return false;
  const normalized = permission.toUpperCase();
  return permissions.some(p => p.toUpperCase() === normalized);
}

export function hasAnyPermissionSync(permissions: string[], required: string[]): boolean {
  if (!permissions || required.length === 0) return false;
  return required.some(p => hasPermissionSync(permissions, p));
}

export function hasAllPermissionsSync(permissions: string[], required: string[]): boolean {
  if (!permissions || required.length === 0) return true;
  return required.every(p => hasPermissionSync(permissions, p));
}
