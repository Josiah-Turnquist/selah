import { router } from 'expo-router';
import { ChevronLeft, Highlighter, StickyNote, Trash2, X } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
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

  const highlights = Object.entries(data.highlights)
    .map(([key, h]) => ({ key, ref: parseRefKey(key), color: h.color, createdAt: h.createdAt }))
    .filter((e) => e.ref)
    .sort((a, b) => b.createdAt - a.createdAt);

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
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {tab === 'notes' ? (
          data.notes.length === 0 ? (
            <EmptyState icon={StickyNote} title="No notes yet" subtitle="Select a verse in the reader and tap “Add note.”" />
          ) : (
            data.notes.map((n) => (
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
                  <Pressable onPress={() => actions.deleteNote(n.id)} hitSlop={8} accessibilityLabel="Delete note">
                    <Trash2 size={16} color={theme.textTertiary} />
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
        ) : (
          highlights.map((e) => (
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
  segWrap: { paddingHorizontal: Spacing.four, paddingBottom: Spacing.two, width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
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
  hlRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingVertical: Spacing.three, borderBottomWidth: StyleSheet.hairlineWidth },
  swatchDot: { width: 18, height: 18, borderRadius: Radius.pill },
});
