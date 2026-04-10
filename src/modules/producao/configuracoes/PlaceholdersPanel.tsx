// src/pages/configuracoes/components/layout-etiquetas/PlaceholdersPanel.tsx

import React from 'react';
import { PLACEHOLDERS_DISPONIVEIS } from '../types/etiquetas'; // Ajuste o caminho de importação se necessário

// Mapeamento amigável (Dicionário) apenas para a UI (títulos e descrições)
// Se no futuro uma chave nova aparecer no types.ts e não estiver aqui, 
// o componente fará um fallback elegante para não quebrar.
const PLACEHOLDER_INFO: Record<string, { label: string; description: string }> = {
  '{{produto}}': { label: 'Produto', description: 'Nome do produto' },
  '{{peso}}': { label: 'Peso', description: 'Peso da pesagem' },
  '{{validade}}': { label: 'Validade', description: 'Data de validade' },
  '{{lote}}': { label: 'Lote', description: 'Número do lote' },
  '{{dataProducao}}': { label: 'Data de Produção', description: 'Data de fabricação/produção' },
  '{{quantidadePecas}}': { label: 'Quantidade de Peças', description: 'Quantidade de unidades/peças' },
  '{{codigoBarras}}': { label: 'Código de Barras', description: 'Valor do código de barras' },
  '{{op}}': { label: 'OP', description: 'Ordem de produção' },
  '{{dataAtual}}': { label: 'Data Atual', description: 'Data atual do sistema' },
  '{{horaAtual}}': { label: 'Hora Atual', description: 'Hora atual do sistema' },
};

interface Props {
  onInsertPlaceholder: (placeholder: string) => void;
}

const PlaceholdersPanel: React.FC<Props> = ({ onInsertPlaceholder }) => {
  return (
    <div className="space-y-4">
      <div className="border-b border-gray-800 pb-2">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
          Variáveis do Sistema
        </h3>
        <p className="text-xs text-gray-500 mt-2 leading-relaxed">
          Selecione um elemento compatível no canvas e clique em uma variável para inserir o valor dinâmico.
        </p>
      </div>

      <div className="flex flex-col gap-2 overflow-y-auto custom-scrollbar max-h-[60vh] pr-2">
        {/* BLINDAGEM: Mapeando direto da Fonte Oficial da Verdade (types.ts) */}
        {PLACEHOLDERS_DISPONIVEIS.map((key) => {
          // Fallback inteligente caso alguém crie a variável no backend mas esqueça a descrição aqui
          const info = PLACEHOLDER_INFO[key] || { 
            label: key.replace(/[{}]/g, ''), 
            description: 'Variável dinâmica do sistema' 
          };

          return (
            <button
              key={key}
              type="button"
              onClick={() => onInsertPlaceholder(key)}
              className="w-full rounded-xl border border-gray-700/50 bg-[#131b2f] px-3 py-3 text-left transition-all duration-200 hover:border-pink-500/50 hover:bg-[#172038] group"
            >
              <div className="text-sm font-medium text-gray-200 group-hover:text-pink-400 transition-colors">
                {info.label}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">
                {info.description}
              </div>
              <div className="mt-2 font-mono text-xs text-pink-400/70 group-hover:text-pink-400 transition-colors">
                {key}
              </div>
            </button>
          );
        })}
      </div>

      <div className="rounded-xl border border-violet-500/10 bg-violet-500/5 p-3">
        <p className="text-xs text-gray-400 leading-relaxed">
          Dica: use placeholders em elementos de texto, texto dinâmico, barcode e qrcode para montar etiquetas inteligentes.
        </p>
      </div>
    </div>
  );
};

export default PlaceholdersPanel;