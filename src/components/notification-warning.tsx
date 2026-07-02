/**
 * Amber hint shown when a reminder is configured but notification permission is
 * missing (denied at first ask, or revoked later in iOS Settings). Without it a
 * reminder switch can read "on" while nothing ever fires. Tapping opens the
 * system settings so the user can re-enable notifications.
 */

import { BellOff } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { AppState, Linking, Platform, Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { notificationsGranted } from '@/lib/notifications';
import { useTheme } from '@/hooks/use-theme';

export function NotificationWarning({ active }: { active: boolean }) {
  const theme = useTheme();
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    if (!active || Platform.OS === 'web') {
      setBlocked(false);
      return;
    }
    let live = true;
    const check = () => notificationsGranted().then((ok) => live && setBlocked(!ok)).catch(() => {});
    check();
    // Re-check when the app foregrounds — the user may have just changed the
    // permission in Settings and returned.
    const sub = AppState.addEventListener('change', (s) => s === 'active' && check());
    return () => {
      live = false;
      sub.remove();
    };
  }, [active]);

  if (!active || !blocked) return null;
  return (
    <Pressable
      onPress={() => Linking.openSettings()}
      accessibilityRole="button"
      accessibilityLabel="Notifications are off. Open Settings"
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}>
      <BellOff size={14} color={theme.ember} />
      <ThemedText type="caption" style={{ color: theme.ember, flex: 1 }}>
        Notifications are off in Settings, so this reminder can’t be delivered. Tap to fix.
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, marginTop: Spacing.three },
});
