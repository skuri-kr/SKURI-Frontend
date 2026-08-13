import React from 'react';
import {render, screen} from '@testing-library/react-native';
import WebView from 'react-native-webview';

jest.mock('@/shared/hooks', () => ({
  useScreenView: jest.fn(),
}));

import {AccountGuideScreen} from '../AccountGuideScreen';

describe('AccountGuideScreen', () => {
  it('기본 WebView import를 렌더링한다', () => {
    render(<AccountGuideScreen />);

    expect(screen.UNSAFE_getByType(WebView)).not.toBeNull();
  });
});
