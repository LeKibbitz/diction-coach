import type { Exercise, ExerciseCategory } from "@/lib/types";
import phrasesSimples from "./phrases-simples.json";
import ponctuation from "./ponctuation.json";
import commandes from "./commandes.json";
import vitesse from "./vitesse.json";
import defis from "./defis.json";
import prosodie from "./prosodie.json";
import enchainements from "./enchainements.json";
import sons from "./sons.json";

const allExercises: Exercise[] = [
  ...(phrasesSimples as Exercise[]),
  ...(ponctuation as Exercise[]),
  ...(commandes as Exercise[]),
  ...(vitesse as Exercise[]),
  ...(defis as Exercise[]),
  ...(prosodie as Exercise[]),
  ...(enchainements as Exercise[]),
  ...(sons as Exercise[]),
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
  labelKey: string;
  emoji: string;
  descriptionKey: string;
}[] = [
  {
    id: "phrases",
    labelKey: "category.phrases",
    emoji: "💬",
    descriptionKey: "category.phrases.desc",
  },
  {
    id: "punctuation",
    labelKey: "category.punctuation",
    emoji: "✍️",
    descriptionKey: "category.punctuation.desc",
  },
  {
    id: "commands",
    labelKey: "category.commands",
    emoji: "⌨️",
    descriptionKey: "category.commands.desc",
  },
  {
    id: "speed",
    labelKey: "category.speed",
    emoji: "⚡",
    descriptionKey: "category.speed.desc",
  },
  {
    id: "prosody",
    labelKey: "category.prosody",
    emoji: "🎵",
    descriptionKey: "category.prosody.desc",
  },
  {
    id: "linking",
    labelKey: "category.linking",
    emoji: "🔗",
    descriptionKey: "category.linking.desc",
  },
  {
    id: "sounds",
    labelKey: "category.sounds",
    emoji: "👂",
    descriptionKey: "category.sounds.desc",
  },
];

export default allExercises;
