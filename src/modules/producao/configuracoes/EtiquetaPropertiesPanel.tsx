import { useRef, type FC } from 'react';
// src/pages/configuracoes/components/layout-etiquetas/EtiquetaPropertiesPanel.tsx

import { Bold, Italic, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
import {
  LayoutElemento,
  LayoutTextElement,
  LayoutBarcodeElement,
  LayoutQrCodeElement,
  LayoutLineElement,
  LayoutRectangleElement,
  LayoutImageElement,
  RotationType,
  TextAlign,
  BarcodeType,
  ValueMode,
  barcodeExibirNumeracao,
  qrcodeExibirLegenda,
} from '../types/etiquetas';
import {
  placeholderParaVariavelId,
  variavelIdParaPlaceholder,
  VARIAVEIS_ETIQUETA_SECOES,
} from '../types/variaveisEtiqueta';
import {
  type CodigoSimbologiaUi,
  barcodeParaQrCode,
  qrCodeParaBarcode,
  simbologiaUiDoElemento,
} from './etiquetaElementMorph';

const MAX_IMAGEM_BYTES = 2_500_000;

const IDS_VARIAVEL_CATALOGO = new Set(
  VARIAVEIS_ETIQUETA_SECOES.flatMap((s) => s.itens.map((i) => i.id)),
);

interface FonteDadosSelectProps {
  elemento: LayoutTextElement | LayoutBarcodeElement | LayoutQrCodeElement;
  onUpdate: (updates: Partial<LayoutElemento>) => void;
  inputClass: string;
  labelClass: string;
}

function FonteDadosSelect({
  elemento,
  onUpdate,
  inputClass,
  labelClass,
}: FonteDadosSelectProps) {
  if (elemento.type === 'text') return null;
  if (
    (elemento.type === 'barcode' || elemento.type === 'qrcode') &&
    elemento.valueMode !== 'dynamic'
  ) {
    return null;
  }

  const placeholderStr = elemento.placeholder;
  const variavelAtual =
    elemento.variavel ?? placeholderParaVariavelId(placeholderStr.trim()) ?? '';

  const valorSelect =
    variavelAtual && IDS_VARIAVEL_CATALOGO.has(variavelAtual) ? variavelAtual : '';

  return (
    <div className="mt-3 rounded-xl border border-violet-500/15 bg-[#0d1528]/90 p-3">
      <h5 className="text-[11px] font-bold uppercase tracking-wider text-violet-400/90 mb-2">
        Fonte de dados
      </h5>
      <label className={labelClass}>Variável dinâmica</label>
      <select
        className={inputClass}
        value={valorSelect}
        onChange={(e) => {
          const v = e.target.value;
          if (!v) {
            onUpdate({ variavel: undefined } as Partial<LayoutElemento>);
            return;
          }
          onUpdate({
            variavel: v,
            placeholder: variavelIdParaPlaceholder(v),
          } as Partial<LayoutElemento>);
        }}
      >
        <option value="">— Outro (placeholder manual) —</option>
        {VARIAVEIS_ETIQUETA_SECOES.map((sec) => (
          <optgroup key={sec.id} label={sec.titulo}>
            {sec.itens.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </div>
  );
}

const OPCOES_SIMBOLOGIA: { value: CodigoSimbologiaUi; label: string }[] = [
  { value: 'EAN13', label: 'EAN-13' },
  { value: 'EAN8', label: 'EAN-8' },
  { value: 'CODE128', label: 'Code 128' },
  { value: 'ITF14', label: 'ITF-14' },
  { value: 'EAN14', label: 'EAN-14' },
  { value: 'CODE39', label: 'Code 39' },
  { value: 'QRCODE', label: 'QR Code' },
];

interface Props {
  selectedElement: LayoutElemento | null;
  onUpdateElement: (id: string, updates: Partial<LayoutElemento>) => void;
  onReplaceElement?: (id: string, next: LayoutElemento) => void;
}

const EtiquetaPropertiesPanel: FC<Props> = ({
  selectedElement,
  onUpdateElement,
  onReplaceElement,
}) => {
  const imagemInputRef = useRef<HTMLInputElement>(null);
  if (!selectedElement) {
    return (
      <div className="text-gray-500 text-center mt-10">
        Nenhum elemento selecionado no Canvas
      </div>
    );
  }

  const handleChange = (updates: Partial<LayoutElemento>) => {
    onUpdateElement(selectedElement.id, updates);
  };

  const handleBaseNumberChange = (
    field: 'x' | 'y' | 'width' | 'height' | 'zIndex',
    value: string,
  ) => {
    const numberValue = value === '' ? 0 : Number(value);
    handleChange({
      [field]: Number.isFinite(numberValue) ? numberValue : 0,
    } as Partial<LayoutElemento>);
  };

  const inputClass =
    'w-full bg-[#131b2f] border border-gray-700 rounded px-2 py-1.5 text-sm outline-none focus:border-purple-500 text-white';

  const labelClass = 'block text-xs text-gray-500 mb-1';

  const isTextElement = (
    element: LayoutElemento,
  ): element is LayoutTextElement => {
    return element.type === 'text' || element.type === 'dynamic_text';
  };

  const isBarcodeElement = (
    element: LayoutElemento,
  ): element is LayoutBarcodeElement => {
    return element.type === 'barcode';
  };

  const isQrCodeElement = (
    element: LayoutElemento,
  ): element is LayoutQrCodeElement => {
    return element.type === 'qrcode';
  };

  const isLineElement = (
    element: LayoutElemento,
  ): element is LayoutLineElement => {
    return element.type === 'line';
  };

  const isRectangleElement = (
    element: LayoutElemento,
  ): element is LayoutRectangleElement => {
    return element.type === 'rectangle';
  };

  const isImageElement = (
    element: LayoutElemento,
  ): element is LayoutImageElement => {
    return element.type === 'image';
  };

  return (
    <div className="space-y-5">
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-800 pb-2">
        Propriedades ({selectedElement.type})
      </h3>

      {/* POSIÇÃO E TAMANHO */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Eixo X (px)</label>
          <input
            type="number"
            value={selectedElement.x}
            onChange={(e) => handleBaseNumberChange('x', e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Eixo Y (px)</label>
          <input
            type="number"
            value={selectedElement.y}
            onChange={(e) => handleBaseNumberChange('y', e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Largura</label>
          <input
            type="number"
            value={selectedElement.width}
            onChange={(e) => handleBaseNumberChange('width', e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Altura</label>
          <input
            type="number"
            value={selectedElement.height}
            onChange={(e) => handleBaseNumberChange('height', e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      {/* CONTROLE GERAL */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Rotação (°)</label>
          <select
            value={selectedElement.rotation ?? 0}
            onChange={(e) =>
              handleChange({
                rotation: Number(e.target.value) as RotationType,
              })
            }
            className={inputClass}
          >
            <option value={0}>0°</option>
            <option value={90}>90°</option>
            <option value={180}>180°</option>
            <option value={270}>270°</option>
          </select>
        </div>

        <div>
          <label className={labelClass}>Camada (zIndex)</label>
          <input
            type="number"
            // BLINDAGEM 5: Fallback para 0 se undefined
            value={selectedElement.zIndex ?? 0}
            onChange={(e) => handleBaseNumberChange('zIndex', e.target.value)}
            className={inputClass}
          />
        </div>

        <div className="flex items-center gap-2 pt-5">
          <input
            id="visible"
            type="checkbox"
            // BLINDAGEM 4: Trata undefined como true
            checked={selectedElement.visible !== false}
            onChange={(e) => handleChange({ visible: e.target.checked })}
            className="rounded border-gray-700 bg-[#131b2f]"
          />
          <label htmlFor="visible" className="text-sm text-gray-300">
            Visível
          </label>
        </div>

        <div className="flex items-center gap-2 pt-5">
          <input
            id="locked"
            type="checkbox"
            checked={selectedElement.locked ?? false}
            onChange={(e) => handleChange({ locked: e.target.checked })}
            className="rounded border-gray-700 bg-[#131b2f]"
          />
          <label htmlFor="locked" className="text-sm text-gray-300">
            Bloqueado
          </label>
        </div>

        {(isLineElement(selectedElement) ||
          isRectangleElement(selectedElement) ||
          isBarcodeElement(selectedElement) ||
          isQrCodeElement(selectedElement)) && (
          <div className="col-span-2 flex items-center gap-2 pt-2">
            <input
              id="inverted-geral"
              type="checkbox"
              checked={selectedElement.inverted === true}
              onChange={(e) => handleChange({ inverted: e.target.checked })}
              className="rounded border-gray-700 bg-[#131b2f]"
            />
            <label htmlFor="inverted-geral" className="text-sm text-gray-300">
              Negativo (fundo preto / primeiro plano claro)
            </label>
          </div>
        )}
      </div>

      {/* TEXTO / DYNAMIC_TEXT */}
      {isTextElement(selectedElement) && (
        <>
          <div className="border-b border-gray-800 pb-2 mb-1">
            <h4 className="text-xs font-bold text-violet-400/90 uppercase tracking-wider">Texto</h4>
            <p className="text-[11px] text-gray-500 mt-1">Hierarquia visual e leitura do rótulo</p>
          </div>

          {/* ✅ NOVO: Alternador de Tipo de Texto (Fixo vs Dinâmico) */}
          <div className="mb-3">
            <label className={labelClass}>Tipo de Texto</label>
            <select
              value={selectedElement.type}
              onChange={(e) => {
                const newType = e.target.value as 'text' | 'dynamic_text';
                handleChange(
                  newType === 'text'
                    ? ({
                        type: newType,
                        text: 'Novo Texto',
                        placeholder: undefined,
                        variavel: undefined,
                      } as Partial<LayoutTextElement>)
                    : ({
                        type: newType,
                        placeholder: '{{produto}}',
                        text: undefined,
                        variavel: 'produto',
                      } as Partial<LayoutTextElement>),
                );
              }}
              className={inputClass}
            >
              <option value="text">Texto Fixo</option>
              <option value="dynamic_text">Variável (Dinâmico)</option>
            </select>
          </div>

          {/* BLINDAGEM 1: Separação estrita de Text e Dynamic Text */}
          {selectedElement.type === 'text' && (
            <div>
              <label className={labelClass}>Conteúdo</label>
              <textarea
                value={selectedElement.text}
                onChange={(e) =>
                  handleChange({ text: e.target.value } as Partial<LayoutTextElement>)
                }
                className={`${inputClass} min-h-[80px]`}
              />
            </div>
          )}

          {selectedElement.type === 'dynamic_text' && (
            <div>
              <label className={labelClass}>Placeholder</label>
              <input
                type="text"
                value={selectedElement.placeholder}
                onChange={(e) => {
                  const ph = e.target.value;
                  const vid = placeholderParaVariavelId(ph.trim());
                  handleChange({
                    placeholder: ph,
                    variavel: vid,
                  } as Partial<LayoutTextElement>);
                }}
                className={inputClass}
                placeholder="{{produto}}"
              />
            </div>
          )}

          {selectedElement.type === 'dynamic_text' && (
            <FonteDadosSelect
              elemento={selectedElement}
              onUpdate={handleChange}
              inputClass={inputClass}
              labelClass={labelClass}
            />
          )}

          <div className="space-y-3 mt-3">
            <div>
              <label className={labelClass}>Tamanho da fonte (px)</label>
              <input
                type="number"
                min={6}
                max={200}
                value={selectedElement.fontSize || 24}
                onChange={(e) => {
                  const numberValue =
                    e.target.value === '' ? 0 : Number(e.target.value);
                  handleChange({
                    fontSize: Number.isFinite(numberValue) ? numberValue : 0,
                  } as Partial<LayoutTextElement>);
                }}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Estilo</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  title="Negrito"
                  onClick={() =>
                    handleChange({
                      fontWeight:
                        selectedElement.fontWeight === 'bold' ? 'normal' : 'bold',
                    } as Partial<LayoutTextElement>)
                  }
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border text-sm font-bold transition-colors ${
                    selectedElement.fontWeight === 'bold'
                      ? 'bg-violet-600 border-violet-400 text-white shadow-inner'
                      : 'bg-[#131b2f] border-gray-600 text-gray-300 hover:border-gray-500'
                  }`}
                >
                  <Bold size={16} strokeWidth={2.5} />
                  B
                </button>
                <button
                  type="button"
                  title="Itálico"
                  onClick={() =>
                    handleChange({
                      fontStyle:
                        selectedElement.fontStyle === 'italic' ? 'normal' : 'italic',
                    } as Partial<LayoutTextElement>)
                  }
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border text-sm italic transition-colors ${
                    selectedElement.fontStyle === 'italic'
                      ? 'bg-violet-600 border-violet-400 text-white shadow-inner'
                      : 'bg-[#131b2f] border-gray-600 text-gray-300 hover:border-gray-500'
                  }`}
                >
                  <Italic size={16} strokeWidth={2.5} />
                  I
                </button>
              </div>
            </div>

            <div>
              <label className={labelClass}>Alinhamento</label>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { v: 'left' as const, icon: AlignLeft, label: 'Esq' },
                    { v: 'center' as const, icon: AlignCenter, label: 'Centro' },
                    { v: 'right' as const, icon: AlignRight, label: 'Dir' },
                  ] as const
                ).map(({ v, icon: Icon, label }) => {
                  const ativo = (selectedElement.textAlign || 'left') === v;
                  return (
                    <button
                      key={v}
                      type="button"
                      onClick={() =>
                        handleChange({ textAlign: v } as Partial<LayoutTextElement>)
                      }
                      className={`flex flex-col items-center justify-center gap-0.5 py-2 rounded-lg border text-[11px] transition-colors ${
                        ativo
                          ? 'bg-violet-600 border-violet-400 text-white'
                          : 'bg-[#131b2f] border-gray-600 text-gray-400 hover:border-gray-500 hover:text-gray-200'
                      }`}
                    >
                      <Icon size={16} strokeWidth={2} />
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className={labelClass}>Família da fonte</label>
              <input
                type="text"
                value={selectedElement.fontFamily || 'Arial'}
                onChange={(e) =>
                  handleChange({
                    fontFamily: e.target.value,
                  } as Partial<LayoutTextElement>)
                }
                className={inputClass}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 mt-3">
            <input
              id="inverted-texto"
              type="checkbox"
              checked={selectedElement.inverted === true}
              onChange={(e) =>
                handleChange({ inverted: e.target.checked } as Partial<LayoutTextElement>)
              }
              className="rounded border-gray-700 bg-[#131b2f]"
            />
            <label htmlFor="inverted-texto" className="text-sm text-gray-300">
              Inverter cores (fundo preto)
            </label>
          </div>
        </>
      )}

      {/* BARCODE */}
      {isBarcodeElement(selectedElement) && (
        <>
          <div className="rounded-xl border border-violet-500/25 bg-gradient-to-br from-violet-950/40 to-[#131b2f] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                id="showBarcodeNumeracao"
                type="checkbox"
                checked={barcodeExibirNumeracao(selectedElement)}
                onChange={(e) => {
                  const ligado = e.target.checked;
                  handleChange({
                    showText: ligado,
                    showHumanReadable: ligado,
                  } as Partial<LayoutBarcodeElement>);
                }}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-600 bg-[#131b2f] text-violet-500 focus:ring-violet-500 focus:ring-offset-0 focus:ring-offset-transparent"
              />
              <span>
                <span className="block text-sm font-semibold text-white">
                  Mostrar numeração (texto legível)
                </span>
                <span className="mt-1 block text-[11px] leading-snug text-gray-400">
                  Desligue para ocultar os números abaixo das barras no canvas e na impressão (ZPL).
                </span>
              </span>
            </label>
          </div>

          {/* BLINDAGEM 2: Separação estrita de Fixed e Dynamic para Barcode */}
          {selectedElement.valueMode === 'fixed' && (
            <div>
              <label className={labelClass}>Conteúdo / Valor</label>
              <textarea
                value={selectedElement.text}
                onChange={(e) =>
                  handleChange({ text: e.target.value } as Partial<LayoutBarcodeElement>)
                }
                className={`${inputClass} min-h-[80px]`}
              />
            </div>
          )}

          {selectedElement.valueMode === 'dynamic' && (
            <div>
              <label className={labelClass}>Placeholder</label>
              <input
                type="text"
                value={selectedElement.placeholder}
                onChange={(e) => {
                  const ph = e.target.value;
                  const vid = placeholderParaVariavelId(ph.trim());
                  handleChange({
                    placeholder: ph,
                    variavel: vid,
                  } as Partial<LayoutBarcodeElement>);
                }}
                className={inputClass}
                placeholder="{{codigoBarras}}"
              />
            </div>
          )}

          {selectedElement.valueMode === 'dynamic' && (
            <FonteDadosSelect
              elemento={selectedElement}
              onUpdate={handleChange}
              inputClass={inputClass}
              labelClass={labelClass}
            />
          )}

          <div className="grid grid-cols-2 gap-3 mt-3">
            <div className="col-span-2">
              <label className={labelClass}>Padrão do código</label>
              <select
                value={simbologiaUiDoElemento(selectedElement)}
                onChange={(e) => {
                  const v = e.target.value as CodigoSimbologiaUi;
                  if (v === 'QRCODE') {
                    if (!onReplaceElement) {
                      alert('Não foi possível converter para QR Code. Recarregue o editor.');
                      return;
                    }
                    onReplaceElement(selectedElement.id, barcodeParaQrCode(selectedElement));
                    return;
                  }
                  handleChange({
                    barcodeType: v as BarcodeType,
                  } as Partial<LayoutBarcodeElement>);
                }}
                className={inputClass}
              >
                {OPCOES_SIMBOLOGIA.map((op) => (
                  <option key={op.value} value={op.value}>
                    {op.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>Modo do Valor</label>
              <select
                value={selectedElement.valueMode}
                onChange={(e) => {
                  const mode = e.target.value as ValueMode;
                  // BLINDAGEM 6: Limpa o campo oposto ao trocar o modo
                  handleChange(
                    mode === 'fixed'
                      ? ({
                          valueMode: mode,
                          text: '',
                          placeholder: undefined,
                          variavel: undefined,
                        } as Partial<LayoutBarcodeElement>)
                      : ({
                          valueMode: mode,
                          placeholder: '{{codigoBarras}}',
                          text: undefined,
                          variavel: 'codigoBarras',
                        } as Partial<LayoutBarcodeElement>),
                  );
                }}
                className={inputClass}
              >
                <option value="fixed">Fixo</option>
                <option value="dynamic">Dinâmico</option>
              </select>
            </div>
          </div>
        </>
      )}

      {/* QRCODE */}
      {isQrCodeElement(selectedElement) && (
        <>
          <div className="rounded-xl border border-violet-500/25 bg-gradient-to-br from-violet-950/40 to-[#131b2f] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                id="showQrLegenda"
                type="checkbox"
                checked={qrcodeExibirLegenda(selectedElement)}
                onChange={(e) => {
                  const ligado = e.target.checked;
                  handleChange({ showText: ligado } as Partial<LayoutQrCodeElement>);
                }}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-600 bg-[#131b2f] text-violet-500 focus:ring-violet-500 focus:ring-offset-0 focus:ring-offset-transparent"
              />
              <span>
                <span className="block text-sm font-semibold text-white">
                  Mostrar numeração (texto legível)
                </span>
                <span className="mt-1 block text-[11px] leading-snug text-gray-400">
                  Desligue para ocultar a legenda abaixo do QR no canvas. No ZPL (^BQ) não há legenda
                  automática; o valor impresso é só o símbolo.
                </span>
              </span>
            </label>
          </div>

          {/* BLINDAGEM 3: Separação estrita de Fixed e Dynamic para QRCode */}
          {selectedElement.valueMode === 'fixed' && (
            <div>
              <label className={labelClass}>Conteúdo / Valor</label>
              <textarea
                value={selectedElement.text}
                onChange={(e) =>
                  handleChange({ text: e.target.value } as Partial<LayoutQrCodeElement>)
                }
                className={`${inputClass} min-h-[80px]`}
              />
            </div>
          )}

          {selectedElement.valueMode === 'dynamic' && (
            <div>
              <label className={labelClass}>Placeholder</label>
              <input
                type="text"
                value={selectedElement.placeholder}
                onChange={(e) => {
                  const ph = e.target.value;
                  const vid = placeholderParaVariavelId(ph.trim());
                  handleChange({
                    placeholder: ph,
                    variavel: vid,
                  } as Partial<LayoutQrCodeElement>);
                }}
                className={inputClass}
                placeholder="{{codigoBarras}}"
              />
            </div>
          )}

          {selectedElement.valueMode === 'dynamic' && (
            <FonteDadosSelect
              elemento={selectedElement}
              onUpdate={handleChange}
              inputClass={inputClass}
              labelClass={labelClass}
            />
          )}

          <div className="mt-3">
            <label className={labelClass}>Modo do Valor</label>
            <select
              value={selectedElement.valueMode}
              onChange={(e) => {
                const mode = e.target.value as ValueMode;
                // BLINDAGEM 6: Limpa o campo oposto ao trocar o modo
                handleChange(
                  mode === 'fixed'
                    ? ({
                        valueMode: mode,
                        text: '',
                        placeholder: undefined,
                        variavel: undefined,
                      } as Partial<LayoutQrCodeElement>)
                    : ({
                        valueMode: mode,
                        placeholder: '{{codigoBarras}}',
                        text: undefined,
                        variavel: 'codigoBarras',
                      } as Partial<LayoutQrCodeElement>),
                );
              }}
              className={inputClass}
            >
              <option value="fixed">Fixo</option>
              <option value="dynamic">Dinâmico</option>
            </select>
          </div>

          <div className="mt-3">
            <label className={labelClass}>Trocar para código linear</label>
            <select
              value="QRCODE"
              onChange={(e) => {
                const v = e.target.value as CodigoSimbologiaUi;
                if (v === 'QRCODE') return;
                if (!onReplaceElement) {
                  alert('Conversão indisponível.');
                  return;
                }
                onReplaceElement(
                  selectedElement.id,
                  qrCodeParaBarcode(selectedElement, v as BarcodeType),
                );
              }}
              className={inputClass}
            >
              <option value="QRCODE">QR Code (atual)</option>
              {OPCOES_SIMBOLOGIA.filter((o) => o.value !== 'QRCODE').map((op) => (
                <option key={op.value} value={op.value}>
                  {op.label}
                </option>
              ))}
            </select>
          </div>
        </>
      )}

      {/* LINE */}
      {isLineElement(selectedElement) && (
        <div>
          <label className={labelClass}>Espessura da Linha</label>
          <input
            type="number"
            value={selectedElement.lineThickness}
            onChange={(e) => {
              const numberValue = e.target.value === '' ? 0 : Number(e.target.value);
              handleChange({
                lineThickness: Number.isFinite(numberValue) ? numberValue : 0,
              } as Partial<LayoutLineElement>);
            }}
            className={inputClass}
          />
        </div>
      )}

      {/* RECTANGLE */}
      {isRectangleElement(selectedElement) && (
        <div>
          <label className={labelClass}>Espessura da Borda</label>
          <input
            type="number"
            value={selectedElement.borderThickness}
            onChange={(e) => {
              const numberValue = e.target.value === '' ? 0 : Number(e.target.value);
              handleChange({
                borderThickness: Number.isFinite(numberValue) ? numberValue : 0,
              } as Partial<LayoutRectangleElement>);
            }}
            className={inputClass}
          />
        </div>
      )}

      {/* IMAGE */}
      {isImageElement(selectedElement) && (
        <div className="space-y-3">
          <div>
            <label className={labelClass}>Imagem (PNG/JPG/WebP)</label>
            <input
              ref={imagemInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (file.size > MAX_IMAGEM_BYTES) {
                  alert('Imagem muito grande. Máximo ~2,5 MB.');
                  e.target.value = '';
                  return;
                }
                const reader = new FileReader();
                reader.onload = () => {
                  const data = typeof reader.result === 'string' ? reader.result : '';
                  handleChange({ src: data } as Partial<LayoutImageElement>);
                };
                reader.readAsDataURL(file);
                e.target.value = '';
              }}
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => imagemInputRef.current?.click()}
                className="px-3 py-2 rounded-lg bg-violet-600/80 hover:bg-violet-600 text-white text-sm font-medium"
              >
                Enviar arquivo…
              </button>
              {selectedElement.src ? (
                <button
                  type="button"
                  onClick={() => handleChange({ src: '' } as Partial<LayoutImageElement>)}
                  className="px-3 py-2 rounded-lg border border-gray-600 text-gray-300 text-sm hover:bg-white/5"
                >
                  Remover
                </button>
              ) : null}
            </div>
            <p className="text-[11px] text-gray-500 mt-1">
              A imagem é armazenada em base64 no layout (selo SIM, logomarca). Impressão ZPL gráfica ainda não
              converte automaticamente este elemento.
            </p>
          </div>
          <div>
            <label className={labelClass}>Ajuste (object-fit)</label>
            <select
              value={selectedElement.objectFit || 'contain'}
              onChange={(e) =>
                handleChange({
                  objectFit: e.target.value as LayoutImageElement['objectFit'],
                } as Partial<LayoutImageElement>)
              }
              className={inputClass}
            >
              <option value="contain">Contain</option>
              <option value="cover">Cover</option>
              <option value="fill">Fill</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Raio da borda (px — use alto p/ selo circular)</label>
            <input
              type="number"
              min={0}
              value={selectedElement.borderRadius ?? 0}
              onChange={(e) => {
                const n = e.target.value === '' ? 0 : Number(e.target.value);
                handleChange({
                  borderRadius: Number.isFinite(n) ? n : 0,
                } as Partial<LayoutImageElement>);
              }}
              className={inputClass}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default EtiquetaPropertiesPanel;