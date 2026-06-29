/**
 * On launch, re-schedule every enabled per-list prayer reminder so the prayer
 * quoted in the notification rotates over time. Renders nothing.
 */
import { useEffect } from 'react';

import { refreshListReminders } from '@/lib/notifications';
import { useData } from '@/lib/store/store';

export function ReminderSync() {
  const prayerLists = useData().prayerLists;
  useEffect(() => {
    refreshListReminders(prayerLists).catch(() => {});
    // Run once per launch; the rotation only needs to refresh on cold start.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
