import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

import {ToneBadge} from '@/shared/design-system/components';
import {COLORS, RADIUS, SHADOWS, SPACING} from '@/shared/design-system/tokens';

import type {
  FriendInvitation,
  FriendInvitationExpiryReason,
} from '../model/friend';
import {FriendAvatar} from './FriendAvatar';

interface FriendInvitationCardProps {
  highlighted?: boolean;
  invitation: FriendInvitation;
  loading: boolean;
  onAccept: () => void;
  onDecline: () => void;
  onDelete: () => void;
}

const EXPIRY_REASON_LABELS: Record<FriendInvitationExpiryReason, string> = {
  ALREADY_JOINED: '이미 참여해 초대가 종료되었어요.',
  CAPACITY_FULL: '정원이 마감되어 초대가 만료되었어요.',
  ELIGIBILITY_CHANGED: '입장 자격이 변경되어 초대가 만료되었어요.',
  INVITATION_TIMEOUT: '수락 기한이 지나 초대가 만료되었어요.',
  INVITER_LEFT: '초대한 친구가 나가 초대가 만료되었어요.',
  MEMBER_WITHDRAWN: '탈퇴한 회원과 관련된 초대예요.',
  RELATIONSHIP_UNAVAILABLE: '친구 관계가 변경되어 초대가 만료되었어요.',
  TARGET_UNAVAILABLE: '대상이 종료되거나 이용할 수 없어졌어요.',
};

const PARTY_STATUS_LABELS = {
  ARRIVED: '도착 완료',
  CLOSED: '모집 마감',
  ENDED: '종료',
  OPEN: '모집 중',
} as const;

const DEADLINE_FORMATTER = new Intl.DateTimeFormat('ko-KR', {
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  month: 'numeric',
});

const getTargetLabel = (invitation: FriendInvitation) => {
  if (!invitation.target) {
    return '더 이상 확인할 수 없는 대상';
  }

  if (invitation.target.type === 'PARTY') {
    return `${invitation.target.departureName} → ${invitation.target.destinationName}`;
  }

  return invitation.target.name;
};

const getTargetMeta = (invitation: FriendInvitation) => {
  if (!invitation.target) {
    return null;
  }

  if (invitation.target.type === 'PARTY') {
    return `${PARTY_STATUS_LABELS[invitation.target.status]} · ${invitation.target.currentMembers}/${invitation.target.maxMembers}명`;
  }

  if (!invitation.expiresAt) {
    return null;
  }

  const deadline = new Date(invitation.expiresAt);
  return Number.isNaN(deadline.getTime())
    ? null
    : `${DEADLINE_FORMATTER.format(deadline)}까지 수락`;
};

export const FriendInvitationCard = ({
  highlighted = false,
  invitation,
  loading,
  onAccept,
  onDecline,
  onDelete,
}: FriendInvitationCardProps) => {
  const expired = invitation.status === 'EXPIRED';
  const inviterName = invitation.inviter?.nickname ?? '알 수 없는 친구';
  const expiryMessage =
    (invitation.expiryReason
      ? (EXPIRY_REASON_LABELS as Partial<Record<string, string>>)[
          invitation.expiryReason
        ]
      : undefined) ?? '초대가 만료되었어요.';
  const targetMeta = getTargetMeta(invitation);

  return (
    <View
      accessibilityLabel={highlighted ? '알림에서 선택한 초대' : undefined}
      style={[styles.card, highlighted ? styles.highlightedCard : null]}>
      <View style={styles.header}>
        <FriendAvatar photoUrl={invitation.inviter?.photoUrl ?? null} size={46} />
        <View style={styles.headerText}>
          <Text style={styles.inviterName}>{inviterName}님의 초대</Text>
          <Text style={styles.department}>
            {invitation.inviter?.department ?? '학과 정보 없음'}
          </Text>
        </View>
        <ToneBadge
          label={invitation.type === 'PARTY' ? '택시파티' : '공개 채팅방'}
          tone={invitation.type === 'PARTY' ? 'green' : 'blue'}
        />
      </View>

      <View style={styles.targetRow}>
        <Icon
          color={COLORS.text.secondary}
          name={invitation.type === 'PARTY' ? 'car-outline' : 'chatbubbles-outline'}
          size={19}
        />
        <View style={styles.targetText}>
          <Text style={styles.targetLabel}>{getTargetLabel(invitation)}</Text>
          {!expired && targetMeta ? (
            <Text style={styles.targetMeta}>{targetMeta}</Text>
          ) : null}
        </View>
      </View>
      {expired ? <Text style={styles.expiryText}>{expiryMessage}</Text> : null}

      {expired ? (
        <TouchableOpacity
          accessibilityRole="button"
          activeOpacity={0.82}
          disabled={loading}
          onPress={onDelete}
          style={styles.deleteButton}>
          {loading ? (
            <ActivityIndicator color={COLORS.text.secondary} size="small" />
          ) : (
            <Text style={styles.deleteButtonText}>목록에서 지우기</Text>
          )}
        </TouchableOpacity>
      ) : (
        <View style={styles.actions}>
          <TouchableOpacity
            accessibilityRole="button"
            activeOpacity={0.82}
            disabled={loading}
            onPress={onDecline}
            style={[styles.actionButton, styles.declineButton]}>
            <Text style={styles.declineButtonText}>거절</Text>
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            activeOpacity={0.82}
            disabled={loading}
            onPress={onAccept}
            style={[styles.actionButton, styles.acceptButton]}>
            {loading ? (
              <ActivityIndicator color={COLORS.text.inverse} size="small" />
            ) : (
              <Text style={styles.acceptButtonText}>수락</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  acceptButton: {backgroundColor: COLORS.brand.primary},
  acceptButtonText: {color: COLORS.text.inverse, fontSize: 14, fontWeight: '700'},
  actionButton: {alignItems: 'center', borderRadius: RADIUS.md, flex: 1, height: 42, justifyContent: 'center'},
  actions: {flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.md},
  card: {backgroundColor: COLORS.background.surface, borderRadius: RADIUS.lg, padding: SPACING.lg, ...SHADOWS.card},
  declineButton: {backgroundColor: COLORS.background.subtle},
  declineButtonText: {color: COLORS.text.secondary, fontSize: 14, fontWeight: '700'},
  deleteButton: {alignItems: 'center', alignSelf: 'flex-end', minHeight: 36, justifyContent: 'center', marginTop: SPACING.sm, paddingHorizontal: SPACING.sm},
  deleteButtonText: {color: COLORS.text.secondary, fontSize: 13, fontWeight: '700'},
  department: {color: COLORS.text.muted, fontSize: 12, lineHeight: 18},
  expiryText: {color: COLORS.accent.orange, fontSize: 12, lineHeight: 18, marginTop: SPACING.sm},
  header: {alignItems: 'center', flexDirection: 'row', gap: SPACING.sm},
  headerText: {flex: 1},
  inviterName: {color: COLORS.text.primary, fontSize: 15, fontWeight: '800', lineHeight: 21},
  highlightedCard: {borderColor: COLORS.brand.primary, borderWidth: 1},
  targetLabel: {color: COLORS.text.primary, flex: 1, fontSize: 14, fontWeight: '700', lineHeight: 20},
  targetMeta: {color: COLORS.text.muted, fontSize: 12, lineHeight: 18, marginTop: 2},
  targetRow: {alignItems: 'center', backgroundColor: COLORS.background.subtle, borderRadius: RADIUS.md, flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.md, padding: SPACING.md},
  targetText: {flex: 1},
});
