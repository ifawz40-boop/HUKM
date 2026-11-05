import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { Request, Response, NextFunction } from 'express';
import { applySecurityHeaders } from '../src/server/httpSecurity.ts';

function runMiddleware(path: string) {
  const headers: Record<string, string> = {};
  let nextCalled = false;
  applySecurityHeaders(
    { path } as Request,
    { setHeader: (name: string, value: string) => { headers[name] = value; } } as unknown as Response,
    (() => { nextCalled = true; }) as NextFunction
  );
  return { headers, nextCalled };
}

describe('HTTP security headers', () => {
  it('sets conservative browser security headers on every response', () => {
    const { headers, nextCalled } = runMiddleware('/');
    assert.equal(headers['X-Content-Type-Options'], 'nosniff');
    assert.equal(headers['X-Frame-Options'], 'DENY');
    assert.equal(headers['Referrer-Policy'], 'strict-origin-when-cross-origin');
    assert.equal(headers['X-Permitted-Cross-Domain-Policies'], 'none');
    assert.equal(headers['Permissions-Policy'], 'camera=(), microphone=(), geolocation=()');
    assert.equal(headers['Cache-Control'], undefined);
    assert.equal(nextCalled, true);
  });

  it('prevents authenticated API responses from being cached', () => {
    const { headers, nextCalled } = runMiddleware('/api/email/subscribers');
    assert.equal(headers['Cache-Control'], 'no-store, max-age=0');
    assert.equal(headers.Pragma, 'no-cache');
    assert.equal(nextCalled, true);
  });

  it('also protects the API root path', () => {
    const { headers } = runMiddleware('/api');
    assert.equal(headers['Cache-Control'], 'no-store, max-age=0');
  });
});
