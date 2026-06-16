/**
 * Curated translation list (sourced from the Bolls API catalogue). Public-domain
 * versions are surfaced first and used as the default so the app ships clean;
 * the rest are available via the picker.
 */

export type Translation = {
  short: string;
  name: string;
  publicDomain: boolean;
};

export const DEFAULT_TRANSLATION = 'WEB';

export const TRANSLATIONS: Translation[] = [
  { short: 'WEB', name: 'World English Bible', publicDomain: true },
  { short: 'KJV', name: 'King James Version', publicDomain: true },
  { short: 'ASV', name: 'American Standard Version (1901)', publicDomain: true },
  { short: 'YLT', name: "Young's Literal Translation", publicDomain: true },
  { short: 'GNV', name: 'Geneva Bible (1599)', publicDomain: true },
  { short: 'DRB', name: 'Douay-Rheims Bible', publicDomain: true },
  { short: 'BSB', name: 'Berean Standard Bible', publicDomain: true },
  { short: 'LSV', name: 'Literal Standard Version', publicDomain: true },
  // Widely-used modern versions (served by Bolls; licensing belongs to publishers).
  { short: 'ESV', name: 'English Standard Version', publicDomain: false },
  { short: 'NIV', name: 'New International Version (1984)', publicDomain: false },
  { short: 'NLT', name: 'New Living Translation', publicDomain: false },
  { short: 'NASB', name: 'New American Standard Bible', publicDomain: false },
  { short: 'CSB17', name: 'Christian Standard Bible', publicDomain: false },
  { short: 'AMP', name: 'Amplified Bible', publicDomain: false },
  { short: 'MSG', name: 'The Message', publicDomain: false },
];

const BY_SHORT = new Map(TRANSLATIONS.map((t) => [t.short, t]));

export function translationName(short: string): string {
  return BY_SHORT.get(short)?.name ?? short;
}
