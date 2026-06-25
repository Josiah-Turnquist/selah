/**
 * Verse reference helpers. A "ref key" is a stable, translation-independent
 * identifier for a single verse: `${bookId}.${chapter}.${verse}`.
 */

import { bookName } from './books';

export type VerseRef = { bookId: number; chapter: number; verse: number };

export function refKey(bookId: number, chapter: number, verse: number): string {
  return `${bookId}.${chapter}.${verse}`;
}

export function parseRefKey(key: string): VerseRef | null {
  const parts = key.split('.').map((n) => parseInt(n, 10));
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return null;
  return { bookId: parts[0], chapter: parts[1], verse: parts[2] };
}

/** "John 3:16" or "John 3" when no verse is given. */
export function formatRef(bookId: number, chapter: number, verse?: number): string {
  const base = `${bookName(bookId)} ${chapter}`;
  return verse == null ? base : `${base}:${verse}`;
}

/**
 * Compact a day's chapter readings into a readable label, collapsing consecutive
 * chapters in the same book into ranges:
 *   [Gen 1, Gen 2, Gen 3]        -> "Genesis 1–3"
 *   [Gen 49, Gen 50, Exo 1]      -> "Genesis 49–50 · Exodus 1"
 *   [Psalm 30, Proverbs 30]      -> "Psalms 30 · Proverbs 30"
 */
export function formatReadingList(readings: { bookId: number; chapter: number }[]): string {
  const parts: string[] = [];
  let i = 0;
  while (i < readings.length) {
    const { bookId } = readings[i];
    const start = readings[i].chapter;
    let end = start;
    let j = i + 1;
    while (j < readings.length && readings[j].bookId === bookId && readings[j].chapter === end + 1) {
      end = readings[j].chapter;
      j++;
    }
    const name = bookName(bookId);
    parts.push(start === end ? `${name} ${start}` : `${name} ${start}–${end}`);
    i = j;
  }
  return parts.join(' · ');
}

/** Compress a sorted verse list into a range label, e.g. [1,2,3,5] -> "1-3, 5". */
export function formatVerseRange(verses: number[]): string {
  if (verses.length === 0) return '';
  const sorted = [...verses].sort((a, b) => a - b);
  const runs: string[] = [];
  let start = sorted[0];
  let prev = sorted[0];
  for (let i = 1; i <= sorted.length; i++) {
    const v = sorted[i];
    if (v === prev + 1) {
      prev = v;
      continue;
    }
    runs.push(start === prev ? `${start}` : `${start}-${prev}`);
    start = v;
    prev = v;
  }
  return runs.join(', ');
}
