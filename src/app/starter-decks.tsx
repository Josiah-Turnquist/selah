import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button, Card } from '@/components/ui/primitives';
import { Screen, ScreenHeader } from '@/components/ui/screen';
import { useToast } from '@/components/ui/toast';
import { Spacing } from '@/constants/theme';
import { PRESET_DECKS } from '@/lib/store/preset-decks';
import { useActions, useData } from '@/lib/store/store';
import { tapSuccess } from '@/lib/util/haptics';

export default function StarterDecks() {
  const actions = useActions();
  const data = useData();
  const toast = useToast();
  const have = new Set(data.decks.map((d) => d.title));

  return (
    <Screen scroll>
      <ScreenHeader title="Starter decks" subtitle="Ready-made decks for the basics" back />

      {PRESET_DECKS.map((p) => {
        const added = have.has(p.title);
        return (
          <Card key={p.key} style={{ marginBottom: Spacing.three }}>
            <ThemedText type="h3">{p.title}</ThemedText>
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  foot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing.three },
});
