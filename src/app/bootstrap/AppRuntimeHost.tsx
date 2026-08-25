import React from 'react';

import {useAuthEntryGuard} from '@/app/guards';
import {ForegroundNotification} from '@/shared/ui/ForegroundNotification';
import {useFriendNotificationRealtimeInvalidation} from '@/features/friend/hooks/useFriendNotificationRealtimeInvalidation';
import {JoinRequestModal, useJoinRequestModal, useMyParty} from '@/features/taxi';

import {useRegisterPushHandlers} from './registerPushHandlers';
import {useForegroundNotificationRuntime} from './useForegroundNotificationRuntime';

export const AppRuntimeHost = () => {
  const {
    authState: { user, loading },
    guardResult: { needsProfile, permissionsComplete },
  } = useAuthEntryGuard();

  const {
    foregroundNotification,
    getCurrentChatRoomId,
    getCurrentScreen,
    handleCommunityChatForegroundNotification,
    handleForegroundNotificationPress,
    handleForegroundNotificationDismiss,
    showForegroundNotification,
  } = useForegroundNotificationRuntime();
  const {isLeader, myParty} = useMyParty();

  useFriendNotificationRealtimeInvalidation({
    enabled: !loading && !needsProfile && permissionsComplete,
  });

  const {
    joinData,
    setJoinData,
    requesterName,
    handleAccept,
    handleDecline,
    handleRequestClose,
    handleJoinRequestAccepted,
  } = useJoinRequestModal({
    activeLeaderPartyId: isLeader ? myParty?.id ?? null : null,
    enabled: !needsProfile && permissionsComplete,
    userId: user?.uid,
  });

  useRegisterPushHandlers({
    getCurrentScreen,
    getCurrentChatRoomId,
    handleCommunityChatForegroundNotification,
    handleJoinRequestAccepted,
    handleJoinRequestReceived: payload => {
      setJoinData({
        partyId: payload.partyId,
        requestId: payload.requestId,
      });
    },
    needsProfile,
    permissionsComplete,
    showForegroundNotification,
    userId: user?.uid,
  });

  if (loading) {
    return null;
  }

  return (
    <>
      <JoinRequestModal
        visible={Boolean(joinData)}
        invitationInviterName={joinData?.invitationInviterName}
        requesterName={requesterName}
        onDecline={handleDecline}
        onAccept={handleAccept}
        onRequestClose={handleRequestClose}
      />
      <ForegroundNotification
        visible={foregroundNotification.visible}
        title={foregroundNotification.title}
        body={foregroundNotification.body}
        onPress={handleForegroundNotificationPress}
        onDismiss={handleForegroundNotificationDismiss}
      />
    </>
  );
};
