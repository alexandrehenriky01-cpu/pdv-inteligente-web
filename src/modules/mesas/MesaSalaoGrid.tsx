import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import type { MesaApi } from './types';
import { isMesaOcupada, subtotalMesa } from './types';

interface MesaSalaoGridProps {
  celulas: MesaApi[];
  carregando: boolean;
  onRefetch: () => void;
  mesaPath?: (numero: number) => string;
}

export function MesaSalaoGrid({
  celulas,
  carregando,
  onRefetch,
  mesaPath = (n) => `/garcom/mesa/${n}`,
}: MesaSalaoGridProps) {
  return (
    <div className="flex flex-col gap-4 px-3 py-4 pb-8">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-black text-white">Mesas</h2>
        <button
          type="button"
          onClick={() => void onRefetch()}
          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-slate-200"
        >
          Atualizar
        </button>
      </div>

      {carregando ? (
        <div className="flex flex-col items-center gap-3 py-16">
          <Loader2 className="h-10 w-10 animate-spin text-emerald-400" />
          <p className="text-sm text-white/50">Carregando salão…</p>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {celulas.map((m) => {
            const ocupada = isMesaOcupada(m);
            const sub = subtotalMesa(m);
            return (
              <li key={m.id}>
                <Link
                  to={mesaPath(m.numero)}
                  className={`flex min-h-[5.5rem] flex-col rounded-2xl border p-4 transition active:scale-[0.98] ${
                    ocupada
                      ? 'border-emerald-500/40 bg-emerald-500/15 shadow-[0_8px_28px_rgba(16,185,129,0.18)]'
                      : 'border-white/10 bg-white/[0.04] hover:border-white/20'
                  }`}
                >
                  <span className="text-xs font-bold uppercase tracking-wider text-white/45">Mesa</span>
                  <span className="text-2xl font-black tabular-nums text-white">
                    {String(m.numero).padStart(2, '0')}
                  </span>
                  {ocupada ? (
                    <span className="mt-1 text-xs font-semibold text-emerald-200/95">
                      {sub.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                  ) : (
                    <span className="mt-1 text-xs text-slate-500">Livre</span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
