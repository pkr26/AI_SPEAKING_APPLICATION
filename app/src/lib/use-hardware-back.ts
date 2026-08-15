import { useFocusEffect } from 'expo-router';
import { useCallback, useLayoutEffect, useRef } from 'react';
import { BackHandler } from 'react-native';

/**
 * Runs `handler` for Android hardware back presses while the screen is
 * focused. Returning true consumes the press; returning false lets the
 * navigator pop as usual. The stack's `gestureEnabled: false` only covers iOS
 * gestures, so cached questions and active recordings must be protected from
 * the hardware button here. iOS has no hardware back button; its BackHandler
 * subscription is a no-op.
 */
export function useHardwareBack(handler: () => boolean): void {
  const handlerRef = useRef(handler);

  useLayoutEffect(() => {
    handlerRef.current = handler;
  });

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () =>
        handlerRef.current(),
      );
      return () => subscription.remove();
    }, []),
  );
}
