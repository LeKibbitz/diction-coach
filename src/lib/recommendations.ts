import type { DiffSegment, ErrorType, Exercise } from "./types";
import { classifyError, isFuzzyMatch } from "./diff";
import { getAllExercises } from "@/data/exercises";

export interface ErrorDiagnosis {
  type: ErrorType;
  count: number;
  examples: { expected: string; got: string }[];
  description: string;
  advice: string;
}

export interface Recommendation {
  exercise: Exercise;
  reason: string;
  priority: number; // higher = more important
}

/**
 * Analyze diff segments and produce a detailed diagnosis of error patterns.
 */
export function diagnoseErrors(segments: DiffSegment[]): ErrorDiagnosis[] {
  const errorMap = new Map<ErrorType, { count: number; examples: { expected: string; got: string }[] }>();

  for (const seg of segments) {
    const errType = classifyError(seg);
    if (!errType) continue;

    const existing = errorMap.get(errType) || { count: 0, examples: [] };
    existing.count++;
    if (existing.examples.length < 3) {
      existing.examples.push({
        expected: seg.reference || "(rien)",
        got: seg.recognized || "(rien)",
      });
    }
    errorMap.set(errType, existing);
  }

  const descriptions: Record<ErrorType, { desc: string; advice: string }> = {
    substitution: {
      desc: "Des mots sont remplacés par d'autres",
      advice: "Articulez chaque syllabe distinctement. Évitez de manger les fins de mots.",
    },
    insertion: {
      desc: "Des mots en trop apparaissent dans la dictée",
      advice: "Évitez les hésitations (« euh », « hum »). Formulez votre phrase mentalement avant de la dicter.",
    },
    deletion: {
      desc: "Des mots manquent dans la dictée",
      advice: "Parlez à un rythme régulier. Ne baissez pas le volume en fin de phrase.",
    },
    punctuation: {
      desc: "La ponctuation est incorrecte ou manquante",
      advice: "Dites « point », « virgule », « point d'interrogation » explicitement. Marquez une micro-pause après.",
    },
    command: {
      desc: "Les commandes de formatage ne sont pas reconnues",
      advice: "Dites clairement « à la ligne », « nouveau paragraphe ». Attendez un instant après chaque commande.",
    },
  };

  const diagnoses: ErrorDiagnosis[] = [];
  for (const [type, data] of errorMap) {
    const info = descriptions[type];
    diagnoses.push({
      type,
      count: data.count,
      examples: data.examples,
      description: info.desc,
      advice: info.advice,
    });
  }

  // Also check for casing issues specifically
  const casingErrors = segments.filter(
    (s) =>
      s.type === "replace" &&
      s.reference.toLowerCase() === s.recognized.toLowerCase()
  );
  if (casingErrors.length > 0) {
    diagnoses.push({
      type: "substitution",
      count: casingErrors.length,
      examples: casingErrors.slice(0, 3).map((s) => ({
        expected: s.reference,
        got: s.recognized,
      })),
      description: "Problèmes de majuscules/minuscules",
      advice:
        "La capitalisation après un point est automatique. Pour forcer une majuscule, dites « majuscule [mot] » ou « tout en majuscules [mot] ».",
    });
  }

  // Sort by count descending
  diagnoses.sort((a, b) => b.count - a.count);

  return diagnoses;
}

/**
 * Recommend exercises based on the errors found in a dictation.
 */
export function recommendExercises(
  segments: DiffSegment[],
  completedExerciseIds: Set<string> = new Set()
): Recommendation[] {
  const diagnoses = diagnoseErrors(segments);
  const allExercises = getAllExercises();
  const recommendations: Recommendation[] = [];
  const addedIds = new Set<string>();

  for (const diag of diagnoses) {
    // Map error types to exercise categories/tags
    const targetCategories: string[] = [];
    const targetTags: string[] = [];

    switch (diag.type) {
      case "substitution":
        targetCategories.push("prosody", "sounds");
        targetTags.push("paire minimale", "rythme", "voyelles", "consonnes");
        break;
      case "insertion":
        targetCategories.push("prosody");
        targetTags.push("rythme", "régularité", "groupes");
        break;
      case "deletion":
        targetCategories.push("linking", "prosody");
        targetTags.push("enchaînement", "liaison", "fluide");
        break;
      case "punctuation":
        targetCategories.push("prosody");
        targetTags.push("intonation", "question");
        break;
      case "command":
        targetCategories.push("prosody");
        targetTags.push("rythme", "groupes");
        break;
    }

    // Find matching exercises, prioritize uncompleted ones
    const matching = allExercises
      .filter((ex) => {
        if (addedIds.has(ex.id)) return false;
        const catMatch = targetCategories.includes(ex.category);
        const tagMatch = ex.tags.some((t) => targetTags.includes(t));
        return catMatch || tagMatch;
      })
      .sort((a, b) => {
        // Prioritize uncompleted exercises
        const aCompleted = completedExerciseIds.has(a.id) ? 1 : 0;
        const bCompleted = completedExerciseIds.has(b.id) ? 1 : 0;
        if (aCompleted !== bCompleted) return aCompleted - bCompleted;
        // Then by level (easier first)
        return a.level - b.level;
      });

    // Pick top 2 exercises per error type
    for (const ex of matching.slice(0, 2)) {
      addedIds.add(ex.id);
      recommendations.push({
        exercise: ex,
        reason: diag.description,
        priority: diag.count,
      });
    }
  }

  // Sort by priority
  recommendations.sort((a, b) => b.priority - a.priority);

  return recommendations.slice(0, 6); // Max 6 recommendations
}

/**
 * Generate a summary message based on the overall performance.
 */
export function generateDiagnosisSummary(
  accuracy: number,
  diagnoses: ErrorDiagnosis[]
): string {
  if (accuracy >= 95) {
    return "Excellent ! Votre diction est très claire. Continuez à vous entraîner pour maintenir ce niveau.";
  }

  if (diagnoses.length === 0) {
    return "Quelques erreurs mineures. Continuez les exercices pour vous améliorer.";
  }

  const main = diagnoses[0];
  const parts: string[] = [];

  parts.push(`Votre principal point d'amélioration : ${main.description.toLowerCase()}.`);
  parts.push(main.advice);

  if (diagnoses.length > 1) {
    parts.push(
      `Vous pouvez aussi travailler : ${diagnoses
        .slice(1, 3)
        .map((d) => d.description.toLowerCase())
        .join(", ")}.`
    );
  }

  return parts.join(" ");
}
