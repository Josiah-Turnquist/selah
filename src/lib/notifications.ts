/**
 * Local notifications: a daily reading reminder plus an optional per-prayer-list
 * reminder. Each notification owns a stable identifier so scheduling one never
 * disturbs the others.
 *
 * `expo-notifications` is pulled in with a guarded `require` (not a top-level
 * import, and not an async `import()` — the latter resolves through Metro's
 * async-require path, which can fail at runtime). On web every entry point
 * returns before the require runs, so the module never loads in the browser.
 */

import { Platform } from 'react-native';

const native = Platform.OS !== 'web';

// Lazy, synchronous — evaluated only when first called, and only on native.
const notif = (): typeof import('expo-notifications') => require('expo-notifications');

const READING_ID = 'daily-reading';
const listReminderId = (id: string) => `prayer-list-${id}`;

export async function ensureNotificationPermission(): Promise<boolean> {
  if (!native) return false;
  const N = notif();
  const current = await N.getPermissionsAsync();
  if (current.granted) return true;
  const requested = await N.requestPermissionsAsync();
  return requested.granted;
}

export async function scheduleDailyReminder(hour: number): Promise<void> {
  if (!native) return;
  const N = notif();
  await N.cancelScheduledNotificationAsync(READING_ID).catch(() => {});
  await N.scheduleNotificationAsync({
    identifier: READING_ID,
    content: { title: 'Time to read', body: 'Spend a moment in the Word today.' },
    trigger: { type: N.SchedulableTriggerInputTypes.DAILY, hour, minute: 0 },
  });
}

/** Cancels only the reading reminder (prayer-list reminders are untouched). */
export async function cancelReminders(): Promise<void> {
  if (!native) return;
  const N = notif();
  await N.cancelScheduledNotificationAsync(READING_ID).catch(() => {});
}

/**
 * Schedule (or replace) a list's daily reminder. The body quotes a random active
 * prayer from the list; callers re-invoke this on launch so the quoted prayer
 * rotates over time (a static local notification can't re-randomise itself).
 */
export async function scheduleListReminder(
  id: string,
  title: string,
  hour: number,
  items: string[],
): Promise<void> {
  if (!native) return;
  const N = notif();
  await N.cancelScheduledNotificationAsync(listReminderId(id)).catch(() => {});
  const pick = items.length ? items[Math.floor(Math.random() * items.length)] : null;
  const body = pick ?? `A moment to pray through ${title}.`;
  await N.scheduleNotificationAsync({
    identifier: listReminderId(id),
    content: { title: `Pray · ${title}`, body },
    trigger: { type: N.SchedulableTriggerInputTypes.DAILY, hour, minute: 0 },
  });
}

export async function cancelListReminder(id: string): Promise<void> {
  if (!native) return;
  const N = notif();
  await N.cancelScheduledNotificationAsync(listReminderId(id)).catch(() => {});
}

type ListLike = {
  id: string;
  title: string;
  reminderHour?: number | null;
  items: { text: string; answered?: boolean }[];
};

/** Re-schedule every enabled list reminder (rotates the quoted prayer). Never throws. */
export async function refreshListReminders(lists: ListLike[]): Promise<void> {
  if (!native) return;
  for (const l of lists) {
    if (l.reminderHour == null) continue;
    const items = l.items.filter((it) => !it.answered).map((it) => it.text);
    await scheduleListReminder(l.id, l.title, l.reminderHour, items).catch(() => {});
  }
}

export function formatHour(hour: number): string {
  const h12 = ((hour + 11) % 12) + 1;
  return `${h12}:00 ${hour < 12 ? 'AM' : 'PM'}`;
}
