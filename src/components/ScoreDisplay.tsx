"use client";

import { getGrade } from "@/lib/scoring";
import type { ErrorType } from "@/lib/types";

interface ScoreDisplayProps {
  accuracy: number;
  wpm: number;
  errorCount: number;
  errorTypes: Partial<Record<ErrorType, number>>;
  duration: number; // seconds
}

const ERROR_LABELS: Record<ErrorType, string> = {
  substitution: "Substitutions",
  insertion: "Ajouts",
  deletion: "Omissions",
  punctuation: "Ponctuation",
  command: "Commandes",
};

export default function ScoreDisplay({
  accuracy,
  wpm,
  errorCount,
  errorTypes,
  duration,
}: ScoreDisplayProps) {
  const grade = getGrade(accuracy);

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
          <div className="text-xs text-text-muted">mots/min</div>
        </div>
        <div className="rounded-xl bg-bg p-3 text-center border border-border">
          <div className="text-2xl font-bold text-error">{errorCount}</div>
          <div className="text-xs text-text-muted">
            {errorCount <= 1 ? "erreur" : "erreurs"}
          </div>
        </div>
        <div className="rounded-xl bg-bg p-3 text-center border border-border">
          <div className="text-2xl font-bold text-text">
            {Math.floor(duration)}s
          </div>
          <div className="text-xs text-text-muted">durée</div>
        </div>
      </div>

      {/* Error breakdown */}
      {errorCount > 0 && (
        <div className="rounded-xl border border-border p-4">
          <h4 className="text-sm font-semibold mb-3">
            Détail des erreurs
          </h4>
          <div className="space-y-2">
            {(Object.entries(errorTypes) as [ErrorType, number][]).map(
              ([type, count]) => (
                <div key={type} className="flex justify-between text-sm">
                  <span className="text-text-muted">
                    {ERROR_LABELS[type]}
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
          ? "Impressionnant ! Votre micro vous remercie."
          : accuracy >= 80
            ? "Très bien ! Encore un peu de pratique et ce sera parfait."
            : accuracy >= 60
              ? "Pas mal ! La machine commence à vous comprendre."
              : accuracy >= 40
                ? "On progresse ! Articulez davantage les fins de mots."
                : "Votre micro pleure. Mais ne vous découragez pas !"}
      </p>
    </div>
  );
}
