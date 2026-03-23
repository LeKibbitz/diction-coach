"use client";

import { useState, useEffect, useCallback } from "react";
import type { ExerciseProgress, SessionResult, UserStats } from "@/lib/types";
import {
  getAllProgress,
  getSessionsByUser,
  getRecentSessions,
  getUser,
  saveUser,
} from "@/lib/db";

export function useProgress() {
  const [progress, setProgress] = useState<ExerciseProgress[]>([]);
  const [sessions, setSessions] = useState<SessionResult[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const user = await getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const [allProgress, allSessions] = await Promise.all([
        getAllProgress(user.id),
        getSessionsByUser(user.id),
      ]);

      setProgress(allProgress);
      setSessions(allSessions);

      // Calculate stats
      if (allSessions.length > 0) {
        const accuracies = allSessions.map((s) => s.accuracy);
        const completedExercises = new Set(
          allProgress.filter((p) => p.bestAccuracy >= 70).map((p) => p.exerciseId)
        );

        // Calculate practice days
        const practiceDays = new Set(
          allSessions.map((s) =>
            new Date(s.completedAt).toISOString().split("T")[0]
          )
        );

        // Calculate current streak (consecutive days)
        const sortedDays = [...practiceDays].sort().reverse();
        let currentStreak = 0;
        const today = new Date().toISOString().split("T")[0];

        for (let i = 0; i < sortedDays.length; i++) {
          const expected = new Date();
          expected.setDate(expected.getDate() - i);
          const expectedStr = expected.toISOString().split("T")[0];
          if (sortedDays[i] === expectedStr || (i === 0 && sortedDays[0] === today)) {
            currentStreak++;
          } else {
            break;
          }
        }

        setStats({
          totalSessions: allSessions.length,
          totalExercisesCompleted: completedExercises.size,
          bestAccuracy: Math.max(...accuracies),
          bestWpm: Math.max(...allSessions.map((s) => s.wpm)),
          averageAccuracy:
            Math.round(
              accuracies.reduce((a, b) => a + b, 0) / accuracies.length
            ),
          currentStreak,
          totalPracticeDays: practiceDays.size,
        });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return { progress, sessions, stats, loading, refresh: loadData };
}
