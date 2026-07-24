export type ExpressionType = 'HAPPY' | 'CHEERING' | 'THINKING' | 'SHOWING_CORRECT_SIGN' | 'CONFUSED';
export type AnimationTriggerType = 'jump_celebrate' | 'demonstrate_sign' | 'idle_confused' | 'dance_happy';

export type SignLanguageSystem = 'ASL' | 'BSL';

/** MediaPipe hand landmark, normalised to the 0-1 image box. */
export interface HandLandmark {
  x: number;
  y: number;
  z: number;
}

/** One detected hand. BSL fingerspelling is two-handed, so frames carry up to two. */
export interface TrackedHand {
  landmarks: HandLandmark[];
  handedness: 'Left' | 'Right' | 'Unknown';
}

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
  /** Indices (0-20) of misplaced landmarks on the first detected hand. */
  incorrect_landmarks?: number[];
  /** Same, for the second hand — used by two-handed BSL signs. */
  incorrect_landmarks_hand2?: number[];
  target_sign?: string;
  sign_system?: SignLanguageSystem;
  avatar_reaction: AvatarReaction;
  timestamp?: string;
}

/* --- "Any Sign" pseudo-A2UI surface --- */

export type A2UIComponentType =
  | 'heading'
  | 'text'
  | 'callout'
  | 'steps'
  | 'chips'
  | 'stat'
  | 'comparison';

export type A2UITone = 'info' | 'success' | 'warning' | 'danger';

export interface A2UIComponent {
  type: A2UIComponentType;
  text?: string;
  title?: string;
  label?: string;
  value?: string;
  tone?: A2UITone;
  items?: string[];
}

export interface AnySignResult {
  detected_sign: string;
  confidence: number;
  spoken_summary: string;
  components: A2UIComponent[];
  sign_system?: SignLanguageSystem;
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
  /** Data URL of an AI-generated mascot; when set it replaces the SVG mascot. */
  generatedImage?: string | null;
  /** Prebuilt Gemini TTS voice used for this mascot. */
  voiceName?: string;
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
