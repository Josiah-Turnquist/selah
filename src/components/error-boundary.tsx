/**
 * Root error boundary: a thrown render error becomes a calm recovery screen
 * instead of a dead white screen (in release a fatal JS error kills the app
 * outright). The error message is shown so a user can report it, and Reload
 * remounts the tree. Local data is untouched by design — the store lives above
 * nothing; it re-hydrates from AsyncStorage on remount.
 */

import { Component, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type Props = { children: ReactNode };
type State = { error: Error | null };

// Deliberately theme-independent: if theming itself is what crashed, this
// screen must still render.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <View style={styles.wrap}>
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.body}>
          Selah hit an unexpected error. Your data is safe on this device.
        </Text>
        <Text style={styles.detail} numberOfLines={6}>
          {String(this.state.error?.message ?? this.state.error)}
        </Text>
        <Pressable
          onPress={() => this.setState({ error: null })}
          accessibilityRole="button"
          style={({ pressed }) => [styles.button, pressed && { opacity: 0.8 }]}>
          <Text style={styles.buttonText}>Reload</Text>
        </Pressable>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, backgroundColor: '#FAF9F7' },
  title: { fontSize: 22, fontWeight: '600', color: '#1B1B1D', marginBottom: 8 },
  body: { fontSize: 15, color: '#5A5A5E', textAlign: 'center', marginBottom: 16 },
  detail: { fontSize: 12, color: '#8A8A8E', textAlign: 'center', marginBottom: 24, fontFamily: 'Courier' },
  button: { backgroundColor: '#1B1B1D', paddingHorizontal: 28, paddingVertical: 12, borderRadius: 12 },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});
