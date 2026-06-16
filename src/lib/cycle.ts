/** Prayer-cycle logic. A prayer item stores the `YYYY-MM-DD` days it was prayed;
 *  "prayed this cycle" and streaks are derived from that list + the cycle length. */

import { addDays, localDayKey, startOfWeek } from '@/lib/util/date';

export type Cycle = 'daily' | 'weekly';

function weekContains(prayed: Set<string>, weekStart: Date): boolean {
  for (let i = 0; i < 7; i++) {
    if (prayed.has(localDayKey(addDays(weekStart, i)))) return true;
  }
  return false;
}

export function isPrayedThisCycle(prayed: string[], cycle: Cycle, now: Date = new Date()): boolean {
  if (cycle === 'daily') return prayed.includes(localDayKey(now));
  return weekContains(new Set(prayed), startOfWeek(now));
}

/** Consecutive cycles prayed, counting back from the current (or just-previous) cycle. */
export function currentStreak(prayed: string[], cycle: Cycle, now: Date = new Date()): number {
  const set = new Set(prayed);
  let streak = 0;

  if (cycle === 'daily') {
    let cur = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (!set.has(localDayKey(cur))) cur = addDays(cur, -1);
    while (set.has(localDayKey(cur))) {
      streak++;
      cur = addDays(cur, -1);
    }
    return streak;
  }

  let week = startOfWeek(now);
  if (!weekContains(set, week)) week = addDays(week, -7);
  while (weekContains(set, week)) {
    streak++;
    week = addDays(week, -7);
  }
  return streak;
}

export function cycleLabel(cycle: Cycle): string {
  return cycle === 'daily' ? 'Resets daily' : 'Resets weekly';
}
