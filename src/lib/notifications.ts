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

/** Current permission state without prompting — for "reminders are blocked" UI. */
export async function notificationsGranted(): Promise<boolean> {
  if (!native) return false;
  const current = await notif().getPermissionsAsync();
  return current.granted;
}

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
 * A rotating pool of gentle reminder titles — some fixed, some woven with the
 * list's name. The list-name variants use phrasings that read naturally whether
 * the list is a person ("A moment for Caedyn") or a category ("A moment for
 * Daily Prayers"), so no title is ever grammatically awkward.
 */
const TITLE_TEMPLATES: ((list: string) => string)[] = [
  () => 'Pause to pray',
  () => 'A moment to pray',
  () => 'Time to pray',
  () => 'Be still and pray',
  (list) => `A moment for ${list}`,
  (list) => `Pause to pray through ${list}`,
  (list) => `Praying through ${list}`,
];

const pickTitle = (list: string): string =>
  TITLE_TEMPLATES[Math.floor(Math.random() * TITLE_TEMPLATES.length)](list);

/**
 * Schedule (or replace) a list's daily reminder. The title is drawn at random
 * from TITLE_TEMPLATES and the body quotes a random active prayer from the list;
 * callers re-invoke this on launch so both the wording and the quoted prayer
 * rotate over time (a static local notification can't re-randomise itself).
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
  const body = pick ?? 'A quiet moment in prayer.';
  await N.scheduleNotificationAsync({
    identifier: listReminderId(id),
    content: { title: pickTitle(title), body },
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
