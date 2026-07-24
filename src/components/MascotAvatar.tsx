import React from 'react';
import { motion } from 'motion/react';
import { ExpressionType, MascotConfig } from '../types';

interface MascotAvatarProps {
  config: MascotConfig;
  expression?: ExpressionType;
  size?: number;
  speaking?: boolean;
}

const ANIMAL_PALETTE: Record<string, { primary: string; detail: string; belly: string; ear: string }> = {
  fox: { primary: '#F97316', detail: '#C2410C', belly: '#FFF1F2', ear: '#FECDD3' },
  bear: { primary: '#B45309', detail: '#78350F', belly: '#FEF3C7', ear: '#FDE68A' },
  cat: { primary: '#06B6D4', detail: '#0E7490', belly: '#ECFEFF', ear: '#CFFAFE' },
  panda: { primary: '#1E293B', detail: '#0F172A', belly: '#FFFFFF', ear: '#CBD5E1' },
};

/**
 * Compact head-and-shoulders version of the mascot for inline placements
 * where the full character plus speech bubble would be too heavy.
 */
export const MascotAvatar: React.FC<MascotAvatarProps> = ({
  config,
  expression = 'HAPPY',
  size = 72,
  speaking = false,
}) => {
  const palette = ANIMAL_PALETTE[config.animal] || ANIMAL_PALETTE.fox;
  const primary = config.animal === 'panda' ? palette.primary : config.color || palette.primary;

  if (config.generatedImage) {
    return (
      <motion.div
        animate={speaking ? { scale: [1, 1.05, 1] } : { scale: 1 }}
        transition={{ duration: 0.6, repeat: speaking ? Infinity : 0 }}
        className="rounded-2xl overflow-hidden border-2 border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-900 shrink-0"
        style={{ width: size, height: size }}
      >
        <img src={config.generatedImage} alt={config.name || 'Mascot'} className="w-full h-full object-cover" />
      </motion.div>
    );
  }

  const isHappy = expression === 'HAPPY' || expression === 'CHEERING';
  const isConfused = expression === 'CONFUSED';

  return (
    <motion.svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      animate={
        speaking
          ? { rotate: [0, -3, 3, 0] }
          : isConfused
          ? { rotate: [0, -6, 6, 0] }
          : { y: [0, -2, 0] }
      }
      transition={{ duration: speaking ? 0.7 : 2.2, repeat: Infinity, ease: 'easeInOut' }}
      className="shrink-0 drop-shadow-md"
    >
      {/* Ears */}
      <path d="M 22 34 C 12 8, 42 12, 42 32 Z" fill={primary} stroke="#0F172A" strokeWidth="3" />
      <path d="M 78 34 C 88 8, 58 12, 58 32 Z" fill={primary} stroke="#0F172A" strokeWidth="3" />
      <path d="M 27 31 C 22 17, 36 19, 37 30 Z" fill={palette.ear} />
      <path d="M 73 31 C 78 17, 64 19, 63 30 Z" fill={palette.ear} />

      {/* Head */}
      <ellipse cx="50" cy="56" rx="34" ry="31" fill={primary} stroke="#0F172A" strokeWidth="3.5" />
      <ellipse cx="50" cy="64" rx="22" ry="19" fill={palette.belly} />

      {/* Panda eye patches */}
      {config.animal === 'panda' && (
        <>
          <ellipse cx="38" cy="52" rx="10" ry="12" fill="#0F172A" />
          <ellipse cx="62" cy="52" rx="10" ry="12" fill="#0F172A" />
        </>
      )}

      {/* Eyes */}
      {isHappy ? (
        <>
          <path d="M 32 52 Q 38 45 44 52" stroke="#0F172A" strokeWidth="3.5" fill="none" strokeLinecap="round" />
          <path d="M 56 52 Q 62 45 68 52" stroke="#0F172A" strokeWidth="3.5" fill="none" strokeLinecap="round" />
        </>
      ) : (
        <>
          <circle cx="38" cy="52" r="5" fill="#0F172A" />
          <circle cx="62" cy="52" r="5" fill="#0F172A" />
          <circle cx="39.6" cy="50.2" r="1.8" fill="#FFFFFF" />
          <circle cx="63.6" cy="50.2" r="1.8" fill="#FFFFFF" />
        </>
      )}

      {/* Muzzle */}
      <ellipse cx="50" cy="63" rx="4.5" ry="3.4" fill="#0F172A" />
      {speaking ? (
        <motion.ellipse
          cx="50"
          cy="73"
          rx="6"
          fill="#0F172A"
          animate={{ ry: [1.5, 5, 2.5, 4.5, 1.5] }}
          transition={{ duration: 0.55, repeat: Infinity }}
        />
      ) : isConfused ? (
        <path d="M 44 74 Q 50 69 56 74" stroke="#0F172A" strokeWidth="2.8" fill="none" strokeLinecap="round" />
      ) : (
        <path d="M 44 70 Q 50 76 56 70" stroke="#0F172A" strokeWidth="2.8" fill="none" strokeLinecap="round" />
      )}

      {isConfused && (
        <text x="80" y="26" fontSize="20" fontWeight="bold" fill="#F59E0B">
          ?
        </text>
      )}
    </motion.svg>
  );
};
