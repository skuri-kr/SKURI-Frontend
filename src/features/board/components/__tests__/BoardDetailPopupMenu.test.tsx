import React from 'react';
import {render} from '@testing-library/react-native';

import {PopupMenu} from '@/shared/ui/PopupMenu';

import {BoardDetailPopupMenu} from '../BoardDetailPopupMenu';

jest.mock('@/shared/ui/PopupMenu', () => ({
  PopupMenu: jest.fn(() => null),
}));

const mockedPopupMenu = jest.mocked(PopupMenu);

const createProps = () => ({
  onClose: jest.fn(),
  onPressBlock: jest.fn(),
  onPressDelete: jest.fn(),
  onPressEdit: jest.fn(),
  onPressReport: jest.fn(),
  onPressShare: jest.fn(),
  top: 60,
  visible: true,
});

describe('BoardDetailPopupMenu', () => {
  it('다른 사용자의 게시글에는 신고와 차단을 함께 표시한다', () => {
    const props = createProps();
    render(
      <BoardDetailPopupMenu
        {...props}
        showBlockAction
        showManageActions={false}
      />,
    );

    const items = mockedPopupMenu.mock.calls.at(-1)?.[0].items;
    expect(items?.map(item => item.label)).toEqual([
      '링크 복사',
      '신고',
      '사용자 차단',
    ]);
  });

  it('내 게시글에는 차단을 표시하지 않는다', () => {
    const props = createProps();
    render(
      <BoardDetailPopupMenu
        {...props}
        showBlockAction={false}
        showManageActions
      />,
    );

    const items = mockedPopupMenu.mock.calls.at(-1)?.[0].items;
    expect(items?.map(item => item.label)).not.toContain('사용자 차단');
  });
});
