import {resolveCurrentMessage} from '../messageMenuState';

describe('messageMenuState', () => {
  it('메뉴는 ID로 최신 메시지를 다시 조회한다', () => {
    const menuState = {
      messageId: 'message-1',
      right: 12,
      top: 64,
    };

    expect(
      resolveCurrentMessage(
        [
          {id: 'message-1', text: '수정 전'},
          {id: 'message-2', text: '다른 메시지'},
        ],
        menuState,
      ),
    ).toEqual({id: 'message-1', text: '수정 전'});

    expect(
      resolveCurrentMessage(
        [
          {id: 'message-1', isDeleted: true, text: '삭제된 메시지입니다.'},
          {id: 'message-2', text: '다른 메시지'},
        ],
        menuState,
      ),
    ).toEqual({
      id: 'message-1',
      isDeleted: true,
      text: '삭제된 메시지입니다.',
    });
  });
});
