import type { ColunaKds, KdsItemLinha, KdsPedido, OrigemVendaKds, TipoPedidoMenuKds } from './types';

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

interface SnapshotRow {
  nomeSnapshot?: unknown;
  quantidade?: unknown;
}

interface SaborSnapRow {
  nome?: unknown;
}

function nomesSaboresDoSnapshot(snap: unknown): string[] {
  if (!Array.isArray(snap) || snap.length === 0) return [];
  const out: string[] = [];
  for (const el of snap) {
    if (!el || typeof el !== 'object') continue;
    const nome = String((el as SaborSnapRow).nome ?? '').trim();
    if (nome) out.push(nome);
  }
  return out;
}

function linhasAdicionaisDoSnapshot(snap: unknown): string[] {
  if (!Array.isArray(snap) || snap.length === 0) return [];

  return snap.map((s: unknown) => {
    const row = s as SnapshotRow;
    const nome =
      typeof row.nomeSnapshot === 'string' && row.nomeSnapshot.trim() !== ''
        ? row.nomeSnapshot.trim()
        : 'Adicional';
    const q = num(row.quantidade);
    return q > 1 ? `+ ${nome} ×${q}` : `+ ${nome}`;
  });
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object';
}

export function linhaItemKds(item: Record<string, unknown>): KdsItemLinha {
  const produto = isRecord(item.produto) ? item.produto : undefined;
  const card = isRecord(item.itemCardapio) ? item.itemCardapio : undefined;
  const nomeSnap =
    typeof item.nomeExibicaoSnapshot === 'string' ? item.nomeExibicaoSnapshot.trim() : '';
  const nome =
    (nomeSnap ? nomeSnap : null) ??
    (typeof produto?.nome === 'string' && produto.nome.trim() !== '' ? produto.nome.trim() : null) ??
    (typeof card?.nome === 'string' && card.nome.trim() !== '' ? card.nome.trim() : null) ??
    'Item';

  const tipoRaw = typeof card?.tipoItem === 'string' ? card.tipoItem.toUpperCase() : 'COMIDA';
  const isBebida = tipoRaw === 'BEBIDA';
  const saboresNomes = nomesSaboresDoSnapshot(item.saboresSnapshot);

  const obsRaw = item.observacoes;
  const obs =
    obsRaw != null && String(obsRaw).trim() !== '' ? String(obsRaw).trim() : undefined;

  const tamanhoRaw = item.tamanhoNome;
  const tamanho =
    typeof tamanhoRaw === 'string' && tamanhoRaw.trim() !== '' ? tamanhoRaw.trim() : undefined;

  return {
    quantidade: num(item.quantidade) || 1,
    nome,
    tamanho,
    ...(saboresNomes.length > 0 ? { saboresNomes } : {}),
    observacoes: isBebida ? undefined : obs,
    adicionais: linhasAdicionaisDoSnapshot(item.adicionaisSnapshot),
    exibirSemObservacoes: isBebida,
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

  let tipoPedidoMenu: TipoPedidoMenuKds | null = null;
  if (origem === 'DELIVERY') {
    const tp = String(raw.tipoPedido ?? 'DELIVERY').toUpperCase();
    tipoPedidoMenu = tp === 'RETIRADA_BALCAO' ? 'RETIRADA_BALCAO' : 'DELIVERY';
  }

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
    tipoPedidoMenu,
    observacoesGerais: obsGeral,
    coluna,
    itens,
    recebidoEm,
  };
}
