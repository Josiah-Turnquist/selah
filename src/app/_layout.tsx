import { DarkTheme, DefaultTheme, Stack, ThemeProvider, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Linking } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { CelebrationWatcher } from '@/components/celebration-watcher';
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
    <SafeAreaProvider>
      <StoreProvider>
        <CelebrationProvider>
          <ToastProvider>
            <CelebrationWatcher />
            <ThemedChrome />
          </ToastProvider>
        </CelebrationProvider>
      </StoreProvider>
    </SafeAreaProvider>
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
      </Stack>
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}
