const LINK_HOSTS = new Set(['link.skuri.kr', 'open.skuri.kr']);
const APP_SCHEME_PATTERN = /^skuri:\/\/open\/?(?:\?([^#]*))?(?:#.*)?$/i;
const SHARE_CODE_PATTERN = /^[1-9A-HJ-NP-Za-km-z]{8}$/;

export type AppLinkIntent =
  | {kind: 'notice'; code: string}
  | {kind: 'cafeteria'}
  | {kind: 'board'; code: string};

export type ResolvedAppLinkIntent =
  | {kind: 'notice'; noticeId: string}
  | {kind: 'cafeteria'}
  | {kind: 'board'; postId: string};

const parseSafeId = (value: string | undefined): string | null => {
  if (!value) {
    return null;
  }

  try {
    const decoded = decodeURIComponent(value);
    return SHARE_CODE_PATTERN.test(decoded) ? decoded : null;
  } catch {
    return null;
  }
};

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

  const code = parseSafeId(segments[1]);
  if (!code) {
    return null;
  }

  if (segments[0] === 'notice') {
    return {kind: 'notice', code};
  }

  if (segments[0] === 'board') {
    return {kind: 'board', code};
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

  const code = parseSafeId(searchParams.get('id') ?? undefined);
  if (!code) {
    return null;
  }

  if (target === 'notice') {
    return {kind: 'notice', code};
  }

  if (target === 'board') {
    return {kind: 'board', code};
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
