import type { NextFunction, Request, Response } from 'express';

/**
 * Conservative HTTP hardening shared by the local Express server and Vercel API.
 * Deliberately avoids a restrictive CSP/COOP policy that could break Firebase
 * popup authentication, Google Fonts, or existing media embeds.
 */
export function applySecurityHeaders(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  if (req.path === '/api' || req.path.startsWith('/api/')) {
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    res.setHeader('Pragma', 'no-cache');
  }

  next();
}
