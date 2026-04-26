/**
 * menuBuilder — constrói o menu lateral a partir do catálogo oficial (API) +
 * featuresAtivas e modulosAtivos do usuário.
 *
 * NÃO usa MODULOS_HIERARQUICOS, listas hardcoded nem fallbacks manuais.
 * SUPER_ADMIN e SUPORTE_MASTER enxergam todos os itens do catálogo.
 */
import type { AccessCatalog } from './accessCatalog';
import {
  MENU_CONFIG,
  type MenuConfigEntry,
  type MenuItemConfig,
  isMenuFlatLinks,
  isMenuMacro,
  isMenuSection,
} from '../config/menuConfig';
import { normalizeFeature, normalizeFeatures } from '../config/normalizeFeature';

export interface BuildMenuParams {
  catalog: AccessCatalog;
  userFeatures: string[];
  userModules: string[];
  role: string;
}

function isSuperAdmin(role: string): boolean {
  const r = String(role || '').trim().toUpperCase();
  return r === 'SUPER_ADMIN' || r === 'SUPORTE_MASTER';
}

export function buildMenu({ catalog, userFeatures, userModules, role }: BuildMenuParams): MenuConfigEntry[] {
  const superAdmin = isSuperAdmin(role);
  const activeModulesUpper = new Set(userModules.map((m) => m.toUpperCase()));

  // Monta o conjunto de feature codes válidos por módulo (do catálogo)
  const catalogFeaturesByModule = new Map<string, Set<string>>();
  for (const mod of catalog.modules) {
    catalogFeaturesByModule.set(
      mod.module.toUpperCase(),
      new Set(mod.features.map((f) => f.code)),
    );
  }

  // Conjunto de features do catálogo acessíveis ao usuário (baseado nos módulos ativos)
  const validCatalogFeatures = new Set<string>();
  if (superAdmin) {
    // SUPER_ADMIN: enxerga todo o catálogo
    for (const mod of catalog.modules) {
      for (const f of mod.features) {
        validCatalogFeatures.add(f.code);
      }
    }
  } else {
    for (const modCode of activeModulesUpper) {
      const modFeatures = catalogFeaturesByModule.get(modCode);
      if (modFeatures) {
        for (const fc of modFeatures) {
          validCatalogFeatures.add(fc);
        }
      }
    }
  }

  // Features do usuário normalizadas para chaves canônicas
  const normalizedUserFeatures = new Set(normalizeFeatures(userFeatures));

  console.log('[MENU DEBUG] buildMenu — entrada', {
    role,
    superAdmin,
    modulosAtivos: [...activeModulesUpper],
    userFeaturesNormalizadas: [...normalizedUserFeatures],
    catalogFeaturesDisponíveis: validCatalogFeatures.size,
  });

  function itemVisible(item: MenuItemConfig): boolean {
    // Restrição de role explícita (ex: itens apenas para SUPER_ADMIN)
    if (item.anyRole?.length) {
      const r = String(role || '').trim().toUpperCase();
      if (!item.anyRole.map((x) => x.toUpperCase()).includes(r)) return false;
    }

    const key = normalizeFeature(item.feature);

    if (superAdmin) {
      // SUPER_ADMIN: visível se a feature existe no catálogo
      if (!validCatalogFeatures.has(key)) return false;
    } else {
      // Usuário de loja: feature deve estar nos módulos ativos E nas featuresAtivas do usuário
      if (!validCatalogFeatures.has(key)) return false;
      if (!normalizedUserFeatures.has(key)) return false;
    }

    // Features extras obrigatórias (todas devem estar presentes)
    if (item.extraRequiredFeatures?.length) {
      for (const ex of item.extraRequiredFeatures) {
        const exKey = normalizeFeature(ex);
        if (superAdmin) {
          if (!validCatalogFeatures.has(exKey)) return false;
        } else {
          if (!normalizedUserFeatures.has(exKey)) return false;
        }
      }
    }

    return true;
  }

  const out: MenuConfigEntry[] = [];
  let lastMacroIndex = -1;
  let hasContentSinceLastMacro = false;

  for (const entry of MENU_CONFIG) {
    if (isMenuMacro(entry)) {
      if (hasContentSinceLastMacro && lastMacroIndex >= 0) {
        out.push(entry);
      }
      lastMacroIndex = out.length;
      hasContentSinceLastMacro = false;
      continue;
    }

    if (isMenuFlatLinks(entry)) {
      const links = entry.flatLinks.filter((item) => itemVisible(item));
      if (links.length > 0) {
        out.push({ flatLinks: links });
        hasContentSinceLastMacro = true;
      }
      continue;
    }

    if (isMenuSection(entry)) {
      const items = entry.items.filter((item) => itemVisible(item));
      if (items.length > 0) {
        out.push({ ...entry, items });
        hasContentSinceLastMacro = true;
      }
    }
  }

  // Remove macros órfãos no final
  let trailingMacros = 0;
  for (let i = out.length - 1; i >= 0; i--) {
    if (isMenuMacro(out[i])) trailingMacros++;
    else break;
  }

  const cleaned = out.slice(0, out.length - trailingMacros);

  const modulosExibidos = cleaned
    .filter(isMenuSection)
    .map((e) => (e as { section: string }).section);

  const featuresExibidas = cleaned.flatMap((e) => {
    if (isMenuFlatLinks(e)) return e.flatLinks.map((i) => i.feature);
    if (isMenuSection(e)) return e.items.map((i) => i.feature);
    return [];
  });

  console.log('[MENU DEBUG] buildMenu — resultado', {
    totalItens: featuresExibidas.length,
    modulosExibidos,
    featuresExibidas,
  });

  return cleaned;
}
