import { router } from 'expo-router';
import { BookOpen, Check } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { TextField } from '@/components/ui/field';
import { Button } from '@/components/ui/primitives';
import { MaxContentWidth, PALETTES, PALETTE_META, Radius, Spacing } from '@/constants/theme';
import { TEMPLATES } from '@/lib/plans/templates';
import { useActions, useData, usePaletteId } from '@/lib/store/store';
import { useColorSchemeEffective, useTheme } from '@/hooks/use-theme';
import { tapLight, tapSuccess } from '@/lib/util/haptics';

const STEPS = 4;
const useNative = Platform.OS !== 'web';

export default function Onboarding() {
  const data = useData();
  const actions = useActions();
  const theme = useTheme();
  const palette = usePaletteId();
  const scheme = useColorSchemeEffective();
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState(0);
  const [name, setName] = useState(data.settings.displayName === 'You' ? '' : data.settings.displayName);
  const [pickedPlan, setPickedPlan] = useState<string | null>(null);

  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    anim.setValue(0);
    Animated.timing(anim, { toValue: 1, duration: 340, easing: Easing.out(Easing.cubic), useNativeDriver: useNative }).start();
  }, [step, anim]);
  const animStyle = {
    opacity: anim,
    transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }],
  };

  const finish = () => {
    if (name.trim()) actions.setDisplayName(name.trim());
    if (pickedPlan) {
      const tpl = TEMPLATES.find((t) => t.id === pickedPlan);
      if (tpl) actions.startPlan(tpl);
    }
    actions.setOnboarded(true);
    tapSuccess();
    router.replace('/read');
  };
  const next = () => (step < STEPS - 1 ? setStep((s) => s + 1) : finish());
  const back = () => setStep((s) => Math.max(0, s - 1));

  return (
    <View style={[styles.flex, { backgroundColor: theme.background }]}>
      <SafeAreaView style={styles.flex}>
        <View style={styles.topBar}>
          {step < STEPS - 1 ? (
            <Pressable onPress={finish} hitSlop={8} accessibilityLabel="Skip onboarding">
              <ThemedText type="small" themeColor="textSecondary">
                Skip
              </ThemedText>
            </Pressable>
          ) : null}
        </View>

        <Animated.View style={[styles.flex, animStyle]}>
          <ScrollView contentContainerStyle={styles.step} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets keyboardDismissMode="interactive" showsVerticalScrollIndicator={false}>
            {step === 0 ? (
              <View style={styles.welcome}>
                <View style={[styles.mark, { backgroundColor: theme.accentSoft }]}>
                  <BookOpen size={44} color={theme.accent} strokeWidth={1.6} />
                </View>
                <ThemedText type="display" style={{ textAlign: 'center' }}>
                  Selah
                </ThemedText>
                <ThemedText type="body" themeColor="textSecondary" style={styles.welcomeText}>
                  A quiet place to read Scripture, follow a plan, pray, and hide verses in your heart — on
                  your own or with friends.
                </ThemedText>
              </View>
            ) : step === 1 ? (
              <View style={styles.block}>
                <ThemedText type="h1">What should we call you?</ThemedText>
                <ThemedText type="body" themeColor="textSecondary">
                  We’ll use this when you share plans and prayer lists.
                </ThemedText>
                <TextField
                  value={name}
                  onChangeText={setName}
                  placeholder="Your name"
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={next}
                  style={{ marginTop: Spacing.two }}
                />
              </View>
            ) : step === 2 ? (
              <View style={styles.block}>
                <ThemedText type="h1">Choose your look</ThemedText>
                <ThemedText type="body" themeColor="textSecondary">
                  Pick a color — you can change it anytime in Settings.
                </ThemedText>
                <View style={styles.themeGrid}>
                  {PALETTE_META.map((p) => {
                    const set = PALETTES[p.id][scheme];
                    const selected = palette === p.id;
                    return (
                      <Pressable
                        key={p.id}
                        onPress={() => {
                          actions.setPalette(p.id);
                          tapLight();
                        }}
                        accessibilityLabel={`${p.name} theme`}
                        style={({ pressed }) => [
                          styles.themeChip,
                          { borderColor: selected ? set.accent : theme.border, backgroundColor: theme.card },
                          pressed && { opacity: 0.85 },
                        ]}>
                        <View style={[styles.themeSwatch, { backgroundColor: set.background, borderColor: theme.border }]}>
                          <View style={[styles.swatchBar, { backgroundColor: set.backgroundElement }]} />
                          <View style={[styles.swatchDot, { backgroundColor: set.accent }]} />
                        </View>
                        <View style={styles.themeNameRow}>
                          <ThemedText type="small" style={{ fontWeight: selected ? '600' : '400' }}>
                            {p.name}
                          </ThemedText>
                          {selected ? <Check size={14} color={set.accent} /> : null}
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ) : (
              <View style={styles.block}>
                <ThemedText type="h1">Start a reading plan?</ThemedText>
                <ThemedText type="body" themeColor="textSecondary">
                  Optional — you can always begin one later.
                </ThemedText>
                <View style={styles.planList}>
                  {TEMPLATES.map((t) => {
                    const selected = pickedPlan === t.id;
                    return (
                      <Pressable
                        key={t.id}
                        onPress={() => {
                          setPickedPlan(selected ? null : t.id);
                          tapLight();
                        }}
                        style={({ pressed }) => [
                          styles.planCard,
                          { backgroundColor: theme.card, borderColor: selected ? theme.accent : theme.border },
                          pressed && { opacity: 0.9 },
                        ]}>
                        <View style={{ flex: 1 }}>
                          <ThemedText type="h3">{t.title}</ThemedText>
                          <ThemedText type="caption" themeColor="textSecondary">
                            {t.durationDays} days · {t.subtitle}
                          </ThemedText>
                        </View>
                        {selected ? <Check size={18} color={theme.accent} /> : null}
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}
          </ScrollView>
        </Animated.View>

        <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.four }]}>
          <View style={styles.dots}>
            {Array.from({ length: STEPS }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  { width: i === step ? 22 : 7, backgroundColor: i === step ? theme.accent : theme.backgroundSelected },
                ]}
              />
            ))}
          </View>
          <View style={styles.footerBtns}>
            {step > 0 ? <Button variant="ghost" title="Back" onPress={back} /> : null}
            <Button title={step === STEPS - 1 ? 'Get started' : 'Continue'} style={{ flex: 1 }} onPress={next} />
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  topBar: {
    minHeight: 40,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: Spacing.five,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  step: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.five,
    paddingVertical: Spacing.five,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  welcome: { alignItems: 'center', gap: Spacing.four },
  mark: { width: 96, height: 96, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  welcomeText: { textAlign: 'center', maxWidth: 330, lineHeight: 25 },
  block: { gap: Spacing.three },
  themeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, marginTop: Spacing.two },
  themeChip: { flexBasis: '47%', flexGrow: 1, borderWidth: 1, borderRadius: Radius.md, padding: Spacing.two, gap: Spacing.two, alignItems: 'center' },
  themeSwatch: {
    width: '100%',
    height: 56,
    borderRadius: Radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 8,
    justifyContent: 'space-between',
  },
  swatchBar: { height: 7, width: '70%', borderRadius: 4 },
  swatchDot: { width: 18, height: 18, borderRadius: Radius.pill },
  themeNameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  planList: { gap: Spacing.two, marginTop: Spacing.two },
  planCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.four,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  footer: { paddingHorizontal: Spacing.five, gap: Spacing.four, width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  dots: { flexDirection: 'row', gap: 6, justifyContent: 'center' },
  dot: { height: 7, borderRadius: Radius.pill },
  footerBtns: { flexDirection: 'row', gap: Spacing.two },
});
