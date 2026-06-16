/**
 * Reading-plan templates, generated from the canonical book metadata so the
 * day-by-day schedule is always internally consistent. Plans are *Bible-reading*
 * plans only (no commentary) — that's the product's deliberate constraint.
 */

import { bookById, BOOKS } from '@/lib/bible/books';

export type ReadingRef = { bookId: number; chapter: number };

export type PlanCategory = 'Whole Bible' | 'New Testament' | 'Gospels' | 'Wisdom';

export type PlanTemplate = {
  id: string;
  title: string;
  subtitle: string;
  category: PlanCategory;
  durationDays: number;
  days: ReadingRef[][]; // days[0] = day 1's readings
};

function chaptersOf(bookIds: number[]): ReadingRef[] {
  const refs: ReadingRef[] = [];
  for (const id of bookIds) {
    const book = bookById(id);
    if (!book) continue;
    for (let c = 1; c <= book.chapters; c++) refs.push({ bookId: id, chapter: c });
  }
  return refs;
}

/** Split a list into `days` contiguous, as-even-as-possible groups. */
function chunkEvenly<T>(items: T[], days: number): T[][] {
  const out: T[][] = [];
  const base = Math.floor(items.length / days);
  const remainder = items.length % days;
  let idx = 0;
  for (let d = 0; d < days; d++) {
    const take = base + (d < remainder ? 1 : 0);
    out.push(items.slice(idx, idx + take));
    idx += take;
  }
  return out;
}

const NT_IDS = BOOKS.filter((b) => b.testament === 'NT').map((b) => b.id);
const ALL_IDS = BOOKS.map((b) => b.id);
const GOSPEL_IDS = [40, 41, 42, 43];

function psalmsProverbsPlan(): ReadingRef[][] {
  // 31 days: one Proverb a day, with the Psalms spread evenly alongside.
  const psalmChunks = chunkEvenly(chaptersOf([19]), 31);
  const days: ReadingRef[][] = [];
  for (let d = 0; d < 31; d++) {
    days.push([...psalmChunks[d], { bookId: 20, chapter: d + 1 }]);
  }
  return days;
}

export const TEMPLATES: PlanTemplate[] = [
  {
    id: 'bible-in-a-year',
    title: 'Bible in a Year',
    subtitle: 'The whole story, ~3–4 chapters a day',
    category: 'Whole Bible',
    durationDays: 365,
    days: chunkEvenly(chaptersOf(ALL_IDS), 365),
  },
  {
    id: 'nt-90',
    title: 'New Testament in 90 Days',
    subtitle: 'Matthew through Revelation in three months',
    category: 'New Testament',
    durationDays: 90,
    days: chunkEvenly(chaptersOf(NT_IDS), 90),
  },
  {
    id: 'gospels-30',
    title: 'Gospels in 30 Days',
    subtitle: 'Walk with Jesus through all four Gospels',
    category: 'Gospels',
    durationDays: 30,
    days: chunkEvenly(chaptersOf(GOSPEL_IDS), 30),
  },
  {
    id: 'psalms-proverbs-31',
    title: 'Psalms & Proverbs in 31 Days',
    subtitle: 'A month of worship and wisdom',
    category: 'Wisdom',
    durationDays: 31,
    days: psalmsProverbsPlan(),
  },
  {
    id: 'john-21',
    title: 'John in 21 Days',
    subtitle: 'One chapter a day — a gentle place to start',
    category: 'Gospels',
    durationDays: 21,
    days: chaptersOf([43]).map((ref) => [ref]),
  },
];

const BY_ID = new Map(TEMPLATES.map((t) => [t.id, t]));

export function templateById(id: string): PlanTemplate | undefined {
  return BY_ID.get(id);
}
