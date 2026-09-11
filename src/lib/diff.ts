import DiffMatchPatch from "diff-match-patch";
import type { DiffSegment, ErrorType } from "./types";

const dmp = new DiffMatchPatch();

/**
 * French punctuation commands → actual punctuation.
 * Used to normalize reference text that contains punctuation words.
 */
const PUNCTUATION_COMMANDS: Record<string, string> = {
  point: ".",
  virgule: ",",
  "point d'exclamation": "!",
  "point d'interrogation": "?",
  "deux-points": ":",
  "point-virgule": ";",
  "à la ligne": "\n",
  "nouveau paragraphe": "\n\n",
  "ouvrir les guillemets": "«",
  "fermer les guillemets": "»",
  "parenthèse ouvrante": "(",
  "parenthèse fermante": ")",
  tiret: "-",
  "barre oblique": "/",
  arobase: "@",
};

/**
 * Normalize text for comparison:
 * - collapse whitespace
 * - trim
 * Note: we preserve case to detect capitalization errors.
 */
function normalize(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/**
 * Normalize for case-insensitive token matching.
 */
function normalizeLower(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Formes canoniques pour la comparaison.
 * Permet d'aligner chiffres ↔ mots parlés et lettres épelées ↔ lettres seules.
 * Appliqué des deux côtés (référence ET reconnaissance) avant le diff.
 */
const COMPARISON_CANON: Record<string, string> = {
  // Chiffres → mot parlé français
  "0": "zéro",
  "1": "un",
  "2": "deux",
  "3": "trois",
  "4": "quatre",
  "5": "cinq",
  "6": "six",
  "7": "sept",
  "8": "huit",
  "9": "neuf",
  "10": "dix",
  // Noms français des lettres → lettre seule
  // (Web Speech API retourne parfois le nom de la lettre au lieu de la lettre)
  // Note : "dé" exclu (mot courant = dé à jouer), géré dans canonicalize() par contexte
  "erre": "r",
  "vé": "v",
  "zède": "z",
  "ixe": "x",
  "wé": "w",
  "yé": "y",
  "ef": "f",
  "el": "l",
  "em": "m",
  "en": "n",
  "pe": "p",
  "qu": "q",
  "es": "s",
  "te": "t",
  // Féminin/variantes fréquentes
  "une": "un",
};

/**
 * Normalise un token vers sa forme canonique pour la comparaison.
 * Ex: "1" → "un", "erre" → "r", "une" → "un"
 * Les lettres isolées (A-Z) sont déjà leur propre forme canonique.
 */
function canonicalize(token: string): string {
  const lower = token.toLowerCase();
  return COMPARISON_CANON[lower] ?? lower;
}

/**
 * Canonicalisation contextuelle : quand le token de référence est une lettre
 * isolée (ex: "D"), on accepte aussi le nom français de cette lettre (ex: "dé").
 * Retourne la forme canonique commune si les deux tokens correspondent.
 */
const LETTER_TO_FRENCH_NAME: Record<string, string[]> = {
  "a": ["ah", "à"],
  "b": ["bé"],
  "c": ["cé", "sé"],
  "d": ["dé"],
  "e": ["eu", "euh"],
  "f": ["ef", "effe"],
  "g": ["gé", "djé"],
  "h": ["ache"],
  "i": ["ih"],
  "j": ["ji", "djè"],
  "k": ["ka"],
  "l": ["el", "elle"],
  "m": ["em", "emme"],
  "n": ["en", "enne"],
  "o": ["oh"],
  "p": ["pé"],
  "q": ["ku"],
  "r": ["erre"],
  "s": ["es", "esse"],
  "t": ["té"],
  "u": ["uh"],
  "v": ["vé"],
  "w": ["doublevé", "double vé"],
  "x": ["ixe"],
  "y": ["igrec", "i grec"],
  "z": ["zède", "zed"],
};

/**
 * Détermine si deux tokens correspondent dans un contexte où l'un pourrait
 * être une lettre isolée et l'autre son nom français.
 */
export function isLetterNameMatch(ref: string, rec: string): boolean {
  const refLow = ref.toLowerCase();
  const recLow = rec.toLowerCase();
  // Lettre isolée dans ref, nom dans rec
  if (refLow.length === 1 && /[a-z]/.test(refLow)) {
    return (LETTER_TO_FRENCH_NAME[refLow] ?? []).includes(recLow);
  }
  // Inverse : nom dans ref, lettre dans rec
  if (recLow.length === 1 && /[a-z]/.test(recLow)) {
    return (LETTER_TO_FRENCH_NAME[recLow] ?? []).includes(refLow);
  }
  return false;
}

/**
 * Tokenize text into words, keeping punctuation as separate tokens.
 */
function tokenize(text: string): string[] {
  return text
    .split(/(\s+|(?<=[.,!?;:()«»\-/])|(?=[.,!?;:()«»\-/]))/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

/**
 * Simple Levenshtein distance for fuzzy matching.
 */
function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    Array(n + 1).fill(0)
  );
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

/**
 * Compare reference text with recognized text.
 * Returns an array of DiffSegments with word-level alignment.
 */
export function compareTexts(
  reference: string,
  recognized: string
): DiffSegment[] {
  const normRef = normalize(reference);
  const normRec = normalize(recognized);

  // Tokenize preserving original case
  const refTokens = tokenize(normRef);
  const recTokens = tokenize(normRec);

  // Diff on lowercase + canonicalized form for alignment.
  // Exemples : "1" == "un", "erre" == "r", "une" == "un"
  // On garde les tokens originaux pour l'affichage.
  const refLower = refTokens.map((t) => canonicalize(t.toLowerCase()));
  const recLower = recTokens.map((t) => canonicalize(t.toLowerCase()));

  const SEP = "\x00";
  const refStr = refLower.join(SEP);
  const recStr = recLower.join(SEP);

  const diffs = dmp.diff_main(refStr, recStr);
  dmp.diff_cleanupSemantic(diffs);

  // We need to map back lowercase diffs to original-case tokens
  let refIdx = 0;
  let recIdx = 0;
  const segments: DiffSegment[] = [];
  let wordIndex = 0;

  for (const [op, text] of diffs) {
    const words = text.split(SEP).filter((w) => w.length > 0);

    for (let k = 0; k < words.length; k++) {
      if (op === 0) {
        // Equal (lowercase match) — check if casing differs
        const origRef = refTokens[refIdx] || words[k];
        const origRec = recTokens[recIdx] || words[k];
        refIdx++;
        recIdx++;

        const semanticMatch =
          canonicalize(origRef.toLowerCase()) === canonicalize(origRec.toLowerCase()) ||
          isLetterNameMatch(origRef, origRec);

        if (origRef === origRec || semanticMatch) {
          // Correspondance exacte ou sémantique (ex: "1" vs "un", "D" vs "dé")
          segments.push({
            type: "equal",
            reference: origRef,
            recognized: origRec,
            wordIndex: wordIndex++,
          });
        } else {
          // Différence de casse uniquement (ex: "Bonjour" vs "bonjour")
          segments.push({
            type: "replace",
            reference: origRef,
            recognized: origRec,
            wordIndex: wordIndex++,
          });
        }
      } else if (op === -1) {
        // Deletion — word in reference but not in recognized
        const origRef = refTokens[refIdx] || words[k];
        refIdx++;
        segments.push({
          type: "delete",
          reference: origRef,
          recognized: "",
          wordIndex: wordIndex++,
        });
      } else if (op === 1) {
        // Insertion — word in recognized but not in reference
        const origRec = recTokens[recIdx] || words[k];
        recIdx++;

        // Try to merge with previous delete to form a substitution
        const lastSeg = segments[segments.length - 1];
        if (lastSeg && lastSeg.type === "delete" && lastSeg.recognized === "") {
          lastSeg.type = "replace";
          lastSeg.recognized = origRec;
        } else {
          segments.push({
            type: "insert",
            reference: "",
            recognized: origRec,
            wordIndex: wordIndex++,
          });
        }
      }
    }
  }

  return segments;
}

/**
 * Classify error type for a diff segment.
 */
export function classifyError(segment: DiffSegment): ErrorType | null {
  if (segment.type === "equal") return null;

  const punctuationChars = new Set([".", ",", "!", "?", ":", ";", "-", "/", "@", "«", "»", "(", ")"]);

  if (segment.type === "delete") {
    if (punctuationChars.has(segment.reference)) return "punctuation";
    return "deletion";
  }

  if (segment.type === "insert") {
    return "insertion";
  }

  if (segment.type === "replace") {
    // Check if it's a punctuation error
    if (
      punctuationChars.has(segment.reference) ||
      punctuationChars.has(segment.recognized)
    ) {
      return "punctuation";
    }
    // Check if it's a command error (e.g., said "point" instead of typing ".")
    const commandValues = Object.values(PUNCTUATION_COMMANDS);
    if (
      commandValues.includes(segment.reference) ||
      commandValues.includes(segment.recognized)
    ) {
      return "command";
    }
    return "substitution";
  }

  return null;
}

/**
 * Check if two words are a "near miss" (fuzzy match).
 * Returns true if they're close enough to be considered a pronunciation issue
 * rather than a completely wrong word.
 */
export function isFuzzyMatch(a: string, b: string): boolean {
  const ca = canonicalize(a.toLowerCase());
  const cb = canonicalize(b.toLowerCase());
  // Après canonicalisation, si égaux → fuzzy (ex: "1" vs "un", "erre" vs "r")
  if (ca === cb) return true;
  // Lettre isolée vs nom français de la lettre (ex: "D" vs "dé")
  if (isLetterNameMatch(a, b)) return true;
  // Seuil adaptatif : tokens courts tolèrent moins d'erreurs
  const minLen = Math.min(ca.length, cb.length);
  if (minLen < 2) return false;
  const maxDist = minLen <= 3 ? 1 : 2;
  return levenshtein(ca, cb) <= maxDist;
}

export { PUNCTUATION_COMMANDS };
