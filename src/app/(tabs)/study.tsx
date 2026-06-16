import { router } from 'expo-router';
import { GraduationCap, Plus } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { TextField } from '@/components/ui/field';
import { Button, Card, EmptyState, IconButton, Pill } from '@/components/ui/primitives';
import { Screen, ScreenHeader } from '@/components/ui/screen';
import { Segmented } from '@/components/ui/segmented';
import { Sheet } from '@/components/ui/sheet';
import { Spacing } from '@/constants/theme';
import { dueCount } from '@/lib/store/srs';
import type { DeckKind } from '@/lib/store/types';
import { useActions, useData } from '@/lib/store/store';

export default function StudyScreen() {
  const data = useData();
  const actions = useActions();
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<DeckKind>('verse');

  const create = () => {
    const id = actions.addDeck(title.trim() || 'New deck', kind);
    setAdding(false);
    setTitle('');
    setKind('verse');
    router.push(`/deck/${id}`);
  };

  return (
    <Screen scroll tab>
      <ScreenHeader
        title="Study"
        right={<IconButton icon={Plus} variant="soft" onPress={() => setAdding(true)} accessibilityLabel="New deck" />}
      />

      {data.decks.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="No study decks yet"
          subtitle="Build a deck of verses to memorize. In the reader, select a verse and tap “Add to deck.”"
          action={<Button icon={Plus} title="New deck" onPress={() => setAdding(true)} />}
        />
      ) : (
        data.decks.map((d) => {
          const due = dueCount(d.cards);
          return (
            <Card key={d.id} style={{ marginBottom: Spacing.three }} onPress={() => router.push(`/deck/${d.id}`)}>
              <ThemedText type="h3">{d.title}</ThemedText>
              {d.description ? (
                <ThemedText type="small" themeColor="textSecondary" style={{ marginTop: 2 }}>
                  {d.description}
                </ThemedText>
              ) : null}
              <View style={styles.pills}>
                <Pill label={d.kind === 'verse' ? 'Verses' : 'Facts'} />
                <Pill label={`${d.cards.length} card${d.cards.length === 1 ? '' : 's'}`} />
                {due > 0 ? <Pill tone="ember" label={`${due} due`} /> : null}
              </View>
              {d.cards.length > 0 ? (
                <Button
                  size="sm"
                  title={due > 0 ? `Study ${due} due` : 'Review'}
                  style={styles.studyBtn}
                  onPress={() => router.push(`/deck/${d.id}/study`)}
                />
              ) : null}
            </Card>
          );
        })
      )}

      <Sheet visible={adding} onClose={() => setAdding(false)} title="New deck">
        <TextField label="Title" autoFocus value={title} onChangeText={setTitle} placeholder="e.g. Memory Verses" />
        <View style={{ gap: 6 }}>
          <ThemedText type="label" themeColor="textSecondary">
            Type
          </ThemedText>
          <Segmented
            options={[
              { label: 'Verses', value: 'verse' },
              { label: 'Facts', value: 'fact' },
            ]}
            value={kind}
            onChange={setKind}
          />
        </View>
        <Button title="Create deck" onPress={create} />
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pills: { flexDirection: 'row', gap: 6, marginTop: Spacing.three, flexWrap: 'wrap' },
  studyBtn: { marginTop: Spacing.three, alignSelf: 'flex-start' },
});
