import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button, Card, Pill } from '@/components/ui/primitives';
import { Screen, ScreenHeader } from '@/components/ui/screen';
import { useToast } from '@/components/ui/toast';
import { Spacing } from '@/constants/theme';
import { PRESET_DECKS, PRESET_LEVELS } from '@/lib/store/preset-decks';
import { useActions, useData } from '@/lib/store/store';
import { tapSuccess } from '@/lib/util/haptics';

export default function StarterDecks() {
  const actions = useActions();
  const data = useData();
  const toast = useToast();
  const have = new Set(data.decks.map((d) => d.title));

  return (
    <Screen scroll>
      <ScreenHeader title="Starter decks" subtitle="Ready-made decks, from first steps to deep water" back />

      {PRESET_LEVELS.map((level) => (
        <View key={level.key}>
          <ThemedText type="label" themeColor="textTertiary" style={styles.levelLabel}>
            {level.label}
          </ThemedText>
          {PRESET_DECKS.filter((p) => p.level === level.key).map((p) => {
            const added = have.has(p.title);
            return (
              <Card key={p.key} style={{ marginBottom: Spacing.three }}>
                <View style={styles.titleRow}>
                  <ThemedText type="h3" style={{ flex: 1 }}>
                    {p.title}
                  </ThemedText>
                  {p.kind === 'verse' ? <Pill label="Verses" /> : null}
                </View>
                <ThemedText type="small" themeColor="textSecondary" style={{ marginTop: 2 }}>
                  {p.description}
                </ThemedText>
                <View style={styles.foot}>
                  <ThemedText type="caption" themeColor="textTertiary">
                    {p.cards.length} cards{added ? ' · in your decks' : ''}
                  </ThemedText>
                  <Button
                    size="sm"
                    variant={added ? 'secondary' : 'primary'}
                    title={added ? 'Added' : 'Add deck'}
                    disabled={added}
                    onPress={() => {
                      actions.addPresetDeck(p);
                      tapSuccess();
                      toast(`Added “${p.title}”`);
                    }}
                  />
                </View>
              </Card>
            );
          })}
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  levelLabel: { marginTop: Spacing.five, marginBottom: Spacing.two },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  foot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing.three },
});
