/** Lightweight Leitner spaced-repetition scheduling for study cards. */

import type { Card } from '@/lib/store/types';

export type Grade = 'again' | 'good' | 'easy';

const DAY = 86_400_000;
// Interval (in days) to wait before a card in each Leitner box is due again.
const BOX_INTERVAL_DAYS = [0, 1, 3, 7, 16, 35]; // index by box 1..5

export function intervalDaysForBox(box: number): number {
  return BOX_INTERVAL_DAYS[Math.max(1, Math.min(5, box))];
}

export function applyGrade(card: Card, grade: Grade, now: number = Date.now(), maxBox: number = 5): Card {
  // Legacy/imported cards can lack a numeric box; treat them as box 1 rather
  // than letting NaN poison the schedule.
  let box = Number.isFinite(card.box) ? card.box : 1;
  if (grade === 'again') box = 1;
  else {
    // `maxBox` caps how far this review can *promote* the card: recognition
    // modes (multiple choice) pass a ceiling below Known since a right pick
    // can be a lucky guess. A card already above the cap keeps its stage —
    // the cap never demotes, and a miss still resets to box 1 above.
    const ceiling = Math.min(5, Math.max(maxBox, box));
    box = Math.min(ceiling, box + (grade === 'good' ? 1 : 2));
  }
  return {
    ...card,
    box,
    reviews: card.reviews + 1,
    due: now + intervalDaysForBox(box) * DAY,
  };
}

/**
 * Human names for the five Leitner boxes — shown everywhere instead of raw
 * numbers. A card climbs New → Learning → Familiar → Strong → Known as it's
 * reviewed successfully, and drops back to New when missed.
 */
export const STAGES = ['New', 'Learning', 'Familiar', 'Strong', 'Known'] as const;

export function stageLabel(box: number): string {
  return STAGES[Math.max(1, Math.min(5, Math.round(box) || 1)) - 1];
}

export function isDue(card: Card, now: number = Date.now()): boolean {
  return card.due <= now;
}

export function dueCount(cards: Card[], now: number = Date.now()): number {
  return cards.reduce((n, c) => (isDue(c, now) ? n + 1 : n), 0);
}
