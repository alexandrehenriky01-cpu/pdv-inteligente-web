import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Minus, Plus } from 'lucide-react';
import { api } from '../../../services/api';
import { toast } from 'react-toastify';
import { num, type ItemMesaApi, type MesaApi } from '../../mesas/types';

/** Alíquota exibida no resumo (10%). Deve permanecer alinhada ao backend (`TAXA_SERVICO_PADRAO`). */
const TAXA_SERVICO_FRACAO = 0.1;

function roundBrl2(n: number): number {
  return Math.round(n * 100) / 100;
}

function fmtBrl(n: number): string {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function GarcomFechamentoPage() {
  const { numeroMesa } = useParams<{ numeroMesa: string }>();
  const n = Number(numeroMesa);
  const mesaOk = Number.isFinite(n) && n > 0;

  const [mesas, setMesas] = useState<MesaApi[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);

  /** Taxa de serviço 10% opcional (mesma regra do servidor). */
  const [incluirTaxaServico, setIncluirTaxaServico] = useState(true);
  /** Quantidade de pessoas para o racha-conta (mín. 1). */
  const [pessoas, setPessoas] = useState(1);

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

  /** Subtotal = soma dos itens já lançados (base para taxa e total). */
  const subtotal = useMemo(() => {
    if (!mesa?.itens?.length) return 0;
    return mesa.itens.reduce((s, it) => s + num(it.valorTotal), 0);
  }, [mesa]);

  /**
   * Matemática do resumo (espelha o backend em `MesaService.solicitarFechamentoCaixa`):
   * - taxa = subtotal * 10% se opcional ligada; senão 0
   * - total = subtotal + taxa
   */
  const taxaServico = useMemo(
    () => (incluirTaxaServico ? roundBrl2(subtotal * TAXA_SERVICO_FRACAO) : 0),
    [subtotal, incluirTaxaServico]
  );

  const total = useMemo(() => roundBrl2(subtotal + taxaServico), [subtotal, taxaServico]);

  /**
   * Split (racha-conta): valor por pessoa = total / N, com N >= 1.
   * Arredondamento em centavos (ex.: R$ 100 / 4 = R$ 25,00).
   */
  const pessoasClamped = Math.max(1, Math.min(20, Math.floor(pessoas) || 1));
  const valorPorPessoa = useMemo(
    () => roundBrl2(total / pessoasClamped),
    [total, pessoasClamped]
  );

  const ajustarPessoas = (delta: number) => {
    setPessoas((prev) => {
      const base = Math.max(1, Math.min(20, Math.floor(prev) || 1));
      return Math.max(1, Math.min(20, base + delta));
    });
  };

  /**
   * Disparo do fechamento: PATCH no servidor altera status para FECHANDO (aguardando pagamento)
   * e o backend emite o evento WebSocket `mesa-fechamento-solicitado` (não emitir do browser).
   */
  const solicitarFechamentoNoCaixa = async () => {
    if (!mesaOk || !mesa?.itens?.length) return;
    setEnviando(true);
    try {
      await api.patch(`/api/mesas/${n}/solicitar-fechamento`, {
        incluirTaxaServico,
        pessoas: pessoasClamped,
      });
      toast.success('Caixa notificado! Mesa aguardando pagamento.');
      void carregar();
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? String((err as { response?: { data?: { error?: string } } }).response?.data?.error ?? '')
          : '';
      toast.error(msg || 'Não foi possível solicitar o fechamento.');
    } finally {
      setEnviando(false);
    }
  };

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

  const statusUpper = String(mesa?.status ?? '').toUpperCase();
  const aguardandoCaixa = statusUpper === 'FECHANDO';

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col gap-4 px-3 py-4 pb-28">
      <div className="flex items-center gap-2 border-b border-white/10 pb-3">
        <Link
          to={`/garcom/mesa/${n}`}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-black text-white">Fechar mesa {String(n).padStart(2, '0')}</h2>
          <p className="text-xs text-slate-500">Resumo · solicitar cobrança no caixa</p>
        </div>
      </div>

      {carregando ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16">
          <Loader2 className="h-10 w-10 animate-spin text-emerald-400" />
        </div>
      ) : !mesa || mesa.itens.length === 0 ? (
        <p className="text-center text-slate-400">Sem itens para fechar.</p>
      ) : (
        <>
          <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 space-y-3">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">Resumo da conta</h3>
            <div className="flex justify-between text-sm text-slate-300">
              <span>Subtotal</span>
              <span className="font-mono font-bold text-white">{fmtBrl(subtotal)}</span>
            </div>
            <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
              <span className="text-sm text-slate-200">Taxa de serviço (10%)</span>
              <input
                type="checkbox"
                checked={incluirTaxaServico}
                onChange={(e) => setIncluirTaxaServico(e.target.checked)}
                className="h-5 w-5 accent-emerald-500"
              />
            </label>
            {incluirTaxaServico ? (
              <div className="flex justify-between text-sm text-emerald-200/90">
                <span>Taxa</span>
                <span className="font-mono font-bold">{fmtBrl(taxaServico)}</span>
              </div>
            ) : null}
            <div className="flex justify-between border-t border-white/10 pt-3 text-base font-black text-white">
              <span>Total</span>
              <span className="font-mono text-emerald-300">{fmtBrl(total)}</span>
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">Racha-conta</h3>
            <p className="text-sm text-slate-400">Dividir por quantas pessoas?</p>
            <div className="flex items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => ajustarPessoas(-1)}
                disabled={pessoasClamped <= 1}
                className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-white disabled:opacity-40"
              >
                <Minus className="h-6 w-6" />
              </button>
              <span className="min-w-[3rem] text-center text-3xl font-black tabular-nums text-white">
                {pessoasClamped}
              </span>
              <button
                type="button"
                onClick={() => ajustarPessoas(1)}
                disabled={pessoasClamped >= 20}
                className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-white disabled:opacity-40"
              >
                <Plus className="h-6 w-6" />
              </button>
            </div>
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-center">
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-200/80">Valor por pessoa</p>
              <p className="mt-1 text-2xl font-black tabular-nums text-emerald-300">{fmtBrl(valorPorPessoa)}</p>
              <p className="mt-1 text-[11px] text-emerald-200/70">
                {pessoasClamped} x {fmtBrl(valorPorPessoa)} — soma aprox.{' '}
                {fmtBrl(roundBrl2(valorPorPessoa * pessoasClamped))}
              </p>
            </div>
          </section>

          <ul className="divide-y divide-white/10 rounded-2xl border border-white/10 overflow-hidden">
            <li className="bg-white/[0.03] px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
              Itens
            </li>
            {mesa.itens.map((it: ItemMesaApi) => (
              <li key={it.id} className="flex gap-3 px-3 py-3 text-sm">
                <span className="font-bold text-slate-400">{num(it.quantidade)}x</span>
                <span className="flex-1 text-white">
                  {it.itemCardapio?.nome ?? it.produto.nome}
                </span>
                <span className="font-mono text-emerald-200">{fmtBrl(num(it.valorTotal))}</span>
              </li>
            ))}
          </ul>

          {aguardandoCaixa ? (
            <p className="text-center text-sm text-amber-200/90">
              Esta mesa já está <strong>aguardando pagamento</strong> no caixa. Ajuste o split, se precisar, e toque
              novamente para atualizar o painel.
            </p>
          ) : null}

          <button
            type="button"
            disabled={enviando}
            onClick={() => void solicitarFechamentoNoCaixa()}
            className="w-full rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 py-5 text-lg font-black text-white shadow-[0_14px_40px_rgba(139,92,246,0.35)] transition active:scale-[0.99] disabled:opacity-50"
          >
            {enviando ? (
              <span className="inline-flex items-center justify-center gap-2">
                <Loader2 className="h-6 w-6 animate-spin" />
                Enviando…
              </span>
            ) : (
              'Solicitar fechamento no caixa'
            )}
          </button>
        </>
      )}
    </div>
  );
}
