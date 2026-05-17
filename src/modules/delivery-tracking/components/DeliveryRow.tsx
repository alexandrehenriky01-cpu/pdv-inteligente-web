import { memo, useCallback } from 'react';
import {
  CheckCircle,
  Loader2,
  MapPin,
  Phone,
  Printer,
  Rocket,
  Zap,
} from 'lucide-react';

/**
 * RC2.5x — PR-7 perf audit: linha da tabela GestaoDelivery extraída
 * num componente memoizado. Antes, a cada mudança em qualquer estado
 * do GestaoDeliveryPage (savingIds, printingIds, selectedOrderIds,
 * filter), as N linhas re-renderizavam. Agora só a(s) linha(s) cujas
 * props relevantes mudaram re-renderiza(m).
 *
 * Flags derivadas (retirada, podeSair, podeConfirmar, etc.) ficam no
 * próprio componente — fáceis de calcular a partir do `row`. Helpers
 * de formatação são importados do módulo para manter refs estáveis.
 */

export interface DeliveryRowPedido {
  id: string;
  numeroPedido: number | null;
  numeroVenda: number;
  nomeCliente: string | null;
  telefoneCliente?: string | null;
  enderecoEntrega: string | null;
  valorTotal: number;
  statusPreparo: string;
  statusEntrega: string;
  status?: string;
  createdAt: string;
  tipoPedido?: string | null;
  updatedAt?: string;
  estornoFinanceiroPendente?: boolean;
  cancelamentoFiscalPendente?: boolean;
}

export interface DeliveryRowProps {
  row: DeliveryRowPedido;
  busy: boolean;
  isPrinting: boolean;
  isSelected: boolean;
  agentOnline: boolean;
  onToggleSelect: (id: string) => void;
  onImprimirCupom: (id: string) => Promise<void> | void;
  onSairParaEntrega: (id: string, endereco: string) => Promise<void> | void;
  onConfirmarEntrega: (id: string) => Promise<void> | void;
  onVerRota: (endereco: string) => void;
}

function isRetirada(tipo: string | null | undefined): boolean {
  return String(tipo ?? '').toUpperCase() === 'RETIRADA_BALCAO';
}

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatTime(dateString: string): string {
  return new Date(dateString).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function badgeStatusEntrega(status: string | null | undefined): { label: string; className: string } {
  const u = String(status ?? 'PENDENTE').toUpperCase();
  if (u === 'CANCELADO' || u === 'CANCELADA') {
    return { label: 'CANCELADO', className: 'bg-red-500/15 text-red-200 border border-red-500/35' };
  }
  if (u === 'SAIU_ENTREGA') {
    return { label: 'SAIU PARA ENTREGA', className: 'bg-amber-500/15 text-amber-300 border border-amber-500/35' };
  }
  if (u === 'ENTREGUE') {
    return { label: 'ENTREGUE', className: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/35' };
  }
  return { label: 'PENDENTE', className: 'bg-slate-500/15 text-slate-300 border border-slate-500/35' };
}

function DeliveryRowComponent(props: DeliveryRowProps) {
  const {
    row,
    busy,
    isPrinting,
    isSelected,
    agentOnline,
    onToggleSelect,
    onImprimirCupom,
    onSairParaEntrega,
    onConfirmarEntrega,
    onVerRota,
  } = props;

  const retirada = isRetirada(row.tipoPedido);
  const podeSairEntrega = row.statusEntrega === 'PENDENTE' && !retirada;
  const podeConfirmar = row.statusEntrega === 'SAIU_ENTREGA' && !retirada;
  const preparoU = String(row.statusPreparo ?? '').toUpperCase();
  const podeConcluirRetirada =
    retirada && row.statusEntrega === 'PENDENTE' && preparoU === 'PRONTO';
  const cupomPendente = row.statusEntrega === 'PENDENTE' && (podeSairEntrega || retirada);
  const isRecentlyUpdated =
    !!row.updatedAt && new Date(row.updatedAt).getTime() > Date.now() - 5000;
  const statusBadge = badgeStatusEntrega(row.statusEntrega);

  const handleToggleSelect = useCallback(
    () => onToggleSelect(row.id),
    [onToggleSelect, row.id]
  );
  const handleImprimir = useCallback(
    () => void onImprimirCupom(row.id),
    [onImprimirCupom, row.id]
  );
  const handleSair = useCallback(
    () => void onSairParaEntrega(row.id, row.enderecoEntrega || ''),
    [onSairParaEntrega, row.id, row.enderecoEntrega]
  );
  const handleConfirmar = useCallback(
    () => void onConfirmarEntrega(row.id),
    [onConfirmarEntrega, row.id]
  );
  const handleVerRota = useCallback(
    () => onVerRota(row.enderecoEntrega || ''),
    [onVerRota, row.enderecoEntrega]
  );

  return (
    <tr
      className={`border-b border-white/5 transition-colors ${
        isRecentlyUpdated ? 'bg-emerald-500/5' : 'hover:bg-white/[0.03]'
      }`}
    >
      <td className="px-2 py-4">
        {podeSairEntrega ? (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={handleToggleSelect}
            className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-sky-500 focus:ring-sky-500"
          />
        ) : null}
      </td>
      <td className="px-4 py-4">
        <div className="flex items-center gap-2">
          {isRecentlyUpdated && <Zap className="w-4 h-4 text-emerald-400 animate-pulse" />}
          <div
            className={`font-black text-lg ${
              isRecentlyUpdated ? 'text-emerald-300' : 'text-white'
            }`}
          >
            #{row.numeroPedido || row.numeroVenda}
          </div>
        </div>
        <div className="text-[10px] text-slate-500 font-mono mt-1">
          {formatTime(row.createdAt)}
        </div>
        <div className="mt-2">
          <span
            className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${
              retirada
                ? 'border border-violet-500/40 bg-violet-500/15 text-violet-200'
                : 'border border-sky-500/40 bg-sky-500/15 text-sky-200'
            }`}
          >
            {retirada ? 'Retirada' : 'Entrega'}
          </span>
        </div>
      </td>
      <td className="px-4 py-4">
        <div className="font-bold text-white">{row.nomeCliente || '—'}</div>
        {row.telefoneCliente && (
          <div className="flex items-center gap-1 mt-1">
            <Phone className="w-3 h-3 text-slate-400" />
            <span className="text-xs text-slate-400">{row.telefoneCliente}</span>
          </div>
        )}
      </td>
      <td className="px-4 py-4 max-w-[300px]">
        <div className="flex items-start gap-2">
          <MapPin className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
          <span className="text-xs text-slate-300 whitespace-pre-wrap leading-snug">
            {retirada ? 'Retirada no balcão' : row.enderecoEntrega || 'Sem endereço'}
          </span>
        </div>
      </td>
      <td className="px-4 py-4">
        <span
          className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-black uppercase tracking-wide ${statusBadge.className}`}
        >
          {statusBadge.label}
        </span>
        {(row.estornoFinanceiroPendente || row.cancelamentoFiscalPendente) && (
          <div className="mt-1.5 space-y-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-200/90">
            {row.estornoFinanceiroPendente ? <div>Estorno caixa pendente</div> : null}
            {row.cancelamentoFiscalPendente ? <div>Cancel. fiscal pendente</div> : null}
          </div>
        )}
      </td>
      <td className="px-4 py-4 text-right font-mono font-bold text-emerald-300">
        {formatCurrency(row.valorTotal)}
      </td>
      <td className="px-4 py-4 text-right">
        <div className="flex flex-wrap justify-end gap-2">
          {cupomPendente && (
            <button
              type="button"
              disabled={isPrinting || !agentOnline}
              onClick={handleImprimir}
              className="inline-flex items-center gap-1.5 rounded-lg border border-sky-500/35 bg-sky-500/10 px-3 py-2 text-xs font-black uppercase tracking-wide text-sky-100 hover:bg-sky-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPrinting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Printer className="w-3.5 h-3.5" />}
              Cupom
            </button>
          )}
          {podeSairEntrega && (
            <button
              type="button"
              disabled={busy}
              onClick={handleSair}
              className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-600 to-orange-600 px-3 py-2 text-xs font-black uppercase tracking-wide text-white shadow-[0_0_16px_rgba(245,158,11,0.35)] hover:scale-[1.02] transition-all disabled:opacity-50"
            >
              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Rocket className="w-3.5 h-3.5" />}
              Sair p/ Entrega
            </button>
          )}
          {podeConcluirRetirada && (
            <button
              type="button"
              disabled={busy}
              onClick={handleConfirmar}
              className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 px-3 py-2 text-xs font-black uppercase tracking-wide text-white shadow-[0_0_16px_rgba(16,185,129,0.35)] hover:scale-[1.02] transition-all disabled:opacity-50"
            >
              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
              Concluir retirada
            </button>
          )}
          {podeConfirmar && (
            <>
              <button
                type="button"
                disabled={isPrinting || !agentOnline}
                onClick={handleImprimir}
                className="inline-flex items-center gap-1.5 rounded-lg border border-sky-500/35 bg-sky-500/10 px-3 py-2 text-xs font-black uppercase tracking-wide text-sky-100 hover:bg-sky-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPrinting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Printer className="w-3.5 h-3.5" />}
                Cupom
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={handleVerRota}
                className="inline-flex items-center gap-1.5 rounded-lg border border-sky-500/35 bg-sky-500/10 px-3 py-2 text-xs font-black uppercase tracking-wide text-sky-100 hover:bg-sky-500/20 transition-all"
              >
                <MapPin className="w-3.5 h-3.5" />
                Ver Rota
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={handleConfirmar}
                className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 px-3 py-2 text-xs font-black uppercase tracking-wide text-white shadow-[0_0_16px_rgba(16,185,129,0.35)] hover:scale-[1.02] transition-all disabled:opacity-50"
              >
                {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                Confirmar
              </button>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}

export const DeliveryRow = memo(DeliveryRowComponent);
