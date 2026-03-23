/**
 * Post-processeur de commandes vocales françaises.
 *
 * Le Web Speech API transcrit la parole brute. Ce module transforme
 * les commandes vocales en leur résultat attendu (ponctuation, majuscules,
 * retours à la ligne, parenthèses, bullet points, etc.).
 *
 * Ordre d'application :
 * 1. Commandes multi-mots (plus longues d'abord pour éviter les conflits)
 * 2. Commandes de casse (majuscule, tout en majuscules, tout en minuscules)
 * 3. Ponctuation simple
 * 4. Nettoyage final (espaces, capitalisation après point)
 */

// ─── Commandes de ponctuation et formatage ───

type Replacement = string | ((...args: string[]) => string);

const MULTI_WORD_COMMANDS: [RegExp, Replacement][] = [
  // Retours à la ligne
  [/\bnouveau paragraphe\b/gi, "\n\n"],
  [/\bà la ligne\b/gi, "\n"],
  [/\bretour à la ligne\b/gi, "\n"],
  [/\bretour chariot\b/gi, "\n"],

  // Guillemets
  [/\bouvrir les guillemets\b/gi, " « "],
  [/\bfermer les guillemets\b/gi, " » "],
  [/\bouvrez les guillemets\b/gi, " « "],
  [/\bfermez les guillemets\b/gi, " » "],
  [/\bentre guillemets\b/gi, " « "],  // souvent suivi du texte puis "fin de citation"
  [/\bfin de citation\b/gi, " » "],

  // Parenthèses
  [/\bparenthèse ouvrante\b/gi, " ("],
  [/\bparenthèse fermante\b/gi, ") "],
  [/\bouvrir la parenthèse\b/gi, " ("],
  [/\bfermer la parenthèse\b/gi, ") "],
  [/\bouvrez la parenthèse\b/gi, " ("],
  [/\bfermez la parenthèse\b/gi, ") "],

  // Ponctuation composée
  [/\bpoint d'exclamation\b/gi, "! "],
  [/\bpoint d'interrogation\b/gi, "? "],
  [/\bpoint-virgule\b/gi, "; "],
  [/\bdeux[ -]points\b/gi, ": "],
  [/\bpoints de suspension\b/gi, "... "],
  [/\btrois points\b/gi, "... "],

  // Symboles
  [/\bbarre oblique\b/gi, "/"],
  [/\bbarre oblique inversée\b/gi, "\\"],

  // Bullet points / listes
  [/\bpuce\b/gi, "\n• "],
  [/\btiret puce\b/gi, "\n- "],
  [/\bpoint numéro un\b/gi, "\n1. "],
  [/\bpoint numéro deux\b/gi, "\n2. "],
  [/\bpoint numéro trois\b/gi, "\n3. "],

  // Majuscules — commandes de casse
  [/\btout en majuscules?\s+(\S+)\b/gi, (_match, word) => word.toUpperCase()],
  [/\ben majuscules?\s+(\S+)\b/gi, (_match, word) => word.toUpperCase()],
  [/\btout en minuscules?\s+(\S+)\b/gi, (_match, word) => word.toLowerCase()],
  [/\bmajuscule\s+(\S+)\b/gi, (_match, word) =>
    word.charAt(0).toUpperCase() + word.slice(1)
  ],
];

// Ponctuation simple (mots seuls)
const SIMPLE_COMMANDS: [RegExp, string][] = [
  [/\bpoint\b/gi, ". "],
  [/\bvirgule\b/gi, ", "],
  [/\btiret\b/gi, "-"],
  [/\barobase\b/gi, "@"],
  [/\bespace insécable\b/gi, "\u00A0"],
];

// ─── Post-processeur principal ───

/**
 * Transforme un texte brut de reconnaissance vocale en texte formaté
 * en appliquant les commandes vocales françaises.
 */
export function processVoiceCommands(raw: string): string {
  let text = raw;

  // 1. Appliquer les commandes multi-mots (les plus longues d'abord)
  for (const [pattern, replacement] of MULTI_WORD_COMMANDS) {
    if (typeof replacement === "string") {
      text = text.replace(pattern, replacement);
    } else {
      text = text.replace(pattern, replacement);
    }
  }

  // 2. Appliquer les commandes simples
  for (const [pattern, replacement] of SIMPLE_COMMANDS) {
    text = text.replace(pattern, replacement);
  }

  // 3. Nettoyage : supprimer les espaces avant ponctuation
  text = text.replace(/\s+([.,!?;:])/g, "$1");

  // 4. Capitaliser après un point/!/? suivi d'un espace
  text = text.replace(/([.!?]\s+)([a-zàâäéèêëïîôùûüÿç])/g, (_m, punct, letter) =>
    punct + letter.toUpperCase()
  );

  // 5. Capitaliser la première lettre
  text = text.replace(/^([a-zàâäéèêëïîôùûüÿç])/, (letter) =>
    letter.toUpperCase()
  );

  // 6. Nettoyer les espaces multiples (sauf les \n)
  text = text.replace(/[^\S\n]+/g, " ");

  // 7. Nettoyer les espaces autour des retours à la ligne
  text = text.replace(/ *\n */g, "\n");

  return text.trim();
}

// ─── Référentiel des commandes (pour les exercices et l'aide) ───

export interface VoiceCommand {
  command: string;
  result: string;
  category: "punctuation" | "formatting" | "casing" | "symbols" | "lists";
  description: string;
}

export const VOICE_COMMANDS_REFERENCE: VoiceCommand[] = [
  // Ponctuation
  { command: "point", result: ".", category: "punctuation", description: "Point final" },
  { command: "virgule", result: ",", category: "punctuation", description: "Virgule" },
  { command: "point d'exclamation", result: "!", category: "punctuation", description: "Point d'exclamation" },
  { command: "point d'interrogation", result: "?", category: "punctuation", description: "Point d'interrogation" },
  { command: "deux-points", result: ":", category: "punctuation", description: "Deux-points" },
  { command: "point-virgule", result: ";", category: "punctuation", description: "Point-virgule" },
  { command: "points de suspension", result: "...", category: "punctuation", description: "Points de suspension" },

  // Formatage
  { command: "à la ligne", result: "↵", category: "formatting", description: "Retour à la ligne" },
  { command: "nouveau paragraphe", result: "↵↵", category: "formatting", description: "Nouveau paragraphe (double retour)" },
  { command: "ouvrir les guillemets", result: "«", category: "formatting", description: "Guillemet ouvrant" },
  { command: "fermer les guillemets", result: "»", category: "formatting", description: "Guillemet fermant" },
  { command: "parenthèse ouvrante", result: "(", category: "formatting", description: "Parenthèse ouvrante" },
  { command: "parenthèse fermante", result: ")", category: "formatting", description: "Parenthèse fermante" },

  // Casse
  { command: "majuscule [mot]", result: "Mot", category: "casing", description: "Met le mot suivant en majuscule initiale" },
  { command: "tout en majuscules [mot]", result: "MOT", category: "casing", description: "Met le mot suivant tout en majuscules" },
  { command: "tout en minuscules [mot]", result: "mot", category: "casing", description: "Met le mot suivant tout en minuscules" },

  // Symboles
  { command: "tiret", result: "-", category: "symbols", description: "Tiret" },
  { command: "arobase", result: "@", category: "symbols", description: "Arobase" },
  { command: "barre oblique", result: "/", category: "symbols", description: "Slash" },

  // Listes
  { command: "puce", result: "• ", category: "lists", description: "Puce de liste" },
  { command: "tiret puce", result: "- ", category: "lists", description: "Tiret de liste" },
];
