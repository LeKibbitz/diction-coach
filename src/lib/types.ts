// ─── User ───

export interface UserProfile {
  id: string;
  name: string;
  createdAt: number;
  speechLang: string; // 'fr-FR'
  onboardingComplete: boolean;
  typingWpm: number | null;
}

// ─── Exercises ───

export type ExerciseCategory =
  | "phrases"
  | "punctuation"
  | "commands"
  | "speed"
  | "freeform";

export interface Exercise {
  id: string;
  category: ExerciseCategory;
  level: number; // 1-5
  title: string;
  description: string; // humorous flavor text
  referenceText: string;
  hints?: string[];
  expectedDurationSec: number;
  tags: string[];
}

// ─── Diff & Scoring ───

export type ErrorType =
  | "substitution"
  | "insertion"
  | "deletion"
  | "punctuation"
  | "command";

export interface DiffSegment {
  type: "equal" | "insert" | "delete" | "replace";
  reference: string;
  recognized: string;
  wordIndex: number;
}

export interface WordTiming {
  word: string;
  startTime: number; // seconds from audio start
  endTime: number;
  confidence: number; // 0-1
  isError: boolean;
  errorType?: ErrorType;
}

// ─── Session Results ───

export interface SessionResult {
  id: string;
  exerciseId: string;
  userId: string;
  startedAt: number;
  completedAt: number;
  referenceText: string;
  recognizedText: string;
  diffResult: DiffSegment[];
  accuracy: number; // 0-100
  wpm: number;
  errorCount: number;
  errorTypes: Partial<Record<ErrorType, number>>;
  audioBlob?: Blob;
  audioDuration: number; // seconds
  wordTimings: WordTiming[];
}

// ─── Progress ───

export interface ExerciseProgress {
  id: string; // `${exerciseId}::${userId}`
  exerciseId: string;
  userId: string;
  attempts: number;
  bestAccuracy: number;
  bestWpm: number;
  lastAttemptAt: number;
  streak: number; // consecutive attempts with >90% accuracy
}

// ─── Speed Test ───

export interface SpeedTestResult {
  id: string;
  userId: string;
  mode: "typing" | "dictation";
  referenceText: string;
  inputText: string;
  accuracy: number;
  wpm: number;
  completedAt: number;
}

// ─── Achievements ───

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string; // emoji
  condition: (stats: UserStats) => boolean;
}

export interface UserStats {
  totalSessions: number;
  totalExercisesCompleted: number;
  bestAccuracy: number;
  bestWpm: number;
  averageAccuracy: number;
  currentStreak: number; // consecutive days
  totalPracticeDays: number;
}
