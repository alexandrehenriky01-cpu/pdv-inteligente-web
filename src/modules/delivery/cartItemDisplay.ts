import type { CartItem } from '../totem/types';

function nomeTamanho(item: CartItem): string | null {
  const tid = item.itemCardapioTamanhoId?.trim();
  if (!tid) return null;
  const tam = item.produto.tamanhos.find((t) => t.id === tid);
  const nome = tam?.nome?.trim();
  return nome || null;
}

function nomesSabores(item: CartItem): string[] {
  const ids = item.saboresItemCardapioIds ?? [];
  if (item.produto.tipoItem !== 'PIZZA' || ids.length === 0) return [];

  const opcoes = item.produto.saboresOpcoes ?? [];
  const nomes: string[] = [];

  for (const id of ids) {
    const hit = opcoes.find((o) => o.id === id)?.nome?.trim();
    if (hit) nomes.push(hit);
  }

  // Fallback importante: no fluxo sequencial, se algum id não casar com `saboresOpcoes`,
  // usamos o nome do item-base para não "perder" o primeiro sabor na exibição.
  if (nomes.length < ids.length) {
    const base = item.produto.nome.trim();
    if (base && !nomes.some((n) => n.toLowerCase() === base.toLowerCase())) {
      nomes.unshift(base);
    }
  }

  // Dedup preservando ordem
  const out: string[] = [];
  const seen = new Set<string>();
  for (const nome of nomes) {
    const key = nome.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(nome);
  }
  return out;
}

export function rotuloLinhaCarrinho(item: CartItem): { titulo: string; subtitulo?: string } {
  if (item.produto.tipoItem !== 'PIZZA') {
    return { titulo: item.produto.nome };
  }

  const tamanho = nomeTamanho(item);
  const sabores = nomesSabores(item);
  if (sabores.length <= 1) {
    const base = sabores[0] ?? item.produto.nome;
    return { titulo: tamanho ? `${base} (${tamanho})` : base };
  }

  return {
    titulo: tamanho ? `Pizza ${tamanho}` : 'Pizza (multisabor)',
    subtitulo: `Sabores: ${sabores.join(' / ')}`,
  };
}

