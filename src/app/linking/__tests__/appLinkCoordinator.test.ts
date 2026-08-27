import {createAppLinkCoordinator} from '../appLinkCoordinator';

describe('createAppLinkCoordinator', () => {
  it('로그인 전 링크를 보관했다가 메인 진입 후 이동한다', () => {
    const coordinator = createAppLinkCoordinator();
    const navigate = jest.fn();

    expect(
      coordinator.receiveUrl('https://link.skuri.kr/board/post-1', 1000),
    ).toBe(true);
    expect(coordinator.flushIfReady(false, navigate)).toBe(false);
    expect(navigate).not.toHaveBeenCalled();

    expect(coordinator.flushIfReady(true, navigate)).toBe(true);
    expect(navigate).toHaveBeenCalledWith({kind: 'board', postId: 'post-1'});
    expect(coordinator.flushIfReady(true, navigate)).toBe(false);
  });

  it('짧은 시간 안에 중복 전달된 같은 URL은 한 번만 처리한다', () => {
    const coordinator = createAppLinkCoordinator();
    const navigate = jest.fn();
    const url = 'https://link.skuri.kr/cafeteria';

    expect(coordinator.receiveUrl(url, 1000)).toBe(true);
    expect(coordinator.receiveUrl(url, 2000)).toBe(false);
    expect(coordinator.flushIfReady(true, navigate)).toBe(true);
    expect(navigate).toHaveBeenCalledTimes(1);
  });

  it('대기 중 새 링크가 들어오면 가장 최근 대상을 연다', () => {
    const coordinator = createAppLinkCoordinator();
    const navigate = jest.fn();

    coordinator.receiveUrl('https://link.skuri.kr/notice/notice-1', 1000);
    coordinator.receiveUrl('https://link.skuri.kr/board/post-1', 2000);
    coordinator.flushIfReady(true, navigate);

    expect(navigate).toHaveBeenCalledWith({kind: 'board', postId: 'post-1'});
  });

  it('지원하지 않는 URL은 대기열에 넣지 않는다', () => {
    const coordinator = createAppLinkCoordinator();
    const navigate = jest.fn();

    expect(coordinator.receiveUrl('https://example.com/notice/1')).toBe(false);
    expect(coordinator.flushIfReady(true, navigate)).toBe(false);
  });
});
