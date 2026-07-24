import React, { useRef, useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { SignTarget, SignEvaluationResult, MascotConfig } from '../types';
import { ASL_SIGNS } from '../data/signsData';
import { SignBuddyMascot } from './SignBuddyMascot';
import {
  Camera,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Upload,
  Play,
  Award,
  VideoOff,
} from 'lucide-react';

interface CameraPracticeStudioProps {
  initialSign?: SignTarget;
  mascotConfig: MascotConfig;
  onEvaluationComplete: (sign: SignTarget, result: SignEvaluationResult) => void;
}

export const CameraPracticeStudio: React.FC<CameraPracticeStudioProps> = ({
  initialSign,
  mascotConfig,
  onEvaluationComplete,
}) => {
  const [currentTarget, setCurrentTarget] = useState<SignTarget>(initialSign || ASL_SIGNS[0]);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState<SignEvaluationResult | null>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Sync initial sign prop
  useEffect(() => {
    if (initialSign) {
      setCurrentTarget(initialSign);
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
      setCameraError('Unable to access webcam. You can upload an image or use sample frames below.');
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

  // Handle countdown before snap
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
      alert('Please activate your camera or upload an image frame first!');
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
        }),
      });

      if (!response.ok) {
        throw new Error(`Evaluation server error: ${response.statusText}`);
      }

      const data: SignEvaluationResult = await response.json();
      setEvaluationResult(data);

      // Trigger Confetti if correct
      if (data.is_correct) {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#6366F1', '#EC4899', '#10B981', '#F59E0B'],
        });
      }

      onEvaluationComplete(currentTarget, data);
    } catch (err: any) {
      console.error('Error evaluating sign:', err);
      // Fallback friendly error response
      const fallbackResult: SignEvaluationResult = {
        is_correct: false,
        accuracy_score: 55,
        feedback_tip: 'Make sure your hand is in clear focus with good lighting!',
        detected_gesture: 'Unrecognized gesture',
        avatar_reaction: {
          expression: 'CONFUSED',
          animation_trigger: 'idle_confused',
          dialogue_bubble: `Oops! Let's try that again. Position your hand right in front of the camera!`,
        },
      };
      setEvaluationResult(fallbackResult);
    } finally {
      setIsEvaluating(false);
    }
  };

  // Image File Upload Handler
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Hidden Canvas for Frame Extraction */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Left Column: Camera / Frame Preview & Actions */}
      <div className="lg:col-span-8 flex flex-col gap-6">
        {/* Video / Photo Frame Display Container */}
        <div className="relative aspect-4/3 w-full bg-slate-900 rounded-3xl border-4 border-white dark:border-slate-800 shadow-2xl overflow-hidden group flex items-center justify-center">
          {/* Background Radial Gradient */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-800/50 to-transparent pointer-events-none" />

          {/* Live Analysis Badge */}
          <div className="absolute top-6 left-6 px-4 py-2 bg-black/40 backdrop-blur-md rounded-full border border-white/20 flex items-center gap-2 pointer-events-none z-10">
            <div className={`w-2 h-2 rounded-full ${isCameraActive ? 'bg-red-500 animate-pulse' : 'bg-slate-400'}`} />
            <span className="text-white text-xs font-bold tracking-widest uppercase">
              {isCameraActive ? 'LIVE ANALYSIS' : 'FRAME MODE'}
            </span>
          </div>

          {/* Alignment Frame Overlay */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <div className="w-56 h-72 sm:w-64 sm:h-80 border-2 border-dashed border-indigo-400/50 rounded-2xl flex items-center justify-center bg-indigo-500/5">
              <div className="text-indigo-300 text-xs font-bold uppercase tracking-wider bg-slate-900/80 px-3.5 py-1.5 rounded-full border border-indigo-400/30">
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

          {/* Floating Bottom Status Pills */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-wrap items-center justify-center gap-3 z-10 w-full px-4">
            <div className="px-5 py-3 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 text-center shadow-lg">
              <div className="text-white/60 text-[10px] font-bold uppercase mb-0.5 tracking-wider">
                Detected Gesture
              </div>
              <div className="text-white font-mono text-xs sm:text-sm font-bold tracking-wider">
                {evaluationResult?.detected_gesture
                  ? `[${evaluationResult.detected_gesture.toUpperCase()}]`
                  : '[READY_FOR_INPUT]'}
              </div>
            </div>

            <div className="px-5 py-3 bg-indigo-600 rounded-2xl shadow-xl text-center border border-indigo-400/30 text-white">
              <div className="text-white/70 text-[10px] font-bold uppercase mb-0.5 tracking-wider">
                Targeting
              </div>
              <div className="text-white font-bold text-xs sm:text-sm">{currentTarget.label}</div>
            </div>
          </div>

          {/* Clear Uploaded Image Button */}
          {uploadedImage && (
            <button
              onClick={() => {
                setUploadedImage(null);
                startCamera();
              }}
              className="absolute top-6 right-6 bg-slate-900/80 hover:bg-slate-900 text-white p-2.5 rounded-full backdrop-blur-md shadow-md text-xs font-bold z-20"
              title="Return to webcam"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Instruction Bar beneath Camera */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-sm">
          <div className="flex-1">
            <p className="text-slate-400 dark:text-slate-500 text-xs font-bold uppercase tracking-wider mb-1.5">
              Instruction Guide
            </p>
            <p className="text-slate-700 dark:text-slate-200 font-medium text-base sm:text-lg leading-snug">
              {currentTarget.description}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {ASL_SIGNS.slice(0, 4).map((sign) => {
              const isSelected = currentTarget.id === sign.id;
              return (
                <button
                  key={sign.id}
                  onClick={() => {
                    setCurrentTarget(sign);
                    setEvaluationResult(null);
                  }}
                  className={`w-11 h-11 rounded-lg flex items-center justify-center font-bold transition-all text-sm ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'bg-indigo-50 dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 border border-indigo-100 dark:border-slate-600 hover:bg-indigo-100'
                  }`}
                  title={sign.label}
                >
                  {sign.id.length <= 2 ? sign.id : sign.id.charAt(0)}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right Column: SignBuddy Mascot Stage & Evaluation Status */}
      <div className="lg:col-span-4 flex flex-col gap-6">
        {/* Mascot Stage */}
        <div className="bg-indigo-500 dark:bg-indigo-900 rounded-3xl p-6 sm:p-8 flex flex-col items-center justify-center relative overflow-hidden shadow-xl shadow-indigo-100 dark:shadow-none min-h-[300px]">
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
                  ? `Hold steady! I'm analyzing your hand positioning for "${currentTarget.label}"...`
                  : `Ready when you are! Perform the sign for "${currentTarget.label}" and tap Re-Analyze Gesture!`)
              }
              isEvaluating={isEvaluating}
              size="lg"
            />
          </div>
        </div>

        {/* Evaluation Status Card */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 sm:p-8 shadow-sm flex flex-col justify-between space-y-5">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-lg mb-0.5">
                Evaluation Status
              </h3>
              <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold">
                Real-time gesture scoring
              </p>
            </div>
            <div className="text-4xl font-black text-indigo-600 dark:text-indigo-400">
              {evaluationResult ? evaluationResult.accuracy_score : 0}
              <span className="text-sm text-slate-400 font-bold ml-1">%</span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                  evaluationResult?.is_correct
                    ? 'bg-emerald-100 text-emerald-600'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-400'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <span className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-300">
                Form State:{' '}
                {evaluationResult
                  ? evaluationResult.is_correct
                    ? 'Correct Gesture'
                    : 'Adjustment Needed'
                  : 'Awaiting Analysis'}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-950/60 flex items-center justify-center shrink-0 text-amber-600 dark:text-amber-400">
                <Sparkles className="w-4 h-4" />
              </div>
              <span className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-300">
                {evaluationResult?.feedback_tip || currentTarget.keyTips[0]}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              onClick={triggerCountdownAndCapture}
              disabled={isEvaluating || countdown !== null}
              className="p-3.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold transition-all disabled:opacity-50"
              title="3s Timer Snap"
            >
              <Sparkles className="w-4 h-4" />
            </button>

            <label className="p-3.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-xl font-bold cursor-pointer transition-colors">
              <Upload className="w-4 h-4" />
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            <button
              onClick={captureAndEvaluate}
              disabled={isEvaluating || countdown !== null}
              className="flex-1 py-3.5 bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white rounded-xl font-bold text-center text-xs sm:text-sm tracking-wide shadow-md transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Camera className="w-4 h-4" />
              {isEvaluating ? 'ANALYZING...' : 'RE-ANALYZE GESTURE'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
