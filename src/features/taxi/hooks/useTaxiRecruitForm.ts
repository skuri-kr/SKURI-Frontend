import React from 'react';

import {useAuth} from '@/features/auth';

import {createTaxiParty} from '../services/partyCreationService';
import {
  DEPARTURE_LOCATION,
  DEPARTURE_OPTIONS,
  DESTINATION_LOCATION,
  DESTINATION_OPTIONS,
} from '../model/constants';
import {
  buildTaxiInitialPickerDate,
  buildTaxiSelectedDepartureDate,
  formatTaxiDepartureSummary,
} from '../model/taxiDepartureTime';
import type {
  TaxiRecruitDraft,
  TaxiRecruitLocationKind,
  TaxiRecruitLocationMode,
  TaxiRecruitLocationSelection,
  TaxiRecruitLocationValue,
  TaxiRecruitSubmitResult,
} from '../model/taxiRecruitData';
import type {PartyLocation} from '../model/types';
import {usePartyRepository} from './usePartyRepository';

const PRESET_TAG_OPTIONS = [
  '#여성전용',
  '#조용히',
  '#빠른출발',
] as const;

const MAX_MEMBER_OPTIONS = [2, 3, 4, 5, 6, 7] as const;

const buildPresetLocationMap = ({
  coordinates,
  labels,
}: {
  coordinates: readonly {latitude: number; longitude: number}[][];
  labels: readonly string[][];
}) =>
  labels
    .flatMap((row, rowIndex) =>
      row.map((label, columnIndex) => ({
        coordinate: coordinates[rowIndex][columnIndex],
        label,
      })),
    )
    .reduce<Record<string, PartyLocation>>((accumulator, item) => {
      accumulator[item.label] = {
        lat: item.coordinate.latitude,
        lng: item.coordinate.longitude,
        name: item.label,
      };

      return accumulator;
    }, {});

const DEPARTURE_LOCATION_BY_LABEL = buildPresetLocationMap({
  coordinates: DEPARTURE_LOCATION,
  labels: DEPARTURE_OPTIONS,
});

const DESTINATION_LOCATION_BY_LABEL = buildPresetLocationMap({
  coordinates: DESTINATION_LOCATION,
  labels: DESTINATION_OPTIONS,
});

const normalizeLocationName = (value: string) => value.trim();

const formatTagValue = (value: string) => {
  const trimmed = value.trim();

  if (!trimmed) {
    return '';
  }

  return trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
};

const normalizePartyTags = (tags: string[]) =>
  tags.map(tag => tag.replace(/^#/, '').trim()).filter(Boolean);

const resolvePresetLocation = (
  kind: TaxiRecruitLocationKind,
  label: string,
): TaxiRecruitLocationValue | null => {
  const trimmedLabel = normalizeLocationName(label);
  const locationByLabel =
    kind === 'departure'
      ? DEPARTURE_LOCATION_BY_LABEL
      : DESTINATION_LOCATION_BY_LABEL;
  const location = locationByLabel[trimmedLabel];

  if (!location) {
    return null;
  }

  return {
    ...location,
    mode: 'preset',
  };
};

const resolveCustomLocation = (
  selectedLocation: PartyLocation | null,
): TaxiRecruitLocationValue | null => {
  if (!selectedLocation) {
    return null;
  }

  const normalizedName = normalizeLocationName(selectedLocation.name);

  if (!normalizedName) {
    return null;
  }

  return {
    lat: selectedLocation.lat,
    lng: selectedLocation.lng,
    mode: 'custom',
    name: normalizedName,
  };
};

const isSameLocation = (
  left: TaxiRecruitLocationValue | null,
  right: TaxiRecruitLocationValue | null,
) => {
  if (!left || !right) {
    return false;
  }

  return (
    normalizeLocationName(left.name) === normalizeLocationName(right.name) &&
    left.lat === right.lat &&
    left.lng === right.lng
  );
};

const buildCustomLocationHint = ({
  customValue,
  selectedLocation,
}: {
  customValue: string;
  selectedLocation: PartyLocation | null;
}) => {
  if (selectedLocation) {
    return {
      text: `${selectedLocation.name} 좌표를 지도에서 선택했어요.`,
      tone: 'success' as const,
    };
  }

  if (!normalizeLocationName(customValue)) {
    return {
      text: '위치명을 입력한 뒤 지도에서 좌표를 선택해주세요.',
      tone: 'warning' as const,
    };
  }

  return {
    text: '정확한 파티 생성을 위해 지도에서 좌표를 꼭 선택해주세요.',
    tone: 'warning' as const,
  };
};

interface RecruitLocationSectionState {
  customValue: string;
  disabledLabel: string | null;
  hasMapSelection: boolean;
  helperText: string | null;
  helperTone: 'success' | 'warning' | null;
  mapActionDisabled: boolean;
  mapActionLabel: string;
  mode: TaxiRecruitLocationMode;
  options: readonly string[][];
  selectedLabel: string;
  selectedLocation: PartyLocation | null;
}

export interface UseTaxiRecruitFormResult {
  canSubmit: boolean;
  customTagInput: string;
  departure: RecruitLocationSectionState;
  departureTime: {
    hour: number;
    minute: number;
    summaryLabel: string;
    summaryTone: 'today' | 'tomorrow';
  };
  detail: string;
  destination: RecruitLocationSectionState;
  isSubmitting: boolean;
  maxMemberOptions: readonly number[];
  maxMembers: number;
  selectedTags: string[];
  tagOptions: readonly string[];
  addCustomTag: () => void;
  applyLocationSelection: (selection: TaxiRecruitLocationSelection) => void;
  removeTag: (tag: string) => void;
  selectDepartureCustom: () => void;
  selectDeparturePreset: (label: string) => void;
  selectDestinationCustom: () => void;
  selectDestinationPreset: (label: string) => void;
  selectHour: (hour: number) => void;
  selectMaxMembers: (value: number) => void;
  selectMinute: (minute: number) => void;
  setCustomDepartureValue: (value: string) => void;
  setCustomDestinationValue: (value: string) => void;
  setCustomTagInput: (value: string) => void;
  setDetail: (value: string) => void;
  submitForm: () => Promise<TaxiRecruitSubmitResult>;
  togglePresetTag: (tag: string) => void;
}

export const useTaxiRecruitForm = (): UseTaxiRecruitFormResult => {
  const {user} = useAuth();
  const partyRepository = usePartyRepository();

  const [departureMode, setDepartureMode] =
    React.useState<TaxiRecruitLocationMode>('preset');
  const [departurePreset, setDeparturePreset] = React.useState('');
  const [customDeparture, setCustomDeparture] = React.useState('');
  const [departureCustomLocation, setDepartureCustomLocation] =
    React.useState<PartyLocation | null>(null);

  const [destinationMode, setDestinationMode] =
    React.useState<TaxiRecruitLocationMode>('preset');
  const [destinationPreset, setDestinationPreset] = React.useState('');
  const [customDestination, setCustomDestination] = React.useState('');
  const [destinationCustomLocation, setDestinationCustomLocation] =
    React.useState<PartyLocation | null>(null);

  const [customTagInput, setCustomTagInput] = React.useState('');
  const [selectedTags, setSelectedTags] = React.useState<string[]>([]);
  const [detail, setDetail] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [maxMembers, setMaxMembers] = React.useState(4);

  const initialDate = React.useMemo(() => buildTaxiInitialPickerDate(), []);
  const [selectedHour, setSelectedHour] = React.useState(
    initialDate.getHours(),
  );
  const [selectedMinute, setSelectedMinute] = React.useState(
    initialDate.getMinutes(),
  );
  const [now, setNow] = React.useState(() => new Date());

  React.useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const departureLocation = React.useMemo(
    () =>
      departureMode === 'preset'
        ? resolvePresetLocation('departure', departurePreset)
        : resolveCustomLocation(departureCustomLocation),
    [departureCustomLocation, departureMode, departurePreset],
  );

  const destinationLocation = React.useMemo(
    () =>
      destinationMode === 'preset'
        ? resolvePresetLocation('destination', destinationPreset)
        : resolveCustomLocation(destinationCustomLocation),
    [destinationCustomLocation, destinationMode, destinationPreset],
  );

  const selectedDepartureDate = React.useMemo(
    () =>
      buildTaxiSelectedDepartureDate({
        hour: selectedHour,
        minute: selectedMinute,
        now,
      }),
    [now, selectedHour, selectedMinute],
  );

  const summaryLabel = React.useMemo(
    () =>
      formatTaxiDepartureSummary({
        date: selectedDepartureDate.date,
        isTomorrow: selectedDepartureDate.isTomorrow,
      }),
    [selectedDepartureDate.date, selectedDepartureDate.isTomorrow],
  );

  const draft = React.useMemo<TaxiRecruitDraft | null>(() => {
    if (!departureLocation || !destinationLocation) {
      return null;
    }

    return {
      departure: departureLocation,
      departureAtISO: selectedDepartureDate.date.toISOString(),
      departureDayOffset: selectedDepartureDate.dayOffset,
      destination: destinationLocation,
      detail: detail.trim(),
      maxMembers,
      tags: selectedTags,
    };
  }, [
    departureLocation,
    detail,
    destinationLocation,
    maxMembers,
    selectedDepartureDate.date,
    selectedDepartureDate.dayOffset,
    selectedTags,
  ]);

  const canSubmit = React.useMemo(() => {
    if (!draft) {
      return false;
    }

    return !isSameLocation(draft.departure, draft.destination);
  }, [draft]);

  const selectDeparturePreset = React.useCallback((label: string) => {
    setDepartureMode('preset');
    setDeparturePreset(label);
  }, []);

  const selectDestinationPreset = React.useCallback((label: string) => {
    setDestinationMode('preset');
    setDestinationPreset(label);
  }, []);

  const selectDepartureCustom = React.useCallback(() => {
    setDepartureMode('custom');
  }, []);

  const selectDestinationCustom = React.useCallback(() => {
    setDestinationMode('custom');
  }, []);

  const setCustomDepartureValue = React.useCallback((value: string) => {
    const normalizedName = normalizeLocationName(value);

    setCustomDeparture(value);
    setDepartureCustomLocation(currentLocation => {
      if (
        currentLocation &&
        normalizeLocationName(currentLocation.name) !== normalizedName
      ) {
        return null;
      }

      return currentLocation;
    });
  }, []);

  const setCustomDestinationValue = React.useCallback((value: string) => {
    const normalizedName = normalizeLocationName(value);

    setCustomDestination(value);
    setDestinationCustomLocation(currentLocation => {
      if (
        currentLocation &&
        normalizeLocationName(currentLocation.name) !== normalizedName
      ) {
        return null;
      }

      return currentLocation;
    });
  }, []);

  const applyLocationSelection = React.useCallback(
    ({kind, location}: TaxiRecruitLocationSelection) => {
      const normalizedLocation = {
        ...location,
        name: normalizeLocationName(location.name),
      };

      if (kind === 'departure') {
        setDepartureMode('custom');
        setCustomDeparture(normalizedLocation.name);
        setDepartureCustomLocation(normalizedLocation);
        return;
      }

      setDestinationMode('custom');
      setCustomDestination(normalizedLocation.name);
      setDestinationCustomLocation(normalizedLocation);
    },
    [],
  );

  const selectHour = React.useCallback((hour: number) => {
    React.startTransition(() => {
      setSelectedHour(hour);
    });
  }, []);

  const selectMinute = React.useCallback((minute: number) => {
    React.startTransition(() => {
      setSelectedMinute(minute);
    });
  }, []);

  const togglePresetTag = React.useCallback((tag: string) => {
    setSelectedTags(current =>
      current.includes(tag)
        ? current.filter(item => item !== tag)
        : [...current, tag],
    );
  }, []);

  const addCustomTag = React.useCallback(() => {
    const nextTag = formatTagValue(customTagInput);

    if (!nextTag) {
      return;
    }

    setSelectedTags(current => {
      if (current.includes(nextTag)) {
        return current;
      }

      return [...current, nextTag];
    });
    setCustomTagInput('');
  }, [customTagInput]);

  const removeTag = React.useCallback((tag: string) => {
    setSelectedTags(current => current.filter(item => item !== tag));
  }, []);

  const submitForm = React.useCallback(async () => {
    if (!canSubmit || !draft || isSubmitting) {
      return {
        message:
          '출발지와 도착지를 모두 선택하고, 직접 입력 위치는 지도 좌표까지 지정해주세요.',
        status: 'blocked' as const,
      };
    }

    if (!user?.uid) {
      return {
        message: '로그인 후 다시 시도해주세요.',
        status: 'blocked' as const,
      };
    }

    setIsSubmitting(true);

    try {
      const partyId = await createTaxiParty({
        partyRepository,
        party: {
          departure: draft.departure,
          departureTime: draft.departureAtISO,
          destination: draft.destination,
          detail: draft.detail || undefined,
          leaderId: user.uid,
          maxMembers: draft.maxMembers,
          members: [user.uid],
          status: 'open',
          tags: normalizePartyTags(draft.tags),
        },
      });

      return {
        message: '파티 채팅방으로 바로 이동합니다.',
        partyId,
        status: 'spring' as const,
      };
    } catch (error) {
      console.error('택시 파티 생성 실패:', error);

      return {
        message:
          error instanceof Error && error.message
            ? error.message
            : '파티 만들기에 실패했습니다.',
        status: 'blocked' as const,
      };
    } finally {
      setIsSubmitting(false);
    }
  }, [canSubmit, draft, isSubmitting, partyRepository, user?.uid]);

  const departureHint = React.useMemo(
    () =>
      departureMode === 'custom'
        ? buildCustomLocationHint({
            customValue: customDeparture,
            selectedLocation: departureCustomLocation,
          })
        : null,
    [customDeparture, departureCustomLocation, departureMode],
  );

  const destinationHint = React.useMemo(
    () =>
      destinationMode === 'custom'
        ? buildCustomLocationHint({
            customValue: customDestination,
            selectedLocation: destinationCustomLocation,
          })
        : null,
    [customDestination, destinationCustomLocation, destinationMode],
  );

  return {
    addCustomTag,
    applyLocationSelection,
    canSubmit,
    customTagInput,
    departure: {
      customValue: customDeparture,
      disabledLabel:
        destinationMode === 'preset' ? destinationPreset || null : null,
      hasMapSelection: Boolean(departureCustomLocation),
      helperText: departureHint?.text ?? null,
      helperTone: departureHint?.tone ?? null,
      mapActionDisabled: !normalizeLocationName(customDeparture),
      mapActionLabel: departureCustomLocation ? '변경' : '지도 선택',
      mode: departureMode,
      options: DEPARTURE_OPTIONS,
      selectedLabel:
        departureMode === 'custom'
          ? normalizeLocationName(customDeparture)
          : departurePreset,
      selectedLocation: departureCustomLocation,
    },
    departureTime: {
      hour: selectedHour,
      minute: selectedMinute,
      summaryLabel,
      summaryTone: selectedDepartureDate.isTomorrow ? 'tomorrow' : 'today',
    },
    detail,
    destination: {
      customValue: customDestination,
      disabledLabel:
        departureMode === 'preset' ? departurePreset || null : null,
      hasMapSelection: Boolean(destinationCustomLocation),
      helperText: destinationHint?.text ?? null,
      helperTone: destinationHint?.tone ?? null,
      mapActionDisabled: !normalizeLocationName(customDestination),
      mapActionLabel: destinationCustomLocation ? '변경' : '지도 선택',
      mode: destinationMode,
      options: DESTINATION_OPTIONS,
      selectedLabel:
        destinationMode === 'custom'
          ? normalizeLocationName(customDestination)
          : destinationPreset,
      selectedLocation: destinationCustomLocation,
    },
    isSubmitting,
    maxMemberOptions: MAX_MEMBER_OPTIONS,
    maxMembers,
    removeTag,
    selectDepartureCustom,
    selectDeparturePreset,
    selectDestinationCustom,
    selectDestinationPreset,
    selectHour,
    selectMaxMembers: setMaxMembers,
    selectMinute,
    selectedTags,
    setCustomDepartureValue,
    setCustomDestinationValue,
    setCustomTagInput,
    setDetail,
    submitForm,
    tagOptions: PRESET_TAG_OPTIONS,
    togglePresetTag,
  };
};
