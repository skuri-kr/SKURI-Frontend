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
  const [error, setError] = React.useState<string>();
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const savingRef = React.useRef(false);
  const stateVersionRef = React.useRef(0);

  const reload = React.useCallback(async () => {
    const loadVersion = stateVersionRef.current;
    try {
      setLoading(true);
      setError(undefined);
      const [nextSettings, nextFriends] = await Promise.all([
        timetableRepository.getMySharingSettings(),
        friendRepository.getFriends(),
      ]);
      if (loadVersion !== stateVersionRef.current) {
        return;
      }
      setSettings(nextSettings);
      setFriends(sortFriends(nextFriends));
    } catch (loadError) {
      if (loadVersion === stateVersionRef.current) {
        setError(getErrorMessage(loadError, '시간표 공유 설정을 불러오지 못했습니다.'));
      }
    } finally {
      if (loadVersion === stateVersionRef.current) {
        setLoading(false);
      }
    }
  }, [friendRepository, timetableRepository]);

  React.useEffect(() => {
    reload().catch(() => undefined);
  }, [friendHubInvalidationVersion, reload]);

  const updateDefaultScope = React.useCallback(
    async (scope: TimetableShareScope) => {
      if (!settings || savingRef.current) {
        return;
      }

      const previous = settings;
      savingRef.current = true;
      stateVersionRef.current += 1;
      setSaving(true);
      setError(undefined);
      setSettings(current => current ? {...current, defaultScope: scope} : current);
      try {
        const saved = await timetableRepository.updateMySharingSettings(scope);
        setSettings(saved);
      } catch (saveError) {
        setSettings(previous);
        throw saveError;
      } finally {
        savingRef.current = false;
        setSaving(false);
      }
    },
    [settings, timetableRepository],
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
      stateVersionRef.current += 1;
      setSaving(true);
      setError(undefined);
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
        savingRef.current = false;
        setSaving(false);
      }
    },
    [settings, timetableRepository],
  );

  const getFriendScope = React.useCallback(
    (friendId: string) =>
      settings?.overrides.find(override => override.friendId === friendId)
        ?.scope,
    [settings],
  );

  return {
    error,
    friends,
    getFriendScope,
    loading,
    reload,
    saving,
    settings,
    updateDefaultScope,
    updateFriendScope,
  };
};
