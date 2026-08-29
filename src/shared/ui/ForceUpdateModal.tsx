import React from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';

import {
  COLORS,
  RADIUS,
  SPACING,
  TYPOGRAPHY,
} from '@/shared/design-system/tokens';
import { openAppStore } from '@/shared/lib/device/openAppStore';
import type {
  StartupNoticeItem,
  VersionModalConfig,
  VisibleStartupModalMode,
} from '@/shared/types/version';

interface ForceUpdateModalProps {
  mode: VisibleStartupModalMode;
  noticeItems?: StartupNoticeItem[];
  noticeLoading?: boolean;
  onPressClose?: () => void;
  onPressRetry?: () => void;
  retrying?: boolean;
  visible: boolean;
  config?: VersionModalConfig;
}

const DEFAULT_UPDATE_MESSAGE =
  '새로운 버전이 준비되었습니다.\n앱을 최신 상태로 유지해주세요.';
const MAINTENANCE_TITLE = '서버 점검 중입니다';
const MAINTENANCE_MESSAGE =
  '현재 서버 점검 중이거나 연결이 원활하지 않습니다.\n잠시 후 다시 시도해주세요.';

export const ForceUpdateModal: React.FC<ForceUpdateModalProps> = ({
  mode,
  noticeItems = [],
  noticeLoading = false,
  onPressClose,
  onPressRetry,
  retrying = false,
  visible,
  config,
}) => {
  const handleButtonPress = () => {
    if (mode === 'maintenance') {
      onPressRetry?.();
      return;
    }

    if (config?.buttonUrl) {
      openAppStore(config.buttonUrl);
      return;
    }

    openAppStore();
  };

  const iconName =
    mode === 'maintenance'
      ? 'cloud-offline-outline'
      : config?.icon || 'cloud-download-outline';
  const title =
    mode === 'maintenance'
      ? MAINTENANCE_TITLE
      : config?.title || '업데이트 안내';
  const message =
    mode === 'maintenance'
      ? MAINTENANCE_MESSAGE
      : config?.message || DEFAULT_UPDATE_MESSAGE;
  const showButton =
    mode === 'maintenance' ? true : Boolean(config?.showButton && config?.buttonUrl);
  const buttonText =
    mode === 'maintenance'
      ? retrying
        ? '다시 확인 중...'
        : '다시 시도'
      : config?.buttonText ||
        (Platform.OS === 'ios' ? 'App Store에서 업데이트' : 'Play Store에서 업데이트');
  const showCloseButton = mode === 'soft-update';
  const showAppNotices = noticeLoading || noticeItems.length > 0;

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="fade"
      statusBarTranslucent
    >
      <SafeAreaView style={styles.container}>
        <ScrollView
          bounces={false}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            {showCloseButton ? (
              <TouchableOpacity
                accessibilityLabel="업데이트 안내 닫기"
                activeOpacity={0.8}
                onPress={onPressClose}
                style={styles.closeButton}>
                <Icon
                  color={COLORS.text.tertiary}
                  name="close-outline"
                  size={24}
                />
              </TouchableOpacity>
            ) : null}

            <View style={styles.iconContainer}>
              <Icon name={iconName} size={64} color={COLORS.accent.blue} />
            </View>

            <Text style={styles.title}>{title}</Text>
            <Text style={styles.message}>{message}</Text>

            {showButton ? (
              <TouchableOpacity
                activeOpacity={0.8}
                disabled={retrying}
                onPress={handleButtonPress}
                style={[
                  styles.updateButton,
                  retrying ? styles.updateButtonDisabled : null,
                ]}>
                {retrying ? (
                  <ActivityIndicator color={COLORS.text.inverse} size="small" />
                ) : (
                  <Text style={styles.updateButtonText}>{buttonText}</Text>
                )}
              </TouchableOpacity>
            ) : null}

            {mode === 'force-update' && showButton ? (
              <Text style={styles.note}>
                업데이트 후 앱을 다시 실행해주세요.
              </Text>
            ) : null}

            {showAppNotices ? (
              <View style={styles.noticeSection}>
                <View style={styles.noticeHeader}>
                  <Text style={styles.noticeTitle}>
                    {mode === 'maintenance' ? '점검 안내' : '최근 앱 공지'}
                  </Text>
                  <Text style={styles.noticeSubtitle}>
                    {mode === 'maintenance'
                      ? '운영팀에서 등록한 점검 공지입니다'
                      : '최신 안내와 업데이트 소식을 확인하세요'}
                  </Text>
                </View>

                {noticeLoading && noticeItems.length === 0 ? (
                  <View style={styles.noticeLoading}>
                    <ActivityIndicator color={COLORS.brand.primary} size="small" />
                    <Text style={styles.noticeLoadingText}>
                      최근 앱 공지를 불러오는 중입니다.
                    </Text>
                  </View>
                ) : null}

                {noticeItems.length > 0 ? (
                  <View style={styles.noticeList}>
                    {noticeItems.map(item =>
                      mode === 'maintenance' ? (
                        <View key={item.id} style={styles.noticeCard}>
                          <Text style={styles.maintenanceNoticeBody}>{item.body}</Text>
                        </View>
                      ) : (
                        <View key={item.id} style={styles.noticeCard}>
                          <View style={styles.noticeTitleRow}>
                            <Text numberOfLines={2} style={styles.noticeCardTitle}>{item.title}</Text>
                            <View style={styles.noticeTitleBadgeRow}>
                              {item.isImportant ? (
                                <View style={styles.importantBadge}>
                                  <Text style={styles.importantBadgeText}>중요</Text>
                                </View>
                              ) : null}
                              <Text style={styles.noticePublishedLabel}>
                                {item.publishedLabel}
                              </Text>
                            </View>
                          </View>
                          <Text numberOfLines={2} style={styles.noticeSummary}>
                            {item.summary}
                          </Text>
                        </View>
                      ),
                    )}
                  </View>
                ) : null}
              </View>
            ) : null}
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.page,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 28,
  },
  content: {
    alignSelf: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background.surface,
    borderColor: COLORS.border.subtle,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    maxWidth: 420,
    paddingHorizontal: 24,
    paddingVertical: 24,
    width: '100%',
  },
  closeButton: {
    alignSelf: 'flex-end',
    marginBottom: 4,
    padding: 4,
  },
  iconContainer: {
    marginBottom: 20,
  },
  title: {
    ...TYPOGRAPHY.title2,
    color: COLORS.text.primary,
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    ...TYPOGRAPHY.body1,
    color: COLORS.text.secondary,
    lineHeight: 24,
    marginBottom: 28,
    textAlign: 'center',
  },
  updateButton: {
    backgroundColor: COLORS.accent.blue,
    alignItems: 'center',
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    minHeight: 54,
    paddingHorizontal: 32,
    paddingVertical: 16,
    width: '100%',
  },
  updateButtonDisabled: {
    opacity: 0.7,
  },
  updateButtonText: {
    ...TYPOGRAPHY.body1,
    color: COLORS.text.inverse,
    fontWeight: '600',
  },
  note: {
    ...TYPOGRAPHY.caption1,
    color: COLORS.text.tertiary,
    marginTop: 12,
    textAlign: 'center',
  },
  noticeSection: {
    borderTopColor: COLORS.border.subtle,
    borderTopWidth: 1,
    marginTop: 28,
    paddingTop: 20,
    width: '100%',
  },
  noticeHeader: {
    marginBottom: 12,
  },
  noticeTitle: {
    color: COLORS.text.primary,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
  },
  noticeSubtitle: {
    color: COLORS.text.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  noticeLoading: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 8,
  },
  noticeLoadingText: {
    color: COLORS.text.secondary,
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  noticeList: {
    gap: 10,
  },
  noticeCard: {
    backgroundColor: COLORS.background.page,
    borderColor: COLORS.border.subtle,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 14,
  },
  noticeTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  noticeTitleBadgeRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  importantBadge: {
    backgroundColor: COLORS.accent.pinkSoft,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  importantBadgeText: {
    color: COLORS.status.danger,
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 14,
  },
  noticePublishedLabel: {
    color: COLORS.text.muted,
    fontSize: 11,
    lineHeight: 16,
  },
  noticeCardTitle: {
    color: COLORS.text.primary,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  noticeSummary: {
    color: COLORS.text.secondary,
    fontSize: 12,
    lineHeight: 18,
  },
  maintenanceNoticeBody: {
    ...TYPOGRAPHY.body2,
    color: COLORS.text.secondary,
    lineHeight: 22,
  },
});
