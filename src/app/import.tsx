import { router, useLocalSearchParams } from 'expo-router';
import { CalendarCheck, HeartHandshake, X } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { TextField } from '@/components/ui/field';
import { Button, Card, IconButton } from '@/components/ui/primitives';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { templateById } from '@/lib/plans/templates';
import { decodeShare } from '@/lib/share';
import type { PrayerList } from '@/lib/store/types';
import { useActions } from '@/lib/store/store';
import { useTheme } from '@/hooks/use-theme';

export default function ImportScreen() {
  const params = useLocalSearchParams<{ code?: string }>();
  const actions = useActions();
  const theme = useTheme();
  const [code, setCode] = useState(params.code ?? '');

  const payload = useMemo(() => (code.trim() ? decodeShare(code) : null), [code]);

  const doImport = () => {
    if (!payload) return;
    if (payload.t === 'plan') {
      const tpl = templateById(payload.templateId);
      if (!tpl) return;
      router.replace(`/plan/${actions.startPlan(tpl)}`);
    } else {
      const list: PrayerList = {
        id: '',
        title: payload.title,
        cycle: payload.cycle,
        createdAt: Date.now(),
        items: payload.items.map((it) => ({ id: '', text: it.text, note: it.note, createdAt: Date.now(), prayed: [] })),
      };
      router.replace(`/prayer/${actions.importPrayerList(list, payload.from)}`);
    }
  };

  const invalid = code.trim().length > 0 && !payload;

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]}>
      <View style={styles.topbar}>
        <ThemedText type="h2" style={{ flex: 1 }}>
          Import
        </ThemedText>
        <IconButton icon={X} onPress={() => router.back()} accessibilityLabel="Close" />
      </View>
      <View style={styles.body}>
        <ThemedText type="small" themeColor="textSecondary">
          Paste a Selah share code or link to add a friend’s reading plan or prayer list.
        </ThemedText>
        <TextField
          label="Code or link"
          value={code}
          onChangeText={setCode}
          placeholder="selah://import/…"
          multiline
          autoCapitalize="none"
          autoCorrect={false}
          style={{ marginTop: Spacing.three }}
        />

        {invalid ? (
          <ThemedText type="small" themeColor="danger" style={{ marginTop: Spacing.three }}>
            That code isn’t valid. Make sure you copied the whole thing.
          </ThemedText>
        ) : null}

        {payload ? (
          <Card style={{ marginTop: Spacing.four }}>
            <View style={styles.previewRow}>
              <View style={[styles.icon, { backgroundColor: theme.accentSoft }]}>
                {payload.t === 'plan' ? (
                  <CalendarCheck size={22} color={theme.accent} />
                ) : (
                  <HeartHandshake size={22} color={theme.accent} />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText type="h3">{payload.title}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {payload.t === 'plan' ? 'Reading plan' : `Prayer list · ${payload.items.length} items`}
                  {payload.from ? ` · from ${payload.from}` : ''}
                </ThemedText>
              </View>
            </View>
            <Button
              title={payload.t === 'plan' ? 'Start this plan' : 'Add this list'}
              style={{ marginTop: Spacing.four }}
              onPress={doImport}
            />
          </Card>
        ) : null}
      </View>
    </SafeAreaView>
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
  body: { paddingHorizontal: Spacing.four, width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  icon: { width: 48, height: 48, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
});
