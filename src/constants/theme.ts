/**
 * Selah design tokens. Four selectable color palettes (each with a light + dark
 * variant); the active one is chosen in Settings and resolved by `useTheme()`.
 * Scripture renders with the serif stack; UI uses the sans stack.
 */

import '@/global.css';

import { Platform } from 'react-native';

export type ColorSet = {
  text: string;
  textSecondary: string;
  textTertiary: string;
  background: string;
  backgroundElement: string;
  backgroundSelected: string;
  card: string;
  border: string;
  accent: string;
  accentSoft: string;
  onAccent: string;
  ember: string;
  emberSoft: string;
  success: string;
  successSoft: string;
  danger: string;
};

export type ThemeColor = keyof ColorSet;
export type ColorScheme = 'light' | 'dark';
export type PaletteId = 'mono' | 'forest' | 'slate' | 'clay';
export type Appearance = 'system' | 'light' | 'dark';

// Shared semantic colors (prayer "ember", success, danger) — consistent across palettes.
const semLight = { ember: '#C2683C', emberSoft: '#F4E7DD', success: '#3E8E5A', successSoft: '#E2EFE6', danger: '#BE4434' };
const semDark = { ember: '#E0975E', emberSoft: '#382819', success: '#67C98A', successSoft: '#1C2E22', danger: '#E8705C' };

const make = (light: ColorSet, dark: ColorSet) => ({ light, dark });

export const PALETTES: Record<PaletteId, { light: ColorSet; dark: ColorSet }> = {
  mono: make(
    {
      text: '#18181B',
      textSecondary: '#6B6B70',
      textTertiary: '#A2A2A8',
      background: '#FCFCFC',
      backgroundElement: '#F2F1EF',
      backgroundSelected: '#E6E5E2',
      card: '#FFFFFF',
      border: '#E6E5E2',
      accent: '#1C1C1E',
      accentSoft: '#ECEBE9',
      onAccent: '#FFFFFF',
      ...semLight,
    },
    {
      text: '#ECECEC',
      textSecondary: '#9A9A9F',
      textTertiary: '#6A6A6F',
      background: '#0E0E0F',
      backgroundElement: '#1A1A1C',
      backgroundSelected: '#27272A',
      card: '#161617',
      border: '#2A2A2D',
      accent: '#ECECEC',
      accentSoft: '#27272A',
      onAccent: '#0E0E0F',
      ...semDark,
    },
  ),
  forest: make(
    {
      text: '#1A1F1B',
      textSecondary: '#5E6B62',
      textTertiary: '#98A39B',
      background: '#F8F9F7',
      backgroundElement: '#ECEFEA',
      backgroundSelected: '#DEE4DB',
      card: '#FFFFFF',
      border: '#E1E6DD',
      accent: '#2F6B4E',
      accentSoft: '#E3EDE6',
      onAccent: '#FFFFFF',
      ...semLight,
    },
    {
      text: '#EAF0EC',
      textSecondary: '#9AA8A0',
      textTertiary: '#6A776F',
      background: '#0F1311',
      backgroundElement: '#1A201C',
      backgroundSelected: '#252D27',
      card: '#161B18',
      border: '#29322C',
      accent: '#5FB489',
      accentSoft: '#1E2A23',
      onAccent: '#0E1410',
      ...semDark,
    },
  ),
  slate: make(
    {
      text: '#1A1E24',
      textSecondary: '#5C6675',
      textTertiary: '#98A1B0',
      background: '#F7F8FA',
      backgroundElement: '#EBEEF2',
      backgroundSelected: '#DDE2EA',
      card: '#FFFFFF',
      border: '#E2E6EC',
      accent: '#3C5571',
      accentSoft: '#E6EBF1',
      onAccent: '#FFFFFF',
      ...semLight,
    },
    {
      text: '#E9ECF1',
      textSecondary: '#99A2B2',
      textTertiary: '#69727F',
      background: '#0E1014',
      backgroundElement: '#1A1E24',
      backgroundSelected: '#252B33',
      card: '#161A1F',
      border: '#29303A',
      accent: '#7FA0C2',
      accentSoft: '#1D2530',
      onAccent: '#0E1014',
      ...semDark,
    },
  ),
  clay: make(
    {
      text: '#211B17',
      textSecondary: '#6E625A',
      textTertiary: '#A99E94',
      background: '#FAF8F6',
      backgroundElement: '#F0ECE8',
      backgroundSelected: '#E6DFD8',
      card: '#FFFFFF',
      border: '#EBE4DD',
      accent: '#B05A3C',
      accentSoft: '#F4E6DF',
      onAccent: '#FFFFFF',
      ...semLight,
    },
    {
      text: '#F1EAE4',
      textSecondary: '#AC9E92',
      textTertiary: '#7C7065',
      background: '#121010',
      backgroundElement: '#1F1B18',
      backgroundSelected: '#2B2521',
      card: '#1B1714',
      border: '#332B25',
      accent: '#D08862',
      accentSoft: '#34251D',
      onAccent: '#16100C',
      ...semDark,
    },
  ),
};

export const DEFAULT_PALETTE: PaletteId = 'mono';

export const PALETTE_META: { id: PaletteId; name: string }[] = [
  { id: 'mono', name: 'Mono' },
  { id: 'forest', name: 'Forest' },
  { id: 'slate', name: 'Slate' },
  { id: 'clay', name: 'Clay' },
];

/** Backward-compatible default colors (used pre-hydration, before a palette is known). */
export const Colors = PALETTES[DEFAULT_PALETTE];

/** Verse highlight swatches — independent of palette. */
export const HIGHLIGHT_COLORS = ['yellow', 'green', 'blue', 'pink', 'orange'] as const;
export type HighlightColor = (typeof HIGHLIGHT_COLORS)[number];

export const Highlights: Record<HighlightColor, { light: string; dark: string; dot: string }> = {
  yellow: { light: '#FBE38C', dark: '#5E5414', dot: '#E9C34A' },
  green: { light: '#C2E6AE', dark: '#2F4A22', dot: '#7FBE63' },
  blue: { light: '#AED4F4', dark: '#203D57', dot: '#5AA0DB' },
  pink: { light: '#F4BFD3', dark: '#532638', dot: '#D86E97' },
  orange: { light: '#F7C99C', dark: '#56331A', dot: '#E0894A' },
};

export function highlightBg(color: HighlightColor, scheme: ColorScheme): string {
  return Highlights[color][scheme];
}

export const Fonts = Platform.select({
  ios: { sans: 'system-ui', serif: 'ui-serif', rounded: 'ui-rounded', mono: 'ui-monospace' },
  default: { sans: 'normal', serif: 'serif', rounded: 'normal', mono: 'monospace' },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
})!;

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 12,
  four: 16,
  five: 24,
  six: 32,
  eight: 48,
} as const;

export const Radius = { sm: 8, md: 12, lg: 18, xl: 26, pill: 999 } as const;

export const BottomTabInset = Platform.select({ ios: 88, android: 72, default: 68 });
export const MaxContentWidth = 720;
