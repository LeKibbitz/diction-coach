import type { UserStats } from "./types";
import { getAllExercises } from "@/data/exercises";

export interface Badge {
  id: string;
  icon: string;
  title: string;
  description: string;
  followUp: string; // Personal message when earned
  check: (stats: UserStats) => boolean;
  tier: "bronze" | "silver" | "gold" | "legendary";
}

export const BADGES: Badge[] = [
  // ─── Bronze — Premiers pas ───
  {
    id: "first-word",
    icon: "🎤",
    title: "Premier mot",
    description: "Terminer votre premier exercice",
    followUp:
      "Vous venez de faire quelque chose que 99% des gens ne font jamais : vous entraîner à parler à une machine. La plupart blâment le micro. Vous, vous avez choisi de vous améliorer.",
    check: (s) => s.totalSessions >= 1,
    tier: "bronze",
  },
  {
    id: "three-days",
    icon: "📅",
    title: "Trois jours",
    description: "S'entraîner 3 jours d'affilée",
    followUp:
      "3 jours ! Votre cerveau commence à créer de nouvelles connexions neuronales pour la diction. Ce n'est pas juste de l'entraînement vocal — c'est de la gym cérébrale.",
    check: (s) => s.currentStreak >= 3,
    tier: "bronze",
  },

  // ─── Silver — Progression ───
  {
    id: "sharp-tongue",
    icon: "🗣️",
    title: "Langue affûtée",
    description: "Atteindre 90% de précision moyenne",
    followUp:
      "90% de précision moyenne ! Votre diction est maintenant meilleure que celle de la plupart des présentateurs météo. Le micro vous comprend. Vos collègues aussi, probablement.",
    check: (s) => s.averageAccuracy >= 90,
    tier: "silver",
  },
  {
    id: "speed-demon",
    icon: "⚡",
    title: "Démon de la vitesse",
    description: "Dépasser 120 mots par minute en dictée",
    followUp:
      "120 mots/minute ! C'est plus rapide que 95% des dactylos professionnels. Votre voix est devenue votre outil le plus productif. Imaginez le temps gagné sur un an entier.",
    check: (s) => s.bestWpm >= 120,
    tier: "silver",
  },
  {
    id: "ten-sessions",
    icon: "🔟",
    title: "Dix de der",
    description: "Compléter 10 sessions d'entraînement",
    followUp:
      "10 sessions. Vous développez un vrai skill — la diction claire est utile partout : réunions, présentations, appels. Vos interlocuteurs vous remercient sans le savoir.",
    check: (s) => s.totalSessions >= 10,
    tier: "silver",
  },

  // ─── Gold — Maîtrise ───
  {
    id: "perfectionist",
    icon: "💎",
    title: "Perfectionniste",
    description: "Obtenir 100% de précision sur un exercice",
    followUp:
      "100% ! Pas une erreur. Le micro a transcrit chaque mot exactement comme vous l'avez dit. Prenez un instant pour apprécier : c'est la preuve que le problème n'a jamais été la technologie.",
    check: (s) => s.bestAccuracy === 100,
    tier: "gold",
  },
  {
    id: "not-the-mic",
    icon: "🏆",
    title: "Le micro n'y est pour rien",
    description: "Compléter tous les exercices de ponctuation",
    followUp:
      "Vous maîtrisez la ponctuation vocale. Points, virgules, guillemets — tout sort de votre bouche comme d'un clavier. La prochaine fois qu'on vous dira « la dictée ça marche pas », vous saurez quoi répondre.",
    check: (s) => {
      const punctExercises = getAllExercises().filter((e) => e.category === "punctuation");
      return s.totalExercisesCompleted >= punctExercises.length;
    },
    tier: "gold",
  },
  {
    id: "week-warrior",
    icon: "🔥",
    title: "Guerrier de la semaine",
    description: "S'entraîner 7 jours d'affilée",
    followUp:
      "Une semaine complète ! Votre cortex moteur a intégré les patterns de diction claire. C'est devenu un réflexe — comme taper au clavier, mais avec la bouche. Et 3x plus vite.",
    check: (s) => s.currentStreak >= 7,
    tier: "gold",
  },

  // ─── Legendary ───
  {
    id: "rapido",
    icon: "🎬",
    title: "Défi Rapido",
    description: "Compléter le défi Antoine de Caunes avec 70%+ de précision",
    followUp:
      "Vous avez relevé le défi Rapido ! 90 mots en 30 secondes, c'est le rythme d'un présentateur TV sous caféine. Antoine de Caunes serait fier. Ou inquiet.",
    check: (s) => s.bestAccuracy >= 70 && s.totalSessions >= 1, // simplified check
    tier: "legendary",
  },
  {
    id: "master",
    icon: "👑",
    title: "Maître de la diction",
    description: "Compléter TOUS les exercices avec 80%+ de précision",
    followUp:
      "Vous avez tout fait. Chaque exercice, chaque catégorie, chaque niveau. Votre diction est un instrument de précision. La reconnaissance vocale vous obéit au doigt... pardon, à la voix et à l'œil. Merci d'avoir joué — et si vous avez aimé, un petit café m'aiderait à imaginer le prochain outil bizarre et utile.",
    check: (s) => s.totalExercisesCompleted >= getAllExercises().length,
    tier: "legendary",
  },
];

/**
 * Check which badges are newly earned since last check.
 */
export function checkNewBadges(
  stats: UserStats,
  previouslyEarned: Set<string>
): Badge[] {
  return BADGES.filter(
    (b) => !previouslyEarned.has(b.id) && b.check(stats)
  );
}

export function getEarnedBadges(stats: UserStats): Badge[] {
  return BADGES.filter((b) => b.check(stats));
}

export function getTierColor(tier: Badge["tier"]): string {
  switch (tier) {
    case "bronze": return "border-amber-700/30 bg-amber-700/5";
    case "silver": return "border-gray-400/30 bg-gray-400/5";
    case "gold": return "border-yellow-400/30 bg-yellow-400/5";
    case "legendary": return "border-primary/30 bg-primary/5";
  }
}
