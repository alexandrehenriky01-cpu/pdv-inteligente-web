import { api } from '../api';
import { resolveCardapioImageUrl } from '../../utils/resolveCardapioImageUrl';
import type { TotemMockCategoria, TotemMockProduto, TotemSaborOpcao } from '../../modules/totem/types';

/** Fallback Aurya quando o item não tem foto (compartilhado com PDV / delivery / modal). */
export const IMAGEM_FALLBACK_FOOD =
  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600"%3E%3Crect fill="%231a1a2e" width="800" height="600"/%3E%3Ccircle cx="400" cy="300" r="120" fill="%232d2d44"/%3E%3C/svg%3E';

export interface CardapioAdicionalApi {
  id: string;
  nome: string;
  precoAdicional: number;
  produtoInsumoId: string;
  origem?: 'LEGADO' | 'CATALOGO';
  maxQuantidade?: number | null;
}

export interface CardapioTamanhoApi {
  id: string;
  nome: string;
  preco: number;
  ordem: number;
  ativo: boolean;
}

export interface CardapioItemApi {
  id: string;
  nome: string;
  descricao: string | null;
  precoVenda: number;
  imagemUrl: string | null;
  imageUrl?: string | null;
  imagem?: string | null;
  fotoUrl?: string | null;
  imageBase64?: string | null;
  produto?: {
    imagemUrl?: string | null;
    imageUrl?: string | null;
    fotoUrl?: string | null;
    codigo?: string | null;
    codigoBarras?: string | null;
  } | null;
  categoria: string;
  produtoId: string;
  tipoItem?: 'COMIDA' | 'BEBIDA' | 'PIZZA';
  permiteMultiplosSabores?: boolean;
  maxSabores?: number | null;
  saboresOpcoes?: CardapioSaborOpcaoApi[];
  tamanhos?: CardapioTamanhoApi[];
  adicionais: CardapioAdicionalApi[];
}

export interface CardapioSaborOpcaoApi {
  id: string;
  nome: string;
  precoVenda: number;
  tamanhos: CardapioTamanhoApi[];
}

export interface CardapioTotemResponse {
  itens: CardapioItemApi[];
}

type CardapioApiWrapped = {
  sucesso?: boolean;
  dados?: { itens?: CardapioItemApi[] };
  itens?: CardapioItemApi[];
};

function unwrapCardapioResponse(data: CardapioApiWrapped): CardapioTotemResponse {
  const itens = data?.dados?.itens ?? data?.itens ?? [];
  return { itens };
}

export function resolveItemImage(item: CardapioItemApi): string {
  const imageCandidates = [
    item.imagemUrl,
    item.imageUrl,
    item.imagem,
    item.fotoUrl,
    item.produto?.imagemUrl,
    item.produto?.imageUrl,
    item.produto?.fotoUrl,
  ];

  for (const raw of imageCandidates) {
    const value = raw?.trim();
    if (!value) continue;
    const resolved = resolveCardapioImageUrl(value);
    if (resolved) return resolved;
  }

  const base64 = item.imageBase64?.trim();
  if (base64) {
    return base64.startsWith('data:') ? base64 : `data:image/png;base64,${base64}`;
  }

  return IMAGEM_FALLBACK_FOOD;
}

export async function getCardapioTotem(): Promise<CardapioTotemResponse> {
  const { data } = await api.get<CardapioApiWrapped>('/api/cardapio');
  return unwrapCardapioResponse(data);
}

/** Cardápio público para o WebApp de Delivery (sem JWT — slug ou UUID da loja no path). */
export async function getCardapioTotemPublic(lojaSlugOuId: string): Promise<CardapioTotemResponse> {
  const id = lojaSlugOuId.trim();
  if (!id) throw new Error('Identificador da loja obrigatório.');
  const { data } = await api.get<CardapioTotemResponse>(
    `/api/public/delivery/cardapio/${encodeURIComponent(id)}`
  );
  return unwrapCardapioResponse(data);
}

export function slugTotemCategoria(label: string): string {
  const t = label.trim().toLowerCase();
  const s = t.replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  return s || 'outros';
}

function mapTipoItemApi(t?: string): TotemMockProduto['tipoItem'] {
  const u = String(t ?? 'COMIDA').toUpperCase();
  if (u === 'BEBIDA') return 'BEBIDA';
  if (u === 'PIZZA') return 'PIZZA';
  return 'COMIDA';
}

function mapSaboresOpcoesApi(rows: CardapioSaborOpcaoApi[] | undefined): TotemSaborOpcao[] | undefined {
  if (!rows?.length) return undefined;
  return rows.map((s) => ({
    id: s.id,
    nome: s.nome,
    precoVenda: s.precoVenda,
    tamanhos: (s.tamanhos ?? []).filter((t) => t.ativo !== false).map((t) => ({
      id: t.id,
      nome: t.nome,
      preco: t.preco,
      ordem: t.ordem,
      ativo: t.ativo !== false,
    })),
  }));
}

export function mapCardapioItemToTotemProduto(row: CardapioItemApi): TotemMockProduto {
  const tamanhosRaw = row.tamanhos ?? [];
  const tamanhosAtivos = tamanhosRaw.filter((t) => t.ativo !== false);
  return {
    id: row.id,
    produtoId: row.produtoId,
    itemCardapioId: row.id,
    categoriaId: slugTotemCategoria(row.categoria),
    nome: row.nome,
    descricaoCurta: row.descricao?.trim() || 'Item exclusivo do nosso cardápio.',
    descricao: row.descricao?.trim() || null,
    tipoItem: mapTipoItemApi(row.tipoItem),
    permiteMultiplosSabores: row.permiteMultiplosSabores === true,
    maxSabores: row.maxSabores ?? null,
    saboresOpcoes: mapSaboresOpcoesApi(row.saboresOpcoes),
    tamanhos: tamanhosAtivos.map((t) => ({
      id: t.id,
      nome: t.nome,
      preco: t.preco,
      ordem: t.ordem,
      ativo: t.ativo !== false,
    })),
    precoBase: row.precoVenda,
    imagemUrl: resolveItemImage(row),
    codigo: row.produto?.codigo?.trim() || undefined,
    codigoBarras: row.produto?.codigoBarras?.trim() || undefined,
    adicionais: row.adicionais.map((a) => ({
      id: a.id,
      nome: a.nome,
      preco: a.precoAdicional,
      origem: a.origem === 'CATALOGO' ? 'CATALOGO' : 'LEGADO',
      maxQuantidade: a.maxQuantidade ?? null,
    })),
  };
}

/** Abas do totem: ordem = primeira aparição no payload da API. */
export function buildTotemCategoriasFromCardapio(rows: CardapioItemApi[]): TotemMockCategoria[] {
  const visto = new Map<string, string>();
  for (const r of rows) {
    const id = slugTotemCategoria(r.categoria);
    const nome = r.categoria.trim() || 'Outros';
    if (!visto.has(id)) visto.set(id, nome);
  }
  return Array.from(visto.entries()).map(([id, nome]) => ({ id, nome }));
}
