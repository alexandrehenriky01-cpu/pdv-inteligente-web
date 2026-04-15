import { CreditCard, Loader2, X } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '../../components/ui/dialog';

export interface TefPinpadModalProps {
  aberto: boolean;
  carregando: boolean;
  mensagemErro: string | null;
  /** Texto em tempo real do SiTef (WebSocket status PROCESSANDO). */
  mensagemStatus?: string | null;
  titulo?: string;
  subtitulo?: string;
  onFechar: () => void;
}

/**
 * Modal de bloqueio durante autorização no PinPad (TEF / SiTef).
 * A mensagem SiTef (PROCESSANDO) é exibida em destaque para o operador.
 */
export function TefPinpadModal({
  aberto,
  carregando,
  mensagemErro,
  mensagemStatus,
  titulo = 'SiTef — PinPad',
  subtitulo = 'Siga as instruções no terminal.',
  onFechar,
}: TefPinpadModalProps) {
  const temStatusSiTef = Boolean(mensagemStatus?.trim());

  return (
    <Dialog
      open={aberto}
      onOpenChange={(open) => {
        if (!open) onFechar();
      }}
    >
      <DialogContent
        hideDescription
        overlayClassName="z-[350] bg-[#020617]/90 backdrop-blur-md"
        className="z-[360] w-full max-w-md gap-0 overflow-hidden rounded-[24px] border-violet-500/35 bg-[#08101f] p-0 shadow-[0_25px_80px_rgba(0,0,0,0.65)]"
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <div className="absolute left-0 top-0 h-1 w-full bg-gradient-to-r from-violet-600 to-fuchsia-600" />
        <button
          type="button"
          onClick={onFechar}
          className="absolute right-3 top-3 rounded-lg p-2 text-slate-500 transition-colors hover:bg-white/5 hover:text-white"
          aria-label="Fechar"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="p-8 text-center">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full border border-violet-500/30 bg-violet-500/15">
            {carregando ? (
              <Loader2 className="h-10 w-10 animate-spin text-violet-300" />
            ) : (
              <CreditCard className="h-10 w-10 text-violet-300" />
            )}
          </div>
          <DialogTitle className="mb-2 text-xl font-black tracking-tight text-white">{titulo}</DialogTitle>

          {temStatusSiTef && carregando ? (
            <div className="mb-4 flex min-h-[4.5rem] items-center justify-center rounded-xl border border-cyan-500/35 bg-cyan-950/40 px-4 py-4">
              <p className="whitespace-pre-wrap text-center text-base font-bold leading-snug text-cyan-100">
                {mensagemStatus}
              </p>
            </div>
          ) : (
            <p className="mb-2 text-sm text-slate-400">{subtitulo}</p>
          )}

          {temStatusSiTef && !carregando && (
            <p className="mb-4 whitespace-pre-wrap text-xs text-slate-500">{mensagemStatus}</p>
          )}

          {mensagemErro && (
            <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-left text-xs font-medium whitespace-pre-wrap text-red-300">
              {mensagemErro}
            </div>
          )}
          {mensagemErro && (
            <button
              type="button"
              onClick={onFechar}
              className="w-full rounded-xl bg-slate-800 py-3 text-sm font-bold text-white hover:bg-slate-700"
            >
              Voltar
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
