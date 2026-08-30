import React from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  useFocusEffect,
  type NavigationProp,
  type ParamListBase,
  useNavigation,
} from '@react-navigation/native';
import Animated from 'react-native-reanimated';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';

import {
  useRefetchOnFocus,
} from '@/app/data-freshness/dataInvalidation';
import {
  CAMPUS_HOME_INVALIDATION_KEY,
} from '@/app/data-freshness/invalidationKeys';
import {createCampusEntryNavigation} from '@/app/navigation/services/campusEntryNavigation';
import {BOTTOM_TAB_BAR_HEIGHT} from '@/shared/constants/layout';
import {InlineBannerAd, useScrollViewAdVisibility} from '@/shared/ads';
import {StateCard} from '@/shared/design-system/components';
import {COLORS, SPACING} from '@/shared/design-system/tokens';
import {useScreenEnterAnimation} from '@/shared/hooks/useScreenEnterAnimation';
import {useScreenView} from '@/shared/hooks/useScreenView';
import {useNotificationUnreadCount} from '@/features/user/hooks/useNotificationUnreadCount';
import {useAppNoticeUnreadCount} from '@/features/settings/hooks/useAppNoticeUnreadCount';

import {CampusAcademicCalendarPreviewCard} from '../components/CampusAcademicCalendarPreviewCard';
import {CampusCafeteriaPreviewCarousel} from '../components/CampusCafeteriaPreviewCarousel';
import {CampusHomeBannerCarousel} from '../components/CampusHomeBannerCarousel';
import {CampusHomeHeader} from '../components/CampusHomeHeader';
import {CampusNoticePreviewCard} from '../components/CampusNoticePreviewCard';
import {CampusQuickMenuGrid} from '../components/CampusQuickMenuGrid';
import {CampusSectionHeader} from '../components/CampusSectionHeader';
import {CampusTimetablePreviewCard} from '../components/CampusTimetablePreviewCard';
import {getDefaultCampusHomeBannerViewData} from '../application/campusHomeBannerQuery';
import {
  CAMPUS_HOME_ACTION_LABELS,
  CAMPUS_HOME_QUICK_MENU_ITEMS,
} from '../constants/campusHomePreview';
import type {CampusBannerViewData} from '../model/campusHomeBanner';
import {useCampusHomeViewData} from '../hooks/useCampusHomeViewData';

export const CampusScreen = () => {
  useScreenView();

  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const screenAnimatedStyle = useScreenEnterAnimation();
  const campusEntryNavigation = React.useMemo(
    () => createCampusEntryNavigation(navigation),
    [navigation],
  );
  const {data, loading, error, refetch} = useCampusHomeViewData();
  const {
    count: notificationUnreadCount,
    reload: reloadNotificationUnread,
  } = useNotificationUnreadCount();
  const {
    count: appNoticeUnreadCount,
    reload: reloadAppNoticeUnread,
  } = useAppNoticeUnreadCount();
  const defaultBannerItems = React.useMemo(
    () => getDefaultCampusHomeBannerViewData(),
    [],
  );
  const bannerItems = data?.banners ?? defaultBannerItems;
  const [isImportantNoticeInfoVisible, setIsImportantNoticeInfoVisible] =
    React.useState(false);
  const notificationBadgeCount =
    notificationUnreadCount + appNoticeUnreadCount;
  const {
    handleAdLayout,
    handleScroll,
    handleViewportLayout,
    visible: isAdVisible,
  } = useScrollViewAdVisibility();

  const contentContainerStyle = React.useMemo(
    () => ({
      paddingTop: 72,
      paddingBottom: BOTTOM_TAB_BAR_HEIGHT + insets.bottom + SPACING.xxl,
    }),
    [insets.bottom],
  );

  useFocusEffect(
    React.useCallback(() => {
      reloadNotificationUnread().catch(() => undefined);
      reloadAppNoticeUnread().catch(() => undefined);
    }, [reloadAppNoticeUnread, reloadNotificationUnread]),
  );

  useRefetchOnFocus({
    invalidationKey: CAMPUS_HOME_INVALIDATION_KEY,
    refetch,
  });

  const handlePressBanner = React.useCallback(
    async (item: CampusBannerViewData) => {
      if (item.action.type === 'externalUrl') {
        try {
          await Linking.openURL(item.action.url);
        } catch (linkError) {
          console.warn('Campus 배너 외부 링크를 열지 못했습니다.', linkError);
          Alert.alert(
            '링크 열기 실패',
            '배너 링크를 열지 못했습니다. 잠시 후 다시 시도해주세요.',
          );
        }

        return;
      }

      switch (item.action.target) {
        case 'TAXI_MAIN':
          campusEntryNavigation.openTaxiMain();
          return;
        case 'NOTICE_MAIN':
          campusEntryNavigation.openNoticeList();
          return;
        case 'TIMETABLE_DETAIL':
          campusEntryNavigation.openCampusScreen(
            'TimetableDetail',
            item.action.params,
          );
          return;
        case 'CAFETERIA_DETAIL':
          campusEntryNavigation.openCampusScreen(
            'CafeteriaDetail',
            item.action.params,
          );
          return;
        case 'ACADEMIC_CALENDAR_DETAIL':
          campusEntryNavigation.openCampusScreen(
            'AcademicCalendarDetail',
            item.action.params,
          );
          return;
        default:
          return;
      }
    },
    [campusEntryNavigation],
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <Animated.View style={[styles.screen, screenAnimatedStyle]}>
        <CampusHomeHeader
          notificationBadgeCount={notificationBadgeCount}
          onPressNotification={() =>
            campusEntryNavigation.openCampusScreen('Notification')
          }
          onPressProfile={() =>
            campusEntryNavigation.openCampusScreen('Profile')
          }
        />

        <ScrollView
          contentContainerStyle={contentContainerStyle}
          onLayout={handleViewportLayout}
          onScroll={handleScroll}
          onScrollBeginDrag={() => {
            if (isImportantNoticeInfoVisible) {
              setIsImportantNoticeInfoVisible(false);
            }
          }}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}>
          <CampusHomeBannerCarousel
            items={bannerItems}
            onPressItem={handlePressBanner}
          />

          <CampusQuickMenuGrid
            items={CAMPUS_HOME_QUICK_MENU_ITEMS}
            onPressItem={routeName => {
              campusEntryNavigation.openCampusScreen(routeName);
            }}
          />

          {loading && !data ? (
            <View style={styles.section}>
              <StateCard
                description="캠퍼스 정보를 불러오는 중입니다."
                icon={<ActivityIndicator color={COLORS.brand.primary} />}
                title="Campus 화면 준비 중"
              />
            </View>
          ) : null}

          {error && !data ? (
            <View style={styles.section}>
              <StateCard
                actionLabel="다시 시도"
                description={error}
                icon={
                  <Icon
                    color={COLORS.accent.orange}
                    name="refresh-outline"
                    size={26}
                  />
                }
                onPressAction={refetch}
                title="Campus 화면을 불러오지 못했습니다"
              />
            </View>
          ) : null}

          {data ? (
            <>
              <View style={styles.section}>
                <View style={styles.noticeSectionHeaderWrap}>
                  <CampusSectionHeader
                    actionLabel={CAMPUS_HOME_ACTION_LABELS.notices}
                    onPressAction={campusEntryNavigation.openNoticeList}
                    title="중요한 학사공지"
                    titleAccessory={
                      <TouchableOpacity
                        accessibilityLabel="중요한 학사공지 안내"
                        accessibilityRole="button"
                        activeOpacity={0.82}
                        onPress={() => {
                          setIsImportantNoticeInfoVisible(previous => !previous);
                        }}
                        style={styles.noticeInfoButton}>
                        <Icon
                          color={COLORS.text.muted}
                          name="information-circle-outline"
                          size={18}
                        />
                      </TouchableOpacity>
                    }
                  />
                  {isImportantNoticeInfoVisible ? (
                    <View style={styles.noticeInfoBubble}>
                      <Text style={styles.noticeInfoBubbleText}>
                        최근 1달 내 공지 중 조회수, 좋아요, 댓글이 많은 공지가 나열됩니다
                      </Text>
                      <TouchableOpacity
                        activeOpacity={0.82}
                        onPress={() => {
                          setIsImportantNoticeInfoVisible(false);
                        }}
                        style={styles.noticeInfoBubbleCloseButton}>
                        <Icon
                          color={COLORS.text.inverse}
                          name="close-outline"
                          size={18}
                        />
                      </TouchableOpacity>
                    </View>
                  ) : null}
                </View>
                <CampusNoticePreviewCard
                  emptyDescription="최근 1달 내 반응이 높은 학사공지가 있으면 여기에 표시됩니다."
                  emptyTitle="최근 1달 내 중요한 학사공지가 없습니다"
                  items={data.notices.items}
                  onPressItem={item =>
                    campusEntryNavigation.openNoticeDetail(item.id)
                  }
                />
              </View>

              <View style={styles.section}>
                <CampusSectionHeader
                  actionLabel={CAMPUS_HOME_ACTION_LABELS.timetable}
                  onPressAction={() =>
                    campusEntryNavigation.openCampusScreen('TimetableDetail', {
                      initialView: 'all',
                    })
                  }
                  subtitle={data.timetable.dateLabel}
                  title="오늘 시간표"
                />
                <CampusTimetablePreviewCard
                  collapsedVisibleCount={data.timetable.collapsedVisibleCount}
                  emptyState={data.timetable.emptyState}
                  periods={data.timetable.periods}
                  sessions={data.timetable.sessions}
                />
              </View>

              <InlineBannerAd
                onLayout={handleAdLayout}
                placement="campusHome"
                style={styles.adSection}
                visible={isAdVisible}
              />

              <View style={styles.section}>
                <CampusSectionHeader
                  actionLabel={CAMPUS_HOME_ACTION_LABELS.cafeteria}
                  onPressAction={() =>
                    campusEntryNavigation.openCampusScreen('CafeteriaDetail')
                  }
                  title="오늘의 추천 학식"
                />
                <CampusCafeteriaPreviewCarousel
                  items={data.cafeteria.recommendedMenus}
                  onPressItem={() =>
                    campusEntryNavigation.openCampusScreen('CafeteriaDetail')
                  }
                />
              </View>

              <View style={styles.section}>
                <CampusSectionHeader
                  actionLabel={CAMPUS_HOME_ACTION_LABELS.academicCalendar}
                  onPressAction={() =>
                    campusEntryNavigation.openCampusScreen(
                      'AcademicCalendarDetail',
                    )
                  }
                  title="다가오는 학사일정"
                />
                <CampusAcademicCalendarPreviewCard
                  items={data.academicCalendar.items}
                  onPressItem={() =>
                    campusEntryNavigation.openCampusScreen(
                      'AcademicCalendarDetail',
                    )
                  }
                />
              </View>
            </>
          ) : null}
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.background.page,
    flex: 1,
  },
  screen: {
    flex: 1,
  },
  section: {
    marginBottom: SPACING.xxl,
    paddingHorizontal: SPACING.lg,
  },
  adSection: {
    marginBottom: SPACING.xxl,
    marginHorizontal: SPACING.lg,
    marginTop: 0,
  },
  noticeInfoBubble: {
    position: 'absolute',
    top: 30,
    left: 0,
    zIndex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.text.primary,
    borderRadius: 14,
    maxWidth: 280,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  noticeInfoBubbleText: {
    color: COLORS.text.inverse,
    fontSize: 12,
    lineHeight: 18,
    flex: 1,
    flexShrink: 1,
  },
  noticeInfoBubbleCloseButton: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 18,
    width: 18,
    flexShrink: 0,
  },
  noticeInfoButton: {
    alignItems: 'center',
    height: 22,
    justifyContent: 'center',
    width: 22,
  },
  noticeSectionHeaderWrap: {
    position: 'relative',
  },
});
