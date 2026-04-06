import React from 'react';
import {ScrollView, StyleSheet, View} from 'react-native';

import {COLORS, RADIUS, SHADOWS, SPACING} from '../tokens';
import {SkeletonBlock} from './SkeletonBlock';
import {SkeletonText} from './SkeletonText';

export const ProfileScreenSkeleton = () => (
  <View style={styles.profileScrollContent}>
    <View style={styles.profileTopSection}>
      <SkeletonBlock style={styles.profileAvatar} />
      <View style={styles.profileTextGroup}>
        <SkeletonBlock style={styles.profileName} />
        <SkeletonBlock style={styles.profileSubtitle} />
        <SkeletonBlock style={styles.profileEmail} />
      </View>
    </View>

    <View style={styles.profileStatsRow}>
      {Array.from({length: 3}).map((_, index) => (
        <SkeletonBlock key={`profile-stat-${index + 1}`} style={styles.profileStatCard} />
      ))}
    </View>

    <View style={styles.profileMenuSection}>
      {Array.from({length: 5}).map((_, index) => (
        <SkeletonBlock key={`profile-menu-${index + 1}`} style={styles.profileMenuRow} />
      ))}
    </View>
  </View>
);

export const ArticleDetailSkeleton = ({
  headerOffset = 0,
  showCommentCard = true,
  showHero = true,
}: {
  headerOffset?: number;
  showCommentCard?: boolean;
  showHero?: boolean;
}) => (
  <ScrollView
    contentContainerStyle={[
      styles.articleScrollContent,
      {paddingTop: headerOffset + SPACING.lg},
    ]}
    showsVerticalScrollIndicator={false}>
    <View style={styles.articleContent}>
      <SkeletonBlock style={styles.articleBadge} />
      <SkeletonText
        lineHeight={26}
        lines={2}
        widths={['86%', '58%']}
      />
      <View style={styles.articleMetaRow}>
        <SkeletonBlock style={styles.articleMetaShort} />
        <SkeletonBlock style={styles.articleMetaShort} />
        <SkeletonBlock style={styles.articleMetaShort} />
      </View>

      {showHero ? <SkeletonBlock style={styles.articleHero} /> : null}

      <SkeletonText
        lineHeight={16}
        lines={7}
        widths={['100%', '96%', '92%', '98%', '88%', '94%', '72%']}
      />

      <View style={styles.articleReactionRow}>
        <SkeletonBlock style={styles.articleReactionChip} />
        <SkeletonBlock style={styles.articleReactionChip} />
        <SkeletonBlock style={styles.articleReactionChipWide} />
      </View>

      {showCommentCard ? (
        <View style={styles.articleCommentCard}>
          <View style={styles.articleCommentHeader}>
            <SkeletonBlock style={styles.articleCommentAvatar} />
            <View style={styles.articleCommentMeta}>
              <SkeletonBlock style={styles.articleCommentAuthor} />
              <SkeletonBlock style={styles.articleCommentTime} />
            </View>
          </View>
          <SkeletonText
            lineHeight={14}
            lines={3}
            widths={['100%', '92%', '64%']}
          />
        </View>
      ) : null}
    </View>
  </ScrollView>
);

export const ChatDetailSkeleton = () => (
  <View style={styles.chatContainer}>
    <View style={styles.chatMessages}>
      <View style={styles.chatIncomingRow}>
        <SkeletonBlock style={styles.chatAvatar} />
        <View style={styles.chatIncomingBubbleGroup}>
          <SkeletonBlock style={styles.chatMetaLabel} />
          <SkeletonBlock style={styles.chatIncomingBubbleLarge} />
        </View>
      </View>

      <View style={styles.chatOutgoingRow}>
        <SkeletonBlock style={styles.chatOutgoingBubble} />
      </View>

      <View style={styles.chatIncomingRow}>
        <SkeletonBlock style={styles.chatAvatar} />
        <View style={styles.chatIncomingBubbleGroup}>
          <SkeletonBlock style={styles.chatMetaLabelShort} />
          <SkeletonBlock style={styles.chatIncomingBubbleSmall} />
        </View>
      </View>
    </View>

    <View style={styles.chatComposer}>
      <SkeletonBlock style={styles.chatComposerInput} />
      <SkeletonBlock style={styles.chatComposerButton} />
    </View>
  </View>
);

export const TimetableDetailSkeleton = () => (
  <View style={styles.timetableScrollContent}>
    <View style={styles.timetableTopRow}>
      <SkeletonBlock style={styles.timetableSegmented} />
      <SkeletonBlock style={styles.timetableCredit} />
    </View>

    <SkeletonBlock style={styles.timetableGridCard} />

    <View style={styles.timetableSupplementSection}>
      <SkeletonBlock style={styles.timetableSectionTitle} />
      <SkeletonBlock style={styles.timetableSupplementCard} />
      <SkeletonBlock style={styles.timetableSupplementCard} />
    </View>
  </View>
);

export const LegalDocumentScreenSkeleton = () => (
  <View style={styles.legalScrollContent}>
    <SkeletonBlock style={styles.legalHero} />
    <View style={styles.legalCardList}>
      {Array.from({length: 3}).map((_, index) => (
        <View key={`legal-card-${index + 1}`} style={styles.legalCard}>
          <SkeletonBlock style={styles.legalCardTitle} />
          <SkeletonText
            lineHeight={14}
            lines={4}
            widths={['100%', '94%', '90%', '76%']}
          />
        </View>
      ))}
    </View>
  </View>
);

export const InquiryHistoryScreenSkeleton = () => (
  <View style={styles.inquiryScrollContent}>
    <View style={styles.inquirySummaryRow}>
      <SkeletonBlock style={styles.inquirySummaryTitle} />
      <SkeletonBlock style={styles.inquirySummaryBadge} />
    </View>

    <View style={styles.inquiryCardList}>
      {Array.from({length: 3}).map((_, index) => (
        <View key={`inquiry-card-${index + 1}`} style={styles.inquiryCard}>
          <View style={styles.inquiryHeaderRow}>
            <View style={styles.inquiryBadgeRow}>
              <SkeletonBlock style={styles.inquiryBadge} />
              <SkeletonBlock style={styles.inquiryBadge} />
            </View>
            <SkeletonBlock style={styles.inquiryDate} />
          </View>

          <View style={styles.inquiryBodyRow}>
            <View style={styles.inquiryBody}>
              <SkeletonBlock style={styles.inquirySubject} />
              <SkeletonText
                lineHeight={14}
                lines={3}
                widths={['100%', '92%', '68%']}
              />
              <SkeletonBlock style={styles.inquiryAttachment} />
            </View>
            <SkeletonBlock style={styles.inquiryThumb} />
          </View>
        </View>
      ))}
    </View>
  </View>
);

export const NoticeListSkeleton = () => (
  <View style={styles.noticeCard}>
    {Array.from({length: 5}).map((_, index) => (
      <View
        key={`notice-row-${index + 1}`}
        style={[
          styles.noticeRow,
          index === 4 ? styles.noticeRowLast : null,
        ]}>
        <View style={styles.noticeRowContent}>
          <View style={styles.noticeMetaRow}>
            <View style={styles.noticeMetaLeft}>
              <SkeletonBlock style={styles.noticeDot} />
              <SkeletonBlock style={styles.noticePill} />
              <SkeletonBlock style={styles.noticeTime} />
            </View>
            <SkeletonBlock style={styles.noticeChevron} />
          </View>

          <View style={styles.noticeTitleRow}>
            <View style={styles.noticeTextColumn}>
              <SkeletonBlock style={styles.noticeTitle} />
              <SkeletonBlock style={styles.noticeTitleShort} />
            </View>
            <SkeletonBlock style={styles.noticeThumb} />
          </View>

          <View style={styles.noticeFooterRow}>
            <SkeletonBlock style={styles.noticeAuthor} />
            <View style={styles.noticeStatRow}>
              <SkeletonBlock style={styles.noticeStat} />
              <SkeletonBlock style={styles.noticeStat} />
              <SkeletonBlock style={styles.noticeStat} />
            </View>
          </View>
        </View>
      </View>
    ))}
  </View>
);

export const ComposeScreenSkeleton = () => (
  <View style={styles.composeContainer}>
    <SkeletonBlock style={styles.composeCategory} />
    <SkeletonBlock style={styles.composeTitle} />
    <SkeletonBlock style={styles.composeImageRow} />
    <SkeletonText
      lineHeight={16}
      lines={8}
      widths={['100%', '98%', '94%', '100%', '91%', '96%', '90%', '62%']}
    />
    <View style={styles.composeFooterRow}>
      <SkeletonBlock style={styles.composeToggle} />
      <SkeletonBlock style={styles.composeAction} />
    </View>
  </View>
);

const styles = StyleSheet.create({
  profileScrollContent: {
    paddingBottom: 40,
    paddingHorizontal: SPACING.lg,
    paddingTop: 20,
  },
  profileTopSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  profileAvatar: {
    borderRadius: 9999,
    height: 100,
    marginBottom: 16,
    width: 100,
  },
  profileTextGroup: {
    alignItems: 'center',
    gap: SPACING.sm,
    width: '100%',
  },
  profileName: {
    height: 22,
    width: 112,
  },
  profileSubtitle: {
    height: 16,
    width: 168,
  },
  profileEmail: {
    height: 14,
    width: 196,
  },
  profileStatsRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: 20,
  },
  profileStatCard: {
    flex: 1,
    height: 92,
  },
  profileMenuSection: {
    gap: SPACING.sm,
  },
  profileMenuRow: {
    height: 56,
  },
  articleScrollContent: {
    paddingBottom: 40,
  },
  articleContent: {
    gap: SPACING.lg,
    paddingHorizontal: SPACING.lg,
  },
  articleBadge: {
    height: 22,
    width: 84,
  },
  articleMetaRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  articleMetaShort: {
    height: 14,
    width: 76,
  },
  articleHero: {
    borderRadius: RADIUS.lg,
    height: 220,
    width: '100%',
  },
  articleReactionRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  articleReactionChip: {
    height: 32,
    width: 72,
  },
  articleReactionChipWide: {
    height: 32,
    width: 96,
  },
  articleCommentCard: {
    backgroundColor: COLORS.background.surface,
    borderRadius: RADIUS.lg,
    gap: SPACING.md,
    padding: SPACING.lg,
    ...SHADOWS.card,
  },
  articleCommentHeader: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  articleCommentAvatar: {
    borderRadius: 9999,
    height: 36,
    marginRight: SPACING.md,
    width: 36,
  },
  articleCommentMeta: {
    flex: 1,
    gap: 6,
  },
  articleCommentAuthor: {
    height: 14,
    width: 112,
  },
  articleCommentTime: {
    height: 12,
    width: 68,
  },
  chatContainer: {
    backgroundColor: COLORS.background.page,
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.lg,
  },
  chatMessages: {
    gap: SPACING.lg,
  },
  chatIncomingRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
  },
  chatAvatar: {
    borderRadius: 9999,
    height: 36,
    marginRight: SPACING.sm,
    width: 36,
  },
  chatIncomingBubbleGroup: {
    flex: 1,
    gap: 6,
  },
  chatMetaLabel: {
    height: 12,
    width: 108,
  },
  chatMetaLabelShort: {
    height: 12,
    width: 82,
  },
  chatIncomingBubbleLarge: {
    borderRadius: RADIUS.lg,
    height: 78,
    width: '76%',
  },
  chatIncomingBubbleSmall: {
    borderRadius: RADIUS.lg,
    height: 56,
    width: '58%',
  },
  chatOutgoingRow: {
    alignItems: 'flex-end',
  },
  chatOutgoingBubble: {
    borderRadius: RADIUS.lg,
    height: 62,
    width: '62%',
  },
  chatComposer: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: SPACING.sm,
    paddingTop: SPACING.lg,
  },
  chatComposerInput: {
    borderRadius: 9999,
    flex: 1,
    height: 44,
  },
  chatComposerButton: {
    borderRadius: 9999,
    height: 44,
    width: 44,
  },
  timetableScrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: 40,
  },
  timetableTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
  },
  timetableSegmented: {
    borderRadius: 9999,
    height: 36,
    width: 180,
  },
  timetableCredit: {
    height: 20,
    width: 72,
  },
  timetableGridCard: {
    borderRadius: RADIUS.lg,
    height: 360,
    width: '100%',
  },
  timetableSupplementSection: {
    gap: SPACING.sm,
    marginTop: SPACING.lg,
  },
  timetableSectionTitle: {
    height: 18,
    width: 96,
  },
  timetableSupplementCard: {
    borderRadius: RADIUS.lg,
    height: 72,
    width: '100%',
  },
  legalScrollContent: {
    paddingBottom: 40,
    paddingHorizontal: SPACING.lg,
    paddingTop: 20,
  },
  legalHero: {
    borderRadius: RADIUS.lg,
    height: 88,
    width: '100%',
  },
  legalCardList: {
    gap: SPACING.lg,
    marginTop: 20,
  },
  legalCard: {
    backgroundColor: COLORS.background.surface,
    borderRadius: RADIUS.lg,
    gap: SPACING.md,
    padding: SPACING.lg,
    ...SHADOWS.card,
  },
  legalCardTitle: {
    height: 18,
    width: 132,
  },
  inquiryScrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingTop: 20,
    paddingBottom: 28,
  },
  inquirySummaryRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
  },
  inquirySummaryTitle: {
    height: 22,
    width: 108,
  },
  inquirySummaryBadge: {
    borderRadius: 9999,
    height: 28,
    width: 54,
  },
  inquiryCardList: {
    gap: SPACING.md,
  },
  inquiryCard: {
    backgroundColor: COLORS.background.surface,
    borderColor: COLORS.border.subtle,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.lg,
    ...SHADOWS.card,
  },
  inquiryHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  inquiryBadgeRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  inquiryBadge: {
    borderRadius: 9999,
    height: 24,
    width: 68,
  },
  inquiryDate: {
    height: 12,
    width: 74,
  },
  inquiryBodyRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.md,
  },
  inquiryBody: {
    flex: 1,
    gap: SPACING.sm,
  },
  inquirySubject: {
    height: 18,
    width: '88%',
  },
  inquiryAttachment: {
    height: 12,
    width: 92,
  },
  inquiryThumb: {
    borderRadius: RADIUS.md,
    height: 84,
    width: 84,
  },
  noticeCard: {
    backgroundColor: COLORS.background.surface,
    borderRadius: RADIUS.lg,
    flexGrow: 1,
    overflow: 'hidden',
    ...SHADOWS.card,
  },
  noticeRow: {
    borderBottomColor: COLORS.border.subtle,
    borderBottomWidth: 1,
    minHeight: 85,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
  },
  noticeRowLast: {
    borderBottomWidth: 0,
  },
  noticeRowContent: {
    gap: SPACING.sm,
  },
  noticeMetaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  noticeMetaLeft: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  noticeDot: {
    borderRadius: 9999,
    height: 8,
    width: 8,
  },
  noticePill: {
    borderRadius: RADIUS.xs,
    height: 20,
    width: 64,
  },
  noticeTime: {
    height: 12,
    width: 52,
  },
  noticeChevron: {
    height: 16,
    width: 16,
  },
  noticeTitleRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: SPACING.md,
  },
  noticeTextColumn: {
    flex: 1,
    gap: 6,
  },
  noticeTitle: {
    height: 18,
    width: '96%',
  },
  noticeTitleShort: {
    height: 18,
    width: '72%',
  },
  noticeThumb: {
    borderRadius: RADIUS.md,
    height: 76,
    width: 76,
  },
  noticeFooterRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  noticeAuthor: {
    height: 12,
    width: 82,
  },
  noticeStatRow: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  noticeStat: {
    borderRadius: 9999,
    height: 16,
    width: 28,
  },
  composeContainer: {
    backgroundColor: COLORS.background.surface,
    flex: 1,
    gap: SPACING.lg,
    padding: SPACING.lg,
  },
  composeCategory: {
    borderRadius: RADIUS.lg,
    height: 44,
    width: '100%',
  },
  composeTitle: {
    borderRadius: RADIUS.lg,
    height: 52,
    width: '100%',
  },
  composeImageRow: {
    borderRadius: RADIUS.lg,
    height: 96,
    width: '100%',
  },
  composeFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  composeToggle: {
    borderRadius: 9999,
    height: 24,
    width: 108,
  },
  composeAction: {
    borderRadius: RADIUS.md,
    height: 32,
    width: 84,
  },
});
