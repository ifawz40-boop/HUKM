import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import type { Request, Response } from 'express';
import { createRateLimiter } from '../src/server/requestProtection.ts';

function invoke(
  middleware: ReturnType<typeof createRateLimiter>,
  ip: string,
  now: () => number
) {
  const headers: Record<string, string> = {};
  let statusCode = 200;
  let payload: unknown;
  let nextCalled = false;
  const req = { ip, socket: { remoteAddress: ip } } as Request;
  const res = {
    setHeader(name: string, value: string) { headers[name] = value; },
    status(code: number) { statusCode = code; return this; },
    json(body: unknown) { payload = body; return this; },
  } as unknown as Response;

  middleware(req, res, () => { nextCalled = true; });
  return { headers, statusCode, payload, nextCalled };
}

describe('API rate limiting', () => {
  it('allows requests up to the configured limit and rejects the next request', () => {
    let time = 1_000;
    const limiter = createRateLimiter({
      windowMs: 60_000,
      max: 2,
      message: 'Too many requests',
      now: () => time,
    });

    assert.equal(invoke(limiter, '192.0.2.1', () => time).nextCalled, true);
    assert.equal(invoke(limiter, '192.0.2.1', () => time).nextCalled, true);
    const blocked = invoke(limiter, '192.0.2.1', () => time);

    assert.equal(blocked.nextCalled, false);
    assert.equal(blocked.statusCode, 429);
    assert.equal(blocked.headers['RateLimit-Limit'], '2');
    assert.equal(blocked.headers['RateLimit-Remaining'], '0');
    assert.equal(blocked.headers['Retry-After'], '60');
    assert.deepEqual(blocked.payload, {
      success: false,
      code: 'RATE_LIMITED',
      message: 'Too many requests',
    });
  });

  it('isolates client keys and resets an expired window', () => {
    let time = 5_000;
    const limiter = createRateLimiter({
      windowMs: 1_000,
      max: 1,
      message: 'Slow down',
      now: () => time,
    });

    assert.equal(invoke(limiter, '192.0.2.10', () => time).nextCalled, true);
    assert.equal(invoke(limiter, '192.0.2.11', () => time).nextCalled, true);
    assert.equal(invoke(limiter, '192.0.2.10', () => time).statusCode, 429);

    time += 1_001;
    const renewed = invoke(limiter, '192.0.2.10', () => time);
    assert.equal(renewed.nextCalled, true);
    assert.equal(renewed.headers['RateLimit-Remaining'], '0');
  });

  it('rejects invalid limiter configuration', () => {
    assert.throws(() => createRateLimiter({ windowMs: 0, max: 1, message: 'x' }), RangeError);
    assert.throws(() => createRateLimiter({ windowMs: 1_000, max: 0, message: 'x' }), RangeError);
  });
});
describe('API protection wiring', () => {
  it('trusts exactly one Vercel proxy hop for visitor-specific rate limiting, without enabling proxy trust locally', () => {
    for (const entrypoint of ['server.ts', 'api/index.ts']) {
      const source = fs.readFileSync(path.resolve(process.cwd(), entrypoint), 'utf-8');
      assert.match(source, /if \(process\.env\.VERCEL === '1'\) \{\s*app\.set\('trust proxy', 1\);\s*\}/);
    }
  });
  for (const entrypoint of ['server.ts', 'api/index.ts']) {
    it(`applies the shared security, rate-limit, body-size, and error protections in ${entrypoint}`, () => {
      const source = fs.readFileSync(path.resolve(process.cwd(), entrypoint), 'utf-8');
      assert.ok(source.includes('app.use(applySecurityHeaders)'));
      assert.ok(source.includes("app.use('/api', createRateLimiter("));
      assert.ok(source.includes("app.use('/api/auth', createRateLimiter("));
      assert.ok(source.includes("app.use('/api/email', createRateLimiter("));
      assert.ok(source.includes("express.json({ limit: '256kb' })"));
      assert.ok(source.includes('app.use(apiErrorHandler)'));
    });
  }

  it('places a dedicated send limiter on the email dispatch route', () => {
    const source = fs.readFileSync(path.resolve(process.cwd(), 'src/server/emailApi.ts'), 'utf-8');
    assert.ok(source.includes("emailApiRouter.post('/send', sendEmailRateLimit, authenticateToken"));
  });
});

