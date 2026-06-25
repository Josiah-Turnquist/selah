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
import { formatReadingList, formatRef } from '@/lib/bible/refs';
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
  const todayPlans = useMemo(
    () =>
      data.plans.flatMap((plan) => {
        const tpl = templateById(plan.templateId);
        if (!tpl) return [];
        const stats = planStats(plan);
        const dayNum = Math.min(tpl.days.length, stats.nextDay);
        const readings = tpl.days[dayNum - 1] ?? [];
        return readings.length > 0 ? [{ plan, tpl, dayNum, readings }] : [];
      }),
    [data.plans],
  );

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

      {todayPlans.length > 0 ? (
        <>
          <SectionLabel>Today</SectionLabel>
          {todayPlans.map((item, i) => (
            <Card
              key={item.plan.id}
              style={i > 0 ? { marginTop: Spacing.two } : undefined}
              onPress={() => router.push(`/plan/${item.plan.id}`)}>
              <View style={styles.planHeader}>
                <ThemedText type="label" themeColor="accent">
                  {item.tpl.title}
                </ThemedText>
                <ThemedText type="caption" themeColor="textSecondary">
                  Day {item.dayNum} of {item.tpl.durationDays}
                </ThemedText>
              </View>
              <ThemedText type="h3" style={{ marginTop: 6 }}>
                {formatReadingList(item.readings)}
              </ThemedText>
            </Card>
          ))}
        </>
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
  planHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: Spacing.two },
  roundIcon: { width: 46, height: 46, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  sectionLabel: { marginTop: Spacing.five, marginBottom: Spacing.two },
  bookGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  bookChip: { paddingHorizontal: Spacing.three, height: 38, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
});
