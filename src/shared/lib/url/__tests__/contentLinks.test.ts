import {
  linkifyContentSegments,
  linkifyContentText,
  normalizeExternalWebUrl,
  stripTrailingUrlPunctuation,
} from '../contentLinks';

describe('외부 웹 URL 정규화', () => {
  it('HTTP와 HTTPS만 허용한다', () => {
    expect(normalizeExternalWebUrl('https://example.com/path')).toBe(
      'https://example.com/path',
    );
    expect(normalizeExternalWebUrl('http://example.com/path')).toBe(
      'http://example.com/path',
    );
    expect(normalizeExternalWebUrl('javascript:alert(1)')).toBeNull();
    expect(normalizeExternalWebUrl('skuri://notice/1')).toBeNull();
  });

  it('www 주소와 공지 상대경로를 절대 HTTPS URL로 바꾼다', () => {
    expect(normalizeExternalWebUrl('www.example.com/path')).toBe(
      'https://www.example.com/path',
    );
    expect(
      normalizeExternalWebUrl(
        '/Career/Roadmap/HCP.aspx',
        'https://success.sungkyul.ac.kr',
      ),
    ).toBe('https://success.sungkyul.ac.kr/Career/Roadmap/HCP.aspx');
  });
});

describe('본문 URL 구간 분리', () => {
  it('문장 안 URL과 뒤쪽 문장부호를 분리한다', () => {
    expect(
      linkifyContentText('참고: https://example.com/path, 다음 내용'),
    ).toEqual([
      {text: '참고: ', type: 'text'},
      {
        text: 'https://example.com/path',
        type: 'link',
        url: 'https://example.com/path',
      },
      {text: ',', type: 'text'},
      {text: ' 다음 내용', type: 'text'},
    ]);
  });

  it.each([
    'https://en.wikipedia.org/wiki/Function_(mathematics)',
    'https://example.com/path[details]',
    'https://example.com/path{details}',
  ])('URL 안에서 균형이 맞는 끝 구분자는 보존한다', url => {
    expect(stripTrailingUrlPunctuation(url)).toBe(url);
  });

  it('문장을 닫는 짝 없는 구분자만 URL 밖 텍스트로 남긴다', () => {
    expect(
      linkifyContentText(
        '참고: https://en.wikipedia.org/wiki/Function_(mathematics)).',
      ),
    ).toEqual([
      {text: '참고: ', type: 'text'},
      {
        text: 'https://en.wikipedia.org/wiki/Function_(mathematics)',
        type: 'link',
        url: 'https://en.wikipedia.org/wiki/Function_(mathematics)',
      },
      {text: ').', type: 'text'},
    ]);
  });

  it('명시된 HTML 링크는 유지하고 나머지 평문 URL만 추가 감지한다', () => {
    expect(
      linkifyContentSegments([
        {text: '참여하기', type: 'link', url: 'https://example.com/apply'},
        {text: ' 또는 www.example.com 확인', type: 'text'},
      ]),
    ).toEqual([
      {text: '참여하기', type: 'link', url: 'https://example.com/apply'},
      {text: ' 또는 ', type: 'text'},
      {
        text: 'www.example.com',
        type: 'link',
        url: 'https://www.example.com/',
      },
      {text: ' 확인', type: 'text'},
    ]);
  });
});
