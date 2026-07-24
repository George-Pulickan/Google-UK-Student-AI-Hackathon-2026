import React, { useState, useEffect } from 'react';
import { SignTarget, SignEvaluationResult, MascotConfig, UserProgress } from './types';
import { ASL_SIGNS } from './data/signsData';
import { CameraPracticeStudio } from './components/CameraPracticeStudio';
import { SignDictionary } from './components/SignDictionary';
import { SignQuizChallenge } from './components/SignQuizChallenge';
import { MascotCustomizer } from './components/MascotCustomizer';
import { UserProgressView } from './components/UserProgressView';
import {
  Camera,
  BookOpen,
  Trophy,
  Palette,
  Flame,
  Zap,
  Moon,
  Sun,
  Hand,
  Sparkles,
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'camera' | 'dictionary' | 'quiz' | 'customizer' | 'progress'>('camera');
  const [selectedPracticeSign, setSelectedPracticeSign] = useState<SignTarget>(ASL_SIGNS[0]);
  const [darkMode, setDarkMode] = useState(false);

  // Mascot Config State
  const [mascotConfig, setMascotConfig] = useState<MascotConfig>(() => {
    const saved = localStorage.getItem('signbuddy_mascot_config');
    return saved
      ? JSON.parse(saved)
      : {
          name: 'Buddy',
          animal: 'fox',
          color: '#F97316',
          accessory: 'glasses',
          outfit: 'classic',
        };
  });

  // User Progress State
  const [userProgress, setUserProgress] = useState<UserProgress>(() => {
    const saved = localStorage.getItem('signbuddy_user_progress');
    return saved
      ? JSON.parse(saved)
      : {
          totalPracticed: 3,
          correctSignsCount: 2,
          streakDays: 3,
          xp: 80,
          level: 1,
          completedSignIds: ['A', 'HELLO'],
          history: [],
        };
  });

  // Save to LocalStorage
  useEffect(() => {
    localStorage.setItem('signbuddy_mascot_config', JSON.stringify(mascotConfig));
  }, [mascotConfig]);

  useEffect(() => {
    localStorage.setItem('signbuddy_user_progress', JSON.stringify(userProgress));
  }, [userProgress]);

  // Dark Mode Toggle
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Handle Evaluation Result
  const handleEvaluationComplete = (sign: SignTarget, result: SignEvaluationResult) => {
    setUserProgress((prev) => {
      const isNewSuccess = result.is_correct && !prev.completedSignIds.includes(sign.id);
      const newCompleted = isNewSuccess
        ? [...prev.completedSignIds, sign.id]
        : prev.completedSignIds;

      const earnedXp = result.is_correct ? 25 : 5;
      const newXp = prev.xp + earnedXp;
      const newLevel = Math.floor(newXp / 100) + 1;

      const newHistoryItem = {
        targetSignId: sign.id,
        result: result,
        date: new Date().toISOString(),
      };

      return {
        ...prev,
        totalPracticed: prev.totalPracticed + 1,
        correctSignsCount: result.is_correct ? prev.correctSignsCount + 1 : prev.correctSignsCount,
        completedSignIds: newCompleted,
        xp: newXp,
        level: newLevel,
        history: [...prev.history, newHistoryItem],
      };
    });
  };

  const navigateToCameraWithSign = (sign: SignTarget) => {
    setSelectedPracticeSign(sign);
    setActiveTab('camera');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-sans transition-colors duration-200 pb-12">
      {/* Top App Bar Header */}
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Brand Title */}
          <div
            onClick={() => setActiveTab('camera')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200 dark:shadow-none group-hover:scale-105 transition-transform">
              <span className="text-xl text-white">🖐️</span>
            </div>
            <div>
              <h1 className="font-bold text-xl tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
                SignBuddy <span className="text-indigo-600 dark:text-indigo-400">AI</span>
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-widest hidden sm:block">
                Interactive ASL Tutor
              </p>
            </div>
          </div>

          {/* Daily Goal & Stats */}
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="hidden md:flex flex-col items-end">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">
                DAILY MASTERY
              </span>
              <div className="w-36 sm:w-48 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 transition-all duration-500"
                  style={{
                    width: `${Math.min(100, (userProgress.completedSignIds.length / ASL_SIGNS.length) * 100)}%`,
                  }}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-xs font-bold">
                <Flame className="w-4 h-4 fill-amber-500 text-amber-500" />
                <span>{userProgress.streakDays}d Streak</span>
              </div>

              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-bold">
                <Zap className="w-4 h-4 fill-indigo-500 text-indigo-500" />
                <span>{userProgress.xp} XP</span>
              </div>

              <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                title="Toggle theme"
              >
                {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-2 overflow-x-auto py-2.5 border-t border-slate-100 dark:border-slate-700/60">
          {[
            { id: 'camera', label: 'Camera Studio', icon: Camera },
            { id: 'dictionary', label: 'Sign Dictionary', icon: BookOpen },
            { id: 'quiz', label: 'Quiz Challenge', icon: Trophy },
            { id: 'customizer', label: `Mascot (${mascotConfig.name})`, icon: Palette },
            { id: 'progress', label: 'Progress & Badges', icon: Sparkles },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-none'
                    : 'bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {activeTab === 'camera' && (
          <CameraPracticeStudio
            initialSign={selectedPracticeSign}
            mascotConfig={mascotConfig}
            onEvaluationComplete={handleEvaluationComplete}
          />
        )}

        {activeTab === 'dictionary' && (
          <SignDictionary
            onSelectSignForPractice={navigateToCameraWithSign}
            completedSignIds={userProgress.completedSignIds}
          />
        )}

        {activeTab === 'quiz' && (
          <SignQuizChallenge
            mascotConfig={mascotConfig}
            onEvaluationComplete={handleEvaluationComplete}
            streakDays={userProgress.streakDays}
            xp={userProgress.xp}
          />
        )}

        {activeTab === 'customizer' && (
          <MascotCustomizer
            config={mascotConfig}
            onChange={setMascotConfig}
            onClose={() => setActiveTab('camera')}
          />
        )}

        {activeTab === 'progress' && (
          <UserProgressView progress={userProgress} />
        )}
      </main>
    </div>
  );
}
