import React from 'react';

import {useInvalidationVersion} from '@/app/data-freshness/dataInvalidation';
import {FRIEND_HUB_INVALIDATION_KEY} from '@/app/data-freshness/invalidationKeys';
import {useFriendRepository, useTimetableRepository} from '@/di';

import type {FriendSummary} from '../model/friend';
import type {
  TimetableShareScope,
  TimetableSharingSettings,
} from '@/features/timetable/model/timetableDomain';

const FRIEND_NAME_COLLATOR = new Intl.Collator('ko');

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message.trim() ? error.message : fallback;

const sortFriends = (friends: FriendSummary[]) =>
  [...friends].sort((left, right) => {
    if (left.favorite !== right.favorite) {
      return left.favorite ? -1 : 1;
    }

    return (
      FRIEND_NAME_COLLATOR.compare(left.nickname, right.nickname) ||
      left.id.localeCompare(right.id)
    );
  });

export const useTimetableSharingSettingsData = () => {
  const friendRepository = useFriendRepository();
  const timetableRepository = useTimetableRepository();
  const friendHubInvalidationVersion = useInvalidationVersion(
    FRIEND_HUB_INVALIDATION_KEY,
  );
  const [friends, setFriends] = React.useState<FriendSummary[]>([]);
  const [settings, setSettings] = React.useState<TimetableSharingSettings>();
  const [friendsError, setFriendsError] = React.useState<string>();
  const [loadingFriends, setLoadingFriends] = React.useState(true);
  const [loadingSettings, setLoadingSettings] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [settingsError, setSettingsError] = React.useState<string>();
  const savingRef = React.useRef(false);
  const pendingReloadRef = React.useRef(false);
  const friendsVersionRef = React.useRef(0);
  const settingsVersionRef = React.useRef(0);

  const reload = React.useCallback(async () => {
    if (savingRef.current) {
      pendingReloadRef.current = true;
      return;
    }

    const settingsLoadVersion = settingsVersionRef.current + 1;
    const friendsLoadVersion = friendsVersionRef.current + 1;
    settingsVersionRef.current = settingsLoadVersion;
    friendsVersionRef.current = friendsLoadVersion;
    setLoadingSettings(true);
    setLoadingFriends(true);
    setSettingsError(undefined);
    setFriendsError(undefined);
    const settingsRequest = timetableRepository.getMySharingSettings()
      .then(
        nextSettings => {
          if (settingsLoadVersion === settingsVersionRef.current) {
            setSettings(nextSettings);
          }
        },
        error => {
          if (settingsLoadVersion === settingsVersionRef.current) {
            setSettingsError(
              getErrorMessage(
                error,
                '시간표 공유 설정을 불러오지 못했습니다.',
              ),
            );
          }
        },
      )
      .finally(() => {
        if (settingsLoadVersion === settingsVersionRef.current) {
          setLoadingSettings(false);
        }
      });
    const friendsRequest = friendRepository.getFriends()
      .then(
        nextFriends => {
          if (friendsLoadVersion === friendsVersionRef.current) {
            setFriends(sortFriends(nextFriends));
          }
        },
        error => {
          if (friendsLoadVersion === friendsVersionRef.current) {
            setFriendsError(
              getErrorMessage(error, '친구 목록을 불러오지 못했습니다.'),
            );
          }
        },
      )
      .finally(() => {
        if (friendsLoadVersion === friendsVersionRef.current) {
          setLoadingFriends(false);
        }
      });

    await Promise.all([settingsRequest, friendsRequest]);
  }, [friendRepository, timetableRepository]);

  React.useEffect(() => {
    reload().catch(() => undefined);
  }, [friendHubInvalidationVersion, reload]);

  const supersedeSettingsReload = React.useCallback(() => {
    settingsVersionRef.current += 1;
    setLoadingSettings(false);
  }, []);

  const finishSavingAndReplayReload = React.useCallback(async () => {
    savingRef.current = false;
    setSaving(false);

    if (!pendingReloadRef.current) {
      return;
    }

    pendingReloadRef.current = false;
    await reload();
  }, [reload]);

  const updateDefaultScope = React.useCallback(
    async (scope: TimetableShareScope) => {
      if (!settings || savingRef.current) {
        return;
      }

      const previous = settings;
      savingRef.current = true;
      supersedeSettingsReload();
      setSaving(true);
      setSettingsError(undefined);
      setSettings(current => current ? {...current, defaultScope: scope} : current);
      try {
        const saved = await timetableRepository.updateMySharingSettings(scope);
        setSettings(saved);
      } catch (saveError) {
        setSettings(previous);
        throw saveError;
      } finally {
        await finishSavingAndReplayReload();
      }
    },
    [
      finishSavingAndReplayReload,
      settings,
      supersedeSettingsReload,
      timetableRepository,
    ],
  );

  const updateFriendScope = React.useCallback(
    async (friendId: string, scope?: TimetableShareScope) => {
      if (!settings || savingRef.current) {
        return;
      }

      const previous = settings;
      const overrides = settings.overrides.filter(
        override => override.friendId !== friendId,
      );
      const nextSettings: TimetableSharingSettings = {
        ...settings,
        overrides: scope ? [...overrides, {friendId, scope}] : overrides,
      };
      savingRef.current = true;
      supersedeSettingsReload();
      setSaving(true);
      setSettingsError(undefined);
      setSettings(nextSettings);
      try {
        if (scope) {
          await timetableRepository.updateShareOverride({friendId, scope});
        } else {
          await timetableRepository.deleteShareOverride(friendId);
        }
      } catch (saveError) {
        setSettings(previous);
        throw saveError;
      } finally {
        await finishSavingAndReplayReload();
      }
    },
    [
      finishSavingAndReplayReload,
      settings,
      supersedeSettingsReload,
      timetableRepository,
    ],
  );

  const getFriendScope = React.useCallback(
    (friendId: string) =>
      settings?.overrides.find(override => override.friendId === friendId)
        ?.scope,
    [settings],
  );

  return {
    friends,
    friendsError,
    getFriendScope,
    loading: loadingSettings || loadingFriends,
    loadingFriends,
    loadingSettings,
    reload,
    saving,
    settings,
    settingsError,
    updateDefaultScope,
    updateFriendScope,
  };
};
