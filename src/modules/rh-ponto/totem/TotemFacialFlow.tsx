import { useEffect, useState } from 'react';
import { ScanFace, AlertTriangle, CheckCircle2, Loader2, Camera } from 'lucide-react';
import { FaceCapture, base64ToDescriptor, faceDistance } from '../../rh-biometry-facial/components/FaceCapture';
import { listFaciaisDaLoja, type FacialEnrollDaLoja } from '../../rh-biometry/services/rhBiometryApi';
import { totemMarcarFacial } from '../services/pontoApi';

/// Threshold de aceitação. < 0.55 é "mesma pessoa" em face-api convention.
const MATCH_THRESHOLD = 0.55;

const TZ = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Sao_Paulo';

const TIPO_LABEL: Record<string, string> = {
  ENTRADA: 'ENTRADA',
  INICIO_INTERVALO: 'INÍCIO DO INTERVALO',
  FIM_INTERVALO: 'FIM DO INTERVALO',
  SAIDA: 'SAÍDA',
};

interface ConfirmacaoView {
  readonly nome: string;
  readonly matricula: string;
  readonly tipoInferido: string;
  readonly horario: string;
  readonly codigo: string;
  readonly distance: number;
}

type Phase = 'loading-enrolls' | 'no-enrolls' | 'idle' | 'capturing' | 'matching' | 'sending' | 'success' | 'error';

const AUTO_RESET_SECONDS = 5;

interface Props {
  /// Chamado quando o flow termina (sucesso ou cancelado).
  readonly onDone: () => void;
}

export function TotemFacialFlow({ onDone }: Props): JSX.Element {
  const [enrolls, setEnrolls] = useState<readonly FacialEnrollDaLoja[]>([]);
  const [phase, setPhase] = useState<Phase>('loading-enrolls');
  const [erro, setErro] = useState<string | null>(null);
  const [confirmacao, setConfirmacao] = useState<ConfirmacaoView | null>(null);
  const [countdown, setCountdown] = useState<number>(AUTO_RESET_SECONDS);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await listFaciaisDaLoja();
        if (cancelled) return;
        setEnrolls(list);
        setPhase(list.length === 0 ? 'no-enrolls' : 'idle');
      } catch (err) {
        if (cancelled) return;
        setErro(err instanceof Error ? err.message : 'Falha ao carregar cadastros faciais.');
        setPhase('error');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Auto-reset após sucesso: countdown visível + volta para 'idle'.
  // O usuário não precisa clicar em nada — câmera fica fechada até clicar
  // de novo em "Registrar ponto".
  useEffect(() => {
    if (phase !== 'success') return;
    setCountdown(AUTO_RESET_SECONDS);
    const interval = window.setInterval(() => {
      setCountdown((c) => (c > 0 ? c - 1 : 0));
    }, 1000);
    const timeout = window.setTimeout(() => {
      setConfirmacao(null);
      setErro(null);
      setPhase('idle');
    }, AUTO_RESET_SECONDS * 1000);
    return () => {
      window.clearInterval(interval);
      window.clearTimeout(timeout);
    };
  }, [phase]);

  const iniciarCaptura = (): void => {
    setErro(null);
    setConfirmacao(null);
    setPhase('capturing');
  };

  const voltarParaIdle = (): void => {
    setErro(null);
    setConfirmacao(null);
    setPhase('idle');
  };

  const handleCapture = async (descriptors: ReadonlyArray<Float32Array>): Promise<void> => {
    if (descriptors.length === 0) return;
    setPhase('matching');
    try {
      const probe = descriptors[0];
      let best: { e: FacialEnrollDaLoja; distance: number } | null = null;
      for (const e of enrolls) {
        try {
          const stored = base64ToDescriptor(e.templateOpaqueId);
          const d = faceDistance(probe, stored);
          if (best === null || d < best.distance) best = { e, distance: d };
        } catch {
          /* template corrompido — pula */
        }
      }
      if (!best || best.distance >= MATCH_THRESHOLD) {
        const dStr = best ? best.distance.toFixed(3) : '—';
        throw new Error(`Não foi possível reconhecer (distância ${dStr}). Aproxime-se da câmera e tente novamente.`);
      }
      setPhase('sending');
      const r = await totemMarcarFacial({ funcionarioId: best.e.funcionarioId, timezone: TZ });
      setConfirmacao({
        nome: best.e.funcionarioNome,
        matricula: best.e.funcionarioMatricula,
        tipoInferido: r.tipoInferido,
        horario: r.marcacao.timestampServidor,
        codigo: r.marcacao.codigoComprovante,
        distance: best.distance,
      });
      setPhase('success');
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Falha no reconhecimento.');
      setPhase('error');
    }
  };

  if (phase === 'loading-enrolls') {
    return (
      <div className="rounded-3xl border border-white/10 bg-slate-900/40 p-8 text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-violet-300" />
        <p className="mt-3 text-sm text-slate-300">Carregando cadastros faciais da loja…</p>
      </div>
    );
  }

  if (phase === 'no-enrolls') {
    return (
      <div className="rounded-3xl border border-amber-500/30 bg-amber-500/5 p-8 text-center">
        <AlertTriangle className="mx-auto h-8 w-8 text-amber-300" />
        <p className="mt-3 text-sm text-amber-200">
          Nenhum funcionário tem face cadastrada na loja. Vá em <code>Biometria Facial</code> para cadastrar antes.
        </p>
        <button type="button" onClick={onDone} className="mt-4 rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-200 hover:bg-white/5">
          Voltar
        </button>
      </div>
    );
  }

  if (phase === 'success' && confirmacao) {
    return (
      <div className="rounded-3xl border border-emerald-500/40 bg-emerald-500/10 p-10 text-center">
        <CheckCircle2 className="mx-auto h-16 w-16 text-emerald-300" />
        <h2 className="mt-4 text-3xl font-bold text-white">{TIPO_LABEL[confirmacao.tipoInferido] ?? confirmacao.tipoInferido}</h2>
        <div className="mt-4 text-xl text-emerald-200">{confirmacao.nome}</div>
        <div className="text-sm text-emerald-300/70">matrícula {confirmacao.matricula}</div>
        <div className="mt-4 text-3xl font-bold tabular-nums text-white">
          {new Date(confirmacao.horario).toLocaleTimeString('pt-BR')}
        </div>
        <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 font-mono text-xs text-slate-300">
          comprovante {confirmacao.codigo}
        </div>
        <div className="mt-4 text-xs text-slate-400">
          match facial · distância {confirmacao.distance.toFixed(3)} (threshold {MATCH_THRESHOLD})
        </div>
        <div className="mt-6 inline-flex items-center gap-3">
          <div className="text-base text-emerald-200">
            Voltando à tela inicial em <span className="font-bold tabular-nums text-white">{countdown}s</span>
          </div>
          <button type="button" onClick={voltarParaIdle} className="rounded-xl border border-emerald-500/40 px-4 py-1.5 text-xs text-emerald-100 hover:bg-emerald-500/20">
            Já registrei
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div className="rounded-3xl border border-rose-500/40 bg-rose-500/10 p-8 text-center">
        <AlertTriangle className="mx-auto h-8 w-8 text-rose-300" />
        <p className="mt-3 text-sm text-rose-200">{erro}</p>
        <div className="mt-4 flex justify-center gap-2">
          <button type="button" onClick={iniciarCaptura} className="rounded-xl bg-rose-500/20 px-4 py-2 text-sm text-rose-100 hover:bg-rose-500/30">
            Tentar de novo
          </button>
          <button type="button" onClick={voltarParaIdle} className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-200 hover:bg-white/5">
            Voltar
          </button>
        </div>
      </div>
    );
  }

  // Tela inicial: câmera FECHADA até clicar em "Registrar ponto".
  if (phase === 'idle') {
    return (
      <div className="space-y-6 rounded-3xl border border-white/10 bg-slate-900/40 p-8 text-center">
        <div className="flex items-center justify-center gap-2 text-sm uppercase tracking-wide text-violet-300">
          <ScanFace className="h-5 w-5" />
          <span>Reconhecimento facial pronto · {enrolls.length} {enrolls.length === 1 ? 'pessoa cadastrada' : 'pessoas cadastradas'}</span>
        </div>
        <p className="text-sm text-slate-300">
          Clique no botão abaixo quando estiver pronto para bater o ponto. A câmera só vai abrir nesse momento — o sistema reconhece você automaticamente e registra o tipo correto (entrada, intervalo ou saída).
        </p>
        <button
          type="button"
          onClick={iniciarCaptura}
          className="inline-flex items-center gap-3 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-8 py-5 text-lg font-bold text-white shadow-lg shadow-violet-900/40 hover:from-violet-500 hover:to-fuchsia-500"
        >
          <Camera className="h-6 w-6" />
          Registrar ponto
        </button>
        <div>
          <button type="button" onClick={onDone} className="text-xs text-slate-500 hover:text-white">
            Voltar para outros métodos
          </button>
        </div>
      </div>
    );
  }

  // phase === 'capturing' | 'matching' | 'sending' — câmera aberta.
  return (
    <div className="space-y-4 rounded-3xl border border-white/10 bg-slate-900/40 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm uppercase tracking-wide text-violet-300">
          <ScanFace className="h-5 w-5" />
          <span>Reconhecimento facial</span>
        </div>
        <button type="button" onClick={voltarParaIdle} className="text-xs text-slate-400 hover:text-white">
          Cancelar
        </button>
      </div>

      {phase === 'matching' || phase === 'sending' ? (
        <div className="rounded-2xl border border-violet-500/30 bg-violet-500/5 p-6 text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-violet-300" />
          <p className="mt-3 text-sm text-violet-200">
            {phase === 'matching' ? 'Reconhecendo…' : 'Registrando ponto…'}
          </p>
        </div>
      ) : (
        <FaceCapture
          capturesNeeded={1}
          minScore={0.5}
          onComplete={(d) => void handleCapture(d)}
          onError={(err) => { setErro(err.message); setPhase('error'); }}
        />
      )}

      <p className="text-center text-xs text-slate-400">
        Olhe para a câmera. O sistema vai identificar você automaticamente e registrar o próximo ponto.
      </p>
    </div>
  );
}
