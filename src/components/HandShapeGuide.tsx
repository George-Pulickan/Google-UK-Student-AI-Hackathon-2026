import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { SignTarget } from '../types';
import { signPhotoUrl, signLetter, letterPhotoUrl } from '../lib/signImages';
import { Hand, Sparkles, ImageOff, ZoomIn } from 'lucide-react';

interface HandShapeGuideProps {
  target: SignTarget;
  /** Optional strip of nearby letters for quick reference. */
  showAlphabetStrip?: boolean;
  onPickLetter?: (letter: string) => void;
}

const DIFFICULTY_STYLES: Record<string, string> = {
  Easy: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
  Medium: 'bg-amber-100 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  Hard: 'bg-rose-100 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300 border-rose-200 dark:border-rose-800',
};

export const HandShapeGuide: React.FC<HandShapeGuideProps> = ({
  target,
  showAlphabetStrip = true,
  onPickLetter,
}) => {
  const photo = signPhotoUrl(target);
  const letter = signLetter(target);
  const [zoomed, setZoomed] = useState(false);

  // Three letters either side of the current one, wrapped around the alphabet.
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const neighbours = letter
    ? Array.from({ length: 5 }, (_, i) => {
        const idx = (alphabet.indexOf(letter) - 2 + i + 26) % 26;
        return alphabet[idx];
      })
    : [];

  return (
    <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Hand className="w-4.5 h-4.5" />
          </div>
          <div>
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
              Reference Handshape
            </h4>
            <p className="text-sm font-black text-slate-900 dark:text-slate-100">
              {target.label}
              <span className="ml-1.5 text-[10px] font-bold text-indigo-500 dark:text-indigo-400 align-middle">
                {target.system}
              </span>
            </p>
          </div>
        </div>
        <span
          className={`text-[10px] px-2.5 py-1 rounded-full font-bold border ${
            DIFFICULTY_STYLES[target.difficulty] || DIFFICULTY_STYLES.Easy
          }`}
        >
          {target.difficulty}
        </span>
      </div>

      {/* Photo stage */}
      <div className="px-5">
        <div
          className="relative rounded-2xl overflow-hidden border border-slate-200/80 dark:border-slate-700
                     bg-gradient-to-br from-indigo-50 via-white to-slate-100
                     dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/40"
        >
          {/* Grid texture */}
          <div
            className="absolute inset-0 opacity-[0.07] dark:opacity-[0.12] pointer-events-none"
            style={{
              backgroundImage:
                'linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)',
              backgroundSize: '22px 22px',
            }}
          />

          {letter && (
            <div className="absolute top-3 left-3 z-10 w-9 h-9 rounded-xl bg-indigo-600 text-white font-black text-lg flex items-center justify-center shadow-lg shadow-indigo-500/25">
              {letter}
            </div>
          )}

          {photo && (
            <button
              onClick={() => setZoomed(true)}
              className="absolute top-3 right-3 z-10 p-1.5 rounded-lg bg-white/80 dark:bg-slate-800/80 backdrop-blur
                         text-slate-600 dark:text-slate-300 hover:text-indigo-600 border border-slate-200/80 dark:border-slate-600
                         transition-colors cursor-pointer"
              title="Enlarge"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          )}

          <div className="relative h-52 flex items-center justify-center p-4">
            <AnimatePresence mode="wait">
              {photo ? (
                <motion.img
                  key={photo}
                  src={photo}
                  alt={`${target.system} handshape for ${target.label}`}
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.22, ease: 'easeOut' }}
                  className="max-h-full max-w-full object-contain drop-shadow-[0_10px_20px_rgba(15,23,42,0.18)]
                             dark:drop-shadow-[0_10px_24px_rgba(0,0,0,0.55)]"
                />
              ) : (
                <motion.div
                  key="fallback"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center gap-2 text-slate-400 dark:text-slate-500"
                >
                  <div className="text-5xl">{target.visualHint?.match(/\p{Emoji}/u)?.[0] || '🖐️'}</div>
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider">
                    <ImageOff className="w-3 h-3" />
                    No chart photo — phrase sign
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <p className="relative px-4 pb-4 text-[11px] leading-relaxed text-center font-medium text-slate-600 dark:text-slate-300">
            {target.handShapeDescription}
          </p>
        </div>
      </div>

      {/* Neighbouring letters for quick comparison */}
      {showAlphabetStrip && neighbours.length > 0 && (
        <div className="px-5 pt-3">
          <div className="text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1.5">
            Nearby letters
          </div>
          <div className="flex items-center gap-1.5">
            {neighbours.map((ch) => {
              const isCurrent = ch === letter;
              return (
                <button
                  key={ch}
                  onClick={() => onPickLetter?.(ch)}
                  disabled={!onPickLetter}
                  className={`relative flex-1 aspect-square rounded-xl border overflow-hidden transition-all group ${
                    isCurrent
                      ? 'border-indigo-500 ring-2 ring-indigo-400/40 bg-indigo-50 dark:bg-indigo-950/50'
                      : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 hover:border-indigo-300'
                  } ${onPickLetter ? 'cursor-pointer' : 'cursor-default'}`}
                  title={`${target.system} ${ch}`}
                >
                  <img
                    src={letterPhotoUrl(target.system, ch)}
                    alt={ch}
                    className="absolute inset-0 w-full h-full object-contain p-1 group-hover:scale-105 transition-transform"
                    loading="lazy"
                  />
                  <span className="absolute bottom-0.5 right-1 text-[9px] font-black text-slate-500 dark:text-slate-400">
                    {ch}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Form tip */}
      <div className="p-5 pt-3">
        <div className="bg-indigo-50/70 dark:bg-indigo-950/40 p-3 rounded-xl border border-indigo-100 dark:border-indigo-900/50 flex items-start gap-2 text-[11px] text-indigo-900 dark:text-indigo-200">
          <Sparkles className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block mb-0.5">Form tip</span>
            {target.visualHint}
          </div>
        </div>
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {zoomed && photo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setZoomed(false)}
            className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-8 cursor-zoom-out"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
              className="bg-white dark:bg-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <img src={photo} alt={target.label} className="w-full object-contain max-h-[60vh]" />
              <div className="mt-3 text-center">
                <p className="font-black text-slate-900 dark:text-slate-100">
                  {target.label} · {target.system}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {target.handShapeDescription}
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
