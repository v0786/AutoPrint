export type ApiErrorCode =
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'UNPROCESSABLE_ENTITY'
  | 'RATE_LIMITED'
  | 'INTERNAL_SERVER_ERROR'
  | 'BAD_GATEWAY'
  | 'SERVICE_UNAVAILABLE'
  | 'GATEWAY_TIMEOUT'
  | 'UNKNOWN';

export interface ApiErrorDetails {
  field?: string;
  message: string;
  code?: string;
}

export class ApiError extends Error {
  public readonly code: ApiErrorCode;
  public readonly status: number;
  public readonly details: ApiErrorDetails[];
  public readonly requestId?: string;
  public readonly isRetryable: boolean;
  public readonly url?: string;
  public readonly method?: string;

  constructor(params: {
    code: ApiErrorCode;
    status: number;
    message: string;
    details?: ApiErrorDetails[];
    requestId?: string;
    url?: string;
    method?: string;
    cause?: unknown;
  }) {
    super(params.message);
    this.name = 'ApiError';
    this.code = params.code;
    this.status = params.status;
    this.details = params.details ?? [];
    this.requestId = params.requestId;
    this.url = params.url;
    this.method = params.method;
    this.isRetryable = RETRYABLE_CODES.has(params.code);

    if (params.cause instanceof Error) {
      this.stack = `${this.stack}\nCaused by: ${params.cause.stack}`;
    }
  }

  public toJSON() {
    return {
      code: this.code,
      status: this.status,
      message: this.message,
      details: this.details,
      requestId: this.requestId,
      isRetryable: this.isRetryable,
    };
  }
}

export const RETRYABLE_CODES: ReadonlySet<ApiErrorCode> = new Set([
  'NETWORK_ERROR',
  'TIMEOUT',
  'INTERNAL_SERVER_ERROR',
  'BAD_GATEWAY',
  'SERVICE_UNAVAILABLE',
  'GATEWAY_TIMEOUT',
  'RATE_LIMITED',
]);

export function statusToErrorCode(status: number): ApiErrorCode {
  switch (status) {
    case 400:
      return 'BAD_REQUEST';
    case 401:
      return 'UNAUTHORIZED';
    case 403:
      return 'FORBIDDEN';
    case 404:
      return 'NOT_FOUND';
    case 409:
      return 'CONFLICT';
    case 422:
      return 'UNPROCESSABLE_ENTITY';
    case 429:
      return 'RATE_LIMITED';
    case 500:
      return 'INTERNAL_SERVER_ERROR';
    case 502:
      return 'BAD_GATEWAY';
    case 503:
      return 'SERVICE_UNAVAILABLE';
    case 504:
      return 'GATEWAY_TIMEOUT';
    default:
      return status >= 500 ? 'INTERNAL_SERVER_ERROR' : 'UNKNOWN';
  }
}

export function getUserFriendlyMessage(error: ApiError): string {
  switch (error.code) {
    case 'NETWORK_ERROR':
      return 'Unable to connect to the print server. Please check your network connection.';
    case 'TIMEOUT':
      return 'The request timed out. The server is taking too long to respond. Please try again.';
    case 'UNAUTHORIZED':
      return 'Your session has expired. Please refresh the page and try again.';
    case 'FORBIDDEN':
      return 'You do not have permission to perform this action.';
    case 'NOT_FOUND':
      return 'The requested resource was not found on the server.';
    case 'CONFLICT':
      return 'There was a conflict with another operation. Please try again.';
    case 'UNPROCESSABLE_ENTITY':
      return error.details.length > 0
        ? error.details.map((d) => d.message).join(' ')
        : 'The submitted data was invalid. Please review and try again.';
    case 'RATE_LIMITED':
      return 'Too many requests. Please wait a moment before trying again.';
    case 'INTERNAL_SERVER_ERROR':
    case 'BAD_GATEWAY':
    case 'GATEWAY_TIMEOUT':
      return 'The print server encountered an error. Please try again in a moment.';
    case 'SERVICE_UNAVAILABLE':
      return 'The print service is currently unavailable. Please try again later.';
    default:
      return 'Something went wrong. Please try again.';
  }
}
