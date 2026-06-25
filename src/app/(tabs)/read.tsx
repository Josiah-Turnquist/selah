import { router } from 'expo-router';
import { BookOpen, ChevronDown, Flame, NotebookPen, Settings } from 'lucide-react-native';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ChapterPicker } from '@/components/chapter-picker';
import { ThemedText } from '@/components/themed-text';
import { TranslationSheet } from '@/components/translation-sheet';
import { Card, IconButton } from '@/components/ui/primitives';
import { Screen, ScreenHeader } from '@/components/ui/screen';
import { Radius, Spacing } from '@/constants/theme';
import { BOOKS, type Book } from '@/lib/bible/books';
import { getVerseText } from '@/lib/bible/bolls';
import { formatRef } from '@/lib/bible/refs';
import { verseOfDay } from '@/lib/bible/verse-of-day';
import { currentStreak } from '@/lib/cycle';
import { planStats } from '@/lib/plans/progress';
import { templateById } from '@/lib/plans/templates';
import { useActions, useData } from '@/lib/store/store';
import { useTheme } from '@/hooks/use-theme';

function openReader(bookId: number, chapter: number, verse?: number) {
  router.push(verse ? `/reader/${bookId}/${chapter}?v=${verse}` : `/reader/${bookId}/${chapter}`);
}

export default function ReadScreen() {
  const data = useData();
  const actions = useActions();
  const theme = useTheme();
  const translation = data.settings.translation;
  const streak = currentStreak(data.readDays, 'daily');

  const [showTranslation, setShowTranslation] = useState(false);
  const [pickerBook, setPickerBook] = useState<Book | null>(null);

  const lastRead = data.lastRead;
  const activePlan = data.plans[0];
  const planToday = useMemo(() => {
    if (!activePlan) return null;
    const tpl = templateById(activePlan.templateId);
    if (!tpl) return null;
    const stats = planStats(activePlan);
    const dayNum = Math.min(tpl.days.length, stats.nextDay);
    return { tpl, dayNum, readings: tpl.days[dayNum - 1] ?? [] };
  }, [activePlan]);

  return (
    <Screen scroll tab>
      <ScreenHeader
        title="Read"
        right={
          <>
            <IconButton icon={NotebookPen} onPress={() => router.push('/notes')} accessibilityLabel="Notes and highlights" />
            <IconButton icon={Settings} onPress={() => router.push('/settings')} accessibilityLabel="Settings" />
          </>
        }
      />

      {streak > 0 ? (
        <View style={styles.streak}>
          <Flame size={15} color={theme.ember} />
          <ThemedText type="small" themeColor="ember" style={{ fontWeight: '600' }}>
            {streak}-day reading streak
          </ThemedText>
        </View>
      ) : null}

      <VerseOfDay translation={translation} onChangeTranslation={() => setShowTranslation(true)} />

      <SectionLabel>Continue</SectionLabel>
      <Card onPress={() => openReader(lastRead?.bookId ?? 43, lastRead?.chapter ?? 1)}>
        <View style={styles.continue}>
          <View style={{ flex: 1 }}>
            <ThemedText type="caption" themeColor="textSecondary">
              {lastRead ? 'Pick up where you left off' : 'A good place to begin'}
            </ThemedText>
            <ThemedText type="h2">{formatRef(lastRead?.bookId ?? 43, lastRead?.chapter ?? 1)}</ThemedText>
          </View>
          <View style={[styles.roundIcon, { backgroundColor: theme.accentSoft }]}>
            <BookOpen size={22} color={theme.accent} />
          </View>
        </View>
      </Card>

      {planToday && planToday.readings.length > 0 ? (
        <Card style={{ marginTop: Spacing.three }} onPress={() => router.push(`/plan/${activePlan.id}`)}>
          <ThemedText type="label" themeColor="accent">
            Today · {planToday.tpl.title}
          </ThemedText>
          <ThemedText type="h3" style={{ marginTop: 4 }}>
            Day {planToday.dayNum}: {planToday.readings.map((r) => formatRef(r.bookId, r.chapter)).join(' · ')}
          </ThemedText>
        </Card>
      ) : null}

      <SectionLabel>Old Testament</SectionLabel>
      <BookGrid books={BOOKS.filter((b) => b.testament === 'OT')} onPick={setPickerBook} />
      <SectionLabel>New Testament</SectionLabel>
      <BookGrid books={BOOKS.filter((b) => b.testament === 'NT')} onPick={setPickerBook} />

      <TranslationSheet
        visible={showTranslation}
        onClose={() => setShowTranslation(false)}
        value={translation}
        onSelect={actions.setTranslation}
      />
      <ChapterPicker
        book={pickerBook}
        visible={!!pickerBook}
        onClose={() => setPickerBook(null)}
        onPick={(c) => pickerBook && openReader(pickerBook.id, c)}
      />
    </Screen>
  );
}

function VerseOfDay({ translation, onChangeTranslation }: { translation: string; onChangeTranslation: () => void }) {
  const theme = useTheme();
  const ref = useMemo(() => verseOfDay(), []);
  const [text, setText] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setText(null);
    getVerseText(translation, ref.bookId, ref.chapter, ref.verse)
      .then((t) => active && setText(t))
      .catch(() => active && setText(''));
    return () => {
      active = false;
    };
  }, [translation, ref]);

  return (
    <View style={styles.votd}>
      <ThemedText type="label" themeColor="accent">
        Verse of the day
      </ThemedText>
      <ThemedText
        type="bodySerif"
        themeColor={text ? 'text' : 'textTertiary'}
        style={{ marginTop: Spacing.two }}>
        {text === null ? 'Loading…' : text}
      </ThemedText>
      <View style={styles.votdFooter}>
        <ThemedText type="caption" themeColor="textSecondary">
          {formatRef(ref.bookId, ref.chapter, ref.verse)}
        </ThemedText>
        <Pressable
          onPress={onChangeTranslation}
          hitSlop={10}
          accessibilityLabel={`Translation: ${translation}. Tap to change.`}
          style={({ pressed }) => [styles.translationToggle, pressed && { opacity: 0.45 }]}>
          <ThemedText type="caption" themeColor="textTertiary">
            {translation}
          </ThemedText>
          <ChevronDown size={12} color={theme.textTertiary} />
        </Pressable>
      </View>
    </View>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <ThemedText type="label" themeColor="textTertiary" style={styles.sectionLabel}>
      {children}
    </ThemedText>
  );
}

function BookGrid({ books, onPick }: { books: Book[]; onPick: (book: Book) => void }) {
  const theme = useTheme();
  return (
    <View style={styles.bookGrid}>
      {books.map((b) => (
        <Pressable
          key={b.id}
          onPress={() => onPick(b)}
          accessibilityLabel={b.name}
          style={({ pressed }) => [
            styles.bookChip,
            { backgroundColor: theme.backgroundElement },
            pressed && { opacity: 0.6 },
          ]}>
          <ThemedText type="small">{b.name}</ThemedText>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  votd: { marginTop: Spacing.two, marginBottom: Spacing.three },
  votdFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing.two },
  translationToggle: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  streak: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: Spacing.three },
  continue: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  roundIcon: { width: 46, height: 46, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  sectionLabel: { marginTop: Spacing.five, marginBottom: Spacing.two },
  bookGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  bookChip: { paddingHorizontal: Spacing.three, height: 38, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
});
