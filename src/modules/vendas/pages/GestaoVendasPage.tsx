import { useCallback, useEffect, useState } from 'react';
import { AxiosError } from 'axios';
import {
  Eye,
  FileText,
  Loader2,
  Printer,
  RefreshCw,
  Receipt,
  Search,
  XCircle,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { Layout } from '../../../components/Layout';
import { api } from '../../../services/api';

type OrigemVendaDisplay = 'PDV' | 'MENU' | 'MESA' | 'DELIVERY' | 'TOTEM' | 'RETIRADA' | 'OUTRO';
type TipoDocumentoVendaDto = 'NFCE' | 'CONSUMIDOR';
type StatusFiscalGestao =
  | 'NAO_EMITIDO'
  | 'EMITIDO'
  | 'CANCELADO'
  | 'CANCELAMENTO_PENDENTE'
  | 'REJEITADO'
  | 'PROCESSANDO';
type StatusFinanceiroGestao = 'OK' | 'PENDENTE' | 'ESTORNO_PENDENTE' | 'CANCELADO';

interface GestaoVendaListItemDto {
  id: string;
  numeroVenda: number;
  numeroPedido: number | null;
  clienteNome: string;
  origem: OrigemVendaDisplay;
  tipoAtendimento: string | null;
  pagamentoPosterior: boolean;
  dataHora: string;
  valorTotal: number;
  tipoDocumentoVenda: TipoDocumentoVendaDto;
  numeroDocumento: string;
  possuiDocumentoFiscal: boolean;
  statusFiscal: string;
  statusFiscalGestao: StatusFiscalGestao;
  statusVenda: string;
  statusPreparo: string | null;
  statusEntrega: string | null;
  statusFinanceiro: StatusFinanceiroGestao;
  estornoPendente: boolean;
  cancelada: boolean;
  podeEmitirFiscal: boolean;
  podeReimprimir: boolean;
  modeloNota: string | null;
}

interface GestaoVendaListResponseDto {
  itens: GestaoVendaListItemDto[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface VendaDetalheResumo {
  id: string;
  numeroVenda?: number;
  valorTotal?: number;
  status?: string;
  nomeCliente?: string | null;
  itens?: Array<{ produto?: { nome?: string }; quantidade: number; valorTotal: number }>;
}

function fmtMoney(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function fmtDataHora(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return (
    d.toLocaleDateString('pt-BR') +
    ' ' +
    d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  );
}

function BadgeDoc(t: TipoDocumentoVendaDto): JSX.Element {
  if (t === 'NFCE') {
    return (
      <span className="rounded-full bg-violet-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-200 ring-1 ring-violet-500/30">
        NFC-e
      </span>
    );
  }
  return (
    <span className="rounded-full bg-slate-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-200 ring-1 ring-slate-500/25">
      Consumidor
    </span>
  );
}

function BadgeFiscal(g: StatusFiscalGestao): JSX.Element {
  const base = 'rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1';
  switch (g) {
    case 'EMITIDO':
      return <span className={`${base} bg-emerald-500/15 text-emerald-200 ring-emerald-500/25`}>Emitido</span>;
    case 'NAO_EMITIDO':
      return <span className={`${base} bg-slate-500/15 text-slate-200 ring-slate-500/20`}>Não emitido</span>;
    case 'CANCELADO':
      return <span className={`${base} bg-slate-600/30 text-slate-300 line-through ring-slate-500/20`}>Cancelado</span>;
    case 'CANCELAMENTO_PENDENTE':
      return (
        <span className={`${base} bg-amber-500/15 text-amber-100 ring-amber-500/30`}>Cancelamento pendente</span>
      );
    case 'REJEITADO':
      return <span className={`${base} bg-rose-500/15 text-rose-100 ring-rose-500/35`}>Rejeitado</span>;
    case 'PROCESSANDO':
    default:
      return <span className={`${base} bg-sky-500/15 text-sky-100 ring-sky-500/25`}>Processando</span>;
  }
}

function BadgeFinanceiro(g: StatusFinanceiroGestao): JSX.Element {
  const base = 'rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1';
  switch (g) {
    case 'OK':
      return <span className={`${base} bg-emerald-500/15 text-emerald-200 ring-emerald-500/25`}>OK</span>;
    case 'PENDENTE':
      return <span className={`${base} bg-amber-500/15 text-amber-100 ring-amber-500/30`}>Pendente</span>;
    case 'ESTORNO_PENDENTE':
      return <span className={`${base} bg-orange-500/20 text-orange-100 ring-orange-500/35`}>Estorno pendente</span>;
    case 'CANCELADO':
      return <span className={`${base} bg-slate-600/30 text-slate-300 ring-slate-500/20`}>Cancelado</span>;
    default:
      return <span className={`${base} bg-slate-500/15 text-slate-200`}>—</span>;
  }
}

export function GestaoVendasPage(): JSX.Element {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<GestaoVendaListItemDto[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 20;

  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [cliente, setCliente] = useState('');
  const [origem, setOrigem] = useState<OrigemVendaDisplay | ''>('');
  const [tipoDoc, setTipoDoc] = useState<TipoDocumentoVendaDto | ''>('');
  const [stFiscal, setStFiscal] = useState<StatusFiscalGestao | ''>('');
  const [stFin, setStFin] = useState<StatusFinanceiroGestao | ''>('');

  const [detalhe, setDetalhe] = useState<VendaDetalheResumo | null>(null);
  const [detalheAberto, setDetalheAberto] = useState(false);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<GestaoVendaListResponseDto>('/api/vendas/gestao-vendas', {
        params: {
          page,
          pageSize,
          ...(dataInicio ? { dataInicio } : {}),
          ...(dataFim ? { dataFim } : {}),
          ...(cliente.trim() ? { cliente: cliente.trim() } : {}),
          ...(origem ? { origem } : {}),
          ...(tipoDoc ? { tipoDocumentoVenda: tipoDoc } : {}),
          ...(stFiscal ? { statusFiscalGestao: stFiscal } : {}),
          ...(stFin ? { statusFinanceiro: stFin } : {}),
        },
      });
      setRows(data.itens);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (err) {
      const ax = err as AxiosError<{ error?: string; message?: string }>;
      const msg =
        ax.response?.data?.error ||
        ax.response?.data?.message ||
        ax.message ||
        'Erro ao carregar gestão de vendas.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, dataInicio, dataFim, cliente, origem, tipoDoc, stFiscal, stFin]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const abrirDetalhe = async (id: string) => {
    try {
      const { data } = await api.get<VendaDetalheResumo>(`/api/vendas/${id}`);
      setDetalhe(data);
      setDetalheAberto(true);
    } catch {
      toast.error('Não foi possível carregar a venda.');
    }
  };

  const emitirNfce = async (id: string) => {
    try {
      await api.post(`/api/vendas/${id}/emitir-nfce`, {});
      toast.success('NFC-e enviada para emissão.');
      void carregar();
    } catch (err) {
      const ax = err as AxiosError<{ error?: string }>;
      toast.error(ax.response?.data?.error || 'Falha ao emitir NFC-e.');
    }
  };

  const reimprimirOuVisualizarPdf = async (id: string, modelo: string) => {
    try {
      const pdfRes = await api.get(`/api/vendas/${id}/pdf?modelo=${modelo}`, { responseType: 'blob' });
      window.open(URL.createObjectURL(new Blob([pdfRes.data], { type: 'application/pdf' })), '_blank');
    } catch {
      toast.error('PDF não disponível.');
    }
  };

  const cancelarVenda = async (row: GestaoVendaListItemDto) => {
    const justificativa = window.prompt('Justificativa de cancelamento (mínimo 15 caracteres):');
    if (!justificativa || justificativa.length < 15) {
      toast.warn('Cancelamento exige justificativa com pelo menos 15 caracteres.');
      return;
    }
    try {
      await api.post(`/api/vendas/${row.id}/cancelar`, { justificativa });
      toast.success('Cancelamento registrado.');
      void carregar();
    } catch (err) {
      const ax = err as AxiosError<{ error?: string }>;
      toast.error(ax.response?.data?.error || 'Não foi possível cancelar.');
    }
  };

  const labelPedidoVenda = (row: GestaoVendaListItemDto): string => {
    const n = row.numeroPedido ?? row.numeroVenda;
    return String(n);
  };

  return (
    <Layout>
      <div className="mx-auto flex max-w-[1400px] flex-col gap-4 p-4 text-slate-100">
        <div className="flex items-center gap-2 border-b border-white/10 pb-3">
          <h1 className="text-xl font-semibold tracking-tight text-white">Gestão de Vendas</h1>
        </div>
        <div className="flex flex-wrap items-end gap-3 rounded-xl border border-white/10 bg-slate-900/50 p-4">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">De</label>
            <input
              type="date"
              className="rounded-lg border border-white/10 bg-slate-950 px-2 py-1.5 text-sm"
              value={dataInicio}
              onChange={(e) => {
                setPage(1);
                setDataInicio(e.target.value);
              }}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Até</label>
            <input
              type="date"
              className="rounded-lg border border-white/10 bg-slate-950 px-2 py-1.5 text-sm"
              value={dataFim}
              onChange={(e) => {
                setPage(1);
                setDataFim(e.target.value);
              }}
            />
          </div>
          <div className="flex min-w-[180px] flex-col gap-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Cliente</label>
            <input
              className="rounded-lg border border-white/10 bg-slate-950 px-2 py-1.5 text-sm"
              placeholder="Nome"
              value={cliente}
              onChange={(e) => {
                setPage(1);
                setCliente(e.target.value);
              }}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Origem</label>
            <select
              className="rounded-lg border border-white/10 bg-slate-950 px-2 py-1.5 text-sm"
              value={origem}
              onChange={(e) => {
                setPage(1);
                setOrigem(e.target.value as OrigemVendaDisplay | '');
              }}
            >
              <option value="">Todas</option>
              <option value="PDV">PDV</option>
              <option value="MENU">Menu</option>
              <option value="MESA">Mesa</option>
              <option value="DELIVERY">Delivery</option>
              <option value="TOTEM">Totem</option>
              <option value="RETIRADA">Retirada</option>
              <option value="OUTRO">Outro</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Documento</label>
            <select
              className="rounded-lg border border-white/10 bg-slate-950 px-2 py-1.5 text-sm"
              value={tipoDoc}
              onChange={(e) => {
                setPage(1);
                setTipoDoc(e.target.value as TipoDocumentoVendaDto | '');
              }}
            >
              <option value="">Todos</option>
              <option value="NFCE">NFC-e</option>
              <option value="CONSUMIDOR">Consumidor</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Fiscal</label>
            <select
              className="rounded-lg border border-white/10 bg-slate-950 px-2 py-1.5 text-sm"
              value={stFiscal}
              onChange={(e) => {
                setPage(1);
                setStFiscal(e.target.value as StatusFiscalGestao | '');
              }}
            >
              <option value="">Todos</option>
              <option value="NAO_EMITIDO">Não emitido</option>
              <option value="EMITIDO">Emitido</option>
              <option value="PROCESSANDO">Processando</option>
              <option value="CANCELADO">Cancelado</option>
              <option value="CANCELAMENTO_PENDENTE">Cancelamento pendente</option>
              <option value="REJEITADO">Rejeitado</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Financeiro</label>
            <select
              className="rounded-lg border border-white/10 bg-slate-950 px-2 py-1.5 text-sm"
              value={stFin}
              onChange={(e) => {
                setPage(1);
                setStFin(e.target.value as StatusFinanceiroGestao | '');
              }}
            >
              <option value="">Todos</option>
              <option value="OK">OK</option>
              <option value="PENDENTE">Pendente</option>
              <option value="ESTORNO_PENDENTE">Estorno pendente</option>
              <option value="CANCELADO">Cancelado</option>
            </select>
          </div>
          <button
            type="button"
            onClick={() => void carregar()}
            className="ml-auto inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Aplicar
          </button>
          <button
            type="button"
            onClick={() => {
              setDataInicio('');
              setDataFim('');
              setCliente('');
              setOrigem('');
              setTipoDoc('');
              setStFiscal('');
              setStFin('');
              setPage(1);
            }}
            className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-sm text-slate-200 hover:bg-white/5"
          >
            <RefreshCw className="h-4 w-4" />
            Limpar
          </button>
        </div>

        <div className="overflow-x-auto rounded-xl border border-white/10 bg-slate-900/40">
          <table className="w-full min-w-[1040px] text-left text-sm">
            <thead className="border-b border-white/10 bg-slate-950/80 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-3 py-3">Origem</th>
                <th className="px-3 py-3">Atendimento</th>
                <th className="px-3 py-3">Nº Pedido / Venda</th>
                <th className="px-3 py-3">Cliente</th>
                <th className="px-3 py-3">Data/Hora</th>
                <th className="px-3 py-3">Valor</th>
                <th className="px-3 py-3">Documento</th>
                <th className="px-3 py-3">Fiscal</th>
                <th className="px-3 py-3">Financeiro</th>
                <th className="px-3 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading && rows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-3 py-12 text-center text-slate-400">
                    <Loader2 className="mx-auto h-8 w-8 animate-spin opacity-60" />
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-3 py-12 text-center text-slate-500">
                    Nenhuma venda encontrada.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="border-b border-white/5 hover:bg-white/[0.03]">
                    <td className="px-3 py-2.5">{row.origem}</td>
                    <td className="px-3 py-2.5 text-xs text-slate-300">
                      {row.tipoAtendimento ?? '—'}
                      {row.pagamentoPosterior ? (
                        <span className="ml-1 block text-[10px] font-semibold uppercase tracking-wide text-amber-300/90">
                          Pgto na retirada/entrega
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-xs">{labelPedidoVenda(row)}</td>
                    <td className="px-3 py-2.5">{row.clienteNome}</td>
                    <td className="px-3 py-2.5 text-xs text-slate-300">{fmtDataHora(row.dataHora)}</td>
                    <td className="px-3 py-2.5">{fmtMoney(row.valorTotal)}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-col gap-1">
                        {BadgeDoc(row.tipoDocumentoVenda)}
                        <span className="text-[11px] text-slate-400">{row.numeroDocumento}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">{BadgeFiscal(row.statusFiscalGestao)}</td>
                    <td className="px-3 py-2.5">{BadgeFinanceiro(row.statusFinanceiro)}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-wrap justify-end gap-1.5">
                        <button
                          type="button"
                          title="Visualizar venda"
                          onClick={() => void abrirDetalhe(row.id)}
                          className="rounded-md border border-white/10 p-1.5 text-slate-200 hover:bg-white/10"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {row.podeEmitirFiscal && (
                          <button
                            type="button"
                            title="Emitir NFC-e"
                            onClick={() => void emitirNfce(row.id)}
                            className="rounded-md border border-violet-500/40 bg-violet-500/10 p-1.5 text-violet-100 hover:bg-violet-500/20"
                          >
                            <Receipt className="h-4 w-4" />
                          </button>
                        )}
                        {row.podeReimprimir && (
                          <button
                            type="button"
                            title="Reimprimir"
                            onClick={() =>
                              void reimprimirOuVisualizarPdf(row.id, row.modeloNota ?? '65')
                            }
                            className="rounded-md border border-white/10 p-1.5 text-slate-200 hover:bg-white/10"
                          >
                            <Printer className="h-4 w-4" />
                          </button>
                        )}
                        {row.tipoDocumentoVenda === 'NFCE' && row.possuiDocumentoFiscal && (
                          <button
                            type="button"
                            title="Visualizar PDF"
                            onClick={() =>
                              void reimprimirOuVisualizarPdf(row.id, row.modeloNota ?? '65')
                            }
                            className="rounded-md border border-white/10 p-1.5 text-slate-200 hover:bg-white/10"
                          >
                            <FileText className="h-4 w-4" />
                          </button>
                        )}
                        {!row.cancelada && (
                          <button
                            type="button"
                            title="Cancelar"
                            onClick={() => void cancelarVenda(row)}
                            className="rounded-md border border-rose-500/30 p-1.5 text-rose-200 hover:bg-rose-500/10"
                          >
                            <XCircle className="h-4 w-4" />
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

        <div className="flex items-center justify-between text-sm text-slate-400">
          <span>
            Total: {total} · Página {page} / {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-lg border border-white/10 px-3 py-1 disabled:opacity-40"
            >
              Anterior
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg border border-white/10 px-3 py-1 disabled:opacity-40"
            >
              Próxima
            </button>
          </div>
        </div>
      </div>

      {detalheAberto && detalhe && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl border border-white/10 bg-slate-900 p-5 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Venda #{detalhe.numeroVenda ?? '—'}</h3>
              <button
                type="button"
                onClick={() => setDetalheAberto(false)}
                className="rounded-md p-1 text-slate-400 hover:bg-white/10 hover:text-white"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm text-slate-300">
              <span className="text-slate-500">Cliente:</span> {detalhe.nomeCliente ?? '—'}
            </p>
            <p className="text-sm text-slate-300">
              <span className="text-slate-500">Status:</span> {detalhe.status ?? '—'}
            </p>
            <p className="text-sm text-slate-300">
              <span className="text-slate-500">Valor:</span>{' '}
              {fmtMoney(Number(detalhe.valorTotal ?? 0))}
            </p>
            {detalhe.itens && detalhe.itens.length > 0 && (
              <ul className="mt-3 space-y-1 border-t border-white/10 pt-3 text-sm">
                {detalhe.itens.map((it, i) => (
                  <li key={i} className="flex justify-between gap-2 text-slate-300">
                    <span>
                      {it.produto?.nome ?? 'Item'} × {it.quantidade}
                    </span>
                    <span>{fmtMoney(Number(it.valorTotal))}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </Layout>
  );
}
