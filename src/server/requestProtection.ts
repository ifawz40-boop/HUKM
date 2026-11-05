import type { Request, RequestHandler } from 'express';

export interface RateLimitOptions {
  windowMs: number;
  max: number;
  message: string;
  keyGenerator?: (req: Request) => string;
  now?: () => number;
}

/**
 * Small dependency-free fixed-window limiter for API routes.
 * It is intentionally process-local: it protects each server instance without
 * introducing Redis, external services, or new runtime dependencies.
 */
export function createRateLimiter(options: RateLimitOptions): RequestHandler {
  const { windowMs, max, message, now = Date.now } = options;

  if (!Number.isSafeInteger(windowMs) || windowMs <= 0) {
    throw new RangeError('Rate-limit windowMs must be a positive safe integer.');
  }
  if (!Number.isSafeInteger(max) || max <= 0) {
    throw new RangeError('Rate-limit max must be a positive safe integer.');
  }

  const keyGenerator = options.keyGenerator ?? ((req: Request) =>
    req.ip || req.socket.remoteAddress || 'unknown'
  );
  const buckets = new Map<string, { count: number; resetAt: number }>();
  let requestsSinceCleanup = 0;
  const MAX_BUCKETS = 10_000;

  return (req, res, next) => {
    const currentTime = now();
    requestsSinceCleanup += 1;

    // Periodically remove expired keys so long-lived instances cannot grow forever.
    if (requestsSinceCleanup >= 256 || buckets.size >= MAX_BUCKETS) {
      for (const [key, bucket] of buckets) {
        if (bucket.resetAt <= currentTime) buckets.delete(key);
      }
      requestsSinceCleanup = 0;
    }

    let key = keyGenerator(req) || 'unknown';
    if (!buckets.has(key) && buckets.size >= MAX_BUCKETS) key = '__overflow__';

    let bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= currentTime) {
      bucket = { count: 0, resetAt: currentTime + windowMs };
      buckets.set(key, bucket);
    }

    bucket.count += 1;
    const remaining = Math.max(0, max - bucket.count);
    const retryAfterSeconds = Math.max(1, Math.ceil((bucket.resetAt - currentTime) / 1000));

    res.setHeader('RateLimit-Limit', String(max));
    res.setHeader('RateLimit-Remaining', String(remaining));
    res.setHeader('RateLimit-Reset', String(retryAfterSeconds));

    if (bucket.count > max) {
      res.setHeader('Retry-After', String(retryAfterSeconds));
      res.status(429).json({
        success: false,
        code: 'RATE_LIMITED',
        message,
      });
      return;
    }

    next();
  };
}
