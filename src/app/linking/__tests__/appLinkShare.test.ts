import {
  buildBoardShareMessage,
  buildCafeteriaShareMessage,
  buildCafeteriaShareUrl,
  buildNoticeShareMessage,
  getMatchingNoticeShareTitle,
} from '../appLinkShare';

describe('앱 링크 공유 URL', () => {
  it('학식 URL에는 날짜를 넣지 않는다', () => {
    expect(buildCafeteriaShareUrl()).toBe('https://link.skuri.kr/cafeteria');
  });

});

describe('앱 링크 공유 메시지', () => {
  it('현재 공지 ID가 공유 대상과 일치할 때만 제목을 사용한다', () => {
    expect(
      getMatchingNoticeShareTitle('notice-2', {
        id: 'notice-1',
        title: '이전 공지',
      }),
    ).toBeUndefined();
    expect(
      getMatchingNoticeShareTitle('notice-2', {
        id: 'notice-2',
        title: '현재 공지',
      }),
    ).toBe('현재 공지');
  });

  it('공지 제목과 링크를 함께 제공한다', () => {
    expect(buildNoticeShareMessage('https://link.skuri.kr/notice/7Kp3mQxA', '수강 신청 안내')).toBe(
      '수강 신청 안내\nhttps://link.skuri.kr/notice/7Kp3mQxA',
    );
  });

  it('학식은 이번 주 안내 문구를 사용한다', () => {
    expect(buildCafeteriaShareMessage()).toContain(
      'https://link.skuri.kr/cafeteria',
    );
  });

  it('게시글 내용 없이 일반 안내와 링크만 제공한다', () => {
    const message = buildBoardShareMessage('https://link.skuri.kr/board/5Rm2Qn8B');
    expect(message).toBe(
      '스쿠리 커뮤니티 게시글을 확인해 보세요.\nhttps://link.skuri.kr/board/5Rm2Qn8B',
    );
  });
});
