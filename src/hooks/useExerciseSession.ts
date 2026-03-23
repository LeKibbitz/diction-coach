"use client";

import { useState, useCallback, useRef } from "react";
import type { Exercise, SessionResult, DiffSegment, WordTiming } from "@/lib/types";
import { compareTexts } from "@/lib/diff";
import {
  calculateAccuracy,
  calculateWPM,
  countErrors,
  totalErrors,
  markTimingErrors,
  updateProgress,
} from "@/lib/scoring";
import { buildWordTimings } from "@/lib/speech";
import { saveSession, saveProgress, getProgress } from "@/lib/db";

export type SessionPhase = "prep" | "countdown" | "recording" | "results";

export function useExerciseSession(exercise: Exercise, userId: string) {
  const [phase, setPhase] = useState<SessionPhase>("prep");
  const [countdownValue, setCountdownValue] = useState(3);
  const [result, setResult] = useState<SessionResult | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(0);

  const startCountdown = useCallback(
    (onComplete: () => void) => {
      setPhase("countdown");
      setCountdownValue(3);

      let count = 3;
      const interval = setInterval(() => {
        count--;
        if (count <= 0) {
          clearInterval(interval);
          setPhase("recording");
          startTimeRef.current = Date.now();

          // Start elapsed timer
          timerRef.current = setInterval(() => {
            setElapsedTime(
              Math.floor((Date.now() - startTimeRef.current) / 1000)
            );
          }, 1000);

          onComplete();
        } else {
          setCountdownValue(count);
        }
      }, 1000);
    },
    []
  );

  const finishRecording = useCallback(
    async (
      recognizedText: string,
      speechResults: { transcript: string; isFinal: boolean; confidence: number; timestamp: number }[],
      audioBlob: Blob | undefined,
      audioDuration: number
    ) => {
      // Stop timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      const completedAt = Date.now();
      const durationSec = (completedAt - startTimeRef.current) / 1000;

      // Compare texts
      const diffResult: DiffSegment[] = compareTexts(
        exercise.referenceText,
        recognizedText
      );

      // Build word timings — use session duration (more reliable than recorder duration)
      let wordTimings: WordTiming[] = buildWordTimings(
        speechResults,
        durationSec
      );

      // Mark errors on timings
      wordTimings = markTimingErrors(wordTimings, diffResult);

      // Calculate scores
      const accuracy = calculateAccuracy(diffResult);
      const wordCount = recognizedText.trim().split(/\s+/).length;
      const wpm = calculateWPM(wordCount, durationSec);
      const errorTypes = countErrors(diffResult);
      const errorCount = totalErrors(diffResult);

      const session: SessionResult = {
        id: crypto.randomUUID(),
        exerciseId: exercise.id,
        userId,
        startedAt: startTimeRef.current,
        completedAt,
        referenceText: exercise.referenceText,
        recognizedText,
        diffResult,
        accuracy,
        wpm,
        errorCount,
        errorTypes,
        audioBlob,
        audioDuration: durationSec,
        wordTimings,
      };

      // Save to IndexedDB
      await saveSession(session);

      // Update progress
      const existing = await getProgress(exercise.id, userId);
      const progress = updateProgress(existing, session);
      await saveProgress(progress);

      setResult(session);
      setPhase("results");
    },
    [exercise, userId]
  );

  const reset = useCallback(() => {
    setPhase("prep");
    setResult(null);
    setElapsedTime(0);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  return {
    phase,
    countdownValue,
    result,
    elapsedTime,
    startCountdown,
    finishRecording,
    reset,
  };
}
