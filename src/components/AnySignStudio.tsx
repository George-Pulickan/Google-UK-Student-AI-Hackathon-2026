import React, { useRef, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AnySignResult, MascotConfig, SignLanguageSystem, HandLandmark } from '../types';
import { useHandLandmarker } from '../lib/useHandLandmarker';
import { useMascotVoice } from '../lib/useMascotVoice';
import { drawHandSkeleton } from '../lib/handSkeleton';
import { A2UIRenderer } from './A2UIRenderer';
import { MascotAvatar } from './MascotAvatar';
import {
  Camera,
  Wand2,
  VideoOff,
  Volume2,
  Sparkles,
  Send,
  Layers,
  RotateCcw,
} from 'lucide-react';

interface AnySignStudioProps {
  mascotConfig: MascotConfig;
  signSystem: SignLanguageSystem;
  voiceEnabled: boolean;
}

/**
 * Free-form sign identification.
 *
 * Unlike the guided studio, nothing here is scored against a curriculum
 * target — Gemini names whatever it sees and, crucially, decides how the
 * answer should be laid out by returning a typed component list that
 * <A2UIRenderer> paints. The panel below is therefore whatever the model
 * decided the answer needed, not a fixed template.
 */
export const AnySignStudio: React.FC<AnySignStudioProps> = ({
  mascotConfig,
  signSystem,
  voiceEnabled,
}) => {
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnySignResult | null>(null);
  const [snapshot, setSnapshot] = useState<string | null>(null);
  const [question, setQuestion] = useState('');
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayRef = useRef<HTMLCanvasElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastVideoTimeRef = useRef(-1);
  const liveLandmarksRef = useRef<HandLandmark[] | null>(null);

  const { landmarkerRef, ready: trackingReady } = useHandLandmarker();
  const { speak, speaking } = useMascotVoice(voiceEnabled, mascotConfig.voiceName || 'Leda');

  // See CameraPracticeStudio: guards against the StrictMode double-mount race.
  const cameraStartingRef = useRef(false);

  const startCamera = useCallback(async () => {
    if (cameraStartingRef.current) return;
    cameraStartingRef.current = true;
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
      });
      const video = videoRef.current;
      if (!video) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      video.srcObject = stream;
      await video.play().catch(() => {});
      setIsCameraActive(true);
    } catch {
      setCameraError('Unable to access the webcam.');
      setIsCameraActive(false);
    } finally {
      cameraStartingRef.current = false;
    }
  }, []);

  useEffect(() => {
    startCamera();
    return () => {
      const stream = videoRef.current?.srcObject as MediaStream | null;
      stream?.getTracks().forEach((t) => t.stop());
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Live skeleton overlay (no auto-capture here — this mode is deliberate).
  useEffect(() => {
    if (!trackingReady) return;

    const tick = () => {
      rafRef.current = requestAnimationFrame(tick);
      const video = videoRef.current;
      const overlay = overlayRef.current;
      const stage = stageRef.current;
      const landmarker = landmarkerRef.current;
      if (!video || !overlay || !stage || !landmarker) return;
      if (video.readyState < 2 || !video.videoWidth) return;

      const rect = stage.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const cw = Math.round(rect.width);
      const ch = Math.round(rect.height);
      if (overlay.width !== cw * dpr || overlay.height !== ch * dpr) {
        overlay.width = cw * dpr;
        overlay.height = ch * dpr;
      }
      const ctx = overlay.getContext('2d');
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cw, ch);

      if (video.currentTime !== lastVideoTimeRef.current) {
        lastVideoTimeRef.current = video.currentTime;
        try {
          const res = landmarker.detectForVideo(video, performance.now());
          liveLandmarksRef.current = (res.landmarks?.[0] as HandLandmark[]) ?? null;
        } catch {
          liveLandmarksRef.current = null;
        }
      }

      const hand = liveLandmarksRef.current;
      if (hand) {
        const scale = Math.max(cw / video.videoWidth, ch / video.videoHeight);
        const dw = video.videoWidth * scale;
        const dh = video.videoHeight * scale;
        ctx.save();
        ctx.translate((cw - dw) / 2, (ch - dh) / 2);
        drawHandSkeleton(ctx, hand, dw, dh, { mirrored: true, scale: Math.max(0.75, cw / 640), opacity: 0.85 });
        ctx.restore();
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackingReady]);

  const identify = useCallback(async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !isCameraActive) {
      setError('Turn the camera on first.');
      return;
    }

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageBase64 = canvas.toDataURL('image/jpeg', 0.85);

    setSnapshot(imageBase64);
    setIsAnalyzing(true);
    setResult(null);
    setError(null);

    try {
      const res = await fetch('/api/any-sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64,
          signSystem,
          question: question.trim() || undefined,
          mascotName: mascotConfig.name,
        }),
      });
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const data: AnySignResult = await res.json();
      setResult(data);
      if (data.spoken_summary) speak(data.spoken_summary, 'SHOWING_CORRECT_SIGN');
    } catch (err: any) {
      setError(err?.message || 'Could not identify the sign.');
    } finally {
      setIsAnalyzing(false);
    }
  }, [isCameraActive, signSystem, question, mascotConfig.name, speak]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <canvas ref={canvasRef} className="hidden" />

      {/* Camera side */}
      <div className="lg:col-span-7 flex flex-col gap-4">
        <div className="bg-gradient-to-r from-violet-600 to-indigo-600 rounded-3xl p-5 text-white shadow-lg shadow-violet-200 dark:shadow-none">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-2xl bg-white/20 backdrop-blur-sm shrink-0">
              <Wand2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-black text-lg tracking-tight">Any Sign</h2>
              <p className="text-xs text-white/80 leading-relaxed mt-0.5">
                Make <em>any</em> {signSystem} sign — letter, number, word or phrase. Gemini identifies it and
                builds the explanation panel itself, choosing which blocks to show.
              </p>
            </div>
          </div>
        </div>

        <div
          ref={stageRef}
          className="relative aspect-4/3 w-full bg-slate-900 rounded-3xl border-4 border-white dark:border-slate-800 shadow-2xl overflow-hidden flex items-center justify-center"
        >
          <video
            ref={videoRef}
            playsInline
            muted
            className={`absolute inset-0 w-full h-full object-cover transform -scale-x-100 ${
              isCameraActive ? 'block' : 'hidden'
            }`}
          />
          <canvas ref={overlayRef} className="absolute inset-0 w-full h-full pointer-events-none z-10" />

          <div className="absolute top-5 left-5 px-3.5 py-1.5 bg-black/40 backdrop-blur-md rounded-full border border-white/20 flex items-center gap-2 z-20 pointer-events-none">
            <div className={`w-2 h-2 rounded-full ${isCameraActive ? 'bg-red-500 animate-pulse' : 'bg-slate-400'}`} />
            <span className="text-white text-[10px] font-extrabold tracking-widest uppercase">
              {isCameraActive ? 'LIVE' : 'OFF'}
            </span>
          </div>

          {!isCameraActive && (
            <div className="text-center p-6 text-slate-400 z-20">
              <VideoOff className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p className="text-xs max-w-xs mx-auto mb-4">{cameraError || 'Camera is off.'}</p>
              <button
                onClick={startCamera}
                className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-colors cursor-pointer"
              >
                Turn On Camera
              </button>
            </div>
          )}

          {isAnalyzing && (
            <div className="absolute inset-0 bg-violet-950/50 backdrop-blur-[1px] flex flex-col items-center justify-center z-30">
              <div className="w-10 h-10 border-3 border-white/25 border-t-white rounded-full animate-spin" />
              <p className="mt-4 text-white text-xs font-black uppercase tracking-[0.25em]">Identifying…</p>
            </div>
          )}
        </div>

        {/* Ask + identify */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !isAnalyzing && identify()}
              placeholder="Optional: ask something, e.g. “is my thumb right?”"
              className="flex-1 px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700
                         rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100 placeholder:text-slate-400
                         focus:outline-none focus:border-violet-500"
            />
            <button
              onClick={identify}
              disabled={isAnalyzing || !isCameraActive}
              className="px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-black text-xs
                         shadow-md transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer shrink-0"
            >
              {isAnalyzing ? <Sparkles className="w-4 h-4 animate-pulse" /> : <Camera className="w-4 h-4" />}
              <span>{isAnalyzing ? 'Reading…' : 'Identify Sign'}</span>
            </button>
          </div>

          {error && (
            <p className="text-[11px] font-bold text-rose-600 dark:text-rose-400">{error}</p>
          )}
        </div>
      </div>

      {/* Result side */}
      <div className="lg:col-span-5 flex flex-col gap-4">
        {/* Coach */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm flex items-center gap-3">
          <MascotAvatar config={mascotConfig} expression={result ? 'SHOWING_CORRECT_SIGN' : 'HAPPY'} size={56} speaking={speaking} />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
              {mascotConfig.name || 'Buddy'}
            </p>
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 leading-snug">
              {result?.spoken_summary || 'Show me any sign and I’ll tell you what it is!'}
            </p>
          </div>
          {result?.spoken_summary && voiceEnabled && (
            <button
              onClick={() => speak(result.spoken_summary, 'SHOWING_CORRECT_SIGN')}
              className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-100 transition-colors cursor-pointer shrink-0"
              title="Hear it again"
            >
              <Volume2 className={`w-4 h-4 ${speaking ? 'animate-pulse' : ''}`} />
            </button>
          )}
        </div>

        {/* Snapshot */}
        {snapshot && (
          <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm">
            <img src={snapshot} alt="Captured sign" className="w-full object-cover" />
            <button
              onClick={() => {
                setSnapshot(null);
                setResult(null);
              }}
              className="absolute top-2 right-2 p-1.5 rounded-lg bg-slate-900/70 text-white backdrop-blur-sm hover:bg-slate-900 transition-colors cursor-pointer"
              title="Clear"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Model-authored UI */}
        <AnimatePresence mode="wait">
          {result ? (
            <motion.div
              key={result.timestamp || 'result'}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="bg-slate-50 dark:bg-slate-900/60 rounded-3xl border border-slate-200 dark:border-slate-700 p-5 space-y-3"
            >
              <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-violet-500 dark:text-violet-400 pb-1">
                <Layers className="w-3 h-3" />
                Rendered from {result.components.length} model-authored blocks
              </div>
              <A2UIRenderer components={result.components} />
            </motion.div>
          ) : (
            !isAnalyzing && (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="bg-slate-50 dark:bg-slate-900/60 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700 p-8 text-center"
              >
                <Send className="w-8 h-8 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  No sign read yet
                </p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 max-w-[220px] mx-auto leading-relaxed">
                  Hold up a sign and hit <strong>Identify Sign</strong>. The layout you get back is chosen by
                  the model.
                </p>
              </motion.div>
            )
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
