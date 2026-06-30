/** A single prayer request row — shared by the list view, All Prayers and Answered. */
import { Check, Flame } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { currentStreak, isPrayedThisCycle, type Cycle } from '@/lib/cycle';
import { useTheme } from '@/hooks/use-theme';
import type { PrayerItem } from '@/lib/store/types';

export function PrayerRow({
  item,
  cycle,
  onToggle,
  onPress,
  sublabel,
  trailing,
}: {
  item: PrayerItem;
  cycle: Cycle;
  onToggle?: () => void; // check tapped → toggle prayed (omit for read-only / answered)
  onPress?: () => void; // body tapped → edit / actions
  sublabel?: string; // a context line, e.g. the source list or answered date
  trailing?: ReactNode; // overrides the streak flame
}) {
  const theme = useTheme();
  const prayed = isPrayedThisCycle(item.prayed, cycle);
  const streak = currentStreak(item.prayed, cycle);
  const muted = prayed || !onToggle;
  return (
    <View style={[styles.item, { backgroundColor: theme.card, borderColor: theme.border }]}>
      {onToggle ? (
        <Pressable
          onPress={onToggle}
          hitSlop={6}
          accessibilityLabel={prayed ? `Mark “${item.text}” not prayed` : `Mark “${item.text}” prayed`}
          style={({ pressed }) => [
            styles.check,
            { borderColor: prayed ? theme.ember : theme.border, backgroundColor: prayed ? theme.ember : 'transparent' },
            pressed && { opacity: 0.7 },
          ]}>
          {prayed ? <Check size={16} color={theme.onAccent} strokeWidth={3} /> : null}
        </Pressable>
      ) : null}
      <Pressable
        onPress={onPress}
        disabled={!onPress}
        accessibilityLabel={onPress ? `Edit ${item.text}` : undefined}
        style={({ pressed }) => [{ flex: 1 }, pressed && onPress ? { opacity: 0.6 } : null]}>
        <ThemedText type="body" style={muted ? { color: theme.textSecondary } : undefined}>
          {item.text}
        </ThemedText>
        {item.note ? (
          <ThemedText type="caption" themeColor="textTertiary">
            {item.note}
          </ThemedText>
        ) : null}
        {sublabel ? (
          <ThemedText type="caption" themeColor="textTertiary" style={{ marginTop: 1 }}>
            {sublabel}
          </ThemedText>
        ) : null}
      </Pressable>
      {trailing ??
        (onToggle && streak > 1 ? (
          <View style={styles.streak}>
            <Flame size={14} color={theme.ember} />
            <ThemedText type="caption" themeColor="ember">
              {streak}
            </ThemedText>
          </View>
        ) : null)}
    </View>
  );
}

const styles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  check: { width: 26, height: 26, borderRadius: Radius.pill, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  streak: { flexDirection: 'row', alignItems: 'center', gap: 3 },
});
