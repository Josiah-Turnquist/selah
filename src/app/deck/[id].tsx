import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, ChevronRight, Play, Plus, Settings2, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { TextField } from '@/components/ui/field';
import { Button, IconButton, Pill } from '@/components/ui/primitives';
import { ConfirmButton } from '@/components/ui/confirm-button';
import { Sheet } from '@/components/ui/sheet';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { dueCount } from '@/lib/store/srs';
import { useActions, useData } from '@/lib/store/store';
import { useTheme } from '@/hooks/use-theme';

export default function DeckDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const data = useData();
  const actions = useActions();
  const theme = useTheme();

  const [cardOpen, setCardOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [manage, setManage] = useState(false);
  const [renameVal, setRenameVal] = useState('');
  const [studyOpen, setStudyOpen] = useState(false);

  const deck = data.decks.find((d) => d.id === id);
  if (!deck) {
    return (
      <SafeAreaView style={[styles.flex, styles.center, { backgroundColor: theme.background }]}>
        <ThemedText type="h3">Deck not found</ThemedText>
        <Button title="Go back" style={{ marginTop: Spacing.three }} onPress={() => router.back()} />
      </SafeAreaView>
    );
  }
  const due = dueCount(deck.cards);

  const submitCard = () => {
    if (!front.trim() || !back.trim()) return;
    if (editing) actions.updateCard(deck.id, editing, { front, back });
    else actions.addCard(deck.id, front, back);
    setFront('');
    setBack('');
    setEditing(null);
    setCardOpen(false);
  };

  return (
    <View style={[styles.flex, { backgroundColor: theme.background }]}>
      <SafeAreaView edges={['top']}>
        <View style={styles.topbar}>
          <IconButton icon={ChevronLeft} onPress={() => router.back()} accessibilityLabel="Back" />
          <ThemedText type="h3" numberOfLines={1} style={{ flex: 1 }}>
            {deck.title}
          </ThemedText>
          <IconButton
            icon={Settings2}
            accessibilityLabel="Deck settings"
            onPress={() => {
              setRenameVal(deck.title);
              setManage(true);
            }}
          />
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.statsRow}>
          <Pill label={deck.kind === 'verse' ? 'Verses' : 'Facts'} />
          <ThemedText type="small" themeColor="textSecondary">
            {deck.cards.length} cards · {due} due
          </ThemedText>
        </View>

        {deck.cards.length > 0 ? (
          <Button
            icon={Play}
            title={due > 0 ? `Study ${due} due` : 'Review all'}
            style={{ marginTop: Spacing.three }}
            onPress={() => setStudyOpen(true)}
          />
        ) : null}

        <View style={styles.cards}>
          {deck.cards.map((c) => (
            <Pressable
              key={c.id}
              onPress={() => {
                setEditing(c.id);
                setFront(c.front);
                setBack(c.back);
                setCardOpen(true);
              }}
              accessibilityLabel={`Edit card: ${c.front}`}
              style={({ pressed }) => [
                styles.card,
                { backgroundColor: theme.card, borderColor: theme.border },
                pressed && { opacity: 0.85 },
              ]}>
              <View style={styles.boxDots}>
                {[1, 2, 3, 4, 5].map((b) => (
                  <View
                    key={b}
                    style={[styles.dot, { backgroundColor: b <= c.box ? theme.accent : theme.backgroundSelected }]}
                  />
                ))}
              </View>
              <ThemedText type="h3" style={{ marginTop: 8 }}>
                {c.front}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" numberOfLines={2} style={{ marginTop: 2 }}>
                {c.back}
              </ThemedText>
            </Pressable>
          ))}
        </View>

        <Button
          variant="secondary"
          icon={Plus}
          title="Add card"
          style={{ marginTop: Spacing.three }}
          onPress={() => {
            setEditing(null);
            setFront('');
            setBack('');
            setCardOpen(true);
          }}
        />
      </ScrollView>

      <Sheet
        visible={cardOpen}
        onClose={() => {
          setCardOpen(false);
          setEditing(null);
        }}
        title={editing ? 'Edit card' : 'New card'}>
        <TextField
          label={deck.kind === 'verse' ? 'Front · reference' : 'Question'}
          value={front}
          onChangeText={setFront}
          placeholder={deck.kind === 'verse' ? 'John 3:16' : 'Who…?'}
        />
        <TextField
          label={deck.kind === 'verse' ? 'Back · verse text' : 'Answer'}
          value={back}
          onChangeText={setBack}
          multiline
        />
        <View style={{ flexDirection: 'row', gap: Spacing.two }}>
          {editing ? (
            <ConfirmButton
              variant="secondary"
              icon={Trash2}
              title="Delete"
              onConfirm={() => {
                if (editing) actions.deleteCard(deck.id, editing);
                setCardOpen(false);
                setEditing(null);
              }}
            />
          ) : null}
          <Button title="Save" style={{ flex: 1 }} onPress={submitCard} />
        </View>
      </Sheet>

      <Sheet visible={manage} onClose={() => setManage(false)} title="Deck settings">
        <TextField label="Title" value={renameVal} onChangeText={setRenameVal} />
        <Button
          title="Save"
          onPress={() => {
            actions.updateDeck(deck.id, { title: renameVal.trim() || deck.title });
            setManage(false);
          }}
        />
        <ConfirmButton
          variant="ghost"
          icon={Trash2}
          title="Delete deck"
          confirmTitle="Tap again to delete"
          onConfirm={() => {
            actions.deleteDeck(deck.id);
            router.back();
          }}
        />
      </Sheet>

      <Sheet visible={studyOpen} onClose={() => setStudyOpen(false)} title="Choose a mode">
        <ModeRow
          title="Flashcards"
          subtitle="Flip cards and self-grade"
          onPress={() => {
            setStudyOpen(false);
            router.push(`/deck/${deck.id}/study?mode=flashcards`);
          }}
        />
        <ModeRow
          title="Multiple choice"
          subtitle="Pick the right answer"
          onPress={() => {
            setStudyOpen(false);
            router.push(`/deck/${deck.id}/study?mode=choice`);
          }}
        />
        <ModeRow
          title="Type it"
          subtitle={deck.kind === 'verse' ? 'Type the verse from memory' : 'Type the answer'}
          onPress={() => {
            setStudyOpen(false);
            router.push(`/deck/${deck.id}/study?mode=type`);
          }}
        />
      </Sheet>
    </View>
  );
}

function ModeRow({ title, subtitle, onPress }: { title: string; subtitle: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.modeRow, { borderBottomColor: theme.border }, pressed && { opacity: 0.7 }]}>
      <View style={{ flex: 1 }}>
        <ThemedText type="h3">{title}</ThemedText>
        <ThemedText type="caption" themeColor="textSecondary">
          {subtitle}
        </ThemedText>
      </View>
      <ChevronRight size={18} color={theme.textTertiary} />
    </Pressable>
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
  content: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.eight,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  statsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cards: { marginTop: Spacing.four, gap: Spacing.two },
  card: { padding: Spacing.four, borderRadius: Radius.md, borderWidth: StyleSheet.hairlineWidth },
  boxDots: { flexDirection: 'row', gap: 4 },
  modeRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.three, borderBottomWidth: StyleSheet.hairlineWidth },
  dot: { width: 14, height: 5, borderRadius: Radius.pill },
});
