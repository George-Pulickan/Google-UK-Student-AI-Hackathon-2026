import React from 'react';
import { UserProgress } from '../types';
import { ASL_SIGNS } from '../data/signsData';
import { Trophy, Flame, Award, CheckCircle2, History, Star, Zap } from 'lucide-react';

interface UserProgressViewProps {
  progress: UserProgress;
}

export const UserProgressView: React.FC<UserProgressViewProps> = ({ progress }) => {
  const achievements = [
    {
      id: 'first_sign',
      title: 'First Sign Mastered',
      description: 'Successfully complete your first ASL sign gesture.',
      icon: '🎉',
      unlocked: progress.completedSignIds.length >= 1,
    },
    {
      id: 'five_signs',
      title: 'High Five!',
      description: 'Master at least 5 different sign gestures.',
      icon: '✋',
      unlocked: progress.completedSignIds.length >= 5,
    },
    {
      id: 'alphabet_pro',
      title: 'Alphabet Scholar',
      description: 'Master 10 alphabet letters.',
      icon: '🔤',
      unlocked: progress.completedSignIds.length >= 10,
    },
    {
      id: 'streak_master',
      title: 'Consistent Learner',
      description: 'Maintain a 3-day practice streak.',
      icon: '🔥',
      unlocked: progress.streakDays >= 3,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner: Level & XP Bar */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-3xl font-black border border-white/30 shadow-inner">
              🏅
            </div>
            <div>
              <span className="text-xs font-extrabold uppercase tracking-widest text-indigo-200">
                Level {progress.level}
              </span>
              <h2 className="text-2xl font-black">Sign Language Explorer</h2>
              <p className="text-xs text-indigo-100 mt-0.5">
                {progress.xp} Total XP Earned • {progress.completedSignIds.length} / {ASL_SIGNS.length} Signs Mastered
              </p>
            </div>
          </div>

          <div className="w-full md:w-64 space-y-1.5">
            <div className="flex justify-between text-xs font-bold text-indigo-100">
              <span>Progress to Level {progress.level + 1}</span>
              <span>{progress.xp % 100} / 100 XP</span>
            </div>
            <div className="w-full h-3 bg-black/20 rounded-full overflow-hidden p-0.5 border border-white/20">
              <div
                className="h-full bg-amber-400 rounded-full transition-all duration-500"
                style={{ width: `${(progress.xp % 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Badges Grid */}
      <div>
        <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-100 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Award className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /> Milestone Achievements
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {achievements.map((badge) => (
            <div
              key={badge.id}
              className={`p-4 rounded-2xl border transition-all ${
                badge.unlocked
                  ? 'bg-white dark:bg-slate-800 border-indigo-200 dark:border-indigo-800 shadow-sm'
                  : 'bg-slate-50/60 dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-800 opacity-60'
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl p-2 bg-slate-100 dark:bg-slate-700/60 rounded-xl">
                  {badge.icon}
                </span>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    {badge.title}
                  </h4>
                  <span
                    className={`text-[10px] font-extrabold uppercase ${
                      badge.unlocked ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'
                    }`}
                  >
                    {badge.unlocked ? 'Unlocked' : 'Locked'}
                  </span>
                </div>
              </div>
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                {badge.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Evaluation History Log */}
      <div>
        <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-100 uppercase tracking-wider mb-3 flex items-center gap-2">
          <History className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /> Practice Session History
        </h3>

        {progress.history.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 text-slate-400">
            <History className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-xs font-bold">No practice attempts recorded yet.</p>
            <p className="text-[11px]">Head over to the Camera Studio to test your first sign!</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {progress.history.slice().reverse().map((item, idx) => {
              const sign = ASL_SIGNS.find((s) => s.id === item.targetSignId);
              return (
                <div
                  key={idx}
                  className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                        item.result.is_correct
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                      }`}
                    >
                      {item.result.accuracy_score}%
                    </div>
                    <div>
                      <h4 className="text-xs font-extrabold text-slate-900 dark:text-slate-100">
                        {sign?.label || item.targetSignId}
                      </h4>
                      <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                        "{item.result.feedback_tip}"
                      </p>
                    </div>
                  </div>

                  <span className="text-[10px] font-bold text-slate-400 whitespace-nowrap">
                    {new Date(item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
