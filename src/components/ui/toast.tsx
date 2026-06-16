import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const ToastContext = createContext<(message: string) => void>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [message, setMessage] = useState<string | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback(
    (next: string) => {
      setMessage(next);
      if (timer.current) clearTimeout(timer.current);
      Animated.timing(opacity, { toValue: 1, duration: 160, useNativeDriver: Platform.OS !== 'web' }).start();
      timer.current = setTimeout(() => {
        Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: Platform.OS !== 'web' }).start(({ finished }) => {
          if (finished) setMessage(null);
        });
      }, 1900);
    },
    [opacity],
  );

  useEffect(() => () => timer.current ? clearTimeout(timer.current) : undefined, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      {message !== null ? (
        <Animated.View
          style={[styles.wrap, { opacity, bottom: BottomTabInset + insets.bottom / 2 + Spacing.two }]}>
          <View style={[styles.toast, { backgroundColor: theme.text }]}>
            <ThemedText type="small" style={{ color: theme.background, fontWeight: '600' }}>
              {message}
            </ThemedText>
          </View>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center', paddingHorizontal: Spacing.four, pointerEvents: 'none' },
  toast: {
    maxWidth: MaxContentWidth,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    borderRadius: Radius.pill,
  },
});
