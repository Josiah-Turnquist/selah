/**
 * Word-level cloze helpers for the fading-recall and build-it study modes.
 * Pure functions — the study screen owns all state and rendering.
 */

export type ClozeKind = 'partial' | 'first-letter' | 'memory';

/**
 * How a verse is scaffolded at each Leitner box: early stages blank out a
 * growing share of words, Strong (box 4) shows only first letters, and
 * Known (box 5) shows nothing but the reference.
 */
export function clozeKind(box: number): ClozeKind {
  if (box >= 5) return 'memory';
  if (box === 4) return 'first-letter';
  return 'partial';
}

// Share of words hidden at boxes 1–3. Even a brand-new card hides a few —
// filling small gaps while reading is the learning mechanic.
const HIDE_FRACTION = [0.25, 0.5, 0.75];

export function hiddenCountForBox(box: number, wordCount: number): number {
  if (wordCount <= 0) return 0;
  if (box >= 4) return wordCount;
  const f = HIDE_FRACTION[Math.max(1, Math.min(3, Math.round(box) || 1)) - 1];
  return Math.max(1, Math.min(wordCount, Math.round(wordCount * f)));
}

export function words(text: string): string[] {
  return text.split(/\s+/).filter(Boolean);
}

export type WordPiece = { lead: string; core: string; trail: string };

/**
 * Split a token into visible punctuation and the hideable core:
 * `"world,"` → lead `"`, core `world`, trail `,"`. A token with no word
 * characters comes back as all-lead so it stays visible.
 */
export function splitPunct(token: string): WordPiece {
  const isWordChar = (ch: string) => /[\p{L}\p{N}]/u.test(ch);
  let start = 0;
  let end = token.length;
  while (start < end && !isWordChar(token[start])) start++;
  while (end > start && !isWordChar(token[end - 1])) end--;
  return { lead: token.slice(0, start), core: token.slice(start, end), trail: token.slice(end) };
}

/** Normalized form used to compare a tapped chip against the expected word. */
export function normalizeWord(w: string): string {
  return w.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
}

/**
 * Pick which token indices to hide for a card at `box`. Only tokens with a
 * hideable core are candidates. `rand` is injectable for tests.
 */
export function pickHiddenIndices(
  tokens: string[],
  box: number,
  rand: () => number = Math.random,
): Set<number> {
  const hideable = tokens.map((t, i) => (splitPunct(t).core ? i : -1)).filter((i) => i >= 0);
  const count = hiddenCountForBox(box, hideable.length);
  for (let i = hideable.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [hideable[i], hideable[j]] = [hideable[j], hideable[i]];
  }
  return new Set(hideable.slice(0, count));
}

/**
 * Tokens that take part in the build game. Pure-punctuation tokens (a lone
 * em-dash, say) are dropped so every chip is actually guessable.
 */
export function buildTokens(text: string): string[] {
  return words(text).filter((t) => normalizeWord(t) !== '');
}

/**
 * Whether a tapped chip satisfies the next expected token. Compared in
 * normalized form so any duplicate of the same word is accepted — the user
 * shouldn't have to guess which "the" chip is the "right" one.
 */
export function chipMatches(expectedToken: string, tapped: string): boolean {
  return normalizeWord(expectedToken) === normalizeWord(tapped);
}

/** Slips allowed in build-it while still grading `good`: 10% of the verse, min 1. */
export function buildSlipAllowance(tokenCount: number): number {
  return Math.max(1, Math.round(tokenCount * 0.1));
}
