import { Check } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Sheet } from '@/components/ui/sheet';
import { Spacing } from '@/constants/theme';
import { TRANSLATIONS } from '@/lib/bible/translations';
import { useTheme } from '@/hooks/use-theme';

export function TranslationSheet({
  visible,
  onClose,
  value,
  onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  value: string;
  onSelect: (short: string) => void;
}) {
  const theme = useTheme();
  return (
    <Sheet visible={visible} onClose={onClose} title="Translation">
      <ScrollView style={{ maxHeight: 440 }} showsVerticalScrollIndicator={false}>
        {TRANSLATIONS.map((t) => {
          const active = t.short === value;
          return (
            <Pressable
              key={t.short}
              onPress={() => {
                onSelect(t.short);
                onClose();
              }}
              style={styles.row}>
              <View style={styles.short}>
                <ThemedText type="h3" style={{ color: active ? theme.accent : theme.text }}>
                  {t.short}
                </ThemedText>
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText type="small" numberOfLines={1}>
                  {t.name}
                </ThemedText>
                {t.publicDomain ? (
                  <ThemedText type="caption" themeColor="textTertiary">
                    Public domain
                  </ThemedText>
                ) : null}
              </View>
              {active ? <Check size={20} color={theme.accent} /> : null}
            </Pressable>
          );
        })}
      </ScrollView>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingVertical: Spacing.three },
  short: { width: 56 },
});
