import React from 'react';
import {Alert} from 'react-native';
import {fireEvent, render, waitFor} from '@testing-library/react-native';

import {TaxiPartyMemberSheet} from '../TaxiPartyMemberSheet';

jest.mock('@gorhom/bottom-sheet', () => {
  const ReactModule = require('react');
  const ReactNative = require('react-native');

  return {
    BottomSheetBackdrop: ReactNative.View,
    BottomSheetModal: ReactModule.forwardRef(
      (
        {children}: {children: React.ReactNode},
        ref: React.ForwardedRef<unknown>,
      ) => {
        ReactModule.useImperativeHandle(ref, () => ({
          dismiss: jest.fn(),
          present: jest.fn(),
        }));
        return <ReactNative.View>{children}</ReactNative.View>;
      },
    ),
    BottomSheetScrollView: ReactNative.View,
  };
});

jest.mock('react-native-vector-icons/Ionicons', () => 'Icon');

jest.mock('@/shared/design-system/components', () => ({
  DefaultProfileAvatar: () => null,
}));

const members = [
  {
    id: 'leader-1',
    isCurrentUser: true,
    isLeader: true,
    label: '리더',
    settled: true,
  },
  {
    id: 'member-1',
    isCurrentUser: false,
    isLeader: false,
    label: '멤버',
    settled: false,
  },
];

describe('TaxiPartyMemberSheet', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it('일반 파티원에게는 목록만 표시하고 내보내기 액션을 숨긴다', () => {
    const view = render(
      <TaxiPartyMemberSheet
        actionInFlightId={null}
        canKick={false}
        members={members}
        onClose={jest.fn()}
        onKick={jest.fn()}
        visible
      />,
    );

    expect(view.getByText('파티원 목록')).toBeTruthy();
    expect(view.getByText('리더 (나)')).toBeTruthy();
    expect(view.getByText('멤버')).toBeTruthy();
    expect(view.queryByLabelText('멤버 내보내기')).toBeNull();
  });

  it('파티장은 확인 후 일반 파티원을 내보낼 수 있다', async () => {
    const onKick = jest.fn().mockResolvedValue(undefined);
    jest.spyOn(Alert, 'alert').mockImplementation((...args) => {
      args[2]?.find(button => button.text === '내보내기')?.onPress?.();
    });
    const view = render(
      <TaxiPartyMemberSheet
        actionInFlightId={null}
        canKick
        members={members}
        onClose={jest.fn()}
        onKick={onKick}
        visible
      />,
    );

    fireEvent.press(view.getByLabelText('멤버 내보내기'));

    await waitFor(() => {
      expect(onKick).toHaveBeenCalledWith('member-1');
    });
  });
});
