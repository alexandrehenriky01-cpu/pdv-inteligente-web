// src/pages/configuracoes/components/layout-etiquetas/types.ts

export type EtiquetaElementType =
  | 'text'
  | 'dynamic_text'
  | 'barcode'
  | 'qrcode'
  | 'line'
  | 'rectangle'
  | 'image';

/** Simbologia linear (ZPL). QR Code usa elemento `type: 'qrcode'`. */
export type BarcodeType = 'CODE128' | 'EAN13' | 'EAN8' | 'EAN14' | 'ITF14' | 'CODE39';
export type ValueMode = 'fixed' | 'dynamic';
export type TextAlign = 'left' | 'center' | 'right';
export type FontWeightType = 'normal' | 'bold';
export type FontStyleType = 'normal' | 'italic';
export type CanvasUnit = 'px' | 'mm'; // EVOLUÇÃO: Suporte a mm
export type RotationType = 0 | 90 | 180 | 270;

export interface LayoutElementoBase {
  id: string;
  type: EtiquetaElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: RotationType;
  /** Fundo preto / primeiro plano claro (texto e áreas de destaque). */
  inverted?: boolean;
  visible?: boolean; // EVOLUÇÃO: Opcional
  locked?: boolean;
  zIndex?: number;   // EVOLUÇÃO: Opcional
}

// ============================================================================
// EVOLUÇÃO: Discriminated Unions para blindar estados impossíveis
// ============================================================================

export type LayoutTextElement = LayoutElementoBase & {
  fontSize: number;
  fontFamily?: string;
  fontWeight?: FontWeightType;
  fontStyle?: FontStyleType;
  textAlign?: TextAlign;
} & (
  | { type: 'text'; text: string; placeholder?: never; variavel?: never }
  | { type: 'dynamic_text'; text?: never; placeholder: string; variavel?: string }
);

export type LayoutBarcodeElement = LayoutElementoBase & {
  type: 'barcode';
  barcodeType: BarcodeType;
  /** @deprecated Preferir showText; mantido para layouts antigos e ZPL. */
  showHumanReadable?: boolean;
  /** Exibir texto legível sob o código (padrão implícito: true). */
  showText?: boolean;
} & (
  | { valueMode: 'fixed'; text: string; placeholder?: never; variavel?: never }
  | { valueMode: 'dynamic'; text?: never; placeholder: string; variavel?: string }
);

export type LayoutQrCodeElement = LayoutElementoBase & {
  type: 'qrcode';
  /** Exibir legenda legível sob o QR no canvas (padrão implícito: true). */
  showText?: boolean;
} & (
  | { valueMode: 'fixed'; text: string; placeholder?: never; variavel?: never }
  | { valueMode: 'dynamic'; text?: never; placeholder: string; variavel?: string }
);

// ============================================================================

export interface LayoutLineElement extends LayoutElementoBase {
  type: 'line';
  lineThickness: number;
}

export interface LayoutRectangleElement extends LayoutElementoBase {
  type: 'rectangle';
  borderThickness: number;
}

export interface LayoutImageElement extends LayoutElementoBase {
  type: 'image';
  /** Data URL (base64) ou URL https — selo SIM / logomarca. */
  src: string;
  objectFit?: 'contain' | 'cover' | 'fill';
  /** Raio em px (ex.: 9999 para círculo aproximado no quadrado). */
  borderRadius?: number;
}

export type LayoutElemento =
  | LayoutTextElement
  | LayoutBarcodeElement
  | LayoutQrCodeElement
  | LayoutLineElement
  | LayoutRectangleElement
  | LayoutImageElement;

export interface LayoutEtiquetaJson {
  version: string;
  canvas: {
    width: number;
    height: number;
    unit: CanvasUnit; // EVOLUÇÃO: Usa o type CanvasUnit
    background?: string;
    gridSize?: number;
    showGrid?: boolean;
  };
  elements: LayoutElemento[];
}

// Compatibilidade temporária com arquivos antigos do editor
export type ElementType = EtiquetaElementType;
export type CanvasElement = LayoutElemento;

// Helpers/defaults
export const DEFAULT_CANVAS = {
  width: 800,
  height: 400,
  unit: 'px' as const,
  background: '#ffffff',
  gridSize: 10,
  showGrid: true,
};

export const DEFAULT_LAYOUT_JSON: LayoutEtiquetaJson = {
  version: '1.0.0',
  canvas: DEFAULT_CANVAS,
  elements: [],
};

export const PLACEHOLDERS_DISPONIVEIS = [
  '{{produto}}',
  '{{peso}}',
  '{{validade}}',
  '{{lote}}',
  '{{dataProducao}}',
  '{{quantidadePecas}}',
  '{{codigoBarras}}',
  '{{op}}',
  '{{dataAtual}}',
  '{{horaAtual}}',
] as const;

// ============================================================================
// EVOLUÇÃO: Factory refatorada para respeitar as Unions (sem propriedades inválidas)
// ============================================================================
export const createDefaultElement = (
  type: EtiquetaElementType,
  zIndex = 0,
): LayoutElemento => {
  const base = {
    id: Date.now().toString(),
    x: 50,
    y: 50,
    width: type === 'line' ? 200 : type === 'qrcode' ? 100 : 120,
    height: type === 'line' ? 2 : type === 'barcode' ? 80 : type === 'qrcode' ? 100 : 50,
    rotation: 0 as RotationType,
    visible: true,
    locked: false,
    zIndex,
  };

  switch (type) {
    case 'text':
      return {
        ...base,
        type: 'text',
        text: 'Novo Texto',
        fontSize: 24,
        fontFamily: 'Arial',
        fontWeight: 'normal',
        fontStyle: 'normal',
        textAlign: 'left',
      };

    case 'dynamic_text':
      return {
        ...base,
        type: 'dynamic_text',
        placeholder: '{{produto}}', // Removido o text: '' inválido
        fontSize: 24,
        fontFamily: 'Arial',
        fontWeight: 'normal',
        fontStyle: 'normal',
        textAlign: 'left',
      };

    case 'barcode':
      return {
        ...base,
        type: 'barcode',
        barcodeType: 'CODE128',
        valueMode: 'dynamic',
        placeholder: '{{codigoBarras}}', // Removido o text: '' inválido
        showText: true,
        showHumanReadable: true,
        width: 220,
        height: 80,
      };

    case 'qrcode':
      return {
        ...base,
        type: 'qrcode',
        valueMode: 'dynamic',
        placeholder: '{{codigoBarras}}', // Removido o text: '' inválido
        showText: true,
        width: 100,
        height: 100,
      };

    case 'line':
      return {
        ...base,
        type: 'line',
        width: 200,
        height: 2,
        lineThickness: 2,
      };

    case 'rectangle':
      return {
        ...base,
        type: 'rectangle',
        width: 160,
        height: 80,
        borderThickness: 2,
      };

    case 'image':
      return {
        ...base,
        type: 'image',
        width: 120,
        height: 120,
        src: '',
        objectFit: 'contain',
        borderRadius: 0,
      };

    default:
      return {
        ...base,
        type: 'text',
        text: 'Novo Texto',
        fontSize: 24,
        fontFamily: 'Arial',
        fontWeight: 'normal',
        fontStyle: 'normal',
        textAlign: 'left',
      };
  }
};

// Type Guards
export const isTextElement = (
  element: LayoutElemento,
): element is LayoutTextElement => {
  return element.type === 'text' || element.type === 'dynamic_text';
};

export const isBarcodeElement = (
  element: LayoutElemento,
): element is LayoutBarcodeElement => {
  return element.type === 'barcode';
};

/**
 * Texto legível sob o código de barras (canvas + ZPL).
 * `showText` tem precedência; layouts antigos usam só `showHumanReadable`.
 */
export function barcodeExibirNumeracao(el: LayoutBarcodeElement): boolean {
  if (el.showText === false) return false;
  if (el.showText === true) return true;
  return el.showHumanReadable !== false;
}

/** Texto legível sob o QR no canvas (alinhado ao comportamento do código de barras). */
export function qrcodeExibirLegenda(el: LayoutQrCodeElement): boolean {
  return el.showText !== false;
}

export const isQrCodeElement = (
  element: LayoutElemento,
): element is LayoutQrCodeElement => {
  return element.type === 'qrcode';
};

export const isLineElement = (
  element: LayoutElemento,
): element is LayoutLineElement => {
  return element.type === 'line';
};

export const isRectangleElement = (
  element: LayoutElemento,
): element is LayoutRectangleElement => {
  return element.type === 'rectangle';
};

export const isImageElement = (
  element: LayoutElemento,
): element is LayoutImageElement => {
  return element.type === 'image';
};