import {
  contentBlockApiClient,
  type ContentBlockApiClient,
} from '../api/contentBlockApiClient';
import type {ContentBlockResponseDto} from '../dto/contentBlockDto';
import {
  CONTENT_BLOCK_LABEL,
  type ContentBlock,
  type ContentBlockTarget,
} from '../../model/contentBlock';
import type {IContentBlockRepository} from './IContentBlockRepository';

const mapContentBlock = (block: ContentBlockResponseDto): ContentBlock => ({
  blockedAt: new Date(block.blockedAt),
  id: block.blockId,
  label: CONTENT_BLOCK_LABEL,
});

export class SpringContentBlockRepository implements IContentBlockRepository {
  constructor(
    private readonly apiClient: ContentBlockApiClient = contentBlockApiClient,
  ) {}

  async blockContent(target: ContentBlockTarget): Promise<ContentBlock> {
    const response = await this.apiClient.createContentBlock(target);
    return mapContentBlock(response.data);
  }

  async getContentBlocks(): Promise<ContentBlock[]> {
    const response = await this.apiClient.getContentBlocks();
    return response.data.map(mapContentBlock);
  }

  async unblockContent(blockId: string): Promise<void> {
    await this.apiClient.deleteContentBlock(blockId);
  }
}
