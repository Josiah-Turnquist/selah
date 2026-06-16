import { router } from 'expo-router';
import { HeartHandshake, Link2, Plus } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { TextField } from '@/components/ui/field';
import { Button, Card, EmptyState, IconButton, Pill } from '@/components/ui/primitives';
import { ProgressBar } from '@/components/ui/progress';
import { Screen, ScreenHeader } from '@/components/ui/screen';
import { Segmented } from '@/components/ui/segmented';
import { Sheet } from '@/components/ui/sheet';
import { Spacing } from '@/constants/theme';
import { cycleLabel, isPrayedThisCycle, type Cycle } from '@/lib/cycle';
import { useActions, useData } from '@/lib/store/store';
import { useTheme } from '@/hooks/use-theme';

export default function PrayScreen() {
  const data = useData();
  const actions = useActions();
  const theme = useTheme();
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [cycle, setCycle] = useState<Cycle>('daily');

  const create = () => {
    const id = actions.addPrayerList(title.trim() || 'New list', cycle);
    setAdding(false);
    setTitle('');
    setCycle('daily');
    router.push(`/prayer/${id}`);
  };

  return (
    <Screen scroll tab>
      <ScreenHeader
        title="Pray"
        right={
          <>
            <IconButton icon={Link2} onPress={() => router.push('/import')} accessibilityLabel="Import a list" />
            <IconButton icon={Plus} variant="soft" onPress={() => setAdding(true)} accessibilityLabel="New list" />
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
        data.prayerLists.map((list) => {
          const prayed = list.items.filter((it) => isPrayedThisCycle(it.prayed, list.cycle)).length;
          const total = list.items.length;
          return (
            <Card key={list.id} style={{ marginBottom: Spacing.three }} onPress={() => router.push(`/prayer/${list.id}`)}>
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <ThemedText type="h3">{list.title}</ThemedText>
                  <View style={styles.pills}>
                    <Pill tone="ember" label={cycleLabel(list.cycle)} />
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
        })
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  pills: { flexDirection: 'row', gap: 6, marginTop: 6 },
});
