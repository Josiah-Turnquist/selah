import { Flame, HeartHandshake } from 'lucide-react-native';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card, EmptyState, Pill } from '@/components/ui/primitives';
import { Screen, ScreenHeader } from '@/components/ui/screen';
import { Spacing } from '@/constants/theme';
import { cycleLabel } from '@/lib/cycle';
import { statsFor, type PrayerStats } from '@/lib/store/prayer-stats';
import { useData } from '@/lib/store/store';
import { useTheme } from '@/hooks/use-theme';

const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;

function StatRow({ value, label, description }: { value: number; label: string; description: string }) {
  return (
    <View style={styles.statRow}>
      <ThemedText type="h2" style={styles.statValue}>
        {value}
      </ThemedText>
      <View style={{ flex: 1 }}>
        <ThemedText type="body" style={{ fontWeight: '600' }}>
          {label}
        </ThemedText>
        <ThemedText type="caption" themeColor="textSecondary">
          {description}
        </ThemedText>
      </View>
    </View>
  );
}

function listSummary(s: PrayerStats): string {
  const parts: string[] = [];
  if (s.totalPrayed > 0) parts.push(`Prayed ${plural(s.totalPrayed, 'time')} over ${plural(s.daysPrayed, 'day')}`);
  if (s.streak > 0) parts.push(`${s.streak}-day streak`);
  if (s.answeredCount > 0) parts.push(`${s.answeredCount} answered`);
  if (parts.length === 0) return 'No prayers logged yet.';
  return parts.join(' · ') + '.';
}

export default function PrayerStatsScreen() {
  const data = useData();
  const theme = useTheme();
  const overall = useMemo(() => statsFor(data.prayerLists), [data.prayerLists]);
  const perList = useMemo(
    () => data.prayerLists.map((l) => ({ list: l, stats: statsFor([l]) })),
    [data.prayerLists],
  );
  const hasAny = overall.totalPrayed > 0 || overall.activeCount > 0 || overall.answeredCount > 0;

  const rows = [
    { value: overall.totalPrayed, label: 'Times prayed', description: 'Every prayer you’ve checked off, all time.' },
    { value: overall.daysPrayed, label: 'Days prayed', description: 'Distinct days you’ve prayed at least once.' },
    { value: overall.thisWeek, label: 'Prayed this week', description: 'Days you’ve prayed in the current week.' },
    { value: overall.activeCount, label: 'Active requests', description: 'Prayers still on your lists.' },
    { value: overall.answeredCount, label: 'Answered', description: 'Prayers you’ve marked as answered.' },
  ];

  return (
    <Screen scroll>
      <ScreenHeader title="Prayer stats" back />

      {!hasAny ? (
        <EmptyState
          icon={HeartHandshake}
          title="No prayer activity yet"
          subtitle="Pray through a list and your streak, totals, and history will show up here."
        />
      ) : (
        <>
          <Card style={styles.hero}>
            <Flame size={26} color={theme.ember} />
            <ThemedText type="h1">{plural(overall.streak, 'day')}</ThemedText>
            <ThemedText type="body" style={{ fontWeight: '600' }}>
              Current streak
            </ThemedText>
            <ThemedText type="caption" themeColor="textSecondary" style={{ textAlign: 'center' }}>
              {overall.streak > 0 ? 'Days in a row you’ve prayed for something.' : 'Pray today to start a streak.'}
            </ThemedText>
          </Card>

          <Card style={{ marginBottom: Spacing.four }}>
            {rows.map((r, i) => (
              <View key={r.label}>
                {i > 0 ? <View style={[styles.hairline, { backgroundColor: theme.border }]} /> : null}
                <StatRow {...r} />
              </View>
            ))}
          </Card>

          <ThemedText type="label" themeColor="textTertiary" style={{ marginBottom: Spacing.two }}>
            By list
          </ThemedText>
          {perList.map(({ list, stats }) => (
            <Card key={list.id} style={{ marginBottom: Spacing.three }}>
              <View style={styles.listHead}>
                <ThemedText type="h3" style={{ flex: 1 }} numberOfLines={1}>
                  {list.title}
                </ThemedText>
                <Pill tone="ember" label={cycleLabel(list.cycle)} />
              </View>
              <ThemedText type="small" themeColor="textSecondary" style={{ marginTop: 6 }}>
                {listSummary(stats)}
              </ThemedText>
            </Card>
          ))}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: 3, paddingVertical: Spacing.five, marginBottom: Spacing.four },
  statRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingVertical: Spacing.three },
  statValue: { minWidth: 40 },
  hairline: { height: StyleSheet.hairlineWidth },
  listHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
});
