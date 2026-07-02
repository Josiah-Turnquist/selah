/**
 * Full-text Bible search (Bolls `find` API) in the user's current translation.
 * Reached from the Read tab header; tapping a result opens the reader at that
 * verse. Query terms are bolded inline in each result.
 */

import { router } from 'expo-router';
import { ChevronLeft, Search } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { TextField } from '@/components/ui/field';
import { EmptyState, IconButton } from '@/components/ui/primitives';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { searchBible, type SearchHit } from '@/lib/bible/bolls';
import { formatRef } from '@/lib/bible/refs';
import { translationName } from '@/lib/bible/translations';
import { useData } from '@/lib/store/store';
import { useTheme } from '@/hooks/use-theme';

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Bold every occurrence of the query words within a result's text. */
function Highlighted({ text, query }: { text: string; query: string }) {
  const words = query.trim().split(/\s+/).filter((w) => w.length > 1).map(escapeRegex);
  if (!words.length) return <ThemedText type="body">{text}</ThemedText>;
  const parts = text.split(new RegExp(`(${words.join('|')})`, 'ig'));
  const probe = new RegExp(`^(?:${words.join('|')})$`, 'i');
  return (
    <ThemedText type="body">
      {parts.map((part, i) =>
        probe.test(part) ? (
          <ThemedText key={i} type="body" style={{ fontWeight: '700' }}>
            {part}
          </ThemedText>
        ) : (
          part
        ),
      )}
    </ThemedText>
  );
}

export default function SearchScreen() {
  const data = useData();
  const theme = useTheme();
  const translation = data.settings.translation;

  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false); // a query has completed at least once
  const seq = useRef(0);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setHits([]);
      setSearching(false);
      setSearched(false);
      return;
    }
    setSearching(true);
    const mine = ++seq.current;
    const t = setTimeout(() => {
      searchBible(translation, q).then((results) => {
        if (seq.current !== mine) return; // a newer query superseded this one
        setHits(results);
        setSearching(false);
        setSearched(true);
      });
    }, 350);
    return () => clearTimeout(t);
  }, [query, translation]);

  return (
    <View style={[styles.flex, { backgroundColor: theme.background }]}>
      <SafeAreaView edges={['top']}>
        <View style={styles.topbar}>
          <IconButton icon={ChevronLeft} onPress={() => router.back()} accessibilityLabel="Back" />
          <ThemedText type="h2" style={{ flex: 1 }}>
            Search
          </ThemedText>
          <ThemedText type="caption" themeColor="textTertiary">
            {translation}
          </ThemedText>
        </View>
        <View style={styles.fieldWrap}>
          <TextField
            value={query}
            onChangeText={setQuery}
            placeholder={`Search ${translationName(translation)}…`}
            autoFocus
            autoCorrect={false}
            returnKeyType="search"
          />
        </View>
      </SafeAreaView>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}>
        {searching ? (
          <View style={styles.centered}>
            <ActivityIndicator color={theme.accent} />
          </View>
        ) : !searched ? (
          <EmptyState
            icon={Search}
            title="Find a verse"
            subtitle="Try a phrase you remember — “still waters,” “do not fear,” “love is patient.”"
          />
        ) : hits.length === 0 ? (
          <EmptyState
            icon={Search}
            title="No verses found"
            subtitle={`Nothing in the ${translationName(translation)} matches “${query.trim()}.”`}
          />
        ) : (
          <>
            <ThemedText type="caption" themeColor="textTertiary" style={{ marginBottom: Spacing.two }}>
              {hits.length === 60 ? '60+' : hits.length} result{hits.length === 1 ? '' : 's'}
            </ThemedText>
            {hits.map((h) => (
              <Pressable
                key={`${h.bookId}-${h.chapter}-${h.verse}`}
                onPress={() => router.push(`/reader/${h.bookId}/${h.chapter}?v=${h.verse}`)}
                accessibilityLabel={`Open ${formatRef(h.bookId, h.chapter, h.verse)}`}
                style={({ pressed }) => [
                  styles.hit,
                  { backgroundColor: theme.card, borderColor: theme.border },
                  pressed && { opacity: 0.85 },
                ]}>
                <ThemedText type="caption" themeColor="accent" style={{ marginBottom: 2 }}>
                  {formatRef(h.bookId, h.chapter, h.verse)}
                </ThemedText>
                <Highlighted text={h.text} query={query} />
              </Pressable>
            ))}
          </>
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
  fieldWrap: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.two,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  content: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.eight,
    gap: Spacing.two,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  centered: { paddingTop: Spacing.eight, alignItems: 'center' },
  hit: { padding: Spacing.four, borderRadius: Radius.md, borderWidth: StyleSheet.hairlineWidth },
});
