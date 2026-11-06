import { applicationDefault, cert, initializeApp, getApps } from 'firebase-admin/app';
import type { App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

/**
 * Server-Side Firebase Admin SDK Initialization.
 * This module is only imported by Node.js API/server code; never by React client code.
 *
 * AI Studio / Cloud Run can use Application Default Credentials.
 * Vercel must receive a service-account JSON document through the encrypted
 * FIREBASE_SERVICE_ACCOUNT_JSON environment variable. Never commit that JSON.
 */

const PROJECT_ID = 'gen-lang-client-0492732633';
const DATABASE_ID = 'ai-studio-truthnovel-3ad0db13-ef5a-4d1c-98fc-3fa5b62e3d96';

function readVercelServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (!raw) return null;

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON must contain the complete valid Firebase service-account JSON document.');
  }

  const projectId = typeof parsed.project_id === 'string' ? parsed.project_id : '';
  const clientEmail = typeof parsed.client_email === 'string' ? parsed.client_email : '';
  const privateKey = typeof parsed.private_key === 'string' ? parsed.private_key : '';

  if (projectId !== PROJECT_ID) {
    throw new Error('Firebase service-account project_id does not match the HUKM production project. Refusing to initialize Admin SDK.');
  }
  if (!clientEmail || !privateKey.includes('PRIVATE KEY')) {
    throw new Error('Firebase service-account JSON is missing client_email or a valid private_key.');
  }

  return {
    projectId: PROJECT_ID,
    clientEmail,
    privateKey: privateKey.replace(/\\n/g, '\n'),
  };
}

let adminApp: App;

const existingApp = getApps().find((app) => app.name === '[DEFAULT]');
if (existingApp) {
  if (existingApp.options.projectId !== PROJECT_ID) {
    throw new Error('The existing Firebase Admin app targets a different project. Refusing to continue.');
  }
  adminApp = existingApp;
} else {
  const serviceAccount = readVercelServiceAccount();

  if (process.env.VERCEL === '1' && !serviceAccount) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is required for Firebase Admin operations on Vercel. Configure it as a server-side Environment Variable.');
  }

  adminApp = initializeApp(
    serviceAccount
      ? { credential: cert(serviceAccount), projectId: PROJECT_ID }
      : { credential: applicationDefault(), projectId: PROJECT_ID }
  );
}

export const adminAuth = getAuth(adminApp);
export const adminDb = getFirestore(adminApp, DATABASE_ID);
