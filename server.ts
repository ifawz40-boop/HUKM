import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { authClaimsRouter } from './src/server/authClaimsApi.ts';
import { emailApiRouter } from './src/server/emailApi.ts';
import { applySecurityHeaders } from './src/server/httpSecurity.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getPort(): number {
  // 1. CLI argument --port has highest priority (e.g. AI Studio passing --port 3000)
  const portArgIdx = process.argv.indexOf('--port');
  if (portArgIdx !== -1 && process.argv[portArgIdx + 1]) {
    return parseInt(process.argv[portArgIdx + 1], 10);
  }
  // 2. In development, always enforce port 3000 (ignoring container PORT=8080)
  if (process.env.NODE_ENV !== 'production') {
    return 3000;
  }
  // 3. In production, use process.env.PORT if provided
  return process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
}

function getHost(): string {
  const hostArgIdx = process.argv.indexOf('--host');
  if (hostArgIdx !== -1 && process.argv[hostArgIdx + 1]) {
    return process.argv[hostArgIdx + 1];
  }
  return '0.0.0.0';
}

async function startServer() {
  const app = express();
  const PORT = getPort();
  const HOST = getHost();
  const isProd = process.env.NODE_ENV === 'production';

  app.use(applySecurityHeaders);
  app.use(express.json());

  // Mount backend API routes for Custom Claims & Admin Management
  app.use('/api/auth', authClaimsRouter);
  app.use('/api/email', emailApiRouter);

  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'HUKM MEDIA Backend',
      port: PORT,
      timestamp: new Date().toISOString(),
    });
  });

  if (!isProd) {
    // Development mode: Mount Vite dev server with middlewares
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === 'true' ? false : undefined,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production mode: Serve built static files from dist
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, HOST, () => {
    console.log(`🚀 HUKM MEDIA Server running at http://${HOST}:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
