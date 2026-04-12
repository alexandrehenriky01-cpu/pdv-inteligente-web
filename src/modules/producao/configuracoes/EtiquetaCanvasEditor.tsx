// src/pages/configuracoes/components/layout-etiquetas/EtiquetaCanvasEditor.tsx

import React, { useCallback } from 'react';
import { Rnd } from 'react-rnd';
import { DraggableEvent, DraggableData } from 'react-draggable';
import {
  LayoutElemento,
  BarcodeType,
  barcodeExibirNumeracao,
  qrcodeExibirLegenda,
} from '../types/etiquetas';
import {
  textoExemploParaVariavel,
  textoExemploParaPlaceholder,
} from '../types/variaveisEtiqueta';

function textoPreviewParaElemento(el: LayoutElemento): string {
  switch (el.type) {
    case 'text':
      return el.text;
    case 'dynamic_text':
      if (el.variavel) return textoExemploParaVariavel(el.variavel);
      return textoExemploParaPlaceholder(el.placeholder);
    case 'barcode':
      if (el.valueMode === 'fixed') return el.text;
      if (el.variavel) return textoExemploParaVariavel(el.variavel);
      return textoExemploParaPlaceholder(el.placeholder);
    case 'qrcode':
      if (el.valueMode === 'fixed') return el.text;
      if (el.variavel) return textoExemploParaVariavel(el.variavel);
      return textoExemploParaPlaceholder(el.placeholder);
    case 'image':
      return '';
    default:
      return '';
  }
}

function estiloListrasBarcode(
  barcodeType: BarcodeType,
  inverted: boolean,
): React.CSSProperties {
  const fg = inverted ? '#ffffff' : '#000000';
  const bg = inverted ? '#000000' : '#ffffff';
  let stripe = 2;
  let gap = 2;
  if (barcodeType === 'ITF14' || barcodeType === 'EAN14') {
    stripe = 1;
    gap = 1;
  } else if (barcodeType === 'EAN13' || barcodeType === 'EAN8') {
    stripe = 2;
    gap = 3;
  }
  return {
    backgroundImage: `repeating-linear-gradient(90deg, ${fg}, ${fg} ${stripe}px, ${bg} ${stripe}px, ${bg} ${stripe + gap}px)`,
  };
}

// ============================================================================
// 1. COMPONENTE ISOLADO E MEMOIZADO (Otimização de Performance O(1))
// ============================================================================

interface ElementProps {
  el: LayoutElemento;
  isSelected: boolean;
  onSelect: (id: string | null) => void;
  onUpdateElement: (id: string, updates: Partial<LayoutElemento>) => void;
}

const CanvasElement = React.memo(({ el, isSelected, onSelect, onUpdateElement }: ElementProps) => {
  
  const renderConteudo = () => {
    switch (el.type) {
      case 'text':
      case 'dynamic_text': {
        const inv = el.inverted === true;
        return (
          <div
            className="w-full h-full flex items-center overflow-hidden px-1 box-border"
            style={{
              fontSize: `${el.fontSize || 24}px`,
              fontWeight: el.fontWeight || 'normal',
              fontStyle: el.fontStyle || 'normal',
              fontFamily: el.fontFamily || 'Arial, sans-serif',
              justifyContent: el.textAlign === 'center' ? 'center' : el.textAlign === 'right' ? 'flex-end' : 'flex-start',
              textAlign: el.textAlign || 'left',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              ...(inv
                ? { backgroundColor: '#000000', color: '#ffffff', padding: '2px 4px' }
                : { color: '#000000' }),
            }}
          >
            {el.type === 'text' ? el.text : textoPreviewParaElemento(el)}
          </div>
        );
      }

      case 'barcode': {
        const inv = el.inverted === true;
        const mostrarNumeracao = barcodeExibirNumeracao(el);
        return (
          <div
            className={`w-full h-full flex flex-col items-center justify-between border border-dashed p-1 overflow-hidden box-border ${
              inv ? 'border-gray-600 bg-black' : 'border-gray-400 bg-white'
            }`}
          >
            <div
              className="w-full flex-1 min-h-[12px] flex items-stretch"
              style={estiloListrasBarcode(el.barcodeType, inv)}
            />
            {mostrarNumeracao ? (
              <div
                className={`w-full text-center text-[10px] mt-1 leading-none tracking-wide truncate shrink-0 ${
                  inv ? 'text-white' : 'text-black'
                }`}
              >
                {textoPreviewParaElemento(el) || 'Código de barras'}
              </div>
            ) : null}
          </div>
        );
      }

      case 'qrcode': {
        const inv = el.inverted === true;
        const fg = inv ? '#ffffff' : '#000000';
        const bgCell = inv ? '#000000' : '#ffffff';
        const mostrarLegenda = qrcodeExibirLegenda(el);
        return (
          <div
            className={`w-full h-full border border-dashed flex flex-col items-stretch justify-between p-1 overflow-hidden box-border ${
              inv ? 'border-gray-600 bg-black' : 'border-gray-400 bg-white'
            }`}
          >
            <div className="flex-1 min-h-0 flex flex-col items-center justify-center gap-0.5">
              <div
                className="w-[70%] max-w-[90%] aspect-square"
                style={{
                  backgroundImage: `linear-gradient(45deg, ${fg} 25%, transparent 25%, transparent 75%, ${fg} 75%, ${fg}), linear-gradient(45deg, ${fg} 25%, transparent 25%, transparent 75%, ${fg} 75%, ${fg})`,
                  backgroundColor: bgCell,
                  backgroundSize: '8px 8px',
                  backgroundPosition: '0 0, 4px 4px',
                }}
              />
              <span className={`text-[8px] font-bold tracking-wider ${inv ? 'text-white' : 'text-black'}`}>
                QR CODE
              </span>
            </div>
            {mostrarLegenda ? (
              <span
                className={`text-[9px] leading-none text-center truncate w-full shrink-0 pt-0.5 ${inv ? 'text-gray-200' : 'text-black'}`}
              >
                {textoPreviewParaElemento(el) || 'QR'}
              </span>
            ) : null}
          </div>
        );
      }

      case 'line': {
        const horizontal = el.width >= el.height;
        const inv = el.inverted === true;
        return (
          <div
            className={`w-full h-full flex items-center justify-center box-border ${inv ? 'bg-black' : 'bg-transparent'}`}
          >
            <div
              style={{
                width: horizontal ? '100%' : `${el.lineThickness || 2}px`,
                height: horizontal ? `${el.lineThickness || 2}px` : '100%',
                backgroundColor: inv ? '#ffffff' : '#000000',
              }}
            />
          </div>
        );
      }

      case 'rectangle': {
        const inv = el.inverted === true;
        return (
          <div
            className="w-full h-full box-border"
            style={
              inv
                ? {
                    backgroundColor: '#000000',
                    border: `${el.borderThickness || 2}px solid #ffffff`,
                  }
                : {
                    backgroundColor: 'transparent',
                    border: `${el.borderThickness || 2}px solid #000000`,
                  }
            }
          />
        );
      }

      case 'image':
        return (
          <div className="w-full h-full overflow-hidden bg-white/80 box-border flex items-center justify-center border border-dashed border-gray-400">
            {el.src ? (
              <img
                src={el.src}
                alt=""
                className="max-w-full max-h-full pointer-events-none"
                style={{
                  objectFit: el.objectFit || 'contain',
                  width: '100%',
                  height: '100%',
                  borderRadius: el.borderRadius ? `${el.borderRadius}px` : undefined,
                }}
                draggable={false}
              />
            ) : (
              <span className="text-[10px] text-gray-500 text-center px-1">Clique no inspetor para enviar imagem (ex.: selo SIM)</span>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Rnd
      size={{ width: el.width, height: el.height }}
      position={{ x: el.x, y: el.y }}
      disableDragging={el.locked === true}
      enableResizing={el.locked !== true}
      bounds="parent"
      dragGrid={[10, 10]}
      resizeGrid={[10, 10]}
      minWidth={10}
      minHeight={10}
      style={{ zIndex: el.zIndex || 0 }}
      className={`absolute group ${
        isSelected ? 'ring-2 ring-purple-500 ring-offset-1 ring-offset-white' : 'hover:ring-1 hover:ring-purple-400/50'
      }`}
      onClick={(e: React.MouseEvent<HTMLElement>) => {
        e.stopPropagation();
        onSelect(el.id);
      }}
      onDragStart={(e: DraggableEvent) => {
        e.stopPropagation();
        onSelect(el.id);
      }}
      onDragStop={(e: DraggableEvent, d: DraggableData) => {
        e.stopPropagation();
        // Só dispara update se realmente moveu
        if (d.x !== el.x || d.y !== el.y) {
          onUpdateElement(el.id, { x: Math.round(d.x), y: Math.round(d.y) });
        }
      }}
      onResizeStart={(e: React.MouseEvent<HTMLElement> | React.TouchEvent<HTMLElement>) => {
        e.stopPropagation();
        onSelect(el.id);
      }}
      onResizeStop={(e, _direction, ref, _delta, position) => {
        e.stopPropagation();
        const newWidth = Number(ref.style.width.replace('px', '')) || el.width;
        const newHeight = Number(ref.style.height.replace('px', '')) || el.height;
        
        onUpdateElement(el.id, {
          width: Math.round(newWidth),
          height: Math.round(newHeight),
          x: Math.round(position.x),
          y: Math.round(position.y),
        });
      }}
    >
      <div 
        className="w-full h-full overflow-hidden relative select-none cursor-pointer"
        style={{
          transform: `rotate(${el.rotation || 0}deg)`,
          transformOrigin: 'center center',
        }}
      >
        {renderConteudo()}
        {isSelected && <div className="absolute inset-0 border border-purple-500 pointer-events-none" />}
        {el.locked && (
          <div className="absolute top-1 right-1 text-[10px] bg-black/70 text-white px-1.5 py-0.5 rounded pointer-events-none">
            LOCK
          </div>
        )}
      </div>
    </Rnd>
  );
}, (prevProps, nextProps) => {
  // Custom equality check: Só re-renderiza se o elemento mudou ou se o status de seleção mudou
  return (
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.el === nextProps.el
  );
});

// ============================================================================
// 2. COMPONENTE PAI (CANVAS)
// ============================================================================

interface Props {
  elements: LayoutElemento[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onUpdateElement: (id: string, updates: Partial<LayoutElemento>) => void;
}

const EtiquetaCanvasEditor: React.FC<Props> = ({
  elements,
  selectedId,
  onSelect,
  onUpdateElement,
}) => {
  const elementosOrdenados = [...elements].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));

  // useCallback evita que a função mude a cada render e quebre a memoização dos filhos
  const handleDeselect = useCallback(() => {
    onSelect(null);
  }, [onSelect]);

  return (
    <div
      className="w-full h-full absolute inset-0 bg-white"
      onClick={handleDeselect}
    >
      {elementosOrdenados.map((el) => {
        if (el.visible === false) return null;

        return (
          <CanvasElement
            key={el.id}
            el={el}
            isSelected={selectedId === el.id}
            onSelect={onSelect}
            onUpdateElement={onUpdateElement}
          />
        );
      })}
    </div>
  );
};

export default React.memo(EtiquetaCanvasEditor);