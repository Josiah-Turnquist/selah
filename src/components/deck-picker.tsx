import { Plus } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/primitives';
import { TextField } from '@/components/ui/field';
import { Sheet } from '@/components/ui/sheet';
import { Spacing } from '@/constants/theme';
import { useActions, useData } from '@/lib/store/store';
import { useTheme } from '@/hooks/use-theme';

export function DeckPicker({
  visible,
  onClose,
  onPicked,
}: {
  visible: boolean;
  onClose: () => void;
  onPicked: (deckId: string) => void;
}) {
  const data = useData();
  const actions = useActions();
  const theme = useTheme();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');

  const pick = (id: string) => {
    onPicked(id);
    setCreating(false);
    setName('');
    onClose();
  };

  return (
    <Sheet visible={visible} onClose={onClose} title="Add to deck">
      {data.decks.map((d) => (
        <Pressable
          key={d.id}
          onPress={() => pick(d.id)}
          style={[styles.row, { borderColor: theme.border }]}>
          <View style={{ flex: 1 }}>
            <ThemedText type="h3">{d.title}</ThemedText>
            <ThemedText type="caption" themeColor="textSecondary">
              {d.cards.length} {d.cards.length === 1 ? 'card' : 'cards'}
            </ThemedText>
          </View>
        </Pressable>
      ))}

      {creating ? (
        <View style={{ gap: Spacing.two }}>
          <TextField autoFocus value={name} onChangeText={setName} placeholder="Deck name" />
          <Button
            title="Create & add"
            onPress={() => pick(actions.addDeck(name.trim() || 'New Deck', 'verse'))}
          />
        </View>
      ) : (
        <Button variant="secondary" icon={Plus} title="New deck" onPress={() => setCreating(true)} />
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
