// SKTaxi: App Notice Repository 인터페이스 - DIP 원칙 적용
// 앱 내 공지사항 데이터 접근 추상화

import type { SubscriptionCallbacks, Unsubscribe } from '@/shared/types/subscription';
import type {
  NoticeComment,
  NoticeCommentFormData,
  NoticeCommentTreeNode,
} from '@/features/notice/model/types';

/**
 * 앱 공지사항 타입
 */
export interface AppNotice {
  id: string;
  title: string;
  content: string;
  category: 'update' | 'service' | 'event' | 'policy';
  priority: 'urgent' | 'normal' | 'info';
  publishedAt: Date;
  updatedAt?: Date;
  imageUrls?: string[];
  actionUrl?: string;
  actionLabel?: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  isLiked: boolean;
}

export interface AppNoticeReadState {
  appNoticeId: string;
  isRead: boolean;
  readAt: Date;
}

/**
 * App Notice Repository 인터페이스
 */
export interface IAppNoticeRepository {
  getUnreadCount(): Promise<number>;
  markAsRead(noticeId: string): Promise<AppNoticeReadState>;

  /**
   * 앱 공지사항 목록 실시간 구독
   * @param callbacks - 데이터 및 에러 콜백
   * @returns 구독 해제 함수
   */
  subscribeToAppNotices(callbacks: SubscriptionCallbacks<AppNotice[]>): Unsubscribe;

  /**
   * 앱 공지사항 목록 조회
   * @returns 공지사항 배열
   */
  getAppNotices(): Promise<AppNotice[]>;

  /**
   * 단일 앱 공지사항 조회
   * @param noticeId - 공지사항 ID
   * @returns 공지사항 또는 null
   */
  getAppNotice(noticeId: string): Promise<AppNotice | null>;
  getComments(noticeId: string): Promise<NoticeCommentTreeNode[]>;
  createComment(
    noticeId: string,
    comment: NoticeCommentFormData & {userId: string; userDisplayName: string},
  ): Promise<NoticeComment>;
  updateComment(
    noticeId: string,
    commentId: string,
    content: string,
    isAnonymous?: boolean,
  ): Promise<void>;
  deleteComment(noticeId: string, commentId: string): Promise<void>;
  toggleLike(noticeId: string): Promise<{isLiked: boolean; likeCount: number}>;
  toggleCommentLike(
    noticeId: string,
    commentId: string,
  ): Promise<{commentId: string; isLiked: boolean; likeCount: number}>;

  /**
   * 단일 앱 공지사항 실시간 구독
   * @param noticeId - 공지사항 ID
   * @param callbacks - 데이터 및 에러 콜백
   * @returns 구독 해제 함수
   */
  subscribeToAppNotice(noticeId: string, callbacks: SubscriptionCallbacks<AppNotice | null>): Unsubscribe;
}
