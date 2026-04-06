import React from 'react';
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import Animated, {
  FadeInDown,
  FadeOutUp,
  LinearTransition,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import {
  DefaultProfileAvatar,
  ToneBadge,
} from '@/shared/design-system/components';
import type {
  TaxiHomeAvatarViewData,
  TaxiHomePartyCardViewData,
} from '../model/taxiHomeViewData';
import {
  COLORS,
  RADIUS,
  SHADOWS,
  SPACING,
} from '@/shared/design-system/tokens';

interface TaxiHomePartyCardProps {
  expanded: boolean;
  onPressCard: (party: TaxiHomePartyCardViewData) => void;
  onPressJoinAction: (party: TaxiHomePartyCardViewData) => void;
  party: TaxiHomePartyCardViewData;
}

const EXPANDED_BORDER_COLOR = '#86EFAC';
const DEFAULT_CARD_BORDER_COLOR = COLORS.border.subtle;

const renderAvatarLabel = (avatar: TaxiHomeAvatarViewData) => {
  if (avatar.kind !== 'label' || !avatar.label) {
    return '?';
  }

  return avatar.label.slice(0, 1);
};

const buildAvatarStyle = (
  baseStyle: ViewStyle,
  backgroundColor: string,
): ViewStyle[] => [baseStyle, {backgroundColor}];

const AvatarCircle = ({
  avatar,
  size,
  style,
  textStyle,
}: {
  avatar: TaxiHomeAvatarViewData;
  size: number;
  style: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}) => {
  if (avatar.kind === 'image') {
    return (
      <Image
        source={{uri: avatar.uri}}
        style={[style as any, styles.avatarImage, {height: size, width: size}]}
      />
    );
  }

  if (avatar.kind === 'icon') {
    return (
      <DefaultProfileAvatar
        backgroundColor={avatar.backgroundColor}
        iconColor={avatar.iconColor}
        size={size}
        style={style}
      />
    );
  }

  return (
    <View style={buildAvatarStyle(style as ViewStyle, avatar.backgroundColor)}>
      <Text style={[textStyle, {color: avatar.textColor}]}>
        {renderAvatarLabel(avatar)}
      </Text>
    </View>
  );
};

const getJoinActionIconName = (
  state: TaxiHomePartyCardViewData['joinAction']['state'],
) => {
  switch (state) {
    case 'joined':
      return 'chatbubble-ellipses';
    case 'pending':
      return 'time-outline';
    case 'unavailable':
      return 'refresh-outline';
    default:
      return 'car-sport';
  }
};

const isActiveStatusTone = (
  statusTone: TaxiHomePartyCardViewData['statusTone'],
) => statusTone === 'active';

const formatTagLabel = (tag: string) => {
  const trimmed = tag.trim();

  if (!trimmed) {
    return '';
  }

  return trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
};

export const TaxiHomePartyCard = ({
  expanded,
  onPressCard,
  onPressJoinAction,
  party,
}: TaxiHomePartyCardProps) => {
  const expandable = isActiveStatusTone(party.statusTone);
  const cardProgress = useSharedValue(expanded && expandable ? 1 : 0);

  React.useEffect(() => {
    cardProgress.value = withTiming(expanded && expandable ? 1 : 0, {
      duration: 200,
    });
  }, [cardProgress, expanded, expandable]);

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(
      cardProgress.value,
      [0, 1],
      [DEFAULT_CARD_BORDER_COLOR, EXPANDED_BORDER_COLOR],
    ),
  }));

  const chevronAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        rotate: `${interpolate(cardProgress.value, [0, 1], [0, 180])}deg`,
      },
    ],
  }));

  const handlePressCard = React.useCallback(() => {
    if (!expandable) {
      return;
    }

    onPressCard(party);
  }, [expandable, onPressCard, party]);

  const leaderAvatarStyle = React.useMemo(
    () =>
      party.leaderAvatar.kind === 'label'
        ? buildAvatarStyle(styles.leaderAvatar, party.leaderAvatar.backgroundColor)
        : styles.leaderAvatar,
    [party.leaderAvatar],
  );
  const leaderAvatarLabelStyle = React.useMemo(
    () =>
      party.leaderAvatar.kind === 'label'
        ? [styles.leaderAvatarLabel, {color: party.leaderAvatar.textColor}]
        : styles.leaderAvatarLabel,
    [party.leaderAvatar],
  );

  return (
    <Animated.View
      layout={LinearTransition.springify().damping(18).stiffness(190)}
      style={[
        styles.card,
        !isActiveStatusTone(party.statusTone) ? styles.cardInactive : null,
        cardAnimatedStyle,
      ]}>
      <TouchableOpacity
        accessibilityRole={expandable ? 'button' : undefined}
        activeOpacity={expandable ? 0.9 : 1}
        disabled={!expandable}
        onPress={handlePressCard}
        style={styles.cardMain}>
        <View style={styles.topRow}>
          <View>
            <Text style={styles.caption}>출발 시간</Text>
            <Text style={styles.departureTime}>{party.departureTimeLabel}</Text>
          </View>

          <View style={styles.topRowRight}>
            <View
              style={[
                styles.statusPill,
                party.statusTone === 'active'
                  ? styles.statusPillActive
                  : party.statusTone === 'inactive-danger'
                    ? styles.statusPillInactiveDanger
                    : styles.statusPillInactive,
              ]}>
              <Text
                style={[
                  styles.statusLabel,
                  party.statusTone === 'active'
                    ? styles.statusLabelActive
                    : party.statusTone === 'inactive-danger'
                      ? styles.statusLabelInactiveDanger
                      : styles.statusLabelInactive,
                ]}>
                {party.statusLabel}
              </Text>
            </View>

            {expandable ? (
              <Animated.View style={chevronAnimatedStyle}>
                <Icon
                  color={COLORS.text.muted}
                  name="chevron-down"
                  size={18}
                />
              </Animated.View>
            ) : null}
          </View>
        </View>

        <View style={styles.routeCard}>
          <View style={styles.routeSide}>
            <View style={styles.routeIconStart}>
              <Icon
                color={COLORS.brand.primaryStrong}
                name="location"
                size={12}
              />
            </View>
            <Text numberOfLines={1} style={styles.routeText}>
              {party.departureLabel}
            </Text>
          </View>

          <Icon
            color={COLORS.border.default}
            name="arrow-forward-outline"
            size={14}
          />

          <View style={[styles.routeSide, styles.routeSideEnd]}>
            <Text numberOfLines={1} style={styles.routeText}>
              {party.destinationLabel}
            </Text>
            <View style={styles.routeIconEnd}>
              <Icon
                color={COLORS.accent.blue}
                name="business-outline"
                size={12}
              />
            </View>
          </View>
        </View>

        {party.tags.length > 0 || party.detail ? (
          <View style={styles.infoSection}>
            {party.tags.length > 0 ? (
              <View style={styles.tagRow}>
                {party.tags.map(tag => {
                  const label = formatTagLabel(tag);

                  if (!label) {
                    return null;
                  }

                  return (
                    <ToneBadge
                      key={`${party.id}-${label}`}
                      label={label}
                      tone="green"
                    />
                  );
                })}
              </View>
            ) : null}

            {party.detail ? (
              <View style={styles.detailPanel}>
                <Icon
                  color={COLORS.brand.primaryStrong}
                  name="chatbox-ellipses-outline"
                  size={16}
                />
                <Text numberOfLines={2} style={styles.detailText}>
                  {party.detail}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}

        <View style={styles.footer}>
          <View style={styles.footerLeft}>
            <AvatarCircle
              avatar={party.leaderAvatar}
              size={28}
              style={leaderAvatarStyle}
              textStyle={leaderAvatarLabelStyle}
            />

            <View style={styles.leaderMeta}>
              <Text numberOfLines={1} style={styles.leaderName}>
                {party.leaderName}
              </Text>
              <Text style={styles.leaderRole}>{party.leaderRoleLabel}</Text>
            </View>

            <View style={styles.footerDivider} />

            <View style={styles.memberSummary}>
              <View style={styles.memberAvatarStack}>
                {party.participantAvatars.map((avatar, index) => {
                  const memberAvatarStyle = buildAvatarStyle(
                    styles.memberAvatar,
                    avatar.kind === 'label'
                      ? avatar.backgroundColor
                      : COLORS.border.default,
                  );
                  const memberAvatarStyleWithOffset =
                    index > 0
                      ? [...memberAvatarStyle, styles.memberAvatarStackOffset]
                      : memberAvatarStyle;
                  const memberAvatarLabelStyle = [
                    styles.memberAvatarLabel,
                    {
                      color:
                        avatar.kind === 'label'
                          ? avatar.textColor
                          : COLORS.text.muted,
                    },
                  ];

                  return (
                    <AvatarCircle
                      avatar={avatar}
                      key={avatar.id}
                      size={24}
                      style={[
                        ...memberAvatarStyleWithOffset,
                        {
                          zIndex: party.participantAvatars.length - index,
                        },
                      ]}
                      textStyle={memberAvatarLabelStyle}
                    />
                  );
                })}
              </View>
              <Text style={styles.memberSummaryLabel}>
                {party.memberSummaryLabel}
              </Text>
            </View>
          </View>

          <View style={styles.priceGroup}>
            <Text style={styles.priceCaption}>예상 N빵 요금</Text>
            <Text style={styles.priceLabel}>{party.estimatedFareLabel}</Text>
          </View>
        </View>
      </TouchableOpacity>

      {expandable && expanded ? (
        <Animated.View
          entering={FadeInDown.duration(180)}
          exiting={FadeOutUp.duration(140)}
          layout={LinearTransition.springify().damping(18).stiffness(190)}
          style={styles.expandedSection}>
          <View style={styles.expandedDivider} />

          <TouchableOpacity
            accessibilityRole="button"
            activeOpacity={0.88}
            onPress={() => onPressJoinAction(party)}
            style={styles.requestButton}>
            <Icon
              color={COLORS.text.inverse}
              name={getJoinActionIconName(party.joinAction.state)}
              size={16}
            />
            <Text style={styles.requestButtonLabel}>
              {party.joinAction.label}
            </Text>
          </TouchableOpacity>

          {party.joinAction.helperText ? (
            <Text style={styles.requestHelperText}>
              {party.joinAction.helperText}
            </Text>
          ) : null}
        </Animated.View>
      ) : null}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.background.surface,
    borderColor: DEFAULT_CARD_BORDER_COLOR,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    ...SHADOWS.card,
  },
  cardInactive: {
    opacity: 0.5,
  },
  cardMain: {
    padding: SPACING.lg,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  topRowRight: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  caption: {
    color: COLORS.text.muted,
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 2,
  },
  departureTime: {
    color: COLORS.text.primary,
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 28,
  },
  statusPill: {
    alignItems: 'center',
    borderRadius: RADIUS.pill,
    justifyContent: 'center',
    minHeight: 28,
    paddingHorizontal: 12,
  },
  statusPillActive: {
    backgroundColor: COLORS.brand.primaryTint,
  },
  statusPillInactive: {
    backgroundColor: COLORS.background.subtle,
  },
  statusPillInactiveDanger: {
    backgroundColor: '#FEE2E2',
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
  statusLabelActive: {
    color: COLORS.brand.primaryStrong,
  },
  statusLabelInactive: {
    color: COLORS.text.tertiary,
  },
  statusLabelInactiveDanger: {
    color: COLORS.status.danger,
  },
  routeCard: {
    alignItems: 'center',
    backgroundColor: COLORS.background.page,
    borderRadius: RADIUS.md,
    flexDirection: 'row',
    gap: SPACING.sm,
    minHeight: 44,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
  },
  routeSide: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 6,
  },
  routeSideEnd: {
    justifyContent: 'flex-end',
  },
  routeText: {
    color: COLORS.text.primary,
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  routeIconStart: {
    alignItems: 'center',
    backgroundColor: COLORS.brand.primarySoft,
    borderRadius: RADIUS.pill,
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  routeIconEnd: {
    alignItems: 'center',
    backgroundColor: COLORS.accent.blueSoft,
    borderRadius: RADIUS.pill,
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  infoSection: {
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  detailPanel: {
    alignItems: 'flex-start',
    backgroundColor: COLORS.brand.primaryTint,
    borderRadius: RADIUS.md,
    flexDirection: 'row',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  detailText: {
    color: COLORS.text.secondary,
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
  footer: {
    alignItems: 'center',
    borderTopColor: COLORS.border.subtle,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.lg,
    paddingTop: 13,
  },
  footerLeft: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    marginRight: SPACING.md,
    minWidth: 0,
  },
  leaderAvatar: {
    alignItems: 'center',
    borderRadius: RADIUS.pill,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  leaderAvatarLabel: {
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
  leaderMeta: {
    marginLeft: SPACING.sm,
    minWidth: 42,
  },
  leaderName: {
    color: COLORS.text.strong,
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
  },
  leaderRole: {
    color: COLORS.text.muted,
    fontSize: 12,
    lineHeight: 16,
  },
  footerDivider: {
    backgroundColor: COLORS.border.default,
    height: 24,
    marginHorizontal: SPACING.sm,
    width: 1,
  },
  memberSummary: {
    alignItems: 'center',
    flexDirection: 'row',
    flexShrink: 1,
  },
  memberAvatarStack: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  memberAvatar: {
    alignItems: 'center',
    borderColor: COLORS.background.surface,
    borderRadius: RADIUS.pill,
    borderWidth: 2,
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  memberAvatarStackOffset: {
    marginLeft: -6,
  },
  memberAvatarLabel: {
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 14,
  },
  avatarImage: {
    borderRadius: RADIUS.pill,
  },
  memberSummaryLabel: {
    color: COLORS.text.tertiary,
    fontSize: 12,
    lineHeight: 16,
    marginLeft: 6,
  },
  priceGroup: {
    alignItems: 'flex-end',
    minWidth: 60,
  },
  priceCaption: {
    color: COLORS.text.muted,
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 2,
  },
  priceLabel: {
    color: COLORS.text.primary,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  expandedSection: {
    paddingBottom: SPACING.lg,
    paddingHorizontal: SPACING.lg,
  },
  expandedDivider: {
    backgroundColor: COLORS.brand.primarySoft,
    height: 1,
    marginBottom: SPACING.lg,
  },
  requestButton: {
    alignItems: 'center',
    backgroundColor: COLORS.brand.primary,
    borderRadius: RADIUS.md,
    flexDirection: 'row',
    gap: SPACING.sm,
    height: 56,
    justifyContent: 'center',
    shadowColor: '#22C55E',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  requestButtonLabel: {
    color: COLORS.text.inverse,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 21,
  },
  requestHelperText: {
    color: COLORS.text.muted,
    fontSize: 12,
    lineHeight: 16,
    paddingTop: SPACING.sm,
    textAlign: 'center',
  },
});
