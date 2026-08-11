import React from 'react';
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {COLORS, RADIUS, SPACING} from '../../../shared/design-system/tokens';

interface MinecraftStackHeaderProps {
  onPressBack: () => void;
  rightAccessory?: React.ReactNode;
  title: string;
}

const HEADER_BAR_HEIGHT = 56;

export const MinecraftStackHeader = ({
  onPressBack,
  rightAccessory,
  title,
}: MinecraftStackHeaderProps) => {
  const insets = useSafeAreaInsets();
  const {width} = useWindowDimensions();
  const tileSize = insets.top + HEADER_BAR_HEIGHT;
  const tileCount = Math.ceil(width / tileSize) + 1;

  return (
    <View style={[styles.container, {paddingTop: insets.top}]}>
      <View pointerEvents="none" style={styles.backgroundLayer}>
        {Array.from({length: tileCount}).map((_, index) => (
          <Image
            key={`grass-tile-${index}`}
            source={require('../../../../assets/images/minecraft/grass.png')}
            style={{height: tileSize, width: tileSize}}
          />
        ))}
        <LinearGradient
          colors={['rgba(249, 250, 251, 0)', COLORS.background.page]}
          pointerEvents="none"
          style={[styles.bottomGradient, {height: 12}]}
        />
      </View>

      <View style={styles.bar}>
        <TouchableOpacity
          accessibilityLabel="뒤로 가기"
          accessibilityRole="button"
          activeOpacity={0.82}
          onPress={onPressBack}
          style={styles.backButton}>
          <Icon color={COLORS.text.primary} name="arrow-back" size={22} />
        </TouchableOpacity>

        <View style={styles.content}>
          <Text style={styles.title}>{title}</Text>
          {rightAccessory ? (
            <View style={styles.rightAccessory}>{rightAccessory}</View>
          ) : null}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    paddingHorizontal: SPACING.lg,
    position: 'relative',
  },
  backgroundLayer: {
    flexDirection: 'row',
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  bottomGradient: {
    bottom: 0,
    position: 'absolute',
    left: 0,
    right: 0,
  },
  bar: {
    alignItems: 'center',
    flexDirection: 'row',
    height: HEADER_BAR_HEIGHT,
  },
  content: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  backButton: {
    alignItems: 'center',
    height: 36,
    justifyContent: 'center',
    width: 36,
    marginRight: SPACING.md,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: RADIUS.pill,
  },
  title: {
    color: COLORS.text.inverse,
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 28,
    
  },
  rightAccessory: {
    marginLeft: SPACING.md,
  },
});
