import React from 'react';

import {useFriendRepository} from '@/di';

import type {
  FriendCode,
  FriendCodePreview,
  FriendSearchResult,
} from '../model/friend';

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message.trim() ? error.message : fallback;

export const useFriendAddData = () => {
  const friendRepository = useFriendRepository();
  const [myCode, setMyCode] = React.useState<FriendCode>();
  const [preview, setPreview] = React.useState<FriendCodePreview>();
  const [searchResults, setSearchResults] = React.useState<FriendSearchResult[]>(
    [],
  );
  const [searchNextCursor, setSearchNextCursor] = React.useState<string | null>(null);
  const [loadingMyCode, setLoadingMyCode] = React.useState(true);
  const [searching, setSearching] = React.useState(false);
  const [previewing, setPreviewing] = React.useState(false);
  const [sendingToId, setSendingToId] = React.useState<string>();
  const [regenerating, setRegenerating] = React.useState(false);

  const loadMyCode = React.useCallback(async () => {
    try {
      setLoadingMyCode(true);
      setMyCode(await friendRepository.getMyCode());
    } finally {
      setLoadingMyCode(false);
    }
  }, [friendRepository]);

  React.useEffect(() => {
    loadMyCode().catch(() => undefined);
  }, [loadMyCode]);

  const previewFriendCode = React.useCallback(
    async (friendCode: string) => {
      if (!friendCode.trim()) {
        throw new Error('친구 코드를 입력해주세요.');
      }

      try {
        setPreviewing(true);
        const result = await friendRepository.previewFriendCode(friendCode);
        setPreview(result);
        return result;
      } catch (error) {
        setPreview(undefined);
        throw new Error(getErrorMessage(error, '친구 코드를 확인하지 못했습니다.'));
      } finally {
        setPreviewing(false);
      }
    },
    [friendRepository],
  );

  const searchFriends = React.useCallback(
    async (query: string) => {
      if (query.trim().length < 2) {
        throw new Error('닉네임을 두 글자 이상 입력해주세요.');
      }

      try {
        setSearching(true);
        const page = await friendRepository.searchFriends({
          query,
          size: 20,
        });
        setSearchResults(page.items);
        setSearchNextCursor(page.nextCursor);
      } catch (error) {
        setSearchResults([]);
        setSearchNextCursor(null);
        throw new Error(getErrorMessage(error, '친구를 검색하지 못했습니다.'));
      } finally {
        setSearching(false);
      }
    },
    [friendRepository],
  );

  const loadMoreSearchResults = React.useCallback(
    async (query: string) => {
      if (!searchNextCursor) {
        return;
      }

      try {
        setSearching(true);
        const page = await friendRepository.searchFriends({
          cursor: searchNextCursor,
          query,
          size: 20,
        });
        setSearchResults(current => [...current, ...page.items]);
        setSearchNextCursor(page.nextCursor);
      } finally {
        setSearching(false);
      }
    },
    [friendRepository, searchNextCursor],
  );

  const sendFriendRequest = React.useCallback(
    async (friendId: string) => {
      try {
        setSendingToId(friendId);
        const mutation = await friendRepository.createFriendRequest(friendId);
        setPreview(current =>
          current?.id === friendId
            ? {...current, canSendFriendRequest: false}
            : current,
        );
        setSearchResults(current =>
          current.map(result =>
            result.id === friendId
              ? {...result, canSendFriendRequest: false}
              : result,
          ),
        );
        return mutation;
      } finally {
        setSendingToId(undefined);
      }
    },
    [friendRepository],
  );

  const regenerateMyCode = React.useCallback(async () => {
    try {
      setRegenerating(true);
      const code = await friendRepository.regenerateMyCode();
      setMyCode(code);
      return code;
    } finally {
      setRegenerating(false);
    }
  }, [friendRepository]);

  return {
    loadingMyCode,
    loadMoreSearchResults,
    myCode,
    preview,
    previewFriendCode,
    previewing,
    regenerating,
    regenerateMyCode,
    searchFriends,
    searchResults,
    searchNextCursor,
    searching,
    sendFriendRequest,
    sendingToId,
  };
};
