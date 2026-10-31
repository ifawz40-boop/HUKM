/**
 * HUKM MEDIA — Secure Server-Side Bootstrap Script
 * 
 * Sets the founder as OWNER and executive manager as ADMIN using Firebase Admin SDK.
 * Assigns custom claims:
 *   - dr.islam.mohamed@hukm.media -> { role: 'owner' }
 *   - ifawz40@gmail.com -> { role: 'admin' }
 * 
 * Usage:
 *   npx tsx scripts/bootstrap-owner.ts
 */

import { initializeApp, getApps, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const PROJECT_ID = 'gen-lang-client-0492732633';
const DATABASE_ID = 'ai-studio-truthnovel-3ad0db13-ef5a-4d1c-98fc-3fa5b62e3d96';

let app: App;
if (getApps().length === 0) {
  app = initializeApp({ projectId: PROJECT_ID });
} else {
  app = getApps()[0]!;
}

const auth = getAuth(app);
const db = getFirestore(app, DATABASE_ID);

const FOUNDER_EMAIL = 'dr.islam.mohamed@hukm.media';
const MANAGER_EMAIL = 'ifawz40@gmail.com';

async function bootstrap() {
  console.log('🚀 Starting HUKM MEDIA One-Time Security Bootstrap...');

  // 1. Process Founder (OWNER)
  try {
    const founderUser = await auth.getUserByEmail(FOUNDER_EMAIL);
    await auth.setCustomUserClaims(founderUser.uid, { role: 'owner' });
    await auth.revokeRefreshTokens(founderUser.uid);
    await db.collection('admins').doc(founderUser.uid).set({
      id: founderUser.uid,
      uid: founderUser.uid,
      email: founderUser.email,
      name: founderUser.displayName || 'Dr/ Islam Mohamed',
      title: 'المؤسس والمشرف العام للمنصة',
      role: 'owner',
      isFounder: true,
      canEditBooks: true,
      canManageBans: true,
      addedBy: 'SYSTEM_BOOTSTRAP',
      addedAt: new Date().toISOString(),
    });
    console.log(`✅ Founder assigned OWNER claim successfully: UID=${founderUser.uid}`);
  } catch (err: any) {
    console.warn(`⚠️ Founder account (${FOUNDER_EMAIL}) not yet created in Firebase Auth: ${err.message}`);
  }

  // 2. Process Manager (ADMIN)
  try {
    const managerUser = await auth.getUserByEmail(MANAGER_EMAIL);
    await auth.setCustomUserClaims(managerUser.uid, { role: 'admin' });
    await auth.revokeRefreshTokens(managerUser.uid);
    await db.collection('admins').doc(managerUser.uid).set({
      id: managerUser.uid,
      uid: managerUser.uid,
      email: managerUser.email,
      name: managerUser.displayName || 'إبراهيم فوزي',
      title: 'المدير التنفيذي والناشر',
      role: 'admin',
      isFounder: false,
      canEditBooks: true,
      canManageBans: true,
      addedBy: 'SYSTEM_BOOTSTRAP',
      addedAt: new Date().toISOString(),
    });
    console.log(`✅ Manager assigned ADMIN claim successfully: UID=${managerUser.uid}`);
  } catch (err: any) {
    console.warn(`⚠️ Manager account (${MANAGER_EMAIL}) not yet created in Firebase Auth: ${err.message}`);
  }

  // 3. Mark bootstrap in system collection
  await db.collection('_system').doc('bootstrap').set({
    completed: true,
    lastRunAt: new Date().toISOString(),
  }, { merge: true });

  console.log('🎉 Bootstrap procedure completed successfully.');
}

bootstrap().catch((err) => {
  console.error('❌ Bootstrap failed:', err);
  process.exit(1);
});
