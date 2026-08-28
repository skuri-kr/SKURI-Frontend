import type {Notice} from '../types';

import {buildNoticeBodyBlocks} from '../noticeBodyBlocks';

const notice = (
  contentDetail: string,
): Pick<Notice, 'content' | 'contentDetail' | 'id' | 'link' | 'title'> => ({
  content: '',
  contentDetail,
  id: 'notice-id',
  link: 'https://www.sungkyul.ac.kr/bbs/skukr/87/123/artclView.do',
  title: '공지 제목',
});

const imageUrls = (contentDetail: string) =>
  buildNoticeBodyBlocks(notice(contentDetail))
    .filter(block => block.type === 'image')
    .map(block => (block.type === 'image' ? block.imageUrl : ''));

describe('buildNoticeBodyBlocks', () => {
  it('대괄호가 포함된 두 번째 이미지 URL도 이미지 블록으로 분리한다', () => {
    const firstImageUrl =
      'https://www.sungkyul.ac.kr/CrossEditor/binary/images/000174/홈페이지_공지용_FAIR_정보.png';
    const secondImageUrl =
      'https://www.sungkyul.ac.kr/CrossEditor/binary/images/000174/[최종_포스터]_2026_성결_FAIR_포스터_시안.png';
    const blocks = buildNoticeBodyBlocks(
      notice(
        `<p>행사 안내</p><img src="${firstImageUrl}"><img src="${secondImageUrl}"><p>첨부파일을 확인하세요.</p>`,
      ),
    );

    expect(
      blocks
        .filter(block => block.type === 'image')
        .map(block => (block.type === 'image' ? block.imageUrl : '')),
    ).toEqual([firstImageUrl, secondImageUrl]);
    expect(
      blocks.some(
        block => block.type === 'paragraph' && block.text.includes('[[IMG:'),
      ),
    ).toBe(false);
  });

  it('대괄호가 포함된 단일 이미지 URL을 이미지 블록으로 분리한다', () => {
    const imageUrl =
      'https://www.sungkyul.ac.kr/CrossEditor/binary/images/000174/[크기변환](포스터)_2026_2학기_2차_국가장학금_신청.jpg';

    expect(imageUrls(`<img src="${imageUrl}">`)).toEqual([imageUrl]);
  });

  it('유효하지 않은 이미지는 앞뒤 문단을 분리하지 않는다', () => {
    const blocks = buildNoticeBodyBlocks(
      notice(
        '<p>앞 문장 <img data-src="https://example.com/lazy-image.png"> 뒤 문장</p>',
      ),
    );

    expect(blocks).toEqual([
      expect.objectContaining({
        text: '앞 문장 뒤 문장',
        type: 'paragraph',
      }),
    ]);
    expect(blocks.some(block => block.type === 'image')).toBe(false);
  });

  it('기존 문단과 표 블록의 순서를 유지한다', () => {
    const blocks = buildNoticeBodyBlocks(
      notice(
        '<p>표 안내</p><table><tr><td>내용</td></tr></table><img src="https://example.com/image.png">',
      ),
    );

    expect(blocks.map(block => block.type)).toEqual([
      'paragraph',
      'table',
      'image',
    ]);
  });

  it('한 번의 줄바꿈은 문단 안에 유지하고 연속 줄바꿈은 문단을 나눈다', () => {
    const blocks = buildNoticeBodyBlocks(
      notice('<p>첫 줄<br>둘째 줄<br><br>새 문단</p>'),
    );

    expect(
      blocks
        .filter(block => block.type === 'paragraph')
        .map(block => (block.type === 'paragraph' ? block.text : '')),
    ).toEqual(['첫 줄\n둘째 줄', '새 문단']);
  });

  it('형제 목록 항목은 한 본문 블록의 줄바꿈으로 유지한다', () => {
    const blocks = buildNoticeBodyBlocks(
      notice(
        '<ul><li><p>첫 번째 항목</p></li><li><p><a href="https://example.com/apply">두 번째 항목</a></p></li></ul>',
      ),
    );

    expect(blocks).toEqual([
      expect.objectContaining({
        segments: [
          {text: '- 첫 번째 항목\n- ', type: 'text'},
          {
            text: '두 번째 항목',
            type: 'link',
            url: 'https://example.com/apply',
          },
        ],
        text: '- 첫 번째 항목\n- 두 번째 항목',
        type: 'paragraph',
      }),
    ]);
  });

  it('한 목록 항목 안의 형제 블록은 줄바꿈으로 구분한다', () => {
    const blocks = buildNoticeBodyBlocks(
      notice('<ul><li><p>첫 줄</p><p>둘째 줄</p></li></ul>'),
    );

    expect(blocks).toEqual([
      expect.objectContaining({
        text: '- 첫 줄\n둘째 줄',
        type: 'paragraph',
      }),
    ]);
  });

  it('pre 안의 줄바꿈과 들여쓰기를 보존한다', () => {
    const blocks = buildNoticeBodyBlocks(
      notice('<pre>  첫 줄\n    둘째 줄\n      셋째 줄</pre>'),
    );

    expect(blocks).toEqual([
      expect.objectContaining({
        text: '  첫 줄\n    둘째 줄\n      셋째 줄',
        type: 'paragraph',
      }),
    ]);
  });

  it('HTML 텍스트 링크의 문구와 URL을 보존한다', () => {
    const blocks = buildNoticeBodyBlocks(
      notice(
        '<p>신청은 <a href="https://success.sungkyul.ac.kr/apply">여기에서 참여</a>하세요.</p>',
      ),
    );
    const paragraph = blocks.find(block => block.type === 'paragraph');

    expect(paragraph).toEqual(
      expect.objectContaining({
        segments: [
          {text: '신청은 ', type: 'text'},
          {
            text: '여기에서 참여',
            type: 'link',
            url: 'https://success.sungkyul.ac.kr/apply',
          },
          {text: '하세요.', type: 'text'},
        ],
        text: '신청은 여기에서 참여하세요.',
        type: 'paragraph',
      }),
    );
  });

  it('링크가 감싼 이미지에는 이동 URL을 보존한다', () => {
    const blocks = buildNoticeBodyBlocks(
      notice(
        '<p><a href="https://success.sungkyul.ac.kr/Career/Roadmap/HCP.aspx"><img src="/CrossEditor/poster.png" alt="핵심역량 진단 포스터"></a></p>',
      ),
    );
    const image = blocks.find(block => block.type === 'image');

    expect(image).toEqual(
      expect.objectContaining({
        alt: '핵심역량 진단 포스터',
        imageUrl: 'https://www.sungkyul.ac.kr/CrossEditor/poster.png',
        linkUrl: 'https://success.sungkyul.ac.kr/Career/Roadmap/HCP.aspx',
        type: 'image',
      }),
    );
  });

  it('지원하지 않는 이미지 링크 스킴은 제거하고 일반 이미지로 유지한다', () => {
    const blocks = buildNoticeBodyBlocks(
      notice(
        '<a href="javascript:alert(1)"><img src="https://example.com/poster.png"></a>',
      ),
    );
    const image = blocks.find(block => block.type === 'image');

    expect(image).toEqual(
      expect.objectContaining({
        imageUrl: 'https://example.com/poster.png',
        type: 'image',
      }),
    );
    expect(image).not.toHaveProperty('linkUrl');
  });
});
