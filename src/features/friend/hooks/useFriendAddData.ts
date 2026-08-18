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
  const [myCodeError, setMyCodeError] = React.useState<string>();
  const [loadingMyCode, setLoadingMyCode] = React.useState(true);
  const [searching, setSearching] = React.useState(false);
  const [previewing, setPreviewing] = React.useState(false);
  const [sendingToId, setSendingToId] = React.useState<string>();
  const [regenerating, setRegenerating] = React.useState(false);
  const previewRequestVersionRef = React.useRef(0);
  const searchRequestVersionRef = React.useRef(0);
  const loadingMoreSearchRef = React.useRef(false);

  const loadMyCode = React.useCallback(async () => {
    try {
      setLoadingMyCode(true);
      setMyCodeError(undefined);
      setMyCode(await friendRepository.getMyCode());
    } catch (error) {
      setMyCodeError(getErrorMessage(error, '친구 코드를 불러오지 못했습니다.'));
      throw error;
    } finally {
      setLoadingMyCode(false);
    }
  }, [friendRepository]);

  React.useEffect(() => {
    loadMyCode().catch(() => undefined);
  }, [loadMyCode]);

  const invalidateFriendCodePreview = React.useCallback(() => {
    previewRequestVersionRef.current += 1;
    setPreview(undefined);
    setPreviewing(false);
  }, []);

  const previewFriendCode = React.useCallback(
    async (friendCode: string) => {
      if (!friendCode.trim()) {
        throw new Error('친구 코드를 입력해주세요.');
      }

      const requestVersion = previewRequestVersionRef.current + 1;
      previewRequestVersionRef.current = requestVersion;

      try {
        setPreviewing(true);
        setPreview(undefined);
        const result = await friendRepository.previewFriendCode(friendCode);
        if (requestVersion !== previewRequestVersionRef.current) {
          return undefined;
        }

        setPreview(result);
        return result;
      } catch (error) {
        if (requestVersion !== previewRequestVersionRef.current) {
          return undefined;
        }

        setPreview(undefined);
        throw new Error(getErrorMessage(error, '친구 코드를 확인하지 못했습니다.'));
      } finally {
        if (requestVersion === previewRequestVersionRef.current) {
          setPreviewing(false);
        }
      }
    },
    [friendRepository],
  );

  const resetSearch = React.useCallback(() => {
    searchRequestVersionRef.current += 1;
    setSearchResults([]);
    setSearchNextCursor(null);
    setSearching(false);
  }, []);

  const searchFriends = React.useCallback(
    async (query: string) => {
      if (query.trim().length < 2) {
        throw new Error('닉네임을 두 글자 이상 입력해주세요.');
      }

      const requestVersion = searchRequestVersionRef.current + 1;
      searchRequestVersionRef.current = requestVersion;

      try {
        setSearching(true);
        setSearchResults([]);
        setSearchNextCursor(null);
        const page = await friendRepository.searchFriends({
          query,
          size: 20,
        });
        if (requestVersion !== searchRequestVersionRef.current) {
          return;
        }

        setSearchResults(page.items);
        setSearchNextCursor(page.nextCursor);
      } catch (error) {
        if (requestVersion !== searchRequestVersionRef.current) {
          return;
        }

        setSearchResults([]);
        setSearchNextCursor(null);
        throw new Error(getErrorMessage(error, '친구를 검색하지 못했습니다.'));
      } finally {
        if (requestVersion === searchRequestVersionRef.current) {
          setSearching(false);
        }
      }
    },
    [friendRepository],
  );

  const loadMoreSearchResults = React.useCallback(
    async (query: string) => {
      if (!searchNextCursor || loadingMoreSearchRef.current) {
        return;
      }

      const requestVersion = searchRequestVersionRef.current;
      loadingMoreSearchRef.current = true;

      try {
        setSearching(true);
        const page = await friendRepository.searchFriends({
          cursor: searchNextCursor,
          query,
          size: 20,
        });
        if (requestVersion !== searchRequestVersionRef.current) {
          return;
        }

        setSearchResults(current => [...current, ...page.items]);
        setSearchNextCursor(page.nextCursor);
      } finally {
        loadingMoreSearchRef.current = false;
        if (requestVersion === searchRequestVersionRef.current) {
          setSearching(false);
        }
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
    invalidateFriendCodePreview,
    loadMoreSearchResults,
    myCode,
    myCodeError,
    preview,
    previewFriendCode,
    previewing,
    regenerating,
    regenerateMyCode,
    reloadMyCode: loadMyCode,
    resetSearch,
    searchFriends,
    searchResults,
    searchNextCursor,
    searching,
    sendFriendRequest,
    sendingToId,
  };
};
