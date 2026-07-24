import React, { useState, useEffect } from 'react';
import { getSignTargets } from '../data/signsData';
import { SignTarget, SignCategory, SignLanguageSystem } from '../types';
import { HandShapeGuide } from './HandShapeGuide';
import { Search, BookOpen, Camera, CheckCircle2, ChevronRight, Hand, Sparkles } from 'lucide-react';

interface SignDictionaryProps {
  signSystem: SignLanguageSystem;
  onSelectSignForPractice: (sign: SignTarget) => void;
  completedSignIds: string[];
}

export const SignDictionary: React.FC<SignDictionaryProps> = ({
  signSystem,
  onSelectSignForPractice,
  completedSignIds,
}) => {
  const signsList = getSignTargets(signSystem);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<SignCategory | 'All'>('All');
  const [activeSign, setActiveSign] = useState<SignTarget>(signsList[0]);

  useEffect(() => {
    const list = getSignTargets(signSystem);
    if (!list.find((s) => s.id === activeSign.id)) {
      setActiveSign(list[0]);
    }
  }, [signSystem]);

  const filteredSigns = signsList.filter((sign) => {
    const matchesCategory = selectedCategory === 'All' || sign.category === selectedCategory;
    const matchesSearch =
      sign.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sign.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sign.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Search and Category Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search ${signSystem} signs...`}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 font-medium"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {(['All', 'Alphabet', 'Phrases'] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                selectedCategory === cat
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: List on Left, Active Details on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Cards List */}
        <div className="lg:col-span-5 space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
          {filteredSigns.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-400">
              <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-xs font-bold">No signs found matching your search.</p>
            </div>
          ) : (
            filteredSigns.map((sign) => {
              const isCompleted = completedSignIds.includes(sign.id);
              const isSelected = activeSign.id === sign.id;

              return (
                <div
                  key={sign.id}
                  onClick={() => setActiveSign(sign)}
                  className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 shadow-sm'
                      : 'border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-800 hover:border-indigo-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${
                        isCompleted
                          ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                          : 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300'
                      }`}
                    >
                      {sign.id.length <= 2 ? sign.id : sign.id.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                          {sign.label}
                        </h4>
                        {isCompleted && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        )}
                      </div>
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        {sign.category} • {sign.difficulty}
                      </span>
                    </div>
                  </div>

                  <ChevronRight className={`w-4 h-4 ${isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-300'}`} />
                </div>
              );
            })
          )}
        </div>

        {/* Right: Active Sign Details Card with Hand Shape Guide */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-xl border border-indigo-100 dark:border-slate-700 space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-[10px] font-extrabold uppercase">
                    {activeSign.category} • {activeSign.system}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-bold">
                    Difficulty: {activeSign.difficulty}
                  </span>
                </div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100">
                  {activeSign.label}
                </h2>
              </div>

              <button
                onClick={() => onSelectSignForPractice(activeSign)}
                className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-2xl font-bold text-xs shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2 hover:scale-102 cursor-pointer"
              >
                <Camera className="w-4 h-4" /> Practice with AI Camera
              </button>
            </div>

            {/* Hand Shape Diagram */}
            <HandShapeGuide target={activeSign} />

            {/* Full How To Perform */}
            <div>
              <h3 className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Hand className="w-4 h-4" /> How to Perform This Sign
              </h3>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300 leading-relaxed bg-indigo-50/50 dark:bg-indigo-950/30 p-3.5 rounded-2xl border border-indigo-100 dark:border-indigo-900/40">
                {activeSign.description}
              </p>
            </div>

            {/* Key Physical Tips */}
            <div>
              <h3 className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" /> Key Alignment Rules
              </h3>
              <ul className="space-y-2">
                {activeSign.keyTips.map((tip, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300"
                  >
                    <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-extrabold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
