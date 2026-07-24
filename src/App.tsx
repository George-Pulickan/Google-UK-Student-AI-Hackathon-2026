import React, { useState, useEffect } from 'react';
import {
  SignTarget,
  SignEvaluationResult,
  MascotConfig,
  UserProgress,
  SignLanguageSystem,
} from './types';
import { getSignTargets } from './data/signsData';
import { CameraPracticeStudio } from './components/CameraPracticeStudio';
import { AnySignStudio } from './components/AnySignStudio';
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
  Sparkles,
  Wand2,
  Volume2,
  VolumeX,
} from 'lucide-react';

type TabId = 'camera' | 'anysign' | 'dictionary' | 'quiz' | 'customizer' | 'progress';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('camera');
  const [signSystem, setSignSystem] = useState<SignLanguageSystem>('ASL');
  const [selectedPracticeSign, setSelectedPracticeSign] = useState<SignTarget>(
    getSignTargets('ASL')[0]
  );

  // Theme: remembered across sessions, seeded from the OS preference.
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('signbuddy_dark_mode');
    if (saved !== null) return saved === 'true';
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  });

  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(
    () => localStorage.getItem('signbuddy_voice_enabled') !== 'false'
  );

  // Sync practice sign when language changes
  useEffect(() => {
    const available = getSignTargets(signSystem);
    setSelectedPracticeSign(available[0]);
  }, [signSystem]);

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

  // Drive the `dark` class on <html>; index.css points Tailwind's dark:
  // variant at that class, and color-scheme keeps native controls in step.
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('signbuddy_dark_mode', String(darkMode));
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem('signbuddy_voice_enabled', String(voiceEnabled));
  }, [voiceEnabled]);

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

  const currentSignsCount = getSignTargets(signSystem).length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-sans transition-colors duration-200 pb-12">
      {/* Top App Bar Header */}
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Brand Title & ASL/BSL Switcher */}
          <div className="flex items-center gap-4">
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
                  {signSystem} Sign Language Tutor
                </p>
              </div>
            </div>

            {/* TOP ASL / BSL TOGGLE SWITCH */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-700/80 p-1 rounded-xl border border-slate-200 dark:border-slate-600 shadow-inner">
              <button
                onClick={() => setSignSystem('ASL')}
                className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  signSystem === 'ASL'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-indigo-600'
                }`}
              >
                ASL
              </button>
              <button
                onClick={() => setSignSystem('BSL')}
                className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  signSystem === 'BSL'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-indigo-600'
                }`}
              >
                BSL
              </button>
            </div>
          </div>

          {/* Daily Goal & Stats */}
          <div className="flex items-center gap-3 sm:gap-6">
            <div className="hidden md:flex flex-col items-end">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">
                {signSystem} MASTERY
              </span>
              <div className="w-36 sm:w-48 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 transition-all duration-500"
                  style={{
                    width: `${Math.min(100, (userProgress.completedSignIds.length / currentSignsCount) * 100)}%`,
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
                onClick={() => setVoiceEnabled((v) => !v)}
                className={`p-2 rounded-xl transition-colors cursor-pointer ${
                  voiceEnabled
                    ? 'bg-indigo-100 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-900'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
                }`}
                title={voiceEnabled ? 'Mute the coaching voice' : 'Unmute the coaching voice'}
              >
                {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>

              <button
                onClick={() => setDarkMode((v) => !v)}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors cursor-pointer"
                title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
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
            { id: 'anysign', label: 'Any Sign', icon: Wand2 },
            { id: 'dictionary', label: `${signSystem} Dictionary`, icon: BookOpen },
            { id: 'quiz', label: 'Quiz Challenge', icon: Trophy },
            { id: 'customizer', label: `Mascot (${mascotConfig.name})`, icon: Palette },
            { id: 'progress', label: 'Progress & Badges', icon: Sparkles },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabId)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer ${
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
            signSystem={signSystem}
            voiceEnabled={voiceEnabled}
            onToggleVoice={() => setVoiceEnabled((v) => !v)}
            onEvaluationComplete={handleEvaluationComplete}
          />
        )}

        {activeTab === 'anysign' && (
          <AnySignStudio
            mascotConfig={mascotConfig}
            signSystem={signSystem}
            voiceEnabled={voiceEnabled}
          />
        )}

        {activeTab === 'dictionary' && (
          <SignDictionary
            signSystem={signSystem}
            onSelectSignForPractice={navigateToCameraWithSign}
            completedSignIds={userProgress.completedSignIds}
          />
        )}

        {activeTab === 'quiz' && (
          <SignQuizChallenge
            mascotConfig={mascotConfig}
            signSystem={signSystem}
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
