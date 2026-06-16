import { daysSince } from '@/lib/util/date';
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
};

export function planStats(plan: PlanProgress, now: Date = new Date()): PlanStats {
  const completedCount = Object.keys(plan.completedDays).length;
  const pct = plan.durationDays ? completedCount / plan.durationDays : 0;
  const scheduledDay = Math.min(plan.durationDays, daysSince(plan.startedAt, now) + 1);

  let nextDay = 1;
  while (nextDay <= plan.durationDays && plan.completedDays[nextDay]) nextDay++;

  return {
    completedCount,
    pct,
    scheduledDay,
    nextDay,
    behind: Math.max(0, scheduledDay - completedCount),
    finished: completedCount >= plan.durationDays,
  };
}
