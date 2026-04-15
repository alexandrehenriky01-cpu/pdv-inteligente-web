import { useNavigate } from 'react-router-dom';
import { ChefHat, HandPlatter, Sparkles, UtensilsCrossed } from 'lucide-react';
import { useTotemStore } from '../store/totemStore';
import type { TotemTipoConsumo } from '../types';

export function TotemWelcomePage() {
  const navigate = useNavigate();
  const tipoConsumo = useTotemStore((s) => s.tipoConsumo);
  const setTipoConsumo = useTotemStore((s) => s.setTipoConsumo);
  const setFluxoIniciado = useTotemStore((s) => s.setFluxoIniciado);

  const selecionarTipo = (t: TotemTipoConsumo) => {
    setTipoConsumo(t);
  };

  const iniciar = () => {
    if (!tipoConsumo) return;
    setFluxoIniciado(true);
    navigate('/totem-food/cardapio');
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 py-10">
      <div className="mb-10 flex flex-col items-center text-center">
        <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-3xl border border-white/10 bg-white/[0.07] shadow-[0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur-xl">
          <Sparkles className="h-12 w-12 text-violet-300" strokeWidth={1.25} />
        </div>
        <p className="mb-2 text-sm font-medium uppercase tracking-[0.2em] text-violet-300/90">
          Aurya Food
        </p>
        <h1 className="max-w-xl text-4xl font-semibold leading-tight tracking-tight text-white md:text-5xl">
          Bem-vindo ao totem
        </h1>
        <p className="mt-4 max-w-md text-base text-white/60">
          Toque para montar seu pedido com o cardápio premium da loja.
        </p>
      </div>

      <div className="mb-10 w-full max-w-lg space-y-3">
        <p className="text-center text-sm font-medium text-white/50">Como você vai consumir?</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => selecionarTipo('LOCAL')}
            className={`flex min-h-[4.5rem] items-center justify-center gap-3 rounded-2xl border px-4 py-4 text-left transition-all active:scale-[0.98] ${
              tipoConsumo === 'LOCAL'
                ? 'border-violet-400/60 bg-violet-500/20 shadow-[0_0_24px_rgba(139,92,246,0.25)]'
                : 'border-white/10 bg-white/[0.06] backdrop-blur-xl hover:border-white/20'
            }`}
          >
            <UtensilsCrossed className="h-8 w-8 shrink-0 text-violet-200" />
            <div>
              <div className="text-lg font-semibold">Comer aqui</div>
              <div className="text-sm text-white/55">Consumo no salão</div>
            </div>
          </button>
          <button
            type="button"
            onClick={() => selecionarTipo('VIAGEM')}
            className={`flex min-h-[4.5rem] items-center justify-center gap-3 rounded-2xl border px-4 py-4 text-left transition-all active:scale-[0.98] ${
              tipoConsumo === 'VIAGEM'
                ? 'border-violet-400/60 bg-violet-500/20 shadow-[0_0_24px_rgba(139,92,246,0.25)]'
                : 'border-white/10 bg-white/[0.06] backdrop-blur-xl hover:border-white/20'
            }`}
          >
            <HandPlatter className="h-8 w-8 shrink-0 text-violet-200" />
            <div>
              <div className="text-lg font-semibold">Levar</div>
              <div className="text-sm text-white/55">Embalagem para viagem</div>
            </div>
          </button>
        </div>
      </div>

      <button
        type="button"
        disabled={!tipoConsumo}
        onClick={iniciar}
        className="group relative flex min-h-[4rem] w-full max-w-lg items-center justify-center gap-3 overflow-hidden rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 px-8 text-lg font-semibold text-white shadow-[0_20px_50px_rgba(109,40,217,0.45)] transition enabled:active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
      >
        <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/15 to-white/0 opacity-0 transition group-hover:opacity-100" />
        <ChefHat className="relative h-7 w-7" />
        <span className="relative">Toque para iniciar</span>
      </button>
    </div>
  );
}
