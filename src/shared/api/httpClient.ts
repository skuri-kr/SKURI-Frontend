import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';

import { mapApiError } from './apiErrorMapper';
import { getApiRuntimeConfig } from './apiConfig';
import { getAuthorizationHeaderValue } from './authTokenProvider';
import {
  createHttpRequestLogContext,
  logHttpError,
  logHttpResponse,
} from './apiLogger';

export interface ApiRequestConfig<D = unknown>
  extends Omit<AxiosRequestConfig<D>, 'baseURL'> {
  optionalAuth?: boolean;
  requiresAuth?: boolean;
  forceRefreshToken?: boolean;
}

const normalizeHeaders = (
  headers?: AxiosRequestConfig['headers'],
): Record<string, string> => {
  if (!headers) {
    return {};
  }

  return Object.entries(headers as Record<string, unknown>).reduce<Record<string, string>>(
    (result, [key, value]) => {
      if (value === undefined || value === null) {
        return result;
      }

      result[key] = String(value);
      return result;
    },
    {},
  );
};

const buildRequestHeaders = async (
  config: ApiRequestConfig,
): Promise<Record<string, string>> => {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...normalizeHeaders(config.headers),
  };

  if (config.requiresAuth === false) {
    return headers;
  }

  const authorization = await getAuthorizationHeaderValue({
    forceRefresh: config.forceRefreshToken,
  });

  if (authorization) {
    headers.Authorization = authorization;
  }

  return headers;
};

export class HttpClient {
  async request<TResponse, D = unknown>(
    config: ApiRequestConfig<D>,
  ): Promise<TResponse> {
    let logContext: ReturnType<typeof createHttpRequestLogContext> | null = null;

    try {
      const headers = await buildRequestHeaders(config);
      const method = config.method?.toUpperCase() ?? 'GET';
      logContext = createHttpRequestLogContext({
        method,
        path: config.url ?? '',
        params: config.params,
        headers,
        body: config.data,
      });
      const response = await axios.request<TResponse, AxiosResponse<TResponse>, D>({
        ...config,
        baseURL: getApiRuntimeConfig().restBaseUrl,
        timeout: config.timeout ?? getApiRuntimeConfig().httpTimeoutMs,
        headers,
      });

      logHttpResponse(logContext, {
        statusCode: response.status,
        data: response.data,
      });

      return response.data;
    } catch (error) {
      if (!logContext) {
        logContext = createHttpRequestLogContext({
          method: config.method?.toUpperCase() ?? 'GET',
          path: config.url ?? '',
          params: config.params,
          headers: config.headers as Record<string, unknown> | undefined,
          body: config.data,
        });
      }

      const mappedError = mapApiError(error, {
        url: config.url,
        method: config.method?.toUpperCase(),
      });

      logHttpError(logContext, mappedError);
      throw mappedError;
    }
  }

  get<TResponse>(url: string, config?: Omit<ApiRequestConfig, 'method' | 'url'>) {
    return this.request<TResponse>({
      ...config,
      method: 'GET',
      url,
    });
  }

  delete<TResponse>(url: string, config?: Omit<ApiRequestConfig, 'method' | 'url'>) {
    return this.request<TResponse>({
      ...config,
      method: 'DELETE',
      url,
    });
  }

  post<TResponse, D = unknown>(
    url: string,
    data?: D,
    config?: Omit<ApiRequestConfig<D>, 'method' | 'url' | 'data'>,
  ) {
    return this.request<TResponse, D>({
      ...config,
      method: 'POST',
      url,
      data,
    });
  }

  put<TResponse, D = unknown>(
    url: string,
    data?: D,
    config?: Omit<ApiRequestConfig<D>, 'method' | 'url' | 'data'>,
  ) {
    return this.request<TResponse, D>({
      ...config,
      method: 'PUT',
      url,
      data,
    });
  }

  patch<TResponse, D = unknown>(
    url: string,
    data?: D,
    config?: Omit<ApiRequestConfig<D>, 'method' | 'url' | 'data'>,
  ) {
    return this.request<TResponse, D>({
      ...config,
      method: 'PATCH',
      url,
      data,
    });
  }
}

export const httpClient = new HttpClient();
