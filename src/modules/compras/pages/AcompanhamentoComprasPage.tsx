import { useCallback, useEffect, useState } from 'react';
import { Layout } from '../../../components/Layout';
import { api } from '../../../services/api';
import {
  Activity,
  ChevronDown,
  ChevronUp,
  Filter,
  Loader2,
  Radar,
  RefreshCw,
  XCircle,
} from 'lucide-react';
import { AxiosError } from 'axios';

export interface ITimelineEtapa {
  etapa: string;
  situacao: 'OK' | 'ANDAMENTO' | 'BLOQUEADO';
  detalhe: string;
  ordem: number;
}

export interface ICotacaoDetalhe {
  itemCotacaoId: string;
  cotacaoId: string;
  status: string;
  vencedora: boolean;
  fornecedorNome: string;
  dataAbertura: string;
  dataEncerramento: string | null;
}

export interface ILinhaAcompanhamento {
  itemSolicitacaoId: string;
  quantidadeSolicitada: string;
  produto: { id: string; codigo: string; nome: string };
  requisicao: {
    id: string;
    numeroExibicao: string;
    dataSolicitacao: string;
    dataNecessidade: string;
    status: string;
  };
  cotacao: {
    status: string | null;
    resumo: string;
    detalhes: ICotacaoDetalhe[];
  };
  pedido: {
    id: string;
    numeroExibicao: string;
    dataPedido: string;
    status: string;
    valorTotal: string;
  } | null;
  pedidosRelacionados: Array<{
    id: string;
    numeroExibicao: string;
    dataPedido: string;
    status: string;
    valorTotal: string;
  }>;
  notaFiscal: {
    id: string;
    numero: string;
    serie: string;
    display: string;
    dataEmissao: string;
    statusRecebimento: string;
  } | null;
  timeline: ITimelineEtapa[];
}

interface IRespostaApi {
  sucesso: boolean;
  dados?: { total: number; itens: ILinhaAcompanhamento[] };
  erro?: string;
}

const hojeIso = () => new Date().toISOString().split('T')[0];

const mesPassadoIso = () => {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().split('T')[0];
};

function formatarData(iso: string) {
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function labelStatusSolicitacao(s: string): string {
  const map: Record<string, string> = {
    RASCUNHO: 'RASCUNHO',
    AGUARDANDO_SUPERVISAO: 'PENDENTE',
    APROVADA: 'APROVADA',
    REPROVADA: 'REPROVADA',
    EM_COTACAO: 'EM COTAÇÃO',
    ATENDIDA: 'ATENDIDA',
    CANCELADA: 'CANCELADA',
  };
  return map[s] || s;
}

function badgeSolicitacaoClass(status: string): string {
  if (['REPROVADA', 'CANCELADA'].includes(status)) {
    return 'border-rose-400/25 bg-rose-500/10 text-rose-300';
  }
  if (['APROVADA', 'EM_COTACAO', 'ATENDIDA'].includes(status)) {
    return 'border-emerald-400/25 bg-emerald-500/10 text-emerald-300';
  }
  return 'border-amber-400/25 bg-amber-500/10 text-amber-300';
}

function badgeCotacaoClass(status: string | null): string {
  if (!status) return 'border-slate-500/30 bg-slate-500/10 text-slate-400';
  if (['CANCELADA', 'REPROVADA'].includes(status)) {
    return 'border-rose-400/25 bg-rose-500/10 text-rose-300';
  }
  if (['FINALIZADA', 'APROVADA'].includes(status)) {
    return 'border-emerald-400/25 bg-emerald-500/10 text-emerald-300';
  }
  return 'border-amber-400/25 bg-amber-500/10 text-amber-300';
}

function badgePedidoClass(status: string): string {
  if (['REPROVADO', 'CANCELADO'].includes(status)) {
    return 'border-rose-400/25 bg-rose-500/10 text-rose-300';
  }
  if (
    ['APROVADO', 'ENVIADO_FORNECEDOR', 'RECEBIDO_PARCIAL', 'RECEBIDO_TOTAL'].includes(status)
  ) {
    return 'border-emerald-400/25 bg-emerald-500/10 text-emerald-300';
  }
  return 'border-amber-400/25 bg-amber-500/10 text-amber-300';
}

function labelCotacao(status: string | null): string {
  if (!status) return '—';
  const map: Record<string, string> = {
    ABERTA: 'EM COTAÇÃO',
    FINALIZADA: 'FINALIZADA',
    CANCELADA: 'CANCELADA',
    APROVADA: 'APROVADA',
    REPROVADA: 'REPROVADA',
  };
  return map[status] || status;
}

function StepperTooltip({ linha }: { linha: ILinhaAcompanhamento }) {
  const texto = linha.timeline
    .sort((a, b) => a.ordem - b.ordem)
    .map((t) => {
      const icon = t.situacao === 'OK' ? '✓' : t.situacao === 'BLOQUEADO' ? '✕' : '…';
      return `${icon} ${t.etapa}: ${t.detalhe}`;
    })
    .join('\n');

  return (
    <div
      className="mt-1 flex cursor-help flex-wrap gap-1"
      title={texto}
    >
      {linha.timeline
        .sort((a, b) => a.ordem - b.ordem)
        .map((t) => (
          <span
            key={t.ordem}
            className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-black ${
              t.situacao === 'OK'
                ? 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/30'
                : t.situacao === 'BLOQUEADO'
                  ? 'bg-rose-500/20 text-rose-300 ring-1 ring-rose-500/30'
                  : 'bg-amber-500/15 text-amber-200 ring-1 ring-amber-500/25'
            }`}
          >
            {t.ordem}
          </span>
        ))}
    </div>
  );
}

export function AcompanhamentoComprasPage() {
  const [filtrosAbertos, setFiltrosAbertos] = useState(true);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [linhas, setLinhas] = useState<ILinhaAcompanhamento[]>([]);
  const [total, setTotal] = useState(0);

  const [dataInicial, setDataInicial] = useState(mesPassadoIso);
  const [dataFinal, setDataFinal] = useState(hojeIso);
  const [codigoProduto, setCodigoProduto] = useState('');
  const [numeroRequisicao, setNumeroRequisicao] = useState('');
  const [numeroPedido, setNumeroPedido] = useState('');
  const [numeroNota, setNumeroNota] = useState('');

  const buscar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const params: Record<string, string> = {};
      if (dataInicial.trim()) params.dataInicial = dataInicial.trim();
      if (dataFinal.trim()) params.dataFinal = dataFinal.trim();
      if (codigoProduto.trim()) params.codigoProduto = codigoProduto.trim().toUpperCase();
      if (numeroRequisicao.trim()) params.numeroRequisicao = numeroRequisicao.trim().toUpperCase();
      if (numeroPedido.trim()) params.numeroPedido = numeroPedido.trim().toUpperCase();
      if (numeroNota.trim()) params.numeroNota = numeroNota.trim().toUpperCase();

      const { data } = await api.get<IRespostaApi>('/api/compras/acompanhamento', { params });
      if (!data.sucesso || !data.dados) {
        setErro(data.erro || 'Resposta inválida do servidor.');
        setLinhas([]);
        setTotal(0);
        return;
      }
      setLinhas(data.dados.itens);
      setTotal(data.dados.total);
    } catch (e) {
      const ax = e as AxiosError<{ erro?: string; sucesso?: boolean }>;
      setErro(ax.response?.data?.erro || ax.message || 'Falha ao carregar acompanhamento.');
      setLinhas([]);
      setTotal(0);
    } finally {
      setCarregando(false);
    }
  }, [codigoProduto, dataFinal, dataInicial, numeroNota, numeroPedido, numeroRequisicao]);

  useEffect(() => {
    void buscar();
    // Carrega com período padrão ao abrir a torre de controle
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intencional: somente montagem
  }, []);

  const limpar = () => {
    setDataInicial(mesPassadoIso());
    setDataFinal(hojeIso());
    setCodigoProduto('');
    setNumeroRequisicao('');
    setNumeroPedido('');
    setNumeroNota('');
  };

  return (
    <Layout>
      <div className="mx-auto flex h-full max-w-[1600px] flex-col space-y-6 pb-12">
        <div className="relative overflow-hidden rounded-[30px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.10),_transparent_26%),radial-gradient(circle_at_top_right,_rgba(16,185,129,0.08),_transparent_22%),linear-gradient(135deg,_#0b1020_0%,_#08101f_45%,_#0a1224_100%)] p-6 shadow-[0_25px_70px_rgba(0,0,0,0.40)] sm:p-8">
          <div className="pointer-events-none absolute -left-10 top-0 h-52 w-52 rounded-full bg-sky-600/10 blur-[100px]" />
          <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-sky-400/20 bg-sky-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-sky-300">
                <Radar className="h-3.5 w-3.5" />
                Procure-to-Pay Tracker
              </div>
              <h1 className="flex items-center gap-4 text-3xl font-black tracking-tight text-white">
                <div className="rounded-2xl border border-sky-400/20 bg-sky-500/10 p-3">
                  <Activity className="h-8 w-8 text-sky-300" />
                </div>
                Acompanhamento de Compras
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300 sm:text-[15px]">
                Torre de controle do fluxo: produto, requisição, cotação, pedido e nota fiscal de
                entrada — com filtros para localizar gargalos e status por item.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void buscar()}
              disabled={carregando}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-400/30 bg-emerald-500/15 px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-emerald-200 transition hover:bg-emerald-500/25 disabled:opacity-50"
            >
              {carregando ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Atualizar
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-[24px] border border-white/10 bg-[#08101f]/95 shadow-[0_20px_50px_rgba(0,0,0,0.35)]">
          <button
            type="button"
            onClick={() => setFiltrosAbertos((v) => !v)}
            className="flex w-full items-center justify-between border-b border-white/10 bg-white/[0.03] px-5 py-4 text-left transition hover:bg-white/[0.06]"
          >
            <span className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.12em] text-white">
              <Filter className="h-4 w-4 text-sky-400" />
              Filtros
            </span>
            {filtrosAbertos ? (
              <ChevronUp className="h-5 w-5 text-slate-400" />
            ) : (
              <ChevronDown className="h-5 w-5 text-slate-400" />
            )}
          </button>
          {filtrosAbertos && (
            <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              <label className="flex flex-col gap-1.5">
                <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                  Data inicial
                </span>
                <input
                  type="date"
                  value={dataInicial}
                  onChange={(e) => setDataInicial(e.target.value)}
                  className="rounded-xl border border-white/10 bg-[#0c1525] px-3 py-2.5 text-xs font-bold uppercase tracking-wide text-white outline-none ring-sky-500/40 focus:ring-2"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                  Data final
                </span>
                <input
                  type="date"
                  value={dataFinal}
                  onChange={(e) => setDataFinal(e.target.value)}
                  className="rounded-xl border border-white/10 bg-[#0c1525] px-3 py-2.5 text-xs font-bold uppercase tracking-wide text-white outline-none ring-sky-500/40 focus:ring-2"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                  Código produto
                </span>
                <input
                  value={codigoProduto}
                  onChange={(e) => setCodigoProduto(e.target.value.toUpperCase())}
                  placeholder="EX: SKU-001"
                  className="rounded-xl border border-white/10 bg-[#0c1525] px-3 py-2.5 text-xs font-bold uppercase tracking-wide text-white placeholder:text-slate-600 outline-none ring-sky-500/40 focus:ring-2"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                  Nº requisição
                </span>
                <input
                  value={numeroRequisicao}
                  onChange={(e) => setNumeroRequisicao(e.target.value.toUpperCase())}
                  placeholder="UUID OU PREFIXO"
                  className="rounded-xl border border-white/10 bg-[#0c1525] px-3 py-2.5 text-xs font-bold uppercase tracking-wide text-white placeholder:text-slate-600 outline-none ring-sky-500/40 focus:ring-2"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                  Nº pedido
                </span>
                <input
                  value={numeroPedido}
                  onChange={(e) => setNumeroPedido(e.target.value.toUpperCase())}
                  placeholder="UUID OU PREFIXO"
                  className="rounded-xl border border-white/10 bg-[#0c1525] px-3 py-2.5 text-xs font-bold uppercase tracking-wide text-white placeholder:text-slate-600 outline-none ring-sky-500/40 focus:ring-2"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                  Nº NF
                </span>
                <input
                  value={numeroNota}
                  onChange={(e) => setNumeroNota(e.target.value.toUpperCase())}
                  placeholder="NÚMERO DA NOTA"
                  className="rounded-xl border border-white/10 bg-[#0c1525] px-3 py-2.5 text-xs font-bold uppercase tracking-wide text-white placeholder:text-slate-600 outline-none ring-sky-500/40 focus:ring-2"
                />
              </label>
              <div className="flex flex-wrap items-end gap-2 sm:col-span-2 lg:col-span-3 xl:col-span-6">
                <button
                  type="button"
                  onClick={() => void buscar()}
                  disabled={carregando}
                  className="rounded-xl border border-sky-400/35 bg-sky-500/20 px-6 py-2.5 text-xs font-black uppercase tracking-[0.14em] text-sky-100 hover:bg-sky-500/30 disabled:opacity-50"
                >
                  Filtrar
                </button>
                <button
                  type="button"
                  onClick={limpar}
                  className="rounded-xl border border-white/15 bg-white/5 px-6 py-2.5 text-xs font-black uppercase tracking-[0.14em] text-slate-300 hover:bg-white/10"
                >
                  Limpar
                </button>
                <span className="ml-auto text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  {total} registro(s)
                </span>
              </div>
            </div>
          )}
        </div>

        {erro && (
          <div className="flex items-center gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            <XCircle className="h-5 w-5 shrink-0" />
            {erro}
          </div>
        )}

        <div className="overflow-hidden rounded-[24px] border border-white/10 bg-[#08101f]/95 shadow-[0_20px_50px_rgba(0,0,0,0.35)]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] border-collapse text-left">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.04]">
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                    Produto
                  </th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                    Requisição
                  </th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                    Cotação
                  </th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                    Pedido
                  </th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                    Nota fiscal
                  </th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                    Fluxo
                  </th>
                </tr>
              </thead>
              <tbody>
                {!carregando && linhas.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-16 text-center text-sm text-slate-500">
                      Nenhum item encontrado. Ajuste os filtros e clique em <strong>Filtrar</strong>.
                    </td>
                  </tr>
                )}
                {carregando && (
                  <tr>
                    <td colSpan={6} className="px-4 py-16 text-center">
                      <Loader2 className="mx-auto h-8 w-8 animate-spin text-sky-400" />
                    </td>
                  </tr>
                )}
                {!carregando &&
                  linhas.map((linha) => (
                    <tr
                      key={linha.itemSolicitacaoId}
                      className="border-b border-white/5 transition hover:bg-white/[0.02]"
                    >
                      <td className="align-top px-4 py-4">
                        <div className="text-xs font-black uppercase tracking-wide text-sky-200">
                          {linha.produto.codigo}
                        </div>
                        <div className="mt-1 max-w-[220px] text-sm font-semibold leading-snug text-white">
                          {linha.produto.nome}
                        </div>
                        <div className="mt-1 text-[10px] font-bold uppercase text-slate-500">
                          QTD: {linha.quantidadeSolicitada}
                        </div>
                      </td>
                      <td className="align-top px-4 py-4">
                        <div className="font-mono text-xs font-black text-white">
                          #{linha.requisicao.numeroExibicao}
                        </div>
                        <div className="mt-1 text-[11px] font-semibold text-slate-400">
                          {formatarData(linha.requisicao.dataSolicitacao)}
                        </div>
                        <span
                          className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] ${badgeSolicitacaoClass(linha.requisicao.status)}`}
                        >
                          {labelStatusSolicitacao(linha.requisicao.status)}
                        </span>
                      </td>
                      <td className="align-top px-4 py-4">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] ${badgeCotacaoClass(linha.cotacao.status)}`}
                        >
                          {labelCotacao(linha.cotacao.status)}
                        </span>
                        <div
                          className="mt-2 max-w-[260px] text-[11px] font-semibold uppercase leading-relaxed text-slate-300"
                          title={linha.cotacao.detalhes
                            .map(
                              (d) =>
                                `${d.fornecedorNome}: ${d.status}${d.vencedora ? ' (VENCEDOR)' : ''}`,
                            )
                            .join(' | ')}
                        >
                          {linha.cotacao.resumo}
                        </div>
                      </td>
                      <td className="align-top px-4 py-4">
                        {linha.pedido ? (
                          <>
                            <div className="font-mono text-xs font-black text-white">
                              #{linha.pedido.numeroExibicao}
                            </div>
                            <div className="mt-1 text-[11px] font-semibold text-slate-400">
                              {formatarData(linha.pedido.dataPedido)}
                            </div>
                            <span
                              className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] ${badgePedidoClass(linha.pedido.status)}`}
                            >
                              {linha.pedido.status.replace(/_/g, ' ')}
                            </span>
                            {linha.pedidosRelacionados.length > 1 && (
                              <div className="mt-1 text-[9px] font-bold uppercase text-amber-400/90">
                                +{linha.pedidosRelacionados.length - 1} outro(s) pedido(s)
                              </div>
                            )}
                          </>
                        ) : (
                          <span className="text-[11px] font-bold uppercase text-slate-500">
                            Sem pedido
                          </span>
                        )}
                      </td>
                      <td className="align-top px-4 py-4">
                        {linha.notaFiscal ? (
                          <div>
                            <div className="text-sm font-black uppercase tracking-wide text-emerald-300">
                              {linha.notaFiscal.display}
                            </div>
                            <div className="mt-1 text-[10px] font-bold uppercase text-slate-500">
                              {linha.notaFiscal.statusRecebimento.replace(/_/g, ' ')}
                            </div>
                          </div>
                        ) : (
                          <span className="text-[11px] font-black uppercase tracking-wide text-amber-300/90">
                            Aguardando faturamento
                          </span>
                        )}
                      </td>
                      <td className="align-top px-4 py-4">
                        <StepperTooltip linha={linha} />
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
}
