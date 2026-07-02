import { router, useLocalSearchParams } from 'expo-router';
import { Check, ChevronLeft, RotateCcw, X } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { CelebrationEmblem } from '@/components/ui/celebrate';
import { TextField } from '@/components/ui/field';
import { Button, IconButton } from '@/components/ui/primitives';
import { ProgressBar } from '@/components/ui/progress';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { isDue, type Grade } from '@/lib/store/srs';
import type { Card } from '@/lib/store/types';
import { useActions, useData } from '@/lib/store/store';
import { useTheme } from '@/hooks/use-theme';
import { tapLight, tapSuccess } from '@/lib/util/haptics';

type Mode = 'flashcards' | 'choice' | 'type';

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function matchPercent(user: string, answer: string): number {
  const u = normalize(user);
  const a = normalize(answer);
  if (!a) return 0;
  if (u === a) return 100;
  const answerWords = a.split(' ');
  const userWords = new Set(u.split(' ').filter(Boolean));
  const hits = answerWords.filter((w) => userWords.has(w)).length;
  return Math.round((hits / answerWords.length) * 100);
}

type Scope = 'new' | 'review' | 'all' | 'due';

export default function StudySession() {
  const params = useLocalSearchParams<{ id: string; mode?: string; scope?: string }>();
  const mode: Mode = params.mode === 'choice' ? 'choice' : params.mode === 'type' ? 'type' : 'flashcards';
  const scope: Scope =
    params.scope === 'new' || params.scope === 'review' || params.scope === 'all' ? params.scope : 'due';
  const data = useData();
  const actions = useActions();
  const theme = useTheme();
  const deck = data.decks.find((d) => d.id === params.id);

  const order = useMemo(() => {
    if (!deck) return [] as string[];
    const now = Date.now();
    const pool =
      scope === 'new'
        ? deck.cards.filter((c) => c.reviews === 0)
        : scope === 'review'
          ? deck.cards.filter((c) => isDue(c, now) && c.reviews > 0)
          : scope === 'all'
            ? deck.cards
            : deck.cards.filter((c) => isDue(c, now));
    // Legacy default keeps its fallback (nothing due → review everything); an
    // explicitly chosen empty scope stays empty and shows "Nothing to study".
    if (scope === 'due' && pool.length === 0) return shuffle(deck.cards.map((c) => c.id));
    return shuffle(pool.map((c) => c.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id, scope]);

  const cards = useMemo(
    () => order.map((cid) => deck?.cards.find((c) => c.id === cid)).filter((c): c is Card => !!c),
    [order, deck?.cards],
  );

  const choices = useMemo(() => {
    const out: Record<string, string[]> = {};
    if (!deck) return out;
    const allBacks = deck.cards.map((c) => c.back);
    for (const c of cards) {
      const distractors = shuffle(allBacks.filter((b) => b !== c.back)).slice(0, 3);
      out[c.id] = shuffle([c.back, ...distractors]);
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order, deck?.cards.length]);

  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const [typed, setTyped] = useState('');
  const [checked, setChecked] = useState(false);
  const [correct, setCorrect] = useState(0);

  const finished = !!deck && cards.length > 0 && index >= cards.length;
  useEffect(() => {
    if (finished) tapSuccess();
  }, [finished]);

  const advance = (wasCorrect: boolean) => {
    if (wasCorrect) setCorrect((n) => n + 1);
    setFlipped(false);
    setPicked(null);
    setTyped('');
    setChecked(false);
    setIndex((i) => i + 1);
  };
  const restart = () => {
    setIndex(0);
    setCorrect(0);
    setFlipped(false);
    setPicked(null);
    setTyped('');
    setChecked(false);
  };

  if (!deck || cards.length === 0) {
    return (
      <SafeAreaView style={[styles.flex, styles.center, { backgroundColor: theme.background }]}>
        <ThemedText type="h3">Nothing to study</ThemedText>
        <Button title="Back" style={{ marginTop: Spacing.three }} onPress={() => router.back()} />
      </SafeAreaView>
    );
  }

  if (index >= cards.length) {
    const perfect = mode !== 'flashcards' && correct === cards.length;
    return (
      <SafeAreaView style={[styles.flex, styles.center, { backgroundColor: theme.background }]}>
        <CelebrationEmblem icon={Check} tone={perfect ? 'success' : 'accent'} />
        <ThemedText type="h1" style={{ marginTop: Spacing.two }}>
          {perfect ? 'Perfect recall' : mode === 'flashcards' ? 'Reviewed' : 'Done!'}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {mode === 'flashcards'
            ? `You reviewed ${cards.length} card${cards.length === 1 ? '' : 's'}.`
            : `You got ${correct} of ${cards.length} right.`}
        </ThemedText>
        <View style={{ flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.five }}>
          <Button variant="secondary" icon={RotateCcw} title="Again" onPress={restart} />
          <Button title="Finish" onPress={() => router.back()} />
        </View>
      </SafeAreaView>
    );
  }

  const card = cards[index];
  const grade = (g: Grade) => {
    actions.reviewCard(deck.id, card.id, g);
    advance(g !== 'again');
  };

  return (
    <View style={[styles.flex, { backgroundColor: theme.background }]}>
      <SafeAreaView edges={['top']}>
        <View style={styles.topbar}>
          <IconButton icon={ChevronLeft} onPress={() => router.back()} accessibilityLabel="Back" />
          <View style={{ flex: 1 }}>
            <ProgressBar value={index / cards.length} />
          </View>
          <ThemedText type="small" themeColor="textSecondary">
            {index + 1}/{cards.length}
          </ThemedText>
        </View>
      </SafeAreaView>

      {mode === 'flashcards' ? (
        <Flashcards
          card={card}
          flipped={flipped}
          onFlip={() => {
            setFlipped((f) => !f);
            tapLight();
          }}
          onGrade={grade}
          theme={theme}
        />
      ) : mode === 'choice' ? (
        <Choice
          card={card}
          options={choices[card.id] ?? [card.back]}
          picked={picked}
          onPick={(opt) => {
            setPicked(opt);
            const right = opt === card.back;
            actions.reviewCard(deck.id, card.id, right ? 'good' : 'again');
            if (right) tapSuccess();
            else tapLight();
          }}
          onNext={() => advance(picked === card.back)}
          theme={theme}
        />
      ) : (
        <TypeIt
          card={card}
          kind={deck.kind}
          typed={typed}
          checked={checked}
          onType={setTyped}
          onCheck={() => setChecked(true)}
          onResult={(right) => {
            actions.reviewCard(deck.id, card.id, right ? 'good' : 'again');
            advance(right);
          }}
          theme={theme}
        />
      )}
    </View>
  );
}

type ThemeT = ReturnType<typeof useTheme>;

function Flashcards({
  card,
  flipped,
  onFlip,
  onGrade,
  theme,
}: {
  card: Card;
  flipped: boolean;
  onFlip: () => void;
  onGrade: (g: Grade) => void;
  theme: ThemeT;
}) {
  return (
    <>
      <View style={styles.cardArea}>
        <Pressable onPress={onFlip} style={[styles.flashcard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <ThemedText type="label" themeColor="textTertiary">
            {flipped ? 'Answer' : 'Prompt'}
          </ThemedText>
          <ThemedText type={flipped ? 'bodySerif' : 'h1'} style={styles.face}>
            {flipped ? card.back : card.front}
          </ThemedText>
          {!flipped ? (
            <ThemedText type="caption" themeColor="textTertiary" style={{ marginTop: Spacing.five }}>
              Tap to reveal
            </ThemedText>
          ) : null}
        </Pressable>
      </View>
      <View style={styles.controls}>
        {!flipped ? (
          <Button title="Show answer" full onPress={onFlip} />
        ) : (
          <View style={styles.row}>
            <Button variant="secondary" title="Again" style={{ flex: 1 }} onPress={() => onGrade('again')} />
            <Button variant="secondary" title="Good" style={{ flex: 1 }} onPress={() => onGrade('good')} />
            <Button title="Easy" style={{ flex: 1 }} onPress={() => onGrade('easy')} />
          </View>
        )}
      </View>
    </>
  );
}

function Choice({
  card,
  options,
  picked,
  onPick,
  onNext,
  theme,
}: {
  card: Card;
  options: string[];
  picked: string | null;
  onPick: (opt: string) => void;
  onNext: () => void;
  theme: ThemeT;
}) {
  const revealed = picked !== null;
  return (
    <>
      <ScrollView contentContainerStyle={styles.quizBody} showsVerticalScrollIndicator={false}>
        <ThemedText type="label" themeColor="textTertiary">
          Which is correct?
        </ThemedText>
        <ThemedText type="h2" style={{ marginTop: Spacing.two, marginBottom: Spacing.four }}>
          {card.front}
        </ThemedText>
        {options.map((opt, i) => {
          const isCorrect = opt === card.back;
          const isPicked = picked === opt;
          const borderColor = revealed
            ? isCorrect
              ? theme.success
              : isPicked
                ? theme.danger
                : theme.border
            : theme.border;
          return (
            <Pressable
              key={`${i}-${opt.slice(0, 12)}`}
              disabled={revealed}
              onPress={() => onPick(opt)}
              style={({ pressed }) => [
                styles.option,
                { backgroundColor: theme.card, borderColor },
                revealed && !isCorrect && !isPicked && { opacity: 0.5 },
                pressed && { opacity: 0.85 },
              ]}>
              <ThemedText type="body" style={{ flex: 1 }}>
                {opt}
              </ThemedText>
              {revealed && isCorrect ? <Check size={18} color={theme.success} /> : null}
              {revealed && isPicked && !isCorrect ? <X size={18} color={theme.danger} /> : null}
            </Pressable>
          );
        })}
      </ScrollView>
      <View style={styles.controls}>{revealed ? <Button title="Next" full onPress={onNext} /> : null}</View>
    </>
  );
}

function TypeIt({
  card,
  kind,
  typed,
  checked,
  onType,
  onCheck,
  onResult,
  theme,
}: {
  card: Card;
  kind: 'verse' | 'fact';
  typed: string;
  checked: boolean;
  onType: (t: string) => void;
  onCheck: () => void;
  onResult: (right: boolean) => void;
  theme: ThemeT;
}) {
  return (
    <ScrollView contentContainerStyle={styles.quizBody} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets keyboardDismissMode="interactive">
      <ThemedText type="label" themeColor="textTertiary">
        {kind === 'verse' ? 'Type the verse' : 'Type the answer'}
      </ThemedText>
      <ThemedText type="h2" style={{ marginTop: Spacing.two, marginBottom: Spacing.four }}>
        {card.front}
      </ThemedText>

      {!checked ? (
        <>
          <TextField value={typed} onChangeText={onType} placeholder="Your answer…" multiline autoFocus />
          <Button title="Check answer" full style={{ marginTop: Spacing.three }} onPress={onCheck} />
        </>
      ) : (
        <>
          <View style={[styles.reveal, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText type="label" themeColor="textTertiary">
              Answer · {matchPercent(typed, card.back)}% match
            </ThemedText>
            <ThemedText type="bodySerif" style={{ marginTop: Spacing.two }}>
              {card.back}
            </ThemedText>
          </View>
          <View style={[styles.row, { marginTop: Spacing.three }]}>
            <Button variant="secondary" title="Missed it" style={{ flex: 1 }} onPress={() => onResult(false)} />
            <Button title="Got it" style={{ flex: 1 }} onPress={() => onResult(true)} />
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center', padding: Spacing.five },
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  cardArea: { flex: 1, justifyContent: 'center', paddingHorizontal: Spacing.four, width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  flashcard: {
    minHeight: 280,
    borderRadius: Radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.five,
    alignItems: 'center',
    justifyContent: 'center',
  },
  face: { textAlign: 'center', marginTop: Spacing.three },
  quizBody: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.five,
    gap: Spacing.two,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.four,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  reveal: { padding: Spacing.four, borderRadius: Radius.md },
  controls: { padding: Spacing.four, width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  row: { flexDirection: 'row', gap: Spacing.two },
});
