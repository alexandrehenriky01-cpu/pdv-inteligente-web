import {
  type LayoutBarcodeElement,
  type LayoutQrCodeElement,
  type BarcodeType,
  barcodeExibirNumeracao,
} from '../types/etiquetas';

/** Valor do select unificado: lineares + QR (elemento `qrcode`). */
export type CodigoSimbologiaUi = BarcodeType | 'QRCODE';

export function barcodeParaQrCode(el: LayoutBarcodeElement): LayoutQrCodeElement {
  const lado = Math.min(Math.max(el.width, 40), Math.max(el.height, 40));
  const base = {
    id: el.id,
    x: el.x,
    y: el.y,
    width: lado,
    height: lado,
    rotation: el.rotation,
    inverted: el.inverted,
    visible: el.visible,
    locked: el.locked,
    zIndex: el.zIndex,
    type: 'qrcode' as const,
    showText: barcodeExibirNumeracao(el),
  };

  if (el.valueMode === 'fixed') {
    return { ...base, valueMode: 'fixed', text: el.text || '' };
  }
  return {
    ...base,
    valueMode: 'dynamic',
    placeholder: el.placeholder,
    variavel: el.variavel,
  };
}

export function qrCodeParaBarcode(
  el: LayoutQrCodeElement,
  barcodeType: BarcodeType,
): LayoutBarcodeElement {
  const base = {
    id: el.id,
    x: el.x,
    y: el.y,
    width: Math.max(el.width, 180),
    height: Math.max(Math.min(el.height, 80), 48),
    rotation: el.rotation,
    inverted: el.inverted,
    visible: el.visible,
    locked: el.locked,
    zIndex: el.zIndex,
    type: 'barcode' as const,
    barcodeType,
    showText: el.showText !== false,
    showHumanReadable: el.showText !== false,
  };

  if (el.valueMode === 'fixed') {
    return { ...base, valueMode: 'fixed', text: el.text || '' };
  }
  return {
    ...base,
    valueMode: 'dynamic',
    placeholder: el.placeholder,
    variavel: el.variavel,
  };
}

export function simbologiaUiDoElemento(
  el: LayoutBarcodeElement | LayoutQrCodeElement,
): CodigoSimbologiaUi {
  if (el.type === 'qrcode') return 'QRCODE';
  return el.barcodeType;
}
