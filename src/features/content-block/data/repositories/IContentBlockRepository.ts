import type {
  ContentBlock,
  ContentBlockTarget,
} from '../../model/contentBlock';

export interface IContentBlockRepository {
  blockContent(target: ContentBlockTarget): Promise<ContentBlock>;
  getContentBlocks(): Promise<ContentBlock[]>;
  unblockContent(blockId: string): Promise<void>;
}
