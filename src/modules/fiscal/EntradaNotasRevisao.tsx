import { useEffect, useMemo, useState, type ComponentType } from 'react';
import {
  ArrowLeft,
  ClipboardCheck,
  Loader2,
  PackageCheck,
  Wallet,
  Receipt,
  BookOpen,
  MessageSquare,
  ShoppingCart,
  Link2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { IPreviewXml, ICfop } from './ImportarNfe';

function rotuloNaturezaEntrada(c: ICfop): string {
  const cod = (c.codigoCfop ?? c.codigo ?? '').trim();
  const desc = (c.descricaoInterna ?? c.descricao ?? '').trim();
  if (cod && desc) return `${cod} — ${desc}`;
  return cod || desc || c.id;
}

export type RevisaoAbaId =
  | 'estoque'
  | 'financeiro'
  | 'fiscal'
  | 'contabil'
  | 'observacoes'
  | 'compras';

const abasRevisao: {
  id: RevisaoAbaId;
  label: string;
  Icon: ComponentType<{ className?: string }>;
}[] = [
  { id: 'estoque', label: 'Estoque / Produtos', Icon: PackageCheck },
  { id: 'financeiro', label: 'Financeiro', Icon: Wallet },
  { id: 'fiscal', label: 'Fiscal / Tributos', Icon: Receipt },
  { id: 'contabil', label: 'Contábil', Icon: BookOpen },
  { id: 'observacoes', label: 'Observações', Icon: MessageSquare },
  { id: 'compras', label: 'Processo de Compras', Icon: ShoppingCart },
];

export interface IContaPlanoResumoNfe {
  id: string;
  codigoEstrutural: string;
  nomeConta: string;
}

export interface EntradaNotasRevisaoProps {
  dadosNota: IPreviewXml;
  revisaoAba: RevisaoAbaId;
  onAbaChange: (id: RevisaoAbaId) => void;
  naturezaOperacaoPorLinha: Record<number, string>;
  onNaturezaLinhaChange: (idx: number, naturezaOperacaoId: string) => void;
  naturezasEntrada: ICfop[];
  contasAnaliticasPlano: IContaPlanoResumoNfe[];
  carregandoContasPlano: boolean;
  contaContabilId: string;
  onContaContabilIdChange: (id: string) => void;
  isConfirmando: boolean;
  onCancelar: () => void;
  onConfirmar: () => void;
  /** Texto do botão principal (ex.: edição / reconstrução). */
  rotuloConfirmar?: string;
  formatarMoeda: (valor: number | string) => string;
  formatarCnpj: (cnpj?: string) => string;
  formatarChaveVisual: (chave: string) => string;
  parseDataEmissaoXml: (valor: string | undefined) => Date | null;
}

export function EntradaNotasRevisao({
  dadosNota,
  revisaoAba,
  onAbaChange,
  naturezaOperacaoPorLinha,
  onNaturezaLinhaChange,
  naturezasEntrada,
  contasAnaliticasPlano,
  carregandoContasPlano,
  contaContabilId,
  onContaContabilIdChange,
  isConfirmando,
  onCancelar,
  onConfirmar,
  rotuloConfirmar = 'Confirmar entrada no estoque',
  formatarMoeda,
  formatarCnpj,
  formatarChaveVisual,
  parseDataEmissaoXml,
}: EntradaNotasRevisaoProps) {
  const navigate = useNavigate();
  const [filtroContaPlano, setFiltroContaPlano] = useState('');

  useEffect(() => {
    if (revisaoAba !== 'contabil') setFiltroContaPlano('');
  }, [revisaoAba]);

  const selectedMeta = contasAnaliticasPlano.find((c) => c.id === contaContabilId);
  const contasFiltradasPlano = useMemo(() => {
    const t = filtroContaPlano.trim().toLowerCase();
    let list = contasAnaliticasPlano;
    if (t) {
      list = contasAnaliticasPlano.filter(
        (c) =>
          c.nomeConta.toLowerCase().includes(t) || c.codigoEstrutural.toLowerCase().includes(t),
      );
    }
    if (contaContabilId && selectedMeta && !list.some((c) => c.id === contaContabilId)) {
      return [selectedMeta, ...list];
    }
    return list;
  }, [contasAnaliticasPlano, filtroContaPlano, contaContabilId, selectedMeta]);

  const t = dadosNota.totaisFiscais;
  const cob = dadosNota.cobranca;
  const dataEmissaoCurta =
    parseDataEmissaoXml(dadosNota.documento.dataEmissao)?.toLocaleDateString('pt-BR') ??
    dadosNota.documento.dataEmissao;
  const chaveFmt = dadosNota.documento.chaveAcesso
    ? formatarChaveVisual(dadosNota.documento.chaveAcesso)
    : null;

  return (
    <div className="flex h-[min(92vh,940px)] max-h-[92vh] min-h-[420px] flex-col overflow-hidden rounded-[24px] border border-emerald-400/25 bg-[#08101f]/95 shadow-[0_25px_70px_rgba(0,0,0,0.45)] duration-300 animate-in fade-in">
      {/* Faixa 1: título + voltar (compacta) */}
      <div className="shrink-0 border-b border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.12),_transparent_40%),linear-gradient(135deg,_#0b1020_0%,_#08101f_55%,_#0a1224_100%)] px-3 py-2 sm:px-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <div className="shrink-0 rounded-lg border border-emerald-400/25 bg-emerald-500/10 p-1.5">
              <ClipboardCheck className="h-4 w-4 text-emerald-300" />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-[0.14em] text-emerald-400/80">
                Recebimento · revisão
              </p>
              <h2 className="truncate text-base font-black text-white sm:text-lg">Revisão da NF-e</h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancelar}
            disabled={isConfirmando}
            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-bold text-slate-200 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Voltar
          </button>
        </div>
      </div>

      {/* Faixa 2: resumo denso (1–2 linhas) */}
      <div className="shrink-0 border-b border-white/10 bg-black/35 px-3 py-2 sm:px-4">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] leading-tight text-slate-300">
          <span className="shrink-0 font-bold uppercase tracking-wide text-slate-500">Fornec.</span>
          <span
            className="min-w-0 max-w-[min(100%,320px)] truncate font-semibold text-white sm:max-w-md"
            title={dadosNota.fornecedor.razaoSocial}
          >
            {dadosNota.fornecedor.razaoSocial}
          </span>
          <span className="font-mono text-slate-400">({formatarCnpj(dadosNota.fornecedor.cnpjCpf)})</span>
          {dadosNota.fornecedor.inscricaoEstadual ? (
            <span className="hidden text-slate-500 lg:inline">IE {dadosNota.fornecedor.inscricaoEstadual}</span>
          ) : null}

          <span className="hidden h-3 w-px bg-white/15 sm:block" aria-hidden />

          <span className="font-bold uppercase tracking-wide text-slate-500">NF</span>
          <span className="font-mono font-semibold text-white">
            {dadosNota.documento.numero} — {dadosNota.documento.serie}
          </span>

          <span className="hidden h-3 w-px bg-white/15 sm:block" aria-hidden />

          <span className="font-bold uppercase tracking-wide text-slate-500">Emissão</span>
          <span className="font-mono text-slate-200">{dataEmissaoCurta}</span>

          <span className="hidden h-3 w-px bg-white/15 md:block" aria-hidden />

          <span className="font-bold uppercase tracking-wide text-slate-500">Total</span>
          <span className="text-lg font-black tabular-nums text-emerald-400 drop-shadow-[0_0_12px_rgba(52,211,153,0.25)]">
            {formatarMoeda(dadosNota.documento.valorTotalDocumento)}
          </span>
        </div>

        {chaveFmt ? (
          <div
            className="mt-1.5 overflow-x-auto border-t border-white/5 pt-1.5"
            title={dadosNota.documento.chaveAcesso ?? undefined}
          >
            <span className="whitespace-nowrap font-mono text-[10px] leading-none tracking-wide text-slate-500">
              <span className="mr-1.5 font-bold uppercase text-slate-600">Chave</span>
              {chaveFmt}
            </span>
          </div>
        ) : null}

        {dadosNota.documento.naturezaOperacao ? (
          <p className="mt-1 line-clamp-1 text-[10px] text-slate-500" title={dadosNota.documento.naturezaOperacao}>
            <span className="font-bold uppercase text-slate-600">Nat. operação XML:</span>{' '}
            {dadosNota.documento.naturezaOperacao}
          </p>
        ) : null}
      </div>

      <div className="shrink-0 border-b border-white/10 bg-black/30 px-2 py-1.5 sm:px-3">
        <div className="flex flex-wrap gap-1">
          {abasRevisao.map(({ id, label, Icon }) => {
            const ativo = revisaoAba === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onAbaChange(id)}
                disabled={isConfirmando}
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wide transition-colors disabled:opacity-50 sm:gap-2 sm:px-3 sm:text-[11px] ${
                  ativo
                    ? 'border border-emerald-400/35 bg-emerald-500/15 text-emerald-200'
                    : 'border border-transparent text-slate-400 hover:border-white/10 hover:bg-white/5 hover:text-slate-200'
                }`}
              >
                <Icon className="h-3 w-3 shrink-0 opacity-90 sm:h-3.5 sm:w-3.5" />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {revisaoAba === 'estoque' ? (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="min-h-0 flex-1 overflow-auto px-2 py-2 sm:px-3">
              <table className="w-full min-w-[1000px] table-fixed text-left text-xs">
                <colgroup>
                  <col className="w-10" />
                  <col className="w-[88px]" />
                  <col />
                  <col className="w-[100px]" />
                  <col className="w-[72px]" />
                  <col className="w-[64px]" />
                  <col className="w-12" />
                  <col className="w-[100px]" />
                  <col className="w-[104px]" />
                  <col className="min-w-[240px] sm:min-w-[280px]" />
                </colgroup>
                <thead className="sticky top-0 z-10 border-b border-white/10 bg-[#0b1324]/95 text-[9px] font-black uppercase tracking-wider text-slate-500 backdrop-blur-sm">
                  <tr>
                    <th className="px-2 py-2">#</th>
                    <th className="px-2 py-2">Cód.</th>
                    <th className="px-2 py-2">Descrição</th>
                    <th className="px-2 py-2">NCM</th>
                    <th className="px-2 py-2">CFOP</th>
                    <th className="px-2 py-2">Qtd</th>
                    <th className="px-2 py-2">UN</th>
                    <th className="px-2 py-2 text-right">Vlr. u.</th>
                    <th className="px-2 py-2 text-right">Vlr. tot.</th>
                    <th className="px-2 py-2">Natureza</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {dadosNota.itens.map((it, idx) => (
                    <tr key={`${it.numeroItem ?? idx}-${idx}`} className="hover:bg-white/[0.03]">
                      <td className="px-2 py-1.5 font-mono text-slate-400">{it.numeroItem ?? idx + 1}</td>
                      <td className="px-2 py-1.5 font-mono text-[11px] text-slate-300">
                        {it.codigo?.trim() ? it.codigo : '—'}
                      </td>
                      <td className="px-2 py-1.5 text-slate-200">
                        <span className="line-clamp-2 break-words" title={it.descricaoOriginal}>
                          {it.descricaoOriginal}
                        </span>
                      </td>
                      <td className="px-2 py-1.5 font-mono text-[10px] text-slate-400">
                        {it.ncm?.trim() ? it.ncm : '—'}
                      </td>
                      <td className="px-2 py-1.5 font-mono text-[10px] text-amber-200/90">
                        {it.cfopNota?.trim() ? it.cfopNota : '—'}
                      </td>
                      <td className="px-2 py-1.5 font-mono text-slate-200">{it.quantidade}</td>
                      <td className="px-2 py-1.5 text-[11px] text-slate-400">{it.unidadeMedida || 'UN'}</td>
                      <td className="px-2 py-1.5 text-right font-mono text-[11px] text-slate-300">
                        {formatarMoeda(it.valorUnitario)}
                      </td>
                      <td className="px-2 py-1.5 text-right font-mono text-[11px] font-semibold text-violet-300">
                        {formatarMoeda(it.valorTotal ?? it.quantidade * it.valorUnitario)}
                      </td>
                      <td className="px-2 py-1.5 align-middle">
                        <select
                          value={naturezaOperacaoPorLinha[idx] ?? ''}
                          onChange={(e) => onNaturezaLinhaChange(idx, e.target.value)}
                          disabled={isConfirmando}
                          className="h-8 w-full min-w-0 rounded-lg border border-white/15 bg-[#050913]/90 px-2 text-[11px] text-slate-100 focus:border-violet-500/50 focus:outline-none focus:ring-1 focus:ring-violet-500/30 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <option value="">Natureza…</option>
                          {naturezasEntrada.map((c) => (
                            <option key={c.id} value={c.id} className="bg-[#0b1020]">
                              {rotuloNaturezaEntrada(c)}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto">
            {revisaoAba === 'financeiro' ? (
          <div className="space-y-5 p-4 sm:p-5">
            {cob?.fatura ? (
              <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                <p className="mb-3 text-[10px] font-black uppercase tracking-wider text-amber-400/90">Fatura</p>
                <dl className="grid gap-2 text-sm text-slate-300 sm:grid-cols-2">
                  {cob.fatura.numero ? (
                    <div>
                      <dt className="text-[10px] font-bold uppercase text-slate-500">Nº fatura</dt>
                      <dd className="font-mono">{cob.fatura.numero}</dd>
                    </div>
                  ) : null}
                  {cob.fatura.valorOriginal != null ? (
                    <div>
                      <dt className="text-[10px] font-bold uppercase text-slate-500">Valor original</dt>
                      <dd>{formatarMoeda(cob.fatura.valorOriginal)}</dd>
                    </div>
                  ) : null}
                  {cob.fatura.valorDesconto != null ? (
                    <div>
                      <dt className="text-[10px] font-bold uppercase text-slate-500">Desconto</dt>
                      <dd>{formatarMoeda(cob.fatura.valorDesconto)}</dd>
                    </div>
                  ) : null}
                  {cob.fatura.valorLiquido != null ? (
                    <div>
                      <dt className="text-[10px] font-bold uppercase text-slate-500">Valor líquido</dt>
                      <dd className="font-semibold text-violet-300">{formatarMoeda(cob.fatura.valorLiquido)}</dd>
                    </div>
                  ) : null}
                </dl>
              </div>
            ) : null}
            {cob?.duplicatas && cob.duplicatas.length > 0 ? (
              <div className="overflow-hidden rounded-2xl border border-white/10">
                <div className="border-b border-white/10 bg-black/20 px-4 py-3">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Duplicatas / parcelas</p>
                </div>
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/10 bg-[#0b1324]/60 text-[10px] font-black uppercase text-slate-500">
                      <th className="px-4 py-2">Parcela</th>
                      <th className="px-4 py-2">Vencimento</th>
                      <th className="px-4 py-2">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {cob.duplicatas.map((dup, i) => (
                      <tr key={`${dup.numero ?? i}-${i}`} className="hover:bg-white/[0.02]">
                        <td className="px-4 py-2.5 font-mono text-slate-300">{dup.numero ?? '—'}</td>
                        <td className="px-4 py-2.5 text-slate-400">{dup.dataVencimento ?? '—'}</td>
                        <td className="px-4 py-2.5 font-mono text-violet-300">
                          {dup.valor != null ? formatarMoeda(dup.valor) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
            {!cob?.fatura && (!cob?.duplicatas || cob.duplicatas.length === 0) ? (
              <p className="rounded-2xl border border-dashed border-white/15 bg-black/15 p-8 text-center text-sm text-slate-500">
                Nenhuma cobrança parcelada foi encontrada no XML. Dados financeiros podem constar apenas nos totais da
                aba Fiscal.
              </p>
            ) : null}
          </div>
        ) : null}

        {revisaoAba === 'fiscal' ? (
          <div className="p-5">
            {t ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  ['Base cálculo ICMS', t.baseCalculoIcms],
                  ['Valor ICMS', t.valorIcms],
                  ['Base ICMS ST', t.baseCalculoIcmsSt],
                  ['Valor ICMS ST', t.valorIcmsSt],
                  ['Valor IPI', t.valorIpi],
                  ['Valor PIS', t.valorPis],
                  ['Valor COFINS', t.valorCofins],
                  ['Total produtos', t.valorTotalProdutos],
                  ['Total da nota', t.valorTotalNota],
                  ['Frete', t.valorFrete],
                  ['Seguro', t.valorSeguro],
                  ['Desconto', t.valorDesconto],
                  ['Outras despesas', t.valorOutrasDespesas],
                ].map(([label, val]) =>
                  val != null && Number.isFinite(val) ? (
                    <div
                      key={String(label)}
                      className="rounded-xl border border-white/10 bg-black/20 px-4 py-3"
                    >
                      <p className="text-[10px] font-bold uppercase text-slate-500">{label}</p>
                      <p className="mt-1 font-mono text-sm font-semibold text-slate-100">{formatarMoeda(val)}</p>
                    </div>
                  ) : null,
                )}
              </div>
            ) : (
              <p className="rounded-2xl border border-dashed border-white/15 bg-black/15 p-8 text-center text-sm text-slate-500">
                Totais fiscais não disponíveis. Reprocesse o XML ou atualize o backend.
              </p>
            )}
          </div>
        ) : null}

        {revisaoAba === 'contabil' ? (
          <div className="space-y-4 p-5">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
              <p className="mb-2 text-[10px] font-black uppercase tracking-wider text-violet-400">CFOPs na nota</p>
              {dadosNota.cfopsNota && dadosNota.cfopsNota.length > 0 ? (
                <ul className="flex flex-wrap gap-2">
                  {dadosNota.cfopsNota.map((c) => (
                    <li
                      key={c}
                      className="rounded-lg border border-amber-400/25 bg-amber-500/10 px-3 py-1.5 font-mono text-xs text-amber-200"
                    >
                      {c}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-500">Sem lista de CFOPs agregada.</p>
              )}
            </div>

            <div className="rounded-2xl border border-emerald-400/20 bg-black/25 p-5">
              <p className="mb-1 text-[10px] font-black uppercase tracking-wider text-emerald-400/90">
                Conta contábil (despesa / estoque)
              </p>
              <p className="mb-4 text-xs leading-relaxed text-slate-500">
                Escolha uma conta <span className="font-semibold text-slate-400">analítica</span> do plano da loja para
                vincular ao fato gerador contábil desta NF-e. Se deixar em branco, o sistema tenta usar a referência
                configurada na <span className="font-semibold text-slate-400">natureza da operação (CFOP)</span> de cada
                linha que gera contabilidade.
              </p>

              <label htmlFor="filtro-plano-contas-nfe" className="mb-1.5 block text-[10px] font-bold uppercase text-slate-500">
                Filtrar por código ou nome
              </label>
              <input
                id="filtro-plano-contas-nfe"
                type="search"
                autoComplete="off"
                value={filtroContaPlano}
                onChange={(e) => setFiltroContaPlano(e.target.value)}
                disabled={isConfirmando || carregandoContasPlano}
                placeholder="Ex.: limpeza, 3.1, material…"
                className="mb-3 h-10 w-full rounded-xl border border-white/15 bg-[#050913]/90 px-3 text-sm text-slate-100 placeholder:text-slate-600 focus:border-emerald-500/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
              />

              <label htmlFor="select-conta-contabil-nfe" className="mb-1.5 block text-[10px] font-bold uppercase text-slate-500">
                Conta selecionada
              </label>
              <select
                id="select-conta-contabil-nfe"
                value={contaContabilId}
                onChange={(e) => onContaContabilIdChange(e.target.value)}
                disabled={isConfirmando || carregandoContasPlano}
                className="h-11 w-full rounded-xl border border-white/15 bg-[#050913]/90 px-3 text-sm text-slate-100 focus:border-emerald-500/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">Padrão da natureza (CFOP) / automático</option>
                {contaContabilId && !selectedMeta ? (
                  <option value={contaContabilId}>
                    Conta salva na nota (aguarde o plano ou confira o ID)
                  </option>
                ) : null}
                {contasFiltradasPlano.map((c) => (
                  <option key={c.id} value={c.id} className="bg-[#0b1020]">
                    {c.codigoEstrutural} — {c.nomeConta}
                  </option>
                ))}
              </select>
              {carregandoContasPlano ? (
                <p className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                  <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                  Carregando plano de contas…
                </p>
              ) : contasAnaliticasPlano.length === 0 ? (
                <p className="mt-2 text-xs text-amber-200/80">
                  Nenhuma conta analítica retornada. Cadastre o plano de contas ou verifique permissões da API.
                </p>
              ) : null}
            </div>
          </div>
        ) : null}

        {revisaoAba === 'observacoes' ? (
          <div className="p-5">
            {dadosNota.infComplementar ? (
              <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                <p className="mb-2 text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Informações complementares (infCpl)
                </p>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-300">{dadosNota.infComplementar}</p>
              </div>
            ) : (
              <p className="rounded-2xl border border-dashed border-white/15 bg-black/15 p-8 text-center text-sm text-slate-500">
                Não há texto complementar no XML desta NF-e.
              </p>
            )}
          </div>
        ) : null}

            {revisaoAba === 'compras' ? (
              <div className="space-y-4 p-4 sm:p-5">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                  <p className="mb-2 text-[10px] font-black uppercase tracking-wider text-cyan-400">
                    Pedido de compra (P2P)
                  </p>
                  <p className="text-sm leading-relaxed text-slate-400">
                    Esta conferência é uma <span className="font-semibold text-slate-300">entrada direta</span> por
                    XML/chave. O vínculo com pedido de compra ocorre no fluxo &quot;Importar NF-e&quot; em Compras ou após
                    o registro da nota no painel abaixo.
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate('/compras/pedidos')}
                    className="mt-4 inline-flex items-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-4 py-2.5 text-xs font-black uppercase tracking-wide text-cyan-200 transition-colors hover:bg-cyan-500/20"
                  >
                    <Link2 className="h-3.5 w-3.5" />
                    Abrir pedidos de compra
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-white/10 bg-black/35 px-3 py-2.5 sm:px-4 sm:py-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
          <button
            type="button"
            onClick={onCancelar}
            disabled={isConfirmando}
            className="rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-xs font-bold text-slate-200 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirmar}
            disabled={isConfirmando}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-400/30 bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-2.5 text-xs font-black uppercase tracking-wide text-white shadow-[0_0_20px_rgba(16,185,129,0.22)] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:brightness-100 sm:px-7 sm:text-sm"
          >
            {isConfirmando ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Processando...
              </>
            ) : (
              rotuloConfirmar
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
