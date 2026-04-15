
import { useCallback, useEffect, useState } from 'react';
function escolherVozPtBrFeminina(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  const pt = voices.filter((v) => {
    const lang = (v.lang || '').toLowerCase();
    return lang.startsWith('pt');
  });
  if (pt.length === 0) return null;

  const nomeFeminino = (name: string) =>
    /female|feminina|zira|maria|francisca|luciana|helo[ií]sa|fernanda|hort[eê]ncia|camila/i.test(
      name
    );

  const preferida = pt.find((v) => nomeFeminino(v.name));
  return preferida ?? pt[0] ?? null;
}

export interface UseVoiceGuidanceResult {
  falar: (texto: string) => void;
  muted: boolean;
  setMuted: (v: boolean) => void;
  toggleMute: () => void;
}

/**
 * Orientação por voz no totem (Web Speech API). Respeita `muted` para o fiscal silenciar o equipamento.
 */
export function useVoiceGuidance(): UseVoiceGuidanceResult {
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return undefined;
    const synth = window.speechSynthesis;
    const warm = () => {
      void synth.getVoices();
    };
    warm();
    synth.addEventListener('voiceschanged', warm);
    return () => synth.removeEventListener('voiceschanged', warm);
  }, []);

  const falar = useCallback(
    (texto: string) => {
      if (muted) return;
      if (typeof window === 'undefined' || !window.speechSynthesis) return;
      const t = texto.trim();
      if (!t) return;

      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(t);
      utter.lang = 'pt-BR';
      utter.rate = 0.98;
      utter.pitch = 1;

      const voz = escolherVozPtBrFeminina();
      if (voz) {
        utter.voice = voz;
      }

      window.speechSynthesis.speak(utter);
    },
    [muted]
  );

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      const next = !m;
      if (next && typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      return next;
    });
  }, []);

  return { falar, muted, setMuted, toggleMute };
}
