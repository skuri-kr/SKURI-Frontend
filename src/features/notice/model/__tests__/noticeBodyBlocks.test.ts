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
