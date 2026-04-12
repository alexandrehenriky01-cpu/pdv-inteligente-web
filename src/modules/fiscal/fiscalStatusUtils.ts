/**
 * Status fiscais de venda vindos do backend (NF-e / NFC-e / emissão assíncrona).
 */

export function isFiscalRejeicaoOuErroEmissao(statusRaw: string | undefined | null): boolean {
  const s = String(statusRaw || '').toUpperCase();
  if (!s) return false;
  if (s.includes('CANCEL') || s.includes('INUTILIZ')) return false;
  if (s.includes('REJEITAD')) return true;
  if (s === 'ERRO_EMISSAO' || s.includes('ERRO_EMISSAO')) return true;
  if (s === 'ERRO') return true;
  return false;
}

/** Rótulo curto para badge (mantém legível no PDV). */
export function rotuloStatusFiscalBadge(statusRaw: string | undefined | null): string {
  const s = String(statusRaw || '').toUpperCase();
  if (!s) return 'PENDENTE';
  if (s === 'ERRO_EMISSAO') return 'ERRO EMISSÃO';
  if (s === 'REJEITADA_NFE') return 'REJEITADA NF-e';
  if (s === 'REJEITADA_NFCE') return 'REJEITADA NFC-e';
  if (s.includes('REJEITAD')) return 'REJEITADA';
  if (s.includes('AUTORIZAD') || s.includes('EMITIDA')) return 'AUTORIZADA';
  if (s.includes('CANCEL')) return 'CANCELADA';
  if (s.includes('PROCESSANDO') || s.includes('PENDENTE')) return 'PROCESSANDO';
  return s.slice(0, 24);
}
