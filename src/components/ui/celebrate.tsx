/**
 * Quiet, reverent celebration moments — in keeping with "Selah" (pause, reflect).
 * No confetti: a soft emblem scales in behind two slow halo rings, with a serif
 * headline. `useCelebrate()` shows the full-screen overlay (streak milestones,
 * finishing a plan); `CelebrationEmblem` is the animated mark on its own for the
 * study-session "done" screen.
 */

import { Check } from 'lucide-react-native';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import type { IconType } from '@/components/ui/primitives';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { tapSuccess } from '@/lib/util/haptics';

const useNative = Platform.OS !== 'web';

export type CelebrationTone = 'accent' | 'ember' | 'success';

export type CelebrationConfig = {
  title: string;
  subtitle?: string;
  icon?: IconType;
  tone?: CelebrationTone;
};

type ThemeT = ReturnType<typeof useTheme>;

function toneColors(theme: ThemeT, tone: CelebrationTone) {
  switch (tone) {
    case 'ember':
      return { ring: theme.ember, disc: theme.emberSoft, icon: theme.ember };
    case 'success':
      return { ring: theme.success, disc: theme.success + '22', icon: theme.success };
    default:
      return { ring: theme.accent, disc: theme.accentSoft, icon: theme.accent };
  }
}

/** The animated mark: a soft disc that springs in behind two slow halo rings. */
export function CelebrationEmblem({
  icon: Icon = Check,
  tone = 'accent',
  size = 96,
}: {
  icon?: IconType;
  tone?: CelebrationTone;
  size?: number;
}) {
  const theme = useTheme();
  const c = toneColors(theme, tone);
  const appear = useRef(new Animated.Value(0)).current;
  const ring1 = useRef(new Animated.Value(0)).current;
  const ring2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const spring = Animated.spring(appear, {
      toValue: 1,
      friction: 6,
      tension: 70,
      useNativeDriver: useNative,
    });
    const loops = [ring1, ring2].map((v, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 1000),
          Animated.timing(v, {
            toValue: 1,
            duration: 2000,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: useNative,
          }),
        ]),
      ),
    );
    spring.start();
    loops.forEach((l) => l.start());
    return () => {
      spring.stop();
      loops.forEach((l) => l.stop());
    };
  }, [appear, ring1, ring2]);

  const ringStyle = (v: Animated.Value) => ({
    position: 'absolute' as const,
    width: size,
    height: size,
    borderRadius: size / 2,
    borderWidth: 1.5,
    borderColor: c.ring,
    opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0] }),
    transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 1.9] }) }],
  });

  return (
    <View style={{ width: size * 2, height: size * 2, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={[ringStyle(ring1), { pointerEvents: 'none' }]} />
      <Animated.View style={[ringStyle(ring2), { pointerEvents: 'none' }]} />
      <Animated.View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: c.disc,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: appear,
          transform: [{ scale: appear.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }],
        }}>
        <Icon size={Math.round(size * 0.4)} color={c.icon} strokeWidth={2.2} />
      </Animated.View>
    </View>
  );
}

const CelebrationContext = createContext<(config: CelebrationConfig) => void>(() => {});

export function useCelebrate() {
  return useContext(CelebrationContext);
}

export function CelebrationProvider({ children }: { children: ReactNode }) {
  const theme = useTheme();
  const [config, setConfig] = useState<CelebrationConfig | null>(null);
  const anim = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hide = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    Animated.timing(anim, {
      toValue: 0,
      duration: 260,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: useNative,
    }).start(({ finished }) => {
      if (finished) setConfig(null);
    });
  }, [anim]);

  const celebrate = useCallback(
    (next: CelebrationConfig) => {
      if (timer.current) clearTimeout(timer.current);
      setConfig(next);
      anim.setValue(0);
      Animated.timing(anim, {
        toValue: 1,
        duration: 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: useNative,
      }).start();
      tapSuccess();
      timer.current = setTimeout(hide, 3000);
    },
    [anim, hide],
  );

  useEffect(() => () => (timer.current ? clearTimeout(timer.current) : undefined), []);

  return (
    <CelebrationContext.Provider value={celebrate}>
      {children}
      {config ? (
        <Animated.View style={[styles.overlay, { opacity: anim }]}>
          <Pressable
            style={[styles.fill, { backgroundColor: theme.background + 'F2' }]}
            onPress={hide}
            accessibilityRole="button"
            accessibilityLabel="Dismiss"
          />
          <Animated.View
            style={[
              styles.content,
              {
                pointerEvents: 'none',
                transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }],
              },
            ]}>
            <CelebrationEmblem icon={config.icon} tone={config.tone} />
            <ThemedText type="h1" style={styles.title}>
              {config.title}
            </ThemedText>
            {config.subtitle ? (
              <ThemedText type="body" themeColor="textSecondary" style={styles.subtitle}>
                {config.subtitle}
              </ThemedText>
            ) : null}
            <ThemedText type="caption" themeColor="textTertiary" style={styles.tap}>
              Tap to continue
            </ThemedText>
          </Animated.View>
        </Animated.View>
      ) : null}
    </CelebrationContext.Provider>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  content: { alignItems: 'center', paddingHorizontal: Spacing.five },
  title: { marginTop: Spacing.four, textAlign: 'center' },
  subtitle: { marginTop: Spacing.two, textAlign: 'center', maxWidth: 320 },
  tap: { marginTop: Spacing.six, textAlign: 'center' },
});
