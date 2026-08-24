import React from 'react';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

import {COLORS, RADIUS, SHADOWS, SPACING} from '@/shared/design-system/tokens';

import type {FriendInviteContext} from './FriendInviteSheet';

interface FriendInviteTargetSheetProps {
  onClose: () => void;
  onSelect: (context: FriendInviteContext) => void;
  targets: FriendInviteContext[];
  visible: boolean;
}

export const FriendInviteTargetSheet = ({
  onClose,
  onSelect,
  targets,
  visible,
}: FriendInviteTargetSheetProps) => {
  const modalRef = React.useRef<BottomSheetModal>(null);
  const pendingTargetRef = React.useRef<FriendInviteContext | null>(null);

  React.useEffect(() => {
    if (visible) {
      modalRef.current?.present();
    } else {
      modalRef.current?.dismiss();
    }
  }, [visible]);

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

  return (
    <BottomSheetModal
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.background}
      enableDynamicSizing
      enablePanDownToClose
      handleIndicatorStyle={styles.handleIndicator}
      onDismiss={() => {
        const pendingTarget = pendingTargetRef.current;
        pendingTargetRef.current = null;
        if (pendingTarget) {
          onSelect(pendingTarget);
          return;
        }
        if (visible) {
          onClose();
        }
      }}
      ref={modalRef}
      style={styles.sheet}>
      <BottomSheetScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>초대할 공개 채팅방</Text>
        <Text style={styles.description}>친구를 초대할 방을 선택해 주세요.</Text>
        <View style={styles.targetList}>
          {targets.map(target => (
            <TouchableOpacity
              accessibilityRole="button"
              activeOpacity={0.82}
              key={target.targetId}
              onPress={() => {
                pendingTargetRef.current = target;
                onClose();
              }}
              style={styles.targetRow}>
              <View style={styles.iconContainer}>
                <Icon color={COLORS.brand.primaryStrong} name="chatbubbles-outline" size={20} />
              </View>
              <Text numberOfLines={2} style={styles.targetName}>{target.targetName}</Text>
              <Icon color={COLORS.text.muted} name="chevron-forward" size={18} />
            </TouchableOpacity>
          ))}
        </View>
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
};

const styles = StyleSheet.create({
  background: {backgroundColor: COLORS.background.surface, borderTopLeftRadius: RADIUS.lg, borderTopRightRadius: RADIUS.lg},
  content: {paddingBottom: SPACING.xxl, paddingHorizontal: SPACING.lg},
  description: {color: COLORS.text.secondary, fontSize: 13, lineHeight: 20, marginTop: 2},
  handleIndicator: {backgroundColor: COLORS.border.default},
  iconContainer: {alignItems: 'center', backgroundColor: COLORS.brand.primaryTint, borderRadius: 18, height: 36, justifyContent: 'center', width: 36},
  sheet: {...SHADOWS.raised},
  targetList: {gap: SPACING.sm, marginTop: SPACING.lg},
  targetName: {color: COLORS.text.primary, flex: 1, fontSize: 15, fontWeight: '700', lineHeight: 21},
  targetRow: {alignItems: 'center', borderColor: COLORS.border.subtle, borderRadius: RADIUS.md, borderWidth: 1, flexDirection: 'row', gap: SPACING.md, minHeight: 64, paddingHorizontal: SPACING.md},
  title: {color: COLORS.text.primary, fontSize: 20, fontWeight: '800', lineHeight: 28},
});
