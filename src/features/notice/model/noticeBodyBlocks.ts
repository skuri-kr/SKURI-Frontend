import type {ContentDetailBodyBlockViewData} from '@/shared/types/contentDetailViewData';

import {normalizeNoticeHtml} from './selectors';
import type {Notice} from './types';

const TABLE_TOKEN_PATTERN = /\[\[TABLE:(\d+)\]\]/;
const IMAGE_TOKEN_PATTERN = /\[\[IMG:(\d+)\]\]/;

const decodeHtmlEntities = (value: string) =>
  value
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"');

export const buildNoticeBodyBlocks = (
  notice: Pick<Notice, 'content' | 'contentDetail' | 'id' | 'title'>,
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

  const tables: string[] = [];
  const images: string[] = [];

  const tokenized = html
    .replace(/<table[\s\S]*?<\/table>/gi, match => {
      const tableIndex = tables.push(match) - 1;
      return `\n[[TABLE:${tableIndex}]]\n`;
    })
    .replace(
      /<img[^>]*src=["']([^"']+)["'][^>]*>/gi,
      (_match, imageUrl) => {
        const imageIndex = images.push(imageUrl) - 1;
        return `\n[[IMG:${imageIndex}]]\n`;
      },
    )
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|section|article|h[1-6])>/gi, '\n\n')
    .replace(/<li[^>]*>/gi, '- ')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, '');

  const blocks = tokenized
    .split(/(\[\[TABLE:\d+\]\]|\[\[IMG:\d+\]\])/g)
    .reduce<ContentDetailBodyBlockViewData[]>((accumulator, segment, index) => {
      const tableMatch = segment.match(TABLE_TOKEN_PATTERN);

      if (tableMatch) {
        const tableHtml = tables[Number(tableMatch[1])];

        if (tableHtml) {
          accumulator.push({
            html: tableHtml,
            id: `${notice.id}-table-${index + 1}`,
            type: 'table',
          });
        }

        return accumulator;
      }

      const imageMatch = segment.match(IMAGE_TOKEN_PATTERN);

      if (imageMatch) {
        const imageUrl = images[Number(imageMatch[1])];

        if (imageUrl) {
          accumulator.push({
            id: `${notice.id}-image-${index + 1}`,
            imageUrl,
            type: 'image',
          });
        }

        return accumulator;
      }

      decodeHtmlEntities(segment)
        .split(/\n{2,}/)
        .map(paragraph => paragraph.trim())
        .filter(Boolean)
        .forEach((paragraph, paragraphIndex) => {
          accumulator.push({
            id: `${notice.id}-paragraph-${index + 1}-${paragraphIndex + 1}`,
            text: paragraph,
            type: 'paragraph',
          });
        });

      return accumulator;
    }, []);

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
