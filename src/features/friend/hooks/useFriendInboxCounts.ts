import React from 'react';

import {useFriendRepository} from '@/di';

import type {FriendInboxCounts} from '../model/friend';

export const useFriendInboxCounts = () => {
  const friendRepository = useFriendRepository();
  const [counts, setCounts] = React.useState<FriendInboxCounts>();

  const reload = React.useCallback(async () => {
    try {
      setCounts(await friendRepository.getInboxCounts());
    } catch {
      // 마이페이지의 보조 배지는 불러오지 못해도 기본 메뉴를 막지 않는다.
      // 이미 확인한 요청 수는 일시적인 새로고침 실패로 지우지 않는다.
    }
  }, [friendRepository]);

  React.useEffect(() => {
    reload().catch(() => undefined);
  }, [reload]);

  return {counts, reload};
};
