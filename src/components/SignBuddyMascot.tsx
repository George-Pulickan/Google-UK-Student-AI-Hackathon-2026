import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ExpressionType, AnimationTriggerType, MascotConfig } from '../types';
import { Volume2, VolumeX, Sparkles, HelpCircle } from 'lucide-react';

interface SignBuddyMascotProps {
  config: MascotConfig;
  expression: ExpressionType;
  animationTrigger: AnimationTriggerType;
  dialogueBubble: string;
  isEvaluating?: boolean;
  onTalkEnd?: () => void;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const SignBuddyMascot: React.FC<SignBuddyMascotProps> = ({
  config,
  expression,
  animationTrigger,
  dialogueBubble,
  isEvaluating = false,
  size = 'lg',
}) => {
  const [speechEnabled, setSpeechEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Text to speech when dialogue bubble changes
  useEffect(() => {
    if (!dialogueBubble || !speechEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(dialogueBubble);
      utterance.rate = 1.05;
      utterance.pitch = 1.2; // Cheerful higher voice for mascot
      
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Speech synthesis error:', e);
    }

    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [dialogueBubble, speechEnabled]);

  const toggleSpeech = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setSpeechEnabled(!speechEnabled);
  };

  // Determine SVG Dimensions based on size
  const sizeMap = {
    sm: 'w-24 h-24',
    md: 'w-40 h-40',
    lg: 'w-56 h-56',
    xl: 'w-72 h-72',
  };

  // Determine mascot primary & secondary colors
  const animalColors = {
    fox: { primary: config.color || '#F97316', secondary: '#FFF1F2', detail: '#C2410C', innerEar: '#FECDD3' },
    bear: { primary: config.color || '#B45309', secondary: '#FEF3C7', detail: '#78350F', innerEar: '#FDE68A' },
    cat: { primary: config.color || '#06B6D4', secondary: '#ECFEFF', detail: '#0E7490', innerEar: '#CFFAFE' },
    panda: { primary: '#1E293B', secondary: '#FFFFFF', detail: '#0F172A', innerEar: '#CBD5E1' },
  }[config.animal || 'fox'];

  // Motion variants for animation triggers
  const mascotVariants = {
    jump_celebrate: {
      y: [0, -28, 0, -18, 0],
      rotate: [0, -6, 6, -3, 0],
      scale: [1, 1.08, 0.95, 1.04, 1],
      transition: { duration: 0.9, repeat: 1, ease: 'easeOut' },
    },
    dance_happy: {
      x: [-12, 12, -10, 10, -5, 5, 0],
      rotate: [-8, 8, -6, 6, -3, 3, 0],
      scale: [1, 1.03, 1, 1.03, 1],
      transition: { duration: 1.2, repeat: Infinity, repeatType: 'reverse' as const },
    },
    demonstrate_sign: {
      y: [0, -6, 0],
      rotate: [-2, 2, 0],
      scale: [1, 1.05, 1],
      transition: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' },
    },
    idle_confused: {
      rotate: [0, -10, 10, -6, 0],
      y: [0, -4, 2, 0],
      transition: { duration: 1.8, repeat: Infinity, ease: 'easeInOut' },
    },
  };

  const currentVariant = mascotVariants[animationTrigger] || mascotVariants.demonstrate_sign;

  return (
    <div className="relative flex flex-col items-center justify-center p-2 select-none">
      {/* Speech Bubble */}
      <AnimatePresence mode="wait">
        {dialogueBubble && (
          <motion.div
            key={dialogueBubble}
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.9 }}
            className="mb-3 max-w-xs md:max-w-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 p-3.5 rounded-2xl shadow-xl border-2 border-indigo-200 dark:border-indigo-800 relative z-20 flex items-start gap-2.5"
          >
            <div className="flex-1 text-sm font-semibold leading-snug">
              <span className="text-xs uppercase tracking-wider text-indigo-600 dark:text-indigo-400 font-extrabold block mb-0.5">
                {config.name || 'SignBuddy'}
              </span>
              "{dialogueBubble}"
            </div>
            
            <button
              onClick={toggleSpeech}
              title={speechEnabled ? 'Mute Buddy voice' : 'Enable Buddy voice'}
              className="p-1.5 rounded-lg bg-indigo-50 dark:bg-slate-700 hover:bg-indigo-100 dark:hover:bg-slate-600 text-indigo-600 dark:text-indigo-300 transition-colors shrink-0"
            >
              {speechEnabled ? <Volume2 className={`w-4 h-4 ${isSpeaking ? 'animate-bounce text-emerald-500' : ''}`} /> : <VolumeX className="w-4 h-4 text-slate-400" />}
            </button>

            {/* Bubble Tail */}
            <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 w-4 h-4 bg-white dark:bg-slate-800 border-r-2 border-b-2 border-indigo-200 dark:border-indigo-800 rotate-45" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating particles or indicators */}
      {animationTrigger === 'jump_celebrate' && (
        <div className="absolute top-10 inset-x-0 flex justify-center pointer-events-none z-10 gap-8">
          <motion.div animate={{ y: [-10, -30], opacity: [1, 0], scale: [0.8, 1.4] }} transition={{ duration: 0.8, repeat: Infinity }}>
            <Sparkles className="w-6 h-6 text-amber-400 fill-amber-300" />
          </motion.div>
          <motion.div animate={{ y: [-5, -25], opacity: [1, 0], scale: [0.7, 1.2] }} transition={{ duration: 0.8, delay: 0.2, repeat: Infinity }}>
            <Sparkles className="w-7 h-7 text-indigo-400 fill-indigo-300" />
          </motion.div>
        </div>
      )}

      {expression === 'CONFUSED' && (
        <motion.div
          animate={{ y: [-5, 5, -5], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 1.2, repeat: Infinity }}
          className="absolute top-8 right-6 z-10 bg-amber-100 dark:bg-amber-900/60 p-1 rounded-full text-amber-600 dark:text-amber-300 shadow-sm"
        >
          <HelpCircle className="w-6 h-6 animate-pulse" />
        </motion.div>
      )}

      {/* Main Mascot SVG Container */}
      <motion.div
        animate={currentVariant}
        className={`${sizeMap[size]} relative flex items-center justify-center cursor-pointer`}
      >
        <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-xl overflow-visible">
          <defs>
            <linearGradient id="mascotBodyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={animalColors.primary} />
              <stop offset="100%" stopColor={animalColors.detail} />
            </linearGradient>
            <linearGradient id="mascotChestGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={animalColors.secondary} />
              <stop offset="100%" stopColor="#FFFFFF" />
            </linearGradient>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Shadow underneath */}
          <ellipse cx="100" cy="188" rx="55" ry="10" fill="#000000" opacity="0.15" />

          {/* Tail (for Fox / Cat) */}
          {(config.animal === 'fox' || config.animal === 'cat') && (
            <motion.path
              d="M140 145 C 180 145, 190 100, 165 90 C 150 85, 140 105, 135 125 Z"
              fill={animalColors.primary}
              animate={{ rotate: [0, 12, -8, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            />
          )}

          {/* Ears */}
          {/* Left Ear */}
          <g>
            <path
              d={
                config.animal === 'bear' || config.animal === 'panda'
                  ? 'M 50 55 C 35 25, 65 20, 75 48 Z'
                  : 'M 45 65 C 25 20, 75 25, 78 58 Z'
              }
              fill={config.animal === 'panda' ? '#1E293B' : animalColors.primary}
              stroke="#0F172A"
              strokeWidth="3.5"
            />
            <path
              d={
                config.animal === 'bear' || config.animal === 'panda'
                  ? 'M 53 50 C 42 32, 62 28, 69 46 Z'
                  : 'M 52 58 C 38 28, 68 32, 72 53 Z'
              }
              fill={animalColors.innerEar}
            />
          </g>

          {/* Right Ear */}
          <g>
            <path
              d={
                config.animal === 'bear' || config.animal === 'panda'
                  ? 'M 150 55 C 165 25, 135 20, 125 48 Z'
                  : 'M 155 65 C 175 20, 125 25, 122 58 Z'
              }
              fill={config.animal === 'panda' ? '#1E293B' : animalColors.primary}
              stroke="#0F172A"
              strokeWidth="3.5"
            />
            <path
              d={
                config.animal === 'bear' || config.animal === 'panda'
                  ? 'M 147 50 C 158 32, 138 28, 131 46 Z'
                  : 'M 148 58 C 162 28, 132 32, 128 53 Z'
              }
              fill={animalColors.innerEar}
            />
          </g>

          {/* Body */}
          <ellipse
            cx="100"
            cy="142"
            rx="52"
            ry="42"
            fill="url(#mascotBodyGrad)"
            stroke="#0F172A"
            strokeWidth="4"
          />

          {/* Chest / Belly */}
          <ellipse
            cx="100"
            cy="148"
            rx="34"
            ry="28"
            fill="url(#mascotChestGrad)"
          />

          {/* Head */}
          <ellipse
            cx="100"
            cy="95"
            rx="54"
            ry="46"
            fill="url(#mascotBodyGrad)"
            stroke="#0F172A"
            strokeWidth="4"
          />

          {/* Snout / Muzzle Area */}
          <ellipse
            cx="100"
            cy="106"
            rx="26"
            ry="18"
            fill={animalColors.secondary}
            stroke="#0F172A"
            strokeWidth="2.5"
          />

          {/* Nose */}
          <path
            d="M 94 98 C 94 94, 106 94, 106 98 C 106 104, 94 104, 94 98 Z"
            fill="#0F172A"
          />

          {/* Panda Eye Patches */}
          {config.animal === 'panda' && (
            <>
              <ellipse cx="78" cy="88" rx="14" ry="11" fill="#1E293B" transform="rotate(-15 78 88)" />
              <ellipse cx="122" cy="88" rx="14" ry="11" fill="#1E293B" transform="rotate(15 122 88)" />
            </>
          )}

          {/* EYES based on Expression */}
          <g id="mascot-eyes">
            {expression === 'CHEERING' ? (
              <>
                {/* Star Eyes */}
                <path d="M 78 82 L 80 87 L 85 87 L 81 90 L 83 95 L 78 92 L 73 95 L 75 90 L 71 87 L 76 87 Z" fill="#F59E0B" />
                <path d="M 122 82 L 124 87 L 129 87 L 125 90 L 127 95 L 122 92 L 117 95 L 119 90 L 115 87 L 120 87 Z" fill="#F59E0B" />
              </>
            ) : expression === 'CONFUSED' ? (
              <>
                {/* One big open eye, one squinted */}
                <circle cx="78" cy="88" r="8" fill="#FFFFFF" stroke="#0F172A" strokeWidth="2" />
                <circle cx="78" cy="88" r="4" fill="#0F172A" />
                <path d="M 114 88 Q 122 82 130 88" stroke="#0F172A" strokeWidth="3.5" strokeLinecap="round" fill="none" />
                {/* Eyebrow raised */}
                <path d="M 70 76 Q 78 70 86 76" stroke="#0F172A" strokeWidth="3" strokeLinecap="round" fill="none" />
              </>
            ) : expression === 'THINKING' ? (
              <>
                {/* Looking up right */}
                <circle cx="78" cy="88" r="8" fill="#FFFFFF" stroke="#0F172A" strokeWidth="2" />
                <circle cx="80" cy="85" r="4" fill="#0F172A" />
                <circle cx="122" cy="88" r="8" fill="#FFFFFF" stroke="#0F172A" strokeWidth="2" />
                <circle cx="124" cy="85" r="4" fill="#0F172A" />
              </>
            ) : (
              <>
                {/* Standard Happy / Showing Sign Eyes */}
                <circle cx="78" cy="88" r="8" fill="#FFFFFF" stroke="#0F172A" strokeWidth="2" />
                <circle cx="79" cy="88" r="4.5" fill="#0F172A" />
                <circle cx="81" cy="86" r="1.5" fill="#FFFFFF" />

                <circle cx="122" cy="88" r="8" fill="#FFFFFF" stroke="#0F172A" strokeWidth="2" />
                <circle cx="121" cy="88" r="4.5" fill="#0F172A" />
                <circle cx="123" cy="86" r="1.5" fill="#FFFFFF" />
              </>
            )}
          </g>

          {/* MOUTH based on Expression */}
          <g id="mascot-mouth">
            {expression === 'CHEERING' || expression === 'HAPPY' ? (
              <path d="M 90 106 Q 100 120 110 106 Z" fill="#EF4444" stroke="#0F172A" strokeWidth="2.5" />
            ) : expression === 'CONFUSED' ? (
              <path d="M 92 110 Q 100 104 108 112" stroke="#0F172A" strokeWidth="3" strokeLinecap="round" fill="none" />
            ) : expression === 'THINKING' ? (
              <circle cx="102" cy="110" r="3.5" fill="#0F172A" />
            ) : (
              <path d="M 92 106 Q 100 115 108 106" stroke="#0F172A" strokeWidth="3" strokeLinecap="round" fill="none" />
            )}
          </g>

          {/* Rosy Cheeks */}
          <circle cx="68" cy="98" r="6" fill="#F43F5E" opacity="0.35" />
          <circle cx="132" cy="98" r="6" fill="#F43F5E" opacity="0.35" />

          {/* ACCESSORIES */}
          {/* Glasses */}
          {config.accessory === 'glasses' && (
            <g id="accessory-glasses">
              <circle cx="78" cy="88" r="13" fill="none" stroke="#0284C7" strokeWidth="3.5" />
              <circle cx="122" cy="88" r="13" fill="none" stroke="#0284C7" strokeWidth="3.5" />
              <line x1="91" y1="88" x2="109" y2="88" stroke="#0284C7" strokeWidth="3.5" />
            </g>
          )}

          {/* Headband */}
          {config.accessory === 'headband' && (
            <g id="accessory-headband">
              <path d="M 48 70 Q 100 60 152 70" stroke="#EC4899" strokeWidth="9" strokeLinecap="round" fill="none" />
              <path d="M 48 70 Q 100 60 152 70" stroke="#FFFFFF" strokeWidth="2" strokeDasharray="6 6" fill="none" />
            </g>
          )}

          {/* Graduation Cap */}
          {config.accessory === 'graduation_cap' && (
            <g id="accessory-cap">
              <polygon points="100,32 150,52 100,72 50,52" fill="#1E1B4B" stroke="#0F172A" strokeWidth="2" />
              <rect x="80" y="62" width="40" height="14" rx="3" fill="#1E1B4B" />
              {/* Tassel */}
              <line x1="100" y1="52" x2="135" y2="68" stroke="#F59E0B" strokeWidth="2.5" />
              <circle cx="135" cy="72" r="3" fill="#F59E0B" />
            </g>
          )}

          {/* Bowtie */}
          {config.accessory === 'bowtie' && (
            <g id="accessory-bowtie">
              <polygon points="100,128 85,120 85,136" fill="#EF4444" stroke="#0F172A" strokeWidth="2" />
              <polygon points="100,128 115,120 115,136" fill="#EF4444" stroke="#0F172A" strokeWidth="2" />
              <circle cx="100" cy="128" r="4" fill="#DC2626" />
            </g>
          )}

          {/* Hands / Paws holding sign or waving */}
          <g id="mascot-paws">
            {expression === 'CHEERING' ? (
              <>
                <circle cx="48" cy="115" r="11" fill={animalColors.primary} stroke="#0F172A" strokeWidth="3" />
                <circle cx="152" cy="115" r="11" fill={animalColors.primary} stroke="#0F172A" strokeWidth="3" />
              </>
            ) : expression === 'SHOWING_CORRECT_SIGN' ? (
              <>
                {/* Left paw resting, right paw holding a thumbs up / sign badge */}
                <circle cx="58" cy="148" r="11" fill={animalColors.primary} stroke="#0F172A" strokeWidth="3" />
                <g transform="translate(142, 130)">
                  <circle cx="0" cy="0" r="14" fill="#22C55E" stroke="#0F172A" strokeWidth="2.5" />
                  <path d="M -5 0 L -1 4 L 6 -4" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                </g>
              </>
            ) : (
              <>
                <circle cx="58" cy="148" r="11" fill={animalColors.primary} stroke="#0F172A" strokeWidth="3" />
                <circle cx="142" cy="148" r="11" fill={animalColors.primary} stroke="#0F172A" strokeWidth="3" />
              </>
            )}
          </g>
        </svg>

        {/* Loading Spinner ring during evaluation */}
        {isEvaluating && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/40 dark:bg-slate-900/40 rounded-full backdrop-blur-xs z-30">
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-white dark:bg-slate-800 px-2.5 py-1 rounded-full shadow-md">
                Analyzing gesture...
              </span>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};
