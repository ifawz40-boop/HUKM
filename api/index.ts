import express from 'express';
import { authClaimsRouter } from '../src/server/authClaimsApi.ts';
import { emailApiRouter } from '../src/server/emailApi.ts';
import { applySecurityHeaders } from '../src/server/httpSecurity.ts';

const app = express();

app.use(applySecurityHeaders);
app.use(express.json());

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

export default app;
