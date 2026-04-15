import { type ReactNode } from 'react';
import { AUTH_USER_KEY } from '../services/authStorage';

type UsuarioModulos = {
  role?: string;
  permissoes?: string[];
  loja?: { modulosAtivos?: string[] };
};

function normalize(value: string): string {
  return String(value || '').trim().toUpperCase();
}

function hasModule(moduleId: string, usuario: UsuarioModulos | null): boolean {
  if (!usuario) return false;
  const role = normalize(usuario.role || '');
  if (role === 'SUPER_ADMIN' || role === 'SUPORTE_MASTER' || role === 'DIRETOR' || role === 'GERENTE' || role === 'ADMIN_LOJA') {
    return true;
  }

  const required = normalize(moduleId);
  const modulosLoja = (usuario.loja?.modulosAtivos ?? []).map(normalize);
  const permissoes = (usuario.permissoes ?? []).map(normalize);
  return [...modulosLoja, ...permissoes].includes(required);
}

export function RenderIfModule({
  module,
  children,
}: {
  module: string;
  children: ReactNode;
}) {
  try {
    const raw = localStorage.getItem(AUTH_USER_KEY);
    if (!raw) return null;
    const usuario = JSON.parse(raw) as UsuarioModulos;
    return hasModule(module, usuario) ? <>{children}</> : null;
  } catch {
    return null;
  }
}
