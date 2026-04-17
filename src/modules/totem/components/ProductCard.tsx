import { Plus } from 'lucide-react';
import type { TotemMockProduto } from '../types';

function formatBrl(n: number): string {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

interface ProductCardProps {
  produto: TotemMockProduto;
  onSelect: (p: TotemMockProduto) => void;
}

const PLACEHOLDER_FALLBACK = 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&q=80';

export function ProductCard({ produto, onSelect }: ProductCardProps) {
  const temImagemReal = produto.imagemUrl && !produto.imagemUrl.includes('unsplash.com/photo-1546069901-ba9599a7');

  return (
    <button
      type="button"
      onClick={() => onSelect(produto)}
      className="group relative flex w-full flex-col overflow-hidden rounded-[30px] border border-white/10 bg-[#08101f] text-left shadow-[0_25px_60px_rgba(0,0,0,0.4)] backdrop-blur-xl transition-all duration-500 hover:border-violet-400/40 hover:shadow-[0_32px_72px_rgba(139,92,246,0.15)] active:scale-[0.98]"
    >
      <div className="relative h-48 w-full overflow-hidden">
        {temImagemReal ? (
          <img
            src={produto.imagemUrl}
            alt={produto.nome}
            className="h-full w-full object-cover transition-all duration-700 group-hover:scale-110 group-hover:saturate-110"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-slate-800 via-slate-800/90 to-violet-900/30">
            <div className="flex h-full w-full items-center justify-center">
              <svg
                className="h-20 w-20 text-white/10"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5v-9l6 4.5-6 4.5z" />
              </svg>
            </div>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#060816]/95 via-[#060816]/20 to-transparent" />
        {!temImagemReal && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/40 backdrop-blur-sm">
              {produto.categoriaId.replace('-', ' ')}
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-5">
        <h3 className="line-clamp-2 text-xl font-bold leading-tight text-white">
          {produto.nome}
        </h3>
        <p className="line-clamp-2 text-sm leading-relaxed text-white/50">
          {produto.descricaoCurta}
        </p>

        <div className="mt-auto flex items-end justify-between pt-2">
          <p className="text-2xl font-black text-emerald-400">
            {formatBrl(produto.precoBase)}
          </p>
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-purple-600 text-white shadow-[0_8px_24px_rgba(139,92,246,0.4)] transition-all duration-300 group-hover:scale-110 group-hover:shadow-[0_12px_32px_rgba(139,92,246,0.5)]">
            <Plus className="h-5 w-5" strokeWidth={2.5} />
          </div>
        </div>
      </div>
    </button>
  );
}
