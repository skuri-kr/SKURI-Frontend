import { useEffect, useState } from 'react';

import {useAppConfigRepository} from '@/di';
import { logCrashlyticsMessage, subscribeAuthStateChange } from '@/shared/lib/firebase';
import type {
  StartupModalMode,
  VersionModalConfig,
} from '@/shared/types/version';

import { configureGoogleSignin } from './configureGoogleSignin';
import { checkVersionUpdate } from './versionCheck';

export interface AppBootstrapState {
  checkingVersion: boolean;
  dismissStartupModal: () => void;
  modalConfig?: VersionModalConfig;
  retryVersionCheck: () => void;
  startupModalMode: StartupModalMode;
}

export const useAppBootstrap = (): AppBootstrapState => {
  const appConfigRepository = useAppConfigRepository();
  const [checkingVersion, setCheckingVersion] = useState(true);
  const [modalConfig, setModalConfig] = useState<VersionModalConfig | undefined>();
  const [retryKey, setRetryKey] = useState(0);
  const [startupModalMode, setStartupModalMode] =
    useState<StartupModalMode>('hidden');

  useEffect(() => {
    configureGoogleSignin();
    logCrashlyticsMessage('App mounted');

    const unsubscribeAuth = subscribeAuthStateChange(() => {});

    return () => {
      unsubscribeAuth();
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    setCheckingVersion(true);

    checkVersionUpdate(appConfigRepository)
      .then(result => {
        if (!isMounted) {
          return;
        }

        if (result.status === 'error') {
          setStartupModalMode('maintenance');
          setModalConfig(undefined);
          return;
        }

        if (!result.needsUpdate) {
          setStartupModalMode('hidden');
          setModalConfig(undefined);
          return;
        }

        setStartupModalMode(
          result.forceUpdate ? 'force-update' : 'soft-update',
        );
        setModalConfig(result.modalConfig);
      })
      .catch(error => {
        console.error('버전 체크 실패:', error);
        if (!isMounted) {
          return;
        }
        setStartupModalMode('maintenance');
        setModalConfig(undefined);
      })
      .finally(() => {
        if (isMounted) {
          setCheckingVersion(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [appConfigRepository, retryKey]);

  return {
    checkingVersion,
    dismissStartupModal: () => {
      setStartupModalMode(currentMode =>
        currentMode === 'soft-update' ? 'hidden' : currentMode,
      );
    },
    modalConfig,
    retryVersionCheck: () => {
      setRetryKey(currentKey => currentKey + 1);
    },
    startupModalMode,
  };
};
