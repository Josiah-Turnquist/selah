import { StyleSheet, Text, type TextProps } from 'react-native';

import { Fonts, type ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type TextType =
  | 'display'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'body'
  | 'bodySerif'
  | 'small'
  | 'caption'
  | 'label'
  | 'link'
  | 'code';

export type ThemedTextProps = TextProps & {
  type?: TextType;
  themeColor?: ThemeColor;
};

export function ThemedText({ style, type = 'body', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();
  return <Text style={[{ color: theme[themeColor ?? 'text'] }, styles[type], style]} {...rest} />;
}

const styles = StyleSheet.create({
  display: { fontSize: 27, lineHeight: 34, fontWeight: '500', letterSpacing: -0.2, fontFamily: Fonts.serif },
  h1: { fontSize: 23, lineHeight: 30, fontWeight: '500', letterSpacing: -0.2, fontFamily: Fonts.serif },
  h2: { fontSize: 18, lineHeight: 25, fontWeight: '500', letterSpacing: -0.1, fontFamily: Fonts.serif },
  h3: { fontSize: 16, lineHeight: 22, fontWeight: '500', fontFamily: Fonts.serif },
  body: { fontSize: 16, lineHeight: 25, fontWeight: '400', fontFamily: Fonts.serif },
  bodySerif: { fontSize: 18, lineHeight: 29, fontWeight: '400', fontFamily: Fonts.serif },
  small: { fontSize: 14, lineHeight: 20, fontWeight: '400', fontFamily: Fonts.serif },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '400', fontFamily: Fonts.serif },
  label: { fontSize: 11, lineHeight: 14, fontWeight: '600', letterSpacing: 0.9, textTransform: 'uppercase' },
  link: { fontSize: 15, lineHeight: 21, fontWeight: '500', fontFamily: Fonts.serif },
  code: { fontSize: 12, fontFamily: Fonts.mono, fontWeight: '400' },
});
