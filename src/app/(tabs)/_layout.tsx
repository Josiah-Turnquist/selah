import { TabList, TabSlot, TabTrigger, Tabs, type TabTriggerSlotProps } from 'expo-router/ui';
import { BookOpen, CalendarCheck, GraduationCap, HeartHandshake } from 'lucide-react-native';
import { forwardRef, useEffect, useRef } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, View, type ViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import type { IconType } from '@/components/ui/primitives';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function TabsLayout() {
  return (
    <Tabs>
      <TabSlot />
      <TabList asChild>
        <TabBar>
          <TabTrigger name="read" href="/read" asChild>
            <TabItem icon={BookOpen} label="Read" />
          </TabTrigger>
          <TabTrigger name="plans" href="/plans" asChild>
            <TabItem icon={CalendarCheck} label="Plans" />
          </TabTrigger>
          <TabTrigger name="pray" href="/pray" asChild>
            <TabItem icon={HeartHandshake} label="Pray" />
          </TabTrigger>
          <TabTrigger name="study" href="/study" asChild>
            <TabItem icon={GraduationCap} label="Study" />
          </TabTrigger>
        </TabBar>
      </TabList>
    </Tabs>
  );
}

const TabBar = forwardRef<View, ViewProps>(function TabBar({ children, ...rest }, ref) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      ref={ref}
      {...rest}
      style={[
        styles.barWrap,
        {
          backgroundColor: theme.card,
          borderTopColor: theme.border,
          paddingBottom: Math.max(insets.bottom, Spacing.three),
          pointerEvents: 'box-none',
        },
      ]}>
      <View style={styles.barInner}>{children}</View>
    </View>
  );
});

function TabItem({
  icon: Icon,
  label,
  isFocused,
  ...props
}: TabTriggerSlotProps & { icon: IconType; label: string }) {
  const theme = useTheme();
  const color = isFocused ? theme.accent : theme.textSecondary;
  const anim = useRef(new Animated.Value(isFocused ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: isFocused ? 1 : 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [isFocused, anim]);
  return (
    <Pressable {...props} style={styles.item}>
      <View style={styles.iconWrap}>
        <Animated.View
          style={[
            styles.pill,
            { backgroundColor: theme.accentSoft, opacity: anim, transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) }] },
          ]}
        />
        <Icon size={21} color={color} strokeWidth={isFocused ? 2.2 : 1.8} />
      </View>
      <ThemedText style={[styles.label, { color }]}>{label}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  barWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.two,
    alignItems: 'center',
  },
  barInner: {
    flexDirection: 'row',
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.two,
  },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, paddingVertical: Spacing.one },
  iconWrap: { width: 46, height: 28, alignItems: 'center', justifyContent: 'center' },
  pill: { position: 'absolute', width: 44, height: 28, borderRadius: Radius.pill },
  label: { fontSize: 11, fontWeight: '500', letterSpacing: 0.3 },
});
