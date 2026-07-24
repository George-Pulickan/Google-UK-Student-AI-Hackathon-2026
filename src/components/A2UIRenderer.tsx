import React from 'react';
import { motion } from 'motion/react';
import { A2UIComponent, A2UITone } from '../types';
import { Info, CheckCircle2, AlertTriangle, XOctagon, ArrowRightLeft } from 'lucide-react';

const TONE_STYLES: Record<A2UITone, { box: string; icon: React.ElementType; accent: string }> = {
  info: {
    box: 'bg-sky-50 dark:bg-sky-950/50 border-sky-200 dark:border-sky-900 text-sky-900 dark:text-sky-200',
    icon: Info,
    accent: 'text-sky-500',
  },
  success: {
    box: 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-900 text-emerald-900 dark:text-emerald-200',
    icon: CheckCircle2,
    accent: 'text-emerald-500',
  },
  warning: {
    box: 'bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-200',
    icon: AlertTriangle,
    accent: 'text-amber-500',
  },
  danger: {
    box: 'bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-900 text-rose-900 dark:text-rose-200',
    icon: XOctagon,
    accent: 'text-rose-500',
  },
};

/**
 * Renders the declarative component list returned by /api/any-sign.
 *
 * The model owns the layout decision — which blocks appear, in what order —
 * and this component owns how each block type looks. That split is the whole
 * point of an agent-to-UI contract: the agent never emits markup or styling,
 * only typed intent.
 */
export const A2UIRenderer: React.FC<{ components: A2UIComponent[] }> = ({ components }) => {
  if (!components?.length) return null;

  return (
    <div className="space-y-3">
      {components.map((component, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.06, duration: 0.28 }}
        >
          <A2UIBlock component={component} />
        </motion.div>
      ))}
    </div>
  );
};

const A2UIBlock: React.FC<{ component: A2UIComponent }> = ({ component }) => {
  const tone = (component.tone || 'info') as A2UITone;
  // The model occasionally parks prose in `value` or `title` instead of `text`;
  // accept any of them rather than rendering an empty block.
  const body = component.text || component.value || component.title;

  switch (component.type) {
    case 'heading':
      return (
        <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
          {component.text || component.title || component.value}
        </h3>
      );

    case 'text':
      return (
        <div>
          {component.title && component.text && (
            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">
              {component.title}
            </h4>
          )}
          <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300 font-medium">
            {component.text || component.value}
          </p>
        </div>
      );

    case 'stat': {
      const styles = TONE_STYLES[tone];
      return (
        <div className={`inline-flex items-baseline gap-2.5 px-4 py-2.5 rounded-2xl border ${styles.box}`}>
          <span className="text-[10px] font-black uppercase tracking-widest opacity-70">
            {component.label || 'Confidence'}
          </span>
          <span className="text-2xl font-black tabular-nums">{component.value}</span>
        </div>
      );
    }

    case 'callout': {
      const styles = TONE_STYLES[tone];
      const Icon = styles.icon;
      return (
        <div className={`p-3.5 rounded-2xl border flex items-start gap-2.5 ${styles.box}`}>
          <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${styles.accent}`} />
          <p className="text-xs font-semibold leading-relaxed">{body}</p>
        </div>
      );
    }

    case 'steps':
      return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
          {component.title && (
            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2.5">
              {component.title}
            </h4>
          )}
          <ol className="space-y-2">
            {(component.items || []).map((item, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-300 text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300 leading-relaxed">
                  {item}
                </span>
              </li>
            ))}
          </ol>
        </div>
      );

    case 'chips':
      return (
        <div>
          {component.title && (
            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1.5">
              {component.title}
            </h4>
          )}
          <div className="flex flex-wrap gap-1.5">
            {(component.items || []).map((item, i) => (
              <span
                key={i}
                className="px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300
                           border border-indigo-200 dark:border-indigo-900 text-[11px] font-bold"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      );

    case 'comparison':
      return (
        <div className="bg-violet-50/60 dark:bg-violet-950/40 rounded-2xl border border-violet-200 dark:border-violet-900 p-4">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-violet-500 dark:text-violet-400 mb-2 flex items-center gap-1.5">
            <ArrowRightLeft className="w-3 h-3" />
            {component.title || 'Easily confused with'}
          </h4>
          <ul className="space-y-1.5">
            {(component.items || []).map((item, i) => (
              <li
                key={i}
                className="text-xs font-medium text-violet-900 dark:text-violet-200 leading-relaxed pl-3 border-l-2 border-violet-300 dark:border-violet-800"
              >
                {item}
              </li>
            ))}
          </ul>
        </div>
      );

    default:
      return null;
  }
};
