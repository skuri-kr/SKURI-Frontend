import type {Notification} from '../../data/repositories/INotificationRepository';
import {mapNotificationToInboxItemViewData} from '../notificationCenterAssembler';

const createCommentNotification = (
  data: Notification['data'],
): Notification => ({
  createdAt: new Date('2026-08-29T00:00:00Z'),
  data,
  id: 'notification-1',
  isRead: false,
  message: '새 댓글이 달렸습니다.',
  title: '댓글 알림',
  type: 'COMMENT_CREATED',
});

describe('notificationCenterAssembler', () => {
  it.each([
    [{appNoticeId: 'app-notice-1', commentId: 'comment-1'}, '앱 공지'],
    [{noticeId: 'notice-1', commentId: 'comment-1'}, '공지사항'],
    [{postId: 'post-1', commentId: 'comment-1'}, '커뮤니티'],
  ] as const)('댓글 알림의 대상에 맞는 컨텍스트 라벨을 만든다', (data, contextLabel) => {
    expect(
      mapNotificationToInboxItemViewData(createCommentNotification(data)).contextLabel,
    ).toBe(contextLabel);
  });
});
