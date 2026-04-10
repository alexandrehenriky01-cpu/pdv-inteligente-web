// src/pages/configuracoes/components/layout-etiquetas/EtiquetaCanvasEditor.tsx

import React, { useCallback } from 'react';
import { Rnd } from 'react-rnd';
import { DraggableEvent, DraggableData } from 'react-draggable';
import { LayoutElemento } from '../types/etiquetas';

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
      case 'dynamic_text':
        return (
          <div
            className="w-full h-full flex items-center overflow-hidden px-1"
            style={{
              fontSize: `${el.fontSize || 24}px`,
              fontWeight: el.fontWeight || 'normal',
              fontFamily: el.fontFamily || 'Arial, sans-serif',
              justifyContent: el.textAlign === 'center' ? 'center' : el.textAlign === 'right' ? 'flex-end' : 'flex-start',
              textAlign: el.textAlign || 'left',
              color: '#000000',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {el.type === 'text' ? el.text : el.placeholder || 'Texto'}
          </div>
        );

      case 'barcode':
        return (
          <div className="w-full h-full flex flex-col items-center justify-between border border-dashed border-gray-400 bg-white p-1 overflow-hidden">
            <div className="w-full flex-1 bg-[repeating-linear-gradient(90deg,#000,#000_2px,transparent_2px,transparent_4px)]" />
            <span className="text-[10px] text-black mt-1 leading-none text-center truncate w-full">
              {el.valueMode === 'fixed' ? el.text : el.placeholder || 'Código de barras'}
            </span>
          </div>
        );

      case 'qrcode':
        return (
          <div className="w-full h-full border border-dashed border-gray-400 bg-white flex items-center justify-center p-1 overflow-hidden">
            <div
              className="w-full h-full bg-[linear-gradient(45deg,#000_25%,transparent_25%,transparent_75%,#000_75%,#000),linear-gradient(45deg,#000_25%,transparent_25%,transparent_75%,#000_75%,#000)]"
              style={{ backgroundSize: '10px 10px', backgroundPosition: '0 0, 5px 5px' }}
            />
          </div>
        );

      case 'line': {
        const horizontal = el.width >= el.height;
        return (
          <div className="w-full h-full flex items-center justify-center bg-transparent">
            <div
              style={{
                width: horizontal ? '100%' : `${el.lineThickness || 2}px`,
                height: horizontal ? `${el.lineThickness || 2}px` : '100%',
                backgroundColor: '#000000',
              }}
            />
          </div>
        );
      }

      case 'rectangle':
        return (
          <div
            className="w-full h-full bg-transparent box-border"
            style={{ border: `${el.borderThickness || 2}px solid #000000` }}
          />
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