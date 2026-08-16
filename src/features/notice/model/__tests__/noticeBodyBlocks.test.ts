import type {Notice} from '../types';

import {buildNoticeBodyBlocks} from '../noticeBodyBlocks';

const notice = (contentDetail: string): Pick<
  Notice,
  'content' | 'contentDetail' | 'id' | 'title'
> => ({
  content: '',
  contentDetail,
  id: 'notice-id',
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
      blocks.filter(block => block.type === 'image').map(block =>
        block.type === 'image' ? block.imageUrl : '',
      ),
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
      notice('<p>표 안내</p><table><tr><td>내용</td></tr></table><img src="https://example.com/image.png">'),
    );

    expect(blocks.map(block => block.type)).toEqual([
      'paragraph',
      'table',
      'image',
    ]);
  });
});
