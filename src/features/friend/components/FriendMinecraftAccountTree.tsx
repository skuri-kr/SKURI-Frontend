import React from 'react';
import {Image, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import Animated from 'react-native-reanimated';

import {ToneBadge} from '@/shared/design-system/components/ToneBadge';
import {COLORS, RADIUS, SPACING} from '@/shared/design-system/tokens';
import {
  enteringTransitions,
  exitingTransitions,
  layoutTransitions,
} from '@/shared/design-system/motion';

import type {FriendMinecraftAccount, FriendMinecraftSelfAccount} from '../model/friend';

const getAvatarUri = (avatarUuid: string | null) => {
  const avatarKey = avatarUuid && !avatarUuid.startsWith('be:')
    ? avatarUuid
    : '8667ba71b85a4004af54457a9734eed7';

  return `https://minotar.net/avatar/${avatarKey}/48`;
};

const editionLabel = (edition: FriendMinecraftAccount['edition']) =>
  edition === 'JAVA' ? 'Java' : 'Bedrock';

const AccountRow = ({
  account,
  child = false,
  label,
  tone,
}: {
  account: FriendMinecraftAccount;
  child?: boolean;
  label: string;
  tone: 'green' | 'gray';
}) => (
  <View style={[styles.accountRow, child ? styles.childAccountRow : undefined]}>
    {child ? <View style={styles.treeConnector} /> : null}
    <Image source={{uri: getAvatarUri(account.avatarUuid)}} style={styles.avatar} />
    <View style={styles.accountContent}>
      <View style={styles.nameRow}>
        <Text numberOfLines={1} style={styles.gameName}>{account.gameName}</Text>
        <ToneBadge label={label} tone={tone} />
      </View>
      <Text style={styles.edition}>{editionLabel(account.edition)}</Text>
    </View>
  </View>
);

export const FriendMinecraftAccountTree = ({account}: {account: FriendMinecraftSelfAccount}) => {
  const hasFriendAccounts = account.friendAccounts.length > 0;
  const [expanded, setExpanded] = React.useState(true);

  return (
    <Animated.View layout={layoutTransitions.cardExpand()} style={styles.group}>
      <TouchableOpacity
        accessibilityLabel={`${account.gameName} 대표 계정${hasFriendAccounts ? (expanded ? ' 접기' : ' 펼치기') : ''}`}
        accessibilityRole={hasFriendAccounts ? 'button' : undefined}
        accessibilityState={hasFriendAccounts ? {expanded} : undefined}
        activeOpacity={hasFriendAccounts ? 0.82 : 1}
        disabled={!hasFriendAccounts}
        onPress={() => setExpanded(current => !current)}>
        <AccountRow account={account} label="대표 계정" tone="green" />
        {hasFriendAccounts ? (
          <Icon
            color={COLORS.text.muted}
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={19}
            style={styles.chevron}
          />
        ) : null}
      </TouchableOpacity>
      {hasFriendAccounts && expanded ? (
        <Animated.View
          entering={enteringTransitions.fadeInDown()}
          exiting={exitingTransitions.fadeOutUp()}
          style={styles.children}>
          {account.friendAccounts.map(friendAccount => (
            <AccountRow
              account={friendAccount}
              child
              key={`${account.gameName}-${friendAccount.gameName}-${friendAccount.edition}`}
              label="친구 계정"
              tone="gray"
            />
          ))}
        </Animated.View>
      ) : null}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  group: {
    backgroundColor: COLORS.background.surface,
    borderColor: COLORS.border.subtle,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  accountRow: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: 64,
    paddingHorizontal: SPACING.md,
  },
  childAccountRow: {
    backgroundColor: COLORS.background.subtle,
    paddingLeft: SPACING.xxl,
  },
  children: {
    borderTopColor: COLORS.border.subtle,
    borderTopWidth: 1,
  },
  treeConnector: {
    borderBottomColor: COLORS.border.default,
    borderBottomWidth: 1,
    borderLeftColor: COLORS.border.default,
    borderLeftWidth: 1,
    height: 16,
    marginRight: SPACING.sm,
    marginTop: -16,
    width: SPACING.sm,
  },
  avatar: {borderRadius: RADIUS.sm, height: 40, width: 40},
  accountContent: {flex: 1, marginLeft: SPACING.md},
  nameRow: {alignItems: 'center', flexDirection: 'row', gap: SPACING.sm},
  gameName: {color: COLORS.text.primary, flexShrink: 1, fontSize: 14, fontWeight: '700', lineHeight: 20},
  edition: {color: COLORS.text.muted, fontSize: 12, lineHeight: 18, marginTop: 1},
  chevron: {position: 'absolute', right: SPACING.md, top: 22},
});
