/**
 * Normalização da resposta de `GET /api/contabilidade/dre` (ContabilidadeService.gerarDRE),
 * baseada em agregação do Livro Razão (`LancamentoContabil`).
 */
export type DREIndicadoresFlat = {
  receitaBruta: number;
  cmv: number;
  lucroBruto: number;
  despesasOperacionais: number;
  lucroLiquido: number;
  margemLucro: number;
};

export type DREResumoApi = 'LUCRO' | 'PREJUÍZO' | 'PONTO DE EQUILÍBRIO';

function asFiniteNumber(v: unknown): number {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

/** Aceita payload aninhado (`indicadores`) ou legado (campos na raiz). */
export function normalizarIndicadoresDreApi(raw: unknown): DREIndicadoresFlat {
  const o =
    raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const ind =
    o.indicadores && typeof o.indicadores === 'object' && !Array.isArray(o.indicadores)
      ? (o.indicadores as Record<string, unknown>)
      : o;

  return {
    receitaBruta: asFiniteNumber(ind.receitaBruta),
    cmv: asFiniteNumber(ind.cmv),
    lucroBruto: asFiniteNumber(ind.lucroBruto),
    despesasOperacionais: asFiniteNumber(ind.despesasOperacionais),
    lucroLiquido: asFiniteNumber(ind.lucroLiquido),
    margemLucro: asFiniteNumber(ind.margemLucro),
  };
}

export function extrairResumoDreApi(raw: unknown): DREResumoApi {
  const o =
    raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const r = o.resumo;
  if (r === 'LUCRO' || r === 'PREJUÍZO' || r === 'PONTO DE EQUILÍBRIO') {
    return r;
  }
  const { lucroLiquido } = normalizarIndicadoresDreApi(raw);
  if (lucroLiquido > 0) return 'LUCRO';
  if (lucroLiquido < 0) return 'PREJUÍZO';
  return 'PONTO DE EQUILÍBRIO';
}

/** Moeda BRL segura para UI (null, undefined, NaN → 0). */
export function formatarMoedaContabil(valor: unknown): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(asFiniteNumber(valor));
}
