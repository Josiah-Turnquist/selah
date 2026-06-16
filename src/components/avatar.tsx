import { View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const theme = useTheme();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: theme.accentSoft,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <ThemedText type="h3" themeColor="accent" style={{ fontSize: size * 0.4 }}>
        {(name.trim()[0] || '?').toUpperCase()}
      </ThemedText>
    </View>
  );
}
