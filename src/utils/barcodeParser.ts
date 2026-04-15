/**
 * Parser de etiquetas de balança (EAN-13 com prefixo "2" — peso/valor variável).
 *
 * Layout adotado (13 dígitos, índices 0-based):
 * - [0]     = "2" (identificador comercial variável)
 * - [1..6)  = código do produto na balança (5 dígitos, ex.: 00155)
 * - [6..12) = valor total da etiqueta em centavos (6 dígitos, ex.: 001550 = R$ 15,50)
 * - [12]    = dígito verificador EAN-13
 *
 * Códigos que não passam na validação do DV ou no formato são tratados como varejo normal.
 */

export type ParseBarcodeResult =
  | {
      isBalanca: true;
      codigoBalanca: number;
      /** Valor total impresso na etiqueta, em centavos. */
      valorTotalCentavos: number;
      /** Valor total em reais. */
      valorTotal: number;
      digitos: string;
    }
  | { isBalanca: false; codigoBarras: string };

/** Valida dígito verificador EAN-13 (12 primeiros dígitos + DV). */
export function validarDigitoVerificadorEan13(digitos13: string): boolean {
  if (!/^\d{13}$/.test(digitos13)) return false;
  let soma = 0;
  for (let i = 0; i < 12; i++) {
    const d = parseInt(digitos13[i], 10);
    soma += d * (i % 2 === 0 ? 1 : 3);
  }
  const dv = (10 - (soma % 10)) % 10;
  return dv === parseInt(digitos13[12], 10);
}

/**
 * Interpreta código bipado. Etiquetas de balança válidas (EAN-13 começando com 2 + DV ok)
 * retornam `isBalanca: true` com código reduzido e valor em centavos.
 */
export function parseBarcode(barcode: string): ParseBarcodeResult {
  const digitos = barcode.replace(/\D/g, '');
  if (digitos.length !== 13 || digitos[0] !== '2') {
    return { isBalanca: false, codigoBarras: digitos.length > 0 ? digitos : barcode.trim() };
  }
  if (!validarDigitoVerificadorEan13(digitos)) {
    return { isBalanca: false, codigoBarras: digitos };
  }

  const codigoBalanca = parseInt(digitos.slice(1, 6), 10);
  const valorTotalCentavos = parseInt(digitos.slice(6, 12), 10);

  if (!Number.isFinite(codigoBalanca) || !Number.isFinite(valorTotalCentavos)) {
    return { isBalanca: false, codigoBarras: digitos };
  }

  return {
    isBalanca: true,
    codigoBalanca,
    valorTotalCentavos,
    valorTotal: valorTotalCentavos / 100,
    digitos,
  };
}
