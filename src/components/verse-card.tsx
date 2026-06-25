/**
 * A shareable, beautifully-typeset verse card. Rendered on screen as a preview
 * and captured to a PNG for sharing (see share-verse-modal). Follows the active
 * palette so a shared card matches the reader's theme.
 */

import { forwardRef } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = { text: string; reference: string; translation: string };

export const VerseCard = forwardRef<View, Props>(function VerseCard(
  { text, reference, translation },
  ref,
) {
  const theme = useTheme();
  // Android view-shot needs collapsable=false; the prop warns on web, so gate it.
  const nativeProps = Platform.OS === 'web' ? {} : { collapsable: false };

  return (
    <View
      ref={ref}
      {...nativeProps}
      style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.body}>
        <ThemedText style={[styles.verse, { color: theme.text }]}>“{text}”</ThemedText>
        <View style={[styles.rule, { backgroundColor: theme.accent }]} />
        <ThemedText style={[styles.reference, { color: theme.accent }]}>{reference}</ThemedText>
      </View>
      <View style={styles.footer}>
        <ThemedText style={[styles.wordmark, { color: theme.textTertiary }]}>SELAH</ThemedText>
        <ThemedText style={[styles.translation, { color: theme.textTertiary }]}>{translation}</ThemedText>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    width: 340,
    minHeight: 460,
    padding: Spacing.six,
    borderRadius: Radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'space-between',
  },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  verse: {
    fontFamily: Fonts.serif,
    fontSize: 23,
    lineHeight: 34,
    fontWeight: '400',
    textAlign: 'center',
  },
  rule: { width: 32, height: 2, borderRadius: 1, marginTop: Spacing.five, marginBottom: Spacing.three },
  reference: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  wordmark: { fontSize: 12, fontWeight: '700', letterSpacing: 3 },
  translation: { fontSize: 12, fontWeight: '600', letterSpacing: 1 },
});
