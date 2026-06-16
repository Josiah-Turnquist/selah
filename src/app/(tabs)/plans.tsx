import { router } from 'expo-router';
import { Link2 } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { ThemedText } from '@/components/themed-text';
import { Button, Card, IconButton, Pill } from '@/components/ui/primitives';
import { ProgressBar, ProgressRing } from '@/components/ui/progress';
import { Screen, ScreenHeader } from '@/components/ui/screen';
import { Spacing } from '@/constants/theme';
import { planStats } from '@/lib/plans/progress';
import { TEMPLATES, type PlanTemplate } from '@/lib/plans/templates';
import { useActions, useData } from '@/lib/store/store';

export default function PlansScreen() {
  const data = useData();
  const actions = useActions();

  const activeIds = new Set(data.plans.map((p) => p.templateId));
  const available = TEMPLATES.filter((t) => !activeIds.has(t.id));

  const startAndOpen = (tpl: PlanTemplate) => router.push(`/plan/${actions.startPlan(tpl)}`);

  return (
    <Screen scroll tab>
      <ScreenHeader
        title="Plans"
        right={<IconButton icon={Link2} onPress={() => router.push('/import')} accessibilityLabel="Import a plan" />}
      />

      {data.plans.length > 0 ? (
        <>
          <SectionLabel>Your plans</SectionLabel>
          {data.plans.map((p) => {
            const s = planStats(p);
            return (
              <Card key={p.id} style={styles.spaced} onPress={() => router.push(`/plan/${p.id}`)}>
                <View style={styles.planRow}>
                  <ProgressRing value={s.pct} size={64}>
                    <ThemedText type="caption" style={{ fontWeight: '700' }}>
                      {Math.round(s.pct * 100)}%
                    </ThemedText>
                  </ProgressRing>
                  <View style={{ flex: 1 }}>
                    <ThemedText type="h3">{p.title}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {s.completedCount} of {p.durationDays} days
                    </ThemedText>
                    <View style={{ marginTop: 6, flexDirection: 'row' }}>
                      {s.finished ? (
                        <Pill tone="success" label="Complete" />
                      ) : s.behind > 0 ? (
                        <Pill tone="ember" label={`${s.behind} day${s.behind > 1 ? 's' : ''} behind`} />
                      ) : (
                        <Pill tone="accent" label="On track" />
                      )}
                    </View>
                  </View>
                </View>
              </Card>
            );
          })}
        </>
      ) : null}

      <SectionLabel>Friends</SectionLabel>
      {data.friends.map((f) => {
        const pct = f.durationDays ? f.completedDays / f.durationDays : 0;
        return (
          <Card key={f.id} style={styles.spacedSm}>
            <View style={styles.friendRow}>
              <Avatar name={f.name} />
              <View style={{ flex: 1 }}>
                <View style={styles.friendHead}>
                  <ThemedText type="h3">{f.name}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {Math.round(pct * 100)}%
                  </ThemedText>
                </View>
                <ThemedText type="caption" themeColor="textSecondary" style={{ marginBottom: 6 }}>
                  {f.planTitle}
                </ThemedText>
                <ProgressBar value={pct} height={6} />
              </View>
            </View>
          </Card>
        );
      })}
      <ThemedText type="caption" themeColor="textTertiary" style={{ marginTop: 6 }}>
        Friends’ progress is stored locally for now — live sync arrives with accounts.
      </ThemedText>

      {available.length > 0 ? (
        <>
          <SectionLabel>Start a plan</SectionLabel>
          {available.map((t) => (
            <Card key={t.id} style={styles.spacedSm}>
              <ThemedText type="h3">{t.title}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={{ marginTop: 2 }}>
                {t.subtitle}
              </ThemedText>
              <View style={styles.startRow}>
                <Pill label={`${t.durationDays} days`} />
                <Button size="sm" title="Start" onPress={() => startAndOpen(t)} />
              </View>
            </Card>
          ))}
        </>
      ) : null}
    </Screen>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <ThemedText type="label" themeColor="textTertiary" style={styles.sectionLabel}>
      {children}
    </ThemedText>
  );
}

const styles = StyleSheet.create({
  spaced: { marginBottom: Spacing.three },
  spacedSm: { marginBottom: Spacing.two },
  planRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  friendRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  friendHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  startRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing.three },
  sectionLabel: { marginTop: Spacing.five, marginBottom: Spacing.two },
});
