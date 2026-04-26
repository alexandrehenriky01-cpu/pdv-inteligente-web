import type { TotemMockProduto } from '../totem/types';
import { IMAGEM_FALLBACK_FOOD } from '../../services/api/cardapioTotemApi';

/**
 * Imagem do item no cardápio / modal: prioriza sabores escolhidos (via catálogo completo),
 * depois o item base, depois fallback Aurya.
 */
export function getImagemItemFood(params: {
  produto: TotemMockProduto;
  /** Catálogo completo (mesmos objetos de `mapCardapioItemToTotemProduto`) para resolver foto de cada sabor. */
  catalogo?: TotemMockProduto[] | null;
  /** Ordem de prioridade (ex.: `saboresSelecionados` no modal). */
  saborIdsPrioridade?: string[] | null;
}): string {
  const cat = params.catalogo ?? [];
  for (const sid of params.saborIdsPrioridade ?? []) {
    const id = sid?.trim();
    if (!id) continue;
    const row = cat.find((p) => p.id === id);
    const u = row?.imagemUrl?.trim();
    if (u) return u;
  }
  const base = params.produto.imagemUrl?.trim();
  if (base) return base;
  return IMAGEM_FALLBACK_FOOD;
}
