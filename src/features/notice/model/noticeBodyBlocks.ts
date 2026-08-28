import {DomUtils, parseDocument} from 'htmlparser2';

import {normalizeExternalWebUrl} from '@/shared/lib/url/contentLinks';
import type {
  ContentDetailBodyBlockViewData,
  ContentDetailTextSegmentViewData,
} from '@/shared/types/contentDetailViewData';

import {normalizeNoticeHtml} from './selectors';
import type {Notice} from './types';

const NOTICE_CONTENT_BASE_URL = 'https://www.sungkyul.ac.kr';
const BLOCK_TAGS = new Set([
  'article',
  'blockquote',
  'div',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'li',
  'ol',
  'p',
  'section',
  'ul',
]);
const IGNORED_TAGS = new Set(['script', 'style', 'iframe', 'object', 'embed']);

type HtmlNode = ReturnType<typeof parseDocument>['children'][number];

const mergeParagraphSegments = (
  segments: ContentDetailTextSegmentViewData[],
): ContentDetailTextSegmentViewData[] => {
  const mergedSegments: ContentDetailTextSegmentViewData[] = [];

  segments.forEach(segment => {
    const previousSegment = mergedSegments[mergedSegments.length - 1];
    const hasSameTarget =
      previousSegment?.type === segment.type &&
      (segment.type === 'text' ||
        (previousSegment.type === 'link' &&
          previousSegment.url === segment.url));

    if (previousSegment && hasSameTarget) {
      previousSegment.text += segment.text;
      return;
    }

    mergedSegments.push({...segment});
  });

  return mergedSegments;
};

export const buildNoticeBodyBlocks = (
  notice: Pick<Notice, 'content' | 'contentDetail' | 'id' | 'link' | 'title'>,
): ContentDetailBodyBlockViewData[] => {
  const html = normalizeNoticeHtml(
    notice.contentDetail || notice.content || '',
  );

  if (!html.trim()) {
    return [
      {
        id: `${notice.id}-body-1`,
        text: notice.title,
        type: 'paragraph' as const,
      },
    ];
  }

  const blocks: ContentDetailBodyBlockViewData[] = [];
  const contentBaseUrl =
    normalizeExternalWebUrl(notice.link) ?? NOTICE_CONTENT_BASE_URL;
  let paragraphSegments: ContentDetailTextSegmentViewData[] = [];
  let blockSequence = 0;

  const nextBlockId = (type: string) => {
    blockSequence += 1;
    return `${notice.id}-${type}-${blockSequence}`;
  };

  const appendText = (rawText: string, linkUrl?: string) => {
    let normalizedText = rawText.replace(/\s+/g, ' ');

    if (!normalizedText) {
      return;
    }

    const previousSegment = paragraphSegments[paragraphSegments.length - 1];
    if (!previousSegment) {
      normalizedText = normalizedText.trimStart();
    } else if (
      (previousSegment.text.endsWith(' ') ||
        previousSegment.text.endsWith('\n')) &&
      normalizedText.startsWith(' ')
    ) {
      normalizedText = normalizedText.trimStart();
    }

    if (!normalizedText) {
      return;
    }

    paragraphSegments.push(
      linkUrl
        ? {text: normalizedText, type: 'link', url: linkUrl}
        : {text: normalizedText, type: 'text'},
    );
    paragraphSegments = mergeParagraphSegments(paragraphSegments);
  };

  const flushParagraph = () => {
    const nextSegments = mergeParagraphSegments(paragraphSegments);
    paragraphSegments = [];

    if (nextSegments.length === 0) {
      return;
    }

    nextSegments[0].text = nextSegments[0].text.trimStart();
    nextSegments[nextSegments.length - 1].text =
      nextSegments[nextSegments.length - 1].text.trimEnd();

    const nonEmptySegments = nextSegments.filter(segment => segment.text);
    const text = nonEmptySegments.map(segment => segment.text).join('');

    if (!text) {
      return;
    }

    blocks.push({
      id: nextBlockId('paragraph'),
      segments: nonEmptySegments.some(segment => segment.type === 'link')
        ? nonEmptySegments
        : undefined,
      text,
      type: 'paragraph',
    });
  };

  const walk = (node: HtmlNode, activeLinkUrl?: string) => {
    if (DomUtils.isText(node)) {
      appendText(node.data, activeLinkUrl);
      return;
    }

    if (!DomUtils.isTag(node)) {
      if (DomUtils.hasChildren(node)) {
        node.children.forEach(child => walk(child, activeLinkUrl));
      }
      return;
    }

    const tagName = node.name.toLowerCase();

    if (IGNORED_TAGS.has(tagName)) {
      return;
    }

    if (tagName === 'table') {
      flushParagraph();
      blocks.push({
        baseUrl: contentBaseUrl,
        html: DomUtils.getOuterHTML(node),
        id: nextBlockId('table'),
        type: 'table',
      });
      return;
    }

    if (tagName === 'img') {
      flushParagraph();
      const rawImageUrl = (node.attribs.src?.trim() ?? '').replace(
        /^http:\/\//i,
        'https://',
      );
      const validatedImageUrl = normalizeExternalWebUrl(
        rawImageUrl,
        contentBaseUrl,
      );
      const imageUrl =
        validatedImageUrl && /^https?:\/\//i.test(rawImageUrl)
          ? rawImageUrl
          : validatedImageUrl;

      if (imageUrl) {
        const alt = node.attribs.alt?.trim();
        blocks.push({
          alt: alt || undefined,
          id: nextBlockId('image'),
          imageUrl,
          ...(activeLinkUrl ? {linkUrl: activeLinkUrl} : {}),
          type: 'image',
        });
      }
      return;
    }

    if (tagName === 'br') {
      const previousSegment = paragraphSegments[paragraphSegments.length - 1];

      if (previousSegment?.text.endsWith('\n')) {
        flushParagraph();
      } else {
        paragraphSegments.push(
          activeLinkUrl
            ? {text: '\n', type: 'link', url: activeLinkUrl}
            : {text: '\n', type: 'text'},
        );
        paragraphSegments = mergeParagraphSegments(paragraphSegments);
      }
      return;
    }

    const nextLinkUrl =
      tagName === 'a'
        ? normalizeExternalWebUrl(node.attribs.href ?? '', contentBaseUrl) ??
          activeLinkUrl
        : activeLinkUrl;

    if (tagName === 'li') {
      appendText('- ', nextLinkUrl);
    }

    node.children.forEach(child => walk(child, nextLinkUrl));

    if (BLOCK_TAGS.has(tagName)) {
      flushParagraph();
    }
  };

  const document = parseDocument(html, {decodeEntities: true});
  document.children.forEach(child => walk(child));
  flushParagraph();

  return blocks.length > 0
    ? blocks
    : [
        {
          id: `${notice.id}-body-fallback`,
          text: notice.content,
          type: 'paragraph' as const,
        },
      ];
};
