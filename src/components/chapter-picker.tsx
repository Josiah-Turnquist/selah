import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Sheet } from '@/components/ui/sheet';
import { Radius, Spacing } from '@/constants/theme';
import type { Book } from '@/lib/bible/books';
import { useTheme } from '@/hooks/use-theme';

export function ChapterPicker({
  book,
  visible,
  onClose,
  onPick,
}: {
  book: Book | null;
  visible: boolean;
  onClose: () => void;
  onPick: (chapter: number) => void;
}) {
  const theme = useTheme();
  if (!book) return null;
  const chapters = Array.from({ length: book.chapters }, (_, i) => i + 1);
  return (
    <Sheet visible={visible} onClose={onClose} title={book.name}>
      <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
        <View style={styles.grid}>
          {chapters.map((c) => (
            <Pressable
              key={c}
              onPress={() => {
                onPick(c);
                onClose();
              }}
              style={[styles.cell, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText type="h3">{c}</ThemedText>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, paddingBottom: Spacing.two },
  cell: { width: 54, height: 50, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
});
