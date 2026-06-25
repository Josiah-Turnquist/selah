import { Check } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Sheet } from '@/components/ui/sheet';
import { Radius, Spacing } from '@/constants/theme';
import { TRANSLATIONS } from '@/lib/bible/translations';
import { useTheme } from '@/hooks/use-theme';

export function TranslationSheet({
  visible,
  onClose,
  value,
  onSelect,
  compareValue,
  onSelectCompare,
}: {
  visible: boolean;
  onClose: () => void;
  value: string;
  onSelect: (short: string) => void;
  /** When provided, a "Compare with" row is shown for picking a second translation. */
  compareValue?: string | null;
  onSelectCompare?: (short: string | null) => void;
}) {
  const theme = useTheme();
  return (
    <Sheet visible={visible} onClose={onClose} title="Translation">
      <ScrollView style={{ maxHeight: onSelectCompare ? 360 : 440 }} showsVerticalScrollIndicator={false}>
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

      {onSelectCompare ? (
        <View style={[styles.compareSection, { borderTopColor: theme.border }]}>
          <ThemedText type="label" themeColor="textTertiary" style={{ marginBottom: Spacing.two }}>
            Compare with
          </ThemedText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            <CompareChip label="Off" active={!compareValue} onPress={() => onSelectCompare(null)} />
            {TRANSLATIONS.filter((t) => t.short !== value).map((t) => (
              <CompareChip
                key={t.short}
                label={t.short}
                active={compareValue === t.short}
                onPress={() => onSelectCompare(t.short)}
              />
            ))}
          </ScrollView>
        </View>
      ) : null}
    </Sheet>
  );
}

function CompareChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={`Compare with ${label}`}
      style={({ pressed }) => [
        styles.chip,
        { backgroundColor: active ? theme.accent : theme.backgroundElement },
        pressed && { opacity: 0.7 },
      ]}>
      <ThemedText type="small" style={{ color: active ? theme.onAccent : theme.text, fontWeight: '600' }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingVertical: Spacing.three },
  short: { width: 56 },
  compareSection: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: Spacing.three, marginTop: Spacing.two },
  chips: { gap: Spacing.two, paddingRight: Spacing.four },
  chip: { paddingHorizontal: Spacing.three, height: 36, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
});
