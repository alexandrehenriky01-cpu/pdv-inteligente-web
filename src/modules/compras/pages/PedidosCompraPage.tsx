import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Layout } from '../../../components/Layout';
import { api } from '../../../services/api';
import {
  FileSignature,
  CheckCircle,
  XCircle,
  Clock,
  Truck,
  FileText,
  AlertCircle,
  Loader2,
  Sparkles,
  ShieldCheck,
  CircleDollarSign,
  ClipboardList,
  Printer,
  Mail,
  MessageCircle,
  RotateCcw,
} from 'lucide-react';
import { AxiosError } from 'axios';

export interface IProdutoResumo {
  id: string;
  nome: string;
}

export interface IItemPedido {
  id: string;
  produtoId: string;
  produto?: IProdutoResumo;
  quantidadePedida: string | number;
  valorUnitario: string | number;
  valorTotal: string | number;
}

export interface IFornecedorResumo {
  id: string;
  razaoSocial: string;
  nomeFantasia?: string;
  contatos?: { telefone?: string; whatsapp?: string; email?: string }[];
}

export interface IPedidoCompra {
  id: string;
  dataPedido: string | Date;
  status: string;
  valorTotal: string | number;
  fornecedor?: IFornecedorResumo;
  motivoReprovacao?: string;
  observacao?: string | null;
  observacoes?: string | null;
  condicaoPagamento?: string | null;
  prazoEntrega?: string | null;
  itens: IItemPedido[];
}

type TabPedido = 'PENDENTES' | 'APROVADOS' | 'REPROVADOS' | 'CANCELADOS';

function pedidoNaTab(status: string, tab: TabPedido): boolean {
  if (tab === 'PENDENTES') return status === 'AGUARDANDO_DIRETORIA';
  if (tab === 'APROVADOS') {
    return ['APROVADO', 'ENVIADO_FORNECEDOR', 'RECEBIDO_PARCIAL', 'RECEBIDO_TOTAL'].includes(
      status,
    );
  }
  if (tab === 'REPROVADOS') return status === 'REPROVADO';
  if (tab === 'CANCELADOS') return status === 'CANCELADO';
  return false;
}

/** Aba correta para exibir um pedido (ex.: deep link a partir da listagem de NF-e). */
function tabParaStatusPedido(status: string): TabPedido {
  if (pedidoNaTab(status, 'PENDENTES')) return 'PENDENTES';
  if (pedidoNaTab(status, 'APROVADOS')) return 'APROVADOS';
  if (pedidoNaTab(status, 'REPROVADOS')) return 'REPROVADOS';
  if (pedidoNaTab(status, 'CANCELADOS')) return 'CANCELADOS';
  return 'APROVADOS';
}

function montarResumoPedidoTexto(p: IPedidoCompra): string {
  const forn = p.fornecedor?.nomeFantasia || p.fornecedor?.razaoSocial || 'FORNECEDOR';
  let t = `PEDIDO DE COMPRA #${p.id.substring(0, 6).toUpperCase()}\n`;
  t += `FORNECEDOR: ${forn}\n`;
  if (p.condicaoPagamento) t += `CONDIÇÃO PAGTO: ${p.condicaoPagamento}\n`;
  if (p.prazoEntrega) t += `PRAZO ENTREGA: ${p.prazoEntrega}\n`;
  if (p.observacoes || p.observacao) {
    t += `OBS: ${p.observacoes || p.observacao}\n`;
  }
  t += '\nITENS:\n';
  p.itens.forEach((i) => {
    t += `- ${Number(i.quantidadePedida)} x ${i.produto?.nome || 'ITEM'} (UNIT R$ ${Number(i.valorUnitario).toFixed(2)})\n`;
  });
  t += `\nVALOR TOTAL: R$ ${Number(p.valorTotal).toFixed(2)}`;
  return t;
}

interface IUsuarioStorage {
  role?: string;
  [key: string]: unknown;
}

export function PedidosCompraPage() {
  const location = useLocation();
  const highlightPedidoId =
    (location.state as { highlightPedidoId?: string } | null)?.highlightPedidoId ?? undefined;
  const highlightAplicado = useRef<string | null>(null);

  const [pedidos, setPedidos] = useState<IPedidoCompra[]>([]);
  const [loading, setLoading] = useState(false);
  const [tabPedido, setTabPedido] = useState<TabPedido>('PENDENTES');
  const [editPedidoId, setEditPedidoId] = useState<string | null>(null);
  const [editObservacoes, setEditObservacoes] = useState('');
  const [editCondicao, setEditCondicao] = useState('');
  const [editPrazo, setEditPrazo] = useState('');
  const [salvandoCampos, setSalvandoCampos] = useState(false);

  const usuarioLogado = JSON.parse(localStorage.getItem('@PDVUsuario') || '{}') as IUsuarioStorage;
  const isDiretoria =
    usuarioLogado.role === 'DIRETOR' ||
    usuarioLogado.role === 'GERENTE' ||
    usuarioLogado.role === 'SUPER_ADMIN';

  useEffect(() => {
    carregarDados();
  }, []);

  useEffect(() => {
    if (!highlightPedidoId || pedidos.length === 0) return;
    if (highlightAplicado.current === highlightPedidoId) return;
    const alvo = pedidos.find((p) => p.id === highlightPedidoId);
    if (!alvo) return;
    highlightAplicado.current = highlightPedidoId;
    setTabPedido(tabParaStatusPedido(alvo.status));
    window.setTimeout(() => {
      document.getElementById(`pedido-compra-${highlightPedidoId}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }, 280);
  }, [highlightPedidoId, pedidos]);

  const carregarDados = async () => {
    setLoading(true);
    try {
      const response = await api.get<IPedidoCompra[]>('/api/compras/pedidos');
      setPedidos(response.data);
    } catch (error) {
      console.error('Erro ao carregar pedidos de compra:', error);
    } finally {
      setLoading(false);
    }
  };

  const pedidosFiltrados = pedidos.filter((p) => pedidoNaTab(p.status, tabPedido));

  const iniciarEdicaoPedido = (p: IPedidoCompra) => {
    setEditPedidoId(p.id);
    setEditObservacoes(p.observacoes || p.observacao || '');
    setEditCondicao(p.condicaoPagamento || '');
    setEditPrazo(p.prazoEntrega || '');
  };

  const salvarCamposPedido = async () => {
    if (!editPedidoId) return;
    const u = (s: string) => s.trim().toUpperCase();
    setSalvandoCampos(true);
    try {
      await api.patch(`/api/compras/pedidos/${editPedidoId}`, {
        observacoes: editObservacoes.trim() ? u(editObservacoes) : null,
        condicaoPagamento: editCondicao.trim() ? u(editCondicao) : null,
        prazoEntrega: editPrazo.trim() ? u(editPrazo) : null,
      });
      setEditPedidoId(null);
      await carregarDados();
    } catch (err) {
      const e = err as AxiosError<{ error?: string }>;
      alert(e.response?.data?.error || 'Erro ao salvar dados do pedido.');
    } finally {
      setSalvandoCampos(false);
    }
  };

  const reabrirPedido = async (id: string) => {
    if (!window.confirm('Reabrir este pedido para nova avaliação da diretoria?')) return;
    try {
      await api.put(`/api/compras/pedidos/${id}/reabrir`);
      alert('✅ Pedido reaberto como pendente.');
      await carregarDados();
    } catch (err) {
      const e = err as AxiosError<{ error?: string }>;
      alert(e.response?.data?.error || 'Erro ao reabrir.');
    }
  };

  const imprimirPedido = (p: IPedidoCompra) => {
    const w = window.open('', '_blank');
    if (!w) return;
    const texto = montarResumoPedidoTexto(p)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    w.document.write(
      `<!DOCTYPE html><html><head><title>Pedido ${p.id.substring(0, 6)}</title>
      <style>body{font-family:system-ui;padding:24px;background:#fff;color:#111}</style></head>
      <body><pre style="white-space:pre-wrap;font-family:monospace">${texto}</pre>
      <script>window.onload=function(){window.print();}</script></body></html>`,
    );
    w.document.close();
  };

  const emailPedido = (p: IPedidoCompra) => {
    const emails =
      p.fornecedor?.contatos
        ?.map((c) => c.email)
        .filter(Boolean)
        .join(',') || '';
    const subject = encodeURIComponent(`PEDIDO DE COMPRA #${p.id.substring(0, 6).toUpperCase()}`);
    const body = encodeURIComponent(montarResumoPedidoTexto(p));
    window.location.href = `mailto:${emails}?subject=${subject}&body=${body}`;
  };

  const whatsappPedido = (p: IPedidoCompra) => {
    const texto = montarResumoPedidoTexto(p);
    window.open(
      `https://wa.me/?text=${encodeURIComponent(texto)}`,
      '_blank',
    );
  };

  const avaliarPedido = async (id: string, status: 'APROVADO' | 'REPROVADO') => {
    let motivo = '';
    if (status === 'REPROVADO') {
      motivo = window.prompt('Qual o motivo da reprovação deste gasto?') || '';
      if (!motivo) return;
    } else {
      if (!window.confirm('Aprovar este pedido de compra e liberar o envio ao fornecedor?')) return;
    }

    try {
      await api.put(`/api/compras/pedidos/${id}/avaliar`, {
        status,
        motivoReprovacao: motivo
      });

      alert(`✅ Pedido ${status.toLowerCase()} com sucesso!`);
      carregarDados();
    } catch (err) {
      const error = err as AxiosError<{ error?: string }>;
      alert(error.response?.data?.error || 'Erro ao avaliar pedido.');
    }
  };

  const enviarAoFornecedorWhatsApp = async (pedido: IPedidoCompra) => {
    try {
      await api.put(`/api/compras/pedidos/${pedido.id}/avaliar`, { status: 'ENVIADO_FORNECEDOR' });
      carregarDados();
    } catch (err) {
      const error = err as AxiosError<{ error?: string }>;
      console.error('Erro ao atualizar status de envio', error.response?.data || error.message);
    }

    const telefone =
      pedido.fornecedor?.contatos?.[0]?.whatsapp ||
      pedido.fornecedor?.contatos?.[0]?.telefone ||
      '';
    const numLimpo = telefone.replace(/\D/g, '');

    let texto = `Olá! Segue nosso Pedido de Compra *#${pedido.id.substring(0, 6).toUpperCase()}* aprovado.%0A%0A`;
    texto += `*Itens do Pedido:*%0A`;
    pedido.itens.forEach((i) => {
      texto += `- ${Number(i.quantidadePedida)}x ${i.produto?.nome} (R$ ${Number(i.valorUnitario).toFixed(2)})%0A`;
    });
    texto += `%0A*Valor Total:* R$ ${Number(pedido.valorTotal).toFixed(2)}%0A%0A`;
    texto += `Por favor, emitir a Nota Fiscal constando este número de pedido. Aguardamos a entrega!`;

    window.open(`https://wa.me/55${numLimpo}?text=${texto}`, '_blank');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'AGUARDANDO_DIRETORIA':
        return (
          <span className="inline-flex w-max items-center gap-1 rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-amber-300">
            <Clock className="h-3 w-3" />
            Aguardando aprovação
          </span>
        );
      case 'APROVADO':
        return (
          <span className="inline-flex w-max items-center gap-1 rounded-full border border-sky-400/20 bg-sky-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-sky-300">
            <FileSignature className="h-3 w-3" />
            Aprovado
          </span>
        );
      case 'ENVIADO_FORNECEDOR':
        return (
          <span className="inline-flex w-max items-center gap-1 rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-violet-300">
            <Truck className="h-3 w-3" />
            Enviado ao fornecedor
          </span>
        );
      case 'RECEBIDO_TOTAL':
        return (
          <span className="inline-flex w-max items-center gap-1 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-300">
            <CheckCircle className="h-3 w-3" />
            NF recebida
          </span>
        );
      case 'REPROVADO':
        return (
          <span className="inline-flex w-max items-center gap-1 rounded-full border border-rose-400/20 bg-rose-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-rose-300">
            <XCircle className="h-3 w-3" />
            Reprovado
          </span>
        );
      case 'CANCELADO':
        return (
          <span className="inline-flex w-max items-center gap-1 rounded-full border border-slate-500/30 bg-slate-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
            <XCircle className="h-3 w-3" />
            Cancelado
          </span>
        );
      default:
        return (
          <span className="inline-flex w-max rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
            {status}
          </span>
        );
    }
  };

  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
  };

  return (
    <Layout>
      <div className="mx-auto flex h-full max-w-7xl flex-col space-y-6 pb-12">
        <div className="relative overflow-hidden rounded-[30px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.12),_transparent_24%),radial-gradient(circle_at_top_right,_rgba(139,92,246,0.10),_transparent_20%),linear-gradient(135deg,_#0b1020_0%,_#08101f_45%,_#0a1224_100%)] p-6 shadow-[0_25px_70px_rgba(0,0,0,0.40)] sm:p-8">
          <div className="pointer-events-none absolute -left-10 top-0 h-52 w-52 rounded-full bg-emerald-600/12 blur-[100px]" />
          <div className="pointer-events-none absolute right-0 top-0 h-56 w-56 rounded-full bg-violet-600/10 blur-[100px]" />

          <div className="relative z-10 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-300">
                <Sparkles className="h-3.5 w-3.5" />
                Procurement Flow
              </div>

              <h1 className="flex items-center gap-4 text-3xl font-black tracking-tight text-white">
                <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-3 shadow-[0_0_20px_rgba(16,185,129,0.12)]">
                  <FileText className="h-8 w-8 text-emerald-300" />
                </div>
                Pedidos de Compra
              </h1>

              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300 sm:text-[15px]">
                Controle de alçada, aprovação gerencial e acompanhamento do envio aos
                fornecedores em um fluxo único, claro e operacional.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="h-8 w-2 rounded-full bg-gradient-to-b from-emerald-400 to-violet-400" />
          <div>
            <h2 className="text-xl font-black tracking-tight text-white">
              Fluxo de pedidos
            </h2>
            <p className="text-sm text-slate-400">
              Visualize pedidos em aprovação, enviados, recebidos ou reprovados.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 rounded-2xl border border-white/10 bg-[#08101f]/80 p-2">
          {(['PENDENTES', 'APROVADOS', 'REPROVADOS', 'CANCELADOS'] as TabPedido[]).map(
            (t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTabPedido(t)}
                className={`rounded-xl px-4 py-2 text-xs font-black uppercase tracking-wider transition-colors ${
                  tabPedido === t
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                {t === 'PENDENTES' && 'Pendentes'}
                {t === 'APROVADOS' && 'Aprovados'}
                {t === 'REPROVADOS' && 'Reprovados'}
                {t === 'CANCELADOS' && 'Cancelados'}
              </button>
            ),
          )}
        </div>

        <div className="flex-1 space-y-6">
          {loading && pedidos.length === 0 ? (
            <div className="rounded-[30px] border border-white/10 bg-[#08101f]/90 p-12 text-center shadow-[0_20px_50px_rgba(0,0,0,0.35)]">
              <div className="flex flex-col items-center gap-4">
                <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4">
                  <Loader2 className="h-8 w-8 animate-spin text-emerald-300" />
                </div>
                <p className="text-base font-bold text-slate-300">
                  Carregando pedidos de compra...
                </p>
              </div>
            </div>
          ) : pedidosFiltrados.length === 0 ? (
            <div className="relative overflow-hidden rounded-[30px] border border-white/10 border-dashed bg-[#08101f]/90 py-20 text-center shadow-[0_20px_50px_rgba(0,0,0,0.35)]">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.08),_transparent_28%)]" />
              <div className="relative z-10 flex flex-col items-center">
                <div className="mb-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                  <AlertCircle className="h-12 w-12 text-slate-500" />
                </div>
                <h3 className="mb-2 text-2xl font-black text-white">
                  {pedidos.length === 0
                    ? 'Nenhum pedido de compra'
                    : 'Nenhum pedido nesta aba'}
                </h3>
                <p className="max-w-md text-base leading-7 text-slate-400">
                  {pedidos.length === 0
                    ? 'Os pedidos aparecerão aqui quando as cotações forem aprovadas.'
                    : 'Altere a aba acima ou aguarde novos movimentos no fluxo.'}
                </p>
              </div>
            </div>
          ) : (
            pedidosFiltrados.map(pedido => (
              <div
                key={pedido.id}
                id={`pedido-compra-${pedido.id}`}
                className={`overflow-hidden rounded-[30px] border border-white/10 bg-[#08101f]/90 shadow-[0_20px_50px_rgba(0,0,0,0.35)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-emerald-400/15 ${
                  highlightPedidoId === pedido.id ? 'ring-2 ring-cyan-400/40 ring-offset-2 ring-offset-[#0b1020]' : ''
                }`}
              >
                <div className="flex flex-col gap-4 border-b border-white/10 bg-black/10 p-6 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="mb-2 flex flex-wrap items-center gap-3">
                      <span className="text-xl font-black tracking-tight text-white">
                        PC #{pedido.id.substring(0, 6).toUpperCase()}
                      </span>
                      {getStatusBadge(pedido.status)}
                    </div>

                    <p className="mt-2 flex items-center gap-2 text-sm text-slate-400">
                      <Truck className="h-4 w-4 text-slate-500" />
                      Fornecedor:
                      <strong className="text-slate-200">
                        {pedido.fornecedor?.nomeFantasia || pedido.fornecedor?.razaoSocial}
                      </strong>
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        title="Imprimir"
                        onClick={() => imprimirPedido(pedido)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-300 hover:border-violet-400/30 hover:text-white"
                      >
                        <Printer className="h-3.5 w-3.5" /> Imprimir
                      </button>
                      <button
                        type="button"
                        title="E-mail"
                        onClick={() => emailPedido(pedido)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-300 hover:border-sky-400/30 hover:text-white"
                      >
                        <Mail className="h-3.5 w-3.5" /> E-mail
                      </button>
                      <button
                        type="button"
                        title="WhatsApp"
                        onClick={() => whatsappPedido(pedido)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-300 hover:border-emerald-400/30 hover:text-white"
                      >
                        <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                      </button>
                    </div>
                  </div>

                  <div className="w-full rounded-2xl border border-white/10 bg-[#0b1324] p-4 md:w-auto md:min-w-[230px] md:text-right">
                    <p className="mb-1 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                      Valor total do pedido
                    </p>
                    <p className="text-3xl font-black text-emerald-300">
                      {formatarMoeda(Number(pedido.valorTotal))}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-8 p-6 lg:flex-row">
                  <div className="min-w-0 flex-1 overflow-x-auto">
                    <div className="mb-4 flex items-center gap-2">
                      <ClipboardList className="h-4 w-4 text-violet-300" />
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                        Itens do pedido
                      </p>
                    </div>

                    <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/10">
                      <table className="min-w-[560px] w-full text-left text-sm">
                        <thead>
                          <tr className="border-b border-white/10 bg-white/5 text-slate-400">
                            <th className="px-4 py-3 text-xs font-bold uppercase tracking-[0.16em]">
                              Produto
                            </th>
                            <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-[0.16em]">
                              Qtd
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-[0.16em]">
                              V. Unit
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-[0.16em]">
                              Subtotal
                            </th>
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-white/5">
                          {pedido.itens.map(item => (
                            <tr key={item.id} className="transition-colors hover:bg-white/5">
                              <td className="px-4 py-3.5 font-bold text-slate-200">
                                {item.produto?.nome}
                              </td>
                              <td className="px-4 py-3.5 text-center font-medium text-slate-400">
                                {Number(item.quantidadePedida)}
                              </td>
                              <td className="px-4 py-3.5 text-right font-mono text-slate-400">
                                {formatarMoeda(Number(item.valorUnitario))}
                              </td>
                              <td className="px-4 py-3.5 text-right font-mono font-black text-white">
                                {formatarMoeda(Number(item.valorTotal))}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="w-full shrink-0 border-t border-white/10 pt-6 lg:w-80 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
                    {isDiretoria && pedido.status === 'AGUARDANDO_DIRETORIA' && (
                      <div className="space-y-3 rounded-3xl border border-white/10 bg-black/10 p-5">
                        <div className="mb-1 flex items-center gap-2">
                          <ShieldCheck className="h-4 w-4 text-violet-300" />
                          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                            Dados antes da aprovação
                          </p>
                        </div>
                        {editPedidoId === pedido.id ? (
                          <div className="space-y-2">
                            <input
                              value={editObservacoes}
                              onChange={(e) => setEditObservacoes(e.target.value)}
                              placeholder="OBSERVAÇÕES"
                              className="w-full rounded-xl border border-white/10 bg-[#0b1324] px-3 py-2 text-xs text-white uppercase placeholder:text-slate-600"
                            />
                            <input
                              value={editCondicao}
                              onChange={(e) => setEditCondicao(e.target.value)}
                              placeholder="CONDIÇÃO DE PAGAMENTO"
                              className="w-full rounded-xl border border-white/10 bg-[#0b1324] px-3 py-2 text-xs text-white uppercase placeholder:text-slate-600"
                            />
                            <input
                              value={editPrazo}
                              onChange={(e) => setEditPrazo(e.target.value)}
                              placeholder="PRAZO DE ENTREGA"
                              className="w-full rounded-xl border border-white/10 bg-[#0b1324] px-3 py-2 text-xs text-white uppercase placeholder:text-slate-600"
                            />
                            <div className="flex gap-2">
                              <button
                                type="button"
                                disabled={salvandoCampos}
                                onClick={() => void salvarCamposPedido()}
                                className="flex-1 rounded-xl bg-violet-600 py-2 text-xs font-black text-white"
                              >
                                {salvandoCampos ? '...' : 'Salvar'}
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditPedidoId(null)}
                                className="rounded-xl border border-white/10 px-3 py-2 text-xs text-slate-400"
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => iniciarEdicaoPedido(pedido)}
                            className="w-full rounded-xl border border-violet-500/30 py-2 text-xs font-bold text-violet-200 hover:bg-violet-500/10"
                          >
                            Editar observações / pagamento / prazo
                          </button>
                        )}

                        <div className="border-t border-white/10 pt-3">
                          <p className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                            Alçada de aprovação
                          </p>
                        </div>

                        <button
                          onClick={() => avaliarPedido(pedido.id, 'APROVADO')}
                          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-emerald-400/20 bg-gradient-to-r from-emerald-600 to-emerald-500 px-6 py-3.5 font-black text-white shadow-[0_0_20px_rgba(16,185,129,0.22)] transition-all hover:scale-[1.02] hover:brightness-110"
                        >
                          <CheckCircle className="h-5 w-5" />
                          Aprovar compra
                        </button>

                        <button
                          onClick={() => avaliarPedido(pedido.id, 'REPROVADO')}
                          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-6 py-3.5 font-bold text-slate-300 transition-all hover:border-rose-400/20 hover:bg-rose-500/10 hover:text-rose-300"
                        >
                          <XCircle className="h-5 w-5" />
                          Reprovar
                        </button>
                      </div>
                    )}

                    {(pedido.status === 'APROVADO' || pedido.status === 'ENVIADO_FORNECEDOR') && (
                      <div className="space-y-3 rounded-3xl border border-white/10 bg-black/10 p-5">
                        <div className="mb-1 flex items-center gap-2">
                          <Truck className="h-4 w-4 text-violet-300" />
                          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                            Envio operacional
                          </p>
                        </div>

                        <button
                          onClick={() => enviarAoFornecedorWhatsApp(pedido)}
                          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-emerald-400/20 bg-gradient-to-r from-emerald-600 to-emerald-500 px-6 py-4 font-black text-white shadow-[0_0_22px_rgba(16,185,129,0.22)] transition-all hover:scale-[1.02] hover:brightness-110"
                        >
                          <Truck className="h-5 w-5" />
                          {pedido.status === 'ENVIADO_FORNECEDOR' ? 'Reenviar pedido' : 'Enviar via WhatsApp'}
                        </button>

                        {pedido.status === 'ENVIADO_FORNECEDOR' && (
                          <p className="px-2 text-center text-xs leading-6 text-slate-500">
                            Aguardando fornecedor enviar a Nota Fiscal (XML) para recebimento.
                          </p>
                        )}
                      </div>
                    )}

                    {pedido.status === 'REPROVADO' && (
                      <div className="rounded-3xl border border-rose-400/20 bg-rose-500/10 p-5">
                        <p className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-rose-300">
                          <XCircle className="h-4 w-4" />
                          Motivo da reprovação
                        </p>
                        <p className="text-sm italic leading-7 text-rose-100">
                          "{pedido.motivoReprovacao}"
                        </p>
                      </div>
                    )}

                    {isDiretoria &&
                      ['APROVADO', 'REPROVADO', 'CANCELADO'].includes(pedido.status) && (
                        <button
                          type="button"
                          onClick={() => void reabrirPedido(pedido.id)}
                          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-amber-500/30 py-3 text-xs font-black uppercase tracking-wider text-amber-200 hover:bg-amber-500/10"
                        >
                          <RotateCcw className="h-4 w-4" />
                          Desfazer / Reavaliar
                        </button>
                      )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
}