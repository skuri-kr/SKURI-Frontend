export type JoinRequestStatusValue =
  | 'pending'
  | 'accepted'
  | 'declined'
  | 'canceled'
  | 'expired';

export interface INotificationActionRepository {
  getJoinRequestStatus(
    requestId: string,
  ): Promise<JoinRequestStatusValue | null>;
  deleteJoinRequestNotifications(
    userId: string,
    requestId: string,
  ): Promise<void>;
}
