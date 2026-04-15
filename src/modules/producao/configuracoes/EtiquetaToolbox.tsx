import { useState, type FC, type ReactNode } from 'react';
import {
  Barcode,
  QrCode,
  RectangleHorizontal,
  Type,
  Minus,
  Variable,
  ChevronDown,
  ChevronRight,
  ImageIcon,
} from 'lucide-react';
import { EtiquetaElementType } from '../types/etiquetas';
import {
  VARIAVEIS_ETIQUETA_SECOES,
  type VariavelEtiquetaDef,
} from '../types/variaveisEtiqueta';

interface Props {
  onAddElement: (type: EtiquetaElementType) => void;
  onAddVariavel: (def: VariavelEtiquetaDef) => void;
}

interface ToolItem {
  type: EtiquetaElementType;
  label: string;
  description: string;
  icon: ReactNode;
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
    description: 'Com placeholder manual',
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
  {
    type: 'image',
    label: 'Logomarca / imagem',
    description: 'Selo SIM, marca',
    icon: <ImageIcon size={18} />,
  },
];

const EtiquetaToolbox: FC<Props> = ({ onAddElement, onAddVariavel }) => {
  const [aberto, setAberto] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(VARIAVEIS_ETIQUETA_SECOES.map((s) => [s.id, true])),
  );

  const toggleSecao = (id: string) => {
    setAberto((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-800 pb-2">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
          Inserir elementos
        </h3>
        <p className="text-xs text-gray-500 mt-2 leading-relaxed">
          Use as variáveis abaixo para campos do cadastro e da produção, ou os blocos genéricos.
        </p>
      </div>

      <div className="space-y-2">
        <h4 className="text-[11px] font-bold text-violet-400/90 uppercase tracking-wider">
          Variáveis dinâmicas
        </h4>
        {VARIAVEIS_ETIQUETA_SECOES.map((secao) => {
          const expandido = aberto[secao.id] !== false;
          return (
            <div
              key={secao.id}
              className="rounded-lg border border-gray-700/50 bg-[#131b2f]/80 overflow-hidden"
            >
              <button
                type="button"
                onClick={() => toggleSecao(secao.id)}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-sm font-medium text-gray-200 hover:bg-white/5 transition-colors"
              >
                {expandido ? (
                  <ChevronDown size={16} className="text-violet-400 shrink-0" />
                ) : (
                  <ChevronRight size={16} className="text-gray-500 shrink-0" />
                )}
                {secao.titulo}
                <span className="ml-auto text-[10px] text-gray-500 font-normal">
                  {secao.itens.length}
                </span>
              </button>
              {expandido && (
                <div className="px-2 pb-2 pt-0 flex flex-col gap-1 max-h-64 overflow-y-auto custom-scrollbar">
                  {secao.itens.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onAddVariavel(item)}
                      className="text-left rounded-md px-2 py-1.5 text-xs text-gray-300 hover:bg-violet-500/15 hover:text-white border border-transparent hover:border-violet-500/20 transition-colors"
                    >
                      <span className="block font-medium leading-tight">{item.label}</span>
                      <span className="block text-[10px] text-gray-500 font-mono mt-0.5 truncate">
                        {item.id}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div>
        <h4 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-3">
          Blocos genéricos
        </h4>
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
              <span className="text-sm font-medium text-gray-200 leading-tight">{tool.label}</span>
              <span className="mt-1 text-[11px] text-gray-500 leading-tight">{tool.description}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default EtiquetaToolbox;
