import React, { useState } from 'react';
import { getSignTargets } from '../data/signsData';
import { SignTarget, SignEvaluationResult, MascotConfig, SignLanguageSystem } from '../types';
import { CameraPracticeStudio } from './CameraPracticeStudio';
import { Flame, Trophy, Award, Zap, RefreshCw, CheckCircle } from 'lucide-react';

interface SignQuizChallengeProps {
  mascotConfig: MascotConfig;
  signSystem: SignLanguageSystem;
  onEvaluationComplete: (sign: SignTarget, result: SignEvaluationResult) => void;
  streakDays: number;
  xp: number;
}

export const SignQuizChallenge: React.FC<SignQuizChallengeProps> = ({
  mascotConfig,
  signSystem,
  onEvaluationComplete,
  streakDays,
  xp,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [totalAttempted, setTotalAttempted] = useState(0);

  const signsList = getSignTargets(signSystem);
  const currentSign = signsList[currentIndex % signsList.length];

  const handleNextQuestion = () => {
    setCurrentIndex((prev) => (prev + 1) % signsList.length);
  };

  const handleQuizEvaluation = (sign: SignTarget, result: SignEvaluationResult) => {
    setTotalAttempted((prev) => prev + 1);
    if (result.is_correct) {
      setScore((prev) => prev + 1);
    }
    onEvaluationComplete(sign, result);
  };

  return (
    <div className="space-y-6">
      {/* Quiz Progress & Stats Header */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
            <Flame className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
              Daily Streak
            </span>
            <span className="text-xl font-black text-slate-900 dark:text-slate-100">
              {streakDays} Days
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
              Total XP
            </span>
            <span className="text-xl font-black text-slate-900 dark:text-slate-100">
              {xp} XP
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
              Quiz Accuracy
            </span>
            <span className="text-xl font-black text-slate-900 dark:text-slate-100">
              {totalAttempted > 0 ? Math.round((score / totalAttempted) * 100) : 0}%
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
              Quiz ({signSystem})
            </span>
            <span className="text-xl font-black text-slate-900 dark:text-slate-100">
              {score} / {totalAttempted}
            </span>
          </div>
          <button
            onClick={handleNextQuestion}
            className="p-2.5 bg-indigo-50 dark:bg-indigo-950/80 hover:bg-indigo-100 text-indigo-600 dark:text-indigo-300 rounded-xl transition-colors cursor-pointer"
            title="Next Quiz Sign"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Embedded Practice Camera for Current Quiz Sign */}
      <CameraPracticeStudio
        initialSign={currentSign}
        mascotConfig={mascotConfig}
        signSystem={signSystem}
        onEvaluationComplete={handleQuizEvaluation}
      />
    </div>
  );
};
