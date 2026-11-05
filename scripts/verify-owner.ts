/**
 * HUKM MEDIA — Read-only first-owner verification.
 *
 * Usage:
 *   $env:GOOGLE_APPLICATION_CREDENTIALS = "C:\secure\\firebase-admin.json"
 *   $env:OWNER_EMAIL = "the-verified-account@example.com"
 *   bun run owner:verify
 *
 * This script never writes to Firebase.
 */
import { initializeApp, getApps } from 'firebase-admin/app';
import type { App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const PROJECT_ID = 'gen-lang-client-0492732633';
const DATABASE_ID = 'ai-studio-truthnovel-3ad0db13-ef5a-4d1c-98fc-3fa5b62e3d96';

function getOwnerEmail(): string {
  const email = process.env.OWNER_EMAIL?.trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Set OWNER_EMAIL to the exact verified Firebase Auth email.');
  }
  return email;
}

function getAdminApp(): App {
  const existing = getApps()[0];
  if (existing) {
    if (existing.options.projectId !== PROJECT_ID) {
      throw new Error('The initialized Firebase Admin app targets a different project.');
    }
    return existing;
  }
  return initializeApp({ projectId: PROJECT_ID });
}

async function verifyOwner(): Promise<void> {
  const email = getOwnerEmail();
  if ((process.env.FIREBASE_PROJECT_ID || PROJECT_ID) !== PROJECT_ID ||
      (process.env.FIREBASE_DATABASE_ID || DATABASE_ID) !== DATABASE_ID) {
    throw new Error('Firebase project/database mismatch. Verification stopped.');
  }

  const app = getAdminApp();
  const auth = getAuth(app);
  const db = getFirestore(app, DATABASE_ID);
  const user = await auth.getUserByEmail(email);
  const [bootstrapSnap, adminSnap] = await Promise.all([
    db.collection('_system').doc('bootstrap').get(),
    db.collection('admins').doc(user.uid).get(),
  ]);

  const bootstrap = bootstrapSnap.data() || {};
  const admin = adminSnap.data() || {};
  const checks = {
    firebaseAccountExists: Boolean(user.uid),
    emailVerified: user.emailVerified === true,
    customClaimOwner: user.customClaims?.role === 'owner',
    bootstrapCompleted: bootstrapSnap.exists && bootstrap.status === 'completed' && bootstrap.completed === true && bootstrap.locked === true,
    bootstrapUidMatches: bootstrap.ownerUid === user.uid,
    ownerRegistryExists: adminSnap.exists,
    registryUidMatches: admin.uid === user.uid && admin.id === user.uid,
    registryRoleOwner: admin.role === 'owner',
    founderProtected: admin.isFounder === true,
  };

  console.log('HUKM OWNER VERIFICATION');
  for (const [name, passed] of Object.entries(checks)) {
    console.log(`${passed ? 'PASS' : 'FAIL'} ${name}`);
  }

  const allPassed = Object.values(checks).every(Boolean);
  console.log(allPassed
    ? 'RESULT: VERIFIED — Firebase Auth and Firestore owner state agree.'
    : 'RESULT: NOT VERIFIED — do not assume owner provisioning is complete.');
  if (!allPassed) process.exitCode = 1;
}

verifyOwner().catch((error) => {
  console.error('OWNER VERIFICATION FAILED:', error?.message || error);
  process.exitCode = 1;
});
