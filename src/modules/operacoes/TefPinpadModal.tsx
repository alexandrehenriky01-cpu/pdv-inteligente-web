import React from 'react';
import { CreditCard, Loader2, X } from 'lucide-react';

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
  if (!aberto) return null;

  const temStatusSiTef = Boolean(mensagemStatus?.trim());

  return (
    <div className="fixed inset-0 bg-[#020617]/90 backdrop-blur-md flex items-center justify-center z-[80] p-4">
      <div className="bg-[#08101f] border border-violet-500/35 rounded-[24px] shadow-[0_25px_80px_rgba(0,0,0,0.65)] w-full max-w-md relative overflow-hidden animate-[modalEnter_0.35s_ease-out_forwards]">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-violet-600 to-fuchsia-600" />
        <button
          type="button"
          onClick={onFechar}
          className="absolute top-3 right-3 p-2 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-colors"
          aria-label="Fechar"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="p-8 text-center">
          <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-violet-500/15 border border-violet-500/30 flex items-center justify-center">
            {carregando ? (
              <Loader2 className="w-10 h-10 text-violet-300 animate-spin" />
            ) : (
              <CreditCard className="w-10 h-10 text-violet-300" />
            )}
          </div>
          <h2 className="text-xl font-black text-white mb-2 tracking-tight">{titulo}</h2>

          {temStatusSiTef && carregando ? (
            <div className="mb-4 rounded-xl border border-cyan-500/35 bg-cyan-950/40 px-4 py-4 min-h-[4.5rem] flex items-center justify-center">
              <p className="text-cyan-100 text-base font-bold leading-snug whitespace-pre-wrap text-center">
                {mensagemStatus}
              </p>
            </div>
          ) : (
            <p className="text-slate-400 text-sm mb-2">{subtitulo}</p>
          )}

          {temStatusSiTef && !carregando && (
            <p className="text-slate-500 text-xs mb-4 whitespace-pre-wrap">{mensagemStatus}</p>
          )}

          {mensagemErro && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs text-left font-medium whitespace-pre-wrap">
              {mensagemErro}
            </div>
          )}
          {mensagemErro && (
            <button
              type="button"
              onClick={onFechar}
              className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm"
            >
              Voltar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
