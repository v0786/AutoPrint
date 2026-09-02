import {
  ApiError,
  RETRYABLE_CODES,
  statusToErrorCode,
  type ApiErrorDetails,
} from '@/lib/apiErrors';

const API_BASE_URL =
  (typeof window !== 'undefined'
    ? process.env.NEXT_PUBLIC_MERCHANT_API_URL ||
      process.env.NEXT_PUBLIC_API_BASE_URL
    : process.env.MERCHANT_API_URL) || 'http://localhost:4100';

const DEFAULT_TIMEOUT_MS = 30000;
const DEFAULT_MAX_RETRIES = 2;
const DEFAULT_RETRY_DELAY_MS = 500;
const MAX_RETRY_DELAY_MS = 5000;

export interface ApiRequestOptions extends RequestInit {
  timeoutMs?: number;
  maxRetries?: number;
  retryDelayMs?: number;
  token?: string;
  skipAuth?: boolean;
  skipRetry?: boolean;
}

export interface HealthCheckResult {
  ok: boolean;
  service?: string;
  timestamp?: string;
  latencyMs: number;
}

function getRequestId(headers: Headers): string | undefined {
  return headers.get('x-request-id') || headers.get('x-trace-id') || undefined;
}

function parseResponseBody(
  raw: string,
  contentType: string | null
): unknown {
  if (!contentType) return raw;
  if (contentType.includes('application/json')) {
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }
  return raw;
}

function extractValidationErrors(body: unknown): ApiErrorDetails[] {
  if (!body || typeof body !== 'object') return [];
  const b = body as Record<string, unknown>;

  if (Array.isArray(b.details)) {
    return b.details
      .map((d) => {
        if (d && typeof d === 'object') {
          const rec = d as Record<string, unknown>;
          return {
            field: typeof rec.field === 'string' ? rec.field : undefined,
            message: typeof rec.message === 'string' ? rec.message : 'Invalid value',
            code: typeof rec.code === 'string' ? rec.code : undefined,
          };
        }
        return null;
      })
      .filter(Boolean) as ApiErrorDetails[];
  }

  if (typeof b.error === 'string' && b.errors && typeof b.errors === 'object') {
    return Object.entries(b.errors as Record<string, unknown>).map(
      ([field, msg]) => ({
        field,
        message: typeof msg === 'string' ? msg : `${field} is invalid`,
      })
    );
  }

  return [];
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function calculateRetryDelay(
  attempt: number,
  baseDelayMs: number
): number {
  const exponential = baseDelayMs * Math.pow(2, attempt);
  const jitter = exponential * 0.3 * Math.random();
  return Math.min(exponential + jitter, MAX_RETRY_DELAY_MS);
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number
): Promise<T> {
  const timeoutId = Symbol('timeout');
  const race = await Promise.race([
    promise,
    new Promise<typeof timeoutId>((resolve) =>
      setTimeout(() => resolve(timeoutId), timeoutMs)
    ),
  ]);
  if (race === timeoutId) {
    throw new ApiError({
      code: 'TIMEOUT',
      status: 0,
      message: `Request timed out after ${timeoutMs}ms`,
    });
  }
  return race;
}

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const {
    timeoutMs = DEFAULT_TIMEOUT_MS,
    maxRetries = DEFAULT_MAX_RETRIES,
    retryDelayMs = DEFAULT_RETRY_DELAY_MS,
    token,
    skipAuth = false,
    skipRetry = false,
    headers,
    method = 'GET',
    body,
    ...fetchOptions
  } = options;

  const url = `${API_BASE_URL}${path}`;
  let lastError: ApiError | null = null;
  const attemptCount = skipRetry ? 1 : maxRetries + 1;

  for (let attempt = 0; attempt < attemptCount; attempt++) {
    if (attempt > 0 && lastError) {
      const waitMs = calculateRetryDelay(attempt - 1, retryDelayMs);
      await delay(waitMs);
    }

    try {
      const requestHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(headers as Record<string, string>),
      };

      if (token && !skipAuth) {
        requestHeaders['Authorization'] = `Bearer ${token}`;
      }

      if (!requestHeaders['X-Request-ID']) {
        requestHeaders['X-Request-ID'] = `req-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 10)}`;
      }

      const response = await withTimeout(
        fetch(url, {
          ...fetchOptions,
          method,
          headers: requestHeaders,
          body,
        }),
        timeoutMs
      );

      const responseBodyRaw = await response.text();
      const contentType = response.headers.get('content-type');
      const parsedBody = parseResponseBody(responseBodyRaw, contentType);
      const requestId = getRequestId(response.headers);

      if (!response.ok) {
        const errorCode = statusToErrorCode(response.status);
        const parsedObj = parsedBody as Record<string, unknown>;
        const errorMessage =
          parsedBody &&
          typeof parsedBody === 'object' &&
          'message' in parsedObj &&
          typeof parsedObj.message === 'string'
            ? parsedObj.message
            : response.statusText || 'Request failed';
        const details = extractValidationErrors(parsedBody);

        const apiError = new ApiError({
          code: errorCode,
          status: response.status,
          message: errorMessage,
          details,
          requestId,
          url,
          method,
        });

        if (
          !skipRetry &&
          RETRYABLE_CODES.has(errorCode) &&
          attempt < attemptCount - 1
        ) {
          lastError = apiError;
          continue;
        }

        throw apiError;
      }

      return parsedBody as T;
    } catch (err) {
      if (err instanceof ApiError) {
        if (!skipRetry && err.isRetryable && attempt < attemptCount - 1) {
          lastError = err;
          continue;
        }
        throw err;
      }

      const networkError = new ApiError({
        code: 'NETWORK_ERROR',
        status: 0,
        message:
          err instanceof Error ? err.message : 'Unable to connect to server',
        cause: err,
        url,
        method,
      });

      if (!skipRetry && attempt < attemptCount - 1) {
        lastError = networkError;
        continue;
      }

      throw networkError;
    }
  }

  throw (
    lastError ??
    new ApiError({
      code: 'UNKNOWN',
      status: 0,
      message: 'Request failed after all retries',
    })
  );
}

export const getApiBaseUrl = () => API_BASE_URL;

export async function checkApiHealth(
  options: ApiRequestOptions = {}
): Promise<HealthCheckResult> {
  const start = performance.now();
  try {
    const result = await apiRequest<{
      ok: boolean;
      service?: string;
      timestamp?: string;
    }>('/health', {
      method: 'GET',
      skipRetry: true,
      timeoutMs: 5000,
      ...options,
    });
    return {
      ok: result.ok,
      service: result.service,
      timestamp: result.timestamp,
      latencyMs: Math.round(performance.now() - start),
    };
  } catch {
    return {
      ok: false,
      latencyMs: Math.round(performance.now() - start),
    };
  }
}

export interface CreateOrderRequest {
  fileName: string;
  mimeType: string;
  colorMode: 'bw' | 'color';
  copies: number;
  pageRange: string;
  paymentMethod: 'cash' | 'upi';
  customerName: string;
}

export interface CreateOrderResponse {
  ok: boolean;
  order: {
    id: string;
    fileName: string;
    mimeType: string;
    colorMode: 'bw' | 'color';
    copies: number;
    pageRange: string;
    paymentMethod: 'cash' | 'upi';
    customerName: string;
    verificationCode: string;
    status: 'queued' | 'printing' | 'verified' | 'completed';
    createdAt: string;
  };
}

export async function createPrintOrder(
  data: CreateOrderRequest,
  options: ApiRequestOptions = {}
): Promise<CreateOrderResponse> {
  return apiRequest<CreateOrderResponse>('/api/orders', {
    method: 'POST',
    body: JSON.stringify(data),
    ...options,
  });
}

export async function listOrders(options: ApiRequestOptions = {}): Promise<{
  ok: boolean;
  orders: CreateOrderResponse['order'][];
}> {
  return apiRequest('/api/orders', {
    method: 'GET',
    ...options,
  });
}
