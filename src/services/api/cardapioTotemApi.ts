import { api } from '../api';
import type { TotemMockCategoria, TotemMockProduto } from '../../modules/totem/types';

const IMAGEM_FALLBACK =
  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600"%3E%3Crect fill="%231a1a2e" width="800" height="600"/%3E%3Ccircle cx="400" cy="300" r="120" fill="%232d2d44"/%3E%3C/svg%3E';

export interface CardapioAdicionalApi {
  id: string;
  nome: string;
  precoAdicional: number;
  produtoInsumoId: string;
}

export interface CardapioItemApi {
  id: string;
  nome: string;
  descricao: string | null;
  precoVenda: number;
  imagemUrl: string | null;
  categoria: string;
  produtoId: string;
  adicionais: CardapioAdicionalApi[];
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

export function mapCardapioItemToTotemProduto(row: CardapioItemApi): TotemMockProduto {
  return {
    id: row.id,
    produtoId: row.produtoId,
    itemCardapioId: row.id,
    categoriaId: slugTotemCategoria(row.categoria),
    nome: row.nome,
    descricaoCurta: row.descricao?.trim() || 'Item exclusivo do nosso cardápio.',
    descricao: row.descricao?.trim() || null,
    precoBase: row.precoVenda,
    imagemUrl: row.imagemUrl?.trim() || IMAGEM_FALLBACK,
    adicionais: row.adicionais.map((a) => ({
      id: a.id,
      nome: a.nome,
      preco: a.precoAdicional,
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
