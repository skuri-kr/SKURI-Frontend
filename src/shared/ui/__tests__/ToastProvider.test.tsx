import React from 'react';
import {
  AccessibilityInfo,
  Platform,
  Text,
  TouchableOpacity,
} from 'react-native';
import {fireEvent, render} from '@testing-library/react-native';

import {ToastProvider, useToast} from '../ToastProvider';

const ToastTrigger = () => {
  const {showToast} = useToast();

  return (
    <TouchableOpacity
      onPress={() => {
        showToast('URL이 클립보드에 복사되었어요!');
      }}>
      <Text>토스트 표시</Text>
    </TouchableOpacity>
  );
};

const mockPlatformOS = (os: 'android' | 'ios') => {
  const originalOS = Platform.OS;
  Platform.OS = os;

  return () => {
    Platform.OS = originalOS;
  };
};

describe('ToastProvider', () => {
  it('iOS에서는 요청한 메시지를 화면과 접근성 안내에 표시한다', () => {
    const announceForAccessibility = jest
      .spyOn(AccessibilityInfo, 'announceForAccessibility')
      .mockImplementation(() => undefined);
    const restorePlatformOS = mockPlatformOS('ios');
    const view = render(
      <ToastProvider>
        <ToastTrigger />
      </ToastProvider>,
    );

    fireEvent.press(view.getByText('토스트 표시'));

    expect(view.getByText('URL이 클립보드에 복사되었어요!')).toBeTruthy();
    expect(announceForAccessibility).toHaveBeenCalledWith(
      'URL이 클립보드에 복사되었어요!',
    );

    announceForAccessibility.mockRestore();
    restorePlatformOS();
  });

  it('Android에서는 live region만으로 접근성 안내를 제공한다', () => {
    const announceForAccessibility = jest
      .spyOn(AccessibilityInfo, 'announceForAccessibility')
      .mockImplementation(() => undefined);
    const restorePlatformOS = mockPlatformOS('android');
    const view = render(
      <ToastProvider>
        <ToastTrigger />
      </ToastProvider>,
    );

    fireEvent.press(view.getByText('토스트 표시'));

    expect(
      view.getByText('URL이 클립보드에 복사되었어요!'),
    ).toBeTruthy();
    expect(announceForAccessibility).not.toHaveBeenCalled();
    expect(
      view.UNSAFE_getByProps({accessibilityLiveRegion: 'polite'}),
    ).toBeTruthy();

    announceForAccessibility.mockRestore();
    restorePlatformOS();
  });

  it('Android에서 같은 메시지를 다시 표시하면 live region을 새로 마운트한다', () => {
    const announceForAccessibility = jest
      .spyOn(AccessibilityInfo, 'announceForAccessibility')
      .mockImplementation(() => undefined);
    const restorePlatformOS = mockPlatformOS('android');
    const view = render(
      <ToastProvider>
        <ToastTrigger />
      </ToastProvider>,
    );

    fireEvent.press(view.getByText('토스트 표시'));
    const firstLiveRegion = view.UNSAFE_getByProps({
      accessibilityLiveRegion: 'polite',
    });

    fireEvent.press(view.getByText('토스트 표시'));
    const secondLiveRegion = view.UNSAFE_getByProps({
      accessibilityLiveRegion: 'polite',
    });

    expect(secondLiveRegion).not.toBe(firstLiveRegion);
    expect(announceForAccessibility).not.toHaveBeenCalled();

    announceForAccessibility.mockRestore();
    restorePlatformOS();
  });
});
