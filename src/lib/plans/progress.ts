import { addDays, daysSince } from '@/lib/util/date';
import type { PlanProgress } from '@/lib/store/types';

export type PlanStats = {
  completedCount: number;
  pct: number;
  /** The day number you'd be on if perfectly on schedule (1-based, capped). */
  scheduledDay: number;
  /** First not-yet-completed day; > durationDays once finished. */
  nextDay: number;
  /** How many days behind schedule (0 if caught up or ahead). */
  behind: number;
  finished: boolean;
  /** When the plan lands if the current schedule holds. */
  finishDate: Date;
};

export function planStats(plan: PlanProgress, now: Date = new Date()): PlanStats {
  const completedCount = Object.keys(plan.completedDays).length;
  const pct = plan.durationDays ? completedCount / plan.durationDays : 0;
  // The schedule runs from the anchor ("catch me up" moves it), while startedAt
  // stays forever-true history.
  const anchor = plan.scheduleAnchor ?? plan.startedAt;
  const scheduledDay = Math.min(plan.durationDays, daysSince(anchor, now) + 1);

  let nextDay = 1;
  while (nextDay <= plan.durationDays && plan.completedDays[nextDay]) nextDay++;

  const [y, m, d] = anchor.split('-').map(Number);
  const finishDate = addDays(new Date(y, (m || 1) - 1, d || 1), plan.durationDays - 1);

  return {
    completedCount,
    pct,
    scheduledDay,
    nextDay,
    // Only days missed BEFORE today count as behind — today's reading being
    // still ahead of you isn't a deficit (a fresh plan is on track, not
    // "1 day behind", and "Catch me up" genuinely lands on zero).
    behind: Math.max(0, scheduledDay - 1 - completedCount),
    finished: completedCount >= plan.durationDays,
    finishDate,
  };
}

/** "Finishes about July 30" style label for the schedule contract. */
export function finishLabel(stats: PlanStats): string {
  return stats.finishDate.toLocaleDateString(undefined, { month: 'long', day: 'numeric' });
}
