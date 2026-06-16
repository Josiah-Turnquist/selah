/**
 * Daily reading reminder via a repeating local notification.
 * No-ops on web; `expo-notifications` is imported lazily so it never loads in
 * the browser (where it logs unsupported push-token warnings).
 */

import { Platform } from 'react-native';

const native = Platform.OS !== 'web';

export async function ensureNotificationPermission(): Promise<boolean> {
  if (!native) return false;
  const N = await import('expo-notifications');
  const current = await N.getPermissionsAsync();
  if (current.granted) return true;
  const requested = await N.requestPermissionsAsync();
  return requested.granted;
}

export async function scheduleDailyReminder(hour: number): Promise<void> {
  if (!native) return;
  const N = await import('expo-notifications');
  await N.cancelAllScheduledNotificationsAsync();
  await N.scheduleNotificationAsync({
    content: { title: 'Time to read', body: 'Spend a moment in the Word today.' },
    trigger: { type: N.SchedulableTriggerInputTypes.DAILY, hour, minute: 0 },
  });
}

export async function cancelReminders(): Promise<void> {
  if (!native) return;
  const N = await import('expo-notifications');
  await N.cancelAllScheduledNotificationsAsync();
}

export function formatHour(hour: number): string {
  const h12 = ((hour + 11) % 12) + 1;
  return `${h12}:00 ${hour < 12 ? 'AM' : 'PM'}`;
}
