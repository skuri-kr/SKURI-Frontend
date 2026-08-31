import type {ContentBlockTargetType} from '../../model/contentBlock';

export interface CreateContentBlockRequestDto {
  targetId: string;
  targetType: ContentBlockTargetType;
}

export interface ContentBlockResponseDto {
  blockId: string;
  blockedAt: string;
  label: string;
}
