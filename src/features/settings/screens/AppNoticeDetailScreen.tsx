import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation, useRoute} from '@react-navigation/native';
import type {RouteProp} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/Ionicons';

import type {CampusStackParamList} from '@/app/navigation/types';
import {
  ArticleDetailSkeleton,
  StackHeader,
  StateCard,
} from '@/shared/design-system/components';
import {
  COLORS,
  RADIUS,
  SHADOWS,
  SPACING,
} from '@/shared/design-system/tokens';
import {useScreenView} from '@/shared/hooks/useScreenView';

import {AppNoticeBadge} from '../components/AppNoticeBadge';
import {AppNoticeHeroCarousel} from '../components/AppNoticeHeroCarousel';
import {useAppNoticeDetailData} from '../hooks/useAppNoticeDetailData';

type AppNoticeDetailNavigationProp = NativeStackNavigationProp<
  CampusStackParamList,
  'AppNoticeDetail'
>;
type AppNoticeDetailRouteProp = RouteProp<
  CampusStackParamList,
  'AppNoticeDetail'
>;

export const AppNoticeDetailScreen = () => {
  useScreenView();

  const navigation = useNavigation<AppNoticeDetailNavigationProp>();
  const route = useRoute<AppNoticeDetailRouteProp>();
  const {data, error, loading, reload} = useAppNoticeDetailData(
    route.params?.noticeId,
  );
  const hasGallery = (data?.galleryImages.length ?? 0) > 0;

  const renderLoadingState = () => (
    <ArticleDetailSkeleton showCommentCard={false} />
  );

  const renderErrorState = () => (
    <View style={styles.stateContainer}>
      <StateCard
        actionLabel="다시 시도"
        description={
          error ?? '앱 공지사항을 찾지 못했습니다. 잠시 후 다시 시도해주세요.'
        }
        icon={
          <Icon
            color={COLORS.accent.orange}
            name="alert-circle-outline"
            size={26}
          />
        }
        onPressAction={reload}
        title="앱 공지사항을 열 수 없습니다"
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <StackHeader
        onPressBack={() => navigation.goBack()}
        title="앱 공지사항"
      />

      {loading && !data ? renderLoadingState() : null}
      {!loading && (!data || error) ? renderErrorState() : null}

      {data ? (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          {data.galleryImages.length > 0 ? (
            <AppNoticeHeroCarousel images={data.galleryImages} />
          ) : null}

          <View
            style={[
              styles.bodyCard,
              hasGallery ? styles.bodyCardWithGallery : styles.bodyCardStandalone,
            ]}>
            <View style={styles.badgeRow}>
              {data.badges.map(badge => (
                <AppNoticeBadge key={badge.id} badge={badge} />
              ))}
            </View>

            <Text style={styles.title}>{data.title}</Text>

            <View style={styles.metaRow}>
              <View style={styles.authorRow}>
                <View style={styles.authorIcon}>
                  <Icon
                    color={COLORS.brand.primaryStrong}
                    name="shield-checkmark"
                    size={14}
                  />
                </View>
                <Text style={styles.authorLabel}>{data.authorLabel}</Text>
              </View>

              <Text style={styles.metaSeparator}>|</Text>
              <Text style={styles.metaLabel}>{data.publishedLabel}</Text>
              {data.viewCountLabel ? (
                <>
                  <Text style={styles.metaSeparator}>|</Text>

                  <View style={styles.viewCountRow}>
                    <Icon
                      color={COLORS.text.muted}
                      name="eye-outline"
                      size={14}
                    />
                    <Text style={styles.metaLabel}>{data.viewCountLabel}</Text>
                  </View>
                </>
              ) : null}
            </View>

            <View style={styles.divider} />

            <View style={styles.paragraphGroup}>
              {data.bodyParagraphs.map((paragraph, index) => (
                <Text key={`${data.id}-paragraph-${index}`} style={styles.bodyText}>
                  {paragraph}
                </Text>
              ))}
            </View>
          </View>
        </ScrollView>
      ) : null}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.background.page,
    flex: 1,
  },
  stateContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  bodyCard: {
    backgroundColor: COLORS.background.surface,
    minHeight: 320,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.xl,
    ...SHADOWS.card,
  },
  bodyCardWithGallery: {
    borderTopLeftRadius: RADIUS.lg,
    borderTopRightRadius: RADIUS.lg,
    marginTop: -1,
  },
  bodyCardStandalone: {
    borderRadius: RADIUS.lg,
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  title: {
    color: COLORS.text.primary,
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 30,
    marginBottom: SPACING.md,
  },
  metaRow: {
    alignItems: 'center',
    columnGap: SPACING.sm,
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 6,
  },
  authorRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  authorIcon: {
    alignItems: 'center',
    backgroundColor: COLORS.brand.primaryTint,
    borderRadius: RADIUS.pill,
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  authorLabel: {
    color: COLORS.brand.primaryStrong,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
  },
  metaSeparator: {
    color: COLORS.border.default,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 18,
  },
  metaLabel: {
    color: COLORS.text.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  viewCountRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  divider: {
    backgroundColor: COLORS.border.subtle,
    height: 1,
    marginVertical: SPACING.lg,
  },
  paragraphGroup: {
    gap: SPACING.md,
  },
  bodyText: {
    color: COLORS.text.strong,
    fontSize: 14,
    lineHeight: 28,
  },
});
