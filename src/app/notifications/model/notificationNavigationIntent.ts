export type NotificationNavigationIntent =
  | {kind: 'taxiScreen'}
  | {kind: 'taxiChat'; partyId: string}
  | {kind: 'communityChat'; chatRoomId: string}
  | {
      kind: 'friendHub';
      initialTab: 'requests' | 'invitations';
      targetInvitation?: {id: string; type: 'PARTY' | 'CHAT_ROOM'};
    }
  | {kind: 'friendDetail'; friendPublicId: string}
  | {kind: 'boardDetail'; postId: string; initialCommentId?: string}
  | {kind: 'noticeDetail'; noticeId: string; initialCommentId?: string}
  | {kind: 'appNoticeDetail'; noticeId: string}
  | {kind: 'academicCalendarDetail'; scheduleId: string};
