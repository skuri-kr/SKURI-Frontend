import React, {PropsWithChildren} from 'react';
import {
  AccessibilityInfo,
  Animated,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {COLORS, RADIUS, SHADOWS, SPACING} from '@/shared/design-system/tokens';
import {useKeyboardInset} from '@/shared/hooks/useKeyboardInset';

interface ToastContextValue {
  showToast: (message: string) => void;
}

interface ToastState {
  id: number;
  message: string;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

const TOAST_VISIBLE_DURATION = 2000;
const TOAST_ANIMATION_DURATION = 180;

export const ToastProvider = ({children}: PropsWithChildren) => {
  const insets = useSafeAreaInsets();
  const {height: keyboardHeight} = useKeyboardInset();
  const [toast, setToast] = React.useState<ToastState | null>(null);
  const animation = React.useRef(new Animated.Value(0)).current;
  const toastIdRef = React.useRef(0);
  const dismissTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const clearDismissTimeout = React.useCallback(() => {
    if (dismissTimeoutRef.current) {
      clearTimeout(dismissTimeoutRef.current);
      dismissTimeoutRef.current = null;
    }
  }, []);

  React.useEffect(
    () => () => {
      clearDismissTimeout();
      animation.stopAnimation();
    },
    [animation, clearDismissTimeout],
  );

  const showToast = React.useCallback(
    (nextMessage: string) => {
      const normalizedMessage = nextMessage.trim();

      if (!normalizedMessage) {
        return;
      }

      clearDismissTimeout();
      animation.stopAnimation();
      animation.setValue(0);
      toastIdRef.current += 1;
      setToast({id: toastIdRef.current, message: normalizedMessage});

      if (Platform.OS === 'ios') {
        AccessibilityInfo.announceForAccessibility(normalizedMessage);
      }

      Animated.timing(animation, {
        duration: TOAST_ANIMATION_DURATION,
        toValue: 1,
        useNativeDriver: true,
      }).start();

      dismissTimeoutRef.current = setTimeout(() => {
        Animated.timing(animation, {
          duration: TOAST_ANIMATION_DURATION,
          toValue: 0,
          useNativeDriver: true,
        }).start(({finished}) => {
          if (finished) {
            setToast(null);
          }
        });
      }, TOAST_VISIBLE_DURATION);
    },
    [animation, clearDismissTimeout],
  );

  const contextValue = React.useMemo(() => ({showToast}), [showToast]);
  const bottomOffset =
    Platform.OS === 'ios' && keyboardHeight > 0
      ? keyboardHeight + SPACING.lg
      : insets.bottom + SPACING.lg;

  return (
    <ToastContext.Provider value={contextValue}>
      <View style={styles.root}>
        {children}
        {toast ? (
          <View
            pointerEvents="none"
            style={[styles.overlay, {bottom: bottomOffset}]}>
            <Animated.View
              accessibilityLiveRegion={
                Platform.OS === 'android' ? 'polite' : undefined
              }
              key={toast.id}
              style={[
                styles.toast,
                {
                  opacity: animation,
                  transform: [
                    {
                      translateY: animation.interpolate({
                        inputRange: [0, 1],
                        outputRange: [12, 0],
                      }),
                    },
                  ],
                },
              ]}>
              <Text style={styles.message}>{toast.message}</Text>
            </Animated.View>
          </View>
        ) : null}
      </View>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextValue => {
  const context = React.useContext(ToastContext);

  if (!context) {
    throw new Error('useToast는 ToastProvider 안에서 사용해야 합니다.');
  }

  return context;
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  overlay: {
    alignItems: 'center',
    left: SPACING.lg,
    position: 'absolute',
    right: SPACING.lg,
    zIndex: 100,
  },
  toast: {
    backgroundColor: COLORS.text.primary,
    borderRadius: RADIUS.lg,
    maxWidth: 560,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    ...SHADOWS.raised,
  },
  message: {
    color: COLORS.text.inverse,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    textAlign: 'center',
  },
});
