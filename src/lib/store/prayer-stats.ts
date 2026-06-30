/**
 * Prayer metrics derived entirely from existing data (each item's `prayed` days
 * and `answered` flag) — no extra storage. The same function powers the overall
 * summary (pass every list) and a per-list breakdown (pass a single list).
 */

import { addDays, localDayKey, startOfWeek } from '@/lib/util/date';

import type { PrayerList } from './types';

export type PrayerStats = {
  activeCount: number; // requests not yet answered
  answeredCount: number;
  totalPrayed: number; // every "prayed" check-in, all time
  daysPrayed: number; // distinct days with at least one prayer
  streak: number; // consecutive days (counting back from today) with ≥1 prayer
  thisWeek: number; // distinct days prayed in the current week
};

function daySet(lists: PrayerList[]): Set<string> {
  const s = new Set<string>();
  for (const l of lists) for (const it of l.items) for (const d of it.prayed) s.add(d);
  return s;
}

/** Consecutive days, counting back from today (or yesterday), with any prayer. */
export function dayStreak(days: Set<string>, now: Date = new Date()): number {
  let cur = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (!days.has(localDayKey(cur))) cur = addDays(cur, -1);
  let streak = 0;
  while (days.has(localDayKey(cur))) {
    streak++;
    cur = addDays(cur, -1);
  }
  return streak;
}

export function statsFor(lists: PrayerList[], now: Date = new Date()): PrayerStats {
  let totalPrayed = 0;
  let activeCount = 0;
  let answeredCount = 0;
  for (const l of lists) {
    for (const it of l.items) {
      if (it.answered) answeredCount++;
      else activeCount++;
      totalPrayed += it.prayed.length;
    }
  }
  const days = daySet(lists);
  const weekStart = startOfWeek(now);
  let thisWeek = 0;
  for (let i = 0; i < 7; i++) if (days.has(localDayKey(addDays(weekStart, i)))) thisWeek++;
  return {
    activeCount,
    answeredCount,
    totalPrayed,
    daysPrayed: days.size,
    streak: dayStreak(days, now),
    thisWeek,
  };
}
