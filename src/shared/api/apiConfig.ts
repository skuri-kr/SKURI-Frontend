// Local HTTPS tunnel QA only: copy baseUrl.example.ts to the ignored baseUrl.ts,
// then uncomment this import and the BASE_URL line below in your worktree.
// import {BASE_URL} from './baseUrl';

export interface ApiRuntimeConfig {
  restBaseUrl: string;
  wsEndpointPath: string;
  httpTimeoutMs: number;
  sseReconnectDelayMs: number;
  stompReconnectDelayMs: number;
  stompHeartbeatIncomingMs: number;
  stompHeartbeatOutgoingMs: number;
}

export type ApiQueryValue =
  | string
  | number
  | boolean
  | null
  | undefined;

export type ApiQueryParams = Record<string, ApiQueryValue>;

const DEFAULT_API_RUNTIME_CONFIG: ApiRuntimeConfig = {
  restBaseUrl: 'https://api.skuri.kr',
  // restBaseUrl: "https://<ngrok>.ngrok-free.app",
  wsEndpointPath: '/ws',
  httpTimeoutMs: 15000,
  sseReconnectDelayMs: 3000,
  stompReconnectDelayMs: 5000,
  stompHeartbeatIncomingMs: 10000,
  stompHeartbeatOutgoingMs: 10000,
};

let currentApiRuntimeConfig: ApiRuntimeConfig = {
  ...DEFAULT_API_RUNTIME_CONFIG,
};

const ABSOLUTE_URL_PATTERN = /^https?:\/\//i;

const normalizeBaseUrl = (baseUrl: string) =>
  baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

const normalizePath = (path: string) => {
  if (!path) {
    return '';
  }

  return path.startsWith('/') ? path : `/${path}`;
};

const toQueryString = (query?: ApiQueryParams) => {
  if (!query) {
    return '';
  }

  const entries = Object.entries(query).filter(([, value]) => value !== undefined && value !== null);
  if (entries.length === 0) {
    return '';
  }

  return entries
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&');
};

export const getApiRuntimeConfig = (): ApiRuntimeConfig => currentApiRuntimeConfig;

export const setApiRuntimeConfig = (
  overrides: Partial<ApiRuntimeConfig>,
): ApiRuntimeConfig => {
  currentApiRuntimeConfig = {
    ...currentApiRuntimeConfig,
    ...overrides,
  };

  return currentApiRuntimeConfig;
};

export const resetApiRuntimeConfig = (): ApiRuntimeConfig => {
  currentApiRuntimeConfig = {
    ...DEFAULT_API_RUNTIME_CONFIG,
  };

  return currentApiRuntimeConfig;
};

export const buildApiUrl = (
  path: string,
  query?: ApiQueryParams,
): string => {
  const baseUrl = normalizeBaseUrl(currentApiRuntimeConfig.restBaseUrl);
  const rawUrl = ABSOLUTE_URL_PATTERN.test(path)
    ? path
    : `${baseUrl}${normalizePath(path)}`;
  const queryString = toQueryString(query);

  if (!queryString) {
    return rawUrl;
  }

  return `${rawUrl}${rawUrl.includes('?') ? '&' : '?'}${queryString}`;
};

export const buildWebSocketUrl = (
  endpointPath = currentApiRuntimeConfig.wsEndpointPath,
): string => {
  const httpUrl = buildApiUrl(endpointPath);

  if (httpUrl.startsWith('https://')) {
    return `wss://${httpUrl.slice('https://'.length)}`;
  }

  if (httpUrl.startsWith('http://')) {
    return `ws://${httpUrl.slice('http://'.length)}`;
  }

  return httpUrl;
};
