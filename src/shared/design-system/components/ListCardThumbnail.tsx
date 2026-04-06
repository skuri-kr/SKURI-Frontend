import React from 'react';
import {Image, StyleSheet, View} from 'react-native';

import {COLORS, RADIUS} from '../tokens';
import {SkeletonImage} from './SkeletonImage';

const DEFAULT_SIZE = 76;
const prefetchedThumbnailUrlCache = new Set<string>();

interface ListCardThumbnailProps {
  accessibilityLabel?: string;
  size?: number;
  uri: string;
}

export const ListCardThumbnail = ({
  accessibilityLabel,
  size = DEFAULT_SIZE,
  uri,
}: ListCardThumbnailProps) => {
  const [isPrefetched, setIsPrefetched] = React.useState(
    prefetchedThumbnailUrlCache.has(uri),
  );

  React.useEffect(() => {
    let isCancelled = false;

    if (prefetchedThumbnailUrlCache.has(uri)) {
      setIsPrefetched(true);
      return;
    }

    setIsPrefetched(false);

    Image.prefetch(uri)
      .then(success => {
        if (isCancelled || !success) {
          return;
        }

        prefetchedThumbnailUrlCache.add(uri);
        setIsPrefetched(true);
      })
      .catch(() => undefined);

    return () => {
      isCancelled = true;
    };
  }, [uri]);

  return (
    <View
      style={[
        styles.frame,
        {
          height: size,
          width: size,
        },
      ]}>
      <SkeletonImage
        accessibilityLabel={accessibilityLabel}
        disableSkeleton={isPrefetched}
        resizeMode="cover"
        source={{uri}}
        style={styles.image}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  frame: {
    backgroundColor: COLORS.background.subtle,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
  },
  image: {
    height: '100%',
    width: '100%',
  },
});
