/**
 * A rotating "verse of the day" — a curated list of well-loved references.
 * Only refs are stored; the text is fetched in the user's current translation.
 */

import type { VerseRef } from '@/lib/bible/refs';

export const VOTD_REFS: VerseRef[] = [
  { bookId: 43, chapter: 3, verse: 16 }, // John 3:16
  { bookId: 24, chapter: 29, verse: 11 }, // Jeremiah 29:11
  { bookId: 50, chapter: 4, verse: 13 }, // Philippians 4:13
  { bookId: 45, chapter: 8, verse: 28 }, // Romans 8:28
  { bookId: 20, chapter: 3, verse: 5 }, // Proverbs 3:5
  { bookId: 19, chapter: 23, verse: 1 }, // Psalm 23:1
  { bookId: 23, chapter: 41, verse: 10 }, // Isaiah 41:10
  { bookId: 6, chapter: 1, verse: 9 }, // Joshua 1:9
  { bookId: 50, chapter: 4, verse: 6 }, // Philippians 4:6
  { bookId: 40, chapter: 6, verse: 33 }, // Matthew 6:33
  { bookId: 45, chapter: 12, verse: 2 }, // Romans 12:2
  { bookId: 48, chapter: 5, verse: 22 }, // Galatians 5:22
  { bookId: 49, chapter: 2, verse: 8 }, // Ephesians 2:8
  { bookId: 19, chapter: 46, verse: 10 }, // Psalm 46:10
  { bookId: 47, chapter: 5, verse: 17 }, // 2 Corinthians 5:17
  { bookId: 46, chapter: 13, verse: 4 }, // 1 Corinthians 13:4
  { bookId: 58, chapter: 11, verse: 1 }, // Hebrews 11:1
  { bookId: 19, chapter: 119, verse: 105 }, // Psalm 119:105
  { bookId: 40, chapter: 11, verse: 28 }, // Matthew 11:28
  { bookId: 43, chapter: 14, verse: 6 }, // John 14:6
  { bookId: 45, chapter: 5, verse: 8 }, // Romans 5:8
  { bookId: 62, chapter: 4, verse: 19 }, // 1 John 4:19
  { bookId: 50, chapter: 4, verse: 19 }, // Philippians 4:19
  { bookId: 20, chapter: 16, verse: 3 }, // Proverbs 16:3
  { bookId: 23, chapter: 40, verse: 31 }, // Isaiah 40:31
  { bookId: 19, chapter: 27, verse: 1 }, // Psalm 27:1
  { bookId: 25, chapter: 3, verse: 23 }, // Lamentations 3:23
  { bookId: 40, chapter: 5, verse: 16 }, // Matthew 5:16
  { bookId: 59, chapter: 1, verse: 5 }, // James 1:5
  { bookId: 60, chapter: 5, verse: 7 }, // 1 Peter 5:7
  { bookId: 19, chapter: 37, verse: 4 }, // Psalm 37:4
  { bookId: 51, chapter: 3, verse: 23 }, // Colossians 3:23
  { bookId: 33, chapter: 6, verse: 8 }, // Micah 6:8
  { bookId: 5, chapter: 31, verse: 6 }, // Deuteronomy 31:6
  { bookId: 55, chapter: 1, verse: 7 }, // 2 Timothy 1:7
  { bookId: 41, chapter: 12, verse: 30 }, // Mark 12:30
  { bookId: 19, chapter: 118, verse: 24 }, // Psalm 118:24
  { bookId: 20, chapter: 18, verse: 10 }, // Proverbs 18:10
];

function dayOfYear(d: Date): number {
  const start = new Date(d.getFullYear(), 0, 0);
  return Math.floor((d.getTime() - start.getTime()) / 86_400_000);
}

export function verseOfDay(d: Date = new Date()): VerseRef {
  return VOTD_REFS[dayOfYear(d) % VOTD_REFS.length];
}
