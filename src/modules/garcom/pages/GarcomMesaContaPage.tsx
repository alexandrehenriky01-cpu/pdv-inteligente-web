import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Plus } from 'lucide-react';
import { api } from '../../../services/api';
import { toast } from 'react-toastify';
import type { ItemMesaApi, MesaApi } from '../../mesas/types';

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function GarcomMesaContaPage() {
  const { numeroMesa } = useParams<{ numeroMesa: string }>();
  const n = Number(numeroMesa);
  const mesaOk = Number.isFinite(n) && n > 0;

  const [mesas, setMesas] = useState<MesaApi[]>([]);
  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const { data } = await api.get<MesaApi[]>('/api/mesas');
      setMesas(Array.isArray(data) ? data : []);
    } catch {
      toast.error('Não foi possível carregar a mesa.');
      setMesas([]);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const mesa = useMemo(() => mesas.find((m) => m.numero === n), [mesas, n]);

  const subtotal = useMemo(() => {
    if (!mesa?.itens?.length) return 0;
    return mesa.itens.reduce((s, it) => s + num(it.valorTotal), 0);
  }, [mesa]);

  if (!mesaOk) {
    return (
      <div className="px-4 py-8 text-center text-slate-400">
        <p>Número de mesa inválido.</p>
        <Link to="/garcom/mesas" className="mt-4 inline-block text-emerald-400">
          Voltar
        </Link>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-[calc(100vh-4rem)] flex-col pb-28">
      <div className="flex items-center gap-2 border-b border-white/10 px-3 py-3">
        <Link
          to="/garcom/mesas"
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-black text-white">Mesa {String(n).padStart(2, '0')}</h2>
          <p className="text-xs text-slate-500">Conta parcial · sem fechamento fiscal</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Subtotal</p>
          <p className="text-sm font-black text-emerald-300">
            {subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
        </div>
      </div>

      {carregando ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16">
          <Loader2 className="h-10 w-10 animate-spin text-emerald-400" />
        </div>
      ) : !mesa || mesa.itens.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
          <p className="text-slate-400">Nenhum item nesta mesa ainda.</p>
          <p className="mt-2 text-sm text-slate-500">Toque em &quot;Adicionar itens&quot; para lançar o cardápio.</p>
        </div>
      ) : (
        <ul className="flex-1 divide-y divide-white/10 px-3">
          {mesa.itens.map((it: ItemMesaApi) => (
            <li key={it.id} className="flex gap-3 py-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-sm font-black text-white">
                {num(it.quantidade)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-white">
                  {it.itemCardapio?.nome ?? it.produto.nome}
                </p>
                {it.observacao ? (
                  <p className="mt-1 text-xs italic text-amber-200/80">Obs.: {it.observacao}</p>
                ) : null}
              </div>
              <p className="shrink-0 text-sm font-bold text-emerald-200">
                {num(it.valorTotal).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </p>
            </li>
          ))}
        </ul>
      )}

      <div className="fixed bottom-0 left-0 right-0 z-40 flex flex-col items-center gap-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] pointer-events-none">
        <div className="pointer-events-auto w-full max-w-md px-4">
          {mesa && mesa.itens.length > 0 ? (
            <Link
              to={`/garcom/mesa/${n}/fechar`}
              className="mb-2 flex min-h-[3.25rem] items-center justify-center rounded-2xl border border-violet-500/40 bg-violet-500/15 text-base font-black text-violet-100 shadow-[0_8px_28px_rgba(139,92,246,0.2)] transition active:scale-[0.99]"
            >
              Fechar conta / Caixa
            </Link>
          ) : null}
          <Link
            to={`/garcom/mesa/${n}/pedir`}
            className="flex min-h-[3.75rem] items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-lg font-black text-white shadow-[0_14px_40px_rgba(16,185,129,0.4)] transition active:scale-[0.99]"
          >
            <Plus className="h-7 w-7" strokeWidth={2.5} />
            Adicionar itens
          </Link>
        </div>
      </div>
    </div>
  );
}
