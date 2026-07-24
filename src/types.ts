export type ExpressionType = 'HAPPY' | 'CHEERING' | 'THINKING' | 'SHOWING_CORRECT_SIGN' | 'CONFUSED';
export type AnimationTriggerType = 'jump_celebrate' | 'demonstrate_sign' | 'idle_confused' | 'dance_happy';

export type SignLanguageSystem = 'ASL' | 'BSL';
export type CameraMode = 'guided' | 'free_detect' | 'timed_quiz';

export interface AvatarReaction {
  expression: ExpressionType;
  animation_trigger: AnimationTriggerType;
  dialogue_bubble: string;
}

export interface SignEvaluationResult {
  is_correct: boolean;
  accuracy_score: number;
  feedback_tip: string;
  detected_gesture?: string;
  misidentified_sign?: string | null;
  positioning_advice?: string;
  target_sign?: string;
  sign_system?: SignLanguageSystem;
  avatar_reaction: AvatarReaction;
  timestamp?: string;
}

export type SignCategory = 'Alphabet' | 'Phrases' | 'Numbers';
export type DifficultyLevel = 'Easy' | 'Medium' | 'Hard';

export interface SignTarget {
  id: string;
  label: string;
  system: SignLanguageSystem;
  category: SignCategory;
  difficulty: DifficultyLevel;
  description: string;
  steps: string[];
  keyTips: string[];
  visualHint: string;
  handShapeDescription: string;
  handShapeIllustrationType: string;
  exampleImage?: string;
}

export type MascotAnimal = 'fox' | 'bear' | 'cat' | 'panda';
export type MascotAccessory = 'none' | 'glasses' | 'headband' | 'graduation_cap' | 'bowtie';
export type MascotOutfit = 'classic' | 'tutor_vest' | 'superhero_cape' | 'sports_jersey';

export interface MascotConfig {
  name: string;
  animal: MascotAnimal;
  color: string;
  accessory: MascotAccessory;
  outfit: MascotOutfit;
}

export interface UserProgress {
  totalPracticed: number;
  correctSignsCount: number;
  streakDays: number;
  xp: number;
  level: number;
  completedSignIds: string[];
  history: Array<{
    targetSignId: string;
    result: SignEvaluationResult;
    date: string;
  }>;
}
