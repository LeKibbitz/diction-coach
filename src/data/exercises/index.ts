import type { Exercise, ExerciseCategory } from "@/lib/types";
import phrasesSimples from "./phrases-simples.json";
import ponctuation from "./ponctuation.json";
import commandes from "./commandes.json";
import vitesse from "./vitesse.json";
import defis from "./defis.json";

const allExercises: Exercise[] = [
  ...(phrasesSimples as Exercise[]),
  ...(ponctuation as Exercise[]),
  ...(commandes as Exercise[]),
  ...(vitesse as Exercise[]),
  ...(defis as Exercise[]),
];

export function getAllExercises(): Exercise[] {
  return allExercises;
}

export function getExercise(id: string): Exercise | undefined {
  return allExercises.find((e) => e.id === id);
}

export function getExercisesByCategory(category: ExerciseCategory): Exercise[] {
  return allExercises.filter((e) => e.category === category);
}

export function getExercisesByLevel(level: number): Exercise[] {
  return allExercises.filter((e) => e.level === level);
}

export const CATEGORIES: {
  id: ExerciseCategory;
  label: string;
  emoji: string;
  description: string;
}[] = [
  {
    id: "phrases",
    label: "Phrases",
    emoji: "💬",
    description: "Phrases simples et complexes pour travailler l'articulation",
  },
  {
    id: "punctuation",
    label: "Ponctuation",
    emoji: "✍️",
    description: "Apprenez à dicter points, virgules, guillemets et plus",
  },
  {
    id: "commands",
    label: "Commandes",
    emoji: "⌨️",
    description: "Retours à la ligne, paragraphes et mise en forme vocale",
  },
  {
    id: "speed",
    label: "Vitesse",
    emoji: "⚡",
    description: "Exercices chronométrés pour gagner en rapidité",
  },
];

export default allExercises;
