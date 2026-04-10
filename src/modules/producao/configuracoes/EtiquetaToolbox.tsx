// src/pages/configuracoes/components/layout-etiquetas/EtiquetaToolbox.tsx

import React from 'react';
import { Barcode, QrCode, RectangleHorizontal, Type, Minus, Variable } from 'lucide-react';
import { EtiquetaElementType } from '../types/etiquetas';

interface Props {
  onAddElement: (type: EtiquetaElementType) => void;
}

interface ToolItem {
  type: EtiquetaElementType;
  label: string;
  description: string;
  icon: React.ReactNode;
}

const tools: ToolItem[] = [
  {
    type: 'text',
    label: 'Texto Fixo',
    description: 'Texto estático',
    icon: <Type size={18} />,
  },
  {
    type: 'dynamic_text',
    label: 'Texto Dinâmico',
    description: 'Com placeholder',
    icon: <Variable size={18} />,
  },
  {
    type: 'barcode',
    label: 'Cód. Barras',
    description: 'EAN / CODE128',
    icon: <Barcode size={18} />,
  },
  {
    type: 'qrcode',
    label: 'QR Code',
    description: 'Código 2D',
    icon: <QrCode size={18} />,
  },
  {
    type: 'line',
    label: 'Linha',
    description: 'Separador visual',
    icon: <Minus size={18} />,
  },
  {
    type: 'rectangle',
    label: 'Retângulo',
    description: 'Borda / bloco',
    icon: <RectangleHorizontal size={18} />,
  },
];

const EtiquetaToolbox: React.FC<Props> = ({ onAddElement }) => {
  return (
    <div className="space-y-4">
      <div className="border-b border-gray-800 pb-2">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
          Inserir Elementos
        </h3>
        <p className="text-xs text-gray-500 mt-2 leading-relaxed">
          Clique em um item para adicionar um novo elemento ao canvas da etiqueta.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {tools.map((tool) => (
          <button
            key={tool.type}
            type="button"
            onClick={() => onAddElement(tool.type)}
            className="group flex flex-col items-center justify-center rounded-xl border border-gray-700/50 bg-[#131b2f] p-3 text-center transition-all hover:border-purple-500/50 hover:bg-[#1a233a] hover:shadow-lg hover:shadow-purple-500/10"
          >
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-purple-400 transition-colors group-hover:bg-purple-500/10 group-hover:text-purple-300">
              {tool.icon}
            </div>

            <span className="text-sm font-medium text-gray-200 leading-tight">
              {tool.label}
            </span>

            <span className="mt-1 text-[11px] text-gray-500 leading-tight">
              {tool.description}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default EtiquetaToolbox;