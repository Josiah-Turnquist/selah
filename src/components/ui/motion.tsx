import { Children, useEffect, useRef, type ReactNode } from 'react';
import { Animated, Easing, Platform } from 'react-native';

const useNative = Platform.OS !== 'web';

/** Fades + slides each child up in sequence as the screen mounts. */
export function Stagger({ children, step = 55 }: { children: ReactNode; step?: number }) {
  const items = Children.toArray(children);
  return (
    <>
      {items.map((child, i) => (
        <StaggerItem key={i} delay={i * step}>
          {child}
        </StaggerItem>
      ))}
    </>
  );
}

function StaggerItem({ delay, children }: { delay: number; children: ReactNode }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const t = Animated.timing(anim, {
      toValue: 1,
      duration: 360,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: useNative,
    });
    t.start();
    return () => t.stop();
  }, [anim, delay]);

  return (
    <Animated.View
      style={{
        opacity: anim,
        transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
      }}>
      {children}
    </Animated.View>
  );
}
