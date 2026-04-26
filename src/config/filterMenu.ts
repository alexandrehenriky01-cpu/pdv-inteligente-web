/**
 * CAMADA DE PROTEÇÃO DE MENU
 * 
 * @important
 * O menu é gerado apenas com base em:
 * - req.auth.features (features do usuário/loja)
 * - req.auth.modules (módulos ativos da loja)
 * - permissões do usuário
 * 
 * NÃO EXISTE FALLBACK para "mostrar tudo" baseado em role.
 * 
 * ÚNICA EXCEÇÃO:
 * - SUPER_ADMIN/SUPORTE_MASTER (plataforma) têm menu de plataforma
 */

import { FEATURE_MASTER_MAP } from './featureMasterMap';
import { normalizeFeature, normalizeFeatures } from './normalizeFeature';
import { resolvePermission } from './resolvePermission';
import {
  MENU_CONFIG,
  type MenuConfigEntry,
  type MenuItemConfig,
  type MenuSectionConfig,
  isMenuFlatLinks,
  isMenuMacro,
  isMenuSection,
} from './menuConfig';

export type MenuUser = {
  role?: string;
  permissoes?: string[];
  featuresAtivas?: string[];
  modulosAtivos?: string[];
  loja?: { modulosAtivos?: string[]; featuresAtivas?: string[] };
};

/**
 * isSuperAdminRole: indica se o usuário é SUPER_ADMIN ou SUPORTE_MASTER da plataforma.
 * MASTER de loja NÃO é considerado super admin - ele está limitado aos módulos da loja.
 */
export function isSuperAdminRole(role?: string): boolean {
  const r = String(role || '').trim().toUpperCase();
  return r === 'SUPER_ADMIN' || r === 'SUPORTE_MASTER';
}

/**
 * isPlatformMenu: retorna true se o usuário deve ver menu de plataforma.
 * Usuários de loja (incluindo MASTER) usam menu de loja normal.
 */
export function isPlatformMenu(user: MenuUser): boolean {
  return isSuperAdminRole(user.role);
}

/**
 * Verifica se um módulo está disponível para o usuário.
 * PARA TODOS OS USUÁRIOS DE LOJA: usa apenas modulosAtivos da loja.
 */
function userHasModule(user: MenuUser, moduleCode: string): boolean {
  const normalizedModule = moduleCode.toUpperCase();
  const userModules = [
    ...(user.modulosAtivos || []),
    ...(user.loja?.modulosAtivos || []),
  ];
  return userModules.some(m => m.toUpperCase() === normalizedModule);
}

function collectNormalizedFeatures(user: MenuUser): string[] {
  const u = normalizeFeatures(user.featuresAtivas || []);
  const l = normalizeFeatures(user.loja?.featuresAtivas || []);
  return [...new Set([...u, ...l])];
}

/**
 * Feature licenciada para a loja/sessão (lista vinda do JWT após `resolveFeaturesForLoja`).
 * Não confundir com `userCanAccessFeature` (que valida permissão RBAC mapeada à feature).
 */
function userLojaTemFeatureLicenciada(user: MenuUser, feature: string): boolean {
  if (isSuperAdminRole(user.role)) return true;
  const key = normalizeFeature(feature);
  if (!key) return false;
  const merged = collectNormalizedFeatures(user);
  if (merged.includes('*')) return true;
  return merged.includes(key);
}

/** Permissões efetivas = diretas do usuário + derivadas das features (espelho do build do JWT). */
export function buildEffectivePermissionSet(user: MenuUser): Set<string> {
  const base = (user.permissoes || []).map((p) => resolvePermission(String(p).trim().toUpperCase()));
  const fromFeatures: string[] = [];
  for (const f of collectNormalizedFeatures(user)) {
    const meta = FEATURE_MASTER_MAP[f];
    if (meta) {
      for (const p of meta.permissions) {
        fromFeatures.push(resolvePermission(p));
      }
    }
  }
  return new Set([...base, ...fromFeatures]);
}

/**
 * Verifica se o usuário pode acessar uma feature.
 * 
 * REGRAS:
 * - SUPER_ADMIN/SUPORTE_MASTER (plataforma) → SEMPRE true (menu de plataforma)
 * - USUÁRIOS DE LOJA (incluindo MASTER) → Verifica se feature está disponível
 * 
 * @important
 * MASTER de loja NÃO tem bypass - está limitado aos módulos/features da loja.
 */
export function userCanAccessFeature(user: MenuUser, feature: string): boolean {
  // SUPER_ADMIN/SUPORTE_MASTER da plataforma: bypass completo
  if (isSuperAdminRole(user.role)) return true;
  
  const key = normalizeFeature(feature);
  const meta = FEATURE_MASTER_MAP[key];
  if (!meta) return false;
  
  const eff = buildEffectivePermissionSet(user);
  return meta.permissions.some((p) => eff.has(resolvePermission(String(p).toUpperCase())));
}

/**
 * Verifica se o item do menu deve ser visível.
 * 
 * @important
 * NÃO EXISTE FALLBACK POR ROLE.
 * Se o usuário não tem permissão, o item não aparece.
 */
function itemVisible(user: MenuUser, item: MenuItemConfig): boolean {
  // Verificar anyRole (para itens específicos de plataforma)
  if (item.anyRole?.length) {
    const r = String(user.role || '').trim().toUpperCase();
    if (!item.anyRole.map((x) => x.toUpperCase()).includes(r)) return false;
  }

  if (item.requireLojaFeature && !userLojaTemFeatureLicenciada(user, item.feature)) return false;

  if (!userCanAccessFeature(user, item.feature)) return false;
  
  // Verificar features extras requeridas
  if (item.extraRequiredFeatures?.length) {
    for (const ex of item.extraRequiredFeatures) {
      if (!userCanAccessFeature(user, ex)) return false;
    }
  }
  
  return true;
}

function filterItems(user: MenuUser, items: MenuItemConfig[]): MenuItemConfig[] {
  return items.filter((it) => itemVisible(user, it));
}

export type FilteredMenuSection = MenuSectionConfig;

/**
 * Filtra o menu baseado nas permissões do usuário.
 * 
 * @important
 * ESTE É O ÚNICO MÉTODO DE FILTRAGEM DO MENU.
 * NÃO EXISTE FALLBACK para "mostrar tudo" baseado em role.
 * 
 * REGRAS:
 * 1. Macros só aparecem se houver conteúdo depois deles.
 * 2. Seções sem itens são removidas.
 * 3. Cada item é verificado contra featuresAtivas do usuário.
 * 
 * @param menu - Configuração do menu
 * @param user - Usuário logado (com role, permissoes, features, modulos)
 * @returns Menu filtrado baseado apenas nas permissões do usuário
 */
export function filterMenuByPermissions(menu: MenuConfigEntry[], user: MenuUser): MenuConfigEntry[] {
  const out: MenuConfigEntry[] = [];
  let lastMacroIndex = -1;
  let hasContentSinceLastMacro = false;
  
  for (const entry of menu) {
    if (isMenuMacro(entry)) {
      if (hasContentSinceLastMacro && lastMacroIndex >= 0) {
        out.push(entry);
      }
      lastMacroIndex = out.length;
      hasContentSinceLastMacro = false;
      continue;
    }
    
    if (isMenuFlatLinks(entry)) {
      const links = filterItems(user, entry.flatLinks);
      if (links.length > 0) {
        out.push({ flatLinks: links });
        hasContentSinceLastMacro = true;
      }
      continue;
    }
    
    if (isMenuSection(entry)) {
      const items = filterItems(user, entry.items);
      if (items.length > 0) {
        out.push({ ...entry, items });
        hasContentSinceLastMacro = true;
      }
    }
  }
  
  // Remove macros órfãos no final que não têm conteúdo
  const cleaned: MenuConfigEntry[] = [];
  let trailingMacros = 0;
  
  for (let i = out.length - 1; i >= 0; i--) {
    if (isMenuMacro(out[i])) {
      trailingMacros++;
    } else {
      break;
    }
  }
  
  for (let i = 0; i < out.length - trailingMacros; i++) {
    cleaned.push(out[i]);
  }
  
  return cleaned;
}
