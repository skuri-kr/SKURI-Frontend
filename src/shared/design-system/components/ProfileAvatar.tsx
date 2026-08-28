import React from 'react';
import {Image, StyleSheet} from 'react-native';

import {COLORS} from '../tokens';

import {DefaultProfileAvatar} from './DefaultProfileAvatar';

interface ProfileAvatarProps {
  accessibilityLabel?: string;
  fallbackBackgroundColor?: string;
  photoUrl?: string | null;
  size?: number;
}

export const ProfileAvatar = ({
  accessibilityLabel = '프로필 이미지',
  fallbackBackgroundColor,
  photoUrl,
  size = 28,
}: ProfileAvatarProps) => {
  const [hasImageError, setHasImageError] = React.useState(false);

  React.useEffect(() => {
    setHasImageError(false);
  }, [photoUrl]);

  if (!photoUrl || hasImageError) {
    return (
      <DefaultProfileAvatar
        backgroundColor={fallbackBackgroundColor ?? COLORS.border.default}
        size={size}
      />
    );
  }

  return (
    <Image
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="image"
      onError={() => setHasImageError(true)}
      source={{uri: photoUrl}}
      style={[
        styles.image,
        {borderRadius: size / 2, height: size, width: size},
      ]}
    />
  );
};

const styles = StyleSheet.create({
  image: {
    backgroundColor: COLORS.background.subtle,
  },
});
