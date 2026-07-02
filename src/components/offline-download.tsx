/**
 * Settings card: download the current translation for offline reading. Progress
 * is just "chapters cached on disk", so pausing, relaunching, or re-running all
 * resume for free — the sweep skips anything already saved.
 */

import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button, Card } from '@/components/ui/primitives';
import { ProgressBar } from '@/components/ui/progress';
import { useToast } from '@/components/ui/toast';
import { Spacing } from '@/constants/theme';
import { countCachedChapters, downloadTranslation, TOTAL_CHAPTERS, type OfflineDownload as Handle } from '@/lib/bible/offline';
import { translationName } from '@/lib/bible/translations';
import { useData } from '@/lib/store/store';

export function OfflineDownload() {
  const data = useData();
  const toast = useToast();
  const translation = data.settings.translation;

  const [saved, setSaved] = useState<number | null>(null);
  const [running, setRunning] = useState(false);
  const handle = useRef<Handle | null>(null);
  const live = useRef(true);

  useEffect(() => {
    live.current = true;
    setRunning(false);
    handle.current?.cancel();
    countCachedChapters(translation).then((n) => live.current && setSaved(n));
    return () => {
      live.current = false;
      handle.current?.cancel();
    };
  }, [translation]);

  const complete = (saved ?? 0) >= TOTAL_CHAPTERS;

  const start = () => {
    setRunning(true);
    const dl = downloadTranslation(translation, (n) => live.current && setSaved(n));
    handle.current = dl;
    dl.promise.then(({ saved: total, failed, cancelled }) => {
      if (!live.current) return;
      setRunning(false);
      setSaved(total);
      if (!cancelled) {
        toast(failed > 0 ? `Saved ${total} chapters — ${failed} failed, run again to finish` : 'Available offline');
      }
    });
  };

  const pause = () => {
    handle.current?.cancel();
    setRunning(false);
  };

  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.three }}>
        <View style={{ flex: 1 }}>
          <ThemedText type="h3">Read without internet</ThemedText>
          <ThemedText type="caption" themeColor="textSecondary">
            {complete
              ? `The whole ${translationName(translation)} is saved on this phone.`
              : `Save the ${translationName(translation)} to this phone.`}
          </ThemedText>
        </View>
        {complete ? null : (
          <Button
            size="sm"
            variant={running ? 'secondary' : 'primary'}
            title={running ? 'Pause' : saved ? 'Continue' : 'Download'}
            onPress={running ? pause : start}
          />
        )}
      </View>
      {saved != null && (running || (saved > 0 && !complete)) ? (
        <View style={{ marginTop: Spacing.three, gap: Spacing.one }}>
          <ProgressBar value={saved / TOTAL_CHAPTERS} height={6} />
          <ThemedText type="caption" themeColor="textTertiary">
            {saved.toLocaleString()} of {TOTAL_CHAPTERS.toLocaleString()} chapters
            {running ? ' — keep this screen open' : ''}
          </ThemedText>
        </View>
      ) : null}
    </Card>
  );
}
