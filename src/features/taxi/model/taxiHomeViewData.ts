import type {TaxiAcceptancePendingSeed} from './taxiAcceptancePendingViewData';

export const ALL_TAXI_HOME_FILTER_ID = 'all';

export type TaxiHomeFilterId = string;
export type TaxiHomeSortId = 'latest' | 'departureSoon';

export interface TaxiHomeFilterDefinition {
  id: TaxiHomeFilterId;
  label: string;
  matchKeywords: string[];
}

export interface TaxiHomeSortDefinition {
  id: TaxiHomeSortId;
  label: string;
}

export type TaxiHomeAvatarViewData =
  | {
      backgroundColor: string;
      id: string;
      kind: 'icon';
      iconColor: string;
      iconName: string;
    }
  | {
      backgroundColor: string;
      id: string;
      kind: 'label';
      label: string;
      textColor: string;
    }
  | {
      id: string;
      kind: 'image';
      uri: string;
    };

export interface TaxiHomePartyAction {
  type: 'preview' | 'open-chat';
}

export type TaxiHomePartyJoinActionState =
  | 'request'
  | 'pending'
  | 'joined'
  | 'blocked-by-other-party'
  | 'unavailable';

export interface TaxiHomePartyJoinActionViewData {
  helperText?: string;
  label: string;
  state: TaxiHomePartyJoinActionState;
}

export interface TaxiHomePartyCoordinate {
  latitude: number;
  longitude: number;
}

export interface TaxiHomePartyCardViewData {
  acceptancePendingSeed?: TaxiAcceptancePendingSeed;
  currentMemberCount: number;
  id: string;
  departureAt: string;
  departureCoordinate?: TaxiHomePartyCoordinate;
  createdAt: string;
  detail?: string;
  departureTimeLabel: string;
  departureLabel: string;
  destinationLabel: string;
  statusLabel: string;
  statusTone: 'active' | 'inactive' | 'inactive-danger';
  leaderName: string;
  leaderRoleLabel: string;
  leaderAvatar: TaxiHomeAvatarViewData;
  maxMemberCount: number;
  participantAvatars: TaxiHomeAvatarViewData[];
  memberSummaryLabel: string;
  estimatedFareLabel: string;
  filterIds: TaxiHomeFilterId[];
  joinAction: TaxiHomePartyJoinActionViewData;
  searchKeywords: string[];
  tags: string[];
  action: TaxiHomePartyAction;
}

export interface TaxiHomeEmptyStateViewData {
  title: string;
  description: string;
}

export interface TaxiHomeSourceData {
  searchPlaceholder: string;
  primaryActionLabel: string;
  liveChatActionLabel: string;
  sectionTitle: string;
  filters: TaxiHomeFilterDefinition[];
  sortOptions: TaxiHomeSortDefinition[];
  parties: TaxiHomePartyCardViewData[];
  noPartiesEmptyState: TaxiHomeEmptyStateViewData;
  filteredEmptyState: TaxiHomeEmptyStateViewData;
}

export interface TaxiHomeFilterChipViewData extends TaxiHomeFilterDefinition {
  selected: boolean;
}

export interface TaxiHomeSortOptionViewData extends TaxiHomeSortDefinition {
  selected: boolean;
}

export interface TaxiHomeViewData {
  searchPlaceholder: string;
  searchQuery: string;
  primaryActionLabel: string;
  liveChatActionLabel: string;
  sectionTitle: string;
  visiblePartyCount: number;
  filterChips: TaxiHomeFilterChipViewData[];
  sortOptions: TaxiHomeSortOptionViewData[];
  selectedSortLabel: string;
  parties: TaxiHomePartyCardViewData[];
  emptyState?: TaxiHomeEmptyStateViewData;
}
