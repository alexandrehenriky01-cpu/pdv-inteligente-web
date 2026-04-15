import { useCallback, useEffect, useMemo, useState } from 'react';
import { Layout } from '../../../components/Layout';
import { api } from '../../../services/api';
import {
  AlertCircle,
  ClipboardCheck,
  Loader2,
  PackageCheck,
  Sparkles,
  Truck,
} from 'lucide-react';
import { AxiosError } from 'axios';

interface IProdutoResumo {
  id: string;
  nome: string;
  codigo: string;
}

interface IItemPedidoRec {
  id: string;
  produtoId: string;
  quantidadePedida: string | number;
  quantidadeRecebida: string | number;
  valorUnitario: string | number;
  valorTotal: string | number;
  produto?: IProdutoResumo;
}

interface IFornecedorRec {
  id: string;
  razaoSocial: string;
  nomeFantasia?: string | null;
  cnpjCpf?: string | null;
}

interface IPedidoElegivel {
  id: string;
  status: string;
  dataPedido: string;
  valorTotal: string | number;
  fornecedor?: IFornecedorRec;
  itens: IItemPedidoRec[];
}

interface IApiList {
  sucesso: boolean;
  dados?: IPedidoElegivel[];
  erro?: string;
}

interface IApiProc {
  sucesso: boolean;
  dados?: {
    message: string;
    documentoEntradaId: string;
    tituloId: string;
    pedidoCompraId: string;
    novoStatusPedido: string;
    valorTotal: string;
  };
  erro?: string;
}

function num(v: string | number): number {
  return Number(v) || 0;
}

function restanteItem(i: IItemPedidoRec): number {
  const ped = num(i.quantidadePedida);
  const rec = num(i.quantidadeRecebida);
  return Math.max(0, ped - rec);
}

export function RecebimentoMercadoriaPage() {
  const [carregando, setCarregando] = useState(true);
  const [processando, setProcessando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pedidos, setPedidos] = useState<IPedidoElegivel[]>([]);
  const [pedidoId, setPedidoId] = useState('');
  const [tipoDocumento, setTipoDocumento] = useState<'NOTA_FISCAL' | 'RECIBO_INTERNO'>('NOTA_FISCAL');
  const [numeroDoc, setNumeroDoc] = useState('');
  const [serie, setSerie] = useState('');
  const [chaveAcesso, setChaveAcesso] = useState('');
  const [dataEmissao, setDataEmissao] = useState(() => new Date().toISOString().split('T')[0]);
  const [qtdRecebida, setQtdRecebida] = useState<Record<string, string>>({});

  const pedidoSelecionado = useMemo(
    () => pedidos.find((p) => p.id === pedidoId) ?? null,
    [pedidos, pedidoId],
  );

  const buscarPedidos = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const { data } = await api.get<IApiList>('/api/compras/recebimento-mercadorias/pedidos-elegiveis');
      if (!data.sucesso || !data.dados) {
        setErro(data.erro || 'Falha ao carregar pedidos.');
        setPedidos([]);
        return;
      }
      setPedidos(data.dados);
    } catch (e) {
      const ax = e as AxiosError<IApiList>;
      setErro(ax.response?.data?.erro || ax.message || 'Erro de rede.');
      setPedidos([]);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void buscarPedidos();
  }, [buscarPedidos]);

  useEffect(() => {
    if (!pedidoSelecionado) {
      setQtdRecebida({});
      return;
    }
    const next: Record<string, string> = {};
    for (const it of pedidoSelecionado.itens) {
      const r = restanteItem(it);
      next[it.id] = r > 0 ? String(r) : '0';
    }
    setQtdRecebida(next);
  }, [pedidoSelecionado]);

  const handleSubmit = async () => {
    if (!pedidoSelecionado) {
      return alert('Selecione um pedido de compra.');
    }
    const numeroU = numeroDoc.trim().toUpperCase();
    if (!numeroU) {
      return alert(tipoDocumento === 'NOTA_FISCAL' ? 'Informe o número da NF.' : 'Informe o número do recibo.');
    }

    const itensPayload: { itemPedidoCompraId: string; quantidadeRecebida: number }[] = [];
    for (const it of pedidoSelecionado.itens) {
      const q = Number(String(qtdRecebida[it.id] ?? '0').replace(',', '.'));
      if (!Number.isFinite(q) || q < 0) {
        return alert(`Quantidade inválida para o item ${it.produto?.nome || it.id}.`);
      }
      if (q > 0) {
        itensPayload.push({ itemPedidoCompraId: it.id, quantidadeRecebida: q });
      }
    }
    if (itensPayload.length === 0) {
      return alert('Informe quantidade recebida maior que zero em ao menos um item.');
    }

    if (!window.confirm('Confirmar processamento da entrada? Estoque, financeiro e status do pedido serão atualizados.')) {
      return;
    }

    setProcessando(true);
    setErro(null);
    try {
      const body = {
        pedidoCompraId: pedidoSelecionado.id,
        tipoDocumento,
        numero: numeroU,
        serie: tipoDocumento === 'NOTA_FISCAL' ? serie.trim().toUpperCase() || null : null,
        chaveAcesso: tipoDocumento === 'NOTA_FISCAL' ? chaveAcesso.trim().toUpperCase() || null : null,
        dataEmissao,
        itens: itensPayload,
      };
      const { data } = await api.post<IApiProc>('/api/compras/recebimento-mercadorias/processar', body);
      if (!data.sucesso || !data.dados) {
        alert(data.erro || 'Falha no processamento.');
        return;
      }
      alert(
        `${data.dados.message}\nStatus do pedido: ${data.dados.novoStatusPedido}\nValor provisionado: R$ ${Number(data.dados.valorTotal).toFixed(2)}`,
      );
      setPedidoId('');
      setNumeroDoc('');
      setSerie('');
      setChaveAcesso('');
      await buscarPedidos();
    } catch (e) {
      const ax = e as AxiosError<IApiProc>;
      const msg = ax.response?.data?.erro || ax.message || 'Erro ao processar.';
      setErro(msg);
      alert(msg);
    } finally {
      setProcessando(false);
    }
  };

  const inputClass =
    'w-full rounded-2xl border border-white/10 bg-[#0d182d] px-4 py-3.5 text-sm font-bold uppercase tracking-wide text-white placeholder:text-slate-600 outline-none focus:border-emerald-400/30 focus:ring-2 focus:ring-emerald-500/15';
  const labelClass = 'mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-400';

  return (
    <Layout>
      <div className="mx-auto flex max-w-5xl flex-col space-y-8 pb-14">
        <div className="relative overflow-hidden rounded-[30px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.14),_transparent_26%),linear-gradient(135deg,_#0b1020_0%,_#08101f_45%,_#0a1224_100%)] p-6 shadow-[0_25px_70px_rgba(0,0,0,0.40)] sm:p-8">
          <div className="pointer-events-none absolute -left-10 top-0 h-52 w-52 rounded-full bg-emerald-600/12 blur-[100px]" />
          <div className="relative z-10">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-300">
              <Sparkles className="h-3.5 w-3.5" />
              Fechamento P2P — Almoxarifado
            </div>
            <h1 className="flex flex-wrap items-center gap-4 text-3xl font-black tracking-tight text-white">
              <div className="rounded-2xl border border-emerald-400/25 bg-emerald-500/10 p-3">
                <PackageCheck className="h-8 w-8 text-emerald-300" />
              </div>
              Recebimento de mercadorias
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
              Vincule ao pedido aprovado, informe NF ou recibo, confira as quantidades físicas e processe em uma única
              transação: estoque, provisão a pagar e status do pedido.
            </p>
          </div>
        </div>

        {erro && (
          <div className="flex items-center gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            <AlertCircle className="h-5 w-5 shrink-0" />
            {erro}
          </div>
        )}

        {carregando ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-emerald-400" />
          </div>
        ) : (
          <>
            <section className="rounded-[24px] border border-white/10 bg-[#08101f]/95 p-6 shadow-xl">
              <h2 className="mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-[0.14em] text-slate-400">
                <Truck className="h-4 w-4 text-emerald-400" />
                Passo 1 — Pedido de compra
              </h2>
              <label className={labelClass}>Selecionar pedido elegível</label>
              <select
                value={pedidoId}
                onChange={(e) => setPedidoId(e.target.value)}
                className={inputClass}
              >
                <option value="">— SELECIONE —</option>
                {pedidos.map((p) => (
                  <option key={p.id} value={p.id}>
                    #{p.id.slice(0, 8).toUpperCase()} ·{' '}
                    {p.fornecedor?.nomeFantasia || p.fornecedor?.razaoSocial || 'FORNECEDOR'} · {p.status}
                  </option>
                ))}
              </select>
              {pedidos.length === 0 && (
                <p className="mt-3 text-xs font-bold uppercase text-amber-400">
                  Nenhum pedido elegível (aprovado, enviado ou recebido parcial). Aprove ou envie o pedido na tela de
                  pedidos de compra.
                </p>
              )}
            </section>

            {pedidoSelecionado && (
              <>
                <section className="rounded-[24px] border border-white/10 bg-[#08101f]/95 p-6 shadow-xl">
                  <h2 className="mb-4 text-sm font-black uppercase tracking-[0.14em] text-slate-400">
                    Passo 2 — Tipo de documento
                  </h2>
                  <div className="flex flex-wrap gap-6">
                    <label className="flex cursor-pointer items-center gap-2 text-sm font-bold uppercase text-slate-300">
                      <input
                        type="radio"
                        name="tipoDoc"
                        checked={tipoDocumento === 'NOTA_FISCAL'}
                        onChange={() => setTipoDocumento('NOTA_FISCAL')}
                        className="accent-emerald-500"
                      />
                      Nota fiscal
                    </label>
                    <label className="flex cursor-pointer items-center gap-2 text-sm font-bold uppercase text-slate-300">
                      <input
                        type="radio"
                        name="tipoDoc"
                        checked={tipoDocumento === 'RECIBO_INTERNO'}
                        onChange={() => setTipoDocumento('RECIBO_INTERNO')}
                        className="accent-emerald-500"
                      />
                      Sem NF (recibo / romaneio)
                    </label>
                  </div>
                </section>

                <section className="rounded-[24px] border border-white/10 bg-[#08101f]/95 p-6 shadow-xl">
                  <h2 className="mb-4 text-sm font-black uppercase tracking-[0.14em] text-slate-400">
                    Passo 3 — Dados do documento
                  </h2>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="md:col-span-2">
                      <label className={labelClass}>
                        {tipoDocumento === 'NOTA_FISCAL' ? 'Número da NF *' : 'Número do recibo / identificação *'}
                      </label>
                      <input
                        value={numeroDoc}
                        onChange={(e) => setNumeroDoc(e.target.value.toUpperCase())}
                        className={inputClass}
                        placeholder={tipoDocumento === 'NOTA_FISCAL' ? 'EX: 123456' : 'EX: ROM-2026-001'}
                      />
                    </div>
                    {tipoDocumento === 'NOTA_FISCAL' && (
                      <>
                        <div>
                          <label className={labelClass}>Série</label>
                          <input
                            value={serie}
                            onChange={(e) => setSerie(e.target.value.toUpperCase())}
                            className={inputClass}
                            placeholder="EX: 1"
                          />
                        </div>
                        <div>
                          <label className={labelClass}>Chave de acesso</label>
                          <input
                            value={chaveAcesso}
                            onChange={(e) => setChaveAcesso(e.target.value.toUpperCase())}
                            className={inputClass}
                            placeholder="44 DÍGITOS NF-E"
                          />
                        </div>
                      </>
                    )}
                    <div className="md:col-span-2">
                      <label className={labelClass}>Data de emissão *</label>
                      <input
                        type="date"
                        value={dataEmissao}
                        onChange={(e) => setDataEmissao(e.target.value)}
                        className={inputClass}
                        style={{ colorScheme: 'dark' }}
                      />
                    </div>
                  </div>
                </section>

                <section className="rounded-[24px] border border-white/10 bg-[#08101f]/95 p-6 shadow-xl">
                  <h2 className="mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-[0.14em] text-slate-400">
                    <ClipboardCheck className="h-4 w-4 text-emerald-400" />
                    Passo 4 — Conferência de quantidades
                  </h2>
                  <div className="mb-4 rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-slate-300">
                    <span className="font-black uppercase text-emerald-300">Fornecedor: </span>
                    {(pedidoSelecionado.fornecedor?.nomeFantasia || pedidoSelecionado.fornecedor?.razaoSocial || '—').toUpperCase()}
                    {pedidoSelecionado.fornecedor?.cnpjCpf && (
                      <span className="ml-2 text-slate-500">
                        · {pedidoSelecionado.fornecedor.cnpjCpf}
                      </span>
                    )}
                  </div>
                  <div className="overflow-x-auto rounded-xl border border-white/10">
                    <table className="w-full min-w-[640px] text-left text-sm">
                      <thead className="border-b border-white/10 bg-black/30">
                        <tr>
                          <th className="p-3 text-[10px] font-black uppercase tracking-wider text-slate-500">
                            Produto
                          </th>
                          <th className="p-3 text-center text-[10px] font-black uppercase tracking-wider text-slate-500">
                            Pedido
                          </th>
                          <th className="p-3 text-center text-[10px] font-black uppercase tracking-wider text-slate-500">
                            Já recebido
                          </th>
                          <th className="p-3 text-center text-[10px] font-black uppercase tracking-wider text-slate-500">
                            Em aberto
                          </th>
                          <th className="p-3 text-center text-[10px] font-black uppercase tracking-wider text-emerald-400">
                            Qtd recebida agora
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {pedidoSelecionado.itens.map((it) => {
                          const aberto = restanteItem(it);
                          return (
                            <tr key={it.id} className="border-b border-white/5">
                              <td className="p-3">
                                <div className="font-bold uppercase text-white">{it.produto?.nome}</div>
                                <div className="text-[10px] font-mono text-slate-500">{it.produto?.codigo}</div>
                              </td>
                              <td className="p-3 text-center font-mono text-slate-300">
                                {num(it.quantidadePedida)}
                              </td>
                              <td className="p-3 text-center font-mono text-slate-400">
                                {num(it.quantidadeRecebida)}
                              </td>
                              <td className="p-3 text-center font-mono text-amber-300">{aberto}</td>
                              <td className="p-3 text-center">
                                <input
                                  type="number"
                                  min={0}
                                  max={aberto}
                                  step="0.001"
                                  disabled={aberto <= 0}
                                  value={qtdRecebida[it.id] ?? '0'}
                                  onChange={(e) =>
                                    setQtdRecebida((prev) => ({
                                      ...prev,
                                      [it.id]: e.target.value,
                                    }))
                                  }
                                  className={`${inputClass} w-28 text-center font-mono`}
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </section>

                <button
                  type="button"
                  disabled={processando}
                  onClick={() => void handleSubmit()}
                  className="w-full rounded-[24px] border border-emerald-400/30 bg-gradient-to-r from-emerald-600 to-teal-600 py-5 text-lg font-black uppercase tracking-[0.12em] text-white shadow-[0_0_40px_rgba(16,185,129,0.25)] transition hover:brightness-110 disabled:opacity-50"
                >
                  {processando ? (
                    <span className="inline-flex items-center justify-center gap-2">
                      <Loader2 className="h-6 w-6 animate-spin" />
                      Processando…
                    </span>
                  ) : (
                    'Processar entrada'
                  )}
                </button>
              </>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
