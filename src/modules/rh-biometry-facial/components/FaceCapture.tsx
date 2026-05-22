import { useEffect, useRef, useState } from 'react';
import * as faceapi from '@vladmandic/face-api';
import { Camera, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';

const MODEL_URL = '/face-models';

/// Singleton: carrega os modelos só uma vez por sessão.
let modelsLoaded = false;
async function ensureModelsLoaded(): Promise<void> {
  if (modelsLoaded) return;
  await Promise.all([
    // SsdMobilenetv1 (~5.6MB) é mais robusto que TinyFaceDetector (~200KB) em
    // condições de luz medianas. Sprint 7.5 trocou pra ele depois do issue
    // "captura intermitente, nunca registra".
    faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
  ]);
  modelsLoaded = true;
}

export interface FaceCaptureProps {
  /// Quantas amostras precisam ser capturadas antes de chamar onComplete.
  /// Recomendado: 3 para enroll, 1 para verify.
  readonly capturesNeeded?: number;
  /// Score mínimo de detecção para aceitar uma amostra (0-1).
  readonly minScore?: number;
  /// Chamado quando todas as amostras foram capturadas.
  readonly onComplete: (descriptors: ReadonlyArray<Float32Array>) => void;
  /// Chamado em erro fatal (câmera negada, modelos não carregam etc.)
  readonly onError?: (err: Error) => void;
  /// Opcional: chamado a cada nova amostra capturada.
  readonly onProgress?: (current: number, total: number) => void;
}

type Phase = 'loading' | 'requesting-camera' | 'ready' | 'capturing' | 'complete' | 'error';

export function FaceCapture({
  capturesNeeded = 3,
  // Sprint 7.5: SsdMobilenetv1 entrega scores tipicamente 0.7-0.99 pra rostos
  // claros, então 0.5 é um threshold conservador.
  minScore = 0.5,
  onComplete,
  onError,
  onProgress,
}: FaceCaptureProps): JSX.Element {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const loopRef = useRef<number | null>(null);
  const capturesRef = useRef<Float32Array[]>([]);
  const lastCapturedAtRef = useRef<number>(0);

  const [phase, setPhase] = useState<Phase>('loading');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [progress, setProgress] = useState({ current: 0, total: capturesNeeded });
  const [liveScore, setLiveScore] = useState<number | null>(null);

  // Latest-ref pattern: callbacks/props lidas sempre via ref pra evitar que
  // closures stale invalidem o RAF quando o parent rerenderiza.
  const onCompleteRef = useRef(onComplete);
  const onErrorRef = useRef(onError);
  const onProgressRef = useRef(onProgress);
  const capturesNeededRef = useRef(capturesNeeded);
  const minScoreRef = useRef(minScore);
  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);
  useEffect(() => { onProgressRef.current = onProgress; }, [onProgress]);
  useEffect(() => { capturesNeededRef.current = capturesNeeded; }, [capturesNeeded]);
  useEffect(() => { minScoreRef.current = minScore; }, [minScore]);

  /// Bootstrap UNIQUE — roda só uma vez no mount. Setup + loop de detecção
  /// vivem aqui dentro, eliminando o ping-pong de RAF cancelado a cada render.
  useEffect(() => {
    let cancelled = false;
    let alreadyCompleted = false;
    let lastCapturedAt = 0;
    let heartbeat = 0;
    const captures: Float32Array[] = [];

    const stopStream = (): void => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };

    const tick = async (): Promise<void> => {
      if (cancelled || alreadyCompleted) return;
      const video = videoRef.current;
      if (!video || video.readyState !== 4) {
        loopRef.current = requestAnimationFrame(() => void tick());
        return;
      }
      try {
        const detection = await faceapi
          .detectSingleFace(video, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.2, maxResults: 1 }))
          .withFaceLandmarks()
          .withFaceDescriptor();

        if (cancelled || alreadyCompleted) return;

        const nowHb = Date.now();
        if (nowHb - heartbeat >= 1000) {
          heartbeat = nowHb;
          if (detection) {
            console.debug('[FaceCapture] heartbeat detection', {
              score: detection.detection.score.toFixed(3),
              threshold: minScoreRef.current,
            });
          } else {
            console.debug('[FaceCapture] heartbeat NO FACE', {
              videoWidth: video.videoWidth,
              videoHeight: video.videoHeight,
              readyState: video.readyState,
            });
          }
        }

        const canvas = canvasRef.current;
        if (canvas && video.videoWidth > 0) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            if (detection) {
              const box = detection.detection.box;
              ctx.strokeStyle = detection.detection.score >= minScoreRef.current ? '#22c55e' : '#f59e0b';
              ctx.lineWidth = 4;
              ctx.strokeRect(box.x, box.y, box.width, box.height);
            }
          }
        }

        if (detection) {
          setLiveScore(detection.detection.score);
          const now = Date.now();
          const needed = capturesNeededRef.current;
          const gapMs = needed === 1 ? 200 : 500;
          if (detection.detection.score >= minScoreRef.current && now - lastCapturedAt >= gapMs) {
            lastCapturedAt = now;
            captures.push(detection.descriptor);
            const cur = captures.length;
            setProgress({ current: cur, total: needed });
            onProgressRef.current?.(cur, needed);
            console.debug('[FaceCapture] sample acquired', {
              cur, total: needed, score: detection.detection.score.toFixed(3),
            });
            if (cur >= needed) {
              alreadyCompleted = true;
              setPhase('complete');
              stopStream();
              onCompleteRef.current(captures.slice());
              return;
            }
          }
        } else {
          setLiveScore(null);
        }
      } catch (err) {
        console.warn('[FaceCapture] detection error', err);
      }
      if (!cancelled && !alreadyCompleted) {
        loopRef.current = requestAnimationFrame(() => void tick());
      }
    };

    (async () => {
      try {
        setPhase('loading');
        await ensureModelsLoaded();
        if (cancelled) return;
        setPhase('requesting-camera');
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setPhase('ready');
        await new Promise((r) => setTimeout(r, 1500));
        if (cancelled) return;
        setPhase('capturing');
        loopRef.current = requestAnimationFrame(() => void tick());
      } catch (err) {
        const e = err instanceof Error ? err : new Error('Falha ao iniciar a câmera.');
        setErrorMsg(e.message);
        setPhase('error');
        onErrorRef.current?.(e);
      }
    })();

    return () => {
      cancelled = true;
      if (loopRef.current !== null) {
        cancelAnimationFrame(loopRef.current);
        loopRef.current = null;
      }
      stopStream();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only por design
  }, []);

  return (
    <div className="space-y-3">
      <div className="relative mx-auto w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-slate-950/40">
        <video
          ref={videoRef}
          className="block w-full"
          playsInline
          muted
          autoPlay
        />
        <canvas
          ref={canvasRef}
          className="pointer-events-none absolute inset-0 h-full w-full"
        />
        {phase !== 'ready' && phase !== 'capturing' && phase !== 'complete' ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70 text-sm text-white">
            {phase === 'loading' || phase === 'requesting-camera' ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                {phase === 'loading' ? 'Carregando modelos…' : 'Liberando a câmera…'}
              </span>
            ) : phase === 'error' ? (
              <span className="inline-flex items-center gap-2 text-rose-300">
                <AlertTriangle className="h-5 w-5" />
                {errorMsg}
              </span>
            ) : null}
          </div>
        ) : null}
        {phase === 'complete' ? (
          <div className="absolute inset-0 flex items-center justify-center bg-emerald-950/80 text-emerald-100">
            <span className="inline-flex items-center gap-2 text-base">
              <CheckCircle2 className="h-6 w-6" />
              {capturesNeeded} captura{capturesNeeded > 1 ? 's' : ''} concluída{capturesNeeded > 1 ? 's' : ''}
            </span>
          </div>
        ) : null}
      </div>
      <div className="flex items-center justify-between text-xs text-slate-300">
        <span className="inline-flex items-center gap-2">
          <Camera className="h-4 w-4" />
          {phase === 'capturing'
            ? `Capturando ${progress.current}/${progress.total}…`
            : phase === 'complete'
              ? 'Pronto.'
              : phase === 'ready'
                ? 'Posicione o rosto no centro e aguarde.'
                : phase === 'error'
                  ? 'Erro'
                  : 'Inicializando…'}
        </span>
        {liveScore !== null ? (
          <span className="font-mono text-[10px] text-slate-400">
            score {(liveScore * 100).toFixed(0)}%
          </span>
        ) : null}
      </div>
      {phase === 'capturing' ? (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
          <div
            className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all"
            style={{ width: `${(progress.current / progress.total) * 100}%` }}
          />
        </div>
      ) : null}
    </div>
  );
}

/// Helper: serializa Float32Array (128 floats = 512 bytes) para base64.
export function descriptorToBase64(descriptor: Float32Array): string {
  const bytes = new Uint8Array(descriptor.buffer, descriptor.byteOffset, descriptor.byteLength);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

export function base64ToDescriptor(b64: string): Float32Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Float32Array(bytes.buffer);
}

/// Distância euclidiana entre dois descriptors (face-api convenção).
/// < 0.6 = match típico; < 0.5 = match forte; > 0.6 = pessoas diferentes.
export function faceDistance(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length) return Infinity;
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    sum += d * d;
  }
  return Math.sqrt(sum);
}

/// Média de múltiplos descriptors. Usada no enroll para criar um descriptor
/// "consolidado" mais robusto a variações de luz/expressão.
export function averageDescriptors(descriptors: ReadonlyArray<Float32Array>): Float32Array {
  if (descriptors.length === 0) throw new Error('Nenhum descriptor para média.');
  const len = descriptors[0].length;
  const out = new Float32Array(len);
  for (const d of descriptors) {
    for (let i = 0; i < len; i++) out[i] += d[i];
  }
  for (let i = 0; i < len; i++) out[i] /= descriptors.length;
  return out;
}
