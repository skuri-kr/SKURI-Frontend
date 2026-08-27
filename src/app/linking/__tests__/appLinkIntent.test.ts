import {parseAppLinkUrl} from '../appLinkIntent';

describe('parseAppLinkUrl', () => {
  it.each([
    [
      'https://link.skuri.kr/notice/ab-CD_12',
      {kind: 'notice', noticeId: 'ab+CD/12'},
    ],
    ['https://link.skuri.kr/cafeteria', {kind: 'cafeteria'}],
    [
      'https://link.skuri.kr/board/2hgka1',
      {kind: 'board', postId: '2hgka1'},
    ],
    [
      'skuri://open?target=notice&id=ab-CD_12',
      {kind: 'notice', noticeId: 'ab+CD/12'},
    ],
    ['skuri://open?target=cafeteria', {kind: 'cafeteria'}],
    [
      'skuri://open?target=board&id=2hgka1',
      {kind: 'board', postId: '2hgka1'},
    ],
  ])('%s를 앱 이동 의도로 해석한다', (url, expected) => {
    expect(parseAppLinkUrl(url)).toEqual(expected);
  });

  it.each([
    'http://link.skuri.kr/cafeteria',
    'https://evil.example/notice/2nfkA1',
    'https://link.skuri.kr.evil.example/notice/2nfkA1',
    'https://link.skuri.kr:8443/notice/2nfkA1',
    'https://link.skuri.kr/notice',
    'https://link.skuri.kr/notice/a/b',
    'https://link.skuri.kr/notice/%2Fetc',
    'https://link.skuri.kr/cafeteria/2026-08-27',
    'skuri://open?target=notice',
    'skuri://other?target=cafeteria',
    'not-a-url',
  ])('%s를 거부한다', url => {
    expect(parseAppLinkUrl(url)).toBeNull();
  });
});
