export type NotificationPayload =
  | {type: 'PARTY_CREATED'; partyId: string}
  | {type: 'PARTY_JOIN_REQUEST'; partyId: string; requestId: string}
  | {type: 'PARTY_JOIN_ACCEPTED'; partyId: string; requestId: string}
  | {type: 'PARTY_JOIN_DECLINED'; partyId: string; requestId: string}
  | {type: 'PARTY_CLOSED'; partyId: string}
  | {type: 'PARTY_REOPENED'; partyId: string}
  | {type: 'PARTY_ARRIVED'; partyId: string}
  | {type: 'PARTY_ENDED'; partyId: string}
  | {type: 'MEMBER_KICKED'; partyId: string}
  | {type: 'SETTLEMENT_COMPLETED'; partyId: string}
  | {type: 'CHAT_MESSAGE'; chatRoomId: string}
  | {type: 'FRIEND_REQUEST'; requestId?: string}
  | {type: 'FRIEND_ACCEPTED'; friendPublicId?: string}
  | {type: 'FRIEND_DECLINED'; requestId?: string}
  | {
      type: 'PARTY_INVITATION';
      invitationId?: string;
      invitationType?: 'PARTY';
    }
  | {
      type: 'CHAT_ROOM_INVITATION';
      invitationId?: string;
      invitationType?: 'CHAT_ROOM';
    }
  | {type: 'POST_LIKED'; postId: string}
  | {type: 'COMMENT_CREATED'; postId: string; commentId: string}
  | {type: 'COMMENT_CREATED'; noticeId: string; commentId: string}
  | {type: 'COMMENT_CREATED'; appNoticeId: string; commentId: string}
  | {type: 'NOTICE'; noticeId: string}
  | {type: 'APP_NOTICE'; appNoticeId: string}
  | {type: 'ACADEMIC_SCHEDULE'; academicScheduleId: string};
