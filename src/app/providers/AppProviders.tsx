import React, { PropsWithChildren } from 'react';

import {AppBootstrapProvider} from '@/app/bootstrap/useAppBootstrap';
import { RepositoryProvider } from '@/di/RepositoryProvider';
import { AuthProvider } from '@/features/auth';
import { MyPartyProvider } from '@/features/taxi';
import {AdsProvider} from '@/shared/ads';
import { ToastProvider } from '@/shared/ui/ToastProvider';

export const AppProviders = ({ children }: PropsWithChildren) => {
  return (
    <RepositoryProvider>
      <AuthProvider>
        <AppBootstrapProvider>
          <AdsProvider>
            <ToastProvider>
              <MyPartyProvider>{children}</MyPartyProvider>
            </ToastProvider>
          </AdsProvider>
        </AppBootstrapProvider>
      </AuthProvider>
    </RepositoryProvider>
  );
};
