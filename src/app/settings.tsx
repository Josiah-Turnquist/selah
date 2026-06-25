import { router } from 'expo-router';
import { Check, ChevronRight, X } from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { TranslationSheet } from '@/components/translation-sheet';
import { TextField } from '@/components/ui/field';
import { Segmented } from '@/components/ui/segmented';
import { Button, Card, IconButton } from '@/components/ui/primitives';
import { Sheet } from '@/components/ui/sheet';
import { useToast } from '@/components/ui/toast';
import { DEFAULT_PALETTE, MaxContentWidth, PALETTES, PALETTE_META, Radius, Spacing } from '@/constants/theme';
import { translationName } from '@/lib/bible/translations';
import { cancelReminders, ensureNotificationPermission, formatHour, scheduleDailyReminder } from '@/lib/notifications';
import { useActions, useData } from '@/lib/store/store';
import { useColorSchemeEffective, useTheme } from '@/hooks/use-theme';

const round1 = (n: number) => Math.round(n * 10) / 10;

export default function Settings() {
  const data = useData();
  const actions = useActions();
  const theme = useTheme();
  const scheme = useColorSchemeEffective();
  const currentPalette = data.settings.theme ?? DEFAULT_PALETTE;
  const [showTranslation, setShowTranslation] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const scale = data.settings.readerFontScale;
  const toast = useToast();
  const reminderHour = data.settings.reminderHour;

  const setReminder = async (hour: number | null) => {
    if (hour == null) {
      await cancelReminders();
      actions.setReminderHour(null);
      return;
    }
    if (Platform.OS !== 'web') {
      const ok = await ensureNotificationPermission();
      if (!ok) {
        toast('Allow notifications to get reminders');
        return;
      }
    }
    await scheduleDailyReminder(hour);
    actions.setReminderHour(hour);
  };

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]}>
      <View style={styles.topbar}>
        <ThemedText type="h2" style={{ flex: 1 }}>
          Settings
        </ThemedText>
        <IconButton icon={X} onPress={() => router.back()} accessibilityLabel="Close" />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} automaticallyAdjustKeyboardInsets keyboardDismissMode="interactive">
        <Label>Your name</Label>
        <TextField value={data.settings.displayName} onChangeText={actions.setDisplayName} placeholder="Your name" />
        <ThemedText type="caption" themeColor="textTertiary" style={{ marginTop: 6 }}>
          Shown to friends on shared plans and lists.
        </ThemedText>

        <Label>Appearance</Label>
        <Segmented
          options={[
            { label: 'System', value: 'system' },
            { label: 'Light', value: 'light' },
            { label: 'Dark', value: 'dark' },
          ]}
          value={data.settings.appearance ?? 'system'}
          onChange={actions.setAppearance}
        />

        <Label>Theme</Label>
        <View style={styles.themeRow}>
          {PALETTE_META.map((p) => {
            const set = PALETTES[p.id][scheme];
            const selected = currentPalette === p.id;
            return (
              <Pressable
                key={p.id}
                onPress={() => actions.setPalette(p.id)}
                accessibilityLabel={`${p.name} theme`}
                style={({ pressed }) => [
                  styles.themeChip,
                  { borderColor: selected ? set.accent : theme.border, backgroundColor: theme.card },
                  pressed && { opacity: 0.85 },
                ]}>
                <View style={[styles.themeSwatch, { backgroundColor: set.background, borderColor: theme.border }]}>
                  <View style={[styles.swatchBar, { backgroundColor: set.backgroundElement }]} />
                  <View style={[styles.swatchDot, { backgroundColor: set.accent }]} />
                </View>
                <View style={styles.themeNameRow}>
                  <ThemedText type="caption" style={{ fontWeight: selected ? '700' : '400' }}>
                    {p.name}
                  </ThemedText>
                  {selected ? <Check size={13} color={set.accent} /> : null}
                </View>
              </Pressable>
            );
          })}
        </View>

        <Label>Translation</Label>
        <Card onPress={() => setShowTranslation(true)}>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <ThemedText type="h3">{data.settings.translation}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {translationName(data.settings.translation)}
              </ThemedText>
            </View>
            <ChevronRight size={20} color={theme.textSecondary} />
          </View>
        </Card>

        <Label>Reader text size</Label>
        <Card>
          <View style={styles.fontRow}>
            <Button variant="secondary" title="A−" onPress={() => actions.setFontScale(Math.max(0.85, round1(scale - 0.1)))} />
            <ThemedText type="h3">{Math.round(scale * 100)}%</ThemedText>
            <Button variant="secondary" title="A+" onPress={() => actions.setFontScale(Math.min(1.6, round1(scale + 0.1)))} />
          </View>
          <ThemedText type="bodySerif" style={{ fontSize: 18 * scale, lineHeight: 28 * scale, marginTop: Spacing.three }}>
            “Your word is a lamp to my feet, and a light for my path.” — Psalm 119:105
          </ThemedText>
        </Card>

        <Label>Daily reminder</Label>
        <Card>
          <View style={styles.reminderRow}>
            <View style={{ flex: 1 }}>
              <ThemedText type="h3">Remind me to read</ThemedText>
              <ThemedText type="caption" themeColor="textSecondary">
                A gentle nudge to open the Word each day
              </ThemedText>
            </View>
            <Switch
              value={reminderHour != null}
              onValueChange={(on) => setReminder(on ? (reminderHour ?? 8) : null)}
              trackColor={{ true: theme.accent, false: theme.backgroundSelected }}
              thumbColor={theme.card}
            />
          </View>
          {reminderHour != null ? (
            <View style={[styles.fontRow, { marginTop: Spacing.four }]}>
              <Button variant="secondary" title="−" onPress={() => setReminder((reminderHour + 23) % 24)} />
              <ThemedText type="h3">{formatHour(reminderHour)}</ThemedText>
              <Button variant="secondary" title="+" onPress={() => setReminder((reminderHour + 1) % 24)} />
            </View>
          ) : null}
        </Card>

        <Label>About</Label>
        <Card>
          <Row k="App" v="Selah" />
          <Row k="Version" v="1.0.0 · MVP" />
          <Row k="Scripture" v="Bolls.life API" />
          <ThemedText type="caption" themeColor="textTertiary" style={{ marginTop: Spacing.two }}>
            Defaults to public-domain translations; other versions are provided by their publishers via Bolls.
          </ThemedText>
        </Card>

        <Pressable onPress={() => setConfirm(true)} style={styles.reset}>
          <ThemedText type="h3" themeColor="danger">
            Reset all app data
          </ThemedText>
        </Pressable>
      </ScrollView>

      <TranslationSheet
        visible={showTranslation}
        onClose={() => setShowTranslation(false)}
        value={data.settings.translation}
        onSelect={actions.setTranslation}
      />

      <Sheet visible={confirm} onClose={() => setConfirm(false)} title="Reset everything?">
        <ThemedText type="small" themeColor="textSecondary">
          This clears your highlights, notes, plans, prayer lists, and decks, and restores the sample data.
        </ThemedText>
        <View style={{ flexDirection: 'row', gap: Spacing.two }}>
          <Button variant="secondary" title="Cancel" style={{ flex: 1 }} onPress={() => setConfirm(false)} />
          <Button
            variant="danger"
            title="Reset"
            style={{ flex: 1 }}
            onPress={() => {
              actions.resetEverything();
              setConfirm(false);
              router.back();
            }}
          />
        </View>
      </Sheet>
    </SafeAreaView>
  );
}

function Label({ children }: { children: ReactNode }) {
  return (
    <ThemedText type="label" themeColor="textTertiary" style={styles.label}>
      {children}
    </ThemedText>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <View style={styles.kv}>
      <ThemedText type="small" themeColor="textSecondary">
        {k}
      </ThemedText>
      <ThemedText type="small">{v}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  content: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.eight,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  label: { marginTop: Spacing.five, marginBottom: Spacing.two },
  themeRow: { flexDirection: 'row', gap: Spacing.two },
  themeChip: { flex: 1, borderWidth: 1, borderRadius: Radius.md, padding: Spacing.two, gap: 6, alignItems: 'center' },
  themeSwatch: {
    width: '100%',
    height: 44,
    borderRadius: Radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 6,
    justifyContent: 'space-between',
  },
  swatchBar: { height: 6, width: '70%', borderRadius: 3 },
  swatchDot: { width: 14, height: 14, borderRadius: 7 },
  themeNameRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  row: { flexDirection: 'row', alignItems: 'center' },
  fontRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  reminderRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  kv: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  reset: { paddingVertical: Spacing.three, alignItems: 'center', marginTop: Spacing.six },
});
