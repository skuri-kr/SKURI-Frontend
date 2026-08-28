import React, { PropsWithChildren } from 'react';

import { RepositoryProvider } from '@/di/RepositoryProvider';
import { AuthProvider } from '@/features/auth';
import { MyPartyProvider } from '@/features/taxi';
import { ToastProvider } from '@/shared/ui/ToastProvider';

export const AppProviders = ({ children }: PropsWithChildren) => {
  return (
    <RepositoryProvider>
      <AuthProvider>
        <ToastProvider>
          <MyPartyProvider>{children}</MyPartyProvider>
        </ToastProvider>
      </AuthProvider>
    </RepositoryProvider>
  );
};
