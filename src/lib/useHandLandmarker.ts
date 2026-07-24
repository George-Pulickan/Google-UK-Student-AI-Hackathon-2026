import { useEffect, useRef, useState } from 'react';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';

/**
 * Loads the MediaPipe hand landmarker once per page.
 * Both the wasm bundle and the .task model are served from /public, so the
 * app keeps working without reaching out to a CDN.
 */
export function useHandLandmarker() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const landmarkerRef = useRef<HandLandmarker | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const fileset = await FilesetResolver.forVisionTasks('/wasm');
        const landmarker = await HandLandmarker.createFromOptions(fileset, {
          baseOptions: {
            modelAssetPath: '/models/hand_landmarker.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numHands: 1,
          minHandDetectionConfidence: 0.5,
          minHandPresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });
        if (cancelled) {
          landmarker.close();
          return;
        }
        landmarkerRef.current = landmarker;
        setReady(true);
      } catch (err: any) {
        console.error('Hand landmarker failed to initialise:', err);
        if (!cancelled) setError(err?.message || 'Hand tracking unavailable');
      }
    })();

    return () => {
      cancelled = true;
      landmarkerRef.current?.close();
      landmarkerRef.current = null;
    };
  }, []);

  return { landmarkerRef, ready, error };
}
