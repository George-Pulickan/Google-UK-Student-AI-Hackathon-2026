import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'motion/react';
import { getQuizPool } from '../data/signsData';
import {
  SignTarget,
  SignEvaluationResult,
  MascotConfig,
  SignLanguageSystem,
  TrackedHand,
} from '../types';
import { useHandLandmarker } from '../lib/useHandLandmarker';
import { openCameraStream, waitForVideoElement } from '../lib/camera';
import { useMascotVoice, spokenVerdict } from '../lib/useMascotVoice';
import { drawHandSkeleton, readHands, HAND_HUES } from '../lib/handSkeleton';
import { MascotAvatar } from './MascotAvatar';
import { signPhotoUrl } from '../lib/signImages';
import {
  Trophy,
  Camera,
  VideoOff,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Volume2,
  Play,
  ChevronRight,
  Timer,
} from 'lucide-react';

interface SignQuizChallengeProps {
  mascotConfig: MascotConfig;
  signSystem: SignLanguageSystem;
  voiceEnabled: boolean;
  onEvaluationComplete: (sign: SignTarget, result: SignEvaluationResult) => void;
  streakDays: number;
  xp: number;
}

const QUESTION_COUNT = 5;

interface Answer {
  sign: SignTarget;
  result: SignEvaluationResult;
  snapshot: string | null;
}

type Phase = 'intro' | 'asking' | 'grading' | 'feedback' | 'done';

/** Draws `count` distinct signs, preferring a mix of letters and numbers. */
function buildQuiz(system: SignLanguageSystem, count: number): SignTarget[] {
  const pool = getQuizPool(system);
  const letters = pool.filter((s) => s.category === 'Alphabet');
  const numbers = pool.filter((s) => s.category === 'Numbers');
  const shuffle = <T,>(arr: T[]) => [...arr].sort(() => Math.random() - 0.5);

  // Aim for roughly two numbers per five questions when the data allows.
  const wantNumbers = Math.min(numbers.length, Math.max(1, Math.round(count * 0.4)));
  const picked = [
    ...shuffle(numbers).slice(0, wantNumbers),
    ...shuffle(letters).slice(0, count - wantNumbers),
  ];

  // Top up from whatever is left if one category was too small.
  if (picked.length < count) {
    const rest = shuffle(pool.filter((s) => !picked.includes(s)));
    picked.push(...rest.slice(0, count - picked.length));
  }
  return shuffle(picked).slice(0, count);
}

export const SignQuizChallenge: React.FC<SignQuizChallengeProps> = ({
  mascotConfig,
  signSystem,
  voiceEnabled,
  onEvaluationComplete,
  streakDays,
  xp,
}) => {
  const [questions, setQuestions] = useState<SignTarget[]>(() => buildQuiz(signSystem, QUESTION_COUNT));
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [phase, setPhase] = useState<Phase>('intro');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayRef = useRef<HTMLCanvasElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastVideoTimeRef = useRef(-1);
  const liveHandsRef = useRef<TrackedHand[]>([]);
  const cameraStartingRef = useRef(false);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const submitRef = useRef<() => void>(() => {});

  const { landmarkerRef, ready: trackingReady } = useHandLandmarker(2);
  const { speak, stop: stopSpeech, speaking } = useMascotVoice(voiceEnabled, mascotConfig.voiceName || 'Leda');

  const current = questions[index];
  const score = answers.filter((a) => a.result.is_correct).length;
  const lastAnswer = answers[answers.length - 1];

  // Rebuild the quiz when the language changes.
  useEffect(() => {
    setQuestions(buildQuiz(signSystem, QUESTION_COUNT));
    setIndex(0);
    setAnswers([]);
    setPhase('intro');
  }, [signSystem]);

  /* ---------------------------------------------------------------- *
   * Camera
   * ---------------------------------------------------------------- */
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
    } catch {
      setCameraError('Unable to access the webcam.');
      setIsCameraActive(false);
    } finally {
      cameraStartingRef.current = false;
    }
  }, []);

  const stopCamera = useCallback(() => {
    const stream = videoRef.current?.srcObject as MediaStream | null;
    stream?.getTracks().forEach((t) => t.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
    setIsCameraActive(false);
  }, []);

  /**
   * The <video> only exists while a question is on screen, so the camera is
   * acquired on entering those phases rather than on mount — asking for it
   * during the intro left the stream with nothing to attach to. It also means
   * the webcam is released while the intro and results screens are up.
   */
  const needsCamera = phase === 'asking' || phase === 'grading' || phase === 'feedback';

  useEffect(() => {
    if (needsCamera) startCamera();
    else stopCamera();
  }, [needsCamera, startCamera, stopCamera]);

  useEffect(
    () => () => {
      const stream = videoRef.current?.srcObject as MediaStream | null;
      stream?.getTracks().forEach((t) => t.stop());
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    },
    []
  );

  /* ---------------------------------------------------------------- *
   * Skeleton overlay
   * ---------------------------------------------------------------- */
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
          liveHandsRef.current = readHands(landmarker.detectForVideo(video, performance.now()));
        } catch {
          liveHandsRef.current = [];
        }
      }

      const hands = liveHandsRef.current;
      if (hands.length) {
        const scale = Math.max(cw / video.videoWidth, ch / video.videoHeight);
        const dw = video.videoWidth * scale;
        const dh = video.videoHeight * scale;
        ctx.save();
        ctx.translate((cw - dw) / 2, (ch - dh) / 2);
        hands.forEach((hand, i) => {
          drawHandSkeleton(ctx, hand.landmarks, dw, dh, {
            mirrored: true,
            hue: HAND_HUES[i % HAND_HUES.length],
            scale: Math.max(0.75, cw / 640),
            opacity: 0.85,
          });
        });
        ctx.restore();
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackingReady]);

  /* ---------------------------------------------------------------- *
   * Grading
   * ---------------------------------------------------------------- */
  const submitAnswer = useCallback(async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video?.srcObject || !canvas || !current) return;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageBase64 = canvas.toDataURL('image/jpeg', 0.85);

    const hands = liveHandsRef.current.map((h) => ({
      handedness: h.handedness,
      landmarks: [...h.landmarks],
    }));

    setPhase('grading');
    stopSpeech();

    let result: SignEvaluationResult;
    try {
      const res = await fetch('/api/evaluate-sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64,
          targetSign: current,
          mascotName: mascotConfig.name,
          signSystem,
          hands,
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      result = await res.json();
    } catch {
      result = {
        is_correct: false,
        accuracy_score: 0,
        feedback_tip: "I couldn't read that one — the camera or connection dropped.",
        avatar_reaction: {
          expression: 'CONFUSED',
          animation_trigger: 'idle_confused',
          dialogue_bubble: "I couldn't read that one clearly.",
        },
      };
    }

    setAnswers((prev) => [...prev, { sign: current, result, snapshot: imageBase64 }]);
    onEvaluationComplete(current, result);
    speak(spokenVerdict(result), result.avatar_reaction?.expression);

    if (result.is_correct) {
      confetti({ particleCount: 60, spread: 65, origin: { y: 0.6 }, colors: ['#6366F1', '#10B981', '#F59E0B'] });
    }
    setPhase('feedback');
  }, [current, mascotConfig.name, signSystem, onEvaluationComplete, speak, stopSpeech]);

  useEffect(() => {
    submitRef.current = submitAnswer;
  }, [submitAnswer]);

  /** 3-2-1 then grade. Side effect fires outside the state updater. */
  const startCountdown = useCallback(() => {
    if (countdownTimerRef.current) return;
    let remaining = 3;
    setCountdown(remaining);
    countdownTimerRef.current = setInterval(() => {
      remaining -= 1;
      if (remaining > 0) {
        setCountdown(remaining);
        return;
      }
      clearInterval(countdownTimerRef.current!);
      countdownTimerRef.current = null;
      setCountdown(null);
      submitRef.current();
    }, 1000);
  }, []);

  const nextQuestion = useCallback(() => {
    if (index + 1 >= questions.length) {
      setPhase('done');
      const finalScore = answers.filter((a) => a.result.is_correct).length;
      speak(
        `That's the quiz done. You scored ${finalScore} out of ${questions.length}. ${
          finalScore === questions.length
            ? 'A perfect round — brilliant work!'
            : finalScore >= questions.length / 2
            ? 'Solid effort. Run it again to push your score up.'
            : "Keep at it — practise those handshapes and go again."
        }`,
        finalScore >= questions.length / 2 ? 'CHEERING' : 'HAPPY'
      );
      return;
    }
    setIndex((i) => i + 1);
    setPhase('asking');
  }, [index, questions.length, answers, speak]);

  const restart = useCallback(() => {
    setQuestions(buildQuiz(signSystem, QUESTION_COUNT));
    setIndex(0);
    setAnswers([]);
    setPhase('intro');
    stopSpeech();
  }, [signSystem, stopSpeech]);

  const beginQuiz = useCallback(() => {
    setPhase('asking');
    speak(
      `Right, ${QUESTION_COUNT} signs, no hints. First up: sign ${questions[0]?.label}. Hit the button when you're ready.`,
      'CHEERING'
    );
  }, [questions, speak]);

  const progressPct = useMemo(() => (answers.length / questions.length) * 100, [answers.length, questions.length]);

  /* ---------------------------------------------------------------- *
   * Render
   * ---------------------------------------------------------------- */
  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <canvas ref={canvasRef} className="hidden" />

      {/* Header */}
      <div className="bg-gradient-to-r from-amber-500 to-orange-600 rounded-3xl p-5 text-white shadow-lg shadow-amber-200 dark:shadow-none">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-white/20 backdrop-blur-sm">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-black text-lg tracking-tight">{signSystem} Quiz Challenge</h2>
              <p className="text-xs text-white/80">
                {QUESTION_COUNT} signs · no diagrams, no hints · scored out of {QUESTION_COUNT}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-[10px] font-black uppercase tracking-widest text-white/70">Score</div>
              <div className="text-2xl font-black tabular-nums">
                {score}
                <span className="text-sm text-white/70">/{questions.length}</span>
              </div>
            </div>
            <div className="text-right hidden sm:block">
              <div className="text-[10px] font-black uppercase tracking-widest text-white/70">Streak · XP</div>
              <div className="text-sm font-black tabular-nums">
                {streakDays}d · {xp}
              </div>
            </div>
          </div>
        </div>

        {phase !== 'intro' && (
          <div className="mt-4 h-1.5 bg-white/25 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-white rounded-full"
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
        )}
      </div>

      {/* Intro */}
      {phase === 'intro' && (
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-8 shadow-sm text-center">
          <MascotAvatar config={mascotConfig} expression="CHEERING" size={92} speaking={speaking} />
          <h3 className="mt-4 text-xl font-black text-slate-900 dark:text-slate-100">Ready for the test?</h3>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
            You'll get {QUESTION_COUNT} prompts — a mix of {signSystem} letters and numbers. You only get the
            name of the sign: no picture, no steps, no hand diagram. Sign it to the camera and I'll mark it.
          </p>
          <button
            onClick={beginQuiz}
            className="mt-6 px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-black text-sm
                       shadow-md transition-all inline-flex items-center gap-2 cursor-pointer"
          >
            <Play className="w-4 h-4" />
            Start the quiz
          </button>
        </div>
      )}

      {/* Question / grading / feedback */}
      {(phase === 'asking' || phase === 'grading' || phase === 'feedback') && current && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Prompt + camera */}
          <div className="lg:col-span-7 space-y-4">
            {/* The prompt: name only, deliberately no imagery */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm text-center">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                Question {index + 1} of {questions.length}
              </div>
              <div className="mt-2 text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest">
                {current.category}
              </div>
              <h3 className="mt-1 text-4xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                {current.label}
              </h3>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                Sign this in {signSystem}. No peeking — the diagram is hidden until the quiz ends.
              </p>
            </div>

            {/* Camera */}
            <div
              ref={stageRef}
              className="relative aspect-4/3 w-full bg-slate-900 rounded-3xl border-4 border-white dark:border-slate-800 shadow-2xl overflow-hidden flex items-center justify-center"
            >
              <video
                ref={videoRef}
                playsInline
                muted
                className={`absolute inset-0 w-full h-full object-cover transform -scale-x-100 transition-[filter] duration-300 ${
                  countdown !== null ? 'grayscale brightness-50' : ''
                } ${isCameraActive ? 'block' : 'hidden'}`}
              />
              <canvas ref={overlayRef} className="absolute inset-0 w-full h-full pointer-events-none z-10" />

              {!isCameraActive && (
                <div className="text-center p-6 text-slate-400 z-20">
                  <VideoOff className="w-12 h-12 mx-auto mb-3 opacity-40" />
                  <p className="text-xs max-w-xs mx-auto mb-4">{cameraError || 'Camera is off.'}</p>
                  <button
                    onClick={startCamera}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 cursor-pointer"
                  >
                    Turn On Camera
                  </button>
                </div>
              )}

              {/* Countdown */}
              <AnimatePresence>
                {countdown !== null && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-slate-950/55 backdrop-blur-[2px] flex items-center justify-center z-30 pointer-events-none"
                  >
                    <AnimatePresence mode="wait">
                      <motion.span
                        key={countdown}
                        initial={{ scale: 0.4, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 1.7, opacity: 0 }}
                        transition={{ duration: 0.42 }}
                        className="text-8xl font-black text-white tabular-nums drop-shadow-lg"
                      >
                        {countdown}
                      </motion.span>
                    </AnimatePresence>
                  </motion.div>
                )}
              </AnimatePresence>

              {phase === 'grading' && (
                <div className="absolute inset-0 bg-amber-950/50 backdrop-blur-[1px] flex flex-col items-center justify-center z-30">
                  <div className="w-10 h-10 border-3 border-white/25 border-t-white rounded-full animate-spin" />
                  <p className="mt-4 text-white text-xs font-black uppercase tracking-[0.25em]">Marking…</p>
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-3">
              {phase === 'asking' && (
                <>
                  <button
                    onClick={startCountdown}
                    disabled={!isCameraActive || countdown !== null}
                    className="px-5 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-black text-sm
                               shadow-md transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    <Timer className="w-4 h-4" />
                    3s Timer
                  </button>
                  <button
                    onClick={submitAnswer}
                    disabled={!isCameraActive || countdown !== null}
                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-sm
                               shadow-md transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    <Camera className="w-4 h-4" />
                    Submit answer
                  </button>
                </>
              )}

              {phase === 'feedback' && (
                <button
                  onClick={nextQuestion}
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-sm
                             shadow-md transition-all flex items-center gap-2 cursor-pointer"
                >
                  {index + 1 >= questions.length ? 'See my score' : 'Next question'}
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Coach + running tally */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <MascotAvatar
                  config={mascotConfig}
                  expression={
                    phase === 'grading'
                      ? 'THINKING'
                      : lastAnswer?.result.is_correct
                      ? 'CHEERING'
                      : phase === 'feedback'
                      ? 'CONFUSED'
                      : 'HAPPY'
                  }
                  size={64}
                  speaking={speaking}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                    {mascotConfig.name || 'Buddy'}
                  </p>
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 leading-snug">
                    {phase === 'grading'
                      ? 'Let me look at that…'
                      : phase === 'feedback' && lastAnswer
                      ? lastAnswer.result.avatar_reaction?.dialogue_bubble
                      : `Show me ${current.label}. Take your time.`}
                  </p>
                </div>
                {voiceEnabled && phase === 'feedback' && lastAnswer && (
                  <button
                    onClick={() => speak(spokenVerdict(lastAnswer.result), lastAnswer.result.avatar_reaction?.expression)}
                    className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-100 cursor-pointer shrink-0"
                    title="Hear it again"
                  >
                    <Volume2 className={`w-4 h-4 ${speaking ? 'animate-pulse' : ''}`} />
                  </button>
                )}
              </div>

              {/* Verdict — shown only after grading, never before */}
              {phase === 'feedback' && lastAnswer && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`mt-4 p-3.5 rounded-2xl border text-xs font-semibold flex items-start gap-2 ${
                    lastAnswer.result.is_correct
                      ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-200'
                      : 'bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-200'
                  }`}
                >
                  {lastAnswer.result.is_correct ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-500" />
                  ) : (
                    <XCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
                  )}
                  <div>
                    <span className="block font-black mb-0.5">
                      {lastAnswer.result.is_correct ? 'Correct' : 'Not this time'} ·{' '}
                      {lastAnswer.result.accuracy_score}%
                    </span>
                    {lastAnswer.result.feedback_tip}
                  </div>
                </motion.div>
              )}
            </div>

            {/* Answer dots */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3">
                Progress
              </p>
              <div className="flex items-center gap-2">
                {questions.map((q, i) => {
                  const a = answers[i];
                  return (
                    <div
                      key={q.id}
                      className={`flex-1 h-11 rounded-xl border-2 flex items-center justify-center text-[11px] font-black transition-colors ${
                        a
                          ? a.result.is_correct
                            ? 'bg-emerald-500 border-emerald-500 text-white'
                            : 'bg-rose-500 border-rose-500 text-white'
                          : i === index
                          ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400'
                          : 'border-slate-200 dark:border-slate-700 text-slate-300 dark:text-slate-600'
                      }`}
                      title={a ? q.label : 'Not answered yet'}
                    >
                      {a ? (a.result.is_correct ? '✓' : '✗') : i + 1}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {phase === 'done' && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-8 shadow-sm"
        >
          <div className="text-center">
            <MascotAvatar
              config={mascotConfig}
              expression={score >= questions.length / 2 ? 'CHEERING' : 'HAPPY'}
              size={92}
              speaking={speaking}
            />
            <div className="mt-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
              Final score
            </div>
            <div className="text-6xl font-black text-slate-900 dark:text-slate-100 tabular-nums">
              {score}
              <span className="text-2xl text-slate-400">/{questions.length}</span>
            </div>
            <p className="mt-2 text-sm font-semibold text-slate-500 dark:text-slate-400">
              {score === questions.length
                ? 'Perfect round — every sign correct.'
                : score >= questions.length / 2
                ? 'Good round. A few to tighten up.'
                : 'Worth another go — check the review below.'}
            </p>
          </div>

          {/* Per-question review, with the reference photo now revealed */}
          <div className="mt-7 space-y-2.5">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
              Review
            </p>
            {answers.map((a, i) => {
              const photo = signPhotoUrl(a.sign);
              return (
                <div
                  key={`${a.sign.id}-${i}`}
                  className="flex items-center gap-3 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50"
                >
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center text-white font-black text-xs shrink-0 ${
                      a.result.is_correct ? 'bg-emerald-500' : 'bg-rose-500'
                    }`}
                  >
                    {a.result.is_correct ? '✓' : '✗'}
                  </div>

                  {photo && (
                    <img
                      src={photo}
                      alt={a.sign.label}
                      className="w-12 h-12 object-contain shrink-0 rounded-lg bg-white dark:bg-slate-800 p-0.5"
                    />
                  )}

                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-slate-900 dark:text-slate-100">{a.sign.label}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug line-clamp-2">
                      {a.result.is_correct
                        ? a.sign.handShapeDescription
                        : a.result.misidentified_sign
                        ? `You signed ${a.result.misidentified_sign}. ${a.result.feedback_tip}`
                        : a.result.feedback_tip}
                    </p>
                  </div>

                  <span className="text-sm font-black text-slate-400 dark:text-slate-500 tabular-nums shrink-0">
                    {a.result.accuracy_score}%
                  </span>
                </div>
              );
            })}
          </div>

          <div className="mt-6 flex justify-center">
            <button
              onClick={restart}
              className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-black text-sm
                         shadow-md transition-all flex items-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              New quiz
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
};
