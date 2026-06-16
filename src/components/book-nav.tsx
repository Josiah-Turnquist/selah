import { ChevronLeft } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Sheet } from '@/components/ui/sheet';
import { Radius, Spacing } from '@/constants/theme';
import { BOOKS, type Book } from '@/lib/bible/books';
import { useTheme } from '@/hooks/use-theme';

/** Full book → chapter navigator used from the reader header. */
export function BookNav({
  visible,
  onClose,
  onPick,
}: {
  visible: boolean;
  onClose: () => void;
  onPick: (bookId: number, chapter: number) => void;
}) {
  const theme = useTheme();
  const [book, setBook] = useState<Book | null>(null);

  const close = () => {
    setBook(null);
    onClose();
  };

  return (
    <Sheet visible={visible} onClose={close} title={book ? book.name : 'Jump to'}>
      {book ? (
        <>
          <Pressable onPress={() => setBook(null)} style={styles.back} hitSlop={6}>
            <ChevronLeft size={16} color={theme.accent} />
            <ThemedText type="small" themeColor="accent">
              All books
            </ThemedText>
          </Pressable>
          <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
            <View style={styles.grid}>
              {Array.from({ length: book.chapters }, (_, i) => i + 1).map((c) => (
                <Pressable
                  key={c}
                  onPress={() => {
                    onPick(book.id, c);
                    close();
                  }}
                  style={({ pressed }) => [
                    styles.cell,
                    { backgroundColor: theme.backgroundElement },
                    pressed && { opacity: 0.6 },
                  ]}>
                  <ThemedText type="h3">{c}</ThemedText>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </>
      ) : (
        <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
          <Section label="Old Testament" books={BOOKS.filter((b) => b.testament === 'OT')} onPick={setBook} />
          <Section label="New Testament" books={BOOKS.filter((b) => b.testament === 'NT')} onPick={setBook} />
        </ScrollView>
      )}
    </Sheet>
  );
}

function Section({ label, books, onPick }: { label: string; books: Book[]; onPick: (b: Book) => void }) {
  const theme = useTheme();
  return (
    <>
      <ThemedText type="label" themeColor="textTertiary" style={styles.heading}>
        {label}
      </ThemedText>
      <View style={styles.chips}>
        {books.map((b) => (
          <Pressable
            key={b.id}
            onPress={() => onPick(b)}
            style={({ pressed }) => [
              styles.chip,
              { backgroundColor: theme.backgroundElement },
              pressed && { opacity: 0.6 },
            ]}>
            <ThemedText type="small">{b.name}</ThemedText>
          </Pressable>
        ))}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  back: { flexDirection: 'row', alignItems: 'center', gap: 2, marginBottom: Spacing.two, alignSelf: 'flex-start' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, paddingBottom: Spacing.two },
  cell: { width: 54, height: 50, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  heading: { marginTop: Spacing.two, marginBottom: Spacing.two },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, marginBottom: Spacing.two },
  chip: { paddingHorizontal: Spacing.three, height: 38, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
});
