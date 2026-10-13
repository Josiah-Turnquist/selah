import { Check, Plus } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/primitives';
import { TextField } from '@/components/ui/field';
import { Sheet } from '@/components/ui/sheet';
import { Spacing } from '@/constants/theme';
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
  const { height } = useWindowDimensions();
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
        <>
          {/* Capped and scrollable so a long shelf of decks never pushes the top ones off-screen. */}
          <ScrollView style={{ maxHeight: Math.min(440, height * 0.5) }} showsVerticalScrollIndicator={false}>
            {choices.map(({ deck, added }) => (
              <Pressable
                key={deck.id}
                onPress={() => pick(deck.id, deck.title)}
                accessibilityRole="button"
                accessibilityState={{ selected: added }}
                style={({ pressed }) => [styles.row, { borderColor: theme.border }, pressed && { opacity: 0.6 }]}>
                <View style={{ flex: 1 }}>
                  <ThemedText type="h3" numberOfLines={1}>
                    {deck.title}
                  </ThemedText>
                  <ThemedText type="caption" themeColor="textSecondary">
                    {deck.cards.length} {deck.cards.length === 1 ? 'card' : 'cards'}
                  </ThemedText>
                </View>
                {added ? (
                  <View style={styles.added}>
                    <Check size={16} color={theme.textSecondary} />
                    <ThemedText type="caption" themeColor="textSecondary">
                      Added
                    </ThemedText>
                  </View>
                ) : null}
              </Pressable>
            ))}
          </ScrollView>
          <Button variant="secondary" icon={Plus} title="New deck" onPress={() => setCreating(true)} />
        </>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  added: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
});
