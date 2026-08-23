import type {ChatRoomFilter} from '../../../model/types';
import {SpringChatRepository} from '../SpringChatRepository';

type ListFilterBuilder = {
  buildListFilter: (filter: ChatRoomFilter) => {
    joined?: boolean;
    type?: string;
  };
};

describe('SpringChatRepository list filter', () => {
  it('참여 중인 방 구독은 joined=true 요청으로 변환한다', () => {
    const repository =
      new SpringChatRepository() as unknown as ListFilterBuilder;

    expect(
      repository.buildListFilter({
        category: 'all',
        joinedOnly: true,
        userId: 'member-1',
      }),
    ).toEqual({joined: true});
  });
});
