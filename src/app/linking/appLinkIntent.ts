const LINK_HOSTS = new Set(['link.skuri.kr', 'open.skuri.kr']);
const APP_SCHEME_PATTERN = /^skuri:\/\/open\/?(?:\?([^#]*))?(?:#.*)?$/i;
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
  if (
    url.protocol !== 'https:' ||
    !LINK_HOSTS.has(url.hostname) ||
    url.port
  ) {
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

const parseCustomSchemeIntent = (rawUrl: string): AppLinkIntent | null => {
  const match = APP_SCHEME_PATTERN.exec(rawUrl);
  if (!match) {
    return null;
  }

  const searchParams = new URLSearchParams(match[1] ?? '');
  const target = searchParams.get('target');
  if (target === 'cafeteria') {
    return {kind: 'cafeteria'};
  }

  const id = parseSafeId(searchParams.get('id') ?? undefined);
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
  if (/^skuri:/i.test(rawUrl)) {
    return parseCustomSchemeIntent(rawUrl);
  }

  try {
    const url = new URL(rawUrl);
    return parseHttpsIntent(url);
  } catch {
    return null;
  }
};
