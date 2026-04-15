import { ArrowLeft, Loader2, UtensilsCrossed } from 'lucide-react';
import type { MesaApi } from './types';
import { isMesaOcupada, subtotalMesa } from './types';

interface MesaComandaPickerGridProps {
  celulas: MesaApi[];
  carregando: boolean;
  onBack: () => void;
  onSelectMesa: (numero: number) => void;
}

export function MesaComandaPickerGrid({
  celulas,
  carregando,
  onBack,
  onSelectMesa,
}: MesaComandaPickerGridProps) {
  return (
    <div className="min-h-screen bg-[#060816] p-4 pb-20 text-slate-100">
      <div className="mb-6 flex items-center gap-3 pt-2">
        <button
          type="button"
          onClick={onBack}
          className="rounded-full border border-white/10 bg-white/5 p-2 text-slate-300"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-xl font-black text-white">Comanda Digital</h1>
          <p className="text-xs uppercase tracking-widest text-slate-400">Selecione a Mesa</p>
        </div>
      </div>

      {carregando ? (
        <div className="flex flex-col items-center gap-3 py-16">
          <Loader2 className="h-10 w-10 animate-spin text-violet-300" />
          <p className="text-sm text-white/50">Carregando mesas…</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {celulas.map((m) => {
            const ocupada = isMesaOcupada(m);
            const sub = subtotalMesa(m);
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => onSelectMesa(m.numero)}
                className={`flex aspect-square flex-col items-center justify-center gap-1 rounded-2xl border transition-transform active:scale-95 ${
                  ocupada
                    ? 'border-emerald-500/35 bg-emerald-500/10 hover:bg-emerald-500/15'
                    : 'border-white/10 bg-[#08101f] hover:bg-white/5'
                }`}
              >
                <UtensilsCrossed
                  className={`mb-1 h-6 w-6 ${ocupada ? 'text-emerald-300' : 'text-violet-300'}`}
                />
                <span className="text-2xl font-black text-white">{m.numero}</span>
                {ocupada ? (
                  <span className="max-w-full truncate px-1 text-[10px] font-semibold text-emerald-200/90">
                    {sub.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                ) : (
                  <span className="text-[10px] font-medium text-slate-500">Livre</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
