import express from 'express';
import { authClaimsRouter } from '../src/server/authClaimsApi.ts';
import { emailApiRouter } from '../src/server/emailApi.ts';
import { applySecurityHeaders } from '../src/server/httpSecurity.ts';
import { createRateLimiter } from '../src/server/requestProtection.ts';
import { apiErrorHandler } from '../src/server/apiErrorHandler.ts';

const app = express();

app.use(applySecurityHeaders);
app.use('/api', createRateLimiter({
  windowMs: 60_000,
  max: 120,
  message: 'تم تجاوز عدد الطلبات المسموح به. حاول مرة أخرى بعد قليل.',
}));
app.use('/api/auth', createRateLimiter({
  windowMs: 60_000,
  max: 30,
  message: 'تم تجاوز عدد محاولات المصادقة والإدارة. يرجى الانتظار دقيقة.',
}));
app.use('/api/email', createRateLimiter({
  windowMs: 60_000,
  max: 20,
  message: 'تم تجاوز عدد طلبات البريد الإلكتروني. يرجى المحاولة لاحقاً.',
}));
app.use(express.json({ limit: '256kb' }));

// Mount authentication claims and admin management endpoints
app.use('/api/auth', authClaimsRouter);

// Mount real email dispatch endpoints
app.use('/api/email', emailApiRouter);

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'HUKM MEDIA Backend (Vercel Serverless & Express Engine)',
    timestamp: new Date().toISOString(),
  });
});

app.use(apiErrorHandler);

export default app;
