import type { MesaApi } from './types';

/**
 * RC2.5x — PR-6 perf audit: helpers do delta de `mesa-conta-atualizada`.
 *
 * Extrai a parte testável: parsing do payload + decisão de aplicar
 * delta vs forçar refetch. O React state stays no useMesas.
 */

export interface MesaDeltaPayload {
  numero: number;
  status?: string;
  itens?: MesaApi['itens'];
  pendenciaFechamento?: MesaApi['pendenciaFechamento'];
}

/**
 * Lê o payload do socket e devolve um delta validado (numero finite +
 * tipo correto). Retorna null quando o payload não tem o shape rico
 * (caller deve fazer refetch).
 */
export function extractMesaDelta(payload: unknown): MesaDeltaPayload | null {
  if (!payload || typeof payload !== 'object') return null;
  const rec = payload as Record<string, unknown>;
  const mesa = rec.mesa;
  if (!mesa || typeof mesa !== 'object') return null;
  const mesaRec = mesa as Record<string, unknown>;
  const numero = Number(mesaRec.numero);
  if (!Number.isFinite(numero)) return null;
  return {
    numero,
    status: typeof mesaRec.status === 'string' ? mesaRec.status : undefined,
    itens: Array.isArray(mesaRec.itens) ? (mesaRec.itens as MesaApi['itens']) : undefined,
    pendenciaFechamento:
      mesaRec.pendenciaFechamento !== undefined
        ? (mesaRec.pendenciaFechamento as MesaApi['pendenciaFechamento'])
        : undefined,
  };
}

/**
 * Aplica o delta sobre a lista atual de mesas.
 * - Se a mesa já existe na lista: retorna `next` com merge.
 * - Se não existe: sinaliza `needsRefetch=true` e devolve `prev` inalterado.
 */
export function applyMesaDelta(
  prev: MesaApi[],
  delta: MesaDeltaPayload
): { next: MesaApi[]; needsRefetch: boolean } {
  const idx = prev.findIndex((m) => m.numero === delta.numero);
  if (idx === -1) {
    return { next: prev, needsRefetch: true };
  }
  const next = prev.slice();
  const target = next[idx];
  next[idx] = {
    ...target,
    status: delta.status ?? target.status,
    itens: delta.itens ?? target.itens,
    pendenciaFechamento:
      delta.pendenciaFechamento !== undefined
        ? delta.pendenciaFechamento
        : target.pendenciaFechamento,
  };
  return { next, needsRefetch: false };
}
