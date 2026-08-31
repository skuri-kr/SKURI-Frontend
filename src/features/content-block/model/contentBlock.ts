export const CONTENT_BLOCK_LABEL = '차단한 사용자' as const;

export type ContentBlockTargetType =
  | 'POST'
  | 'COMMENT'
  | 'NOTICE_COMMENT'
  | 'APP_NOTICE_COMMENT';

export interface ContentBlockTarget {
  targetId: string;
  targetType: ContentBlockTargetType;
}

export interface ContentBlock {
  blockedAt: Date;
  id: string;
  label: typeof CONTENT_BLOCK_LABEL;
}
