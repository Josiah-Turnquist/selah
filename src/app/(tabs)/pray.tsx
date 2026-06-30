import { router } from 'expo-router';
import { ChartColumn, ChevronRight, EllipsisVertical, HeartHandshake, Link2, ListChecks, Plus, Sparkles } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { TextField } from '@/components/ui/field';
import { Button, Card, EmptyState, IconButton, Pill, type IconType } from '@/components/ui/primitives';
import { ProgressBar } from '@/components/ui/progress';
import { Screen, ScreenHeader } from '@/components/ui/screen';
import { Segmented } from '@/components/ui/segmented';
import { Sheet } from '@/components/ui/sheet';
import { Radius, Spacing } from '@/constants/theme';
import { cycleLabel, isPrayedThisCycle, type Cycle } from '@/lib/cycle';
import { useActions, useData } from '@/lib/store/store';
import { useTheme } from '@/hooks/use-theme';

export default function PrayScreen() {
  const data = useData();
  const actions = useActions();
  const theme = useTheme();
  const [adding, setAdding] = useState(false);
  const [menu, setMenu] = useState(false);
  const [title, setTitle] = useState('');
  const [cycle, setCycle] = useState<Cycle>('daily');

  const activeTotal = data.prayerLists.reduce((n, l) => n + l.items.filter((it) => !it.answered).length, 0);
  const answeredTotal = data.prayerLists.reduce((n, l) => n + l.items.filter((it) => it.answered).length, 0);

  const create = () => {
    const id = actions.addPrayerList(title.trim() || 'New list', cycle);
    setAdding(false);
    setTitle('');
    setCycle('daily');
    router.push(`/prayer/${id}`);
  };
  const go = (path: string) => {
    setMenu(false);
    router.push(path);
  };

  return (
    <Screen scroll tab>
      <ScreenHeader
        title="Pray"
        right={
          <>
            <IconButton icon={Link2} onPress={() => router.push('/import')} accessibilityLabel="Import a list" />
            <IconButton icon={Plus} variant="soft" onPress={() => setAdding(true)} accessibilityLabel="New list" />
            <IconButton icon={EllipsisVertical} onPress={() => setMenu(true)} accessibilityLabel="More prayer options" />
          </>
        }
      />

      {data.prayerLists.length === 0 ? (
        <EmptyState
          icon={HeartHandshake}
          title="No prayer lists yet"
          subtitle="Keep a list of people and requests. Check each one as you pray — it resets every day or week."
          action={<Button icon={Plus} title="New list" onPress={() => setAdding(true)} />}
        />
      ) : (
        <>
          <Pressable
            onPress={() => router.push('/prayer/all')}
            accessibilityLabel="All prayers"
            style={({ pressed }) => [styles.allBtn, { backgroundColor: theme.backgroundElement }, pressed && { opacity: 0.7 }]}>
            <ListChecks size={16} color={theme.textSecondary} strokeWidth={2} />
            <ThemedText type="small" style={{ flex: 1, fontWeight: '600' }}>
              All prayers
            </ThemedText>
            <ThemedText type="small" themeColor="textTertiary">
              {activeTotal}
            </ThemedText>
            <ChevronRight size={16} color={theme.textTertiary} />
          </Pressable>

          {data.prayerLists.map((list) => {
            const active = list.items.filter((it) => !it.answered);
            const prayed = active.filter((it) => isPrayedThisCycle(it.prayed, list.cycle)).length;
            const total = active.length;
            return (
              <Card key={list.id} style={{ marginBottom: Spacing.three }} onPress={() => router.push(`/prayer/${list.id}`)}>
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <ThemedText type="h3">{list.title}</ThemedText>
                    <View style={styles.pills}>
                      <Pill tone="ember" label={cycleLabel(list.cycle)} />
                      {list.reminderHour != null ? <Pill tone="accent" label="Reminder on" /> : null}
                      {list.sharedFrom ? <Pill tone="accent" label={`from ${list.sharedFrom}`} /> : null}
                    </View>
                  </View>
                  <ThemedText type="small" themeColor="textSecondary">
                    {prayed}/{total}
                  </ThemedText>
                </View>
                <View style={{ marginTop: Spacing.three }}>
                  <ProgressBar value={total ? prayed / total : 0} height={6} color={theme.ember} />
                </View>
              </Card>
            );
          })}
        </>
      )}

      <Sheet visible={adding} onClose={() => setAdding(false)} title="New prayer list">
        <TextField label="Title" autoFocus value={title} onChangeText={setTitle} placeholder="e.g. Daily Prayers" />
        <View style={{ gap: 6 }}>
          <ThemedText type="label" themeColor="textSecondary">
            Reset
          </ThemedText>
          <Segmented
            options={[
              { label: 'Daily', value: 'daily' },
              { label: 'Weekly', value: 'weekly' },
            ]}
            value={cycle}
            onChange={setCycle}
          />
        </View>
        <Button title="Create list" onPress={create} />
      </Sheet>

      <Sheet visible={menu} onClose={() => setMenu(false)}>
        <MenuRow icon={Sparkles} label="Answered prayers" count={answeredTotal} onPress={() => go('/prayer/answered')} />
        <MenuRow icon={ChartColumn} label="Prayer stats" onPress={() => go('/prayer/stats')} />
      </Sheet>
    </Screen>
  );
}

function MenuRow({ icon: Icon, label, count, onPress }: { icon: IconType; label: string; count?: number; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.menuRow, pressed && { opacity: 0.6 }]}>
      <Icon size={20} color={theme.text} strokeWidth={2} />
      <ThemedText type="body" style={{ flex: 1 }}>
        {label}
      </ThemedText>
      {count != null ? (
        <ThemedText type="small" themeColor="textTertiary">
          {count}
        </ThemedText>
      ) : null}
      <ChevronRight size={18} color={theme.textTertiary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  pills: { flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap' },
  allBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.md,
    marginBottom: Spacing.four,
  },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingVertical: Spacing.three },
});
