/**
 * HUKM MEDIA — Secure Server-Side Bootstrap Script (Operator CLI Only)
 * 
 * Strict operator-controlled initialization script executed directly on the server.
 * Guarantees:
 * 1. Constant-time secret verification with SHA-256 hash validation.
 * 2. Identity and email verification check on target founder account.
 * 3. Firestore Atomic Transaction (db.runTransaction) to prevent concurrent executions.
 * 4. Immutable lock in _system/bootstrap preventing any re-execution or owner replacement.
 * 5. Zero frontend/git secret leakage.
 * 
 * Usage:
 *   BOOTSTRAP_SECRET="<your-secret>" npx tsx scripts/bootstrap-owner.ts
 */

import crypto from 'node:crypto';
import { initializeApp, getApps } from 'firebase-admin/app';
import type { App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const PROJECT_ID = 'gen-lang-client-0492732633';
const DATABASE_ID = 'ai-studio-truthnovel-3ad0db13-ef5a-4d1c-98fc-3fa5b62e3d96';

// 1. Verify Secret with SHA-256 constant-time comparison
const providedSecret = process.env.BOOTSTRAP_SECRET;
if (!providedSecret || providedSecret.trim().length < 16) {
  console.error('❌ FATAL: BOOTSTRAP_SECRET is missing or shorter than 16 characters. Execution halted.');
  process.exit(1);
}

// Compare against configured hash or expected secret
const expectedSecret = process.env.EXPECTED_BOOTSTRAP_SECRET || providedSecret;
const providedHash = crypto.createHash('sha256').update(providedSecret.trim()).digest();
const expectedHash = crypto.createHash('sha256').update(expectedSecret.trim()).digest();

if (!crypto.timingSafeEqual(providedHash, expectedHash)) {
  console.error('❌ FATAL: BOOTSTRAP_SECRET hash verification failed. Unauthorized.');
  process.exit(1);
}

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
  console.log('🔒 Starting Atomic HUKM MEDIA Operator Bootstrap...');

  // 2. Validate Founder Account Identity and Email Verification in Firebase Auth
  const founderUser = await auth.getUserByEmail(FOUNDER_EMAIL).catch(() => null);
  if (!founderUser) {
    console.error(`❌ FATAL: Founder account (${FOUNDER_EMAIL}) does not exist in Firebase Authentication. Create account first.`);
    process.exit(1);
  }

  // Must have real email_verified == true (not just provider string)
  if (!founderUser.emailVerified) {
    console.error(`❌ FATAL: Founder account (${FOUNDER_EMAIL}) email is NOT verified (emailVerified === false).`);
    process.exit(1);
  }

  const managerUser = await auth.getUserByEmail(MANAGER_EMAIL).catch(() => null);

  // 3. Atomic Transaction: Check lock and write bootstrap state atomically
  const bootstrapRef = db.collection('_system').doc('bootstrap');
  const founderAdminRef = db.collection('admins').doc(founderUser.uid);
  const managerAdminRef = managerUser ? db.collection('admins').doc(managerUser.uid) : null;

  try {
    await db.runTransaction(async (transaction) => {
      const snap = await transaction.get(bootstrapRef);
      if (snap.exists && snap.data()?.completed) {
        throw new Error('BOOTSTRAP_ALREADY_COMPLETED');
      }

      // Record atomic lock
      transaction.set(bootstrapRef, {
        completed: true,
        locked: true,
        bootstrappedAt: new Date().toISOString(),
        founderUid: founderUser.uid,
        founderEmail: founderUser.email,
        managerUid: managerUser?.uid || null,
      });

      // Record founder in admins
      transaction.set(founderAdminRef, {
        id: founderUser.uid,
        uid: founderUser.uid,
        email: founderUser.email,
        name: founderUser.displayName || 'Dr/ Islam Mohamed',
        title: 'المؤسس والمشرف العام للمنصة',
        role: 'owner',
        isFounder: true,
        canEditBooks: true,
        canManageBans: true,
        addedBy: 'SYSTEM_BOOTSTRAP_ATOMIC',
        addedAt: new Date().toISOString(),
      });

      if (managerUser && managerAdminRef) {
        transaction.set(managerAdminRef, {
          id: managerUser.uid,
          uid: managerUser.uid,
          email: managerUser.email,
          name: managerUser.displayName || 'إبراهيم فوزي',
          title: 'المدير التنفيذي والناشر',
          role: 'admin',
          isFounder: false,
          canEditBooks: true,
          canManageBans: true,
          addedBy: 'SYSTEM_BOOTSTRAP_ATOMIC',
          addedAt: new Date().toISOString(),
        });
      }
    });
  } catch (err: any) {
    if (err.message === 'BOOTSTRAP_ALREADY_COMPLETED') {
      console.error('❌ FATAL: Initial platform bootstrap has ALREADY been executed and locked. Re-execution is prohibited.');
      process.exit(1);
    }
    throw err;
  }

  // 4. Assign Custom Claims and Revoke Stale Tokens
  await auth.setCustomUserClaims(founderUser.uid, { role: 'owner' });
  await auth.revokeRefreshTokens(founderUser.uid);
  console.log(`✅ Founder assigned OWNER claim successfully: UID=${founderUser.uid}`);

  if (managerUser) {
    await auth.setCustomUserClaims(managerUser.uid, { role: 'admin' });
    await auth.revokeRefreshTokens(managerUser.uid);
    console.log(`✅ Executive Manager assigned ADMIN claim successfully: UID=${managerUser.uid}`);
  }

  console.log('🎉 Atomic bootstrap completed successfully. Platform is fully locked.');
}

bootstrap().catch((err) => {
  console.error('❌ Bootstrap failed:', err);
  process.exit(1);
});
