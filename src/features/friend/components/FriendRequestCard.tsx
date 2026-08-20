import React from 'react';
import {ActivityIndicator, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

import {COLORS, RADIUS, SHADOWS, SPACING} from '@/shared/design-system/tokens';
import {formatKoreanCompactDateTime} from '@/shared/lib/date/datetime';

import type {FriendRequestItem} from '../model/friend';
import {FriendAvatar} from './FriendAvatar';

interface FriendRequestCardProps {
  completedAction?: 'ACCEPTED' | 'CANCELED' | 'DECLINED';
  loading?: boolean;
  mode: 'received' | 'sent';
  onAccept?: () => void;
  onCancel?: () => void;
  onDecline?: () => void;
  request: FriendRequestItem;
  showIdentifier?: boolean;
}

export const FriendRequestCard = ({
  completedAction,
  loading = false,
  mode,
  onAccept,
  onCancel,
  onDecline,
  request,
  showIdentifier = false,
}: FriendRequestCardProps) => (
  <View style={styles.card}>
    <View style={styles.header}>
      <FriendAvatar photoUrl={request.friend.photoUrl} />
      <View style={styles.content}>
        <Text style={styles.name}>{request.friend.nickname}</Text>
        <Text style={styles.department}>
          {request.friend.department || '학과 정보 없음'}
        </Text>
        {showIdentifier ? (
          <Text style={styles.identifier}>
            식별 코드 · {request.friend.id.slice(-6).toUpperCase()}
          </Text>
        ) : null}
      </View>
    </View>
    <Text style={styles.expiry}>
      {mode === 'received'
        ? `${formatKoreanCompactDateTime(request.expiresAt)}까지 응답할 수 있어요.`
        : `${formatKoreanCompactDateTime(request.expiresAt)}까지 대기 중이에요.`}
    </Text>
    {completedAction ? (
      <View accessibilityLiveRegion="polite" style={styles.completedAction}>
        <Icon color={COLORS.brand.primary} name="checkmark-circle" size={18} />
        <Text style={styles.completedActionText}>
          {completedAction === 'ACCEPTED'
            ? '수락했어요'
            : completedAction === 'DECLINED'
              ? '거절했어요'
              : '요청을 취소했어요'}
        </Text>
      </View>
    ) : mode === 'received' ? (
      <View style={styles.actions}>
        <TouchableOpacity
          accessibilityRole="button"
          activeOpacity={0.82}
          disabled={loading}
          onPress={onDecline}
          style={[styles.button, styles.secondaryButton]}>
          <Text style={styles.secondaryText}>거절</Text>
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          activeOpacity={0.82}
          disabled={loading}
          onPress={onAccept}
          style={[styles.button, styles.primaryButton]}>
          {loading ? <ActivityIndicator color={COLORS.text.inverse} /> : <Text style={styles.primaryText}>수락</Text>}
        </TouchableOpacity>
      </View>
    ) : (
      <TouchableOpacity
        accessibilityRole="button"
        activeOpacity={0.82}
        disabled={loading}
        onPress={onCancel}
        style={[styles.cancelButton, loading ? styles.loadingButton : null]}>
        {loading ? <ActivityIndicator color={COLORS.text.secondary} /> : <Text style={styles.cancelText}>요청 취소</Text>}
      </TouchableOpacity>
    )}
  </View>
);

const styles = StyleSheet.create({
  card: {backgroundColor: COLORS.background.surface, borderRadius: RADIUS.lg, padding: SPACING.lg, ...SHADOWS.card},
  header: {alignItems: 'center', flexDirection: 'row'},
  content: {flex: 1, marginLeft: SPACING.md},
  name: {color: COLORS.text.primary, fontSize: 15, fontWeight: '700', lineHeight: 22},
  department: {color: COLORS.text.muted, fontSize: 12, lineHeight: 18, marginTop: 2},
  identifier: {color: COLORS.text.tertiary, fontSize: 11, lineHeight: 16, marginTop: 2},
  expiry: {color: COLORS.text.tertiary, fontSize: 12, lineHeight: 18, marginTop: SPACING.md},
  actions: {flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.lg},
  button: {alignItems: 'center', borderRadius: RADIUS.md, flex: 1, height: 40, justifyContent: 'center'},
  primaryButton: {backgroundColor: COLORS.brand.primary},
  secondaryButton: {backgroundColor: COLORS.background.subtle},
  primaryText: {color: COLORS.text.inverse, fontSize: 14, fontWeight: '700'},
  secondaryText: {color: COLORS.text.secondary, fontSize: 14, fontWeight: '700'},
  cancelButton: {alignItems: 'center', backgroundColor: COLORS.background.subtle, borderRadius: RADIUS.md, height: 40, justifyContent: 'center', marginTop: SPACING.lg},
  cancelText: {color: COLORS.text.secondary, fontSize: 14, fontWeight: '700'},
  completedAction: {alignItems: 'center', backgroundColor: COLORS.background.subtle, borderRadius: RADIUS.md, flexDirection: 'row', gap: SPACING.xs, height: 40, justifyContent: 'center', marginTop: SPACING.lg},
  completedActionText: {color: COLORS.brand.primaryStrong, fontSize: 14, fontWeight: '700'},
  loadingButton: {opacity: 0.7},
});
