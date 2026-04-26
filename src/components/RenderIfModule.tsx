import { type ReactNode } from 'react';
import { AUTH_USER_KEY } from '../services/authStorage';
import { FEATURE_MASTER_MAP } from '../config/featureMasterMap';
import { normalizeFeature } from '../config/normalizeFeature';
import { isSuperAdminRole, userCanAccessFeature, type MenuUser } from '../config/filterMenu';

function readUsuario(): MenuUser | null {
  try {
    const raw = localStorage.getItem(AUTH_USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as MenuUser;
  } catch {
    return null;
  }
}

function modulosAtivos(user: MenuUser): string[] {
  return ((user.loja?.modulosAtivos as string[]) || []).map((m) => String(m).trim().toUpperCase());
}

/**
 * Controle declarativo por módulo (`FOOD_SERVICE`) ou submódulo (`FOOD_SERVICE.KDS` → feature normalizada).
 */
export function RenderIfModule({ module, children }: { module: string; children: ReactNode }) {
  const usuario = readUsuario();
  if (!usuario) return null;
  if (isSuperAdminRole(usuario.role)) return <>{children}</>;

  const mod = String(module || '').trim().toUpperCase();
  if (!mod) return null;

  if (mod.includes('.')) {
    const featureKey = normalizeFeature(mod);
    return userCanAccessFeature(usuario, featureKey) ? <>{children}</> : null;
  }

  const mods = modulosAtivos(usuario);
  if (mods.includes(mod)) return <>{children}</>;

  const hasAnyFeature = Object.keys(FEATURE_MASTER_MAP).some(
    (k) => k.startsWith(`${mod}.`) && userCanAccessFeature(usuario, k)
  );
  return hasAnyFeature ? <>{children}</> : null;
}
