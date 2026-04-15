export interface ItemMesaApi {
  id: string;
  quantidade: unknown;
  valorTotal: unknown;
  observacao?: string | null;
  produto: { id: string; nome: string };
  itemCardapio?: { id: string; nome: string } | null;
}

/** Snapshot gravado na mesa quando o garçom solicita fechamento no caixa (JSON no backend). */
export interface PendenciaFechamentoMesaApi {
  subtotal: number;
  taxaServico: number;
  incluiTaxaServico: boolean;
  total: number;
  pessoas: number;
  valorPorPessoa: number;
  solicitadoEm: string;
  itens: Array<{ nome: string; quantidade: number; valorTotal: number }>;
}

export interface MesaApi {
  id: string;
  numero: number;
  status: string;
  itens: ItemMesaApi[];
  pendenciaFechamento?: PendenciaFechamentoMesaApi | null;
}

export function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function subtotalMesa(m: MesaApi): number {
  return m.itens.reduce((s, it) => s + num(it.valorTotal), 0);
}

export function isMesaOcupada(m: MesaApi): boolean {
  const st = String(m.status).toUpperCase();
  if (st === 'FECHANDO') return true;
  return st === 'OCUPADA' || m.itens.length > 0;
}
