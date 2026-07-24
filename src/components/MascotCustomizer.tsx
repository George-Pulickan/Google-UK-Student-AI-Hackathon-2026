import React from 'react';
import { MascotConfig, MascotAnimal, MascotAccessory, MascotOutfit } from '../types';
import { SignBuddyMascot } from './SignBuddyMascot';
import { Sparkles, Palette, Smile, Glasses, UserCheck } from 'lucide-react';

interface MascotCustomizerProps {
  config: MascotConfig;
  onChange: (updated: MascotConfig) => void;
  onClose?: () => void;
}

export const MascotCustomizer: React.FC<MascotCustomizerProps> = ({ config, onChange, onClose }) => {
  const animals: Array<{ id: MascotAnimal; name: string; emoji: string }> = [
    { id: 'fox', name: 'Fiery Fox', emoji: '🦊' },
    { id: 'bear', name: 'Honey Bear', emoji: '🐻' },
    { id: 'cat', name: 'Cyan Cat', emoji: '🐱' },
    { id: 'panda', name: 'Playful Panda', emoji: '🐼' },
  ];

  const colorPresets = [
    { label: 'Orange', hex: '#F97316' },
    { label: 'Brown', hex: '#B45309' },
    { label: 'Cyan', hex: '#06B6D4' },
    { label: 'Purple', hex: '#8B5CF6' },
    { label: 'Rose', hex: '#F43F5E' },
    { label: 'Emerald', hex: '#10B981' },
    { label: 'Gold', hex: '#EAB308' },
  ];

  const accessories: Array<{ id: MascotAccessory; name: string; icon: string }> = [
    { id: 'none', name: 'None', icon: '❌' },
    { id: 'glasses', name: 'Smart Glasses', icon: '👓' },
    { id: 'headband', name: 'Sport Headband', icon: '🎗️' },
    { id: 'graduation_cap', name: 'Tutor Cap', icon: '🎓' },
    { id: 'bowtie', name: 'Red Bowtie', icon: '🎀' },
  ];

  return (
    <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-2xl border border-indigo-100 dark:border-slate-700 max-w-2xl mx-auto">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-700 mb-6">
        <div className="flex items-center gap-2">
          <div className="p-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Customize Your Mascot</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Personalize your AI Sign Buddy coach</p>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
          >
            <UserCheck className="w-4 h-4" /> Save & Continue
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
        {/* Mascot Live Preview */}
        <div className="md:col-span-5 flex flex-col items-center justify-center bg-gradient-to-b from-indigo-50/50 to-purple-50/50 dark:from-slate-900 dark:to-indigo-950/40 p-6 rounded-2xl border border-indigo-100 dark:border-slate-700">
          <SignBuddyMascot
            config={config}
            expression="CHEERING"
            animationTrigger="jump_celebrate"
            dialogueBubble={`Hi! I'm ${config.name || 'Buddy'}! Let's learn Sign Language together!`}
            size="lg"
          />

          <div className="mt-4 w-full">
            <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">
              Mascot Name
            </label>
            <input
              type="text"
              value={config.name}
              onChange={(e) => onChange({ ...config, name: e.target.value })}
              className="w-full px-3.5 py-2 bg-white dark:bg-slate-800 border-2 border-indigo-200 dark:border-slate-600 rounded-xl text-center text-sm font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
              placeholder="Name your buddy..."
              maxLength={20}
            />
          </div>
        </div>

        {/* Customization Options */}
        <div className="md:col-span-7 space-y-5">
          {/* Animal Selection */}
          <div>
            <label className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
              <Smile className="w-4 h-4" /> Choose Mascot Animal
            </label>
            <div className="grid grid-cols-2 gap-2">
              {animals.map((a) => (
                <button
                  key={a.id}
                  onClick={() => onChange({ ...config, animal: a.id })}
                  className={`flex items-center gap-2 p-2.5 rounded-xl border-2 text-xs font-bold transition-all ${
                    config.animal === a.id
                      ? 'border-indigo-600 bg-indigo-50/80 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 shadow-xs'
                      : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <span className="text-lg">{a.emoji}</span>
                  {a.name}
                </button>
              ))}
            </div>
          </div>

          {/* Color Selection */}
          {config.animal !== 'panda' && (
            <div>
              <label className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
                <Palette className="w-4 h-4" /> Primary Fur Color
              </label>
              <div className="flex flex-wrap gap-2.5">
                {colorPresets.map((c) => (
                  <button
                    key={c.hex}
                    onClick={() => onChange({ ...config, color: c.hex })}
                    className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 relative ${
                      config.color === c.hex
                        ? 'border-indigo-600 ring-2 ring-indigo-400 ring-offset-2 dark:ring-offset-slate-800'
                        : 'border-white dark:border-slate-700'
                    }`}
                    style={{ backgroundColor: c.hex }}
                    title={c.label}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Accessory Selection */}
          <div>
            <label className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
              <Glasses className="w-4 h-4" /> Accessory
            </label>
            <div className="grid grid-cols-3 gap-2">
              {accessories.map((acc) => (
                <button
                  key={acc.id}
                  onClick={() => onChange({ ...config, accessory: acc.id })}
                  className={`p-2 rounded-xl border-2 text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                    config.accessory === acc.id
                      ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 shadow-xs'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-indigo-200'
                  }`}
                >
                  <span className="text-base">{acc.icon}</span>
                  <span className="text-[11px] truncate w-full text-center">{acc.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
