import * as Clipboard from 'expo-clipboard';
import { router, useLocalSearchParams } from 'expo-router';
import { Check, ChevronLeft, Flame, Plus, Settings2, Share2, Sparkles, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { NotificationWarning } from '@/components/notification-warning';
import { cancelListReminder, ensureNotificationPermission, formatHour, scheduleListReminder } from '@/lib/notifications';

import { ThemedText } from '@/components/themed-text';
import { TextField } from '@/components/ui/field';
import { Button, IconButton, Pill } from '@/components/ui/primitives';
import { ConfirmButton } from '@/components/ui/confirm-button';
import { Segmented } from '@/components/ui/segmented';
import { Sheet } from '@/components/ui/sheet';
import { useToast } from '@/components/ui/toast';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { currentStreak, cycleLabel, isPrayedThisCycle } from '@/lib/cycle';
import { shareLink } from '@/lib/share';
import { useActions, useData } from '@/lib/store/store';
import { useTheme } from '@/hooks/use-theme';
import { tapSuccess } from '@/lib/util/haptics';

export default function PrayerDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const data = useData();
  const actions = useActions();
  const theme = useTheme();
  const toast = useToast();

  const [adding, setAdding] = useState(false);
  const [newText, setNewText] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [editNote, setEditNote] = useState('');
  const [showShare, setShowShare] = useState(false);
  const [manage, setManage] = useState(false);
  const [renameVal, setRenameVal] = useState('');

  const list = data.prayerLists.find((l) => l.id === id);
  if (!list) {
    return (
      <SafeAreaView style={[styles.flex, styles.center, { backgroundColor: theme.background }]}>
        <ThemedText type="h3">List not found</ThemedText>
        <Button title="Go back" style={{ marginTop: Spacing.three }} onPress={() => router.back()} />
      </SafeAreaView>
    );
  }

  const active = list.items.filter((it) => !it.answered);
  const prayedCount = active.filter((it) => isPrayedThisCycle(it.prayed, list.cycle)).length;

  const setReminder = async (hour: number | null) => {
    if (hour == null) {
      await cancelListReminder(list.id);
      actions.setListReminder(list.id, null);
      return;
    }
    const ok = await ensureNotificationPermission();
    if (!ok) {
      toast('Allow notifications to get reminders');
      return;
    }
    await scheduleListReminder(list.id, list.title, hour, active.map((it) => it.text));
    actions.setListReminder(list.id, hour);
  };

  const code = shareLink({
    t: 'prayer',
    from: data.settings.displayName,
    title: list.title,
    cycle: list.cycle,
    items: list.items.map((i) => ({ text: i.text, note: i.note })),
  });

  const addItem = () => {
    if (newText.trim()) actions.addPrayerItem(list.id, newText);
    setNewText('');
    setAdding(false);
  };
  const saveEdit = () => {
    if (editing) actions.updatePrayerItem(list.id, editing, { text: editText, note: editNote });
    setEditing(null);
  };

  return (
    <View style={[styles.flex, { backgroundColor: theme.background }]}>
      <SafeAreaView edges={['top']}>
        <View style={styles.topbar}>
          <IconButton icon={ChevronLeft} onPress={() => router.back()} accessibilityLabel="Back" />
          <ThemedText type="h3" numberOfLines={1} style={{ flex: 1 }}>
            {list.title}
          </ThemedText>
          <IconButton icon={Share2} onPress={() => setShowShare(true)} accessibilityLabel="Share list" />
          <IconButton
            icon={Settings2}
            accessibilityLabel="List settings"
            onPress={() => {
              setRenameVal(list.title);
              setManage(true);
            }}
          />
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} automaticallyAdjustKeyboardInsets keyboardDismissMode="interactive">
        <View style={styles.statsRow}>
          <Pill tone="ember" label={cycleLabel(list.cycle)} />
          <ThemedText type="small" themeColor="textSecondary">
            {prayedCount}/{active.length} prayed this {list.cycle === 'daily' ? 'day' : 'week'}
          </ThemedText>
        </View>

        <Segmented
          options={[
            { label: 'Resets daily', value: 'daily' },
            { label: 'Resets weekly', value: 'weekly' },
          ]}
          value={list.cycle}
          onChange={(c) => actions.updatePrayerList(list.id, { cycle: c })}
        />

        <View style={styles.items}>
          {active.map((it) => {
            const prayed = isPrayedThisCycle(it.prayed, list.cycle);
            const streak = currentStreak(it.prayed, list.cycle);
            return (
              <View key={it.id} style={[styles.item, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Pressable
                  onPress={() => {
                    const willPray = !prayed;
                    actions.togglePrayed(list.id, it.id);
                    if (willPray) {
                      tapSuccess();
                      if (active.length > 1 && prayedCount + 1 === active.length) {
                        toast('Prayed through your list');
                      }
                    }
                  }}
                  hitSlop={6}
                  accessibilityLabel={prayed ? `Mark “${it.text}” not prayed` : `Mark “${it.text}” prayed`}
                  style={({ pressed }) => [
                    styles.check,
                    { borderColor: prayed ? theme.ember : theme.border, backgroundColor: prayed ? theme.ember : 'transparent' },
                    pressed && { opacity: 0.7 },
                  ]}>
                  {prayed ? <Check size={16} color={theme.onAccent} strokeWidth={3} /> : null}
                </Pressable>
                <Pressable
                  onPress={() => {
                    setEditing(it.id);
                    setEditText(it.text);
                    setEditNote(it.note ?? '');
                  }}
                  accessibilityLabel={`Edit ${it.text}`}
                  style={({ pressed }) => [{ flex: 1 }, pressed && { opacity: 0.6 }]}>
                  <ThemedText type="body" style={prayed ? { color: theme.textSecondary } : undefined}>
                    {it.text}
                  </ThemedText>
                  {it.note ? (
                    <ThemedText type="caption" themeColor="textTertiary">
                      {it.note}
                    </ThemedText>
                  ) : null}
                </Pressable>
                {streak > 1 ? (
                  <View style={styles.streak}>
                    <Flame size={14} color={theme.ember} />
                    <ThemedText type="caption" themeColor="ember">
                      {streak}
                    </ThemedText>
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>

        {adding ? (
          <View style={{ marginTop: Spacing.three, gap: Spacing.two }}>
            <TextField
              autoFocus
              value={newText}
              onChangeText={setNewText}
              placeholder="Add a prayer…"
              returnKeyType="done"
              onSubmitEditing={addItem}
            />
            <View style={{ flexDirection: 'row', gap: Spacing.two }}>
              <Button
                variant="secondary"
                title="Cancel"
                style={{ flex: 1 }}
                onPress={() => {
                  setAdding(false);
                  setNewText('');
                }}
              />
              <Button title="Add" style={{ flex: 1 }} onPress={addItem} />
            </View>
          </View>
        ) : (
          <Button
            variant="secondary"
            icon={Plus}
            title="Add prayer"
            style={{ marginTop: Spacing.three }}
            onPress={() => setAdding(true)}
          />
        )}
      </ScrollView>

      <Sheet visible={!!editing} onClose={() => setEditing(null)} title="Edit prayer">
        <TextField label="Prayer" value={editText} onChangeText={setEditText} />
        <TextField label="Note (optional)" value={editNote} onChangeText={setEditNote} multiline />
        <View style={{ flexDirection: 'row', gap: Spacing.two }}>
          <ConfirmButton
            variant="secondary"
            icon={Trash2}
            title="Delete"
            onConfirm={() => {
              if (editing) actions.deletePrayerItem(list.id, editing);
              setEditing(null);
            }}
          />
          <Button title="Save" style={{ flex: 1 }} onPress={saveEdit} />
        </View>
        <Button
          variant="ghost"
          icon={Sparkles}
          title="Mark as answered"
          onPress={() => {
            if (editing) {
              actions.setPrayerAnswered(list.id, editing, true);
              tapSuccess();
              toast('Moved to Answered');
            }
            setEditing(null);
          }}
        />
      </Sheet>

      <Sheet visible={manage} onClose={() => setManage(false)} title="List settings">
        <TextField label="Title" value={renameVal} onChangeText={setRenameVal} />
        <Button
          title="Save"
          onPress={() => {
            actions.updatePrayerList(list.id, { title: renameVal.trim() || list.title });
            setManage(false);
          }}
        />

        <View style={styles.reminderBlock}>
          <View style={styles.reminderRow}>
            <View style={{ flex: 1 }}>
              <ThemedText type="h3">Daily reminder</ThemedText>
              <ThemedText type="caption" themeColor="textSecondary">
                A nudge that quotes one of these prayers
              </ThemedText>
            </View>
            <Switch
              value={list.reminderHour != null}
              onValueChange={(on) => setReminder(on ? (list.reminderHour ?? 8) : null)}
              trackColor={{ true: theme.ember, false: theme.backgroundSelected }}
              thumbColor={theme.card}
            />
          </View>
          {list.reminderHour != null ? (
            <View style={styles.hourRow}>
              <Button variant="secondary" title="−" onPress={() => setReminder((list.reminderHour! + 23) % 24)} />
              <ThemedText type="h3">{formatHour(list.reminderHour)}</ThemedText>
              <Button variant="secondary" title="+" onPress={() => setReminder((list.reminderHour! + 1) % 24)} />
            </View>
          ) : null}
          <NotificationWarning active={list.reminderHour != null} />
        </View>

        <ConfirmButton
          variant="ghost"
          icon={Trash2}
          title="Delete list"
          confirmTitle="Tap again to delete"
          onConfirm={() => {
            actions.deletePrayerList(list.id);
            router.back();
          }}
        />
      </Sheet>

      <Sheet visible={showShare} onClose={() => setShowShare(false)} title="Share this list">
        <ThemedText type="small" themeColor="textSecondary">
          Share these prayers with someone — they’ll get their own copy to pray through on their own cycle.
        </ThemedText>
        <View style={[styles.codeBox, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
          <ThemedText type="code" numberOfLines={3}>
            {code}
          </ThemedText>
        </View>
        <View style={{ flexDirection: 'row', gap: Spacing.two }}>
          <Button
            variant="secondary"
            title="Copy"
            style={{ flex: 1 }}
            onPress={() => {
              Clipboard.setStringAsync(code);
              toast('List code copied');
            }}
          />
          <Button
            title="Share"
            style={{ flex: 1 }}
            onPress={async () => {
              try {
                await Share.share({ message: `Pray with me — “${list.title}” on Selah: ${code}` });
              } catch {
                // cancelled / unsupported
              }
            }}
          />
        </View>
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  content: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.eight,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  statsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.three },
  items: { marginTop: Spacing.four, gap: Spacing.two },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  check: { width: 26, height: 26, borderRadius: Radius.pill, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  streak: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  reminderBlock: { gap: Spacing.three, marginTop: Spacing.two, marginBottom: Spacing.two },
  reminderRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  hourRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  codeBox: { padding: Spacing.three, borderRadius: Radius.md, borderWidth: StyleSheet.hairlineWidth },
});
