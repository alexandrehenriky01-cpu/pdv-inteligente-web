import {
  extrairIdVendaPayload,
  vendaPayloadParaKdsPedido,
} from './kdsPedidoUtils';
import type { TipoAtendimentoKds } from './types';

export interface KdsChamadaBalcaoLinha {
  id: string;
  numero: string;
  nome: string;
  recebidoEm: number;
}

const NOME_MAX_CHARS = 22;

/** Nome em caixa alta para TV, com limite e reticências (legibilidade). */
export function formatarNomeExibicaoChamadaTv(nome: string): string {
  const u = nome.toLocaleUpperCase('pt-BR').trim();
  if (u.length <= NOME_MAX_CHARS) return u;
  return `${u.slice(0, NOME_MAX_CHARS - 1).trim()}…`;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object';
}

/**
 * Nome do cliente a partir do payload da venda (sem alterar API).
 */
export function extrairNomeClienteChamada(raw: Record<string, unknown>): string | undefined {
  const nc = raw.nomeCliente;
  if (typeof nc === 'string' && nc.trim() !== '') return nc.trim();

  const pessoa = raw.pessoa;
  if (isRecord(pessoa)) {
    const rs = pessoa.razaoSocial;
    const nf = pessoa.nomeFantasia;
    if (typeof rs === 'string' && rs.trim() !== '') return rs.trim();
    if (typeof nf === 'string' && nf.trim() !== '') return nf.trim();
  }

  const obs = raw.observacoes;
  if (typeof obs === 'string') {
    const m = obs.match(/^Cliente:\s*([^\n\r]+)/im);
    if (m?.[1]?.trim()) return m[1].trim();
  }

  return undefined;
}

/** Balcão / retirada: apenas `BALCAO` (inclui PDV/totem e delivery retirada). */
export function deveExibirNaChamadaBalcao(tipoAtendimento: TipoAtendimentoKds): boolean {
  return tipoAtendimento === 'BALCAO';
}

/**
 * Monta a lista exibível a partir do cache de payloads completos mesclados.
 */
export function montarLinhasChamadaBalcao(
  cache: Map<string, Record<string, unknown>>
): KdsChamadaBalcaoLinha[] {
  const out: KdsChamadaBalcaoLinha[] = [];

  for (const [, raw] of cache) {
    const pedido = vendaPayloadParaKdsPedido(raw);
    if (!pedido) continue;
    if (pedido.coluna !== 'PRONTO') continue;
    if (!deveExibirNaChamadaBalcao(pedido.tipoAtendimento)) continue;

    const nomeBase = extrairNomeClienteChamada(raw) ?? 'Cliente';
    const nome = formatarNomeExibicaoChamadaTv(nomeBase);

    out.push({
      id: pedido.id,
      numero: pedido.numeroPedidoExibicao,
      nome,
      recebidoEm: pedido.recebidoEm,
    });
  }

  /* Mais recente primeiro (TV / chamada). */
  out.sort((a, b) => b.recebidoEm - a.recebidoEm);
  return out;
}

export function mesclarPayloadVendaCache(
  cache: Map<string, Record<string, unknown>>,
  payload: unknown
): void {
  if (!payload || typeof payload !== 'object') return;
  const inc = payload as Record<string, unknown>;
  const id = extrairIdVendaPayload(payload);
  if (!id) return;

  const st = String(inc.statusPreparo ?? '').toUpperCase();
  if (st === 'ENTREGUE' || st === 'FINALIZADO' || st === 'CANCELADO') {
    cache.delete(id);
    return;
  }

  const prev = cache.get(id);
  const merged = prev ? { ...prev, ...inc } : { ...inc };
  cache.set(id, merged);
}

export function popularCacheAPartirDaListaApi(
  cache: Map<string, Record<string, unknown>>,
  rows: unknown[]
): void {
  cache.clear();
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue;
    const id = extrairIdVendaPayload(row);
    if (!id) continue;
    cache.set(id, { ...(row as Record<string, unknown>) });
  }
}
