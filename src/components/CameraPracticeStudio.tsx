import React, { useRef, useState, useEffect, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'motion/react';
import {
  SignTarget,
  SignEvaluationResult,
  MascotConfig,
  SignLanguageSystem,
  TrackedHand,
} from '../types';
import { getSignTargets } from '../data/signsData';
import { SignBuddyMascot } from './SignBuddyMascot';
import { HandShapeGuide } from './HandShapeGuide';
import { TargetSignCue } from './TargetSignCue';
import { useHandLandmarker } from '../lib/useHandLandmarker';
import { openCameraStream, waitForVideoElement } from '../lib/camera';
import { useMascotVoice, spokenVerdict } from '../lib/useMascotVoice';
import {
  drawHandSkeleton,
  handsBounds,
  handsMotion,
  readHands,
  HAND_HUES,
  LANDMARK_LABELS,
} from '../lib/handSkeleton';
import {
  Camera,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  XCircle,
  Upload,
  VideoOff,
  ChevronRight,
  AlertTriangle,
  Lightbulb,
  Volume2,
  VolumeX,
  Scan,
  Hand as HandIcon,
} from 'lucide-react';

interface CameraPracticeStudioProps {
  initialSign?: SignTarget;
  mascotConfig: MascotConfig;
  signSystem: SignLanguageSystem;
  voiceEnabled: boolean;
  onToggleVoice: () => void;
  onEvaluationComplete: (sign: SignTarget, result: SignEvaluationResult) => void;
}

/**
 * Alignment target, as a fraction of the video stage. The dashed guide box and
 * the "is the hand in position" test are both driven from these numbers so
 * they can never drift apart.
 */
const ALIGN_BOX = { x: 0.29, y: 0.11, w: 0.42, h: 0.78 };

/** Mean landmark travel per frame below which the hand counts as held still. */
const STILL_THRESHOLD = 0.012;
/** Travel above which an in-flight countdown is abandoned. */
const BREAK_THRESHOLD = 0.045;
/** Consecutive still frames required before auto-capture arms. */
const STILL_FRAMES_REQUIRED = 12;
/** Quiet period after an evaluation before auto-capture can retrigger. */
const COOLDOWN_MS = 4000;

export const CameraPracticeStudio: React.FC<CameraPracticeStudioProps> = ({
  initialSign,
  mascotConfig,
  signSystem,
  voiceEnabled,
  onToggleVoice,
  onEvaluationComplete,
}) => {
  const availableSigns = getSignTargets(signSystem);
  const [currentTarget, setCurrentTarget] = useState<SignTarget>(
    initialSign && initialSign.system === signSystem ? initialSign : availableSigns[0]
  );
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState<SignEvaluationResult | null>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);

  // Hand tracking / auto-capture
  const [autoCapture, setAutoCapture] = useState(true);
  const [handCount, setHandCount] = useState(0);
  const [handInBox, setHandInBox] = useState(false);
  const [handSteady, setHandSteady] = useState(false);
  const [reviewImage, setReviewImage] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayRef = useRef<HTMLCanvasElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);

  const { landmarkerRef, ready: trackingReady, error: trackingError } = useHandLandmarker();
  const { speak, stop: stopSpeech, speaking } = useMascotVoice(voiceEnabled, mascotConfig.voiceName || 'Leda');

  // rAF-loop scratch state — kept in refs so the loop never reads stale props.
  const rafRef = useRef<number | null>(null);
  const lastVideoTimeRef = useRef(-1);
  const liveHandsRef = useRef<TrackedHand[]>([]);
  const prevHandsRef = useRef<TrackedHand[]>([]);
  const stillFramesRef = useRef(0);
  const cooldownUntilRef = useRef(0);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /**
   * Single source of truth for "is the auto-capture pipeline busy".
   * React state lags a render behind the rAF loop, which previously let the
   * loop re-arm a countdown in the gap between one finishing and evaluation
   * starting. This ref flips synchronously, so there is no gap.
   */
  const phaseRef = useRef<'idle' | 'counting' | 'evaluating'>('idle');

  const loopStateRef = useRef({ autoCapture: true, hasUpload: false });
  useEffect(() => {
    loopStateRef.current = { autoCapture, hasUpload: uploadedImage !== null };
  }, [autoCapture, uploadedImage]);

  /* ---------------------------------------------------------------- *
   * Camera lifecycle
   * ---------------------------------------------------------------- */
  // StrictMode mounts effects twice in dev; without this guard the second
  // getUserMedia aborts the first play() and logs a spurious error.
  const cameraStartingRef = useRef(false);

  const startCamera = useCallback(async () => {
    if (cameraStartingRef.current) return;
    cameraStartingRef.current = true;
    setCameraError(null);
    try {
      const stream = await openCameraStream();
      const video = await waitForVideoElement(() => videoRef.current);
      if (!video) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      video.srcObject = stream;
      await video.play().catch(() => {});
      setIsCameraActive(true);
    } catch (err: any) {
      console.warn('Camera access error:', err);
      setCameraError('Unable to access webcam. You can upload an image or frame below.');
      setIsCameraActive(false);
    } finally {
      cameraStartingRef.current = false;
    }
  }, []);

  const stopCamera = useCallback(() => {
    const stream = videoRef.current?.srcObject as MediaStream | null;
    stream?.getTracks().forEach((track) => track.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
    setIsCameraActive(false);
  }, []);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------------------------------------------------------------- *
   * Sign selection sync
   * ---------------------------------------------------------------- */
  useEffect(() => {
    const signs = getSignTargets(signSystem);
    if (!signs.find((s) => s.id === currentTarget.id)) {
      setCurrentTarget(signs[0]);
      setCurrentStepIndex(0);
      setEvaluationResult(null);
      setReviewImage(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signSystem]);

  useEffect(() => {
    if (initialSign) {
      setCurrentTarget(initialSign);
      setCurrentStepIndex(0);
      setEvaluationResult(null);
      setReviewImage(null);
    }
  }, [initialSign]);

  /* ---------------------------------------------------------------- *
   * Frame geometry
   * The video is rendered with object-cover, so the visible region is a
   * centre crop. Landmarks are normalised against the full sensor frame,
   * so the overlay has to reproduce that same crop to stay registered.
   * ---------------------------------------------------------------- */
  const coverTransform = (video: HTMLVideoElement, cw: number, ch: number) => {
    const scale = Math.max(cw / video.videoWidth, ch / video.videoHeight);
    const dw = video.videoWidth * scale;
    const dh = video.videoHeight * scale;
    return { dw, dh, ox: (cw - dw) / 2, oy: (ch - dh) / 2 };
  };

  /* ---------------------------------------------------------------- *
   * Detection + skeleton render loop
   * ---------------------------------------------------------------- */
  useEffect(() => {
    if (!trackingReady) return;

    const tick = () => {
      rafRef.current = requestAnimationFrame(tick);

      const video = videoRef.current;
      const overlay = overlayRef.current;
      const landmarker = landmarkerRef.current;
      const stage = stageRef.current;
      if (!video || !overlay || !landmarker || !stage) return;
      if (video.readyState < 2 || !video.videoWidth) return;

      // Keep the overlay bitmap matched to its CSS box.
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

      // Only run inference on genuinely new frames.
      if (video.currentTime !== lastVideoTimeRef.current) {
        lastVideoTimeRef.current = video.currentTime;
        let hands: TrackedHand[] = [];
        try {
          hands = readHands(landmarker.detectForVideo(video, performance.now()));
        } catch {
          hands = [];
        }

        prevHandsRef.current = liveHandsRef.current;
        liveHandsRef.current = hands;

        if (hands.length) {
          const travel = handsMotion(prevHandsRef.current, hands);
          if (travel < STILL_THRESHOLD) stillFramesRef.current += 1;
          else stillFramesRef.current = 0;

          // Abort a running countdown if the hand bolts.
          if (phaseRef.current === 'counting' && travel > BREAK_THRESHOLD) {
            abortCountdown();
          }
        } else {
          stillFramesRef.current = 0;
          if (phaseRef.current === 'counting') abortCountdown();
        }
      }

      const hands = liveHandsRef.current;
      const { dw, dh, ox, oy } = coverTransform(video, cw, ch);

      let inBox = false;
      if (hands.length) {
        const bounds = handsBounds(hands);
        // Mirror to display space, then map through the cover crop.
        const displayX = (ox + (1 - bounds.centerX) * dw) / cw;
        const displayY = (oy + bounds.centerY * dh) / ch;
        inBox =
          displayX > ALIGN_BOX.x &&
          displayX < ALIGN_BOX.x + ALIGN_BOX.w &&
          displayY > ALIGN_BOX.y &&
          displayY < ALIGN_BOX.y + ALIGN_BOX.h;

        ctx.save();
        ctx.translate(ox, oy);
        hands.forEach((hand, i) => {
          drawHandSkeleton(ctx, hand.landmarks, dw, dh, {
            mirrored: true,
            hue: HAND_HUES[i % HAND_HUES.length],
            scale: Math.max(0.75, cw / 640),
            opacity: phaseRef.current === 'counting' ? 0.95 : 0.85,
          });
        });
        ctx.restore();
      }

      const steady = hands.length > 0 && stillFramesRef.current >= STILL_FRAMES_REQUIRED;
      setHandCount((v) => (v !== hands.length ? hands.length : v));
      setHandInBox((v) => (v !== inBox ? inBox : v));
      setHandSteady((v) => (v !== steady ? steady : v));

      // Arm the auto-capture countdown.
      const s = loopStateRef.current;
      if (
        s.autoCapture &&
        !s.hasUpload &&
        phaseRef.current === 'idle' &&
        hands.length > 0 &&
        inBox &&
        steady &&
        performance.now() > cooldownUntilRef.current
      ) {
        beginCountdown();
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackingReady]);

  /* ---------------------------------------------------------------- *
   * Countdown
   * ---------------------------------------------------------------- */
  const abortCountdown = useCallback(() => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    setCountdown(null);
    stillFramesRef.current = 0;
    if (phaseRef.current === 'counting') phaseRef.current = 'idle';
  }, []);

  /**
   * Always points at the current captureAndEvaluate.
   *
   * This is the fix for the countdown that looped forever: beginCountdown is
   * created once, so it used to close over the very first captureAndEvaluate,
   * which had captured isCameraActive === false from the initial render. That
   * stale copy bailed out before taking a picture and before setting the
   * cooldown, so the loop saw a steady hand and immediately restarted at 3.
   */
  const captureRef = useRef<() => void>(() => {});

  const beginCountdown = useCallback(() => {
    if (countdownTimerRef.current || phaseRef.current !== 'idle') return;

    phaseRef.current = 'counting';
    let remaining = 3;
    setCountdown(remaining);

    countdownTimerRef.current = setInterval(() => {
      remaining -= 1;
      if (remaining > 0) {
        setCountdown(remaining);
        return;
      }

      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
      setCountdown(null);
      // Fire the capture outside the state updater — React may invoke an
      // updater twice, which would double-submit the frame.
      captureRef.current();
    }, 1000);
  }, []);

  /* ---------------------------------------------------------------- *
   * Capture, evaluate, annotate
   * ---------------------------------------------------------------- */

  /** Paints the captured still with every skeleton, flagged joints in red. */
  const buildReviewImage = useCallback(
    (source: HTMLCanvasElement, hands: TrackedHand[], wrongPerHand: number[][]) => {
      if (!hands.length) return null;
      const w = source.width;
      const h = source.height;
      const out = document.createElement('canvas');
      out.width = w;
      out.height = h;
      const ctx = out.getContext('2d');
      if (!ctx) return null;

      ctx.drawImage(source, 0, 0, w, h);
      // Darken slightly so the armature reads against a bright room.
      ctx.fillStyle = 'rgba(2, 6, 23, 0.35)';
      ctx.fillRect(0, 0, w, h);

      hands.forEach((hand, i) => {
        drawHandSkeleton(ctx, hand.landmarks, w, h, {
          mirrored: false,
          wrong: wrongPerHand[i] ?? [],
          markCorrect: true,
          scale: Math.max(1, w / 640),
        });
      });
      return out.toDataURL('image/jpeg', 0.9);
    },
    []
  );

  const captureAndEvaluate = useCallback(async () => {
    // Claim the pipeline up-front so the rAF loop cannot re-arm underneath us,
    // and guarantee a cooldown on every exit path — including the early ones.
    phaseRef.current = 'evaluating';
    const release = () => {
      stillFramesRef.current = 0;
      cooldownUntilRef.current = performance.now() + COOLDOWN_MS;
      phaseRef.current = 'idle';
    };

    let imageBase64: string | null = null;
    let sourceCanvas: HTMLCanvasElement | null = null;
    const hands = liveHandsRef.current.map((h) => ({ ...h, landmarks: [...h.landmarks] }));

    if (uploadedImage) {
      imageBase64 = uploadedImage;
    } else if (videoRef.current?.srcObject && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // True (un-mirrored) sensor frame, so handedness reaches Gemini intact.
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        imageBase64 = canvas.toDataURL('image/jpeg', 0.85);
        sourceCanvas = canvas;
      }
    }

    if (!imageBase64) {
      setCameraError('Turn on the camera or upload an image frame first.');
      release();
      return;
    }

    setIsEvaluating(true);
    setEvaluationResult(null);
    setReviewImage(null);
    stopSpeech();

    try {
      const response = await fetch('/api/evaluate-sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64,
          targetSign: currentTarget,
          mascotName: mascotConfig.name,
          signSystem,
          hands: hands.map((h) => ({ handedness: h.handedness, landmarks: h.landmarks })),
        }),
      });

      if (!response.ok) throw new Error(`Evaluation server error: ${response.statusText}`);

      const data: SignEvaluationResult = await response.json();
      setEvaluationResult(data);

      if (sourceCanvas && hands.length) {
        setReviewImage(
          buildReviewImage(sourceCanvas, hands, [
            data.incorrect_landmarks ?? [],
            data.incorrect_landmarks_hand2 ?? [],
          ])
        );
      }

      // Always say something about the outcome, right or wrong.
      speak(spokenVerdict(data), data.avatar_reaction?.expression);

      if (data.is_correct) {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#6366F1', '#EC4899', '#10B981', '#F59E0B'],
        });

        if (currentTarget.steps && currentStepIndex < currentTarget.steps.length - 1) {
          setTimeout(() => setCurrentStepIndex((prev) => prev + 1), 800);
        }
      }

      onEvaluationComplete(currentTarget, data);
    } catch (err: any) {
      console.error('Error evaluating sign:', err);
      const fallback: SignEvaluationResult = {
        is_correct: false,
        accuracy_score: 55,
        feedback_tip: 'Make sure your hand is in clear focus with good lighting!',
        detected_gesture: 'Unrecognized gesture',
        positioning_advice: 'Hold your hand steadily in the center frame.',
        incorrect_landmarks: [],
        avatar_reaction: {
          expression: 'CONFUSED',
          animation_trigger: 'idle_confused',
          dialogue_bubble: `Oops! Let's try again. Position your hand right in front of the camera!`,
        },
      };
      setEvaluationResult(fallback);
      speak(spokenVerdict(fallback), 'CONFUSED');
    } finally {
      setIsEvaluating(false);
      release();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploadedImage, currentTarget, mascotConfig.name, signSystem, currentStepIndex, speak, stopSpeech]);

  // Keep the countdown's escape hatch pointing at the live capture function.
  useEffect(() => {
    captureRef.current = captureAndEvaluate;
  }, [captureAndEvaluate]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedImage(reader.result as string);
        setEvaluationResult(null);
        setReviewImage(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const jumpToLetter = (letter: string) => {
    const id = signSystem === 'BSL' ? `BSL_${letter}` : letter;
    const found = availableSigns.find((s) => s.id === id);
    if (found) {
      setCurrentTarget(found);
      setCurrentStepIndex(0);
      setEvaluationResult(null);
      setReviewImage(null);
    }
  };

  const stepsList = currentTarget.steps || [currentTarget.description];
  const wrongJoints = [
    ...(evaluationResult?.incorrect_landmarks ?? []),
    ...(evaluationResult?.incorrect_landmarks_hand2 ?? []),
  ];

  // Human-readable summary of which joints Gemini flagged.
  const wrongJointNames = Array.from(
    new Set(
      [
        ...(evaluationResult?.incorrect_landmarks ?? []),
        ...(evaluationResult?.incorrect_landmarks_hand2 ?? []),
      ]
        .map((i) => LANDMARK_LABELS[i])
        .filter(Boolean)
    )
  );

  const trackingStatus = !trackingReady
    ? { label: 'Loading hand model…', tone: 'bg-slate-500' }
    : handCount === 0
    ? { label: 'No hand detected', tone: 'bg-slate-500' }
    : !handInBox
    ? { label: 'Move hand into the box', tone: 'bg-amber-500' }
    : !handSteady
    ? { label: 'Hold still…', tone: 'bg-sky-500' }
    : { label: `Locked on · ${handCount} hand${handCount > 1 ? 's' : ''}`, tone: 'bg-emerald-500' };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <canvas ref={canvasRef} className="hidden" />

      {/* Left column */}
      <div className="lg:col-span-8 flex flex-col gap-5">
        {/* Step-by-step instructions */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-100 dark:border-slate-700/60">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-indigo-600 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-sm">
                {currentTarget.id.length <= 3 ? currentTarget.id : currentTarget.id.charAt(0)}
              </span>
              <div>
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">
                  Step-by-Step Instructions • {signSystem}
                </span>
                <h3 className="text-base font-black text-slate-900 dark:text-slate-100">
                  {currentTarget.label}
                </h3>
              </div>
            </div>

            <select
              value={currentTarget.id}
              onChange={(e) => {
                const found = availableSigns.find((s) => s.id === e.target.value);
                if (found) {
                  setCurrentTarget(found);
                  setCurrentStepIndex(0);
                  setEvaluationResult(null);
                  setReviewImage(null);
                }
              }}
              className="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              {availableSigns.map((sign) => (
                <option key={sign.id} value={sign.id}>
                  {sign.label} ({sign.category})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {stepsList.map((_, idx) => {
              const isCurrent = currentStepIndex === idx;
              const isPast = currentStepIndex > idx;
              return (
                <button
                  key={idx}
                  onClick={() => setCurrentStepIndex(idx)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                    isCurrent
                      ? 'bg-indigo-600 text-white shadow-md ring-2 ring-indigo-400 ring-offset-1 dark:ring-offset-slate-800'
                      : isPast
                      ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                      : 'bg-slate-100 dark:bg-slate-700/60 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  <span className="text-[10px] uppercase font-black">Step {idx + 1}</span>
                  {isPast && <CheckCircle2 className="w-3.5 h-3.5" />}
                </button>
              );
            })}
          </div>

          <div className="relative min-h-[50px] bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700 overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStepIndex}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
                className="flex items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                    {currentStepIndex + 1}
                  </div>
                  <p className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 leading-relaxed">
                    {stepsList[currentStepIndex]}
                  </p>
                </div>

                {currentStepIndex < stepsList.length - 1 && (
                  <button
                    onClick={() => setCurrentStepIndex((prev) => prev + 1)}
                    className="p-2 rounded-xl bg-indigo-50 dark:bg-slate-800 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-slate-700 transition-colors text-xs font-bold shrink-0 flex items-center gap-1 cursor-pointer"
                  >
                    <span>Next Step</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Action bar */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {/* Auto-detect toggle */}
            <button
              onClick={() => {
                setAutoCapture((v) => !v);
                abortCountdown();
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border ${
                autoCapture
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                  : 'bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
              }`}
              title="Automatically re-analyse when your hand settles in the box"
            >
              <Scan className={`w-4 h-4 ${autoCapture ? 'animate-pulse' : ''}`} />
              <span className="hidden sm:inline">Auto-Detect {autoCapture ? 'On' : 'Off'}</span>
            </button>

            {/* Voice toggle */}
            <button
              onClick={onToggleVoice}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border ${
                voiceEnabled
                  ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800'
                  : 'bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
              }`}
              title="Gemini text-to-speech coaching voice"
            >
              {voiceEnabled ? (
                <Volume2 className={`w-4 h-4 ${speaking ? 'animate-pulse' : ''}`} />
              ) : (
                <VolumeX className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">Voice {voiceEnabled ? 'On' : 'Off'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={beginCountdown}
              disabled={isEvaluating || countdown !== null}
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-xs shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              title="3 second timer snap"
            >
              <Sparkles className="w-4 h-4" />
              <span>3s Timer</span>
            </button>

            <button
              onClick={captureAndEvaluate}
              disabled={isEvaluating || countdown !== null}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs shadow-md shadow-indigo-200 dark:shadow-none transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              <span>{isEvaluating ? 'Analyzing...' : 'Take Picture & Check'}</span>
            </button>

            <label
              className="p-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl font-bold cursor-pointer transition-colors"
              title="Upload image frame"
            >
              <Upload className="w-4 h-4" />
              <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>
        </div>

        {/* Video stage */}
        <div
          ref={stageRef}
          className="relative aspect-4/3 w-full bg-slate-900 rounded-3xl border-4 border-white dark:border-slate-800 shadow-2xl overflow-hidden flex items-center justify-center"
        >
          {/* Live badge */}
          <div className="absolute top-5 left-5 px-3.5 py-1.5 bg-black/40 backdrop-blur-md rounded-full border border-white/20 flex items-center gap-2 pointer-events-none z-20">
            <div className={`w-2 h-2 rounded-full ${isCameraActive ? 'bg-red-500 animate-pulse' : 'bg-slate-400'}`} />
            <span className="text-white text-[10px] font-extrabold tracking-widest uppercase">
              {isCameraActive ? 'LIVE CAMERA' : 'FRAME MODE'}
            </span>
          </div>

          {/* Tracking status */}
          <div className="absolute top-5 right-5 px-3 py-1.5 bg-black/50 backdrop-blur-md rounded-full border border-white/20 flex items-center gap-2 pointer-events-none z-20">
            <span className={`w-2 h-2 rounded-full ${trackingStatus.tone}`} />
            <span className="text-white text-[10px] font-black uppercase tracking-wider">
              {trackingStatus.label}
            </span>
          </div>

          {/* Webcam feed */}
          <video
            ref={videoRef}
            playsInline
            muted
            className={`absolute inset-0 w-full h-full object-cover transform -scale-x-100 transition-[filter] duration-300 ${
              countdown !== null ? 'grayscale brightness-50' : ''
            } ${isCameraActive && !uploadedImage ? 'block' : 'hidden'}`}
          />

          {/* Uploaded frame */}
          {uploadedImage && (
            <img src={uploadedImage} alt="Uploaded hand sign" className="absolute inset-0 w-full h-full object-contain" />
          )}

          {/* Skeleton overlay */}
          <canvas
            ref={overlayRef}
            className={`absolute inset-0 w-full h-full pointer-events-none z-10 ${
              uploadedImage ? 'hidden' : 'block'
            }`}
          />

          {/* Alignment box — geometry shared with the in-box test */}
          <div
            className="absolute pointer-events-none z-10 transition-all duration-300"
            style={{
              left: `${ALIGN_BOX.x * 100}%`,
              top: `${ALIGN_BOX.y * 100}%`,
              width: `${ALIGN_BOX.w * 100}%`,
              height: `${ALIGN_BOX.h * 100}%`,
            }}
          >
            <div
              className={`w-full h-full rounded-2xl border-2 border-dashed flex items-start justify-center pt-2 transition-colors duration-300 ${
                countdown !== null
                  ? 'border-white/70 bg-white/10'
                  : handSteady && handInBox
                  ? 'border-emerald-400/80 bg-emerald-500/10'
                  : handInBox
                  ? 'border-sky-400/70 bg-sky-500/10'
                  : 'border-indigo-400/50 bg-indigo-500/5'
              }`}
            >
              {countdown === null && (
                <div className="text-indigo-100 text-[10px] font-extrabold uppercase tracking-widest bg-slate-900/80 px-3 py-1 rounded-full border border-indigo-400/30">
                  {handInBox ? (handSteady ? 'Hold it!' : 'Steady…') : 'Align hand here'}
                </div>
              )}
            </div>
          </div>

          {/* Camera off placeholder */}
          {!isCameraActive && !uploadedImage && (
            <div className="text-center p-6 text-slate-400 z-20">
              <VideoOff className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p className="text-sm font-bold mb-1">Webcam Inactive</p>
              <p className="text-xs max-w-xs mx-auto mb-4">
                {cameraError || 'Click below to turn on webcam or upload a frame.'}
              </p>
              <button
                onClick={startCamera}
                className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-md hover:bg-indigo-700 transition-colors cursor-pointer"
              >
                Turn On Camera
              </button>
            </div>
          )}

          {/* 3-2-1 grey-out */}
          <AnimatePresence>
            {countdown !== null && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-slate-950/55 backdrop-blur-[2px] flex flex-col items-center justify-center z-30 pointer-events-none"
              >
                <AnimatePresence mode="wait">
                  <motion.div
                    key={countdown}
                    initial={{ scale: 0.4, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 1.7, opacity: 0 }}
                    transition={{ duration: 0.42, ease: 'easeOut' }}
                    className="relative flex items-center justify-center"
                  >
                    <div className="absolute w-40 h-40 rounded-full border-4 border-white/25" />
                    <span className="text-8xl font-black text-white drop-shadow-[0_4px_20px_rgba(0,0,0,0.6)] tabular-nums">
                      {countdown}
                    </span>
                  </motion.div>
                </AnimatePresence>
                <p className="mt-6 text-white/80 text-xs font-black uppercase tracking-[0.25em]">
                  Hold your sign
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Analyzing shimmer */}
          {isEvaluating && (
            <div className="absolute inset-0 bg-indigo-950/45 backdrop-blur-[1px] flex flex-col items-center justify-center z-30 pointer-events-none">
              <div className="w-10 h-10 border-3 border-white/25 border-t-white rounded-full animate-spin" />
              <p className="mt-4 text-white text-xs font-black uppercase tracking-[0.25em]">Analyzing…</p>
            </div>
          )}

          {/* Bottom status */}
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex flex-wrap items-center justify-center gap-3 z-20 w-full px-4">
            <div className="px-4 py-2 bg-black/60 backdrop-blur-md rounded-2xl border border-white/20 text-center shadow-lg">
              <div className="text-white/60 text-[9px] font-extrabold uppercase mb-0.5 tracking-wider">Detected</div>
              <div className="text-white font-mono text-xs font-bold tracking-wider">
                {evaluationResult?.detected_gesture
                  ? `[${evaluationResult.detected_gesture.toUpperCase()}]`
                  : '[READY]'}
              </div>
            </div>

            <div className="px-4 py-2 bg-indigo-600 rounded-2xl shadow-xl text-center border border-indigo-400/30 text-white">
              <div className="text-white/70 text-[9px] font-extrabold uppercase mb-0.5 tracking-wider">Target Sign</div>
              <div className="text-white font-bold text-xs">{currentTarget.label}</div>
            </div>
          </div>

          {/* Reset upload */}
          {uploadedImage && (
            <button
              onClick={() => {
                setUploadedImage(null);
                startCamera();
              }}
              className="absolute top-16 right-5 bg-slate-900/80 hover:bg-slate-900 text-white p-2 rounded-full backdrop-blur-md shadow-md z-30 cursor-pointer"
              title="Return to webcam"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
        </div>

        {trackingError && (
          <div className="text-[11px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-xl px-3 py-2">
            Hand tracking unavailable ({trackingError}). Manual capture still works.
          </div>
        )}
      </div>

      {/* Right column */}
      <div className="lg:col-span-4 flex flex-col gap-6">
        {/* Mascot stage */}
        <div className="bg-indigo-500 dark:bg-indigo-900 rounded-3xl p-6 flex flex-col items-center justify-center relative overflow-hidden shadow-xl shadow-indigo-100 dark:shadow-none min-h-[280px]">
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-indigo-400/40 rounded-full pointer-events-none" />
          <div className="relative z-10 w-full flex flex-col items-center">
            <SignBuddyMascot
              config={mascotConfig}
              expression={
                evaluationResult?.avatar_reaction?.expression || (isEvaluating ? 'THINKING' : 'HAPPY')
              }
              animationTrigger={
                evaluationResult?.avatar_reaction?.animation_trigger ||
                (isEvaluating ? 'demonstrate_sign' : 'dance_happy')
              }
              dialogueBubble={
                evaluationResult?.avatar_reaction?.dialogue_bubble ||
                (isEvaluating
                  ? `Hold steady! Analyzing your gesture for "${currentTarget.label}"...`
                  : `Hi! Align your hand in the box — I'll snap it automatically!`)
              }
              isEvaluating={isEvaluating}
              isSpeaking={speaking}
              size="lg"
            />
          </div>
        </div>

        {/* What to sign — avatar cue */}
        <TargetSignCue
          target={currentTarget}
          mascotConfig={mascotConfig}
          isEvaluating={isEvaluating}
          result={evaluationResult}
          onReplayVoice={() =>
            speak(
              evaluationResult?.avatar_reaction?.dialogue_bubble ||
                `Let's sign ${currentTarget.label}. ${currentTarget.handShapeDescription}`,
              evaluationResult?.avatar_reaction?.expression || 'SHOWING_CORRECT_SIGN'
            )
          }
          voiceEnabled={voiceEnabled}
          speaking={speaking}
        />

        {/* Reference handshape */}
        <HandShapeGuide target={currentTarget} onPickLetter={jumpToLetter} />

        {/* Skeleton diagnostic */}
        {reviewImage && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm space-y-3"
          >
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                <HandIcon className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  Skeleton Diagnostic
                </h4>
                <p className="text-sm font-black text-slate-900 dark:text-slate-100">
                  {wrongJoints.length === 0 ? 'Every joint on target' : `${wrongJoints.length} joints to fix`}
                </p>
              </div>
            </div>

            <img
              src={reviewImage}
              alt="Your hand with the tracked skeleton overlaid"
              className="w-full rounded-2xl border border-slate-200 dark:border-slate-700"
            />

            <div className="flex items-center gap-4 text-[10px] font-bold">
              <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Correct
              </span>
              <span className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Needs fixing
              </span>
            </div>

            {wrongJointNames.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {wrongJointNames.map((name) => (
                  <span
                    key={name}
                    className="px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900 text-[10px] font-bold"
                  >
                    {name}
                  </span>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Evaluation panel */}
        {evaluationResult && (
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">Sign Evaluation</h3>
                <p className="text-slate-500 dark:text-slate-400 text-xs">
                  {evaluationResult.is_correct ? 'Correct execution!' : 'Position adjustment needed'}
                </p>
              </div>
              <div className="text-3xl font-black text-indigo-600 dark:text-indigo-400">
                {evaluationResult.accuracy_score}
                <span className="text-xs text-slate-400 font-bold ml-0.5">%</span>
              </div>
            </div>

            {evaluationResult.misidentified_sign && (
              <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs space-y-1">
                <div className="font-black flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" />
                  <span>Misidentified Sign Detected</span>
                </div>
                <p className="leading-relaxed">
                  You appear to be making the sign for <strong>{evaluationResult.misidentified_sign}</strong> instead of{' '}
                  <strong>{currentTarget.label}</strong>!
                </p>
              </div>
            )}

            {evaluationResult.positioning_advice && (
              <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-950 dark:text-indigo-200 text-xs space-y-1">
                <div className="font-black flex items-center gap-1.5 text-indigo-700 dark:text-indigo-300">
                  <Lightbulb className="w-4 h-4 shrink-0 text-amber-500" />
                  <span>Positioning Advice</span>
                </div>
                <p className="leading-relaxed font-medium">{evaluationResult.positioning_advice}</p>
              </div>
            )}

            <div className="flex items-start gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800">
              {evaluationResult.is_correct ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              )}
              <span>{evaluationResult.feedback_tip}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
