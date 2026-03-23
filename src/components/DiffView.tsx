"use client";

import type { DiffSegment } from "@/lib/types";
import { isFuzzyMatch } from "@/lib/diff";

interface DiffViewProps {
  segments: DiffSegment[];
}

export default function DiffView({ segments }: DiffViewProps) {
  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-text-muted">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-success/20 border border-success/40" />
          Correct
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-error/20 border border-error/40" />
          Erreur
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-accent/20 border border-accent/40" />
          Quasi-correct
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-warning/20 border border-warning/40" />
          Ajouté
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-text-muted/20 border border-text-muted/40 line-through" />
          Manquant
        </span>
      </div>

      {/* Diff display */}
      <div className="p-4 rounded-xl border border-border bg-bg-card leading-relaxed text-lg font-[family-name:var(--font-sans)]">
        {segments.map((seg, i) => {
          if (seg.type === "equal") {
            return (
              <span key={i} className="text-success">
                {seg.reference}{" "}
              </span>
            );
          }

          if (seg.type === "delete") {
            return (
              <span
                key={i}
                className="line-through text-text-muted/60 bg-text-muted/10 rounded px-0.5"
                title={`Manquant : « ${seg.reference} »`}
              >
                {seg.reference}{" "}
              </span>
            );
          }

          if (seg.type === "insert") {
            return (
              <span
                key={i}
                className="text-warning bg-warning/10 rounded px-0.5"
                title={`Ajouté : « ${seg.recognized} »`}
              >
                {seg.recognized}{" "}
              </span>
            );
          }

          if (seg.type === "replace") {
            const fuzzy = isFuzzyMatch(seg.reference, seg.recognized);
            return (
              <span
                key={i}
                className={`rounded px-0.5 ${
                  fuzzy
                    ? "text-accent bg-accent/10"
                    : "text-error bg-error/10"
                }`}
                title={`Attendu : « ${seg.reference} » — Vous avez dit : « ${seg.recognized} »`}
              >
                <span className="line-through opacity-50 text-xs mr-1">
                  {seg.reference}
                </span>
                {seg.recognized}{" "}
              </span>
            );
          }

          return null;
        })}
      </div>
    </div>
  );
}
