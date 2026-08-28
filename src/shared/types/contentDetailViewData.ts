export type ContentDetailBadgeTone =
  | 'blue'
  | 'gray'
  | 'green'
  | 'orange'
  | 'pink'
  | 'purple';

export interface ContentDetailBadgeViewData {
  id: string;
  label: string;
  tone: ContentDetailBadgeTone;
}

export type ContentDetailTextSegmentViewData =
  | {
      text: string;
      type: 'text';
    }
  | {
      text: string;
      type: 'link';
      url: string;
    };

export type ContentDetailBodyBlockViewData =
  | {
      id: string;
      segments?: ContentDetailTextSegmentViewData[];
      text: string;
      type: 'paragraph';
    }
  | {
      alt?: string;
      aspectRatio?: number;
      id: string;
      imageUrl: string;
      linkUrl?: string;
      type: 'image';
    }
  | {
      baseUrl?: string;
      html: string;
      id: string;
      type: 'table';
    };

export interface ContentDetailReactionViewData {
  count: number;
  iconName: string;
  id: string;
}

export interface ContentDetailCommentViewData {
  authorLabel: string;
  authorProfileImage?: string | null;
  body: string;
  dateLabel: string;
  id: string;
  isDeleted: boolean;
  isLiked: boolean;
  isMine?: boolean;
  isPostAuthor?: boolean;
  isReply: boolean;
  likeCount: number;
  replyTargetLabel?: string;
}

export interface ContentDetailAttachmentViewData {
  fileName: string;
  id: string;
  sizeLabel: string;
}

export interface ContentDetailViewData {
  attachments?: ContentDetailAttachmentViewData[];
  authorLabel?: string;
  authorProfileImage?: string | null;
  bodyBlocks: ContentDetailBodyBlockViewData[];
  commentInputPlaceholder: string;
  comments: ContentDetailCommentViewData[];
  dateLabel: string;
  emptyCommentsLabel: string;
  metaBadges: ContentDetailBadgeViewData[];
  reactions: ContentDetailReactionViewData[];
  title: string;
  viewCountLabel?: string;
}
