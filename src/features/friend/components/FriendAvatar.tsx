import React from 'react';
import {Image, StyleSheet} from 'react-native';

import {DefaultProfileAvatar} from '@/shared/design-system/components';

interface FriendAvatarProps {
  photoUrl: string | null;
  size?: number;
}

export const FriendAvatar = ({photoUrl, size = 48}: FriendAvatarProps) => {
  if (!photoUrl) {
    return <DefaultProfileAvatar size={size} />;
  }

  return (
    <Image
      source={{uri: photoUrl}}
      style={[styles.image, {borderRadius: size / 2, height: size, width: size}]}
    />
  );
};

const styles = StyleSheet.create({
  image: {
    backgroundColor: '#E5E7EB',
  },
});
