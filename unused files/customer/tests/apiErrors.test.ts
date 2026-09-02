import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ApiError,
  statusToErrorCode,
  getUserFriendlyMessage,
  RETRYABLE_CODES,
} from '../src/lib/apiErrors';

test('statusToErrorCode: maps 4xx correctly', () => {
  assert.equal(statusToErrorCode(400), 'BAD_REQUEST');
  assert.equal(statusToErrorCode(401), 'UNAUTHORIZED');
  assert.equal(statusToErrorCode(403), 'FORBIDDEN');
  assert.equal(statusToErrorCode(404), 'NOT_FOUND');
  assert.equal(statusToErrorCode(409), 'CONFLICT');
  assert.equal(statusToErrorCode(422), 'UNPROCESSABLE_ENTITY');
  assert.equal(statusToErrorCode(429), 'RATE_LIMITED');
});

test('statusToErrorCode: maps 5xx correctly', () => {
  assert.equal(statusToErrorCode(500), 'INTERNAL_SERVER_ERROR');
  assert.equal(statusToErrorCode(502), 'BAD_GATEWAY');
  assert.equal(statusToErrorCode(503), 'SERVICE_UNAVAILABLE');
  assert.equal(statusToErrorCode(504), 'GATEWAY_TIMEOUT');
});

test('statusToErrorCode: 5xx defaults to INTERNAL_SERVER_ERROR', () => {
  assert.equal(statusToErrorCode(599), 'INTERNAL_SERVER_ERROR');
  assert.equal(statusToErrorCode(501), 'INTERNAL_SERVER_ERROR');
});

test('statusToErrorCode: unknown status maps to UNKNOWN', () => {
  assert.equal(statusToErrorCode(418), 'UNKNOWN');
  assert.equal(statusToErrorCode(0), 'UNKNOWN');
});

test('ApiError: constructs correctly with basic params', () => {
  const error = new ApiError({
    code: 'NOT_FOUND',
    status: 404,
    message: 'Resource not found',
  });
  assert.equal(error.name, 'ApiError');
  assert.equal(error.code, 'NOT_FOUND');
  assert.equal(error.status, 404);
  assert.equal(error.message, 'Resource not found');
  assert.deepEqual(error.details, []);
});

test('ApiError: includes details and requestId', () => {
  const error = new ApiError({
    code: 'UNPROCESSABLE_ENTITY',
    status: 422,
    message: 'Validation failed',
    details: [
      { field: 'email', message: 'Invalid email format' },
      { field: 'name', message: 'Required' },
    ],
    requestId: 'req-123-abc',
  });
  assert.equal(error.details.length, 2);
  assert.equal(error.details[0].field, 'email');
  assert.equal(error.requestId, 'req-123-abc');
});

test('ApiError: retryable codes marked correctly', () => {
  const netErr = new ApiError({
    code: 'NETWORK_ERROR',
    status: 0,
    message: 'No connection',
  });
  assert.equal(netErr.isRetryable, true);
  assert.ok(RETRYABLE_CODES.has('NETWORK_ERROR'));

  const notFoundErr = new ApiError({
    code: 'NOT_FOUND',
    status: 404,
    message: 'Nope',
  });
  assert.equal(notFoundErr.isRetryable, false);
  assert.equal(RETRYABLE_CODES.has('NOT_FOUND'), false);
});

test('ApiError: toJSON serializes properties', () => {
  const error = new ApiError({
    code: 'BAD_REQUEST',
    status: 400,
    message: 'Bad',
    details: [{ message: 'x' }],
  });
  const json = error.toJSON();
  assert.equal(json.code, 'BAD_REQUEST');
  assert.equal(json.status, 400);
  assert.equal(json.message, 'Bad');
  assert.equal(json.isRetryable, false);
});

test('getUserFriendlyMessage: provides meaningful messages', () => {
  const netErr = new ApiError({
    code: 'NETWORK_ERROR',
    status: 0,
    message: 'raw message',
  });
  assert.ok(getUserFriendlyMessage(netErr).includes('network'));

  const timeoutErr = new ApiError({
    code: 'TIMEOUT',
    status: 0,
    message: 'timeout',
  });
  assert.ok(getUserFriendlyMessage(timeoutErr).includes('timed out'));

  const serverErr = new ApiError({
    code: 'INTERNAL_SERVER_ERROR',
    status: 500,
    message: 'oops',
  });
  assert.ok(getUserFriendlyMessage(serverErr).includes('server'));

  const rateErr = new ApiError({
    code: 'RATE_LIMITED',
    status: 429,
    message: 'too fast',
  });
  assert.ok(getUserFriendlyMessage(rateErr).includes('Too many requests'));
});

test('getUserFriendlyMessage: UNPROCESSABLE_ENTITY surfaces first detail', () => {
  const detailedErr = new ApiError({
    code: 'UNPROCESSABLE_ENTITY',
    status: 422,
    message: 'Validation failed',
    details: [{ field: 'email', message: 'Invalid email address' }],
  });
  const msg = getUserFriendlyMessage(detailedErr);
  assert.ok(msg.includes('Invalid email address'));
});

test('RETRYABLE_CODES includes all transient failures', () => {
  const expected = [
    'NETWORK_ERROR',
    'TIMEOUT',
    'INTERNAL_SERVER_ERROR',
    'BAD_GATEWAY',
    'SERVICE_UNAVAILABLE',
    'GATEWAY_TIMEOUT',
    'RATE_LIMITED',
  ];
  for (const code of expected) {
    assert.ok(RETRYABLE_CODES.has(code as any), `Expected ${code} to be retryable`);
  }
});
