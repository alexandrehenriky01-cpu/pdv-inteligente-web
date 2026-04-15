import type { ColunaKds, KdsItemLinha, KdsPedido, OrigemVendaKds } from './types';

function num(v: unknown): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = parseFloat(v.replace(',', '.'));
    return Number.isFinite(n) ? n : 0;
  }
  if (v && typeof v === 'object' && 'toString' in v) {
    const n = Number(String(v));
    return Number.isFinite(n) ? n : 0;
  }
  return Number(v) || 0;
}

export function statusPreparoParaColuna(status: string | null | undefined): ColunaKds {
  const s = String(status ?? 'NENHUM').toUpperCase();
  if (s === 'PREPARANDO') return 'PREPARANDO';
  if (s === 'PRONTO') return 'PRONTO';
  return 'TODO';
}

/** Lado do painel de senhas (TV): preparação vs pronto. `null` = não exibir (entregue). */
export function statusPreparoParaPainel(status: string | null | undefined): 'prep' | 'pronto' | null {
  const s = String(status ?? 'NENHUM').toUpperCase();
  if (s === 'ENTREGUE') return null;
  if (s === 'PRONTO') return 'pronto';
  return 'prep';
}

export function extrairIdVendaPayload(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;
  const id = (payload as Record<string, unknown>).id;
  return id != null ? String(id) : null;
}

export function extrairSenhaPedido(raw: Record<string, unknown>): string {
  const np = raw.numeroPedido;
  const nv = raw.numeroVenda;
  if (np != null && Number.isFinite(Number(np))) {
    return String(np).padStart(3, '0').slice(-3);
  }
  return String(num(nv) % 1000).padStart(3, '0');
}

function linhaAdicionais(item: Record<string, unknown>): string[] {
  const snap = item.adicionaisSnapshot;
  if (!Array.isArray(snap) || snap.length === 0) return [];

  const card = item.itemCardapio as Record<string, unknown> | undefined;
  const catalog = card?.adicionais;
  if (!Array.isArray(catalog)) {
    return snap.map((s: unknown) => {
      const row = s as Record<string, unknown>;
      const id = String(row.adicionalCardapioId ?? '').slice(0, 8);
      const q = num(row.quantidade);
      return q > 1 ? `+ Adicional ${id} ×${q}` : `+ Adicional ${id}`;
    });
  }

  return snap.map((s: unknown) => {
    const row = s as Record<string, unknown>;
    const adId = String(row.adicionalCardapioId ?? '');
    const ad = catalog.find((a: unknown) => String((a as Record<string, unknown>).id) === adId) as
      | Record<string, unknown>
      | undefined;
    const nome = ad?.nome != null ? String(ad.nome) : 'Adicional';
    const q = num(row.quantidade);
    return q > 1 ? `+ ${nome} ×${q}` : `+ ${nome}`;
  });
}

export function linhaItemKds(item: Record<string, unknown>): KdsItemLinha {
  const produto = item.produto as Record<string, unknown> | undefined;
  const card = item.itemCardapio as Record<string, unknown> | undefined;
  const nome =
    (produto?.nome != null ? String(produto.nome) : null) ??
    (card?.nome != null ? String(card.nome) : null) ??
    'Item';

  const obs = item.observacoes != null && String(item.observacoes).trim() !== ''
    ? String(item.observacoes).trim()
    : undefined;

  return {
    quantidade: num(item.quantidade) || 1,
    nome,
    observacoes: obs,
    adicionais: linhaAdicionais(item),
  };
}

/** Itens da venda (API Prisma) → linhas para cupom / gestão. */
export function vendaItensParaLinhasKds(itensRaw: unknown): KdsItemLinha[] {
  if (!Array.isArray(itensRaw)) return [];
  return itensRaw.map((x) => linhaItemKds(x as Record<string, unknown>));
}

/**
 * Normaliza o payload do evento `novo-pedido-cozinha` (formato venda Prisma + itens).
 * `ENTREGUE` retorna `null` (pedido sai do quadro KDS).
 */
export function vendaPayloadParaKdsPedido(
  payload: unknown,
  opts?: { recebidoEm?: number }
): KdsPedido | null {
  if (!payload || typeof payload !== 'object') return null;
  const raw = payload as Record<string, unknown>;
  const id = raw.id != null ? String(raw.id) : '';
  if (!id) return null;

  const status = String(raw.statusPreparo ?? 'RECEBIDO').toUpperCase();
  if (status === 'ENTREGUE') return null;

  const coluna = statusPreparoParaColuna(status);
  const origem = String(raw.origemVenda ?? 'PDV').toUpperCase() as OrigemVendaKds;

  const obsGeral =
    raw.observacoes != null && String(raw.observacoes).trim() !== ''
      ? String(raw.observacoes).trim()
      : undefined;

  const itensRaw = raw.itens;
  const itens: KdsItemLinha[] = Array.isArray(itensRaw)
    ? itensRaw.map((x) => linhaItemKds(x as Record<string, unknown>))
    : [];

  let recebidoEm = opts?.recebidoEm;
  if (recebidoEm === undefined) {
    const c = raw.createdAt;
    if (typeof c === 'string' || c instanceof Date) {
      const t = new Date(c).getTime();
      recebidoEm = Number.isFinite(t) ? t : Date.now();
    } else {
      recebidoEm = Date.now();
    }
  }

  return {
    id,
    senha: extrairSenhaPedido(raw),
    origem,
    observacoesGerais: obsGeral,
    coluna,
    itens,
    recebidoEm,
  };
}
