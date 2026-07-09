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
import { Segmented } from '@/components/ui/segmented';
import { STAGES, dueCount, isDue, stageLabel } from '@/lib/store/srs';
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
  const [scope, setScope] = useState<'new' | 'review' | 'all'>('review');

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
  const now = Date.now();
  const newCount = deck.cards.filter((c) => c.reviews === 0).length;
  const reviewCount = deck.cards.filter((c) => isDue(c, now) && c.reviews > 0).length;
  const stageCounts = [1, 2, 3, 4, 5].map((b) => deck.cards.filter((c) => c.box === b).length);
  const stageSummary = stageCounts
    .map((n, i) => (n > 0 ? `${n} ${STAGES[i].toLowerCase()}` : null))
    .filter(Boolean)
    .join('  ·  ');
  // Darker = more deeply known; the bar fills toward full accent as cards climb.
  const stageAlpha = ['40', '66', '8C', 'BF', 'FF'];

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

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} automaticallyAdjustKeyboardInsets keyboardDismissMode="interactive">
        <View style={styles.statsRow}>
          <Pill label={deck.kind === 'verse' ? 'Verses' : 'Facts'} />
          <ThemedText type="small" themeColor="textSecondary">
            {deck.cards.length} cards · {due} due
          </ThemedText>
        </View>

        {deck.cards.length > 0 && stageCounts.some((n) => n > 0) ? (
          <View style={styles.stageWrap}>
            <View style={[styles.stageBar, { backgroundColor: theme.backgroundElement }]}>
              {stageCounts.map((n, i) =>
                n > 0 ? (
                  <View key={i} style={{ flex: n, backgroundColor: theme.accent + stageAlpha[i] }} />
                ) : null,
              )}
            </View>
            <ThemedText type="caption" themeColor="textSecondary">
              {stageSummary}
            </ThemedText>
          </View>
        ) : null}

        {deck.cards.length > 0 ? (
          <Button
            icon={Play}
            title={due > 0 ? `Study ${due} due` : 'Review all'}
            style={{ marginTop: Spacing.three }}
            onPress={() => {
              setScope(reviewCount > 0 ? 'review' : newCount > 0 ? 'new' : 'all');
              setStudyOpen(true);
            }}
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
                <ThemedText type="caption" themeColor="textTertiary" style={{ marginLeft: 2 }}>
                  {stageLabel(c.box)}
                  {isDue(c, now) ? ' · due' : ''}
                </ThemedText>
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

      <Sheet visible={studyOpen} onClose={() => setStudyOpen(false)} title="Study">
        <Segmented
          options={[
            { label: `New · ${newCount}`, value: 'new' },
            { label: `Review · ${reviewCount}`, value: 'review' },
            { label: `All · ${deck.cards.length}`, value: 'all' },
          ]}
          value={scope}
          onChange={(s) => setScope(s)}
        />
        {deck.kind === 'verse' ? (
          <>
            <ModeRow
              title="Fading recall"
              subtitle="The verse fades as your stage climbs"
              onPress={() => {
                setStudyOpen(false);
                router.push(`/deck/${deck.id}/study?mode=recall&scope=${scope}`);
              }}
            />
            <ModeRow
              title="Build it"
              subtitle="Rebuild it word by word · tops out at Strong"
              onPress={() => {
                setStudyOpen(false);
                router.push(`/deck/${deck.id}/study?mode=build&scope=${scope}`);
              }}
            />
          </>
        ) : null}
        <ModeRow
          title="Flashcards"
          subtitle="Flip cards and self-grade"
          onPress={() => {
            setStudyOpen(false);
            router.push(`/deck/${deck.id}/study?mode=flashcards&scope=${scope}`);
          }}
        />
        <ModeRow
          title="Multiple choice"
          subtitle="Pick the right answer · tops out at Familiar"
          onPress={() => {
            setStudyOpen(false);
            router.push(`/deck/${deck.id}/study?mode=choice&scope=${scope}`);
          }}
        />
        <ModeRow
          title="Type it"
          subtitle={deck.kind === 'verse' ? 'Type the verse from memory' : 'Type the answer'}
          onPress={() => {
            setStudyOpen(false);
            router.push(`/deck/${deck.id}/study?mode=type&scope=${scope}`);
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
  stageWrap: { marginTop: Spacing.three, gap: Spacing.one },
  stageBar: { flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden' },
  cards: { marginTop: Spacing.four, gap: Spacing.two },
  card: { padding: Spacing.four, borderRadius: Radius.md, borderWidth: StyleSheet.hairlineWidth },
  boxDots: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  modeRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.three, borderBottomWidth: StyleSheet.hairlineWidth },
  dot: { width: 14, height: 5, borderRadius: Radius.pill },
});
