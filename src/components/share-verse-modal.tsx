/**
 * Full-screen preview of a shareable VerseCard with a Share action. On native it
 * captures the card to a PNG and opens the system share sheet; on web (or if
 * sharing/capture is unavailable) it falls back to sharing formatted text.
 */

import { Share2, X } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { Modal, Platform, Share, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { VerseCard } from '@/components/verse-card';
import { Button, IconButton } from '@/components/ui/primitives';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  visible: boolean;
  onClose: () => void;
  text: string;
  reference: string;
  translation: string;
};

export function ShareVerseModal({ visible, onClose, text, reference, translation }: Props) {
  const theme = useTheme();
  const cardRef = useRef<View>(null);
  const [busy, setBusy] = useState(false);

  const shareText = `“${text}”\n— ${reference} (${translation})\n\nshared from Selah`;

  const onShare = async () => {
    setBusy(true);
    try {
      if (Platform.OS !== 'web' && cardRef.current) {
        const [{ captureRef }, Sharing] = await Promise.all([
          import('react-native-view-shot'),
          import('expo-sharing'),
        ]);
        if (await Sharing.isAvailableAsync()) {
          const uri = await captureRef(cardRef, { format: 'png', quality: 1 });
          await Sharing.shareAsync(uri, {
            mimeType: 'image/png',
            UTI: 'public.png',
            dialogTitle: reference,
          });
          return;
        }
      }
      await Share.share({ message: shareText });
    } catch {
      // cancelled or unsupported — no-op
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={[styles.fill, { backgroundColor: theme.background + 'F7' }]}>
        <SafeAreaView style={styles.fill}>
          <View style={styles.top}>
            <IconButton icon={X} onPress={onClose} accessibilityLabel="Close" />
          </View>
          <View style={styles.center}>
            <VerseCard ref={cardRef} text={text} reference={reference} translation={translation} />
          </View>
          <View style={styles.actions}>
            <Button icon={Share2} title={busy ? 'Sharing…' : 'Share'} full disabled={busy} onPress={onShare} />
            <ThemedText type="caption" themeColor="textTertiary" style={styles.hint}>
              {Platform.OS === 'web' ? 'Shares as text on web' : 'Shares as an image'}
            </ThemedText>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  top: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: Spacing.three, paddingTop: Spacing.three },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.four },
  actions: { paddingHorizontal: Spacing.four, paddingBottom: Spacing.five, gap: Spacing.two, alignItems: 'center' },
  hint: { textAlign: 'center' },
});
