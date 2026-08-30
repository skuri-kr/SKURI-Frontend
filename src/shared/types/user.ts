export interface LinkedAccount {
  provider: 'google';
  providerId: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
}

export interface UserAccountInfo {
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  hideName: boolean;
}

export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  studentId: string | null;
  department: string | null;
  photoURL: string | null;
  linkedAccounts?: LinkedAccount[];
  account?: UserAccountInfo | null;
  accountInfo?: UserAccountInfo | null;
  realname?: string | null;
  onboarding?: {
    permissionsComplete: boolean;
  };
  joinedAt?: unknown;
  currentVersion?: string;
  lastLogin?: unknown;
  isAdmin?: boolean;
  termsAccepted?: boolean;
  termsVersion?: string | null;
}
