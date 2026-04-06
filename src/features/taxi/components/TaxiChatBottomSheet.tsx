import React from 'react';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  type BottomSheetScrollViewMethods,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import {
  type NativeSyntheticEvent,
  type NativeScrollEvent,
  StyleSheet,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {
  COLORS,
  RADIUS,
  SHADOWS,
  SPACING,
} from '@/shared/design-system/tokens';
import {useKeyboardInset} from '@/shared/hooks';

interface TaxiChatBottomSheetProps {
  children: React.ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  enableContentPanningGesture?: boolean;
  onClose: () => void;
  onScroll?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  scrollRef?: React.RefObject<BottomSheetScrollViewMethods | null>;
  visible: boolean;
}

export const TaxiChatBottomSheet = ({
  children,
  contentStyle,
  enableContentPanningGesture = true,
  onClose,
  onScroll,
  scrollRef,
  visible,
}: TaxiChatBottomSheetProps) => {
  const insets = useSafeAreaInsets();
  const {height: keyboardHeight} = useKeyboardInset();
  const {height: windowHeight} = useWindowDimensions();
  const modalRef = React.useRef<BottomSheetModal>(null);

  const renderBackdrop = React.useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        opacity={0.4}
        pressBehavior="close"
      />
    ),
    [],
  );

  React.useEffect(() => {
    const modal = modalRef.current;

    if (!modal) {
      return;
    }

    if (visible) {
      modal.present();
      return;
    }

    modal.dismiss();
  }, [visible]);

  const handleDismiss = React.useCallback(() => {
    if (visible) {
      onClose();
    }
  }, [onClose, visible]);

  return (
    <BottomSheetModal
      android_keyboardInputMode="adjustResize"
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.background}
      enableContentPanningGesture={enableContentPanningGesture}
      enableDynamicSizing
      enableOverDrag={false}
      enablePanDownToClose
      handleComponent={null}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      maxDynamicContentSize={Math.max(0, windowHeight - insets.top)}
      onDismiss={handleDismiss}
      ref={modalRef}
      stackBehavior="replace"
      style={styles.sheet}>
      <BottomSheetScrollView
        contentContainerStyle={[
          styles.content,
          {paddingBottom: insets.bottom + SPACING.lg + keyboardHeight},
          contentStyle,
        ]}
        keyboardShouldPersistTaps="handled"
        onScroll={onScroll}
        ref={scrollRef}
        showsVerticalScrollIndicator={false}>
        {children}
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
};

const styles = StyleSheet.create({
  background: {
    backgroundColor: COLORS.background.surface,
    borderTopLeftRadius: RADIUS.lg,
    borderTopRightRadius: RADIUS.lg,
  },
  content: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
  },
  sheet: {
    ...SHADOWS.raised,
  },
});
