import React from 'react';
import {fireEvent, render} from '@testing-library/react-native';

import {ProfileAvatar} from '../ProfileAvatar';

describe('ProfileAvatar', () => {
  it('photoUrl이 있으면 해당 이미지를 표시한다', () => {
    const view = render(
      <ProfileAvatar
        accessibilityLabel="작성자 프로필"
        photoUrl="https://cdn.skuri.app/profiles/member-current.png"
      />,
    );

    expect(view.getByLabelText('작성자 프로필').props.source).toEqual({
      uri: 'https://cdn.skuri.app/profiles/member-current.png',
    });
  });

  it('이미지 로드에 실패하면 기본 아바타로 되돌린다', () => {
    const view = render(
      <ProfileAvatar
        accessibilityLabel="작성자 프로필"
        photoUrl="https://cdn.skuri.app/profiles/member-current.png"
      />,
    );

    fireEvent(view.getByLabelText('작성자 프로필'), 'error');

    expect(view.queryByLabelText('작성자 프로필')).toBeNull();
  });
});
