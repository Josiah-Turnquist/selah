import { router } from 'expo-router';
import { Check, ChevronRight, X } from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import * as Clipboard from 'expo-clipboard';

import { NotificationWarning } from '@/components/notification-warning';
import { OfflineDownload } from '@/components/offline-download';
import { ThemedText } from '@/components/themed-text';
import { TranslationSheet } from '@/components/translation-sheet';
import {
  apiConfigured,
  createAccount,
  fetchBackup,
  parseRecoveryCode,
  recoveryCode,
  uploadBackup,
} from '@/lib/api/client';
import { localDayKey } from '@/lib/util/date';
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
  const account = data.account ?? null;

  const [showRestore, setShowRestore] = useState(false);
  const [restoreCode, setRestoreCode] = useState('');
  const [busyRestore, setBusyRestore] = useState(false);
  const [found, setFound] = useState<{ createdAt: string; data: unknown } | null>(null);

  const backupNow = async () => {
    try {
      let a = account;
      if (!a) {
        a = await createAccount(data.settings.displayName || 'Friend');
        actions.setAccount(a);
      }
      await uploadBackup(a, data);
      actions.setAccount({ ...a, lastBackupAt: localDayKey() });
      toast('Backed up');
    } catch {
      toast('Couldn’t back up — try again later');
    }
  };

  const copyRecovery = () => {
    if (!account) {
      toast('Connecting — try again in a moment');
      return;
    }
    Clipboard.setStringAsync(recoveryCode(account));
    toast('Recovery code copied — keep it safe');
  };

  const findBackup = async () => {
    const creds = parseRecoveryCode(restoreCode);
    if (!creds) {
      toast('That doesn’t look like a recovery code');
      return;
    }
    setBusyRestore(true);
    try {
      const backup = await fetchBackup(creds);
      if (!backup) toast('No backup found for that code');
      else setFound(backup);
    } catch {
      toast('Couldn’t reach the backup — check the code');
    } finally {
      setBusyRestore(false);
    }
  };

  const doRestore = () => {
    const creds = parseRecoveryCode(restoreCode);
    if (!creds || !found) return;
    const backedUp = (found.data as any)?.account;
    actions.restoreFromBackup(found.data, {
      userId: creds.userId,
      secret: creds.secret,
      friendCode: backedUp?.friendCode ?? '',
      lastBackupAt: backedUp?.lastBackupAt,
    });
    setShowRestore(false);
    setFound(null);
    setRestoreCode('');
    toast('Restored from backup');
  };

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

        <Label>Offline</Label>
        <OfflineDownload />

        <Label>Reader text size</Label>
        <Card>
          <View style={styles.fontRow}>
            <Button variant="secondary" title="A−" onPress={() => actions.setFontScale(Math.max(0.85, round1(scale - 0.1)))} />
            <ThemedText type="h3">{Math.round(scale * 100)}%</ThemedText>
            <Button variant="secondary" title="A+" onPress={() => actions.setFontScale(Math.min(1.6, round1(scale + 0.1)))} />
          </View>
          <ThemedText
            type="bodySerif"
            style={{ fontSize: 18 * scale, lineHeight: 28 * scale, marginTop: Spacing.three, fontWeight: data.settings.readerWeight }}>
            “Your word is a lamp to my feet, and a light for my path.” — Psalm 119:105
          </ThemedText>
        </Card>

        <Label>Reader weight</Label>
        <Segmented
          options={[
            { label: 'Regular', value: '400' },
            { label: 'Medium', value: '500' },
            { label: 'Semibold', value: '600' },
            { label: 'Bold', value: '700' },
          ]}
          value={data.settings.readerWeight}
          onChange={actions.setReaderWeight}
        />

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
          <NotificationWarning active={reminderHour != null} />
        </Card>

        {apiConfigured() ? (
          <>
            <Label>Backup</Label>
            <Card>
              <Row k="Weekly backup" v={account?.lastBackupAt ? `Last: ${account.lastBackupAt}` : 'Not yet'} />
              {account ? <Row k="Friend code" v={account.friendCode} /> : null}
              <View style={{ flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.three }}>
                <Button size="sm" variant="secondary" title="Back up now" style={{ flex: 1 }} onPress={backupNow} />
                <Button size="sm" variant="secondary" title="Copy recovery code" style={{ flex: 1 }} onPress={copyRecovery} />
              </View>
              <ThemedText type="caption" themeColor="textTertiary" style={{ marginTop: Spacing.two }}>
                Your data backs up privately once a week. Save the recovery code somewhere safe — it restores
                everything on a new phone.
              </ThemedText>
            </Card>
            <Pressable onPress={() => setShowRestore(true)} style={styles.restoreLink}>
              <ThemedText type="small" themeColor="accent">
                Restore from a recovery code
              </ThemedText>
            </Pressable>
          </>
        ) : null}

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

      <Sheet
        visible={showRestore}
        onClose={() => {
          setShowRestore(false);
          setFound(null);
        }}
        title="Restore from backup">
        {found ? (
          <>
            <ThemedText type="small" themeColor="textSecondary">
              Found a backup from {new Date(found.createdAt).toLocaleDateString()}. Restoring replaces everything
              currently on this device.
            </ThemedText>
            <View style={{ flexDirection: 'row', gap: Spacing.two }}>
              <Button variant="secondary" title="Cancel" style={{ flex: 1 }} onPress={() => setFound(null)} />
              <Button variant="danger" title="Replace & restore" style={{ flex: 1 }} onPress={doRestore} />
            </View>
          </>
        ) : (
          <>
            <ThemedText type="small" themeColor="textSecondary">
              Paste the recovery code from your old phone to bring back its latest weekly backup.
            </ThemedText>
            <TextField
              label="Recovery code"
              value={restoreCode}
              onChangeText={setRestoreCode}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="xxxxxxxx-….yyyyyyyy"
            />
            <Button title={busyRestore ? 'Looking…' : 'Find backup'} disabled={!restoreCode.trim() || busyRestore} onPress={findBackup} />
          </>
        )}
      </Sheet>

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
  restoreLink: { paddingVertical: Spacing.two, alignItems: 'center', marginTop: Spacing.two },
  reset: { paddingVertical: Spacing.three, alignItems: 'center', marginTop: Spacing.six },
});
