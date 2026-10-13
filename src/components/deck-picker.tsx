import { Check, Plus } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/primitives';
import { TextField } from '@/components/ui/field';
import { Sheet } from '@/components/ui/sheet';
import { Radius, Spacing } from '@/constants/theme';
import { deckChoices, type Passage } from '@/lib/study/deck-choices';
import { useActions, useData } from '@/lib/store/store';
import { useTheme } from '@/hooks/use-theme';

export function DeckPicker({
  visible,
  passage,
  onClose,
  onPicked,
}: {
  visible: boolean;
  passage: Passage | null;
  onClose: () => void;
  onPicked: (deckId: string, title: string) => void;
}) {
  const data = useData();
  const actions = useActions();
  const theme = useTheme();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const choices = deckChoices(data.decks, passage);
  const showForm = creating || choices.length === 0;

  const reset = () => {
    setCreating(false);
    setName('');
  };
  const close = () => {
    reset();
    onClose();
  };
  // The parent closes the sheet once the verse is in (or found already there).
  const pick = (id: string, title: string) => {
    reset();
    onPicked(id, title);
  };
  const create = () => {
    const title = name.trim() || 'New Deck';
    pick(actions.addDeck(title, 'verse'), title);
  };

  return (
    <Sheet visible={visible} onClose={close} title={showForm ? 'New deck' : 'Add to deck'}>
      {showForm ? (
        <View style={{ gap: Spacing.two }}>
          <TextField autoFocus value={name} onChangeText={setName} placeholder="Deck name" />
          <Button title="Create & add" onPress={create} />
        </View>
      ) : (
        // A horizontal shelf: the sheet stays short however many decks there are,
        // and the next tile peeking past the edge says "there's more".
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.shelf} contentContainerStyle={styles.shelfContent}>
          <Pressable
            onPress={() => setCreating(true)}
            accessibilityRole="button"
            style={({ pressed }) => [styles.tile, styles.newTile, { borderColor: theme.textTertiary }, pressed && styles.pressed]}>
            <Plus size={22} color={theme.textSecondary} />
            <ThemedText type="small" themeColor="textSecondary">
              New deck
            </ThemedText>
          </Pressable>
          {choices.map(({ deck, added }) => (
            <Pressable
              key={deck.id}
              onPress={() => pick(deck.id, deck.title)}
              accessibilityRole="button"
              accessibilityLabel={`${deck.title}, ${deck.cards.length} ${deck.cards.length === 1 ? 'card' : 'cards'}${added ? ', added' : ''}`}
              accessibilityState={{ selected: added }}
              style={({ pressed }) => [styles.tile, { backgroundColor: theme.backgroundElement }, pressed && styles.pressed]}>
              <ThemedText type="h3" numberOfLines={3}>
                {deck.title}
              </ThemedText>
              <View style={styles.tileFoot}>
                <ThemedText type="caption" themeColor="textSecondary">
                  {added ? 'Added' : `${deck.cards.length} ${deck.cards.length === 1 ? 'card' : 'cards'}`}
                </ThemedText>
                {added ? <Check size={16} color={theme.text} /> : null}
              </View>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.6 },
  // Edge to edge: the sheet's side padding moves inside the scroll content.
  shelf: { marginHorizontal: -Spacing.four, flexGrow: 0 },
  shelfContent: { paddingHorizontal: Spacing.four, gap: Spacing.two },
  tile: { width: 124, height: 124, borderRadius: Radius.lg, padding: Spacing.three, justifyContent: 'space-between' },
  newTile: { width: 92, borderWidth: 1.5, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: Spacing.one },
  tileFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
