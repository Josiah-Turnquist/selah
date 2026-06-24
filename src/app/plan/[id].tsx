import * as Clipboard from 'expo-clipboard';
import { router, useLocalSearchParams } from 'expo-router';
import { Award, Check, ChevronLeft, Share2 } from 'lucide-react-native';
import { useState } from 'react';
import { FlatList, Pressable, Share, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { ThemedText } from '@/components/themed-text';
import { Button, IconButton, Pill } from '@/components/ui/primitives';
import { ConfirmButton } from '@/components/ui/confirm-button';
import { ProgressRing } from '@/components/ui/progress';
import { useCelebrate } from '@/components/ui/celebrate';
import { useToast } from '@/components/ui/toast';
import { Sheet } from '@/components/ui/sheet';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { formatReadingList } from '@/lib/bible/refs';
import { planStats } from '@/lib/plans/progress';
import { templateById } from '@/lib/plans/templates';
import { shareLink } from '@/lib/share';
import { useActions, useData } from '@/lib/store/store';
import { useTheme } from '@/hooks/use-theme';
import { tapSuccess } from '@/lib/util/haptics';

export default function PlanDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const data = useData();
  const actions = useActions();
  const theme = useTheme();
  const toast = useToast();
  const celebrate = useCelebrate();
  const [showShare, setShowShare] = useState(false);

  const plan = data.plans.find((p) => p.id === id);
  const tpl = plan ? templateById(plan.templateId) : undefined;

  if (!plan || !tpl) {
    return (
      <SafeAreaView style={[styles.flex, styles.center, { backgroundColor: theme.background }]}>
        <ThemedText type="h3">Plan not found</ThemedText>
        <Button title="Go back" style={{ marginTop: Spacing.three }} onPress={() => router.back()} />
      </SafeAreaView>
    );
  }

  const s = planStats(plan);
  const friendsHere = data.friends.filter((f) => f.planTitle === plan.title);
  const code = shareLink({ t: 'plan', from: data.settings.displayName, templateId: tpl.id, title: tpl.title });

  const openDay = (dayNum: number) => {
    const readings = tpl.days[dayNum - 1];
    if (readings && readings.length) router.push(`/reader/${readings[0].bookId}/${readings[0].chapter}`);
  };

  const header = (
    <View>
      <View style={styles.summary}>
        <ProgressRing value={s.pct} size={92} stroke={9}>
          <ThemedText type="h2">{Math.round(s.pct * 100)}%</ThemedText>
        </ProgressRing>
        <View style={{ flex: 1, gap: 6 }}>
          <ThemedText type="small" themeColor="textSecondary">
            {s.completedCount} of {plan.durationDays} days complete
          </ThemedText>
          <View style={{ flexDirection: 'row' }}>
            {s.finished ? (
              <Pill tone="success" label="Complete 🎉" />
            ) : s.behind > 0 ? (
              <Pill tone="ember" label={`${s.behind} day${s.behind > 1 ? 's' : ''} behind`} />
            ) : (
              <Pill tone="accent" label="On track" />
            )}
          </View>
          <Button
            size="sm"
            title={s.finished ? 'Revisit day 1' : 'Open today’s reading'}
            style={{ alignSelf: 'flex-start', marginTop: 2 }}
            onPress={() => openDay(Math.min(tpl.days.length, s.nextDay))}
          />
        </View>
      </View>

      {friendsHere.length > 0 ? (
        <View style={styles.friendsStrip}>
          {friendsHere.map((f) => (
            <View key={f.id} style={styles.friendChip}>
              <Avatar name={f.name} size={26} />
              <ThemedText type="caption" themeColor="textSecondary">
                {f.name} · {Math.round((f.completedDays / f.durationDays) * 100)}%
              </ThemedText>
            </View>
          ))}
        </View>
      ) : null}

      <ThemedText type="label" themeColor="textTertiary" style={styles.daysHeading}>
        Daily readings
      </ThemedText>
    </View>
  );

  return (
    <View style={[styles.flex, { backgroundColor: theme.background }]}>
      <SafeAreaView edges={['top']}>
        <View style={styles.topbar}>
          <IconButton icon={ChevronLeft} onPress={() => router.back()} accessibilityLabel="Back" />
          <ThemedText type="h3" numberOfLines={1} style={{ flex: 1 }}>
            {tpl.title}
          </ThemedText>
          <IconButton icon={Share2} onPress={() => setShowShare(true)} accessibilityLabel="Share plan" />
        </View>
      </SafeAreaView>

      <FlatList
        data={tpl.days.map((readings, i) => ({ day: i + 1, readings }))}
        keyExtractor={(it) => String(it.day)}
        ListHeaderComponent={header}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const done = !!plan.completedDays[item.day];
          return (
            <View style={[styles.dayRow, { borderBottomColor: theme.border }]}>
              <Pressable
                onPress={() => openDay(item.day)}
                accessibilityLabel={`Open day ${item.day}`}
                style={({ pressed }) => [{ flex: 1 }, pressed && { opacity: 0.6 }]}>
                <ThemedText type="caption" themeColor={done ? 'success' : 'textTertiary'}>
                  Day {item.day}
                </ThemedText>
                <ThemedText type="small" numberOfLines={1}>
                  {formatReadingList(item.readings) || '—'}
                </ThemedText>
              </Pressable>
              <Pressable
                onPress={() => {
                  const willComplete = !done;
                  actions.togglePlanDay(plan.id, item.day);
                  if (willComplete) {
                    tapSuccess();
                    if (s.completedCount + 1 >= plan.durationDays) {
                      celebrate({
                        title: 'Plan complete',
                        subtitle: `You finished “${tpl.title}.” Well done.`,
                        icon: Award,
                        tone: 'success',
                      });
                    }
                  }
                }}
                hitSlop={8}
                accessibilityLabel={done ? `Mark day ${item.day} incomplete` : `Mark day ${item.day} complete`}
                style={({ pressed }) => [
                  styles.check,
                  { borderColor: done ? theme.success : theme.border, backgroundColor: done ? theme.success : 'transparent' },
                  pressed && { opacity: 0.7 },
                ]}>
                {done ? <Check size={16} color={theme.onAccent} strokeWidth={3} /> : null}
              </Pressable>
            </View>
          );
        }}
        ListFooterComponent={
          <ConfirmButton
            variant="ghost"
            title="Leave this plan"
            confirmTitle="Tap again to leave"
            style={{ marginTop: Spacing.five }}
            onConfirm={() => {
              actions.leavePlan(plan.id);
              router.back();
            }}
          />
        }
      />

      <Sheet visible={showShare} onClose={() => setShowShare(false)} title="Share this plan">
        <ThemedText type="small" themeColor="textSecondary">
          Send this code to a friend — they can start the same reading plan and you’ll be able to cheer
          each other on.
        </ThemedText>
        <View style={[styles.codeBox, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
          <ThemedText type="code" numberOfLines={3}>
            {code}
          </ThemedText>
        </View>
        <View style={{ flexDirection: 'row', gap: Spacing.two }}>
          <Button
            variant="secondary"
            title="Copy"
            style={{ flex: 1 }}
            onPress={() => {
              Clipboard.setStringAsync(code);
              toast('Plan code copied');
            }}
          />
          <Button
            title="Share"
            style={{ flex: 1 }}
            onPress={async () => {
              try {
                await Share.share({ message: `Join me in “${tpl.title}” on Selah: ${code}` });
              } catch {
                // cancelled / unsupported
              }
            }}
          />
        </View>
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  listContent: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.eight,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  summary: { flexDirection: 'row', alignItems: 'center', gap: Spacing.four, paddingVertical: Spacing.three },
  friendsStrip: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, marginTop: Spacing.one },
  friendChip: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  daysHeading: { marginTop: Spacing.four, marginBottom: Spacing.one },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  check: { width: 26, height: 26, borderRadius: Radius.pill, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  codeBox: { padding: Spacing.three, borderRadius: Radius.md, borderWidth: StyleSheet.hairlineWidth },
});
