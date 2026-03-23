import type {
  DiffSegment,
  ErrorType,
  WordTiming,
  SessionResult,
  ExerciseProgress,
} from "./types";
import { classifyError, isFuzzyMatch } from "./diff";

/**
 * Calculate accuracy percentage from diff segments.
 * Fuzzy matches count as 0.5 (partial credit).
 * Insertions (extra words) count as penalties.
 */
export function calculateAccuracy(segments: DiffSegment[]): number {
  const refWordCount = segments.filter(
    (s) => s.type === "equal" || s.type === "delete" || s.type === "replace"
  ).length;
  const insertionCount = segments.filter((s) => s.type === "insert").length;

  // Total = reference words + insertions (everything that should or shouldn't be there)
  const total = refWordCount + insertionCount;
  if (total === 0) return 0;

  let correct = 0;
  for (const seg of segments) {
    if (seg.type === "equal") {
      correct += 1;
    } else if (
      seg.type === "replace" &&
      isFuzzyMatch(seg.reference, seg.recognized)
    ) {
      correct += 0.5; // partial credit for near-misses
    }
    // delete, replace (non-fuzzy), insert = 0 points
  }

  return Math.round((correct / total) * 100);
}

/**
 * Calculate words per minute.
 */
export function calculateWPM(wordCount: number, durationSec: number): number {
  if (durationSec <= 0) return 0;
  return Math.round(wordCount / (durationSec / 60));
}

/**
 * Count errors by type from diff segments.
 */
export function countErrors(
  segments: DiffSegment[]
): Partial<Record<ErrorType, number>> {
  const counts: Partial<Record<ErrorType, number>> = {};

  for (const seg of segments) {
    const errorType = classifyError(seg);
    if (errorType) {
      counts[errorType] = (counts[errorType] || 0) + 1;
    }
  }

  return counts;
}

/**
 * Total error count from diff segments.
 */
export function totalErrors(segments: DiffSegment[]): number {
  return segments.filter((s) => s.type !== "equal").length;
}

/**
 * Mark errors on word timings based on diff results.
 */
export function markTimingErrors(
  timings: WordTiming[],
  segments: DiffSegment[]
): WordTiming[] {
  const errorWords = new Set<string>();
  const errorTypeMap = new Map<string, ErrorType>();

  for (const seg of segments) {
    const errorType = classifyError(seg);
    if (errorType) {
      const word = seg.recognized || seg.reference;
      errorWords.add(word.toLowerCase());
      errorTypeMap.set(word.toLowerCase(), errorType);
    }
  }

  return timings.map((t) => {
    const lower = t.word.toLowerCase();
    if (errorWords.has(lower)) {
      return {
        ...t,
        isError: true,
        errorType: errorTypeMap.get(lower),
      };
    }
    return t;
  });
}

/**
 * Update exercise progress after a session.
 */
export function updateProgress(
  existing: ExerciseProgress | undefined,
  session: SessionResult
): ExerciseProgress {
  const now = Date.now();

  if (!existing) {
    return {
      id: `${session.exerciseId}::${session.userId}`,
      exerciseId: session.exerciseId,
      userId: session.userId,
      attempts: 1,
      bestAccuracy: session.accuracy,
      bestWpm: session.wpm,
      lastAttemptAt: now,
      streak: session.accuracy >= 90 ? 1 : 0,
    };
  }

  return {
    ...existing,
    attempts: existing.attempts + 1,
    bestAccuracy: Math.max(existing.bestAccuracy, session.accuracy),
    bestWpm: Math.max(existing.bestWpm, session.wpm),
    lastAttemptAt: now,
    streak: session.accuracy >= 90 ? existing.streak + 1 : 0,
  };
}

/**
 * Get a letter grade from accuracy.
 */
export function getGrade(accuracy: number): {
  letter: string;
  color: string;
  emoji: string;
} {
  if (accuracy >= 95)
    return { letter: "A+", color: "text-success", emoji: "🏆" };
  if (accuracy >= 85)
    return { letter: "A", color: "text-success", emoji: "✨" };
  if (accuracy >= 75)
    return { letter: "B", color: "text-accent", emoji: "👍" };
  if (accuracy >= 60)
    return { letter: "C", color: "text-warning", emoji: "💪" };
  if (accuracy >= 40)
    return { letter: "D", color: "text-error-light", emoji: "🎯" };
  return { letter: "F", color: "text-error", emoji: "😅" };
}
