import React, {useEffect} from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/Ionicons';

import {
  COLORS,
  RADIUS,
  SHADOWS,
  SPACING,
  TYPOGRAPHY,
} from '@/shared/design-system/tokens';

type Props = {
  invitationInviterName?: string;
  visible: boolean;
  requesterName: string;
  onAccept: () => void | Promise<void>;
  onDecline: () => void | Promise<void>;
  onRequestClose: () => void;
};

const ANIMATION_DURATION = 220;

export const JoinRequestModal: React.FC<Props> = ({
  invitationInviterName,
  visible,
  requesterName,
  onAccept,
  onDecline,
  onRequestClose,
}) => {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(visible ? 1 : 0, {
      duration: ANIMATION_DURATION,
    });
  }, [progress, visible]);

  const handleAction = React.useCallback(
    (callback: () => void | Promise<void>) => {
      progress.value = withTiming(0, {
        duration: ANIMATION_DURATION,
      });

      setTimeout(() => {
        Promise.resolve(callback()).catch(() => undefined);
      }, ANIMATION_DURATION);
    },
    [progress],
  );

  const backdropAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 1]),
  }));

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 1]),
    transform: [
      {translateY: interpolate(progress.value, [0, 1], [20, 0])},
      {scale: interpolate(progress.value, [0, 1], [0.96, 1])},
    ],
  }));

  return (
    <Modal
      animationType="none"
      onRequestClose={onRequestClose}
      statusBarTranslucent
      transparent
      visible={visible}>
      <Animated.View style={[styles.backdrop, backdropAnimatedStyle]}>
        <Animated.View style={[styles.card, cardAnimatedStyle]}>
          <View style={styles.header}>
            <View style={styles.badge}>
              <Text style={styles.badgeLabel}>새 동승 요청</Text>
            </View>

            <View style={styles.heroIcon}>
              <Icon
                color={COLORS.brand.primaryStrong}
                name="person-add-outline"
                size={26}
              />
            </View>

            <Text style={styles.title}>동승 요청이 도착했어요</Text>
            <Text style={styles.description}>
              {invitationInviterName
                ? `${invitationInviterName}님이 ${requesterName}님을 파티에 초대했어요.`
                : `${requesterName}님이 현재 파티에 참여하고 싶어 해요.`}
            </Text>
            <Text style={styles.caption}>
              요청을 수락하면 파티원으로 즉시 합류됩니다.
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.actionGroup}>
            <TouchableOpacity
              accessibilityRole="button"
              activeOpacity={0.88}
              onPress={() => {
                handleAction(onDecline);
              }}
              style={styles.secondaryButton}>
              <Icon
                color={COLORS.text.secondary}
                name="close-outline"
                size={18}
              />
              <Text style={styles.secondaryButtonLabel}>거절</Text>
            </TouchableOpacity>

            <TouchableOpacity
              accessibilityRole="button"
              activeOpacity={0.9}
              onPress={() => {
                handleAction(onAccept);
              }}
              style={styles.primaryButton}>
              <Icon
                color={COLORS.text.inverse}
                name="checkmark-outline"
                size={18}
              />
              <Text style={styles.primaryButtonLabel}>수락</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  actionGroup: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  backdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(17, 24, 39, 0.44)',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: SPACING.xxl,
  },
  badge: {
    alignSelf: 'center',
    backgroundColor: COLORS.brand.primaryTint,
    borderColor: COLORS.border.accent,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    marginBottom: SPACING.md,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeLabel: {
    ...TYPOGRAPHY.caption1,
    color: COLORS.brand.primaryStrong,
    fontWeight: '700',
  },
  caption: {
    ...TYPOGRAPHY.caption1,
    color: COLORS.text.tertiary,
    textAlign: 'center',
  },
  card: {
    backgroundColor: COLORS.background.surface,
    borderColor: COLORS.border.subtle,
    borderRadius: 24,
    borderWidth: 1,
    maxWidth: 360,
    padding: SPACING.xxl,
    width: '100%',
    ...SHADOWS.raised,
  },
  description: {
    ...TYPOGRAPHY.body1,
    color: COLORS.text.secondary,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  divider: {
    backgroundColor: COLORS.border.subtle,
    height: 1,
    marginBottom: SPACING.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  heroIcon: {
    alignItems: 'center',
    backgroundColor: COLORS.brand.primarySoft,
    borderRadius: 28,
    height: 56,
    justifyContent: 'center',
    marginBottom: SPACING.md,
    width: 56,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: COLORS.brand.primary,
    borderRadius: RADIUS.md,
    flex: 1,
    flexDirection: 'row',
    gap: SPACING.sm,
    height: 52,
    justifyContent: 'center',
  },
  primaryButtonLabel: {
    ...TYPOGRAPHY.body1,
    color: COLORS.text.inverse,
    fontWeight: '700',
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: COLORS.background.page,
    borderColor: COLORS.border.default,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: SPACING.sm,
    height: 52,
    justifyContent: 'center',
  },
  secondaryButtonLabel: {
    ...TYPOGRAPHY.body1,
    color: COLORS.text.secondary,
    fontWeight: '600',
  },
  title: {
    ...TYPOGRAPHY.title2,
    color: COLORS.text.primary,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
});
