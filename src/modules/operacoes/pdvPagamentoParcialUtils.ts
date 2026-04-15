/** Utilitários compartilhados — pagamento parcial / misto no PDV (sem `any`). */

export function round2Pdv(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Interpreta texto digitado (vírgula ou ponto decimal).
 * Retorna `null` se não for número finito.
 */
export function parseValorMonetarioPdv(input: string): number | null {
  const t = input.trim().replace(',', '.');
  if (t === '' || t === '-' || t === '.') return null;
  const n = Number(t);
  if (!Number.isFinite(n)) return null;
  return round2Pdv(n);
}

/** Erro humano-legível ou `null` se válido. `valorRestante` em reais (2 casas). */
export function validarValorParcialPdv(
  valor: number,
  valorRestante: number,
  eps = 0.009
): string | null {
  if (!(valor > 0)) {
    return 'Informe um valor maior que zero.';
  }
  if (valor > valorRestante + eps) {
    return `O valor não pode ser maior que o restante (R$ ${valorRestante.toFixed(2)}).`;
  }
  return null;
}
