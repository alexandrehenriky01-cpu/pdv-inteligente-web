import { useCallback, useEffect, useState } from 'react';
import { Layout } from '../../../components/Layout';
import {
  getEstacoesTrabalhoLista,
  getPdvCaixaResumoSessao,
  getPdvCaixaSessoesHoje,
  postPdvCaixaAbrirManual,
} from '../../../services/api/pdvCaixaGestaoApi';
import { syncAxiosAuthorizationFromStorage } from '../../../services/authSession';
import {
  Loader2,
  Plus,
  X,
  Timer,
  Store,
  User,
  Calendar,
  Wallet,
  Eye,
  Power,
  RefreshCw,
} from 'lucide-react';
import { AxiosError } from 'axios';
import { toast } from 'react-toastify';
import { persistirContextoPosAberturaCaixa } from '../../../utils/estacaoWorkstationStorage';
import { FechamentoCaixaModal } from '../../operacoes/FechamentoCaixaModal';

interface IUsuarioSessao {
  id: string;
  nome: string;
}

interface ISessaoCaixaRow {
  id: string;
  lojaId: string;
  usuarioId: string;
  terminal: string | null;
  status: string;
  dataAbertura: string;
  dataFechamento: string | null;
  saldoAbertura: unknown;
  saldoFechamento: unknown | null;
  observacao?: string | null;
  usuario?: IUsuarioSessao | null;
  estacaoExibicao?: string | null;
}

interface IEstacaoOption {
  id: string;
  nome: string;
  identificadorMaquina: string;
  nomeMaquina?: string | null;
  ativo: boolean;
  /** Registro `Caixa` fiscal vinculado à estação (quando existir). */
  caixaId?: string | null;
}

interface IResumoSessao {
  sessaoId: string;
  terminal: string | null;
  saldoAbertura: number;
  vendas: {
    dinheiro: number;
    pix: number;
    cartaoCredito: number;
    cartaoDebito: number;
    crediario: number;
    totalGeral: number;
  };
  saldoTeoricoGaveta: number;
}

function num(v: unknown): number {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? '0'));
  return Number.isFinite(n) ? n : 0;
}

function fmtMoney(v: unknown): string {
  return num(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDataHora(iso: string): string {
  try {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? iso : d.toLocaleString('pt-BR');
  } catch {
    return iso;
  }
}

function extrairCaixaIdRaw(item: unknown): string | null | undefined {
  if (!item || typeof item !== 'object') return undefined;
  const o = item as Record<string, unknown>;
  if (typeof o.caixaId === 'string' && o.caixaId.trim()) return o.caixaId.trim();
  const cx = o.caixa;
  if (cx && typeof cx === 'object' && typeof (cx as { id?: string }).id === 'string') {
    const id = (cx as { id: string }).id.trim();
    return id || undefined;
  }
  return undefined;
}

function extrairEstacoes(data: unknown): IEstacaoOption[] {
  const mapRow = (row: unknown): IEstacaoOption => {
    const e = row as IEstacaoOption;
    return { ...e, caixaId: extrairCaixaIdRaw(row) ?? e.caixaId };
  };
  if (Array.isArray(data)) return (data as unknown[]).map(mapRow);
  if (data && typeof data === 'object' && 'data' in data && Array.isArray((data as { data: unknown }).data)) {
    return ((data as { data: unknown[] }).data as unknown[]).map(mapRow);
  }
  return [];
}

export function GestaoTurnosCaixaPage() {
  const [sessoes, setSessoes] = useState<ISessaoCaixaRow[]>([]);
  const [estacoes, setEstacoes] = useState<IEstacaoOption[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [modalAbrir, setModalAbrir] = useState(false);
  const [modalFechar, setModalFechar] = useState<ISessaoCaixaRow | null>(null);
  const [modalResumo, setModalResumo] = useState<ISessaoCaixaRow | null>(null);
  const [resumo, setResumo] = useState<IResumoSessao | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [carregandoResumo, setCarregandoResumo] = useState(false);

  const [estacaoId, setEstacaoId] = useState('');
  const [fundoTroco, setFundoTroco] = useState('200');

  const carregarSessoes = useCallback(async () => {
    const data = await getPdvCaixaSessoesHoje<ISessaoCaixaRow[]>();
    setSessoes(Array.isArray(data) ? data : []);
  }, []);

  const carregarEstacoes = useCallback(async () => {
    const data = await getEstacoesTrabalhoLista();
    const list = extrairEstacoes(data);
    setEstacoes(list.filter((e) => e.ativo !== false));
  }, []);

  const recarregarTudo = useCallback(async () => {
    setCarregando(true);
    try {
      syncAxiosAuthorizationFromStorage();
      await Promise.all([carregarSessoes(), carregarEstacoes()]);
    } catch (e) {
      const ax = e as AxiosError<{ error?: string }>;
      toast.error(ax.response?.data?.error || 'Erro ao carregar dados.');
    } finally {
      setCarregando(false);
    }
  }, [carregarEstacoes, carregarSessoes]);

  useEffect(() => {
    void recarregarTudo();
  }, [recarregarTudo]);

  const abrirTurno = async () => {
    if (!estacaoId.trim()) {
      toast.error('Selecione uma estação de trabalho.');
      return;
    }
    const v = parseFloat(fundoTroco.replace(',', '.'));
    if (Number.isNaN(v) || v < 0) {
      toast.error('Informe um fundo de troco válido.');
      return;
    }
    setSalvando(true);
    try {
      syncAxiosAuthorizationFromStorage();
      const estacaoSel = estacoes.find((e) => e.id === estacaoId.trim());
      const labelEstacao = estacaoSel
        ? [estacaoSel.nome, estacaoSel.nomeMaquina].filter(Boolean).join(' — ')
        : '';

      const sessaoCriada = await postPdvCaixaAbrirManual({
        estacaoTrabalhoId: estacaoId.trim(),
        saldoAbertura: v,
        observacao: 'Abertura manual — Central do Fiscal',
      });

      const terminalResolvido = (sessaoCriada?.terminal ?? '').trim();
      if (terminalResolvido) {
        persistirContextoPosAberturaCaixa({
          estacaoTrabalhoId: estacaoId.trim(),
          nomeEstacao: labelEstacao || estacaoSel?.nome,
          caixaFiscalId: estacaoSel?.caixaId,
          terminalResolvido,
          sessaoCaixaId: sessaoCriada?.id,
        });
      }

      toast.success('Turno aberto com sucesso.');
      setModalAbrir(false);
      setEstacaoId('');
      setFundoTroco('200');
      await carregarSessoes();
    } catch (e) {
      const ax = e as AxiosError<{ error?: string }>;
      toast.error(ax.response?.data?.error || 'Não foi possível abrir o turno.');
    } finally {
      setSalvando(false);
    }
  };

  const abrirResumo = async (row: ISessaoCaixaRow) => {
    setModalResumo(row);
    setResumo(null);
    setCarregandoResumo(true);
    try {
      syncAxiosAuthorizationFromStorage();
      const data = await getPdvCaixaResumoSessao<IResumoSessao>(row.id);
      setResumo(data);
    } catch (e) {
      const ax = e as AxiosError<{ error?: string }>;
      toast.error(ax.response?.data?.error || 'Erro ao carregar resumo.');
      setModalResumo(null);
    } finally {
      setCarregandoResumo(false);
    }
  };

  return (
    <Layout>
      <div className="min-h-[calc(100vh-4rem)] bg-[#060816] text-white p-4 sm:p-6">
        <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(139,92,246,0.12),transparent_50%)]" />
        <div className="relative z-10 max-w-7xl mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
                <Timer className="w-8 h-8 text-violet-400 shrink-0" />
                Gestão de Caixas e Turnos
              </h1>
              <p className="text-slate-400 text-sm mt-1">
                Abra ou feche turnos por estação (PDV, totem, etc.) sem ir até o terminal.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void recarregarTudo()}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-slate-200 hover:bg-white/10 transition-all"
              >
                <RefreshCw className={`w-4 h-4 ${carregando ? 'animate-spin' : ''}`} />
                Atualizar
              </button>
              <button
                type="button"
                onClick={() => setModalAbrir(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 py-3 text-sm font-black uppercase tracking-wide text-white shadow-[0_0_20px_rgba(139,92,246,0.35)] hover:scale-[1.02] transition-all"
              >
                <Plus className="w-5 h-5" />
                Abrir novo turno
              </button>
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-[#08101f]/90 backdrop-blur-xl shadow-[0_25px_60px_rgba(0,0,0,0.35)] overflow-hidden">
            {carregando ? (
              <div className="flex justify-center py-24">
                <Loader2 className="w-10 h-10 text-violet-400 animate-spin" />
              </div>
            ) : sessoes.length === 0 ? (
              <p className="text-center text-slate-500 py-16 px-6">Nenhum turno registrado hoje nesta loja.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-[10px] font-black uppercase tracking-widest text-slate-500">
                      <th className="px-4 py-4">Estação / Terminal</th>
                      <th className="px-4 py-4">Operador</th>
                      <th className="px-4 py-4">Status</th>
                      <th className="px-4 py-4">Abertura</th>
                      <th className="px-4 py-4 text-right">Saldo inicial</th>
                      <th className="px-4 py-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessoes.map((s) => {
                      const aberta = String(s.status).toUpperCase() === 'ABERTA';
                      const labelEst = s.estacaoExibicao || s.terminal || '—';
                      return (
                        <tr
                          key={s.id}
                          className="border-b border-white/5 hover:bg-white/[0.03] transition-colors"
                        >
                          <td className="px-4 py-4">
                            <div className="flex items-start gap-2">
                              <Store className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
                              <div>
                                <p className="font-bold text-white">{labelEst}</p>
                                {s.terminal && (
                                  <p className="text-xs text-slate-500 font-mono">Terminal: {s.terminal}</p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <span className="inline-flex items-center gap-1.5 text-slate-300">
                              <User className="w-3.5 h-3.5 text-slate-500" />
                              {s.usuario?.nome ?? '—'}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <span
                              className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-black uppercase tracking-wide ${
                                aberta
                                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                  : 'bg-slate-500/15 text-slate-400 border border-white/10'
                              }`}
                            >
                              {aberta ? 'Aberto' : 'Fechado'}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-slate-400">
                            <span className="inline-flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5" />
                              {fmtDataHora(s.dataAbertura)}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-right font-mono text-emerald-400 font-bold">
                            R$ {fmtMoney(s.saldoAbertura)}
                          </td>
                          <td className="px-4 py-4 text-right">
                            <div className="flex flex-wrap justify-end gap-2">
                              {aberta ? (
                                <button
                                  type="button"
                                  onClick={() => setModalFechar(s)}
                                  className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs font-black uppercase tracking-wide text-red-300 hover:bg-red-500/20 transition-all"
                                >
                                  Fechar turno
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => void abrirResumo(s)}
                                  className="rounded-lg border border-violet-500/35 bg-violet-500/10 px-3 py-2 text-xs font-black uppercase tracking-wide text-violet-300 hover:bg-violet-500/20 transition-all inline-flex items-center gap-1.5"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  Ver resumo
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {modalAbrir && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-[28px] border border-white/10 bg-[#08101f] shadow-[0_25px_80px_rgba(0,0,0,0.65)] p-6 relative">
              <button
                type="button"
                onClick={() => setModalAbrir(false)}
                className="absolute top-4 right-4 p-2 rounded-xl border border-white/10 text-slate-400 hover:text-white hover:bg-white/5"
                aria-label="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
              <h2 className="text-xl font-black text-white mb-1 flex items-center gap-2">
                <Power className="w-6 h-6 text-violet-400" />
                Abrir novo turno
              </h2>
              <p className="text-slate-500 text-xs mb-6">Selecione a estação e o fundo de troco inicial.</p>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">
                Estação de trabalho
              </label>
              <select
                value={estacaoId}
                onChange={(e) => setEstacaoId(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-[#0b1324] px-4 py-3 text-white mb-4 focus:border-violet-500/40 focus:ring-2 focus:ring-violet-500/20 outline-none"
              >
                <option value="">Selecione…</option>
                {estacoes.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nome}
                    {e.nomeMaquina ? ` — ${e.nomeMaquina}` : ''} ({e.identificadorMaquina})
                  </option>
                ))}
              </select>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">
                Fundo de troco (R$)
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={fundoTroco}
                onChange={(e) => setFundoTroco(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-[#0b1324] px-4 py-3 text-lg font-mono text-white mb-6 focus:border-violet-500/40 focus:ring-2 focus:ring-violet-500/20 outline-none"
              />
              <button
                type="button"
                disabled={salvando}
                onClick={() => void abrirTurno()}
                className="w-full py-4 rounded-xl font-black text-white bg-gradient-to-r from-violet-600 to-fuchsia-600 shadow-[0_0_20px_rgba(139,92,246,0.3)] disabled:opacity-50 transition-all"
              >
                {salvando ? 'Abrindo…' : 'Confirmar abertura'}
              </button>
            </div>
          </div>
        )}

        {modalFechar && (
          <FechamentoCaixaModal
            aberto={!!modalFechar}
            sessaoCaixaId={modalFechar.id}
            modo="gestao"
            titulo="Fechar turno"
            subtitulo={`${modalFechar.estacaoExibicao || modalFechar.terminal || 'Turno'} — contagem cega por forma de pagamento.`}
            onFechar={() => setModalFechar(null)}
            onConcluido={() => {
              toast.success('Turno fechado com conciliação.');
              setModalFechar(null);
              void carregarSessoes();
            }}
          />
        )}

        {modalResumo && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="w-full max-w-lg rounded-[28px] border border-white/10 bg-[#08101f] shadow-[0_25px_80px_rgba(0,0,0,0.65)] p-6 relative max-h-[90vh] overflow-y-auto">
              <button
                type="button"
                onClick={() => {
                  setModalResumo(null);
                  setResumo(null);
                }}
                className="absolute top-4 right-4 p-2 rounded-xl border border-white/10 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
              <h2 className="text-xl font-black text-white mb-1 flex items-center gap-2">
                <Wallet className="w-6 h-6 text-violet-400" />
                Resumo do turno
              </h2>
              <p className="text-slate-500 text-xs mb-4">
                {modalResumo.estacaoExibicao || modalResumo.terminal} — {fmtDataHora(modalResumo.dataAbertura)}
              </p>
              {carregandoResumo ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
                </div>
              ) : resumo ? (
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between text-slate-400">
                    <span>Saldo abertura</span>
                    <span className="font-mono text-white">R$ {fmtMoney(resumo.saldoAbertura)}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Dinheiro</span>
                    <span className="font-mono">R$ {fmtMoney(resumo.vendas.dinheiro)}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>PIX</span>
                    <span className="font-mono">R$ {fmtMoney(resumo.vendas.pix)}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Cartão crédito</span>
                    <span className="font-mono">R$ {fmtMoney(resumo.vendas.cartaoCredito)}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Cartão débito</span>
                    <span className="font-mono">R$ {fmtMoney(resumo.vendas.cartaoDebito)}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Crediário</span>
                    <span className="font-mono">R$ {fmtMoney(resumo.vendas.crediario)}</span>
                  </div>
                  <div className="border-t border-white/10 pt-3 flex justify-between font-black text-white">
                    <span>Total vendas</span>
                    <span className="font-mono text-emerald-400">R$ {fmtMoney(resumo.vendas.totalGeral)}</span>
                  </div>
                  <div className="flex justify-between text-violet-300 font-bold">
                    <span>Saldo teórico gaveta</span>
                    <span className="font-mono">R$ {fmtMoney(resumo.saldoTeoricoGaveta)}</span>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
