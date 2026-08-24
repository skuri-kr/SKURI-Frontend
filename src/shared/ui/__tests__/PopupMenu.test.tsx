import React from 'react';
import {act, fireEvent, render, waitFor} from '@testing-library/react-native';

import {PopupMenu} from '../PopupMenu';

jest.mock('react-native-vector-icons/Ionicons', () => 'Icon');

jest.mock('react-native-reanimated', () => {
  const ReactNative = require('react-native');

  return {
    __esModule: true,
    default: {View: ReactNative.View},
    interpolate: (_value: number, _input: number[], output: number[]) =>
      output[output.length - 1],
    runOnJS: (callback: (...args: unknown[]) => unknown) => callback,
    useAnimatedStyle: (factory: () => unknown) => factory(),
    useSharedValue: (value: number) => ({value}),
    withTiming: (
      value: number,
      _config: unknown,
      callback?: (finished: boolean) => void,
    ) => {
      callback?.(true);
      return value;
    },
  };
});

jest.mock('@/shared/design-system/components', () => ({
  ToggleSwitch: () => null,
}));

describe('PopupMenu', () => {
  it('action 메뉴를 닫은 다음 프레임에 후속 Modal action을 실행한다', async () => {
    const onAction = jest.fn();
    let nextFrame: ((time: number) => void) | undefined;
    const requestAnimationFrameSpy = jest
      .spyOn(globalThis, 'requestAnimationFrame')
      .mockImplementation((callback: (time: number) => void) => {
        nextFrame = callback;
        return 1;
      });

    const Harness = () => {
      const [visible, setVisible] = React.useState(true);
      return (
        <PopupMenu
          items={[
            {
              iconName: 'flag-outline',
              id: 'report',
              label: '신고하기',
              onPress: onAction,
              type: 'action',
            },
          ]}
          onClose={() => setVisible(false)}
          visible={visible}
        />
      );
    };

    const view = render(<Harness />);
    fireEvent.press(view.getByText('신고하기'));

    expect(onAction).not.toHaveBeenCalled();
    await waitFor(() => expect(nextFrame).toBeDefined());

    act(() => {
      nextFrame?.(0);
    });

    expect(onAction).toHaveBeenCalledTimes(1);
    requestAnimationFrameSpy.mockRestore();
  });
});
