import React from 'react';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import {
  ActivityIndicator,
  Alert,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';

import {DefaultProfileAvatar} from '@/shared/design-system/components';
import {
  COLORS,
  RADIUS,
  SHADOWS,
  SPACING,
} from '@/shared/design-system/tokens';

import type {TaxiChatSettlementMemberViewData} from '../model/taxiChatViewData';

interface TaxiPartyMemberSheetProps {
  actionInFlightId: string | null;
  canKick: boolean;
  members: TaxiChatSettlementMemberViewData[];
  onClose: () => void;
  onKick: (memberId: string) => Promise<void>;
  visible: boolean;
}

export const TaxiPartyMemberSheet = ({
  actionInFlightId,
  canKick,
  members,
  onClose,
  onKick,
  visible,
}: TaxiPartyMemberSheetProps) => {
  const insets = useSafeAreaInsets();
  const modalRef = React.useRef<BottomSheetModal>(null);

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

  const confirmKick = React.useCallback(
    (member: TaxiChatSettlementMemberViewData) => {
      Alert.alert(
        '파티원 내보내기',
        `${member.label} 님을 파티에서 내보낼까요?`,
        [
          {text: '취소', style: 'cancel'},
          {
            text: '내보내기',
            style: 'destructive',
            onPress: () => {
              onKick(member.id).catch(error => {
                Alert.alert(
                  '내보내기 실패',
                  error instanceof Error && error.message
                    ? error.message
                    : '파티원을 내보내지 못했습니다.',
                );
              });
            },
          },
        ],
      );
    },
    [onKick],
  );

  return (
    <BottomSheetModal
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.background}
      enableDynamicSizing
      enablePanDownToClose
      handleIndicatorStyle={styles.handleIndicator}
      onDismiss={() => {
        if (visible) {
          onClose();
        }
      }}
      ref={modalRef}
      style={styles.sheet}>
      <BottomSheetScrollView
        contentContainerStyle={[
          styles.content,
          {paddingBottom: insets.bottom + SPACING.xxl},
        ]}>
        <Text style={styles.title}>
          {canKick ? '파티원 관리' : '파티원 목록'}
        </Text>
        <Text style={styles.description}>현재 {members.length}명이 참여 중이에요.</Text>

        <View style={styles.memberList}>
          {members.map(member => {
            const kickPending = actionInFlightId === `kick:${member.id}`;
            const showKick = canKick && !member.isLeader && !member.isCurrentUser;
            return (
              <View key={member.id} style={styles.memberRow}>
                {member.photoUrl ? (
                  <Image source={{uri: member.photoUrl}} style={styles.avatar} />
                ) : (
                  <DefaultProfileAvatar size={42} />
                )}
                <View style={styles.memberText}>
                  <Text style={styles.memberName}>
                    {member.label}
                    {member.isCurrentUser ? ' (나)' : ''}
                  </Text>
                  <Text style={styles.memberRole}>
                    {member.isLeader ? '파티장' : '파티원'}
                  </Text>
                </View>
                {showKick ? (
                  <TouchableOpacity
                    accessibilityLabel={`${member.label} 내보내기`}
                    accessibilityRole="button"
                    activeOpacity={0.82}
                    disabled={Boolean(actionInFlightId)}
                    onPress={() => confirmKick(member)}
                    style={styles.kickButton}>
                    {kickPending ? (
                      <ActivityIndicator color={COLORS.status.danger} size="small" />
                    ) : (
                      <>
                        <Icon color={COLORS.status.danger} name="person-remove-outline" size={16} />
                        <Text style={styles.kickButtonText}>내보내기</Text>
                      </>
                    )}
                  </TouchableOpacity>
                ) : null}
              </View>
            );
          })}
        </View>
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
  avatar: {borderRadius: 21, height: 42, width: 42},
  content: {paddingHorizontal: SPACING.lg},
  description: {color: COLORS.text.secondary, fontSize: 13, marginTop: 2},
  handleIndicator: {backgroundColor: COLORS.border.default},
  kickButton: {
    alignItems: 'center',
    backgroundColor: COLORS.accent.pinkSoft,
    borderRadius: RADIUS.pill,
    flexDirection: 'row',
    gap: 4,
    minHeight: 34,
    paddingHorizontal: SPACING.sm,
  },
  kickButtonText: {color: COLORS.status.danger, fontSize: 12, fontWeight: '700'},
  memberList: {gap: SPACING.sm, marginTop: SPACING.lg},
  memberName: {color: COLORS.text.primary, fontSize: 15, fontWeight: '700'},
  memberRole: {color: COLORS.text.muted, fontSize: 12, marginTop: 2},
  memberRow: {
    alignItems: 'center',
    borderColor: COLORS.border.subtle,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: SPACING.sm,
    minHeight: 68,
    paddingHorizontal: SPACING.md,
  },
  memberText: {flex: 1},
  sheet: {...SHADOWS.raised},
  title: {color: COLORS.text.primary, fontSize: 20, fontWeight: '800'},
});
