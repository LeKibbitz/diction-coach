import type { WordTiming } from "./types";

// Extend Window for webkit prefix
interface SpeechWindow extends Window {
  webkitSpeechRecognition?: typeof SpeechRecognition;
}

export interface SpeechResult {
  transcript: string;
  isFinal: boolean;
  confidence: number;
  timestamp: number; // performance.now() when result received
}

export interface SpeechCallbacks {
  onResult: (result: SpeechResult) => void;
  onEnd: () => void;
  onError: (error: string) => void;
}

export function isSpeechSupported(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as SpeechWindow;
  return !!(w.SpeechRecognition || w.webkitSpeechRecognition);
}

export function createSpeechRecognition(
  lang: string = "fr-FR",
  callbacks: SpeechCallbacks
): SpeechRecognition | null {
  if (!isSpeechSupported()) return null;

  const w = window as SpeechWindow;
  const SpeechRecognitionClass =
    w.SpeechRecognition || w.webkitSpeechRecognition;
  if (!SpeechRecognitionClass) return null;

  const recognition = new SpeechRecognitionClass();
  recognition.lang = lang;
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;

  recognition.onresult = (event: SpeechRecognitionEvent) => {
    const last = event.results[event.results.length - 1];
    const alt = last[0];
    callbacks.onResult({
      transcript: alt.transcript,
      isFinal: last.isFinal,
      confidence: alt.confidence,
      timestamp: performance.now(),
    });
  };

  recognition.onend = () => {
    callbacks.onEnd();
  };

  recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
    callbacks.onError(event.error);
  };

  return recognition;
}

/**
 * Build word timings from speech recognition results.
 * Since the Web Speech API doesn't provide per-word timestamps,
 * we estimate them by distributing time proportionally to word length.
 */
export function buildWordTimings(
  results: SpeechResult[],
  audioDuration: number
): WordTiming[] {
  // Only use final results
  const finals = results.filter((r) => r.isFinal);
  if (finals.length === 0) return [];

  const timings: WordTiming[] = [];
  const startTime = finals[0].timestamp;
  const totalDuration = audioDuration * 1000; // convert to ms

  for (let i = 0; i < finals.length; i++) {
    const result = finals[i];
    const words = result.transcript.trim().split(/\s+/);
    if (words.length === 0 || (words.length === 1 && words[0] === ""))
      continue;

    // Time boundaries for this result
    const relStart = result.timestamp - startTime;
    const relEnd =
      i + 1 < finals.length
        ? finals[i + 1].timestamp - startTime
        : totalDuration;

    const segmentDuration = relEnd - relStart;
    const totalChars = words.reduce((sum, w) => sum + w.length, 0);

    let cursor = relStart;
    for (const word of words) {
      const wordDuration =
        totalChars > 0
          ? (word.length / totalChars) * segmentDuration
          : segmentDuration / words.length;

      timings.push({
        word,
        startTime: cursor / 1000, // back to seconds
        endTime: (cursor + wordDuration) / 1000,
        confidence: result.confidence,
        isError: false, // set later by diff analysis
      });
      cursor += wordDuration;
    }
  }

  return timings;
}
