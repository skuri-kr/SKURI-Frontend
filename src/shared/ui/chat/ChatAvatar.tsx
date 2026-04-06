import React from 'react';
import {StyleSheet, Text, View} from 'react-native';

import {
  DefaultProfileAvatar,
  SkeletonImage,
} from '@/shared/design-system/components';
import {RADIUS} from '@/shared/design-system/tokens';

import type {ChatAvatarViewData} from './types';

interface ChatAvatarProps {
  avatar?: ChatAvatarViewData
  size?: number
}

export const ChatAvatar = ({
  avatar,
  size = 36,
}: ChatAvatarProps) => {
  if (!avatar) {
    return <View style={[styles.avatarSpacer, {height: size, width: size}]} />;
  }

  if (avatar.kind === 'image') {
    return (
      <SkeletonImage
        source={{uri: avatar.uri}}
        style={[styles.avatarImage, {borderRadius: size / 2, height: size, width: size}]}
      />
    );
  }

  if (avatar.kind === 'icon') {
    return (
      <DefaultProfileAvatar
        backgroundColor={avatar.backgroundColor}
        iconColor={avatar.iconColor}
        iconName={avatar.iconName}
        size={size}
      />
    );
  }

  return (
    <View
      style={[
        styles.avatarCircle,
        {
          backgroundColor: avatar.backgroundColor,
          borderRadius: size / 2,
          height: size,
          width: size,
        },
      ]}>
      <Text style={[styles.avatarLabel, {color: avatar.textColor}]}>
        {avatar.label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  avatarCircle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    borderRadius: RADIUS.pill,
  },
  avatarLabel: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  avatarSpacer: {
    height: 36,
    width: 36,
  },
});
