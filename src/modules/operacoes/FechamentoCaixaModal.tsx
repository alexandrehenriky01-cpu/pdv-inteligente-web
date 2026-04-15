import { useState } from 'react';
import { AxiosError } from 'axios';
import { Loader2, Power, Printer } from 'lucide-react';
import { api } from '../../services/api';

export type FormaPagamentoConciliacao =
  | 'DINHEIRO'
  | 'CARTAO_CREDITO'
  | 'CARTAO_DEBITO'
  | 'PIX';

export interface FechamentoConciliacaoRelatorioLinha {
  formaPagamento: FormaPagamentoConciliacao;
  rotulo: string;
  valorSistema: number;
  valorInformado: number;
  diferenca: number;
}

export interface FechamentoConciliacaoRelatorio {
  fechadoEm: string;
  linhas: FechamentoConciliacaoRelatorioLinha[];
  crediarioValorSistema: number;
  totais: {
    valorSistema: number;
    valorInformado: number;
    diferenca: number;
  };
  saldoTeoricoGaveta: number;
  diferencaGaveta: number;
}

export interface FechamentoCaixaApiResponse {
  relatorio: FechamentoConciliacaoRelatorio;
}

const FORMAS: { key: FormaPagamentoConciliacao; label: string }[] = [
  { key: 'DINHEIRO', label: 'Dinheiro (gaveta)' },
  { key: 'CARTAO_CREDITO', label: 'Crédito' },
  { key: 'CARTAO_DEBITO', label: 'Débito' },
  { key: 'PIX', label: 'PIX' },
];

function parseValorPtBr(raw: string): number {
  const t = raw.trim().replace(/\./g, '').replace(',', '.');
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? n : NaN;
}

function fmtBrl(n: number): string {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export interface FechamentoCaixaModalProps {
  aberto: boolean;
  sessaoCaixaId: string;
  /** PDV: operador do turno. Gestão: qualquer usuário da loja. */
  modo: 'pdv' | 'gestao';
  titulo?: string;
  subtitulo?: string;
  onFechar: () => void;
  /** Chamado após fechamento bem-sucedido e o operador encerrar o resumo (ou imprimir e fechar). */
  onConcluido: () => void;
}

export function FechamentoCaixaModal({
  aberto,
  sessaoCaixaId,
  modo,
  titulo = 'Fechamento de caixa',
  subtitulo = 'Informe os valores contados por forma de pagamento (fechamento cego).',
  onFechar,
  onConcluido,
}: FechamentoCaixaModalProps) {
  const [etapa, setEtapa] = useState<'formulario' | 'resumo'>('formulario');
  const [valoresTxt, setValoresTxt] = useState<Record<FormaPagamentoConciliacao, string>>({
    DINHEIRO: '0',
    CARTAO_CREDITO: '0',
    CARTAO_DEBITO: '0',
    PIX: '0',
  });
  const [observacao, setObservacao] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [relatorio, setRelatorio] = useState<FechamentoConciliacaoRelatorio | null>(null);

  const resetar = () => {
    setEtapa('formulario');
    setValoresTxt({
      DINHEIRO: '0',
      CARTAO_CREDITO: '0',
      CARTAO_DEBITO: '0',
      PIX: '0',
    });
    setObservacao('');
    setErro(null);
    setRelatorio(null);
    setEnviando(false);
  };

  if (!aberto) return null;

  const handleFecharModal = () => {
    resetar();
    onFechar();
  };

  const montarPayload = () => {
    const valoresDeclarados = FORMAS.map((f) => {
      const v = parseValorPtBr(valoresTxt[f.key]);
      if (Number.isNaN(v)) throw new Error(`Valor inválido em ${f.label}.`);
      return { formaPagamento: f.key, valorDeclarado: v };
    });
    return {
      sessaoCaixaId,
      valoresDeclarados,
      observacao: observacao.trim() || undefined,
    };
  };

  const confirmar = async () => {
    setErro(null);
    let body: ReturnType<typeof montarPayload>;
    try {
      body = montarPayload();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Verifique os valores informados.');
      return;
    }

    setEnviando(true);
    try {
      const url =
        modo === 'pdv'
          ? `/api/pdv/caixa/${sessaoCaixaId}/fechar-conciliacao`
          : `/api/pdv/caixa/fechar-conciliacao/${sessaoCaixaId}`;
      const req =
        modo === 'pdv' ? api.put<FechamentoCaixaApiResponse>(url, body) : api.post<FechamentoCaixaApiResponse>(url, body);
      const { data } = await req;
      if (!data?.relatorio) throw new Error('Resposta inválida do servidor.');
      setRelatorio(data.relatorio);
      setEtapa('resumo');
    } catch (err) {
      const ax = err as AxiosError<{ error?: string }>;
      setErro(ax.response?.data?.error || 'Não foi possível fechar o caixa.');
    } finally {
      setEnviando(false);
    }
  };

  const imprimir = () => {
    window.print();
  };

  const corDiferenca = (d: number) => {
    if (d < 0) return 'text-red-400';
    if (d > 0) return 'text-emerald-400';
    return 'text-slate-300';
  };

  return (
    <div className="fixed inset-0 bg-[#020617]/85 backdrop-blur-md flex items-center justify-center z-[200] p-4 print:static print:inset-auto print:bg-white print:p-0">
      <div
        id="fechamento-caixa-print-root"
        className="bg-[#08101f] border border-orange-500/30 rounded-[30px] shadow-[0_25px_80px_rgba(0,0,0,0.60)] w-full max-w-lg flex flex-col relative overflow-hidden animate-modal print:max-w-none print:border-0 print:shadow-none print:rounded-none print:text-black print:bg-white"
      >
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 print:hidden" />

        {etapa === 'formulario' ? (
          <div className="p-8">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-violet-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-violet-500/20 print:hidden">
                <Power className="w-8 h-8 text-violet-300" />
              </div>
              <h2 className="text-xl font-black text-white mb-2 print:text-black">{titulo}</h2>
              <p className="text-slate-400 text-xs print:text-slate-600">{subtitulo}</p>
            </div>

            <div className="space-y-4 mb-4">
              {FORMAS.map((f) => (
                <div key={f.key} className="text-left">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 pl-1 print:text-slate-700">
                    {f.label} (R$)
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    autoFocus={f.key === 'DINHEIRO'}
                    className="w-full p-3 bg-slate-950 border border-slate-700 text-white rounded-xl focus:ring-2 focus:ring-violet-500 outline-none font-mono text-lg print:bg-white print:text-black print:border-slate-300"
                    value={valoresTxt[f.key]}
                    onChange={(e) => setValoresTxt((prev) => ({ ...prev, [f.key]: e.target.value }))}
                  />
                </div>
              ))}
            </div>

            {modo === 'gestao' && (
              <div className="mb-4 text-left">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 pl-1">
                  Observação (opcional)
                </label>
                <textarea
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                  rows={2}
                  className="w-full p-3 bg-slate-950 border border-slate-700 text-white rounded-xl text-sm focus:ring-2 focus:ring-violet-500 outline-none resize-none"
                />
              </div>
            )}

            {erro && (
              <p className="text-red-400 text-sm mb-4 text-center font-medium" role="alert">
                {erro}
              </p>
            )}

            <div className="flex gap-3 print:hidden">
              <button
                type="button"
                onClick={handleFecharModal}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold text-sm transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void confirmar()}
                disabled={enviando}
                className="flex-1 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white rounded-xl font-black text-sm uppercase tracking-wider disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Conciliar e encerrar'}
              </button>
            </div>
          </div>
        ) : (
          relatorio && (
            <div className="p-8 print:p-6">
              <h2 className="text-xl font-black text-white mb-1 text-center print:text-black">Conciliação do turno</h2>
              <p className="text-slate-500 text-xs text-center mb-6 print:text-slate-600">
                {new Date(relatorio.fechadoEm).toLocaleString('pt-BR')}
              </p>

              <div className="rounded-2xl border border-white/10 overflow-hidden mb-4 print:border-slate-300">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-white/5 text-left text-[10px] font-black uppercase text-slate-500 print:bg-slate-100 print:text-slate-700">
                      <th className="px-3 py-2">Forma</th>
                      <th className="px-3 py-2 text-right">Informado</th>
                      <th className="px-3 py-2 text-right">Sistema</th>
                      <th className="px-3 py-2 text-right">Diferença</th>
                    </tr>
                  </thead>
                  <tbody>
                    {relatorio.linhas.map((l) => (
                      <tr key={l.formaPagamento} className="border-t border-white/5 print:border-slate-200">
                        <td className="px-3 py-2 text-slate-200 print:text-black">{l.rotulo}</td>
                        <td className="px-3 py-2 text-right font-mono text-white print:text-black">R$ {fmtBrl(l.valorInformado)}</td>
                        <td className="px-3 py-2 text-right font-mono text-slate-400 print:text-slate-700">
                          R$ {fmtBrl(l.valorSistema)}
                        </td>
                        <td className={`px-3 py-2 text-right font-mono font-bold ${corDiferenca(l.diferenca)} print:text-black`}>
                          {l.diferenca >= 0 ? '+' : '−'}R$ {fmtBrl(Math.abs(l.diferenca))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {relatorio.crediarioValorSistema > 0 && (
                <p className="text-xs text-amber-400/90 mb-4 print:text-amber-800">
                  Crediário registrado no sistema (sem conferência neste fechamento): R${' '}
                  {fmtBrl(relatorio.crediarioValorSistema)}
                </p>
              )}

              <div className="grid grid-cols-2 gap-3 text-xs mb-6">
                <div className="rounded-xl bg-slate-950/80 border border-white/10 p-3 print:bg-slate-50 print:border-slate-200">
                  <p className="text-slate-500 font-bold uppercase tracking-wide mb-1 print:text-slate-600">Gaveta teórica</p>
                  <p className="font-mono text-white text-lg print:text-black">R$ {fmtBrl(relatorio.saldoTeoricoGaveta)}</p>
                </div>
                <div className="rounded-xl bg-slate-950/80 border border-white/10 p-3 print:bg-slate-50 print:border-slate-200">
                  <p className="text-slate-500 font-bold uppercase tracking-wide mb-1 print:text-slate-600">Quebra gaveta</p>
                  <p className={`font-mono text-lg font-black ${corDiferenca(relatorio.diferencaGaveta)} print:text-black`}>
                    {relatorio.diferencaGaveta >= 0 ? '+' : '−'}R$ {fmtBrl(Math.abs(relatorio.diferencaGaveta))}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 print:hidden">
                <button
                  type="button"
                  onClick={imprimir}
                  className="flex-1 min-w-[120px] py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold text-sm inline-flex items-center justify-center gap-2"
                >
                  <Printer className="w-4 h-4" />
                  Imprimir
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleFecharModal();
                    onConcluido();
                  }}
                  className="flex-1 min-w-[120px] py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white rounded-xl font-black text-sm uppercase"
                >
                  Concluir
                </button>
              </div>
            </div>
          )
        )}
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          #fechamento-caixa-print-root, #fechamento-caixa-print-root * { visibility: visible; }
          #fechamento-caixa-print-root { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}</style>
    </div>
  );
}
