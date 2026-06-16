/** Local-time date helpers. Day keys are `YYYY-MM-DD` in the device timezone. */

export function localDayKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

/** Monday-based start of the week, at local midnight. */
export function startOfWeek(d: Date = new Date()): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const mondayOffset = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - mondayOffset);
  return x;
}

/** Whole days from a `YYYY-MM-DD` key until `now` (0 = same day). */
export function daysSince(dayKey: string, now: Date = new Date()): number {
  const [y, m, d] = dayKey.split('-').map(Number);
  const start = new Date(y, m - 1, d).getTime();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.round((today - start) / 86400000);
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatDayLabel(dayKey: string): string {
  const [, m, d] = dayKey.split('-').map(Number);
  return `${MONTHS[m - 1]} ${d}`;
}

export function relativeDayLabel(dayKey: string, now: Date = new Date()): string {
  const diff = daysSince(dayKey, now);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff > 1 && diff < 7) return `${diff} days ago`;
  return formatDayLabel(dayKey);
}
