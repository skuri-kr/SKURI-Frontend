import {SpringContentBlockRepository} from '../SpringContentBlockRepository';

const createApiClient = () => ({
  createContentBlock: jest.fn(),
  deleteContentBlock: jest.fn(),
  getContentBlocks: jest.fn(),
});

describe('SpringContentBlockRepository', () => {
  it('콘텐츠 식별자만 전송하고 응답의 사용자 정보성 라벨은 노출하지 않는다', async () => {
    const apiClient = createApiClient();
    apiClient.createContentBlock.mockResolvedValue({
      data: {
        blockId: 'opaque-block-1',
        blockedAt: '2026-08-31T01:02:03Z',
        label: '실제 닉네임이 잘못 내려온 경우',
      },
      success: true,
    });
    const repository = new SpringContentBlockRepository(apiClient);

    await expect(
      repository.blockContent({targetId: 'comment-1', targetType: 'COMMENT'}),
    ).resolves.toEqual({
      blockedAt: new Date('2026-08-31T01:02:03Z'),
      id: 'opaque-block-1',
      label: '차단한 사용자',
    });
    expect(apiClient.createContentBlock).toHaveBeenCalledWith({
      targetId: 'comment-1',
      targetType: 'COMMENT',
    });
  });

  it('차단 목록을 불투명한 차단 ID와 고정 라벨로 변환한다', async () => {
    const apiClient = createApiClient();
    apiClient.getContentBlocks.mockResolvedValue({
      data: [
        {
          blockId: 'opaque-block-2',
          blockedAt: '2026-08-31T02:03:04Z',
          label: '차단한 사용자',
        },
      ],
      success: true,
    });
    const repository = new SpringContentBlockRepository(apiClient);

    await expect(repository.getContentBlocks()).resolves.toEqual([
      {
        blockedAt: new Date('2026-08-31T02:03:04Z'),
        id: 'opaque-block-2',
        label: '차단한 사용자',
      },
    ]);
  });

  it('실제 사용자 식별자 대신 불투명한 차단 ID로 해제한다', async () => {
    const apiClient = createApiClient();
    apiClient.deleteContentBlock.mockResolvedValue(undefined);
    const repository = new SpringContentBlockRepository(apiClient);

    await repository.unblockContent('opaque-block-3');

    expect(apiClient.deleteContentBlock).toHaveBeenCalledWith('opaque-block-3');
  });
});
