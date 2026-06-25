import { useEffect, useState } from 'react';
import { Keyboard, LayoutAnimation, Platform, type KeyboardEvent } from 'react-native';

/**
 * Tracks the on-screen keyboard height. More reliable than KeyboardAvoidingView
 * inside a React Native <Modal> on iOS (a well-known broken combination), so
 * Sheet uses this to lift itself above the keyboard. Animates in sync with the
 * keyboard on iOS via LayoutAnimation.
 */
export function useKeyboardHeight(): number {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const isIOS = Platform.OS === 'ios';
    const showEvent = isIOS ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = isIOS ? 'keyboardWillHide' : 'keyboardDidHide';

    const animate = (event: KeyboardEvent) => {
      if (isIOS) {
        LayoutAnimation.configureNext(
          LayoutAnimation.create(event.duration || 250, LayoutAnimation.Types.keyboard, LayoutAnimation.Properties.opacity),
        );
      }
    };

    const showSub = Keyboard.addListener(showEvent, (event) => {
      animate(event);
      setHeight(event.endCoordinates?.height ?? 0);
    });
    const hideSub = Keyboard.addListener(hideEvent, (event) => {
      animate(event);
      setHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  return height;
}
