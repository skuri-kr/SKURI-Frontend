import React from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

import {COLORS, RADIUS, SHADOWS, SPACING} from '../tokens';

interface PageHeaderAction {
  accessibilityLabel?: string;
  iconName?: string;
  iconSize?: number;
  onPress: () => void;
}

interface PageHeaderProps {
  actionAccessibilityLabel?: string;
  actionIconName?: string;
  actionIconSize?: number;
  actions?: PageHeaderAction[];
  onPressAction?: () => void;
  subtitle: string;
  title: string;
}

export const PageHeader = ({
  actionAccessibilityLabel = '열기',
  actionIconName = 'search-outline',
  actionIconSize = 22,
  actions,
  onPressAction,
  subtitle,
  title,
}: PageHeaderProps) => {
  const resolvedActions = React.useMemo<PageHeaderAction[]>(() => {
    if (actions?.length) {
      return actions;
    }

    if (!onPressAction) {
      return [];
    }

    return [
      {
        accessibilityLabel: actionAccessibilityLabel,
        iconName: actionIconName,
        iconSize: actionIconSize,
        onPress: onPressAction,
      },
    ];
  }, [
    actionAccessibilityLabel,
    actionIconName,
    actionIconSize,
    actions,
    onPressAction,
  ]);

  return (
    <View style={styles.container}>
      <View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>

      {resolvedActions.length > 0 ? (
        <View style={styles.actions}>
          {resolvedActions.map((action, index) => (
            <TouchableOpacity
              key={`${action.accessibilityLabel ?? action.iconName ?? 'action'}-${index}`}
              accessibilityLabel={action.accessibilityLabel ?? '열기'}
              accessibilityRole="button"
              activeOpacity={0.85}
              onPress={action.onPress}
              style={styles.actionButton}>
              <Icon
                color={COLORS.text.secondary}
                name={action.iconName ?? 'search-outline'}
                size={action.iconSize ?? 22}
              />
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: SPACING.md,
    paddingTop: SPACING.xl,
  },
  title: {
    color: COLORS.text.primary,
    fontSize: 30,
    fontWeight: '700',
    lineHeight: 36,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    color: COLORS.text.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  actions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: SPACING.sm,
    marginLeft: SPACING.lg,
  },
  actionButton: {
    alignItems: 'center',
    backgroundColor: COLORS.background.surface,
    borderRadius: RADIUS.pill,
    height: 40,
    justifyContent: 'center',
    width: 40,
    ...SHADOWS.card,
  },
});
