import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { toast } from 'react-toastify';
import { api } from '../../../services/api';
import {
  Barcode,
  CheckCircle,
  Package,
  RefreshCcw,
  AlertTriangle,
  ScanLine,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { AxiosError } from 'axios';

export interface IInventarioSessao {
  id: string;
  dataInicio: string;
  status: 'ABERTO' | 'CONCLUIDO' | 'CANCELADO' | string;
  observacao?: string;
}

export interface IMensagemBip {
  texto: string;
  tipo: 'sucesso' | 'erro' | '';
}

export interface IBipResponse {
  message: string;
}

export function ContagemCegaPage() {
  const [inventarioAberto, setInventarioAberto] = useState<IInventarioSessao | null>(null);
  const [codigoBarras, setCodigoBarras] = useState('');
  const [quantidade, setQuantidade] = useState('');
  const [mensagem, setMensagem] = useState<IMensagemBip>({ texto: '', tipo: '' });
  const [loading, setLoading] = useState(true);

  const inputRef = useRef<HTMLInputElement>(null);
  const qtdRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    verificarInventarioAberto();
  }, []);

  const verificarInventarioAberto = async () => {
    setLoading(true);
    try {
      const res = await api.get<IInventarioSessao[]>('/api/estoque/inventario');

      const aberto = res.data.find(i => i.status === 'ABERTO');
      setInventarioAberto(aberto || null);

      if (aberto) {
        setTimeout(() => inputRef.current?.focus(), 500);
      }
    } catch (err) {
      const error = err as AxiosError<{ error?: string }>;
      console.error('Erro ao verificar inventário:', error.response?.data || error.message);
      toast.error(error.response?.data?.error || error.message || 'Erro ao verificar inventário.');
    } finally {
      setLoading(false);
    }
  };

  const registrarBip = async (e: FormEvent) => {
    e.preventDefault();
    if (!inventarioAberto || !codigoBarras || !quantidade) return;

    try {
      const res = await api.post<IBipResponse>(
        `/api/estoque/inventario/${inventarioAberto.id}/bipar`,
        {
          codigoBarras,
          quantidade: Number(quantidade)
        }
      );

      setMensagem({
        texto: res.data.message || 'Produto registrado com sucesso!',
        tipo: 'sucesso'
      });

      setCodigoBarras('');
      setQuantidade('');

      setTimeout(() => inputRef.current?.focus(), 100);
    } catch (err) {
      const error = err as AxiosError<{ error?: string }>;

      setMensagem({
        texto: error.response?.data?.error || 'Erro ao registrar produto.',
        tipo: 'erro'
      });

      setCodigoBarras('');

      setTimeout(() => inputRef.current?.focus(), 100);
    }

    setTimeout(() => setMensagem({ texto: '', tipo: '' }), 3000);
  };

  const handleCodigoKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && codigoBarras) {
      e.preventDefault();
      qtdRef.current?.focus();
    }
  };

  if (loading) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#060a13] p-4">
        <div className="absolute -left-20 top-0 h-72 w-72 rounded-full bg-violet-600/15 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-cyan-600/10 blur-[120px]" />

        <div className="relative z-10 flex flex-col items-center gap-4">
          <div className="rounded-2xl border border-violet-400/20 bg-violet-500/10 p-4">
            <Loader2 className="h-12 w-12 animate-spin text-violet-300" />
          </div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-slate-400">
            Verificando sessão de inventário...
          </p>
        </div>
      </div>
    );
  }

  if (!inventarioAberto) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#060a13] p-4">
        <div className="absolute top-0 right-0 h-72 w-72 rounded-full bg-violet-600/15 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 h-72 w-72 rounded-full bg-cyan-600/10 blur-[120px] pointer-events-none" />

        <div className="relative z-10 w-full max-w-md rounded-[32px] border border-white/10 bg-[#08101f]/90 p-8 text-center shadow-[0_25px_70px_rgba(0,0,0,0.45)] backdrop-blur-xl">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-white/10 bg-black/10 shadow-inner">
            <Package className="h-10 w-10 text-slate-500" />
          </div>

          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-violet-300">
            <Sparkles className="h-3.5 w-3.5" />
            Inventário Mobile
          </div>

          <h2 className="text-2xl font-black tracking-tight text-white">
            Nenhum inventário aberto
          </h2>

          <p className="mt-3 text-sm leading-7 text-slate-400">
            Aguarde o gerente iniciar a sessão de contagem no sistema principal
            (Backoffice).
          </p>

          <button
            onClick={verificarInventarioAberto}
            className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-violet-400/20 bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-4 font-black text-white shadow-[0_0_20px_rgba(139,92,246,0.24)] transition-all hover:scale-[1.02] hover:brightness-110 active:scale-[0.98]"
          >
            <RefreshCcw className="h-5 w-5" />
            Atualizar Tela
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-[#060a13]">
      <div className="absolute -left-[10%] top-[-10%] h-96 w-96 rounded-full bg-violet-600/20 blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] h-96 w-96 rounded-full bg-cyan-600/12 blur-[140px] pointer-events-none" />

      <div className="relative z-10 border-b border-white/10 bg-[#08101f]/85 px-5 py-5 shadow-[0_12px_30px_rgba(0,0,0,0.25)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-md items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="flex items-center gap-2 text-xl font-black tracking-tight text-white">
              <ScanLine className="h-6 w-6 text-violet-300" />
              Modo Contagem
            </h1>

            <p className="mt-1 truncate text-xs font-medium text-slate-400">
              Sessão: {inventarioAberto.observacao || 'Inventário Geral'}
            </p>
          </div>

          <div className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.16)]">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            Ativa
          </div>
        </div>
      </div>

      <div className="relative z-10 flex flex-1 items-center justify-center p-5">
        <div className="w-full max-w-md">
          <form
            onSubmit={registrarBip}
            className="rounded-[32px] border border-white/10 bg-[#08101f]/90 p-6 shadow-[0_25px_70px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:p-8"
          >
            <div className="mb-6 text-center">
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full border border-violet-400/20 bg-violet-500/10">
                <Barcode className="h-10 w-10 text-violet-300" />
              </div>

              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-violet-300">
                <Sparkles className="h-3.5 w-3.5" />
                Contagem Cega
              </div>

              <h2 className="text-xl font-black tracking-tight text-white">
                Bipar Produto
              </h2>

              <p className="mt-1 text-xs text-slate-400">
                Use o leitor ou a câmera do celular
              </p>
            </div>

            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-center text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                  Código Curto ou Código de Barras
                </label>
                <input
                  ref={inputRef}
                  type="text"
                  value={codigoBarras}
                  onChange={e => setCodigoBarras(e.target.value)}
                  onKeyDown={handleCodigoKeyDown}
                  className="w-full rounded-[24px] border-2 border-white/10 bg-[#0d182d] px-4 py-4 text-center font-mono text-2xl text-white outline-none shadow-inner transition-all placeholder:text-slate-700 focus:border-violet-400/30 focus:ring-4 focus:ring-violet-500/15"
                  placeholder="Ex: 005 ou 789..."
                  autoFocus
                />
              </div>

              <div>
                <label className="mb-2 block text-center text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                  Quantidade Física
                </label>
                <input
                  ref={qtdRef}
                  type="number"
                  value={quantidade}
                  onChange={e => setQuantidade(e.target.value)}
                  className="w-full rounded-[24px] border-2 border-white/10 bg-[#0d182d] px-4 py-4 text-center text-3xl font-black text-cyan-300 outline-none shadow-inner transition-all placeholder:text-slate-700 focus:border-cyan-400/30 focus:ring-4 focus:ring-cyan-500/15"
                  placeholder="0"
                  min="0.001"
                  step="0.001"
                />
              </div>

              <button
                type="submit"
                disabled={!codigoBarras || !quantidade}
                className="inline-flex w-full items-center justify-center gap-3 rounded-[24px] border border-violet-400/20 bg-gradient-to-r from-violet-600 to-cyan-600 px-6 py-5 text-lg font-black text-white shadow-[0_0_24px_rgba(99,102,241,0.26)] transition-all hover:scale-[1.01] hover:brightness-110 active:scale-[0.98] disabled:opacity-50 disabled:shadow-none"
              >
                <CheckCircle className="h-6 w-6" />
                Confirmar
              </button>

              {mensagem.texto && (
                <div
                  className={`flex items-center justify-center gap-2 rounded-2xl border px-4 py-4 text-center text-sm font-bold animate-in fade-in zoom-in duration-300 ${
                    mensagem.tipo === 'sucesso'
                      ? 'border-emerald-400/20 bg-emerald-500/10 text-emerald-300'
                      : 'border-rose-400/20 bg-rose-500/10 text-rose-300'
                  }`}
                >
                  {mensagem.tipo === 'sucesso' ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : (
                    <AlertTriangle className="h-5 w-5" />
                  )}
                  {mensagem.texto}
                </div>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}