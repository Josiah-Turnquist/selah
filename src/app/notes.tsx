import { router } from 'expo-router';
import { ChevronLeft, Highlighter, StickyNote, Trash2, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { TextField } from '@/components/ui/field';
import { EmptyState, IconButton } from '@/components/ui/primitives';
import { Segmented } from '@/components/ui/segmented';
import { Highlights, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { formatRef, parseRefKey } from '@/lib/bible/refs';
import { useActions, useData } from '@/lib/store/store';
import { useTheme } from '@/hooks/use-theme';

function openVerse(bookId: number, chapter: number, verse: number) {
  router.push(`/reader/${bookId}/${chapter}?v=${verse}`);
}

export default function NotesScreen() {
  const data = useData();
  const actions = useActions();
  const theme = useTheme();
  const [tab, setTab] = useState<'notes' | 'highlights'>('notes');
  // Two-tap delete: first tap arms (icon turns red), second within 3s deletes.
  const [confirmId, setConfirmId] = useState<string | null>(null);
  useEffect(() => {
    if (!confirmId) return;
    const t = setTimeout(() => setConfirmId(null), 3000);
    return () => clearTimeout(t);
  }, [confirmId]);

  const [filter, setFilter] = useState('');

  const highlights = Object.entries(data.highlights)
    .map(([key, h]) => ({ key, ref: parseRefKey(key), color: h.color, createdAt: h.createdAt }))
    .filter((e) => e.ref)
    .sort((a, b) => b.createdAt - a.createdAt);

  const f = filter.trim().toLowerCase();
  const matchRef = (bookId: number, chapter: number, verse: number) =>
    formatRef(bookId, chapter, verse).toLowerCase().includes(f);
  const visibleNotes = f
    ? data.notes.filter((n) => n.text.toLowerCase().includes(f) || matchRef(n.bookId, n.chapter, n.verse))
    : data.notes;
  const visibleHighlights = f ? highlights.filter((e) => e.ref && matchRef(e.ref.bookId, e.ref.chapter, e.ref.verse)) : highlights;

  return (
    <View style={[styles.flex, { backgroundColor: theme.background }]}>
      <SafeAreaView edges={['top']}>
        <View style={styles.topbar}>
          <IconButton icon={ChevronLeft} onPress={() => router.back()} accessibilityLabel="Back" />
          <ThemedText type="h2" style={{ flex: 1 }}>
            Notes & Highlights
          </ThemedText>
        </View>
        <View style={styles.segWrap}>
          <Segmented
            options={[
              { label: 'Notes', value: 'notes' },
              { label: 'Highlights', value: 'highlights' },
            ]}
            value={tab}
            onChange={setTab}
          />
          <TextField
            value={filter}
            onChangeText={setFilter}
            placeholder="Filter by words or reference…"
            autoCorrect={false}
          />
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {tab === 'notes' ? (
          data.notes.length === 0 ? (
            <EmptyState icon={StickyNote} title="No notes yet" subtitle="Select a verse in the reader and tap “Add note.”" />
          ) : visibleNotes.length === 0 ? (
            <ThemedText type="small" themeColor="textTertiary" style={styles.noMatch}>
              No notes match “{filter.trim()}”
            </ThemedText>
          ) : (
            visibleNotes.map((n) => (
              <Pressable
                key={n.id}
                onPress={() => openVerse(n.bookId, n.chapter, n.verse)}
                accessibilityLabel={`Open ${formatRef(n.bookId, n.chapter, n.verse)}`}
                style={({ pressed }) => [
                  styles.noteCard,
                  { backgroundColor: theme.card, borderColor: theme.border },
                  pressed && { opacity: 0.85 },
                ]}>
                <View style={styles.noteHead}>
                  <ThemedText type="caption" themeColor="accent">
                    {formatRef(n.bookId, n.chapter, n.verse)}
                  </ThemedText>
                  <Pressable
                    onPress={() => {
                      if (confirmId === n.id) {
                        actions.deleteNote(n.id);
                        setConfirmId(null);
                      } else {
                        setConfirmId(n.id);
                      }
                    }}
                    hitSlop={8}
                    accessibilityLabel={confirmId === n.id ? 'Tap again to delete note' : 'Delete note'}
                    style={styles.deleteTap}>
                    {confirmId === n.id ? (
                      <ThemedText type="caption" themeColor="danger">
                        Tap to confirm
                      </ThemedText>
                    ) : null}
                    <Trash2 size={16} color={confirmId === n.id ? theme.danger : theme.textTertiary} />
                  </Pressable>
                </View>
                <ThemedText type="body" style={{ marginTop: 4 }}>
                  {n.text}
                </ThemedText>
              </Pressable>
            ))
          )
        ) : highlights.length === 0 ? (
          <EmptyState icon={Highlighter} title="No highlights yet" subtitle="Select a verse in the reader and choose a highlight color." />
        ) : visibleHighlights.length === 0 ? (
          <ThemedText type="small" themeColor="textTertiary" style={styles.noMatch}>
            No highlights match “{filter.trim()}”
          </ThemedText>
        ) : (
          visibleHighlights.map((e) => (
            <Pressable
              key={e.key}
              onPress={() => e.ref && openVerse(e.ref.bookId, e.ref.chapter, e.ref.verse)}
              accessibilityLabel={e.ref ? `Open ${formatRef(e.ref.bookId, e.ref.chapter, e.ref.verse)}` : undefined}
              style={({ pressed }) => [styles.hlRow, { borderBottomColor: theme.border }, pressed && { opacity: 0.6 }]}>
              <View style={[styles.swatchDot, { backgroundColor: Highlights[e.color].dot }]} />
              <ThemedText type="body" style={{ flex: 1 }}>
                {e.ref ? formatRef(e.ref.bookId, e.ref.chapter, e.ref.verse) : ''}
              </ThemedText>
              <Pressable
                onPress={() => e.ref && actions.setHighlight(e.ref.bookId, e.ref.chapter, e.ref.verse, null)}
                hitSlop={8}
                accessibilityLabel="Remove highlight">
                <X size={16} color={theme.textTertiary} />
              </Pressable>
            </Pressable>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
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
  segWrap: { paddingHorizontal: Spacing.four, paddingBottom: Spacing.two, gap: Spacing.two, width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  noMatch: { textAlign: 'center', paddingTop: Spacing.six },
  content: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.eight,
    gap: Spacing.two,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  noteCard: { padding: Spacing.four, borderRadius: Radius.md, borderWidth: StyleSheet.hairlineWidth },
  noteHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  deleteTap: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  hlRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingVertical: Spacing.three, borderBottomWidth: StyleSheet.hairlineWidth },
  swatchDot: { width: 18, height: 18, borderRadius: Radius.pill },
});
