import type { WordTiming, DiffSegment } from "./types";
import { classifyError } from "./diff";

export interface TimelineRegion {
  id: string;
  startTime: number;
  endTime: number;
  isError: boolean;
  word: string;
  expected?: string;
  actual?: string;
  errorType?: string;
  color: string;
}

/**
 * Build timeline regions from word timings for wavesurfer.js display.
 */
export function buildTimelineRegions(
  timings: WordTiming[],
  segments: DiffSegment[]
): TimelineRegion[] {
  const regions: TimelineRegion[] = [];

  // Build a map of error segments for lookup
  const errorMap = new Map<
    string,
    { expected: string; actual: string; errorType: string }
  >();
  for (const seg of segments) {
    const errorType = classifyError(seg);
    if (errorType) {
      const key = (seg.recognized || seg.reference).toLowerCase();
      errorMap.set(key, {
        expected: seg.reference,
        actual: seg.recognized,
        errorType,
      });
    }
  }

  for (let i = 0; i < timings.length; i++) {
    const t = timings[i];
    const error = errorMap.get(t.word.toLowerCase());

    regions.push({
      id: `word-${i}`,
      startTime: t.startTime,
      endTime: t.endTime,
      isError: t.isError,
      word: t.word,
      expected: error?.expected,
      actual: error?.actual,
      errorType: error?.errorType,
      color: t.isError
        ? "rgba(244, 63, 94, 0.3)" // error red
        : "rgba(16, 185, 129, 0.15)", // success green
    });
  }

  return regions;
}

/**
 * Get only error regions for the error sidebar.
 */
export function getErrorRegions(regions: TimelineRegion[]): TimelineRegion[] {
  return regions.filter((r) => r.isError);
}

/**
 * Merge adjacent regions of the same type for cleaner display.
 */
export function mergeAdjacentRegions(
  regions: TimelineRegion[]
): TimelineRegion[] {
  if (regions.length === 0) return [];

  const merged: TimelineRegion[] = [{ ...regions[0] }];

  for (let i = 1; i < regions.length; i++) {
    const prev = merged[merged.length - 1];
    const curr = regions[i];

    // Merge if same error status and close in time (within 0.1s gap)
    if (
      prev.isError === curr.isError &&
      curr.startTime - prev.endTime < 0.1
    ) {
      prev.endTime = curr.endTime;
      prev.word += " " + curr.word;
      if (curr.expected) {
        prev.expected = (prev.expected || "") + " " + curr.expected;
      }
      if (curr.actual) {
        prev.actual = (prev.actual || "") + " " + curr.actual;
      }
    } else {
      merged.push({ ...curr });
    }
  }

  return merged;
}

/**
 * Format seconds as mm:ss.
 */
export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
