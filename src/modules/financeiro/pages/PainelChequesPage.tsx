import { useEffect, useState, type DragEvent } from 'react';
import { toast } from 'react-toastify';
import { Layout } from '../../../components/Layout';
import { api } from '../../../services/api';
import {
  Plus,
  GripVertical,
  Building,
  Calendar,
  AlertCircle,
  X,
  CheckCircle,
  Wallet,
  Loader2,
  Sparkles,
  Landmark,
} from 'lucide-react';
import { AxiosError } from 'axios';

export type ChequeStatus = 'A_COMPENSAR' | 'COMPENSADO' | 'DEVOLVIDO' | 'SUSTADO';

export interface ICheque {
  id: string;
  numero: string;
  emitente: string;
  valor: number | string;
  dataBomPara: string | Date;
  status: ChequeStatus;
  banco?: { codigo: string; nome: string };
}

const COLUNAS: {
  id: ChequeStatus;
  titulo: string;
  corBg: string;
  corBorder: string;
  corTexto: string;
  icone: string;
}[] = [
  {
    id: 'A_COMPENSAR',
    titulo: 'A Compensar (Gaveta)',
    corBg: 'bg-[#08101f]/90',
    corBorder: 'border-violet-400/20',
    corTexto: 'text-violet-300',
    icone: '🗄️',
  },
  {
    id: 'COMPENSADO',
    titulo: 'Compensados',
    corBg: 'bg-emerald-500/10',
    corBorder: 'border-emerald-400/20',
    corTexto: 'text-emerald-300',
    icone: '✅',
  },
  {
    id: 'DEVOLVIDO',
    titulo: 'Devolvidos',
    corBg: 'bg-rose-500/10',
    corBorder: 'border-rose-400/20',
    corTexto: 'text-rose-300',
    icone: '❌',
  },
  {
    id: 'SUSTADO',
    titulo: 'Sustados',
    corBg: 'bg-amber-500/10',
    corBorder: 'border-amber-400/20',
    corTexto: 'text-amber-300',
    icone: '🛑',
  },
];

export function PainelChequesPage() {
  const [cheques, setCheques] = useState<ICheque[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [novoNumero, setNovoNumero] = useState('');
  const [novoEmitente, setNovoEmitente] = useState('');
  const [novoValor, setNovoValor] = useState('');
  const [novoBomPara, setNovoBomPara] = useState('');

  useEffect(() => {
    carregarCheques();
  }, []);

  const carregarCheques = async () => {
    setLoading(true);
    try {
      const res = await api.get<ICheque[]>('/api/cheques');
      setCheques(res.data);
    } catch (err) {
      const error = err as AxiosError<{ error?: string }>;
      console.error(error.response?.data || error.message);
      toast.error(error.response?.data?.error || error.message || 'Erro ao carregar cheques.');
    } finally {
      setLoading(false);
    }
  };

  const registrarCheque = async () => {
    if (!novoNumero || !novoEmitente || !novoValor || !novoBomPara) {
      return alert('Preencha os campos obrigatórios!');
    }

    setSaving(true);
    try {
      await api.post<{ message?: string }>('/api/cheques', {
        numero: novoNumero,
        emitente: novoEmitente,
        valor: Number(novoValor),
        dataBomPara: novoBomPara,
        dataEmissao: new Date().toISOString(),
      });

      alert('✅ Cheque registrado com sucesso na gaveta!');
      setIsModalOpen(false);
      setNovoNumero('');
      setNovoEmitente('');
      setNovoValor('');
      setNovoBomPara('');
      carregarCheques();
    } catch (err) {
      const error = err as AxiosError<{ error?: string }>;
      alert(error.response?.data?.error || 'Erro ao registrar cheque.');
    } finally {
      setSaving(false);
    }
  };

  const handleDragStart = (e: DragEvent, chequeId: string) => {
    e.dataTransfer.setData('chequeId', chequeId);
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: DragEvent, novoStatus: ChequeStatus) => {
    e.preventDefault();
    const chequeId = e.dataTransfer.getData('chequeId');
    const chequeMovido = cheques.find(c => c.id === chequeId);

    if (!chequeMovido || chequeMovido.status === novoStatus) return;

    setCheques(prev =>
      prev.map(c => (c.id === chequeId ? { ...c, status: novoStatus } : c))
    );

    try {
      await api.put<{ message?: string }>(`/api/cheques/${chequeId}/status`, {
        novoStatus,
      });
    } catch (err) {
      const error = err as AxiosError<{ error?: string }>;
      console.error(error);
      alert('Erro ao mudar o status do cheque. A tela será recarregada.');
      carregarCheques();
    }
  };

  const formatarMoeda = (valor: number | string) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(Number(valor));
  };

  const inputClass =
    'w-full rounded-2xl border border-white/10 bg-[#0d182d] px-4 py-3.5 text-sm text-white placeholder:text-slate-500 outline-none shadow-inner transition-all focus:border-violet-400/30 focus:ring-2 focus:ring-violet-500/15';
  const labelClass =
    'mb-2 block pl-1 text-xs font-bold uppercase tracking-[0.16em] text-slate-400';

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

      <div className="mx-auto flex h-[calc(100vh-80px)] max-w-[1600px] flex-col space-y-6 pb-6">
        <div className="relative overflow-hidden rounded-[30px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(139,92,246,0.16),_transparent_26%),linear-gradient(135deg,_#0b1020_0%,_#08101f_45%,_#0a1224_100%)] p-6 shadow-[0_25px_70px_rgba(0,0,0,0.40)] sm:p-8">
          <div className="pointer-events-none absolute right-0 top-0 h-64 w-64 rounded-full bg-violet-500/10 blur-[100px]" />

          <div className="relative z-10 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="rounded-2xl border border-violet-400/20 bg-violet-500/10 p-3">
                <Wallet className="h-8 w-8 text-violet-300" />
              </div>

              <div>
                <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-violet-300">
                  <Sparkles className="h-3.5 w-3.5" />
                  Checks Control
                </div>

                <h1 className="text-3xl font-black text-white">Painel de Cheques</h1>
                <p className="mt-1 font-medium text-slate-400">
                  Arraste os cheques entre as colunas para alterar o status e conciliar.
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-2xl border border-violet-400/20 bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-3.5 font-black text-white shadow-[0_0_20px_rgba(139,92,246,0.22)] transition-all hover:scale-[1.02] hover:brightness-110"
            >
              <Plus className="h-5 w-5" />
              Registrar Cheque
            </button>
          </div>
        </div>

        <div className="custom-scrollbar flex flex-1 gap-6 overflow-x-auto pb-4">
          {COLUNAS.map(coluna => (
            <div
              key={coluna.id}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, coluna.id)}
              className={`flex min-w-[320px] max-w-[400px] flex-1 flex-col rounded-[28px] border ${coluna.corBg} ${coluna.corBorder} shadow-[0_20px_45px_rgba(0,0,0,0.30)] backdrop-blur-xl transition-colors hover:border-white/20`}
            >
              <div className="flex items-center justify-between rounded-t-[28px] border-b border-white/10 bg-black/10 p-5">
                <h3 className={`flex items-center gap-2 text-sm font-black uppercase tracking-[0.16em] ${coluna.corTexto}`}>
                  <span>{coluna.icone}</span>
                  {coluna.titulo}
                </h3>

                <span className="rounded-full border border-white/10 bg-[#0b1324] px-3 py-1 text-xs font-black text-white">
                  {cheques.filter(c => c.status === coluna.id).length}
                </span>
              </div>

              <div className="custom-scrollbar flex-1 space-y-4 overflow-y-auto p-4">
                {loading && cheques.length === 0 ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
                  </div>
                ) : cheques.filter(c => c.status === coluna.id).map(cheque => {
                    const isAtrasado =
                      new Date(cheque.dataBomPara) < new Date() &&
                      cheque.status === 'A_COMPENSAR';

                    return (
                      <div
                        key={cheque.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, cheque.id)}
                        className="group cursor-grab rounded-[22px] border border-white/10 bg-[#0b1324]/95 p-5 shadow-[0_12px_30px_rgba(0,0,0,0.22)] transition-all hover:-translate-y-1 hover:border-violet-400/20 active:cursor-grabbing"
                      >
                        <div className="mb-3 flex items-start justify-between">
                          <span className="font-mono text-xl font-black text-white">
                            {formatarMoeda(cheque.valor)}
                          </span>
                          <GripVertical className="h-5 w-5 text-slate-500 transition-colors group-hover:text-violet-300" />
                        </div>

                        <div className="space-y-2">
                          <p
                            className="truncate text-sm font-bold text-slate-300"
                            title={cheque.emitente}
                          >
                            {cheque.emitente}
                          </p>

                          <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/10 p-2 text-xs font-bold text-slate-400">
                            <Building className="h-4 w-4 text-slate-500" />
                            Nº {cheque.numero} {cheque.banco ? `| ${cheque.banco.codigo}` : ''}
                          </div>

                          <div
                            className={`mt-3 flex items-center gap-1.5 border-t border-white/10 pt-3 text-xs font-black ${
                              isAtrasado ? 'text-rose-300' : 'text-violet-300'
                            }`}
                          >
                            {isAtrasado ? (
                              <AlertCircle className="h-4 w-4" />
                            ) : (
                              <Calendar className="h-4 w-4" />
                            )}
                            Bom para:{' '}
                            {new Date(cheque.dataBomPara).toLocaleDateString('pt-BR', {
                              timeZone: 'UTC',
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                {cheques.filter(c => c.status === coluna.id).length === 0 && !loading && (
                  <div className="flex h-full flex-col items-center justify-center rounded-[22px] border-2 border-dashed border-white/10 bg-black/10 p-6 text-center">
                    <span className="mb-2 text-2xl opacity-50">{coluna.icone}</span>
                    <span className="text-sm font-medium text-slate-500">
                      Arraste cheques para cá
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-[22px] border border-white/10 bg-black/10 px-6 py-4">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <Landmark className="h-4 w-4 text-violet-300" />
            O painel de cheques organiza o fluxo entre gaveta, compensação, devolução e sustação.
          </div>
        </div>

        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#020617]/80 p-4 backdrop-blur-md">
            <div className="animate-modal w-full max-w-md overflow-hidden rounded-[30px] border border-white/10 bg-[#08101f]/95 shadow-[0_25px_80px_rgba(0,0,0,0.65)]">
              <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-violet-500 to-cyan-400" />

              <div className="flex items-center justify-between border-b border-white/10 bg-black/10 p-6">
                <div>
                  <h2 className="text-xl font-black text-white">Registrar Cheque</h2>
                  <p className="mt-1 text-xs text-slate-400">
                    Insira um novo cheque na gaveta (A Compensar).
                  </p>
                </div>

                <button
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-full border border-white/10 bg-white/5 p-2 text-slate-400 transition-colors hover:border-white/15 hover:bg-white/10 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-5 p-6">
                <div>
                  <label className={labelClass}>Nome do Emitente *</label>
                  <input
                    type="text"
                    value={novoEmitente}
                    onChange={e => setNovoEmitente(e.target.value)}
                    className={inputClass}
                    placeholder="Quem assinou o cheque?"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Número *</label>
                    <input
                      type="text"
                      value={novoNumero}
                      onChange={e => setNovoNumero(e.target.value)}
                      className={`${inputClass} font-mono`}
                      placeholder="Ex: 000123"
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Valor (R$) *</label>
                    <input
                      type="number"
                      step="0.01"
                      value={novoValor}
                      onChange={e => setNovoValor(e.target.value)}
                      className={`${inputClass} font-mono font-black text-emerald-300`}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Data Bom Para *</label>
                  <input
                    type="date"
                    value={novoBomPara}
                    onChange={e => setNovoBomPara(e.target.value)}
                    className={inputClass}
                    style={{ colorScheme: 'dark' }}
                  />
                </div>
              </div>

              <div className="flex shrink-0 flex-col gap-3 border-t border-white/10 bg-black/10 p-6 sm:flex-row sm:justify-end">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-6 py-3.5 font-bold text-slate-300 transition-colors hover:bg-white/10 hover:text-white sm:w-auto"
                >
                  Cancelar
                </button>

                <button
                  onClick={registrarCheque}
                  disabled={saving}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-violet-400/20 bg-gradient-to-r from-violet-600 to-fuchsia-600 px-8 py-3.5 font-black text-white shadow-[0_0_20px_rgba(139,92,246,0.22)] transition-all hover:scale-[1.02] hover:brightness-110 disabled:opacity-50 disabled:hover:scale-100 sm:w-auto"
                >
                  {saving ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <CheckCircle className="h-5 w-5" />
                  )}
                  {saving ? 'Salvando...' : 'Salvar Cheque'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}