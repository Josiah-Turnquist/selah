/**
 * Background sync with the Selah API, run on launch and whenever the app
 * foregrounds (throttled). One pass: ensure an anonymous account exists, push
 * our progress snapshot, pull friends, and upload the weekly backup when due.
 * Everything is fire-and-forget — the app never depends on it. Renders nothing.
 */

import { useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';

import { apiConfigured, createAccount, fetchFriends, pushProgress, uploadBackup } from '@/lib/api/client';
import { dayStreak } from '@/lib/store/prayer-stats';
import { useActions, useData } from '@/lib/store/store';
import type { AppData } from '@/lib/store/types';
import { daysSince, localDayKey } from '@/lib/util/date';

const SYNC_THROTTLE_MS = 5 * 60_000;
const BACKUP_EVERY_DAYS = 7;

function snapshotOf(d: AppData) {
  const plan = d.plans[0] ?? null;
  return {
    displayName: d.settings.displayName || 'Friend',
    planTitle: plan?.title ?? null,
    planDurationDays: plan?.durationDays ?? null,
    completedDays: plan ? Object.keys(plan.completedDays).length : null,
    readStreak: dayStreak(new Set(d.readDays)),
    lastActiveDay: d.readDays[d.readDays.length - 1] ?? null,
  };
}

export function SyncManager() {
  const data = useData();
  const actions = useActions();
  const dataRef = useRef(data);
  dataRef.current = data;
  const busy = useRef(false);

  useEffect(() => {
    if (!apiConfigured() || Platform.OS === 'web') return;

    const sync = async () => {
      if (busy.current) return;
      const d = dataRef.current;
      if (d.account?.lastSyncAt && Date.now() - d.account.lastSyncAt < SYNC_THROTTLE_MS) return;
      busy.current = true;
      try {
        let account = d.account ?? null;
        if (!account) {
          account = await createAccount(d.settings.displayName || 'Friend');
          actions.setAccount(account);
        }

        await pushProgress(account, snapshotOf(d));

        const friends = await fetchFriends(account);
        if (JSON.stringify(friends) !== JSON.stringify(d.friends)) actions.setFriends(friends);

        const backupDue = !account.lastBackupAt || daysSince(account.lastBackupAt) >= BACKUP_EVERY_DAYS;
        if (backupDue) {
          await uploadBackup(account, dataRef.current);
          account = { ...account, lastBackupAt: localDayKey() };
        }

        actions.setAccount({ ...account, lastSyncAt: Date.now() });
      } catch {
        // Offline or server down — local-first means we simply try again later.
      } finally {
        busy.current = false;
      }
    };

    void sync();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && void sync());
    return () => sub.remove();
    // Mount + foreground only — data changes must not trigger sync loops.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
