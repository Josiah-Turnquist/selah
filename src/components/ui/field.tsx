import { useEffect, useRef } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function TextField({
  label,
  style,
  multiline,
  autoFocus,
  ...rest
}: TextInputProps & { label?: string }) {
  const theme = useTheme();
  const inputRef = useRef<TextInput>(null);

  // Native `autoFocus` is deliberately intercepted and NOT passed through: on
  // the New Architecture a TextInput that demands first-responder while its
  // screen is still mid push-transition hard-crashes release builds (this took
  // down the Type-it study mode and would have hit Search too). Focusing a beat
  // after mount is visually identical and safe.
  useEffect(() => {
    if (!autoFocus) return;
    const t = setTimeout(() => inputRef.current?.focus(), 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.wrap}>
      {label ? (
        <ThemedText type="label" themeColor="textSecondary">
          {label}
        </ThemedText>
      ) : null}
      <TextInput
        ref={inputRef}
        placeholderTextColor={theme.textTertiary}
        multiline={multiline}
        style={[
          styles.input,
          {
            backgroundColor: theme.backgroundElement,
            color: theme.text,
            borderColor: theme.border,
            minHeight: multiline ? 92 : 48,
            textAlignVertical: multiline ? 'top' : 'center',
          },
          style,
        ]}
        {...rest}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.one, alignSelf: 'stretch' },
  input: {
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 16,
  },
});
