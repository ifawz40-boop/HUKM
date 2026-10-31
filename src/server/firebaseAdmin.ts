import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

/**
 * Server-Side Firebase Admin SDK Initialization
 * CRITICAL: This file MUST only be imported and run in Node.js server environments (Express/Vercel API routes).
 * It is NEVER imported in frontend React code.
 */

const PROJECT_ID = 'gen-lang-client-0492732633';
const DATABASE_ID = 'ai-studio-truthnovel-3ad0db13-ef5a-4d1c-98fc-3fa5b62e3d96';

let adminApp: App;

if (getApps().length === 0) {
  // If GOOGLE_APPLICATION_CREDENTIALS or default credentials exist, use them;
  // otherwise initialize with project ID.
  adminApp = initializeApp({
    projectId: PROJECT_ID,
  });
} else {
  adminApp = getApps()[0]!;
}

export const adminAuth = getAuth(adminApp);
export const adminDb = getFirestore(adminApp, DATABASE_ID);
