import * as Clipboard from 'expo-clipboard';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  GraduationCap,
  Share2,
  StickyNote,
  Type as TypeIcon,
  X,
} from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Animated,
  Easing,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { BookNav } from '@/components/book-nav';
import { DeckPicker } from '@/components/deck-picker';
import { ThemedText } from '@/components/themed-text';
import { TranslationSheet } from '@/components/translation-sheet';
import { TextField } from '@/components/ui/field';
import { Button, IconButton, type IconType } from '@/components/ui/primitives';
import { ReaderSkeleton } from '@/components/ui/skeleton';
import { Segmented } from '@/components/ui/segmented';
import { Sheet } from '@/components/ui/sheet';
import { useToast } from '@/components/ui/toast';
import {
  Fonts,
  HIGHLIGHT_COLORS,
  Highlights,
  MaxContentWidth,
  Radius,
  Spacing,
  highlightBg,
} from '@/constants/theme';
import { BOOKS, bookById } from '@/lib/bible/books';
import { getChapter, peekChapter, prefetchChapter, type Verse } from '@/lib/bible/bolls';
import { formatRef, formatVerseRange, refKey } from '@/lib/bible/refs';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { useActions, useData } from '@/lib/store/store';
import type { Note } from '@/lib/store/types';
import { tapLight, tapSuccess } from '@/lib/util/haptics';

type Neighbor = { bookId: number; chapter: number } | null;

function neighbor(bookId: number, chapter: number, dir: 1 | -1): Neighbor {
  const book = bookById(bookId);
  if (!book) return null;
  const target = chapter + dir;
  if (target >= 1 && target <= book.chapters) return { bookId, chapter: target };
  const idx = BOOKS.findIndex((b) => b.id === bookId);
  if (dir > 0) {
    const next = BOOKS[idx + 1];
    return next ? { bookId: next.id, chapter: 1 } : null;
  }
  const prev = BOOKS[idx - 1];
  return prev ? { bookId: prev.id, chapter: prev.chapters } : null;
}

const round1 = (n: number) => Math.round(n * 10) / 10;
const useNative = Platform.OS !== 'web';

// Group verses into flowing runs. A run breaks before a verse that carries a
// heading (so the heading opens a fresh paragraph) and after any verse with a
// note (so the note can render between paragraphs).
function buildSegments(verses: Verse[], getNote: (verse: number) => Note | undefined) {
  const segments: { verses: Verse[]; note?: Note }[] = [];
  let run: Verse[] = [];
  for (const v of verses) {
    if (v.headings.length && run.length) {
      segments.push({ verses: run });
      run = [];
    }
    run.push(v);
    const note = getNote(v.verse);
    if (note) {
      segments.push({ verses: run, note });
      run = [];
    }
  }
  if (run.length) segments.push({ verses: run });
  return segments;
}

export default function ReaderScreen() {
  const params = useLocalSearchParams<{ bookId: string; chapter: string; v?: string }>();
  const bookId = parseInt(params.bookId, 10);
  const chapter = parseInt(params.chapter, 10);
  const targetVerse = params.v ? parseInt(params.v, 10) : null;

  const data = useData();
  const actions = useActions();
  const theme = useTheme();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const translation = data.settings.translation;
  const compareTranslation =
    data.settings.compareTranslation && data.settings.compareTranslation !== translation
      ? data.settings.compareTranslation
      : null;
  const scale = data.settings.readerFontScale;
  const weight = data.settings.readerWeight;
  const flow = data.settings.paragraphMode && !compareTranslation;
  const book = bookById(bookId);

  const [verses, setVerses] = useState<Verse[]>(() => peekChapter(translation, bookId, chapter) ?? []);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(() =>
    peekChapter(translation, bookId, chapter) ? 'ready' : 'loading',
  );
  const [selected, setSelected] = useState<number[]>([]);
  const [sheet, setSheet] = useState<'note' | 'deck' | null>(null);
  const [noteText, setNoteText] = useState('');
  const [flash, setFlash] = useState<number | null>(null);
  const [showTranslation, setShowTranslation] = useState(false);
  const [showChapters, setShowChapters] = useState(false);
  const [showFont, setShowFont] = useState(false);
  const [compareMap, setCompareMap] = useState<Record<number, string>>({});
  const [openNotes, setOpenNotes] = useState<Set<number>>(() => new Set());

  const scrollRef = useRef<ScrollView>(null);
  const offsets = useRef<Record<number, number>>({});
  const scrolled = useRef(false);
  const progress = useRef(new Animated.Value(0)).current;
  const headerY = useRef(new Animated.Value(0)).current;
  const [headerH, setHeaderH] = useState(56);
  const headerShown = useRef(true);
  const lastScrollY = useRef(0);

  const setHeaderVisible = (shown: boolean) => {
    if (headerShown.current === shown) return;
    headerShown.current = shown;
    Animated.timing(headerY, {
      toValue: shown ? 0 : -headerH,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: useNative,
    }).start();
  };

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    const y = contentOffset.y;
    const max = contentSize.height - layoutMeasurement.height;
    progress.setValue(max > 0 ? Math.min(1, Math.max(0, y / max)) : 0);

    const dy = y - lastScrollY.current;
    if (y < headerH) setHeaderVisible(true);
    else if (dy > 6) setHeaderVisible(false);
    else if (dy < -6) setHeaderVisible(true);
    lastScrollY.current = y;
  };

  useEffect(() => {
    let active = true;
    setSelected([]);
    setSheet(null);
    setOpenNotes(new Set());
    offsets.current = {};
    scrolled.current = false;
    progress.setValue(0);
    headerY.setValue(0);
    headerShown.current = true;
    lastScrollY.current = 0;
    if (!book || Number.isNaN(chapter)) {
      setStatus('error');
      return;
    }
    const onReady = (v: Verse[]) => {
      if (!active) return;
      setVerses(v);
      setStatus('ready');
      actions.recordRead();
      if (!targetVerse) {
        requestAnimationFrame(() => scrollRef.current?.scrollTo({ y: 0, animated: false }));
      }
      // Warm both neighbours so swiping either direction is instant.
      const after = neighbor(bookId, chapter, 1);
      if (after) prefetchChapter(translation, after.bookId, after.chapter);
      const before = neighbor(bookId, chapter, -1);
      if (before) prefetchChapter(translation, before.bookId, before.chapter);
    };
    const cached = peekChapter(translation, bookId, chapter);
    if (cached) {
      onReady(cached);
    } else {
      setStatus('loading');
      setVerses([]);
      getChapter(translation, bookId, chapter)
        .then(onReady)
        .catch(() => active && setStatus('error'));
    }
    actions.setLastRead(bookId, chapter);
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [translation, bookId, chapter]);

  useEffect(() => {
    if (targetVerse && status === 'ready') {
      setFlash(targetVerse);
      const t = setTimeout(() => setFlash(null), 2600);
      return () => clearTimeout(t);
    }
  }, [targetVerse, status]);

  // Fetch the comparison translation's chapter independently of the primary.
  useEffect(() => {
    setCompareMap({});
    if (!compareTranslation || !book || Number.isNaN(chapter)) return;
    let active = true;
    getChapter(compareTranslation, bookId, chapter)
      .then((vs) => {
        if (!active) return;
        const map: Record<number, string> = {};
        for (const v of vs) map[v.verse] = v.text;
        setCompareMap(map);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [compareTranslation, bookId, chapter, book]);

  const verseText = (v: number) => verses.find((x) => x.verse === v)?.text ?? '';
  const toggleVerse = (v: number) => {
    tapLight();
    setSelected((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v].sort((a, b) => a - b)));
  };

  const selectionLabel =
    selected.length === 0
      ? ''
      : selected.length === 1
        ? formatRef(bookId, chapter, selected[0])
        : `${book?.name} ${chapter}:${formatVerseRange(selected)}`;
  const selectedText = () => selected.map((v) => verseText(v)).join(' ');

  const chapterNotes = useMemo(() => {
    const map = new Map<number, Note>();
    for (const n of data.notes) {
      if (n.bookId === bookId && n.chapter === chapter) map.set(n.verse, n);
    }
    return map;
  }, [data.notes, bookId, chapter]);

  const noteVerse = selected.length === 1 ? selected[0] : null;
  const existingNote = noteVerse != null ? chapterNotes.get(noteVerse) : undefined;

  const swatchActive = (c: (typeof HIGHLIGHT_COLORS)[number]) =>
    selected.length > 0 && selected.every((v) => data.highlights[refKey(bookId, chapter, v)]?.color === c);
  const applyHighlight = (c: (typeof HIGHLIGHT_COLORS)[number]) => {
    const turnOff = swatchActive(c);
    selected.forEach((v) => actions.setHighlight(bookId, chapter, v, turnOff ? null : c));
    tapSuccess();
    setSelected([]);
    setSheet(null);
  };
  const clearHighlight = () => {
    selected.forEach((v) => actions.setHighlight(bookId, chapter, v, null));
    setSelected([]);
    setSheet(null);
  };

  const openNote = () => {
    setNoteText(existingNote?.text ?? '');
    setSheet('note');
  };
  const saveNote = () => {
    if (noteVerse != null) actions.upsertNote(bookId, chapter, noteVerse, noteText);
    setSelected([]);
    setSheet(null);
  };
  const addToDeck = (deckId: string) => {
    const deck = data.decks.find((d) => d.id === deckId);
    actions.addCard(deckId, selectionLabel, selectedText(), { bookId, chapter, verse: selected[0] });
    tapSuccess();
    setSelected([]);
    setSheet(null);
    toast(`Added to ${deck?.title ?? 'deck'}`);
  };
  const copy = async () => {
    await Clipboard.setStringAsync(`${selectedText()}\n— ${selectionLabel} (${translation})`);
    setSelected([]);
    setSheet(null);
    toast(selected.length > 1 ? 'Passage copied' : 'Verse copied');
  };
  const share = async () => {
    const text = `${selectedText()}\n— ${selectionLabel} (${translation})`;
    try {
      await Share.share({ message: text });
    } catch {
      await Clipboard.setStringAsync(text);
      toast('Copied to clipboard');
    }
    setSelected([]);
    setSheet(null);
  };

  const go = (n: Neighbor) => {
    if (!n) return;
    setSelected([]);
    setSheet(null);
    router.replace(`/reader/${n.bookId}/${n.chapter}`);
  };

  const prev = neighbor(bookId, chapter, -1);
  const next = neighbor(bookId, chapter, 1);

  // Horizontal swipe → previous / next chapter. Only claims the gesture on a
  // decisive sideways drag, so vertical scrolling and verse taps are untouched.
  const swipe = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) =>
          Math.abs(g.dx) > 20 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
        onPanResponderTerminationRequest: () => false,
        onPanResponderRelease: (_, g) => {
          if (Math.abs(g.dx) < 56 || Math.abs(g.dx) < Math.abs(g.dy)) return;
          const target = neighbor(bookId, chapter, g.dx < 0 ? 1 : -1);
          if (target) {
            tapLight();
            setSelected([]);
            setSheet(null);
            router.replace(`/reader/${target.bookId}/${target.chapter}`);
          }
        },
      }),
    [bookId, chapter],
  );

  const verseNumStyle = {
    fontSize: 11 * scale,
    lineHeight: 31 * scale,
    color: theme.textTertiary,
    fontWeight: '600' as const,
  };
  const bodyLineStyle = { fontSize: 18 * scale, lineHeight: 31 * scale, fontWeight: weight };

  const renderHeadings = (headings: Verse['headings']) =>
    headings.map((h, hi) => {
      if (h.kind === 'divider') {
        return (
          <ThemedText key={`h-${hi}`} type="bodySerif" style={[styles.divider, { fontSize: 13 * scale, color: theme.textTertiary }]}>
            {h.text}
          </ThemedText>
        );
      }
      if (h.kind === 'superscription') {
        return (
          <ThemedText
            key={`h-${hi}`}
            type="bodySerif"
            style={[styles.superscription, { fontSize: 15 * scale, lineHeight: 22 * scale, color: theme.textSecondary }]}>
            {h.text}
          </ThemedText>
        );
      }
      return (
        <ThemedText
          key={`h-${hi}`}
          type="bodySerif"
          style={[styles.sectionHeading, { fontSize: 16 * scale, lineHeight: 23 * scale, color: theme.text }]}>
          {h.text}
        </ThemedText>
      );
    });

  const toggleNote = (verse: number) =>
    setOpenNotes((prev) => {
      const next = new Set(prev);
      if (next.has(verse)) next.delete(verse);
      else next.add(verse);
      return next;
    });

  // A small StickyNote button that trails a verse which has a note; tapping it
  // collapses or expands that note. It sits just after the verse (aligned with
  // the note block) rather than inline — RN can't put an SVG inside flowing <Text>.
  const noteToggle = (verse: number) => (
    <Pressable
      onPress={() => toggleNote(verse)}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={openNotes.has(verse) ? 'Hide note' : 'Show note'}
      style={styles.noteToggle}>
      <StickyNote size={15} color={openNotes.has(verse) ? theme.accent : theme.textTertiary} />
    </Pressable>
  );

  // A verse's body as block lines: a hanging verse-number gutter beside a column
  // of poetic lines. Each line is its own block so highlights round + pad, and
  // Selah sits right-aligned on its own line.
  const renderLines = (v: Verse, hl?: (typeof HIGHLIGHT_COLORS)[number]) => {
    const numberLine = v.lines.findIndex((l) => l.text.length > 0);
    return (
      <View style={styles.lineRow}>
        <ThemedText style={[verseNumStyle, { width: 24 * scale }]}>{numberLine >= 0 ? v.verse : ''}</ThemedText>
        <View style={styles.lineCol}>
          {v.lines.map((ln, li) => (
            <View key={li}>
              {ln.text ? (
                hl ? (
                  // Highlight lives on a <View> — the New Architecture ignores
                  // borderRadius/padding on <Text>. flexShrink lets long lines
                  // wrap inside the chip while short lines hug the words.
                  <View style={styles.hlLine}>
                    <View style={[styles.hlChip, { backgroundColor: highlightBg(hl, scheme) }]}>
                      <ThemedText type="bodySerif" style={bodyLineStyle}>
                        {ln.text}
                      </ThemedText>
                    </View>
                  </View>
                ) : (
                  <ThemedText type="bodySerif" style={bodyLineStyle}>
                    {ln.text}
                  </ThemedText>
                )
              ) : null}
              {ln.selah ? (
                <ThemedText
                  type="bodySerif"
                  style={[styles.selah, { fontSize: 15 * scale, lineHeight: 26 * scale, color: theme.textTertiary }]}>
                  Selah
                </ThemedText>
              ) : null}
            </View>
          ))}
        </View>
      </View>
    );
  };

  // The tappable verse body — used in verse-lines mode and for poetry verses in
  // paragraph mode. Headings and notes are rendered by the caller.
  const renderVerseBlock = (v: Verse) => {
    const hl = data.highlights[refKey(bookId, chapter, v.verse)];
    const active = selected.includes(v.verse) || flash === v.verse;
    const hasCompare = !!(compareTranslation && compareMap[v.verse]);
    if (v.lines.length === 0 && !hasCompare) return null;
    return (
      <Pressable
        key={`vb-${v.verse}`}
        onPress={() => toggleVerse(v.verse)}
        style={[styles.verseRow, active && { backgroundColor: theme.accentSoft }]}>
        {renderLines(v, hl?.color)}
        {hasCompare ? (
          <ThemedText
            type="bodySerif"
            style={[
              styles.compareText,
              { color: theme.textSecondary, borderLeftColor: theme.border, fontSize: 16 * scale, lineHeight: 26 * scale },
            ]}>
            {compareMap[v.verse]}
          </ThemedText>
        ) : null}
      </Pressable>
    );
  };

  const renderNote = (note: Note) => (
    <Pressable
      onPress={() => {
        setSelected([note.verse]);
        setNoteText(note.text);
        setSheet('note');
      }}
      style={[styles.noteBlock, { backgroundColor: theme.accentSoft }]}>
      <ThemedText type="caption" themeColor="textSecondary" style={{ flex: 1 }}>
        {note.text}
      </ThemedText>
    </Pressable>
  );

  // Verse-lines mode: each verse is its own block, with the onLayout hook used
  // to jump to a target verse.
  const renderVerse = (v: Verse) => {
    const note = chapterNotes.get(v.verse);
    return (
      <View
        key={v.verse}
        onLayout={(e) => {
          offsets.current[v.verse] = e.nativeEvent.layout.y;
          if (targetVerse === v.verse && !scrolled.current) {
            scrolled.current = true;
            requestAnimationFrame(() =>
              scrollRef.current?.scrollTo({
                y: Math.max(0, (offsets.current[v.verse] ?? 0) - 90),
                animated: true,
              }),
            );
          }
        }}>
        {renderHeadings(v.headings)}
        {renderVerseBlock(v)}
        {note ? noteToggle(v.verse) : null}
        {note && openNotes.has(v.verse) ? renderNote(note) : null}
      </View>
    );
  };

  // Paragraph mode: prose verses flow together; poetry verses (multiple lines or
  // Selah) still break into lines so the structure is preserved.
  const renderParagraphSegment = (seg: { verses: Verse[]; note?: Note }, si: number) => {
    const blocks: ReactNode[] = [];
    let inline: ReactNode[] = [];
    let k = 0;
    const flushInline = () => {
      if (!inline.length) return;
      blocks.push(
        <ThemedText
          key={`fl-${k++}`}
          type="bodySerif"
          style={{ fontSize: 18 * scale, lineHeight: 31 * scale, fontWeight: weight, paddingHorizontal: 6 }}>
          {inline}
        </ThemedText>,
      );
      inline = [];
    };
    seg.verses.forEach((v) => {
      const isPoetry = v.lines.length > 1 || v.lines.some((l) => l.selah);
      if (isPoetry) {
        flushInline();
        blocks.push(renderVerseBlock(v));
        return;
      }
      const body = v.lines.map((l) => l.text).join(' ');
      if (!body) return;
      const fhl = data.highlights[refKey(bookId, chapter, v.verse)];
      const factive = selected.includes(v.verse) || flash === v.verse;
      inline.push(
        <ThemedText
          key={`v-${v.verse}`}
          onPress={() => toggleVerse(v.verse)}
          style={factive ? { backgroundColor: theme.accentSoft } : undefined}>
          <ThemedText style={verseNumStyle}>{v.verse} </ThemedText>
          <ThemedText style={[bodyLineStyle, fhl && { backgroundColor: highlightBg(fhl.color, scheme) }]}>{body}</ThemedText>
          {'  '}
        </ThemedText>,
      );
    });
    flushInline();
    return (
      <View key={`seg-${si}`} style={{ marginBottom: Spacing.three }}>
        {renderHeadings(seg.verses[0]?.headings ?? [])}
        {blocks}
        {seg.note ? noteToggle(seg.note.verse) : null}
        {seg.note && openNotes.has(seg.note.verse) ? renderNote(seg.note) : null}
      </View>
    );
  };

  return (
    <View style={[styles.flex, { backgroundColor: theme.background }]}>
      {status === 'loading' ? (
        <View style={{ flex: 1, paddingTop: headerH }}>
          <ReaderSkeleton />
        </View>
      ) : status === 'error' ? (
        <View style={styles.centered}>
          <ThemedText type="h3">Couldn’t load this chapter</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={{ textAlign: 'center', marginTop: 6 }}>
            Check your connection and try again.
          </ThemedText>
          <Button
            title="Retry"
            style={{ marginTop: Spacing.four }}
            onPress={() => router.replace(`/reader/${bookId}/${chapter}`)}
          />
        </View>
      ) : (
        <View style={styles.flex} {...swipe.panHandlers}>
        <ScrollView
          ref={scrollRef}
          onScroll={onScroll}
          scrollEventThrottle={16}
          contentContainerStyle={[
            styles.content,
            { paddingTop: headerH + Spacing.three },
            selected.length > 0 && { paddingBottom: 240 },
          ]}
          showsVerticalScrollIndicator={false}>
          <ThemedText style={[styles.chapterTitle, { marginBottom: Spacing.four }]}>
            {book?.name} {chapter}
          </ThemedText>

          {flow ? (
            buildSegments(verses, (verse) => chapterNotes.get(verse)).map(renderParagraphSegment)
          ) : (
            verses.map(renderVerse)
          )}

          <View style={styles.navRow}>
            <Button
              variant="secondary"
              size="sm"
              icon={ChevronLeft}
              title={prev ? formatRef(prev.bookId, prev.chapter) : 'Start'}
              onPress={() => go(prev)}
              disabled={!prev}
            />
            <Button
              variant="secondary"
              size="sm"
              iconRight={ChevronRight}
              title={next ? formatRef(next.bookId, next.chapter) : 'End'}
              onPress={() => go(next)}
              disabled={!next}
            />
          </View>
        </ScrollView>
        </View>
      )}

      <Animated.View
        onLayout={(e) => setHeaderH(e.nativeEvent.layout.height)}
        style={[styles.headerWrap, { backgroundColor: theme.background, transform: [{ translateY: headerY }] }]}>
        <SafeAreaView edges={['top']}>
          <View style={styles.header}>
            <IconButton icon={ChevronLeft} onPress={() => router.back()} accessibilityLabel="Back" />
            <Pressable
              onPress={() => setShowChapters(true)}
              accessibilityLabel="Jump to book or chapter"
              style={styles.headerTitle}>
              <ThemedText type="h3" numberOfLines={1}>
                {formatRef(bookId, chapter)}
              </ThemedText>
              <ChevronRight size={15} color={theme.textSecondary} style={{ transform: [{ rotate: '90deg' }] }} />
            </Pressable>
            <Pressable
              onPress={() => setShowTranslation(true)}
              style={[styles.translationMini, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText type="small" themeColor="accent" style={{ fontWeight: '600' }}>
                {compareTranslation ? `${translation} · ${compareTranslation}` : translation}
              </ThemedText>
            </Pressable>
            <IconButton icon={TypeIcon} onPress={() => setShowFont(true)} accessibilityLabel="Text size" />
          </View>
        </SafeAreaView>
        {status === 'ready' ? (
          <View style={[styles.progressTrack, { backgroundColor: theme.border }]}>
            <Animated.View
              style={[
                styles.progressBar,
                { backgroundColor: theme.accent, transform: [{ scaleX: progress }] },
              ]}
            />
          </View>
        ) : null}
      </Animated.View>

      {/* selection action bar (non-modal, so verses stay tappable) */}
      {selected.length > 0 ? (
        <View
          style={[
            styles.actionBar,
            { backgroundColor: theme.card, borderTopColor: theme.border, paddingBottom: insets.bottom + Spacing.three },
          ]}>
          <View style={styles.actionBarInner}>
            <View style={styles.barHeader}>
              <ThemedText type="h3" numberOfLines={1} style={{ flex: 1 }}>
                {selectionLabel}
              </ThemedText>
              <IconButton icon={X} onPress={() => setSelected([])} accessibilityLabel="Clear selection" />
            </View>
            <View style={styles.swatches}>
              {HIGHLIGHT_COLORS.map((c) => (
                <Pressable
                  key={c}
                  onPress={() => applyHighlight(c)}
                  accessibilityLabel={`Highlight ${c}`}
                  style={({ pressed }) => [
                    styles.swatch,
                    { backgroundColor: Highlights[c].dot },
                    swatchActive(c) && { borderColor: theme.text, borderWidth: 3 },
                    pressed && { opacity: 0.7 },
                  ]}
                />
              ))}
              <Pressable
                onPress={clearHighlight}
                accessibilityLabel="Clear highlight"
                style={[styles.swatch, styles.clearSwatch, { borderColor: theme.border }]}>
                <X size={18} color={theme.textSecondary} />
              </Pressable>
            </View>
            <View style={styles.actionGrid}>
              {noteVerse != null ? (
                <ActionBtn icon={StickyNote} label={existingNote ? 'Edit note' : 'Add note'} onPress={openNote} />
              ) : null}
              <ActionBtn icon={GraduationCap} label="Add to deck" onPress={() => setSheet('deck')} />
              <ActionBtn icon={Copy} label="Copy" onPress={copy} />
              <ActionBtn icon={Share2} label="Share" onPress={share} />
            </View>
          </View>
        </View>
      ) : null}

      {/* note editor */}
      <Sheet
        visible={sheet === 'note'}
        onClose={() => setSheet(null)}
        title={noteVerse != null ? `Note · ${formatRef(bookId, chapter, noteVerse)}` : 'Note'}>
        <TextField value={noteText} onChangeText={setNoteText} placeholder="Write a personal note…" multiline autoFocus />
        <View style={{ flexDirection: 'row', gap: Spacing.two }}>
          {existingNote ? (
            <Button
              variant="secondary"
              title="Delete"
              onPress={() => {
                if (existingNote) actions.deleteNote(existingNote.id);
                setSelected([]);
                setSheet(null);
              }}
            />
          ) : null}
          <Button title="Save note" full={!existingNote} style={{ flex: 1 }} onPress={saveNote} />
        </View>
      </Sheet>

      <DeckPicker visible={sheet === 'deck'} onClose={() => setSheet(null)} onPicked={addToDeck} />

      <TranslationSheet
        visible={showTranslation}
        onClose={() => setShowTranslation(false)}
        value={translation}
        onSelect={actions.setTranslation}
        compareValue={compareTranslation}
        onSelectCompare={actions.setCompareTranslation}
      />
      <BookNav
        visible={showChapters}
        onClose={() => setShowChapters(false)}
        onPick={(b, c) => go({ bookId: b, chapter: c })}
      />

      <Sheet visible={showFont} onClose={() => setShowFont(false)} title="Text size">
        <ThemedText type="bodySerif" style={{ fontSize: 18 * scale, lineHeight: 30 * scale, fontWeight: weight }}>
          “For God so loved the world, that he gave his one and only Son…”
        </ThemedText>
        <View style={styles.fontRow}>
          <Button variant="secondary" title="A−" onPress={() => actions.setFontScale(Math.max(0.85, round1(scale - 0.1)))} />
          <ThemedText type="h3">{Math.round(scale * 100)}%</ThemedText>
          <Button variant="secondary" title="A+" onPress={() => actions.setFontScale(Math.min(1.6, round1(scale + 0.1)))} />
        </View>
        <Segmented
          options={[
            { label: 'Verse lines', value: 'verses' },
            { label: 'Paragraph', value: 'paragraph' },
          ]}
          value={data.settings.paragraphMode ? 'paragraph' : 'verses'}
          onChange={(v) => actions.setParagraphMode(v === 'paragraph')}
        />
        {compareTranslation ? (
          <ThemedText type="caption" themeColor="textTertiary">
            Paragraph layout pauses while comparing translations.
          </ThemedText>
        ) : null}
      </Sheet>
    </View>
  );
}

function ActionBtn({ icon: Icon, label, onPress }: { icon: IconType; label: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.6 }]}>
      <View style={[styles.actionIcon, { backgroundColor: theme.backgroundElement }]}>
        <Icon size={20} color={theme.text} />
      </View>
      <ThemedText type="caption">{label}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  headerWrap: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 },
  progressTrack: { height: 2.5, width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', overflow: 'hidden' },
  progressBar: { height: 2.5, width: '100%', transformOrigin: 'left' },
  chapterTitle: { fontFamily: Fonts.serif, fontSize: 27, lineHeight: 34, fontWeight: '500', letterSpacing: -0.3 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  headerTitle: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 2 },
  translationMini: { paddingHorizontal: Spacing.three, height: 34, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.five },
  content: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.eight,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  verseRow: { paddingVertical: 4, paddingHorizontal: 6, borderRadius: Radius.sm, marginVertical: 1 },
  lineRow: { flexDirection: 'row', alignItems: 'flex-start' },
  lineCol: { flex: 1 },
  hlLine: { flexDirection: 'row' },
  // Padding is cancelled by equal negative margins on both axes: the text keeps the
  // exact same position as un-highlighted text (no indent, no height shift) while the
  // background still extends slightly past it, and consecutive highlighted lines overlap
  // so their chips merge with no gap.
  hlChip: { flexShrink: 1, borderRadius: 6, paddingHorizontal: 5, paddingVertical: 3, marginHorizontal: -5, marginVertical: -3 },
  divider: { fontFamily: Fonts.serif, textAlign: 'left', fontWeight: '700', letterSpacing: 0.5, paddingHorizontal: 6, marginTop: Spacing.two, marginBottom: Spacing.half },
  superscription: { fontFamily: Fonts.serif, fontStyle: 'italic', marginTop: 2, marginBottom: Spacing.two, paddingHorizontal: 6 },
  sectionHeading: { fontFamily: Fonts.serif, fontWeight: '600', marginTop: Spacing.three, marginBottom: Spacing.one, paddingHorizontal: 6, letterSpacing: -0.2 },
  selah: { textAlign: 'right', fontStyle: 'italic', marginTop: 2, marginBottom: 4 },
  compareText: { marginTop: 6, marginBottom: 2, paddingLeft: 12, borderLeftWidth: 2 },
  noteToggle: { alignSelf: 'flex-start', marginLeft: 14, marginTop: 2, padding: 4 },
  noteBlock: {
    marginLeft: 14,
    marginTop: 4,
    marginBottom: 6,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.sm,
    flexDirection: 'row',
    gap: Spacing.two,
    alignItems: 'flex-start',
  },
  navRow: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.three, marginTop: Spacing.six },
  actionBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.three,
    alignItems: 'center',
  },
  actionBarInner: { width: '100%', maxWidth: MaxContentWidth, paddingHorizontal: Spacing.four, gap: Spacing.three },
  barHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  swatches: { flexDirection: 'row', gap: Spacing.three, alignItems: 'center', justifyContent: 'center' },
  swatch: { width: 38, height: 38, borderRadius: Radius.pill, borderColor: 'transparent', borderWidth: 0, alignItems: 'center', justifyContent: 'center' },
  clearSwatch: { borderWidth: StyleSheet.hairlineWidth },
  actionGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  actionBtn: { alignItems: 'center', gap: Spacing.one, flex: 1 },
  actionIcon: { width: 50, height: 50, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  fontRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
