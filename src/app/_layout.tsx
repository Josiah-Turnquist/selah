import { DarkTheme, DefaultTheme, Stack, ThemeProvider, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Linking } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { CelebrationWatcher } from '@/components/celebration-watcher';
import { ErrorBoundary } from '@/components/error-boundary';
import { ReminderSync } from '@/components/reminder-sync';
import { SyncManager } from '@/components/sync-manager';
import { CelebrationProvider } from '@/components/ui/celebrate';
import { ToastProvider } from '@/components/ui/toast';
import { useColorSchemeEffective, useTheme } from '@/hooks/use-theme';
import { decodeShare, encodeShare } from '@/lib/share';
import { StoreProvider } from '@/lib/store/store';

export const unstable_settings = { initialRouteName: 'index' };

export default function RootLayout() {
  // Best-effort: open `selah://import/<code>` deep links into the import screen.
  useEffect(() => {
    const handle = (url: string | null) => {
      if (!url || !url.includes('import')) return;
      try {
        const payload = decodeShare(url);
        if (payload) router.push({ pathname: '/import', params: { code: encodeShare(payload) } });
      } catch {
        // ignore malformed links
      }
    };
    Linking.getInitialURL().then(handle).catch(() => {});
    const sub = Linking.addEventListener('url', (e) => handle(e.url));
    return () => sub.remove();
  }, []);

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <StoreProvider>
        <CelebrationProvider>
          <ToastProvider>
            <CelebrationWatcher />
            <ReminderSync />
            <SyncManager />
            <ThemedChrome />
          </ToastProvider>
        </CelebrationProvider>
        </StoreProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

function ThemedChrome() {
  const theme = useTheme();
  const isDark = useColorSchemeEffective() === 'dark';
  return (
    <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
      <Stack
        screenOptions={{
          headerShown: false,
          title: 'Selah',
          contentStyle: { backgroundColor: theme.background },
        }}>
        <Stack.Screen name="settings" options={{ presentation: 'modal' }} />
        <Stack.Screen name="import" options={{ presentation: 'modal' }} />
        {/* Reader owns horizontal swipes (prev/next chapter), so disable the
            native back-gesture and swap chapters instantly with no overlay. */}
        <Stack.Screen name="reader/[bookId]/[chapter]" options={{ gestureEnabled: false, animation: 'none' }} />
      </Stack>
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}
