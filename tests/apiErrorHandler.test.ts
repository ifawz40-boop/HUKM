import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { Request, Response, NextFunction } from 'express';
import { apiErrorHandler } from '../src/server/apiErrorHandler.ts';

function invoke(error: unknown, path: string, headersSent = false) {
  let statusCode = 200;
  let payload: unknown;
  let forwardedError: unknown;
  const req = { path } as Request;
  const res = {
    headersSent,
    status(code: number) { statusCode = code; return this; },
    json(body: unknown) { payload = body; return this; },
  } as unknown as Response;

  apiErrorHandler(
    error,
    req,
    res,
    ((nextError?: unknown) => { forwardedError = nextError; }) as NextFunction
  );

  return { statusCode, payload, forwardedError };
}

describe('API error boundary', () => {
  it('returns a safe JSON 400 for malformed request bodies', () => {
    const result = invoke({ type: 'entity.parse.failed', message: 'private parser details' }, '/api/auth/lookup-user');
    assert.equal(result.statusCode, 400);
    assert.deepEqual(result.payload, {
      success: false,
      code: 'INVALID_JSON',
      message: 'صيغة JSON المرسلة غير صالحة.',
    });
    assert.equal(JSON.stringify(result.payload).includes('private parser details'), false);
  });

  it('returns a safe JSON 413 when a request body exceeds the configured limit', () => {
    const result = invoke({ type: 'entity.too.large', status: 413 }, '/api/email/send');
    assert.equal(result.statusCode, 413);
    assert.equal((result.payload as { code: string }).code, 'PAYLOAD_TOO_LARGE');
  });

  it('hides unexpected internal exception details behind a generic 500 response', () => {
    const result = invoke(new Error('database password or provider secret'), '/api/auth/admin-requests');
    assert.equal(result.statusCode, 500);
    assert.equal((result.payload as { code: string }).code, 'INTERNAL_SERVER_ERROR');
    assert.equal(JSON.stringify(result.payload).includes('database password'), false);
  });

  it('forwards non-API errors and responses whose headers have already been sent', () => {
    const nonApi = invoke(new Error('page failure'), '/reader');
    assert.ok(nonApi.forwardedError instanceof Error);
    const sent = invoke(new Error('late failure'), '/api/health', true);
    assert.ok(sent.forwardedError instanceof Error);
    assert.equal(sent.payload, undefined);
  });
});
