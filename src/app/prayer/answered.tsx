import { RotateCcw, Sparkles, Trash2 } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { PrayerRow } from '@/components/prayer-row';
import { ThemedText } from '@/components/themed-text';
import { Button, EmptyState } from '@/components/ui/primitives';
import { ConfirmButton } from '@/components/ui/confirm-button';
import { Screen, ScreenHeader } from '@/components/ui/screen';
import { Sheet } from '@/components/ui/sheet';
import { Spacing } from '@/constants/theme';
import { useActions, useData } from '@/lib/store/store';
import type { PrayerItem, PrayerList } from '@/lib/store/types';

function shortDate(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  if (!y || !m || !d) return '';
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function AnsweredPrayers() {
  const data = useData();
  const actions = useActions();
  const [acting, setActing] = useState<{ listId: string; item: PrayerItem } | null>(null);

  const answered = useMemo(() => {
    const out: { item: PrayerItem; list: PrayerList }[] = [];
    for (const l of data.prayerLists) for (const it of l.items) if (it.answered) out.push({ item: it, list: l });
    out.sort((a, b) => (b.item.answeredAt ?? '').localeCompare(a.item.answeredAt ?? ''));
    return out;
  }, [data.prayerLists]);

  return (
    <Screen scroll>
      <ScreenHeader title="Answered" subtitle={answered.length ? `${answered.length} remembered` : undefined} back />

      {answered.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="No answered prayers yet"
          subtitle="When a prayer is answered, mark it — it’ll be remembered here."
        />
      ) : (
        <View style={{ gap: Spacing.two }}>
          {answered.map(({ item, list }) => (
            <PrayerRow
              key={item.id}
              item={item}
              cycle={list.cycle}
              sublabel={`${list.title}${item.answeredAt ? ` · answered ${shortDate(item.answeredAt)}` : ''}`}
              onPress={() => setActing({ listId: list.id, item })}
            />
          ))}
        </View>
      )}

      <Sheet visible={!!acting} onClose={() => setActing(null)} title={acting?.item.text}>
        {acting?.item.answeredAt ? (
          <ThemedText type="small" themeColor="textSecondary">
            Answered {shortDate(acting.item.answeredAt)}.
          </ThemedText>
        ) : null}
        <Button
          variant="secondary"
          icon={RotateCcw}
          title="Restore to its list"
          onPress={() => {
            if (acting) actions.setPrayerAnswered(acting.listId, acting.item.id, false);
            setActing(null);
          }}
        />
        <ConfirmButton
          variant="ghost"
          icon={Trash2}
          title="Delete forever"
          confirmTitle="Tap again to delete"
          onConfirm={() => {
            if (acting) actions.deletePrayerItem(acting.listId, acting.item.id);
            setActing(null);
          }}
        />
      </Sheet>
    </Screen>
  );
}
