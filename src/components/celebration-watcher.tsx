/**
 * Watches the reading streak and fires a celebration the moment it crosses a
 * milestone. Already-achieved milestones (from past sessions) are seeded as
 * "seen" on mount, so we only celebrate streaks earned during this session —
 * which, since a day is only recorded by opening a chapter, is always live.
 */

import { Flame } from 'lucide-react-native';
import { useEffect, useRef } from 'react';

import { useCelebrate } from '@/components/ui/celebrate';
import { currentStreak } from '@/lib/cycle';
import { useData } from '@/lib/store/store';

const MILESTONES = [3, 7, 14, 30, 50, 100, 150, 200, 365];

function streakLine(m: number): string {
  if (m >= 365) return 'A full year in the Word. Remarkable faithfulness.';
  if (m >= 100) return 'A hundred days of showing up. Keep going.';
  if (m >= 50) return 'Fifty days steady in Scripture.';
  if (m >= 30) return 'A month of daily time in the Word.';
  if (m >= 14) return 'Two weeks strong. The habit is taking root.';
  if (m >= 7) return 'A full week of daily reading. Well done.';
  return 'Three days in a row. A good beginning.';
}

export function CelebrationWatcher() {
  const data = useData();
  const celebrate = useCelebrate();
  const seen = useRef<Set<number>>(new Set());
  const seeded = useRef(false);

  const streak = currentStreak(data.readDays, 'daily');

  // Seed already-earned milestones once so we only celebrate new crossings.
  if (!seeded.current) {
    for (const m of MILESTONES) if (m <= streak) seen.current.add(m);
    seeded.current = true;
  }

  useEffect(() => {
    if (MILESTONES.includes(streak) && !seen.current.has(streak)) {
      seen.current.add(streak);
      celebrate({
        title: `${streak}-day streak`,
        subtitle: streakLine(streak),
        icon: Flame,
        tone: 'ember',
      });
    }
  }, [streak, celebrate]);

  return null;
}
