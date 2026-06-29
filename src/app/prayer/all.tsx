import { router } from 'expo-router';
import { HeartHandshake } from 'lucide-react-native';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { PrayerRow } from '@/components/prayer-row';
import { ThemedText } from '@/components/themed-text';
import { EmptyState } from '@/components/ui/primitives';
import { Screen, ScreenHeader } from '@/components/ui/screen';
import { Spacing } from '@/constants/theme';
import { useActions, useData } from '@/lib/store/store';
import { tapSuccess } from '@/lib/util/haptics';

export default function AllPrayers() {
  const data = useData();
  const actions = useActions();

  const groups = useMemo(
    () =>
      data.prayerLists
        .map((l) => ({ list: l, items: l.items.filter((it) => !it.answered) }))
        .filter((g) => g.items.length > 0),
    [data.prayerLists],
  );
  const total = groups.reduce((n, g) => n + g.items.length, 0);

  return (
    <Screen scroll>
      <ScreenHeader title="All prayers" subtitle={total ? `${total} active across your lists` : undefined} back />

      {total === 0 ? (
        <EmptyState
          icon={HeartHandshake}
          title="Nothing to pray through yet"
          subtitle="Add prayers to any list and they’ll all gather here."
        />
      ) : (
        groups.map((g) => (
          <View key={g.list.id} style={{ marginBottom: Spacing.five }}>
            <ThemedText type="label" themeColor="textTertiary" style={styles.group}>
              {g.list.title}
            </ThemedText>
            <View style={{ gap: Spacing.two }}>
              {g.items.map((it) => (
                <PrayerRow
                  key={it.id}
                  item={it}
                  cycle={g.list.cycle}
                  onToggle={() => {
                    actions.togglePrayed(g.list.id, it.id);
                    tapSuccess();
                  }}
                  onPress={() => router.push(`/prayer/${g.list.id}`)}
                />
              ))}
            </View>
          </View>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  group: { marginBottom: Spacing.two },
});
