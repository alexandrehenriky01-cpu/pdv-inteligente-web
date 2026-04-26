/**
 * Serviço de acesso ao catálogo oficial de módulos, features e permissões.
 * Consome GET /api/admin/access-catalog do backend.
 */
import { api } from './api';

export interface CatalogPermission {
  code: string;
  label: string;
  description: string;
}

export interface CatalogFeature {
  /** Chave canônica (ex: "PDV.VENDA_VIEW") */
  code: string;
  label: string;
  description: string;
  requiredPermissions: string[];
}

export interface CatalogModule {
  module: string;
  label: string;
  description: string;
  permissions: CatalogPermission[];
  features: CatalogFeature[];
  defaultEnabledByPlan: string[];
}

export interface AccessCatalog {
  version: string;
  modules: CatalogModule[];
}

let _catalogCache: AccessCatalog | null = null;

export async function fetchAccessCatalog(): Promise<AccessCatalog> {
  if (_catalogCache) return _catalogCache;
  const res = await api.get<AccessCatalog>('/api/admin/access-catalog');
  _catalogCache = res.data;
  return res.data;
}

/** Converte um CatalogModule em formato ModuloHierarquico para o AdminClientesPage. */
export function catalogModuleToHierarquico(mod: CatalogModule): {
  id: string;
  nome: string;
  subModulos?: { id: string; nome: string }[];
} {
  return {
    id: mod.module,
    nome: mod.label,
    subModulos: mod.features.length > 0
      ? mod.features.map((f) => ({ id: f.code, nome: f.label }))
      : undefined,
  };
}
