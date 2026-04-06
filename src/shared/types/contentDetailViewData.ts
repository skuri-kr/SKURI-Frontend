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

export type ContentDetailBodyBlockViewData =
  | {
      id: string;
      text: string;
      type: 'paragraph';
    }
  | {
      alt?: string;
      aspectRatio?: number;
      id: string;
      imageUrl: string;
      type: 'image';
    }
  | {
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
