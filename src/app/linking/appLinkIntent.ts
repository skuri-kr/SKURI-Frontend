const LINK_HOST = 'link.skuri.kr';
const APP_SCHEME_HOST = 'open';
const SAFE_ID_PATTERN = /^[A-Za-z0-9_-]+$/;

export type AppLinkIntent =
  | {kind: 'notice'; noticeId: string}
  | {kind: 'cafeteria'}
  | {kind: 'board'; postId: string};

const parseSafeId = (value: string | undefined): string | null => {
  if (!value) {
    return null;
  }

  try {
    const decoded = decodeURIComponent(value);
    return decoded.length <= 160 && SAFE_ID_PATTERN.test(decoded)
      ? decoded
      : null;
  } catch {
    return null;
  }
};

const restoreNoticeId = (shareId: string): string =>
  shareId.replace(/-/g, '+').replace(/_/g, '/');

const parseHttpsIntent = (url: URL): AppLinkIntent | null => {
  if (url.protocol !== 'https:' || url.hostname !== LINK_HOST || url.port) {
    return null;
  }

  const segments = url.pathname.split('/').filter(Boolean);
  if (segments.length === 1 && segments[0] === 'cafeteria') {
    return {kind: 'cafeteria'};
  }

  if (segments.length !== 2) {
    return null;
  }

  const id = parseSafeId(segments[1]);
  if (!id) {
    return null;
  }

  if (segments[0] === 'notice') {
    return {kind: 'notice', noticeId: restoreNoticeId(id)};
  }

  if (segments[0] === 'board') {
    return {kind: 'board', postId: id};
  }

  return null;
};

const parseCustomSchemeIntent = (url: URL): AppLinkIntent | null => {
  if (url.protocol !== 'skuri:' || url.hostname !== APP_SCHEME_HOST) {
    return null;
  }

  const target = url.searchParams.get('target');
  if (target === 'cafeteria') {
    return {kind: 'cafeteria'};
  }

  const id = parseSafeId(url.searchParams.get('id') ?? undefined);
  if (!id) {
    return null;
  }

  if (target === 'notice') {
    return {kind: 'notice', noticeId: restoreNoticeId(id)};
  }

  if (target === 'board') {
    return {kind: 'board', postId: id};
  }

  return null;
};

export const parseAppLinkUrl = (rawUrl: string): AppLinkIntent | null => {
  try {
    const url = new URL(rawUrl);
    return url.protocol === 'https:'
      ? parseHttpsIntent(url)
      : parseCustomSchemeIntent(url);
  } catch {
    return null;
  }
};
