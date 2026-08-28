import {httpClient, type ApiSuccessResponse} from '@/shared/api';

import type {AppLinkIntent, ResolvedAppLinkIntent} from './appLinkIntent';

export type ShareResourceType = 'NOTICE' | 'BOARD';

type ShareLinkResponseDto = {
  resourceType: ShareResourceType;
  code: string;
  url: string;
};

type ShareLinkResolveResponseDto = {
  resourceType: ShareResourceType;
  code: string;
  resourceId: string;
};

const SHARE_CODE_PATTERN = /^[1-9A-HJ-NP-Za-km-z]{8}$/;
const LINK_ORIGIN = 'https://link.skuri.kr';

const resourcePath = (resourceType: ShareResourceType): 'notice' | 'board' =>
  resourceType === 'NOTICE' ? 'notice' : 'board';

const assertShareCode = (code: string): void => {
  if (!SHARE_CODE_PATTERN.test(code)) {
    throw new Error('공유 링크 코드 형식이 올바르지 않습니다.');
  }
};

export const createContentShareUrl = async (
  resourceType: ShareResourceType,
  resourceId: string,
): Promise<string> => {
  const response = await httpClient.post<
    ApiSuccessResponse<ShareLinkResponseDto>,
    {resourceType: ShareResourceType; resourceId: string}
  >('/v1/share-links', {resourceType, resourceId});
  const {data} = response;
  assertShareCode(data.code);
  const expectedUrl = `${LINK_ORIGIN}/${resourcePath(resourceType)}/${data.code}`;
  if (data.resourceType !== resourceType || data.url !== expectedUrl) {
    throw new Error('공유 링크 응답이 요청과 일치하지 않습니다.');
  }
  return expectedUrl;
};

const resolveContentCode = async (
  resourceType: ShareResourceType,
  code: string,
): Promise<string> => {
  assertShareCode(code);
  const path = resourcePath(resourceType);
  const response = await httpClient.get<
    ApiSuccessResponse<ShareLinkResolveResponseDto>
  >(`/v1/share-links/${path}/${code}/resolve`);
  const {data} = response;
  if (
    data.resourceType !== resourceType ||
    data.code !== code ||
    !data.resourceId?.trim() ||
    data.resourceId.length > 160
  ) {
    throw new Error('공유 링크 해석 응답이 올바르지 않습니다.');
  }
  return data.resourceId;
};

export const resolveAppLinkIntent = async (
  intent: AppLinkIntent,
): Promise<ResolvedAppLinkIntent> => {
  switch (intent.kind) {
    case 'notice':
      return {
        kind: 'notice',
        noticeId: await resolveContentCode('NOTICE', intent.code),
      };
    case 'board':
      return {
        kind: 'board',
        postId: await resolveContentCode('BOARD', intent.code),
      };
    case 'cafeteria':
      return intent;
  }
};
