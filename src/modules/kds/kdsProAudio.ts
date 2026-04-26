/** Áudio KDS: um AudioContext compartilhado + desbloqueio por gesto do usuário. */

let sharedCtx: AudioContext | null = null;

function getAudioContextClass(): (typeof AudioContext) | null {
  const w = window as unknown as { webkitAudioContext?: typeof AudioContext };
  return window.AudioContext || w.webkitAudioContext || null;
}

export function getKdsSharedAudioContext(): AudioContext | null {
  const Ctor = getAudioContextClass();
  if (!Ctor) return null;
  if (!sharedCtx || sharedCtx.state === 'closed') {
    sharedCtx = new Ctor();
  }
  return sharedCtx;
}

export async function unlockKdsAudio(): Promise<boolean> {
  const ctx = getKdsSharedAudioContext();
  if (!ctx) {
    if (import.meta.env.DEV) console.warn('[KDS_AUDIO] AudioContext indisponível');
    return false;
  }
  try {
    if (ctx.state === 'suspended') await ctx.resume();
    if (import.meta.env.DEV) console.info('[KDS_AUDIO] contexto desbloqueado', ctx.state);
    return ctx.state === 'running';
  } catch (e) {
    if (import.meta.env.DEV) console.warn('[KDS_AUDIO] falha ao resumir', e);
    return false;
  }
}

function bip(
  ctx: AudioContext,
  freq: number,
  durSec: number,
  vol = 0.07,
  type: OscillatorType = 'sine'
): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(vol, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + durSec);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + durSec);
}

/** Som 1 — novo pedido */
export function tocarKdsSomNovo(ctx: AudioContext): void {
  try {
    if (import.meta.env.DEV) console.info('[KDS_AUDIO] novo pedido');
    bip(ctx, 980, 0.1, 0.075);
    window.setTimeout(() => bip(ctx, 1180, 0.1, 0.065), 85);
    window.setTimeout(() => bip(ctx, 880, 0.08, 0.055), 200);
    try {
      const audio = new Audio('/sounds/alert.mp3');
      audio.volume = 0.65;
      void audio.play().catch(() => {});
    } catch {
      /* ignore */
    }
  } catch (e) {
    if (import.meta.env.DEV) console.warn('[KDS_AUDIO] som novo falhou', e);
  }
}

/**
 * Bipe “perigo”: mais grave/agudo alternado, envelope com attack e fade-out curto
 * para sawtooth/square não estalariem nas bordas.
 */
function bipAtraso(
  ctx: AudioContext,
  startTime: number,
  freq: number,
  durSec: number,
  peakGain: number,
  wave: OscillatorType
): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = wave;
  osc.frequency.value = freq;

  const attack = Math.min(0.012, durSec * 0.08);
  const release = Math.min(0.055, durSec * 0.22);
  const tEnd = startTime + durSec;
  const tReleaseStart = Math.max(startTime + attack + 0.02, tEnd - release);

  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.linearRampToValueAtTime(peakGain, startTime + attack);
  gain.gain.setValueAtTime(peakGain, tReleaseStart);
  gain.gain.exponentialRampToValueAtTime(0.0001, tEnd);

  osc.start(startTime);
  osc.stop(tEnd);
}

/** Som 2 — atrasado: atenção/perigo; alternância grave/aguda, 3–5s, sem parecer “novo pedido”. */
export function tocarKdsSomAtrasado(ctx: AudioContext): void {
  try {
    if (import.meta.env.DEV) console.info('[KDS_AUDIO] atraso disparado');

    const t0 = ctx.currentTime;
    const dur = 0.35;
    const gap = 0.175;
    const peak = 0.2;
    const wave: OscillatorType = 'sawtooth';
    const freqsAltos = 520;
    const freqsBaixos = 260;

    const sequencia: number[] = [
      freqsAltos,
      freqsBaixos,
      freqsAltos,
      freqsBaixos,
      freqsAltos,
      freqsBaixos,
    ];

    let t = t0;
    for (let i = 0; i < sequencia.length; i++) {
      bipAtraso(ctx, t, sequencia[i], dur, peak, wave);
      t += dur + gap;
    }
  } catch (e) {
    if (import.meta.env.DEV) console.warn('[KDS_AUDIO] som atraso falhou', e);
  }
}

/** Som 3 — pronto / finalizado (curto, distinto) */
export function tocarKdsSomFinalizado(ctx: AudioContext): void {
  try {
    bip(ctx, 740, 0.08, 0.065);
    window.setTimeout(() => bip(ctx, 990, 0.1, 0.05), 95);
  } catch (e) {
    if (import.meta.env.DEV) console.warn('[KDS_AUDIO] som finalizado falhou', e);
  }
}
