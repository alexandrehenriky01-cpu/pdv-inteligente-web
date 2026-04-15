import type { TotemMockProduto } from '../types';

function formatBrl(n: number): string {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

interface ProductCardProps {
  produto: TotemMockProduto;
  onSelect: (p: TotemMockProduto) => void;
}

export function ProductCard({ produto, onSelect }: ProductCardProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(produto)}
      className="group flex w-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.06] text-left shadow-[0_16px_48px_rgba(0,0,0,0.35)] backdrop-blur-xl transition hover:border-violet-400/35 hover:bg-white/[0.09] active:scale-[0.98]"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden">
        <img
          src={produto.imagemUrl}
          alt={produto.nome}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#060816]/90 via-transparent to-transparent" />
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4 pt-3">
        <h3 className="line-clamp-2 text-lg font-semibold leading-snug text-white">
          {produto.nome}
        </h3>
        <p className="line-clamp-2 text-sm leading-relaxed text-white/55">{produto.descricaoCurta}</p>
        <p className="mt-auto pt-1 text-lg font-semibold text-violet-200">
          {formatBrl(produto.precoBase)}
        </p>
      </div>
    </button>
  );
}
