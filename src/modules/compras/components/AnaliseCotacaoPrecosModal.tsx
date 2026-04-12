import React, { useEffect, useMemo, useState } from 'react';
import { X, Loader2, Trophy } from 'lucide-react';
import { api } from '../../../services/api';

export type OfertaLinha = {
  itemCotacaoId: string;
  fornecedorId: string;
  fornecedorNome: string;
  valorUnitario: number;
  valorTotal: number;
  menorPrecoItem: boolean;
};

export type LinhaPorItem = {
  itemSolicitacaoId: string;
  produto?: { nome: string; codigo?: string };
  quantidade: number;
  especificacao?: string | null;
  ofertas: OfertaLinha[];
};

export type TotalForn = {
  fornecedorId: string;
  fornecedorNome: string;
  valorTotal: number;
  menorTotalGeral: boolean;
};

export interface AnalisePrecosResponse {
  linhasPorItem: LinhaPorItem[];
  totaisPorFornecedor: TotalForn[];
  vencedorGeralFornecedorId: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  solicitacaoId: string;
  dados: AnalisePrecosResponse | null;
  onGerouPedidos: () => void;
}

function cloneAnalise(d: AnalisePrecosResponse): AnalisePrecosResponse {
  return JSON.parse(JSON.stringify(d)) as AnalisePrecosResponse;
}

export function AnaliseCotacaoPrecosModal({
  open,
  onClose,
  solicitacaoId,
  dados,
  onGerouPedidos,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [localDados, setLocalDados] = useState<AnalisePrecosResponse | null>(null);
  const [forcandoVencedor, setForcandoVencedor] = useState(false);

  useEffect(() => {
    if (open && dados) {
      setLocalDados(cloneAnalise(dados));
    }
  }, [open, dados]);

  const view = localDados ?? dados;

  const colunasFornecedores = useMemo(() => {
    if (!view) return [];
    return [...view.totaisPorFornecedor].sort((a, b) =>
      a.fornecedorNome.localeCompare(b.fornecedorNome, 'pt-BR'),
    );
  }, [view]);

  if (!open || !dados || !view) return null;

  const celulaPreco = (
    linha: LinhaPorItem,
    fornecedorId: string,
  ): { unit: number; total: number; trofeu: boolean; itemCotacaoId: string } | null => {
    const o = linha.ofertas.find((x) => x.fornecedorId === fornecedorId);
    if (!o) return null;
    return {
      unit: o.valorUnitario,
      total: o.valorTotal,
      trofeu: o.menorPrecoItem,
      itemCotacaoId: o.itemCotacaoId,
    };
  };

  const handleForcarVencedor = async (itemCotacaoId: string) => {
    if (forcandoVencedor || !dados) return;
    const base = localDados ?? dados;
    const anterior = cloneAnalise(base);
    setLocalDados(() => {
      const next = cloneAnalise(base);
      for (const linha of next.linhasPorItem) {
        const pertence = linha.ofertas.some((o) => o.itemCotacaoId === itemCotacaoId);
        if (!pertence) continue;
        for (const o of linha.ofertas) {
          o.menorPrecoItem = o.itemCotacaoId === itemCotacaoId;
        }
      }
      return next;
    });
    setForcandoVencedor(true);
    try {
      const { data } = await api.patch<{
        sucesso: boolean;
        dados?: unknown;
        erro?: string;
      }>(`/api/compras/cotacoes/itens/${itemCotacaoId}/forcar-vencedor`);
      if (!data?.sucesso) {
        throw new Error(data?.erro || 'Não foi possível forçar o vencedor.');
      }
    } catch (e: unknown) {
      setLocalDados(anterior);
      const msg =
        e && typeof e === 'object' && 'response' in e
          ? (e as { response?: { data?: { erro?: string } } }).response?.data?.erro
          : undefined;
      alert(msg || (e instanceof Error ? e.message : 'Erro ao forçar vencedor.'));
    } finally {
      setForcandoVencedor(false);
    }
  };

  const handleForcarVencedorFornecedor = async (fornecedorId: string) => {
    if (forcandoVencedor || !dados) return;
    const base = localDados ?? dados;
    const anterior = cloneAnalise(base);
    setLocalDados(() => {
      const next = cloneAnalise(base);
      for (const linha of next.linhasPorItem) {
        const ofertaForn = linha.ofertas.find((o) => o.fornecedorId === fornecedorId);
        if (!ofertaForn) continue;
        for (const o of linha.ofertas) {
          o.menorPrecoItem = o.fornecedorId === fornecedorId;
        }
      }
      return next;
    });
    setForcandoVencedor(true);
    try {
      const { data } = await api.patch<{
        sucesso: boolean;
        erro?: string;
      }>(`/api/compras/solicitacoes/${solicitacaoId}/forcar-vencedor-fornecedor`, {
        fornecedorId,
      });
      if (!data?.sucesso) {
        throw new Error(data?.erro || 'Não foi possível forçar o fornecedor.');
      }
    } catch (e: unknown) {
      setLocalDados(anterior);
      const msg =
        e && typeof e === 'object' && 'response' in e
          ? (e as { response?: { data?: { erro?: string } } }).response?.data?.erro
          : undefined;
      alert(msg || (e instanceof Error ? e.message : 'Erro ao forçar fornecedor.'));
    } finally {
      setForcandoVencedor(false);
    }
  };

  const executar = async (estrategia: 'VENCEDOR_TOTAL' | 'OTIMIZADO_POR_ITEM') => {
    const msg =
      estrategia === 'VENCEDOR_TOTAL'
        ? 'Gerar pedido(s) com todos os itens do fornecedor de menor total geral?'
        : 'Gerar pedido(s) fatiados pelo menor preço em cada item?';
    if (!window.confirm(msg)) return;
    setLoading(true);
    try {
      await api.post(`/api/compras/solicitacoes/${solicitacaoId}/gerar-pedidos-estrategia`, {
        estrategia,
      });
      alert('✅ Pedidos gerados. Verifique a tela de Pedidos de Compra.');
      onGerouPedidos();
      onClose();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      alert(err.response?.data?.error || 'Erro ao gerar pedidos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#08101f] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div>
            <h2 className="text-xl font-black uppercase tracking-tight text-white">
              Análise de cotação — matriz de preços
            </h2>
            <p className="text-xs text-slate-400">
              🏆 = vencedor do item (menor preço ou escolha manual). Duplo clique no card do fornecedor
              (totais), na célula da matriz ou na linha da lista para forçar vencedor. Card do fornecedor
              aplica o override em todos os itens em que ele cotou.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="custom-scrollbar flex-1 space-y-6 overflow-y-auto px-4 py-4 sm:px-6">
          <div>
            <h3 className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
              Totais por fornecedor (🏆 menor total geral)
            </h3>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {view.totaisPorFornecedor.map((t) => (
                <div
                  key={t.fornecedorId}
                  onDoubleClick={() => void handleForcarVencedorFornecedor(t.fornecedorId)}
                  title="Duplo clique para forçar este fornecedor como vencedor em todos os itens cotados"
                  className={`flex cursor-pointer select-none items-center justify-between rounded-xl border px-4 py-3 ${
                    t.menorTotalGeral
                      ? 'border-amber-400/50 bg-amber-500/15 ring-1 ring-amber-400/30'
                      : 'border-white/10 bg-black/20'
                  } hover:bg-white/[0.06] ${forcandoVencedor ? 'pointer-events-none opacity-60' : ''}`}
                >
                  <span className="text-xs font-bold uppercase text-white">{t.fornecedorNome}</span>
                  <span className="flex items-center gap-2 font-mono text-sm text-emerald-300">
                    {t.menorTotalGeral && <span className="text-2xl leading-none">🏆</span>}
                    R$ {t.valorTotal.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full min-w-[640px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-black/40">
                  <th className="sticky left-0 z-10 min-w-[200px] bg-[#0c1525] px-3 py-3 text-[10px] font-black uppercase tracking-wider text-slate-500">
                    Item
                  </th>
                  {colunasFornecedores.map((c) => (
                    <th
                      key={c.fornecedorId}
                      className="min-w-[120px] px-2 py-3 text-center text-[9px] font-black uppercase leading-tight text-violet-300"
                    >
                      <div className="flex flex-col items-center gap-1">
                        <span className="max-w-[140px]">{c.fornecedorNome}</span>
                        {c.menorTotalGeral && <span className="text-lg leading-none">🏆</span>}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {view.linhasPorItem.map((linha) => (
                  <tr key={linha.itemSolicitacaoId} className="border-b border-white/5 hover:bg-white/[0.02]">
                    <td className="sticky left-0 z-10 bg-[#08101f] px-3 py-3 align-top">
                      <p className="font-bold text-white">{linha.produto?.nome}</p>
                      <p className="text-[10px] font-mono text-slate-500">{linha.produto?.codigo}</p>
                      <p className="mt-1 text-[10px] font-bold uppercase text-slate-500">
                        Qtd: {linha.quantidade}
                      </p>
                      {linha.especificacao && (
                        <p className="mt-1 text-[10px] text-slate-400">{linha.especificacao}</p>
                      )}
                    </td>
                    {colunasFornecedores.map((col) => {
                      const cell = celulaPreco(linha, col.fornecedorId);
                      return (
                        <td key={col.fornecedorId} className="px-2 py-3 text-center align-middle">
                          {cell ? (
                            <div
                              onDoubleClick={() => void handleForcarVencedor(cell.itemCotacaoId)}
                              title="Duplo clique para forçar vencedor"
                              className={`cursor-pointer rounded-lg border px-2 py-2 select-none ${
                                cell.trofeu
                                  ? 'border-amber-400/40 bg-amber-500/10'
                                  : 'border-white/10 bg-black/20'
                              } ${forcandoVencedor ? 'pointer-events-none opacity-60' : ''}`}
                            >
                              <div className="flex items-center justify-center gap-1 font-mono text-xs text-emerald-300">
                                {cell.trofeu && <span title="Menor preço no item (ou vencedor manual)">🏆</span>}
                                R$ {cell.unit.toFixed(4)}
                              </div>
                              <div className="mt-0.5 text-[10px] font-mono text-slate-500">
                                Tot. R$ {cell.total.toFixed(2)}
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-600">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <h3 className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
              Detalhe por fornecedor (lista)
            </h3>
            <div className="space-y-3">
              {view.linhasPorItem.map((linha) => (
                <div
                  key={`d-${linha.itemSolicitacaoId}`}
                  className="rounded-xl border border-white/10 bg-black/20 p-3"
                >
                  <p className="text-sm font-bold text-white">{linha.produto?.nome}</p>
                  <table className="mt-2 w-full text-xs">
                    <tbody>
                      {linha.ofertas.length === 0 ? (
                        <tr>
                          <td className="py-1 text-slate-500">Sem cotação para este item.</td>
                        </tr>
                      ) : (
                        linha.ofertas.map((o) => (
                          <tr
                            key={o.itemCotacaoId}
                            className={`cursor-pointer border-t border-white/5 hover:bg-white/[0.04] ${forcandoVencedor ? 'pointer-events-none opacity-60' : ''}`}
                            onDoubleClick={() => void handleForcarVencedor(o.itemCotacaoId)}
                            title="Duplo clique para forçar vencedor"
                          >
                            <td className="py-1.5 text-slate-300">
                              {o.fornecedorNome}
                              {o.menorPrecoItem && (
                                <span className="ml-1 text-base" title="Menor preço ou vencedor manual">
                                  🏆
                                </span>
                              )}
                            </td>
                            <td className="py-1.5 text-right font-mono text-slate-400">
                              R$ {o.valorUnitario.toFixed(4)}
                            </td>
                            <td className="py-1.5 text-right font-mono text-emerald-300">
                              R$ {o.valorTotal.toFixed(2)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-white/10 bg-black/40 px-4 py-4 sm:flex-row sm:flex-wrap">
          <button
            type="button"
            disabled={loading}
            onClick={() => void executar('VENCEDOR_TOTAL')}
            className="inline-flex flex-1 min-w-[220px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 px-4 py-3 text-xs font-black uppercase tracking-wide text-white disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trophy className="h-4 w-4" />}
            Gerar pedido vencedor global
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => void executar('OTIMIZADO_POR_ITEM')}
            className="inline-flex flex-1 min-w-[220px] items-center justify-center gap-2 rounded-xl border border-violet-500/40 bg-violet-600/25 px-4 py-3 text-xs font-black uppercase tracking-wide text-violet-100 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <span className="text-lg leading-none">🏆</span>
            )}
            Gerar pedidos otimizados por item (fatiado)
          </button>
        </div>
      </div>
    </div>
  );
}
