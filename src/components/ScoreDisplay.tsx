"use client";

import { getGrade } from "@/lib/scoring";
import { t, type Locale } from "@/lib/i18n";
import type { ErrorType } from "@/lib/types";

interface ScoreDisplayProps {
  accuracy: number;
  wpm: number;
  errorCount: number;
  errorTypes: Partial<Record<ErrorType, number>>;
  duration: number; // seconds
  locale?: Locale;
}

export default function ScoreDisplay({
  accuracy,
  wpm,
  errorCount,
  errorTypes,
  duration,
  locale = "fr",
}: ScoreDisplayProps) {
  const grade = getGrade(accuracy);

  const errorLabel = (type: ErrorType): string => {
    return t(locale, `score.errorType.${type}`);
  };

  return (
    <div className="space-y-6">
      {/* Main score */}
      <div className="text-center">
        <div className="animate-score inline-flex flex-col items-center">
          <span className="text-6xl mb-1">{grade.emoji}</span>
          <span className={`text-5xl font-bold ${grade.color}`}>
            {accuracy}%
          </span>
          <span
            className={`text-2xl font-semibold mt-1 ${grade.color}`}
          >
            {grade.letter}
          </span>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-bg p-3 text-center border border-border">
          <div className="text-2xl font-bold text-primary">{wpm}</div>
          <div className="text-xs text-text-muted">{t(locale, "stats.wpm")}</div>
        </div>
        <div className="rounded-xl bg-bg p-3 text-center border border-border">
          <div className="text-2xl font-bold text-error">{errorCount}</div>
          <div className="text-xs text-text-muted">
            {errorCount <= 1 ? t(locale, "score.error") : t(locale, "score.errors")}
          </div>
        </div>
        <div className="rounded-xl bg-bg p-3 text-center border border-border">
          <div className="text-2xl font-bold text-text">
            {Math.floor(duration)}s
          </div>
          <div className="text-xs text-text-muted">{t(locale, "score.duration")}</div>
        </div>
      </div>

      {/* Error breakdown */}
      {errorCount > 0 && (
        <div className="rounded-xl border border-border p-4">
          <h4 className="text-sm font-semibold mb-3">
            {t(locale, "score.errorDetail")}
          </h4>
          <div className="space-y-2">
            {(Object.entries(errorTypes) as [ErrorType, number][]).map(
              ([type, count]) => (
                <div key={type} className="flex justify-between text-sm">
                  <span className="text-text-muted">
                    {errorLabel(type)}
                  </span>
                  <span className="font-medium text-error">{count}</span>
                </div>
              )
            )}
          </div>
        </div>
      )}

      {/* Encouragement message */}
      <p className="text-center text-sm text-text-muted italic">
        {accuracy >= 95
          ? t(locale, "score.msg95")
          : accuracy >= 80
            ? t(locale, "score.msg80")
            : accuracy >= 60
              ? t(locale, "score.msg60")
              : accuracy >= 40
                ? t(locale, "score.msg40")
                : t(locale, "score.msgLow")}
      </p>
    </div>
  );
}
