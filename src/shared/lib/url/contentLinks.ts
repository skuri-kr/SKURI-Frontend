import type {ContentDetailTextSegmentViewData} from '@/shared/types/contentDetailViewData';

const URL_CANDIDATE_PATTERN =
  /(?:https?:\/\/|www\.)[a-z0-9.-]+(?::\d+)?(?:[/?#][^\s<>"']*)?/giu;
const TRAILING_TEXT_PUNCTUATION_PATTERN = /[.,!?;:>'"\u2019\u201d]+$/u;
const TRAILING_DELIMITER_PAIRS = [
  {closing: ')', opening: '('},
  {closing: ']', opening: '['},
  {closing: '}', opening: '{'},
] as const;

const countCharacter = (value: string, character: string): number =>
  value.split(character).length - 1;

export const stripTrailingUrlPunctuation = (value: string): string => {
  let result = value.replace(TRAILING_TEXT_PUNCTUATION_PATTERN, '');

  while (result) {
    const trailingPair = TRAILING_DELIMITER_PAIRS.find(({closing}) =>
      result.endsWith(closing),
    );

    if (!trailingPair) {
      return result;
    }

    const openingCount = countCharacter(result, trailingPair.opening);
    const closingCount = countCharacter(result, trailingPair.closing);

    if (closingCount <= openingCount) {
      return result;
    }

    result = result
      .slice(0, -trailingPair.closing.length)
      .replace(TRAILING_TEXT_PUNCTUATION_PATTERN, '');
  }

  return result;
};

export const normalizeExternalWebUrl = (
  rawUrl: string,
  baseUrl?: string,
): string | null => {
  const trimmedUrl = rawUrl.trim();

  if (!trimmedUrl) {
    return null;
  }

  const candidate = /^www\./i.test(trimmedUrl)
    ? `https://${trimmedUrl}`
    : trimmedUrl;

  try {
    const parsedUrl = baseUrl
      ? new URL(candidate, baseUrl)
      : new URL(candidate);

    if (
      (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') ||
      !parsedUrl.hostname
    ) {
      return null;
    }

    return parsedUrl.toString();
  } catch {
    return null;
  }
};

export const linkifyContentText = (
  text: string,
): ContentDetailTextSegmentViewData[] => {
  const segments: ContentDetailTextSegmentViewData[] = [];
  let cursor = 0;

  for (const match of text.matchAll(URL_CANDIDATE_PATTERN)) {
    const matchIndex = match.index ?? 0;
    const matchedText = match[0];
    const linkText = stripTrailingUrlPunctuation(matchedText);
    const normalizedUrl = normalizeExternalWebUrl(linkText);

    if (!normalizedUrl || !linkText) {
      continue;
    }

    if (matchIndex > cursor) {
      segments.push({
        text: text.slice(cursor, matchIndex),
        type: 'text',
      });
    }

    segments.push({
      text: linkText,
      type: 'link',
      url: normalizedUrl,
    });

    const trailingText = matchedText.slice(linkText.length);
    if (trailingText) {
      segments.push({
        text: trailingText,
        type: 'text',
      });
    }

    cursor = matchIndex + matchedText.length;
  }

  if (cursor < text.length) {
    segments.push({
      text: text.slice(cursor),
      type: 'text',
    });
  }

  return segments.length > 0 ? segments : [{text, type: 'text'}];
};

export const linkifyContentSegments = (
  segments: ContentDetailTextSegmentViewData[],
): ContentDetailTextSegmentViewData[] =>
  segments.flatMap(segment =>
    segment.type === 'link' ? [segment] : linkifyContentText(segment.text),
  );
