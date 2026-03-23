"use client";

import { useMemo } from "react";
import { compareTexts } from "@/lib/diff";

interface LiveTranscriptProps {
  referenceText: string;
  currentTranscript: string;
  interimText?: string;
}

/**
 * Affiche le transcript en temps réel avec coloration des erreurs.
 * Vert = correct, rouge = erreur, orange = quasi-correct, gris = en attente.
 */
export default function LiveTranscript({
  referenceText,
  currentTranscript,
  interimText,
}: LiveTranscriptProps) {
  const segments = useMemo(() => {
    if (!currentTranscript) return [];
    return compareTexts(referenceText, currentTranscript);
  }, [referenceText, currentTranscript]);

  if (!currentTranscript && !interimText) {
    return (
      <span className="text-text-muted/40 italic text-sm">
        Les commandes vocales (point, virgule, majuscule...) seront appliquées ici
      </span>
    );
  }

  return (
    <>
      {segments.map((seg, i) => {
        if (seg.type === "equal") {
          return (
            <span key={i} className="text-success">
              {seg.recognized}{" "}
            </span>
          );
        }
        if (seg.type === "replace") {
          // Check if it's just a casing difference
          const justCasing =
            seg.reference.toLowerCase() === seg.recognized.toLowerCase();
          return (
            <span
              key={i}
              className={
                justCasing
                  ? "text-accent bg-accent/10 rounded px-0.5"
                  : "text-error bg-error/10 rounded px-0.5"
              }
              title={`Attendu : « ${seg.reference} »`}
            >
              {seg.recognized}{" "}
            </span>
          );
        }
        if (seg.type === "insert") {
          return (
            <span
              key={i}
              className="text-warning bg-warning/10 rounded px-0.5"
              title="Mot en trop"
            >
              {seg.recognized}{" "}
            </span>
          );
        }
        // delete segments are not shown in recognized text
        return null;
      })}
      {interimText && (
        <span className="text-text-muted/50">{interimText}</span>
      )}
    </>
  );
}
