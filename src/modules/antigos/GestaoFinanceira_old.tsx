import { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { Layout } from '../../components/Layout';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  CheckCircle,
  Clock,
  AlertCircle,
  Plus,
  Undo2,
  Trash2,
  X,
  Loader2,
  FileX,
  Sparkles,
  Landmark,
} from 'lucide-react';
import { AxiosError } from 'axios';

export interface IPessoaResumo {
  nome: string;
}

export interface ITituloFinanceiro {
  id: string;
  descricao: string;
  origem: string;
  pessoa?: IPessoaResumo;
  valor: number;
  saldoDevedor: number;
  dataVencimento: string | Date;
  status: 'PENDENTE' | 'PAGO' | 'ATRASADO' | string;
}

export function GestaoFinanceira() {
  const [titulos, setTitulos] = useState<ITituloFinanceiro[]>([]);
  const [abaAtiva, setAbaAtiva] = useState<'RECEBER' | 'PAGAR'>('RECEBER');
  const [carregando, setCarregando] = useState(true);

  const [modalBaixaAberto, setModalBaixaAberto] = useState(false);
  const [tituloSelecionado, setTituloSelecionado] = useState<ITituloFinanceiro | null>(null);
  const [valorBaixa, setValorBaixa] = useState('');
  const [tipoPagamento, setTipoPagamento] = useState('DINHEIRO');
  const [saving, setSaving] = useState(false);

  const carregarTitulos = async () => {
    setCarregando(true);
    try {
      const response = await api.get<ITituloFinanceiro[]>(
        `/api/financeiro/titulos?tipo=${abaAtiva}`
      );
      setTitulos(response.data);
    } catch (err) {
      const error = err as AxiosError<{ error?: string }>;
      console.error('Erro ao buscar títulos:', error.response?.data || error.message);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarTitulos();
  }, [abaAtiva]);

  const abrirModalBaixa = (titulo: ITituloFinanceiro) => {
    setTituloSelecionado(titulo);
    setValorBaixa(titulo.saldoDevedor.toString());
    setModalBaixaAberto(true);
  };

  const realizarBaixa = async () => {
    if (!tituloSelecionado || !valorBaixa) {
      return alert('Preencha o valor da baixa.');
    }

    setSaving(true);
    try {
      await api.put<{ message?: string }>(
        `/api/financeiro/titulos/${tituloSelecionado.id}/baixa`,
        {
          valorPago: Number(valorBaixa),
          tipoPagamento
        }
      );

      alert('✅ Baixa realizada com sucesso! A contabilidade foi atualizada.');
      setModalBaixaAberto(false);
      carregarTitulos();
    } catch (err) {
      const error = err as AxiosError<{ error?: string }>;
      alert(`❌ Erro: ${error.response?.data?.error || 'Falha ao realizar baixa'}`);
    } finally {
      setSaving(false);
    }
  };

  const estornarBaixa = async (tituloId: string) => {
    if (
      !window.confirm(
        'Tem certeza que deseja estornar os pagamentos deste título? Os lançamentos contábeis também serão revertidos.'
      )
    ) {
      return;
    }

    try {
      await api.put<{ message?: string }>(
        `/api/financeiro/titulos/${tituloId}/estorno`,
        {}
      );
      alert('✅ Estorno realizado com sucesso!');
      carregarTitulos();
    } catch (err) {
      const error = err as AxiosError<{ error?: string }>;
      alert(`❌ Erro: ${error.response?.data?.error || 'Falha ao estornar'}`);
    }
  };

  const excluirTitulo = async (tituloId: string) => {
    if (
      !window.confirm(
        'Tem certeza que deseja excluir este título manual? A provisão contábil será apagada.'
      )
    ) {
      return;
    }

    try {
      await api.delete<{ message?: string }>(`/api/financeiro/titulos/${tituloId}`);
      alert('✅ Título excluído com sucesso!');
      carregarTitulos();
    } catch (err) {
      const error = err as AxiosError<{ error?: string }>;
      alert(`❌ Erro: ${error.response?.data?.error || 'Falha ao excluir'}`);
    }
  };

  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  const totalAberto = titulos
    .filter(t => t.status !== 'PAGO')
    .reduce((acc, t) => acc + Number(t.saldoDevedor), 0);

  const totalAtrasado = titulos
    .filter(t => t.status === 'ATRASADO')
    .reduce((acc, t) => acc + Number(t.saldoDevedor), 0);

  const totalPago = titulos
    .filter(t => t.status === 'PAGO')
    .reduce((acc, t) => acc + Number(t.valor), 0);

  const inputClass =
    'w-full rounded-2xl border border-white/10 bg-[#0d182d] px-4 py-3.5 text-sm text-white placeholder:text-slate-500 outline-none shadow-inner transition-all';

  return (
    <Layout>
      <style>{`
        @keyframes modalEnter {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-modal {
          animation: modalEnter 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      <div className="mx-auto flex h-full max-w-7xl flex-col space-y-6 pb-12">
        <div className="relative overflow-hidden rounded-[30px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(139,92,246,0.16),_transparent_26%),linear-gradient(135deg,_#0b1020_0%,_#08101f_45%,_#0a1224_100%)] p-6 shadow-[0_25px_70px_rgba(0,0,0,0.40)] sm:p-8">
          <div className={`pointer-events-none absolute right-0 top-0 h-64 w-64 rounded-full blur-[100px] ${
            abaAtiva === 'RECEBER' ? 'bg-emerald-500/10' : 'bg-rose-500/10'
          }`} />

          <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div
                className={`rounded-2xl border p-3 transition-colors ${
                  abaAtiva === 'RECEBER'
                    ? 'border-emerald-400/20 bg-emerald-500/10 text-emerald-300'
                    : 'border-rose-400/20 bg-rose-500/10 text-rose-300'
                }`}
              >
                <DollarSign className="h-8 w-8" />
              </div>

              <div>
                <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-violet-300">
                  <Sparkles className="h-3.5 w-3.5" />
                  Financial Operations
                </div>

                <h1 className="text-3xl font-black tracking-tight text-white">
                  Gestão Financeira
                </h1>
                <p className="mt-1 text-sm font-medium text-slate-400 sm:text-[15px]">
                  Controle de contas a pagar, receber e fluxo de caixa.
                </p>
              </div>
            </div>

            <button className="inline-flex items-center gap-2 rounded-2xl border border-violet-400/20 bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-3.5 font-black text-white shadow-[0_0_20px_rgba(139,92,246,0.22)] transition-all hover:scale-[1.02] hover:brightness-110">
              <Plus className="h-5 w-5" />
              Novo Título Manual
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className={`rounded-[26px] border p-6 shadow-[0_20px_45px_rgba(0,0,0,0.30)] backdrop-blur-xl ${
            abaAtiva === 'RECEBER'
              ? 'border-emerald-400/20 bg-emerald-500/10'
              : 'border-rose-400/20 bg-rose-500/10'
          }`}>
            <p className="mb-2 text-xs font-black uppercase tracking-[0.16em] text-slate-400">
              A {abaAtiva === 'RECEBER' ? 'Receber' : 'Pagar'} (Aberto)
            </p>
            <p className={`text-3xl font-black font-mono ${
              abaAtiva === 'RECEBER' ? 'text-emerald-300' : 'text-rose-300'
            }`}>
              {formatarMoeda(totalAberto)}
            </p>
          </div>

          <div className="rounded-[26px] border border-rose-400/20 bg-rose-500/10 p-6 shadow-[0_20px_45px_rgba(0,0,0,0.30)] backdrop-blur-xl">
            <p className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-rose-300">
              <AlertCircle className="h-4 w-4" />
              Atrasados
            </p>
            <p className="text-3xl font-black font-mono text-rose-300 drop-shadow-[0_0_10px_rgba(244,63,94,0.22)]">
              {formatarMoeda(totalAtrasado)}
            </p>
          </div>

          <div className="rounded-[26px] border border-emerald-400/20 bg-emerald-500/10 p-6 shadow-[0_20px_45px_rgba(0,0,0,0.30)] backdrop-blur-xl">
            <p className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-emerald-300">
              <CheckCircle className="h-4 w-4" />
              Liquidado (Pago)
            </p>
            <p className="text-3xl font-black font-mono text-emerald-300 drop-shadow-[0_0_10px_rgba(16,185,129,0.22)]">
              {formatarMoeda(totalPago)}
            </p>
          </div>
        </div>

        <div className="inline-flex w-fit rounded-xl border border-white/10 bg-[#08101f]/90 p-1.5 shadow-[0_12px_30px_rgba(0,0,0,0.20)] backdrop-blur-xl">
          <button
            onClick={() => setAbaAtiva('RECEBER')}
            className={`inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-black uppercase tracking-[0.14em] transition-all ${
              abaAtiva === 'RECEBER'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <TrendingUp className="h-4 w-4" />
            Contas a Receber
          </button>

          <button
            onClick={() => setAbaAtiva('PAGAR')}
            className={`inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-black uppercase tracking-[0.14em] transition-all ${
              abaAtiva === 'PAGAR'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-slate-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <TrendingDown className="h-4 w-4" />
            Contas a Pagar
          </button>
        </div>

        <div className="flex-1 overflow-hidden rounded-[30px] border border-white/10 bg-[#08101f]/90 shadow-[0_25px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl">
          <div className="flex-1 overflow-auto">
            <table className="min-w-[1000px] w-full text-left">
              <thead className="sticky top-0 z-10 border-b border-white/10 bg-[#0b1324]">
                <tr>
                  <th className="p-5 text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                    Vencimento
                  </th>
                  <th className="p-5 text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                    Descrição / Origem
                  </th>
                  <th className="p-5 text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                    Pessoa
                  </th>
                  <th className="p-5 text-right text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                    Valor Total
                  </th>
                  <th className="p-5 text-right text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                    Saldo Devedor
                  </th>
                  <th className="p-5 text-center text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                    Status
                  </th>
                  <th className="p-5 text-center text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                    Ações
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-white/5">
                {carregando ? (
                  <tr>
                    <td colSpan={7} className="p-16 text-center">
                      <Loader2
                        className={`mx-auto mb-4 h-8 w-8 animate-spin ${
                          abaAtiva === 'RECEBER' ? 'text-emerald-300' : 'text-rose-300'
                        }`}
                      />
                      <p className="font-bold text-slate-300">Carregando títulos...</p>
                    </td>
                  </tr>
                ) : titulos.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="bg-black/10 p-16 text-center">
                      <div className="flex flex-col items-center">
                        <div className="mb-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                          <FileX className="h-12 w-12 text-slate-500" />
                        </div>
                        <p className="text-lg font-black text-white">
                          Nenhum título encontrado
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  titulos.map(titulo => (
                    <tr key={titulo.id} className="group transition-colors hover:bg-white/5">
                      <td className="p-5">
                        <div className="flex items-center gap-2 font-bold text-slate-300">
                          <Calendar className="h-4 w-4 text-slate-500" />
                          {new Date(titulo.dataVencimento).toLocaleDateString('pt-BR', {
                            timeZone: 'UTC'
                          })}
                        </div>
                      </td>

                      <td className="p-5">
                        <p className="text-base font-black text-white">
                          {titulo.descricao}
                        </p>
                        <span className="mt-1 inline-block rounded-lg border border-white/10 bg-[#0b1324] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                          Origem: {titulo.origem}
                        </span>
                      </td>

                      <td className="p-5 font-medium text-slate-300">
                        {titulo.pessoa?.nome || 'Diversos'}
                      </td>

                      <td className="p-5 text-right font-mono text-base font-bold text-slate-400">
                        {formatarMoeda(titulo.valor)}
                      </td>

                      <td
                        className={`p-5 text-right font-mono text-lg font-black ${
                          abaAtiva === 'RECEBER' ? 'text-emerald-300' : 'text-rose-300'
                        }`}
                      >
                        {formatarMoeda(titulo.saldoDevedor)}
                      </td>

                      <td className="p-5 text-center">
                        {titulo.status === 'PAGO' && (
                          <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-300">
                            PAGO
                          </span>
                        )}
                        {titulo.status === 'PENDENTE' && (
                          <span className="rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-amber-300">
                            PENDENTE
                          </span>
                        )}
                        {titulo.status === 'ATRASADO' && (
                          <span className="animate-pulse rounded-full border border-rose-400/20 bg-rose-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-rose-300 shadow-[0_0_10px_rgba(244,63,94,0.18)]">
                            ATRASADO
                          </span>
                        )}
                      </td>

                      <td className="p-5 text-center">
                        <div className="flex justify-center gap-3 opacity-0 transition-opacity group-hover:opacity-100">
                          {titulo.status !== 'PAGO' && (
                            <button
                              onClick={() => abrirModalBaixa(titulo)}
                              className={`rounded-xl border px-3 py-2 transition-all shadow-sm ${
                                abaAtiva === 'RECEBER'
                                  ? 'border-emerald-400/20 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-600 hover:text-white'
                                  : 'border-rose-400/20 bg-rose-500/10 text-rose-300 hover:bg-rose-600 hover:text-white'
                              }`}
                              title="Realizar Baixa"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </button>
                          )}

                          {(titulo.status === 'PAGO' || titulo.valor !== titulo.saldoDevedor) && (
                            <button
                              onClick={() => estornarBaixa(titulo.id)}
                              className="rounded-xl border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-amber-300 transition-all shadow-sm hover:bg-amber-500/20"
                              title="Estornar Pagamento"
                            >
                              <Undo2 className="h-4 w-4" />
                            </button>
                          )}

                          {titulo.origem === 'MANUAL' &&
                            titulo.valor === titulo.saldoDevedor && (
                              <button
                                onClick={() => excluirTitulo(titulo.id)}
                                className="rounded-xl border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-rose-300 transition-all shadow-sm hover:bg-rose-500/20"
                                title="Excluir Título Manual"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="border-t border-white/10 bg-black/10 px-6 py-4">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <Landmark className="h-4 w-4 text-violet-300" />
              Os títulos financeiros alimentam o fluxo de caixa e refletem a posição operacional de recebíveis e obrigações.
            </div>
          </div>
        </div>

        {modalBaixaAberto && tituloSelecionado && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#020617]/80 p-4 backdrop-blur-md">
            <div className="animate-modal relative w-full max-w-md overflow-hidden rounded-[30px] border border-white/10 bg-[#08101f]/95 shadow-[0_25px_80px_rgba(0,0,0,0.65)]">
              <div
                className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${
                  abaAtiva === 'RECEBER'
                    ? 'from-emerald-500 to-teal-500'
                    : 'from-rose-500 to-orange-500'
                }`}
              />

              <div className="flex items-center justify-between border-b border-white/10 bg-black/10 p-6">
                <h2 className="flex items-center gap-3 text-xl font-black text-white">
                  <CheckCircle
                    className={`h-6 w-6 ${
                      abaAtiva === 'RECEBER' ? 'text-emerald-300' : 'text-rose-300'
                    }`}
                  />
                  Baixar Título a {abaAtiva === 'RECEBER' ? 'Receber' : 'Pagar'}
                </h2>

                <button
                  onClick={() => setModalBaixaAberto(false)}
                  className="rounded-full border border-white/10 bg-white/5 p-2 text-slate-400 transition-all hover:border-white/15 hover:bg-white/10 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-6 p-6">
                <div className="rounded-2xl border border-white/10 bg-black/10 p-5 shadow-inner">
                  <p className="mb-1 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                    Título
                  </p>
                  <p className="text-lg font-black text-white">
                    {tituloSelecionado.descricao}
                  </p>

                  <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4">
                    <span className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                      Saldo Devedor
                    </span>
                    <span
                      className={`text-2xl font-black font-mono ${
                        abaAtiva === 'RECEBER' ? 'text-emerald-300' : 'text-rose-300'
                      }`}
                    >
                      {formatarMoeda(tituloSelecionado.saldoDevedor)}
                    </span>
                  </div>
                </div>

                <div className="space-y-5">
                  <div>
                    <label className="mb-2 block pl-1 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                      Valor a Baixar (R$)
                    </label>
                    <input
                      type="number"
                      value={valorBaixa}
                      onChange={(e) => setValorBaixa(e.target.value)}
                      max={tituloSelecionado.saldoDevedor}
                      className={`${inputClass} font-mono text-xl font-black ${
                        abaAtiva === 'RECEBER'
                          ? 'focus:border-emerald-400/30 focus:ring-emerald-500/15'
                          : 'focus:border-rose-400/30 focus:ring-rose-500/15'
                      }`}
                    />
                    <p className="mt-2 pl-1 text-xs font-bold text-violet-300">
                      * Para baixa parcial, digite um valor menor que o saldo.
                    </p>
                  </div>

                  <div>
                    <label className="mb-2 block pl-1 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                      Forma de Pagamento
                    </label>
                    <select
                      value={tipoPagamento}
                      onChange={(e) => setTipoPagamento(e.target.value)}
                      className={`${inputClass} ${
                        abaAtiva === 'RECEBER'
                          ? 'focus:border-emerald-400/30 focus:ring-emerald-500/15'
                          : 'focus:border-rose-400/30 focus:ring-rose-500/15'
                      }`}
                    >
                      <option value="DINHEIRO">Dinheiro (Caixa Interno)</option>
                      <option value="PIX">PIX (Banco)</option>
                      <option value="CARTAO_CREDITO">Cartão de Crédito</option>
                      <option value="CARTAO_DEBITO">Cartão de Débito</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex shrink-0 flex-col gap-3 border-t border-white/10 bg-black/10 p-6 sm:flex-row sm:justify-end">
                <button
                  onClick={() => setModalBaixaAberto(false)}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-6 py-3.5 font-bold text-slate-300 transition-all hover:bg-white/10 hover:text-white sm:w-auto"
                >
                  Cancelar
                </button>

                <button
                  onClick={realizarBaixa}
                  disabled={saving}
                  className={`inline-flex w-full items-center justify-center gap-2 rounded-2xl px-8 py-3.5 font-black text-white transition-all hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 sm:w-auto ${
                    abaAtiva === 'RECEBER'
                      ? 'border border-emerald-400/20 bg-gradient-to-r from-emerald-600 to-teal-500 shadow-[0_0_20px_rgba(16,185,129,0.22)]'
                      : 'border border-rose-400/20 bg-gradient-to-r from-rose-600 to-orange-500 shadow-[0_0_20px_rgba(244,63,94,0.22)]'
                  }`}
                >
                  {saving ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <CheckCircle className="h-5 w-5" />
                  )}
                  {saving ? 'Processando...' : 'Confirmar Baixa'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}