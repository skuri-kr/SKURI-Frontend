import React from 'react';
import {
  GestureResponderEvent,
  Image,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';

import {
  ImageLightboxModal,
  SkeletonImage,
  type ImageLightboxItem,
} from '@/shared/design-system/components';
import {COLORS, RADIUS} from '@/shared/design-system/tokens';

const MAX_LANDSCAPE_WIDTH = 220;
const MAX_PORTRAIT_WIDTH = 180;

export const MessageImageBubble = ({
  onLongPress,
  uri,
}: {
  onLongPress?: (event: GestureResponderEvent) => void;
  uri: string;
}) => {
  const [aspectRatio, setAspectRatio] = React.useState(1);
  const [viewerVisible, setViewerVisible] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;

    Image.getSize(
      uri,
      (width, height) => {
        if (cancelled || width <= 0 || height <= 0) {
          return;
        }

        setAspectRatio(width / height);
      },
      () => {
        if (!cancelled) {
          setAspectRatio(1);
        }
      },
    );

    return () => {
      cancelled = true;
    };
  }, [uri]);

  const resolvedWidth =
    aspectRatio >= 1 ? MAX_LANDSCAPE_WIDTH : MAX_PORTRAIT_WIDTH;
  const imageItems = React.useMemo<ImageLightboxItem[]>(
    () => [
      {
        aspectRatio,
        id: uri,
        source: {uri},
      },
    ],
    [aspectRatio, uri],
  );

  return (
    <>
      <TouchableOpacity
        accessibilityLabel="이미지 메시지 크게 보기"
        accessibilityRole="button"
        activeOpacity={0.92}
        delayLongPress={220}
        onLongPress={onLongPress}
        onPress={() => {
          setViewerVisible(true);
        }}>
        <SkeletonImage
          resizeMode="cover"
          source={{uri}}
          style={[
            styles.image,
            {
              aspectRatio,
              width: resolvedWidth,
            },
          ]}
        />
      </TouchableOpacity>

      <ImageLightboxModal
        images={imageItems}
        initialIndex={0}
        onRequestClose={() => {
          setViewerVisible(false);
        }}
        visible={viewerVisible}
      />
    </>
  );
};

const styles = StyleSheet.create({
  image: {
    backgroundColor: COLORS.background.subtle,
    borderRadius: RADIUS.md,
    maxHeight: 260,
    minHeight: 140,
    borderWidth: 1,
    borderColor: COLORS.border.image,
  },
});
