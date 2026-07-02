import type { ComponentType, ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing, type ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type IconType = ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  iconRight: IconRight,
  disabled,
  full,
  style,
  accessibilityLabel,
}: {
  title?: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconType;
  iconRight?: IconType;
  disabled?: boolean;
  full?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  const theme = useTheme();
  const height = size === 'sm' ? 36 : size === 'lg' ? 54 : 46;
  const paddingHorizontal = size === 'sm' ? Spacing.three : Spacing.five;

  const bg =
    variant === 'primary'
      ? theme.accent
      : variant === 'secondary'
        ? theme.backgroundElement
        : variant === 'danger'
          ? theme.danger
          : 'transparent';
  const fg =
    variant === 'primary' || variant === 'danger'
      ? theme.onAccent
      : variant === 'ghost'
        ? theme.accent
        : theme.text;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [
        styles.button,
        {
          height,
          paddingHorizontal,
          backgroundColor: bg,
          opacity: disabled ? 0.4 : pressed ? 0.85 : 1,
        },
        full && { alignSelf: 'stretch' },
        pressed && !disabled && { transform: [{ scale: 0.98 }] },
        style,
      ]}>
      {Icon ? <Icon size={size === 'sm' ? 16 : 18} color={fg} strokeWidth={2} /> : null}
      {title ? (
        <ThemedText type={size === 'sm' ? 'small' : 'h3'} style={{ color: fg }}>
          {title}
        </ThemedText>
      ) : null}
      {IconRight ? <IconRight size={size === 'sm' ? 16 : 18} color={fg} strokeWidth={2} /> : null}
    </Pressable>
  );
}

export function IconButton({
  icon: Icon,
  onPress,
  color,
  size = 40,
  variant = 'plain',
  accessibilityLabel,
}: {
  icon: IconType;
  onPress?: () => void;
  color?: ThemeColor;
  size?: number;
  variant?: 'plain' | 'soft';
  accessibilityLabel?: string;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        styles.iconButton,
        {
          width: size,
          height: size,
          borderRadius: Radius.pill,
          backgroundColor: variant === 'soft' ? theme.backgroundElement : 'transparent',
          opacity: pressed ? 0.6 : 1,
        },
      ]}>
      <Icon size={size * 0.5} color={theme[color ?? 'text']} strokeWidth={2} />
    </Pressable>
  );
}

export function Card({
  children,
  onPress,
  style,
  padded = true,
}: {
  children: ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
}) {
  const theme = useTheme();
  const base: StyleProp<ViewStyle> = [
    styles.card,
    { backgroundColor: theme.card, borderColor: theme.border },
    padded && { padding: Spacing.four },
    style,
  ];
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [base, pressed && { opacity: 0.97, transform: [{ scale: 0.99 }] }]}>
        {children}
      </Pressable>
    );
  }
  return <View style={base}>{children}</View>;
}

export function Pill({
  label,
  tone = 'neutral',
}: {
  label: string;
  tone?: 'neutral' | 'accent' | 'ember' | 'success';
}) {
  const theme = useTheme();
  const map = {
    neutral: { bg: theme.backgroundElement, fg: theme.textSecondary },
    accent: { bg: theme.accentSoft, fg: theme.accent },
    ember: { bg: theme.emberSoft, fg: theme.ember },
    success: { bg: theme.successSoft, fg: theme.success },
  } as const;
  const c = map[tone];
  return (
    <View style={[styles.pill, { backgroundColor: c.bg }]}>
      <ThemedText type="label" style={{ color: c.fg, fontSize: 11 }}>
        {label}
      </ThemedText>
    </View>
  );
}

export function Divider() {
  const theme = useTheme();
  return <View style={[styles.divider, { backgroundColor: theme.border }]} />;
}

export function EmptyState({
  icon: Icon,
  title,
  subtitle,
  action,
}: {
  icon: IconType;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  const theme = useTheme();
  return (
    <View style={styles.empty}>
      <View style={[styles.emptyIcon, { backgroundColor: theme.backgroundElement }]}>
        <Icon size={26} color={theme.textSecondary} strokeWidth={1.8} />
      </View>
      <ThemedText type="h3" style={styles.emptyTitle}>
        {title}
      </ThemedText>
      {subtitle ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.emptyText}>
          {subtitle}
        </ThemedText>
      ) : null}
      {action ? <View style={{ marginTop: Spacing.four }}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    borderRadius: Radius.md,
  },
  iconButton: { alignItems: 'center', justifyContent: 'center' },
  card: { borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth },
  pill: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 3,
    borderRadius: Radius.pill,
    alignSelf: 'flex-start',
  },
  divider: { height: StyleSheet.hairlineWidth, alignSelf: 'stretch' },
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.eight, gap: Spacing.two },
  emptyIcon: {
    width: 60,
    height: 60,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
  },
  emptyTitle: { textAlign: 'center' },
  emptyText: { textAlign: 'center', maxWidth: 280 },
});
