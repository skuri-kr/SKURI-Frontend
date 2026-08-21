import React from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

import {COLORS, SPACING} from '@/shared/design-system/tokens';

import type {FriendSummary} from '../model/friend';
import {FriendAvatar} from './FriendAvatar';

interface FriendRowProps {
  disabled?: boolean;
  friend: FriendSummary;
  onPress: () => void;
  onPressFavorite: () => void;
  showIdentifier?: boolean;
}

const getMinecraftSummary = (friend: FriendSummary) => {
  const minecraftAccountCount = friend.minecraftAccountCount ?? 0;

  if (friend.primaryMinecraftGameName) {
    return minecraftAccountCount > 1
      ? `${friend.primaryMinecraftGameName} 외 ${minecraftAccountCount - 1}개`
      : friend.primaryMinecraftGameName;
  }

  return minecraftAccountCount > 0
    ? `마인크래프트 계정 ${minecraftAccountCount}개`
    : undefined;
};

export const FriendRow = ({
  disabled = false,
  friend,
  onPress,
  onPressFavorite,
  showIdentifier = false,
}: FriendRowProps) => (
  <View style={styles.row}>
    <TouchableOpacity
      accessibilityLabel={`${friend.nickname} 친구 상세 보기`}
      accessibilityRole="button"
      activeOpacity={0.82}
      disabled={disabled}
      onPress={onPress}
      style={styles.main}>
      <FriendAvatar photoUrl={friend.photoUrl} />
      <View style={styles.content}>
        <Text numberOfLines={1} style={styles.name}>{friend.nickname}</Text>
        <Text numberOfLines={1} style={styles.department}>
          {friend.department || '학과 정보 없음'}
        </Text>
        {getMinecraftSummary(friend) ? (
          <Text numberOfLines={1} style={styles.minecraftSummary}>
            {getMinecraftSummary(friend)}
          </Text>
        ) : null}
        {showIdentifier ? (
          <Text style={styles.identifier}>
            식별 코드 · {friend.id.slice(-6).toUpperCase()}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
    <TouchableOpacity
      accessibilityLabel={`${friend.nickname} 즐겨찾기 ${friend.favorite ? '해제' : '추가'}`}
      accessibilityRole="button"
      activeOpacity={0.82}
      disabled={disabled}
      onPress={onPressFavorite}
      style={styles.favoriteButton}>
      <Icon
        color={friend.favorite ? COLORS.accent.yellow : COLORS.text.muted}
        name={friend.favorite ? 'star' : 'star-outline'}
        size={22}
      />
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: 72,
    paddingHorizontal: SPACING.lg,
  },
  main: {alignItems: 'center', flex: 1, flexDirection: 'row'},
  content: {flex: 1, marginLeft: SPACING.md},
  name: {color: COLORS.text.primary, fontSize: 15, fontWeight: '700', lineHeight: 22},
  department: {color: COLORS.text.muted, fontSize: 12, lineHeight: 18, marginTop: 2},
  minecraftSummary: {color: COLORS.brand.primaryStrong, fontSize: 11, lineHeight: 16, marginTop: 1},
  identifier: {color: COLORS.text.tertiary, fontSize: 11, lineHeight: 16, marginTop: 2},
  favoriteButton: {alignItems: 'center', height: 44, justifyContent: 'center', width: 44},
});
