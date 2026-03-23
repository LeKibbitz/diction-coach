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

  // Diff on lowercase for alignment (so "Bonjour" matches "bonjour" in alignment)
  // but we keep original tokens for display and casing error detection
  const refLower = refTokens.map((t) => t.toLowerCase());
  const recLower = recTokens.map((t) => t.toLowerCase());

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

        if (origRef !== origRec) {
          // Casing mismatch (e.g., "Bonjour" vs "bonjour")
          segments.push({
            type: "replace",
            reference: origRef,
            recognized: origRec,
            wordIndex: wordIndex++,
          });
        } else {
          segments.push({
            type: "equal",
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
  if (a.length < 4 || b.length < 4) return false;
  const dist = levenshtein(a.toLowerCase(), b.toLowerCase());
  return dist <= 2;
}

export { PUNCTUATION_COMMANDS };
