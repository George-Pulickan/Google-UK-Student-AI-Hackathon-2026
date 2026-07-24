import React, { useRef, useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'motion/react';
import {
  SignTarget,
  SignEvaluationResult,
  MascotConfig,
  SignLanguageSystem,
  CameraMode,
} from '../types';
import { getSignTargets } from '../data/signsData';
import { SignBuddyMascot } from './SignBuddyMascot';
import { HandShapeGuide } from './HandShapeGuide';
import {
  Camera,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  XCircle,
  Upload,
  VideoOff,
  ChevronRight,
  Layers,
  Compass,
  Zap,
  AlertTriangle,
  Lightbulb,
} from 'lucide-react';

interface CameraPracticeStudioProps {
  initialSign?: SignTarget;
  mascotConfig: MascotConfig;
  signSystem: SignLanguageSystem;
  onEvaluationComplete: (sign: SignTarget, result: SignEvaluationResult) => void;
}

export const CameraPracticeStudio: React.FC<CameraPracticeStudioProps> = ({
  initialSign,
  mascotConfig,
  signSystem,
  onEvaluationComplete,
}) => {
  const availableSigns = getSignTargets(signSystem);
  const [currentTarget, setCurrentTarget] = useState<SignTarget>(
    initialSign && initialSign.system === signSystem ? initialSign : availableSigns[0]
  );
  const [cameraMode, setCameraMode] = useState<CameraMode>('guided');
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState<SignEvaluationResult | null>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Sync sign system change
  useEffect(() => {
    const signs = getSignTargets(signSystem);
    if (!signs.find((s) => s.id === currentTarget.id)) {
      setCurrentTarget(signs[0]);
      setCurrentStepIndex(0);
      setEvaluationResult(null);
    }
  }, [signSystem]);

  // Sync initial sign prop
  useEffect(() => {
    if (initialSign) {
      setCurrentTarget(initialSign);
      setCurrentStepIndex(0);
      setEvaluationResult(null);
    }
  }, [initialSign]);

  // Start / Stop Camera Stream
  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setIsCameraActive(true);
      }
    } catch (err: any) {
      console.warn('Camera access error:', err);
      setCameraError('Unable to access webcam. You can upload an image or frame below.');
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  // Countdown handle
  const triggerCountdownAndCapture = () => {
    if (countdown !== null || isEvaluating) return;

    setCountdown(3);
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev === 1) {
          clearInterval(timer);
          captureAndEvaluate();
          return null;
        }
        return prev ? prev - 1 : null;
      });
    }, 1000);
  };

  // Capture frame & send to Gemini backend
  const captureAndEvaluate = async () => {
    let imageBase64: string | null = null;

    if (uploadedImage) {
      imageBase64 = uploadedImage;
    } else if (isCameraActive && videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        imageBase64 = canvas.toDataURL('image/jpeg', 0.85);
      }
    }

    if (!imageBase64) {
      alert('Please activate camera or upload an image frame first!');
      return;
    }

    setIsEvaluating(true);
    setEvaluationResult(null);

    try {
      const response = await fetch('/api/evaluate-sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: imageBase64,
          targetSign: currentTarget,
          mascotName: mascotConfig.name,
          signSystem: signSystem,
        }),
      });

      if (!response.ok) {
        throw new Error(`Evaluation server error: ${response.statusText}`);
      }

      const data: SignEvaluationResult = await response.json();
      setEvaluationResult(data);

      if (data.is_correct) {
        // Confetti celebration
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#6366F1', '#EC4899', '#10B981', '#F59E0B'],
        });

        // Advance to next instruction step with animation if available
        if (currentTarget.steps && currentStepIndex < currentTarget.steps.length - 1) {
          setTimeout(() => {
            setCurrentStepIndex((prev) => prev + 1);
          }, 800);
        }
      }

      onEvaluationComplete(currentTarget, data);
    } catch (err: any) {
      console.error('Error evaluating sign:', err);
      const fallbackResult: SignEvaluationResult = {
        is_correct: false,
        accuracy_score: 55,
        feedback_tip: 'Make sure your hand is in clear focus with good lighting!',
        detected_gesture: 'Unrecognized gesture',
        positioning_advice: 'Hold your hand steadily in the center frame.',
        avatar_reaction: {
          expression: 'CONFUSED',
          animation_trigger: 'idle_confused',
          dialogue_bubble: `Oops! Let's try again. Position your hand right in front of the camera!`,
        },
      };
      setEvaluationResult(fallbackResult);
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedImage(reader.result as string);
        setEvaluationResult(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const stepsList = currentTarget.steps || [currentTarget.description];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <canvas ref={canvasRef} className="hidden" />

      {/* Left Column: Top Instructions, Mode Select, Camera Preview & Quick Controls */}
      <div className="lg:col-span-8 flex flex-col gap-5">
        {/* 1. TOP STEP-BY-STEP INSTRUCTION BANNER (Positioned above Camera) */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-100 dark:border-slate-700/60">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-indigo-600 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-sm">
                {currentTarget.id.length <= 3 ? currentTarget.id : currentTarget.id.charAt(0)}
              </span>
              <div>
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">
                  Step-by-Step Instructions ‚Ä¢ {signSystem}
                </span>
                <h3 className="text-base font-black text-slate-900 dark:text-slate-100">
                  {currentTarget.label}
                </h3>
              </div>
            </div>

            {/* Target Select Dropdown */}
            <select
              value={currentTarget.id}
              onChange={(e) => {
                const found = availableSigns.find((s) => s.id === e.target.value);
                if (found) {
                  setCurrentTarget(found);
                  setCurrentStepIndex(0);
                  setEvaluationResult(null);
                }
              }}
              className="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              {availableSigns.map((sign) => (
                <option key={sign.id} value={sign.id}>
                  {sign.label} ({sign.category})
                </option>
              ))}
            </select>
          </div>

          {/* Animated Step Progress Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {stepsList.map((stepText, idx) => {
              const isCurrent = currentStepIndex === idx;
              const isPast = currentStepIndex > idx;
              return (
                <button
                  key={idx}
                  onClick={() => setCurrentStepIndex(idx)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                    isCurrent
                      ? 'bg-indigo-600 text-white shadow-md ring-2 ring-indigo-400 ring-offset-1'
                      : isPast
                      ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                      : 'bg-slate-100 dark:bg-slate-700/60 text-slate-500 dark:text-slate-400 hover:bg-slate-200'
                  }`}
                >
                  <span className="text-[10px] uppercase font-black">Step {idx + 1}</span>
                  {isPast && <CheckCircle2 className="w-3.5 h-3.5" />}
                </button>
              );
            })}
          </div>

          {/* Active Animated Step Card */}
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
                    className="p-2 rounded-xl bg-indigo-50 dark:bg-slate-800 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-100 transition-colors text-xs font-bold shrink-0 flex items-center gap-1"
                  >
                    <span>Next Step</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* 2. TOP ACTION CONTROL BAR (Moved higher for instant snapping!) */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-wrap items-center justify-between gap-3">
          {/* Camera Mode Toggle Buttons */}
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl">
            {[
              { id: 'guided', label: 'Guided Practice', icon: Compass },
              { id: 'free_detect', label: 'Free Sign ID', icon: Layers },
              { id: 'timed_quiz', label: 'Timed Snap', icon: Zap },
            ].map((mode) => {
              const Icon = mode.icon;
              const isActive = cameraMode === mode.id;
              return (
                <button
                  key={mode.id}
                  onClick={() => setCameraMode(mode.id as CameraMode)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{mode.label}</span>
                </button>
              );
            })}
          </div>

          {/* Primary Quick Capture Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={triggerCountdownAndCapture}
              disabled={isEvaluating || countdown !== null}
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-xs shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50"
              title="3 Second Timer Snap"
            >
              <Sparkles className="w-4 h-4" />
              <span>3s Timer</span>
            </button>

            <button
              onClick={captureAndEvaluate}
              disabled={isEvaluating || countdown !== null}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs shadow-md shadow-indigo-200 dark:shadow-none transition-all flex items-center gap-2 disabled:opacity-50 hover:scale-102 cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              <span>{isEvaluating ? 'Analyzing...' : 'Take Picture & Check'}</span>
            </button>

            <label className="p-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl font-bold cursor-pointer transition-colors" title="Upload Image Frame">
              <Upload className="w-4 h-4" />
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* 3. VIDEO CAMERA DISPLAY CONTAINER */}
        <div className="relative aspect-4/3 w-full bg-slate-900 rounded-3xl border-4 border-white dark:border-slate-800 shadow-2xl overflow-hidden group flex items-center justify-center">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-800/50 to-transparent pointer-events-none" />

          {/* Live Analysis Badge */}
          <div className="absolute top-5 left-5 px-3.5 py-1.5 bg-black/40 backdrop-blur-md rounded-full border border-white/20 flex items-center gap-2 pointer-events-none z-10">
            <div className={`w-2 h-2 rounded-full ${isCameraActive ? 'bg-red-500 animate-pulse' : 'bg-slate-400'}`} />
            <span className="text-white text-[10px] font-extrabold tracking-widest uppercase">
              {isCameraActive ? 'LIVE CAMERA' : 'FRAME MODE'}
            </span>
          </div>

          {/* Mode Pill Badge Overlay */}
          <div className="absolute top-5 right-5 px-3 py-1 bg-indigo-950/80 backdrop-blur-md rounded-full border border-indigo-500/30 text-indigo-200 text-[10px] font-black uppercase tracking-wider z-10">
            {cameraMode === 'guided' ? 'Ì†ºÌæØ Guided' : cameraMode === 'free_detect' ? 'üîç Free Detect' : '‚è±Ô∏è Timed'}
          </div>

          {/* Alignment Frame Overlay */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <div className="w-56 h-72 sm:w-64 sm:h-80 border-2 border-dashed border-indigo-400/50 rounded-2xl flex items-center justify-center bg-indigo-500/5">
              <div className="text-indigo-300 text-[10px] font-extrabold uppercase tracking-widest bg-slate-900/90 px-3 py-1 rounded-full border border-indigo-400/30">
                Align hand here
              </div>
            </div>
          </div>

          {/* Active Webcam Feed */}
          <video
            ref={videoRef}
            playsInline
            muted
            className={`w-full h-full object-cover transform -scale-x-100 ${
              isCameraActive && !uploadedImage ? 'block' : 'hidden'
            }`}
          />

          {/* Uploaded Image Preview */}
          {uploadedImage && (
            <img
              src={uploadedImage}
              alt="Uploaded hand sign"
              className="w-full h-full object-contain"
            />
          )}

          {/* Camera Error / Placeholder */}
          {!isCameraActive && !uploadedImage && (
            <div className="text-center p-6 text-slate-400 z-10">
              <VideoOff className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p className="text-sm font-bold mb-1">Webcam Inactive</p>
              <p className="text-xs max-w-xs mx-auto mb-4">
                {cameraError || 'Click below to turn on webcam or upload a frame.'}
              </p>
              <button
                onClick={startCamera}
                className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-md hover:bg-indigo-700 transition-colors"
              >
                Turn On Camera
              </button>
            </div>
          )}

          {/* Countdown Overlay */}
          {countdown !== null && (
            <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-30">
              <span className="text-8xl font-black text-white animate-ping">
                {countdown}
              </span>
            </div>
          )}

          {/* Floating Bottom Status Overlay */}
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex flex-wrap items-center justify-center gap-3 z-10 w-full px-4">
            <div className="px-4 py-2 bg-black/60 backdrop-blur-md rounded-2xl border border-white/20 text-center shadow-lg">
              <div className="text-white/60 text-[9px] font-extrabold uppercase mb-0.5 tracking-wider">
                Detected
              </div>
              <div className="text-white font-mono text-xs font-bold tracking-wider">
                {evaluationResult?.detected_gesture
                  ? `[${evaluationResult.detected_gesture.toUpperCase()}]`
                  : '[READY]'}
              </div>
            </div>

            <div className="px-4 py-2 bg-indigo-600 rounded-2xl shadow-xl text-center border border-indigo-400/30 text-white">
              <div className="text-white/70 text-[9px] font-extrabold uppercase mb-0.5 tracking-wider">
                Target Sign
              </div>
              <div className="text-white font-bold text-xs">{currentTarget.label}</div>
            </div>
          </div>

          {/* Clear Uploaded Image Button */}
          {uploadedImage && (
            <button
              onClick={() => {
                setUploadedImage(null);
                startCamera();
              }}
              className="absolute top-5 right-5 bg-slate-900/80 hover:bg-slate-900 text-white p-2 rounded-full backdrop-blur-md shadow-md text-xs font-bold z-20"
              title="Return to webcam"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Right Column: SignBuddy Mascot Stage, Target Hand Shape Guide & Diagnostic Results */}
      <div className="lg:col-span-4 flex flex-col gap-6">
        {/* 1. SignBuddy Mascot Stage */}
        <div className="bg-indigo-500 dark:bg-indigo-900 rounded-3xl p-6 flex flex-col items-center justify-center relative overflow-hidden shadow-xl shadow-indigo-100 dark:shadow-none min-h-[280px]">
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-indigo-400/40 rounded-full pointer-events-none" />
          <div className="relative z-10 w-full flex flex-col items-center">
            <SignBuddyMascot
              config={mascotConfig}
              expression={
                evaluationResult?.avatar_reaction?.expression ||
                (isEvaluating ? 'THINKING' : 'HAPPY')
              }
              animationTrigger={
                evaluationResult?.avatar_reaction?.animation_trigger ||
                (isEvaluating ? 'demonstrate_sign' : 'dance_happy')
              }
              dialogueBubble={
                evaluationResult?.avatar_reaction?.dialogue_bubble ||
                (isEvaluating
                  ? `Hold steady! Analyzing your gesture for "${currentTarget.label}"...`
                  : `Hi! Align your hand and tap "Take Picture & Check"!`)
              }
              isEvaluating={isEvaluating}
              size="lg"
            />
          </div>
        </div>

        {/* 2. TARGET HAND SHAPE DIAGRAM GUIDE (Positioned directly under Mascot!) */}
        <HandShapeGuide target={currentTarget} />

        {/* 3. DIAGNOSTIC EVALUATION & POSITIONING ADVICE PANEL */}
        {evaluationResult && (
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">
                  Sign Evaluation
                </h3>
                <p className="text-slate-500 dark:text-slate-400 text-xs">
                  {evaluationResult.is_correct ? 'Correct execution!' : 'Position adjustment needed'}
                </p>
              </div>
              <div className="text-3xl font-black text-indigo-600 dark:text-indigo-400">
                {evaluationResult.accuracy_score}
                <span className="text-xs text-slate-400 font-bold ml-0.5">%</span>
              </div>
            </div>

            {/* Wrong Sign / Misidentification Warning Box */}
            {evaluationResult.misidentified_sign && (
              <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs space-y-1">
                <div className="font-black flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" />
                  <span>Misidentified Sign Detected</span>
                </div>
                <p className="leading-relaxed">
                  You appear to be making the sign for <strong>{evaluationResult.misidentified_sign}</strong> instead of <strong>{currentTarget.label}</strong>!
                </p>
              </div>
            )}

            {/* Physical Positioning Advice */}
            {evaluationResult.positioning_advice && (
              <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-950 dark:text-indigo-200 text-xs space-y-1">
                <div className="font-black flex items-center gap-1.5 text-indigo-700 dark:text-indigo-300">
                  <Lightbulb className="w-4 h-4 shrink-0 text-amber-500" />
                  <span>Positioning Advice</span>
                </div>
                <p className="leading-relaxed font-medium">
                  {evaluationResult.positioning_advice}
                </p>
              </div>
            )}

            {/* Quick Feedback Tip */}
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

