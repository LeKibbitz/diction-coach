"use client";

import Link from "next/link";
import { t, type Locale } from "@/lib/i18n";
import type { Exercise, ExerciseProgress } from "@/lib/types";

interface ExerciseCardProps {
  exercise: Exercise;
  progress?: ExerciseProgress;
  locale?: Locale;
}

const LEVEL_COLORS = [
  "",
  "bg-success/10 text-success",
  "bg-accent/10 text-accent",
  "bg-warning/10 text-warning",
  "bg-error-light/10 text-error-light",
  "bg-error/10 text-error",
];

export default function ExerciseCard({ exercise, progress, locale = "fr" }: ExerciseCardProps) {
  // Validation threshold adapts to exercise level: L1=70%, L2=65%, L3=60%, L4=55%, L5=50%
  const threshold = Math.max(50, 75 - exercise.level * 5);
  const completed = progress && progress.bestAccuracy >= threshold;
  const attempted = progress && progress.attempts > 0;

  return (
    <Link
      href={`/exercise/${exercise.id}`}
      className={`block p-4 rounded-2xl border transition-all hover:shadow-md hover:-translate-y-0.5 ${
        completed
          ? "border-success/30 bg-success/5"
          : "border-border bg-bg-card hover:border-primary/30"
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <span
          className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${
            LEVEL_COLORS[exercise.level] || "bg-border text-text-muted"
          }`}
        >
          {t(locale, "exercise.level")} {exercise.level}
        </span>
        {completed && <span className="text-success text-sm">✓</span>}
      </div>

      <h3 className="font-semibold text-sm mb-1">{exercise.title}</h3>
      <p className="text-xs text-text-muted line-clamp-2 mb-3">
        {exercise.description}
      </p>

      {attempted && progress ? (
        <div className="flex items-center justify-between text-xs">
          <span className="text-text-muted">
            {progress.attempts}x {progress.attempts > 1 ? t(locale, "exercise.attemptedPlural") : t(locale, "exercise.attempted")}
          </span>
          <span
            className={
              progress.bestAccuracy >= 80
                ? "text-success font-medium"
                : progress.bestAccuracy >= 50
                  ? "text-accent font-medium"
                  : "text-error"
            }
          >
            {progress.bestAccuracy}% max
          </span>
        </div>
      ) : (
        <div className="text-xs text-text-muted/50">{t(locale, "exercise.notAttempted")}</div>
      )}
    </Link>
  );
}
