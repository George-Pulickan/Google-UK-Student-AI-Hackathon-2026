import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MascotConfig, SignEvaluationResult, SignTarget } from '../types';
import { signPhotoUrl, signLetter } from '../lib/signImages';
import { MascotAvatar } from './MascotAvatar';
import { Volume2, Target, ArrowRight } from 'lucide-react';

interface TargetSignCueProps {
  target: SignTarget;
  mascotConfig: MascotConfig;
  isEvaluating: boolean;
  result: SignEvaluationResult | null;
  voiceEnabled: boolean;
  speaking: boolean;
  onReplayVoice: () => void;
}

/**
 * The "what am I meant to be doing" card that sits alongside the evaluation.
 * Pairs the mascot with the reference handshape so the learner always has a
 * model to copy, and swaps to a verdict once Gemini has scored the attempt.
 */
export const TargetSignCue: React.FC<TargetSignCueProps> = ({
  target,
  mascotConfig,
  isEvaluating,
  result,
  voiceEnabled,
  speaking,
  onReplayVoice,
}) => {
  const photo = signPhotoUrl(target);
  const letter = signLetter(target);

  const verdict = isEvaluating
    ? { text: 'Checking your hand…', tone: 'text-sky-600 dark:text-sky-400' }
    : result
    ? result.is_correct
      ? { text: 'Nailed it — try the next one!', tone: 'text-emerald-600 dark:text-emerald-400' }
      : { text: 'Not quite — copy the shape below', tone: 'text-amber-600 dark:text-amber-400' }
    : { text: 'Copy this shape with your hand', tone: 'text-slate-500 dark:text-slate-400' };

  const expression = isEvaluating
    ? 'THINKING'
    : result?.avatar_reaction?.expression || 'SHOWING_CORRECT_SIGN';

  return (
    <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-violet-50 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 flex items-center justify-center">
            <Target className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
              Your Coach Says
            </h4>
            <p className={`text-xs font-black ${verdict.tone}`}>{verdict.text}</p>
          </div>
        </div>

        {voiceEnabled && (
          <button
            onClick={onReplayVoice}
            className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300
                       hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors cursor-pointer"
            title="Hear it again"
          >
            <Volume2 className={`w-4 h-4 ${speaking ? 'animate-pulse' : ''}`} />
          </button>
        )}
      </div>

      {/* Coach → target */}
      <div className="flex items-center gap-3">
        {/* Mascot */}
        <div className="shrink-0 relative">
          <MascotAvatar config={mascotConfig} expression={expression as any} size={78} speaking={speaking} />
          {speaking && (
            <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-800 animate-pulse" />
          )}
        </div>

        <ArrowRight className="w-5 h-5 text-slate-300 dark:text-slate-600 shrink-0" />

        {/* Target handshape */}
        <div
          className="flex-1 relative rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden
                     bg-gradient-to-br from-violet-50 to-indigo-50 dark:from-slate-900 dark:to-violet-950/40
                     h-[104px] flex items-center justify-center"
        >
          {letter && (
            <span className="absolute top-1.5 left-2 text-[11px] font-black text-violet-500/70 dark:text-violet-400/70">
              {letter}
            </span>
          )}

          <AnimatePresence mode="wait">
            {photo ? (
              <motion.img
                key={photo}
                src={photo}
                alt={`Reference handshape for ${target.label}`}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{
                  opacity: 1,
                  scale: 1,
                  // Gentle nudge draws the eye when the learner got it wrong.
                  y: result && !result.is_correct ? [0, -4, 0] : 0,
                }}
                exit={{ opacity: 0, scale: 0.94 }}
                transition={{
                  duration: 0.25,
                  y: { repeat: result && !result.is_correct ? Infinity : 0, duration: 1.6 },
                }}
                className="max-h-[88px] max-w-full object-contain drop-shadow-md"
              />
            ) : (
              <motion.div
                key="emoji"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-4xl"
              >
                {target.visualHint?.match(/\p{Emoji}/u)?.[0] || '🖐️'}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-slate-600 dark:text-slate-300 font-medium">
        <span className="font-black text-slate-900 dark:text-slate-100">Sign “{target.label}”:</span>{' '}
        {target.handShapeDescription}
      </p>
    </div>
  );
};
