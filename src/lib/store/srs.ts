/** Lightweight Leitner spaced-repetition scheduling for study cards. */

import type { Card } from '@/lib/store/types';

export type Grade = 'again' | 'good' | 'easy';

const DAY = 86_400_000;
// Interval (in days) to wait before a card in each Leitner box is due again.
const BOX_INTERVAL_DAYS = [0, 1, 3, 7, 16, 35]; // index by box 1..5

export function intervalDaysForBox(box: number): number {
  return BOX_INTERVAL_DAYS[Math.max(1, Math.min(5, box))];
}

export function applyGrade(card: Card, grade: Grade, now: number = Date.now()): Card {
  let box = card.box;
  if (grade === 'again') box = 1;
  else if (grade === 'good') box = Math.min(5, box + 1);
  else box = Math.min(5, box + 2);
  return {
    ...card,
    box,
    reviews: card.reviews + 1,
    due: now + intervalDaysForBox(box) * DAY,
  };
}

export function isDue(card: Card, now: number = Date.now()): boolean {
  return card.due <= now;
}

export function dueCount(cards: Card[], now: number = Date.now()): number {
  return cards.reduce((n, c) => (isDue(c, now) ? n + 1 : n), 0);
}
