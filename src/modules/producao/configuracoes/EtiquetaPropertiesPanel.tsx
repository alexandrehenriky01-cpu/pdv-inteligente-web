// src/pages/configuracoes/components/layout-etiquetas/EtiquetaPropertiesPanel.tsx

import React from 'react';
import {
  LayoutElemento,
  LayoutTextElement,
  LayoutBarcodeElement,
  LayoutQrCodeElement,
  LayoutLineElement,
  LayoutRectangleElement,
  RotationType,
  FontWeightType,
  TextAlign,
  BarcodeType,
  ValueMode,
} from '../../producao/types/etiquetas';

interface Props {
  selectedElement: LayoutElemento | null;
  onUpdateElement: (id: string, updates: Partial<LayoutElemento>) => void;
}

const EtiquetaPropertiesPanel: React.FC<Props> = ({
  selectedElement,
  onUpdateElement,
}) => {
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
          <label className={labelClass}>Rotação</label>
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
      </div>

      {/* TEXTO / DYNAMIC_TEXT */}
      {isTextElement(selectedElement) && (
        <>
          {/* ✅ NOVO: Alternador de Tipo de Texto (Fixo vs Dinâmico) */}
          <div className="mb-3">
            <label className={labelClass}>Tipo de Texto</label>
            <select
              value={selectedElement.type}
              onChange={(e) => {
                const newType = e.target.value as 'text' | 'dynamic_text';
                handleChange(
                  newType === 'text'
                    ? ({ type: newType, text: 'Novo Texto', placeholder: undefined } as Partial<LayoutTextElement>)
                    : ({ type: newType, placeholder: '{{produto}}', text: undefined } as Partial<LayoutTextElement>)
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
                onChange={(e) =>
                  handleChange({ placeholder: e.target.value } as Partial<LayoutTextElement>)
                }
                className={inputClass}
                placeholder="{{produto}}"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 mt-3">
            <div>
              <label className={labelClass}>Tamanho da Fonte (px)</label>
              <input
                type="number"
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
              <label className={labelClass}>Peso da Fonte</label>
              <select
                value={selectedElement.fontWeight || 'normal'}
                onChange={(e) =>
                  handleChange({
                    fontWeight: e.target.value as FontWeightType,
                  } as Partial<LayoutTextElement>)
                }
                className={inputClass}
              >
                <option value="normal">Normal</option>
                <option value="bold">Negrito</option>
              </select>
            </div>

            <div>
              <label className={labelClass}>Alinhamento</label>
              <select
                value={selectedElement.textAlign || 'left'}
                onChange={(e) =>
                  handleChange({
                    textAlign: e.target.value as TextAlign,
                  } as Partial<LayoutTextElement>)
                }
                className={inputClass}
              >
                <option value="left">Esquerda</option>
                <option value="center">Centro</option>
                <option value="right">Direita</option>
              </select>
            </div>

            <div>
              <label className={labelClass}>Fonte</label>
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
        </>
      )}

      {/* BARCODE */}
      {isBarcodeElement(selectedElement) && (
        <>
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
                onChange={(e) =>
                  handleChange({ placeholder: e.target.value } as Partial<LayoutBarcodeElement>)
                }
                className={inputClass}
                placeholder="{{codigoBarras}}"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 mt-3">
            <div>
              <label className={labelClass}>Tipo de Código</label>
              <select
                value={selectedElement.barcodeType}
                onChange={(e) =>
                  handleChange({
                    barcodeType: e.target.value as BarcodeType,
                  } as Partial<LayoutBarcodeElement>)
                }
                className={inputClass}
              >
                <option value="CODE128">CODE128</option>
                <option value="EAN13">EAN13</option>
                <option value="EAN14">EAN14</option>
                <option value="CODE39">CODE39</option>
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
                      ? ({ valueMode: mode, text: '', placeholder: undefined } as Partial<LayoutBarcodeElement>)
                      : ({ valueMode: mode, placeholder: '{{codigoBarras}}', text: undefined } as Partial<LayoutBarcodeElement>)
                  );
                }}
                className={inputClass}
              >
                <option value="fixed">Fixo</option>
                <option value="dynamic">Dinâmico</option>
              </select>
            </div>

            <div className="col-span-2 flex items-center gap-2 pt-2">
              <input
                id="showHumanReadable"
                type="checkbox"
                checked={selectedElement.showHumanReadable ?? true}
                onChange={(e) =>
                  handleChange({
                    showHumanReadable: e.target.checked,
                  } as Partial<LayoutBarcodeElement>)
                }
                className="rounded border-gray-700 bg-[#131b2f]"
              />
              <label
                htmlFor="showHumanReadable"
                className="text-sm text-gray-300"
              >
                Mostrar valor legível abaixo do código
              </label>
            </div>
          </div>
        </>
      )}

      {/* QRCODE */}
      {isQrCodeElement(selectedElement) && (
        <>
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
                onChange={(e) =>
                  handleChange({ placeholder: e.target.value } as Partial<LayoutQrCodeElement>)
                }
                className={inputClass}
                placeholder="{{codigoBarras}}"
              />
            </div>
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
                    ? ({ valueMode: mode, text: '', placeholder: undefined } as Partial<LayoutQrCodeElement>)
                    : ({ valueMode: mode, placeholder: '{{codigoBarras}}', text: undefined } as Partial<LayoutQrCodeElement>)
                );
              }}
              className={inputClass}
            >
              <option value="fixed">Fixo</option>
              <option value="dynamic">Dinâmico</option>
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
    </div>
  );
};

export default EtiquetaPropertiesPanel;