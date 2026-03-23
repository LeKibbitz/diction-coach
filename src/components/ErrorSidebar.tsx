"use client";

import type { TimelineRegion } from "@/lib/timeline";
import { formatTime } from "@/lib/timeline";

interface ErrorSidebarProps {
  errors: TimelineRegion[];
  onClickError: (error: TimelineRegion) => void;
  currentTime: number;
}

export default function ErrorSidebar({
  errors,
  onClickError,
  currentTime,
}: ErrorSidebarProps) {
  if (errors.length === 0) {
    return (
      <div className="p-4 text-center text-text-muted">
        <div className="text-3xl mb-2">🎉</div>
        <p className="text-sm">Aucune erreur détectée !</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold px-1 flex items-center justify-between">
        <span>Erreurs ({errors.length})</span>
        <span className="text-xs text-text-muted font-normal">
          Cliquez pour écouter
        </span>
      </h3>
      {errors.map((error) => {
        const isActive =
          currentTime >= error.startTime && currentTime <= error.endTime;
        return (
          <button
            key={error.id}
            onClick={() => onClickError(error)}
            className={`w-full text-left p-3 rounded-xl border transition-all ${
              isActive
                ? "border-error bg-error/10"
                : "border-border hover:border-error/30 hover:bg-error/5"
            }`}
          >
            <div className="flex justify-between items-start mb-1">
              <span className="text-xs font-mono text-text-muted">
                {formatTime(error.startTime)}
              </span>
              <span className="text-xs px-1.5 py-0.5 rounded bg-error/10 text-error capitalize">
                {error.errorType || "erreur"}
              </span>
            </div>
            {error.expected && (
              <div className="text-sm">
                <span className="text-text-muted">Attendu :</span>{" "}
                <span className="text-text font-medium">{error.expected}</span>
              </div>
            )}
            {error.actual && (
              <div className="text-sm">
                <span className="text-text-muted">Dit :</span>{" "}
                <span className="text-error font-medium">{error.actual}</span>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
