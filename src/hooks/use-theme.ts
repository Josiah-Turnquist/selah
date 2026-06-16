/**
 * Resolves the active color set from the selected palette + the effective
 * light/dark scheme (the Appearance setting, falling back to the system scheme).
 */

import { PALETTES } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAppearance, usePaletteId } from '@/lib/store/store';

export function useColorSchemeEffective(): 'light' | 'dark' {
  const system = useColorScheme();
  const appearance = useAppearance();
  if (appearance === 'system') return system === 'dark' ? 'dark' : 'light';
  return appearance;
}

export function useTheme() {
  const palette = usePaletteId();
  const scheme = useColorSchemeEffective();
  return PALETTES[palette][scheme];
}
