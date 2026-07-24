import React from 'react';
import { SignTarget } from '../types';
import { Hand, Sparkles, HelpCircle } from 'lucide-react';

interface HandShapeGuideProps {
  target: SignTarget;
}

export const HandShapeGuide: React.FC<HandShapeGuideProps> = ({ target }) => {
  const type = target.handShapeIllustrationType || 'default';

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm">
            <Hand className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Target Hand Diagram
            </h4>
            <p className="text-sm font-black text-slate-900 dark:text-slate-100">
              {target.label} ({target.system})
            </p>
          </div>
        </div>
        <span className="text-xs px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold">
          {target.difficulty}
        </span>
      </div>

      {/* Hand Shape SVG Diagram Container */}
      <div className="w-full bg-slate-900 rounded-xl p-4 flex flex-col items-center justify-center relative min-h-[140px] border border-slate-800 group">
        <div className="absolute top-2 right-2 text-[10px] font-bold text-indigo-300 bg-indigo-950/80 px-2 py-0.5 rounded-md border border-indigo-800">
          FORM GUIDE
        </div>

        {/* Dynamic Graphic Representation */}
        <div className="my-2 flex items-center justify-center">
          <RenderHandShapeIllustration illustrationType={type} label={target.id} />
        </div>

        <p className="text-xs text-center text-slate-300 font-medium px-2 mt-1">
          {target.handShapeDescription}
        </p>
      </div>

      {/* Visual Hint / Quick Tip */}
      <div className="bg-indigo-50/60 dark:bg-indigo-950/40 p-3 rounded-xl border border-indigo-100 dark:border-indigo-900/50 flex items-start gap-2 text-xs text-indigo-900 dark:text-indigo-200">
        <Sparkles className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold block mb-0.5">Form Tip:</span>
          {target.visualHint}
        </div>
      </div>
    </div>
  );
};

// Illustrative Hand Diagram Renderer
function RenderHandShapeIllustration({
  illustrationType,
  label,
}: {
  illustrationType: string;
  label: string;
}) {
  switch (illustrationType) {
    case 'fist_thumb_side':
      return (
        <svg className="w-24 h-24 text-amber-400" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="3">
          {/* Closed Fist with vertical thumb */}
          <rect x="30" y="35" width="40" height="45" rx="12" fill="currentColor" fillOpacity="0.2" />
          <path d="M 35 45 Q 50 48 65 45" strokeLinecap="round" />
          <path d="M 35 55 Q 50 58 65 55" strokeLinecap="round" />
          <path d="M 35 65 Q 50 68 65 65" strokeLinecap="round" />
          {/* Vertical Thumb on left side */}
          <path d="M 28 80 L 28 35 Q 28 25 35 25 Q 42 25 42 35 L 42 50" fill="currentColor" fillOpacity="0.4" strokeWidth="3.5" />
          <circle cx="35" cy="25" r="4" fill="#38BDF8" />
        </svg>
      );

    case 'open_palm_thumb_in':
    case 'open_palm':
      return (
        <svg className="w-24 h-24 text-indigo-400" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="3">
          {/* Extended 4 fingers */}
          <rect x="32" y="20" width="8" height="40" rx="4" fill="currentColor" fillOpacity="0.3" />
          <rect x="42" y="15" width="8" height="45" rx="4" fill="currentColor" fillOpacity="0.3" />
          <rect x="52" y="18" width="8" height="42" rx="4" fill="currentColor" fillOpacity="0.3" />
          <rect x="62" y="25" width="8" height="35" rx="4" fill="currentColor" fillOpacity="0.3" />
          {/* Palm base */}
          <path d="M 30 55 L 72 55 L 68 85 L 34 85 Z" fill="currentColor" fillOpacity="0.2" />
          {/* Thumb crossed over palm */}
          <path d="M 30 75 Q 50 60 62 68" stroke="#F59E0B" strokeWidth="4" strokeLinecap="round" />
        </svg>
      );

    case 'c_curve':
      return (
        <svg className="w-24 h-24 text-emerald-400" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="3.5">
          {/* C curve arch */}
          <path d="M 65 25 C 20 20 20 80 65 75" fill="none" stroke="currentColor" strokeLinecap="round" />
          <circle cx="65" cy="25" r="6" fill="#10B981" />
          <circle cx="65" cy="75" r="6" fill="#10B981" />
          <text x="35" y="55" fill="white" fontSize="14" fontWeight="bold">C</text>
        </svg>
      );

    case 'pointing_loop':
      return (
        <svg className="w-24 h-24 text-purple-400" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="3">
          {/* Index pointing straight up */}
          <rect x="46" y="15" width="10" height="40" rx="5" fill="currentColor" fillOpacity="0.3" />
          {/* Circular loop below */}
          <circle cx="51" cy="65" r="18" fill="currentColor" fillOpacity="0.2" stroke="#A855F7" strokeWidth="3" />
        </svg>
      );

    case 'ok_sign':
      return (
        <svg className="w-24 h-24 text-cyan-400" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="3">
          {/* OK circle */}
          <circle cx="38" cy="60" r="14" stroke="#06B6D4" strokeWidth="3.5" fill="currentColor" fillOpacity="0.2" />
          {/* 3 extended fingers */}
          <line x1="52" y1="50" x2="68" y2="20" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
          <line x1="58" y1="55" x2="78" y2="28" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
          <line x1="62" y1="62" x2="84" y2="40" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
        </svg>
      );

    case 'v_shape':
      return (
        <svg className="w-24 h-24 text-amber-400" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="3.5">
          {/* V fingers */}
          <line x1="50" y1="60" x2="30" y2="20" stroke="currentColor" strokeLinecap="round" />
          <line x1="50" y1="60" x2="70" y2="20" stroke="currentColor" strokeLinecap="round" />
          {/* Fist base */}
          <circle cx="50" cy="72" r="16" fill="currentColor" fillOpacity="0.3" />
        </svg>
      );

    case 'bsl_a':
    case 'bsl_e':
      return (
        <svg className="w-24 h-24 text-rose-400" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="3">
          {/* Non dominant hand base */}
          <path d="M 20 65 L 75 65" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
          {/* Vowels fingertips */}
          <circle cx="25" cy="50" r="5" fill="#F43F5E" />
          <circle cx="38" cy="45" r="5" fill="#38BDF8" />
          <circle cx="50" cy="42" r="5" fill="#10B981" />
          <circle cx="62" cy="45" r="5" fill="#F59E0B" />
          <circle cx="74" cy="50" r="5" fill="#A855F7" />
          {/* Dominant pointing finger touching */}
          <path d="M 25 15 L 25 45" stroke="#F43F5E" strokeWidth="4" strokeLinecap="round" />
          <circle cx="25" cy="45" r="3" fill="white" />
        </svg>
      );

    case 'bsl_b':
      return (
        <svg className="w-24 h-24 text-emerald-400" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="3">
          {/* Two joined circles */}
          <circle cx="38" cy="50" r="16" stroke="currentColor" strokeWidth="3.5" fill="currentColor" fillOpacity="0.2" />
          <circle cx="62" cy="50" r="16" stroke="currentColor" strokeWidth="3.5" fill="currentColor" fillOpacity="0.2" />
        </svg>
      );

    case 'bsl_d':
      return (
        <svg className="w-24 h-24 text-sky-400" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="3">
          {/* Vertical stem */}
          <line x1="38" y1="20" x2="38" y2="80" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
          {/* Arched belly on right */}
          <path d="M 38 25 C 75 25 75 75 38 75" fill="none" stroke="#38BDF8" strokeWidth="4" strokeLinecap="round" />
        </svg>
      );

    default:
      return (
        <div className="w-20 h-20 rounded-full bg-indigo-900/80 border-2 border-indigo-400 flex items-center justify-center text-3xl font-black text-indigo-300 shadow-inner">
          {label}
        </div>
      );
  }
}
