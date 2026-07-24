import { useCallback, useEffect, useRef, useState } from 'react';
import { ExpressionType } from '../types';

/** Prebuilt Gemini TTS voices that suit a friendly tutor. */
export const MASCOT_VOICES = [
  { id: 'Leda', label: 'Leda — youthful & warm' },
  { id: 'Puck', label: 'Puck — upbeat & playful' },
  { id: 'Zephyr', label: 'Zephyr — bright' },
  { id: 'Aoede', label: 'Aoede — breezy' },
  { id: 'Kore', label: 'Kore — steady & clear' },
  { id: 'Charon', label: 'Charon — deep & calm' },
];

const cache = new Map<string, string>();

/**
 * Speaks mascot dialogue with Gemini TTS.
 * Repeat lines are cached as object URLs so replays are instant and free.
 */
export function useMascotVoice(enabled: boolean, voiceName = 'Leda') {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  const stop = useCallback(() => {
    audioRef.current?.pause();
    if (audioRef.current) audioRef.current.currentTime = 0;
    setSpeaking(false);
  }, []);

  const speak = useCallback(
    async (text: string, expression: ExpressionType = 'HAPPY') => {
      if (!enabled || !text?.trim()) return;

      const id = ++requestId.current;
      const key = `${voiceName}|${expression}|${text}`;
      setError(null);

      try {
        let url = cache.get(key);
        if (!url) {
          const res = await fetch('/api/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, expression, voiceName }),
          });
          if (!res.ok) throw new Error(`TTS failed: ${res.status}`);
          url = URL.createObjectURL(await res.blob());
          cache.set(key, url);
        }

        // A newer line was requested while this one was synthesising.
        if (id !== requestId.current) return;

        stop();
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onended = () => setSpeaking(false);
        audio.onerror = () => setSpeaking(false);
        setSpeaking(true);
        await audio.play();
      } catch (err: any) {
        console.warn('Mascot voice unavailable:', err);
        if (id === requestId.current) {
          setError(err?.message || 'Voice unavailable');
          setSpeaking(false);
        }
      }
    },
    [enabled, voiceName, stop]
  );

  useEffect(() => stop, [stop]);

  return { speak, stop, speaking, error };
}
