export type MyPageMenuActionKey =
  | 'profileEdit'
  | 'minecraftAccount'
  | 'minecraftServer'
  | 'friendHub'
  | 'myPosts'
  | 'bookmarks'
  | 'taxiHistory'
  | 'notificationSettings'
  | 'accountManagement'
  | 'inquiries'
  | 'inquiryHistory'
  | 'appSettings';

export type MyPageStatKey = Extract<
  MyPageMenuActionKey,
  'myPosts' | 'bookmarks' | 'taxiHistory'
>;

export interface MyPageProfileSource {
  displayName: string;
  email: string;
  photoUrl: string | null;
  subtitle: string;
}

export interface MyPageSource {
  profile: MyPageProfileSource;
  stats: Record<MyPageStatKey, number>;
}
