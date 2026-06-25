import { router } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { IconButton } from '@/components/ui/primitives';
import { Stagger } from '@/components/ui/motion';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function Screen({
  children,
  scroll = false,
  tab = false,
}: {
  children: ReactNode;
  scroll?: boolean;
  tab?: boolean;
}) {
  const theme = useTheme();
  return (
    <SafeAreaView
      edges={tab ? ['top'] : ['top', 'bottom']}
      style={[styles.flex, { backgroundColor: theme.background }]}>
      {scroll ? (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          automaticallyAdjustKeyboardInsets
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            tab && { paddingBottom: BottomTabInset + Spacing.five },
          ]}>
          <View style={styles.inner}>
            <Stagger>{children}</Stagger>
          </View>
        </ScrollView>
      ) : (
        <View style={styles.flexBody}>{children}</View>
      )}
    </SafeAreaView>
  );
}

export function ScreenHeader({
  title,
  subtitle,
  back,
  right,
  large = true,
}: {
  title: string;
  subtitle?: string;
  back?: boolean;
  right?: ReactNode;
  large?: boolean;
}) {
  return (
    <View style={styles.header}>
      {back ? <IconButton icon={ChevronLeft} variant="soft" onPress={() => router.back()} /> : null}
      <View style={styles.headerTitle}>
        <ThemedText type={large ? 'h1' : 'h2'} numberOfLines={1}>
          {title}
        </ThemedText>
        {subtitle ? (
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {subtitle}
          </ThemedText>
        ) : null}
      </View>
      {right ? <View style={styles.headerRight}>{right}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollContent: { paddingHorizontal: Spacing.four, paddingBottom: Spacing.five, alignItems: 'center' },
  inner: { width: '100%', maxWidth: MaxContentWidth },
  flexBody: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.four,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.three,
    minHeight: 52,
  },
  headerTitle: { flex: 1, justifyContent: 'center' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
});
