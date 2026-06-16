import { useEffect, useRef } from 'react';
import { Animated, Platform, StyleSheet, View, type DimensionValue } from 'react-native';

import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const useNative = Platform.OS !== 'web';

export function SkeletonLine({ width = '100%', height = 16 }: { width?: DimensionValue; height?: number }) {
  const theme = useTheme();
  const pulse = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 650, useNativeDriver: useNative }),
        Animated.timing(pulse, { toValue: 0.5, duration: 650, useNativeDriver: useNative }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return <Animated.View style={{ width, height, borderRadius: Radius.sm, backgroundColor: theme.backgroundElement, opacity: pulse }} />;
}

/** A placeholder chapter shown while the reader loads. */
export function ReaderSkeleton() {
  return (
    <View style={styles.reader}>
      <SkeletonLine width={170} height={30} />
      <View style={{ height: 24 }} />
      {[0, 1, 2, 3, 4].map((i) => (
        <View key={i} style={styles.para}>
          <SkeletonLine width="100%" height={15} />
          <SkeletonLine width="94%" height={15} />
          <SkeletonLine width={i % 2 ? '68%' : '82%'} height={15} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  reader: { paddingHorizontal: Spacing.four, paddingTop: Spacing.three, width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  para: { gap: 9, marginBottom: 20 },
});
