/**
 * menuBuilder — constrói o menu lateral a partir do catálogo oficial (API) +
 * featuresAtivas do usuário.
 *
 * RC1.15 — fonte de verdade: ACCESS_CATALOG + featuresAtivas + permissions.
 * `modulosAtivos` foi removido do gate de visibilidade. Tabelas
 * `loja_modulos` / `loja_features` não existem mais; em modo LOCAL,
 * `modulosAtivos` chega vazio e `featuresAtivas` é a única fonte autoritativa.
 *
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
  /**
   * @deprecated RC1.15 — não é mais usado para gating do menu. Mantido na
   * assinatura por compatibilidade de chamadores; pode ser passado vazio.
   */
  userModules?: string[];
  role: string;
}

function isSuperAdmin(role: string): boolean {
  const r = String(role || '').trim().toUpperCase();
  return r === 'SUPER_ADMIN' || r === 'SUPORTE_MASTER';
}

export function buildMenu({ catalog, userFeatures, role }: BuildMenuParams): MenuConfigEntry[] {
  const superAdmin = isSuperAdmin(role);

  // Universo de features conhecidas pelo catálogo (sanity check para SUPER_ADMIN).
  const catalogAllFeatures = new Set<string>();
  for (const mod of catalog.modules) {
    for (const f of mod.features) {
      catalogAllFeatures.add(f.code);
    }
  }

  // Features do usuário normalizadas — fonte ÚNICA de verdade para
  // visibilidade em usuários de loja (RC1.15).
  const normalizedUserFeatures = new Set(normalizeFeatures(userFeatures));

  // RC1.15 — log padronizado pedido pelo time. Não remover sem alinhar.
  console.info('FRONTEND_FEATURES_LOADED', {
    role,
    superAdmin,
    featuresAtivas: [...normalizedUserFeatures],
    catalogFeaturesCount: catalogAllFeatures.size,
  });

  function itemVisible(item: MenuItemConfig): boolean {
    // Restrição de role explícita (ex: itens apenas para SUPER_ADMIN)
    if (item.anyRole?.length) {
      const r = String(role || '').trim().toUpperCase();
      if (!item.anyRole.map((x) => x.toUpperCase()).includes(r)) return false;
    }

    const key = normalizeFeature(item.feature);

    if (superAdmin) {
      // SUPER_ADMIN: visível se a feature existe no catálogo.
      if (!catalogAllFeatures.has(key)) return false;
    } else {
      // RC1.15 — usuário de loja: única regra é featuresAtivas.
      // modulosAtivos foi removido do gate. Catálogo NÃO é cross-checado
      // aqui porque featuresAtivas já é controlada pelo backend
      // (ACCESS_CATALOG + permissions + featureMasterMap).
      if (!normalizedUserFeatures.has(key)) return false;
    }

    // Features extras obrigatórias (todas devem estar presentes)
    if (item.extraRequiredFeatures?.length) {
      for (const ex of item.extraRequiredFeatures) {
        const exKey = normalizeFeature(ex);
        if (superAdmin) {
          if (!catalogAllFeatures.has(exKey)) return false;
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

  // RC1.15 — log padronizado pedido pelo time. Não remover sem alinhar.
  console.info('FRONTEND_MENU_BUILT', {
    totalItens: featuresExibidas.length,
    modulosExibidos,
    featuresExibidas,
  });

  return cleaned;
}
