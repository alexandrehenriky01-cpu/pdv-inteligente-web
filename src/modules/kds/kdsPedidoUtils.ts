import type {
  ColunaKds,
  KdsItemLinha,
  KdsPedido,
  OrigemVendaKds,
  TipoAtendimentoKds,
  TipoPedidoMenuKds,
} from './types';

/** Colunas em que o cancelamento pelo KDS é permitido (atraso é só indicador visual de tempo). */
export function colunaKdsPermiteCancelar(coluna: ColunaKds): boolean {
  return coluna === 'TODO' || coluna === 'PREPARANDO';
}

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

/** Número amigável para o card (campos já retornados pela API; fallback senha). */
export function extrairNumeroPedidoExibicao(raw: Record<string, unknown>): string {
  const np = raw.numeroPedido;
  if (np != null && String(np).trim() !== '') return String(np).trim();
  const nv = raw.numeroVenda;
  if (nv != null && String(nv).trim() !== '') return String(nv).trim();
  return extrairSenhaPedido(raw);
}

export function tipoAtendimentoKds(
  origem: OrigemVendaKds,
  tipoPedidoMenu: TipoPedidoMenuKds | null
): TipoAtendimentoKds {
  const o = String(origem).toUpperCase();
  if (o === 'MESA') return 'MESA';
  if (o === 'DELIVERY') {
    return tipoPedidoMenu === 'RETIRADA_BALCAO' ? 'BALCAO' : 'DELIVERY';
  }
  return 'BALCAO';
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

/** Prioridade KDS: cardápio/snapshot antes de estoque (produto). */
function nomeExibicaoItemKds(item: Record<string, unknown>, card?: Record<string, unknown>): string {
  const produto = isRecord(item.produto) ? item.produto : undefined;

  const pick = (...candidates: unknown[]): string | null => {
    for (const c of candidates) {
      if (typeof c === 'string' && c.trim() !== '') return c.trim();
    }
    return null;
  };

  return (
    pick(
      item.nomeSnapshot,
      item.nomeExibicaoSnapshot,
      item.nomeItemCardapio,
      item.itemCardapioNome,
      item.cardapioNome,
      card?.nome,
      item.nome,
      item.produtoNome,
      typeof produto?.nome === 'string' ? produto.nome : undefined
    ) ?? 'Item'
  );
}

export function linhaItemKds(item: Record<string, unknown>): KdsItemLinha {
  const card = isRecord(item.itemCardapio) ? item.itemCardapio : undefined;
  const nomeBase = nomeExibicaoItemKds(item, card);

  const tipoRaw = typeof card?.tipoItem === 'string' ? card.tipoItem.toUpperCase() : 'COMIDA';
  const isBebida = tipoRaw === 'BEBIDA';
  const saboresNomes = nomesSaboresDoSnapshot(item.saboresSnapshot);

  const obsRaw = item.observacoes;
  const obs =
    obsRaw != null && String(obsRaw).trim() !== '' ? String(obsRaw).trim() : undefined;

  const tamanhoRaw = item.tamanhoNome;
  const tamanho =
    typeof tamanhoRaw === 'string' && tamanhoRaw.trim() !== '' ? tamanhoRaw.trim() : undefined;

  const quantidade = num(item.quantidade) || 1;
  const adicionais = linhasAdicionaisDoSnapshot(item.adicionaisSnapshot);

  if (saboresNomes.length === 1) {
    const s = saboresNomes[0].trim().toUpperCase();
    const rotulo = tamanho ? `${s} (${tamanho})` : s;
    return {
      quantidade,
      nome: rotulo,
      observacoes: isBebida ? undefined : obs,
      adicionais,
      exibirSemObservacoes: isBebida,
    };
  }

  if (saboresNomes.length >= 2) {
    const tituloPizza = tamanho ? `Pizza ${tamanho}` : 'Pizza';
    return {
      quantidade,
      nome: tituloPizza,
      pizzaMultiSabores: true,
      saboresNomes,
      observacoes: isBebida ? undefined : obs,
      adicionais,
      exibirSemObservacoes: isBebida,
    };
  }

  return {
    quantidade,
    nome: nomeBase,
    ...(tamanho ? { tamanho } : {}),
    observacoes: isBebida ? undefined : obs,
    adicionais,
    exibirSemObservacoes: isBebida,
  };
}

/** Itens da venda (API Prisma) → linhas para cupom / gestão. */
export function vendaItensParaLinhasKds(itensRaw: unknown): KdsItemLinha[] {
  if (!Array.isArray(itensRaw)) return [];
  return itensRaw.map((x) => linhaItemKds(x as Record<string, unknown>));
}

function recebidoEmFromRaw(
  raw: Record<string, unknown>,
  fallback: number | undefined
): number {
  const c = raw.createdAt;
  if (typeof c === 'string' || c instanceof Date) {
    const t = new Date(c).getTime();
    if (Number.isFinite(t)) return t;
  }
  if (fallback !== undefined) return fallback;
  return Date.now();
}

export interface VendaPayloadKdsOpts {
  recebidoEm?: number;
  /** Quando `createdAt` ausente no payload, usar este valor em vez de `Date.now()`. */
  recebidoEmFallback?: number;
}

/**
 * Normaliza o payload do evento `novo-pedido-cozinha` (formato venda Prisma + itens).
 * `ENTREGUE` retorna `null` (pedido sai do quadro KDS).
 */
export function vendaPayloadParaKdsPedido(
  payload: unknown,
  opts?: VendaPayloadKdsOpts
): KdsPedido | null {
  if (!payload || typeof payload !== 'object') return null;
  const raw = payload as Record<string, unknown>;
  const id = raw.id != null ? String(raw.id) : '';
  if (!id) return null;

  const status = String(raw.statusPreparo ?? 'RECEBIDO').toUpperCase();
  if (status === 'ENTREGUE' || status === 'CANCELADO') return null;

  const coluna = statusPreparoParaColuna(status);
  const origem = String(raw.origemVenda ?? 'PDV').toUpperCase() as OrigemVendaKds;

  let tipoPedidoMenu: TipoPedidoMenuKds | null = null;
  if (origem === 'DELIVERY') {
    const tp = String(raw.tipoPedido ?? 'DELIVERY').toUpperCase();
    tipoPedidoMenu = tp === 'RETIRADA_BALCAO' ? 'RETIRADA_BALCAO' : 'DELIVERY';
  }

  const tipoAtendimento = tipoAtendimentoKds(origem, tipoPedidoMenu);
  const numeroPedidoExibicao = extrairNumeroPedidoExibicao(raw);

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
    recebidoEm = recebidoEmFromRaw(raw, opts?.recebidoEmFallback);
  }

  return {
    id,
    senha: extrairSenhaPedido(raw),
    numeroPedidoExibicao,
    tipoAtendimento,
    origem,
    tipoPedidoMenu,
    observacoesGerais: obsGeral,
    coluna,
    itens,
    recebidoEm,
  };
}

function stringOuPrev(v: string | undefined, prev: string | undefined): string {
  if (v != null && v.trim() !== '') return v;
  return prev ?? '';
}

function observacaoOuPrevInRaw(
  raw: Record<string, unknown>,
  fresh: KdsPedido,
  prev: KdsPedido
): string | undefined {
  if ('observacoes' in raw) return fresh.observacoesGerais;
  return prev.observacoesGerais;
}

function colunaParaStatusApi(col: ColunaKds): string {
  if (col === 'PREPARANDO') return 'PREPARANDO';
  if (col === 'PRONTO') return 'PRONTO';
  return 'RECEBIDO';
}

/**
 * Mescla update/socket parcial com pedido já exibido: preserva itens completos e timestamps.
 */
export function mergeKdsPedidoNaLista(prev: KdsPedido | undefined, payload: unknown): KdsPedido | null {
  if (!payload || typeof payload !== 'object') return prev ?? null;
  const raw = payload as Record<string, unknown>;

  const stMerge = raw.statusPreparo != null ? String(raw.statusPreparo).toUpperCase() : '';
  if (stMerge === 'ENTREGUE' || stMerge === 'CANCELADO') {
    return null;
  }

  const itensRaw = raw.itens;
  const itensNovos =
    Array.isArray(itensRaw) && itensRaw.length > 0
      ? itensRaw.map((x) => linhaItemKds(x as Record<string, unknown>))
      : null;

  const rawForParse: Record<string, unknown> = { ...raw };
  if (prev) {
    if (raw.statusPreparo == null || String(raw.statusPreparo).trim() === '') {
      rawForParse.statusPreparo = colunaParaStatusApi(prev.coluna);
    }
    if (raw.origemVenda == null || String(raw.origemVenda).trim() === '') {
      rawForParse.origemVenda = prev.origem;
    }
    const o = String(rawForParse.origemVenda ?? prev.origem).toUpperCase();
    if (o === 'DELIVERY' && (raw.tipoPedido == null || String(raw.tipoPedido).trim() === '')) {
      rawForParse.tipoPedido =
        prev.tipoPedidoMenu === 'RETIRADA_BALCAO' ? 'RETIRADA_BALCAO' : 'DELIVERY';
    }
  }

  const fresh = vendaPayloadParaKdsPedido(rawForParse, {
    recebidoEmFallback: prev?.recebidoEm,
  });
  if (!fresh) return null;
  if (!prev) return fresh;

  const createdMissing = !('createdAt' in raw) || raw.createdAt == null;

  const merged: KdsPedido = {
    ...fresh,
    itens: itensNovos ?? prev.itens,
    recebidoEm: createdMissing ? prev.recebidoEm : fresh.recebidoEm,
    senha: stringOuPrev(fresh.senha, prev.senha) || prev.senha,
    numeroPedidoExibicao:
      stringOuPrev(fresh.numeroPedidoExibicao, prev.numeroPedidoExibicao) ||
      prev.numeroPedidoExibicao,
    observacoesGerais: observacaoOuPrevInRaw(raw, fresh, prev),
    tipoPedidoMenu:
      'tipoPedido' in raw && raw.tipoPedido != null ? fresh.tipoPedidoMenu : prev.tipoPedidoMenu,
  };

  if (import.meta.env.DEV && itensNovos == null) {
    console.info('[KDS_MERGE] itens preservados do estado local', { id: merged.id });
  }

  return merged;
}
