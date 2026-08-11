import React from 'react';
import {
  Modal,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

import {
  COLORS,
  RADIUS,
  SHADOWS,
  SPACING,
} from '@/shared/design-system/tokens';

import {
  GUIDE_BEDROCK_PORT,
  GUIDE_JAVA_PORT,
  GUIDE_SERVER_NAME,
} from '../constants/minecraftGuide';

interface MinecraftServerGuideModalProps {
  onClose: () => void;
  onPressAccountRegistration: () => void;
  serverAddress: string;
  visible: boolean;
}

export const MinecraftServerGuideModal = ({
  onClose,
  onPressAccountRegistration,
  serverAddress,
  visible,
}: MinecraftServerGuideModalProps) => {
  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      transparent
      visible={visible}>
      <View style={styles.modalOverlay}>
        <TouchableOpacity
          activeOpacity={1}
          onPress={onClose}
          style={StyleSheet.absoluteFill}
        />

        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderTitleWrap}>
              <Text style={styles.modalTitle}>스쿠리 서버 접속 방법</Text>
              <Text style={styles.modalSubtitle}>
                Java(컴퓨터)와 BE(휴대폰) 모두 접속 가능해요.
              </Text>
            </View>

            <TouchableOpacity
              accessibilityLabel="안내 모달 닫기"
              accessibilityRole="button"
              activeOpacity={0.82}
              onPress={onClose}
              style={styles.modalCloseButton}>
              <Icon color={COLORS.text.primary} name="close" size={20} />
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={styles.modalContent}
            showsVerticalScrollIndicator={false}>
            <View style={styles.guideStepCard}>
              <View style={styles.guideStepHeader}>
                <View style={styles.guideStepIndex}>
                  <Text style={styles.guideStepIndexText}>1</Text>
                </View>
                <Text style={styles.guideStepTitle}>
                  스쿠리 앱에서 마인크래프트 계정을 등록하세요
                </Text>
              </View>

              {/* <GuideImagePlaceholder
                iconName="cube-outline"
                subtitle="실제 계정 등록 화면 이미지가 들어갈 자리입니다."
                title="계정 등록 화면 placeholder"
              /> */}
              <Image
                source={require('../../../../assets/images/minecraft/tip/tip-img1.jpeg')}
                style={[styles.guideStepImage, {height: 400}, {marginTop: SPACING.lg}]}
              />

              <Text style={styles.guideStepBody}>
                스쿠리 앱의 '마인크래프트 계정 등록' 화면에서 본인의 마인크래프트 닉네임을 입력하고
                에디션을 선택해 등록하세요.
              </Text>

              <View style={styles.guideWarningBox}>
                <Icon
                  color={COLORS.status.danger}
                  name="alert-circle-outline"
                  size={16}
                />
                <Text style={styles.guideWarningText}>
                  Bedrock Edition(BE)은 닉네임의 대소문자를 구별하므로 정확하게
                  입력해야 합니다.
                </Text>
              </View>

              <TouchableOpacity
                accessibilityRole="button"
                activeOpacity={0.88}
                onPress={onPressAccountRegistration}
                style={styles.guidePrimaryButton}>
                <Icon
                  color={COLORS.text.inverse}
                  name="person-add-outline"
                  size={18}
                />
                <Text style={styles.guidePrimaryButtonText}>
                  계정 등록 화면 바로가기
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.guideStepCard}>
              <View style={styles.guideStepHeader}>
                <View style={styles.guideStepIndex}>
                  <Text style={styles.guideStepIndexText}>2</Text>
                </View>
                <Text style={styles.guideStepTitle}>
                  마인크래프트를 실행하고 멀티 플레이를 여세요
                </Text>
              </View>

              {/* <GuideImagePlaceholder
                iconName="game-controller-outline"
                subtitle="멀티 플레이 진입 화면 이미지가 들어갈 자리입니다."
                title="멀티 플레이 화면 placeholder"
              /> */}
              <View style={styles.guideStepImageContainer}>
                <Text style={styles.guideStepImageTitle}>Java Edition</Text>
                <Image
                  source={require('../../../../assets/images/minecraft/tip/tip-img2-je.png')}
                  style={[styles.guideStepImage, {height: 200}]}
                />
              </View>

              <View style={styles.guideStepImageContainer}>
                <Text style={styles.guideStepImageTitle}>Bedrock Edition</Text>
                <Image
                  source={require('../../../../assets/images/minecraft/tip/tip-img2-be.jpeg')}
                  style={[styles.guideStepImage, {height: 200}]}
                />
              </View>

              <Text style={styles.guideStepBody}>
                마인크래프트를 실행한 뒤 멀티 플레이 메뉴로 이동해 서버 추가
                화면을 엽니다.
              </Text>
            </View>

            <View style={styles.guideStepCard}>
              <View style={styles.guideStepHeader}>
                <View style={styles.guideStepIndex}>
                  <Text style={styles.guideStepIndexText}>3</Text>
                </View>
                <Text style={styles.guideStepTitle}>
                  서버명, 서버 주소, 포트를 입력하고 접속하세요
                </Text>
              </View>

              {/* <GuideImagePlaceholder
                iconName="server-outline"
                subtitle="서버 추가 입력 화면 이미지가 들어갈 자리입니다."
                title="서버 추가 화면 placeholder"
              /> */}

              <View style={styles.guideStepImageContainer}>
                <Text style={styles.guideStepImageTitle}>Java Edition</Text>
                <Image
                  source={require('../../../../assets/images/minecraft/tip/tip-img3-je.png')}
                  style={[styles.guideStepImage, {height: 180}]}
                />
              </View>

              <View style={styles.guideStepImageContainer}>
                <Text style={styles.guideStepImageTitle}>Bedrock Edition</Text>
                <Image
                  source={require('../../../../assets/images/minecraft/tip/tip-img3-be.jpeg')}
                  style={[styles.guideStepImage, {height: 180}]}
                />
              </View>

              <Text style={styles.guideStepBody}>
                서버 추가 화면에서 아래 정보를 입력한 뒤 접속하세요.
              </Text>

              <View style={styles.guideServerInfoCard}>
                <View style={styles.guideServerInfoSection}>
                  <Text style={styles.guideServerInfoEdition}>Java Edition</Text>
                  <Text style={styles.guideServerInfoLine}>
                    서버명: {GUIDE_SERVER_NAME}
                  </Text>
                  <Text style={styles.guideServerInfoLine}>
                    서버 주소: {serverAddress}
                  </Text>
                  <Text style={styles.guideServerInfoLine}>
                    포트(선택): {GUIDE_JAVA_PORT}
                  </Text>
                </View>

                <View style={styles.guideServerInfoDivider} />

                <View style={styles.guideServerInfoSection}>
                  <Text style={styles.guideServerInfoEdition}>
                    Bedrock Edition
                  </Text>
                  <Text style={styles.guideServerInfoLine}>
                    서버명: {GUIDE_SERVER_NAME}
                  </Text>
                  <Text style={styles.guideServerInfoLine}>
                    서버 주소: {serverAddress}
                  </Text>
                  <Text style={styles.guideServerInfoLine}>
                    포트: {GUIDE_BEDROCK_PORT}
                  </Text>
                </View>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(17, 24, 39, 0.52)',
    flex: 1,
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  modalSheet: {
    backgroundColor: COLORS.background.page,
    borderRadius: RADIUS.xl,
    maxHeight: '86%',
    overflow: 'hidden',
    width: '100%',
  },
  modalHeader: {
    alignItems: 'center',
    borderBottomColor: COLORS.border.subtle,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
  },
  modalHeaderTitleWrap: {
    flex: 1,
    marginRight: SPACING.md,
  },
  modalTitle: {
    color: COLORS.text.primary,
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 26,
  },
  modalSubtitle: {
    color: COLORS.text.tertiary,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 2,
  },
  modalCloseButton: {
    alignItems: 'center',
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  modalContent: {
    gap: SPACING.lg,
    padding: SPACING.lg,
  },
  guideStepCard: {
    backgroundColor: COLORS.background.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    ...SHADOWS.card,
  },
  guideStepHeader: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  guideStepIndex: {
    alignItems: 'center',
    backgroundColor: COLORS.brand.primaryTint,
    borderRadius: RADIUS.pill,
    height: 28,
    justifyContent: 'center',
    marginRight: SPACING.sm,
    width: 28,
  },
  guideStepIndexText: {
    color: COLORS.brand.primaryStrong,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  guideStepTitle: {
    color: COLORS.text.primary,
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 22,
  },
  guideStepImage: {
    width: '100%',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border.image,
    overflow: 'hidden',
    marginTop: SPACING.sm,
  },
  guideStepImageContainer: {
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  guideStepImageTitle: {
    color: COLORS.text.secondary,
    fontSize: 12,
    lineHeight: 18,
    marginTop: SPACING.sm,
    backgroundColor: COLORS.background.subtle,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.sm,
  },
  guideImagePlaceholder: {
    backgroundColor: COLORS.background.subtle,
    borderColor: COLORS.border.default,
    borderRadius: RADIUS.lg,
    borderStyle: 'dashed',
    borderWidth: 1,
    marginTop: SPACING.lg,
    overflow: 'hidden',
  },
  guideImageBrowserBar: {
    backgroundColor: COLORS.background.grayLight,
    borderBottomColor: COLORS.border.default,
    borderBottomWidth: 1,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  guideImageBrowserDots: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  guideImageBrowserDot: {
    borderRadius: RADIUS.pill,
    height: 8,
    width: 8,
  },
  guideImageBody: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 180,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xl,
  },
  guideImageTitle: {
    color: COLORS.text.primary,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    marginTop: SPACING.md,
    textAlign: 'center',
  },
  guideImageSubtitle: {
    color: COLORS.text.tertiary,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
    textAlign: 'center',
  },
  guideStepBody: {
    color: COLORS.text.secondary,
    fontSize: 13,
    lineHeight: 20,
    marginTop: SPACING.lg,
  },
  guideWarningBox: {
    alignItems: 'flex-start',
    backgroundColor: '#FEF2F2',
    borderRadius: RADIUS.md,
    flexDirection: 'row',
    marginTop: SPACING.md,
    padding: SPACING.md,
  },
  guideWarningText: {
    color: COLORS.status.danger,
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 18,
    marginLeft: SPACING.sm,
  },
  guidePrimaryButton: {
    alignItems: 'center',
    backgroundColor: COLORS.brand.primary,
    borderRadius: RADIUS.md,
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: SPACING.lg,
    minHeight: 48,
    paddingHorizontal: SPACING.lg,
  },
  guidePrimaryButtonText: {
    color: COLORS.text.inverse,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    marginLeft: SPACING.sm,
  },
  guideServerInfoCard: {
    backgroundColor: COLORS.background.subtle,
    borderRadius: RADIUS.md,
    marginTop: SPACING.lg,
    overflow: 'hidden',
  },
  guideServerInfoSection: {
    padding: SPACING.md,
  },
  guideServerInfoEdition: {
    color: COLORS.text.primary,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    marginBottom: SPACING.sm,
  },
  guideServerInfoLine: {
    color: COLORS.text.secondary,
    fontSize: 13,
    lineHeight: 20,
  },
  guideServerInfoDivider: {
    backgroundColor: COLORS.border.default,
    height: 1,
  },
});
