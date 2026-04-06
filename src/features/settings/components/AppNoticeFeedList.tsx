import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

import {
  SkeletonImage,
  StateCard,
} from '@/shared/design-system/components';
import {
  COLORS,
  RADIUS,
  SHADOWS,
  SPACING,
} from '@/shared/design-system/tokens';

import type {AppNoticeFeedViewData} from '../model/appNoticeViewData';
import {AppNoticeBadge} from './AppNoticeBadge';

type AppNoticeFeedListProps = {
  data: AppNoticeFeedViewData;
  onPressItem: (noticeId: string) => void;
};

const APP_NOTICE_EMPTY_TITLE = '앱 공지사항이 없습니다';
const APP_NOTICE_EMPTY_DESCRIPTION =
  '등록된 앱 공지사항이 생기면 여기에서 확인할 수 있어요.';

export const AppNoticeFeedList = ({
  data,
  onPressItem,
}: AppNoticeFeedListProps) => {
  if (data.items.length === 0) {
    return (
      <StateCard
        description={APP_NOTICE_EMPTY_DESCRIPTION}
        icon={
          <Icon
            color={COLORS.border.default}
            name="notifications-outline"
            size={28}
          />
        }
        title={APP_NOTICE_EMPTY_TITLE}
      />
    );
  }

  return (
    <View style={styles.list}>
      {data.items.map(item => (
        <TouchableOpacity
          key={item.id}
          activeOpacity={0.88}
          onPress={() => onPressItem(item.id)}
          style={styles.card}>
          {item.previewImage ? (
            <SkeletonImage source={item.previewImage} style={styles.heroImage} />
          ) : null}

          <View style={styles.content}>
            <View style={styles.metaRow}>
              <View style={styles.badgeRow}>
                {item.badges.map(badge => (
                  <AppNoticeBadge key={badge.id} badge={badge} />
                ))}
              </View>
              <Text style={styles.metaText}>{item.publishedLabel}</Text>
            </View>

            <Text style={styles.title}>{item.title}</Text>
            <Text numberOfLines={2} style={styles.summary}>
              {item.summary}
            </Text>

            <View style={styles.footerRow}>
              {item.viewCountLabel ? (
                <View style={styles.viewCountRow}>
                  <Icon
                    color={COLORS.text.muted}
                    name="eye-outline"
                    size={12}
                  />
                  <Text style={styles.viewCountLabel}>{item.viewCountLabel}</Text>
                </View>
              ) : <View />}

              <Icon
                color={COLORS.text.muted}
                name="chevron-forward-outline"
                size={16}
              />
            </View>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  list: {
    gap: 12,
  },
  card: {
    backgroundColor: COLORS.background.surface,
    borderColor: COLORS.border.subtle,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    overflow: 'hidden',
    ...SHADOWS.card,
  },
  heroImage: {
    height: 144,
    width: '100%',
  },
  content: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: 14,
  },
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  metaText: {
    color: COLORS.text.muted,
    fontSize: 10,
    lineHeight: 15,
  },
  title: {
    color: COLORS.text.primary,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    marginBottom: 6,
  },
  summary: {
    color: COLORS.text.tertiary,
    fontSize: 12,
    lineHeight: 20,
  },
  footerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  viewCountRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  viewCountLabel: {
    color: COLORS.text.muted,
    fontSize: 10,
    lineHeight: 15,
  },
});
