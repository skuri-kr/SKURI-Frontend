import React from 'react';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
  type BottomSheetBackdropProps,
  type BottomSheetModalProps,
} from '@gorhom/bottom-sheet';
import {
  StyleSheet,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {COLORS, RADIUS, SHADOWS, SPACING} from '@/shared/design-system/tokens';

interface TimetableBottomSheetProps {
  children: React.ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
  onClose: () => void;
  snapPoints: Array<string | number>;
  visible: boolean;
  keyboardBehavior?: BottomSheetModalProps['keyboardBehavior'];
}

export const TimetableBottomSheet = ({
  children,
  contentContainerStyle,
  onClose,
  snapPoints,
  visible,
  keyboardBehavior = 'interactive',
}: TimetableBottomSheetProps) => {
  const insets = useSafeAreaInsets();
  const {height: windowHeight} = useWindowDimensions();
  const modalRef = React.useRef<BottomSheetModal>(null);
  const maxSheetHeight = Math.max(
    0,
    windowHeight - insets.top,
  );

  const renderBackdrop = React.useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        opacity={0.14}
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
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.background}
      enableDynamicSizing={false}
      enableOverDrag={false}
      enablePanDownToClose
      handleIndicatorStyle={styles.handleIndicator}
      handleStyle={styles.handle}
      keyboardBehavior={keyboardBehavior}
      keyboardBlurBehavior="restore"
      maxDynamicContentSize={maxSheetHeight}
      onDismiss={handleDismiss}
      ref={modalRef}
      snapPoints={snapPoints}
      stackBehavior="replace"
      style={styles.sheet}
      topInset={insets.top}>
      <BottomSheetView
        style={[
          styles.content,
          {paddingBottom: insets.bottom},
          contentContainerStyle,
        ]}>
        {children}
      </BottomSheetView>
    </BottomSheetModal>
  );
};

const styles = StyleSheet.create({
  sheet: {
    ...SHADOWS.raised,
  },
  background: {
    backgroundColor: COLORS.background.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  handle: {
    paddingBottom: 4,
    paddingTop: 12,
  },
  handleIndicator: {
    backgroundColor: COLORS.border.default,
    borderRadius: RADIUS.pill,
    height: 4,
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.xl,
  },
});
