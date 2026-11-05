/**
 * HUKM MEDIA — First Owner Bootstrap (local operator CLI only)
 *
 * This script is the ONLY supported initial-owner provisioning path.
 * It never accepts an owner role from the browser and never writes to an
 * arbitrary Firebase project. It fails closed on any pre-existing or
 * inconsistent bootstrap/admin state.
 *
 * Windows PowerShell:
 *   $env:GOOGLE_APPLICATION_CREDENTIALS = "C:\\secure\\firebase-admin.json"
 *   $env:OWNER_EMAIL = "the-verified-account@example.com"
 *   $env:BOOTSTRAP_CONFIRMATION = "HUKM_INITIAL_OWNER"
 *   bun run owner:bootstrap
 *
 * Use a Firebase Admin service identity with only the IAM permissions needed
 * to read/update Firebase Authentication users and read/write this Firestore
 * database. Never commit or share its credential file.
 */

import { initializeApp, getApps } from 'firebase-admin/app';
import type { App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import {
  assertOwnerClaimCanBeAssigned,
  decideOwnerBootstrap,
  isValidOwnerEmail,
} from '../src/server/ownerBootstrapGuards.ts';

const PROJECT_ID = 'gen-lang-client-0492732633';
const DATABASE_ID = 'ai-studio-truthnovel-3ad0db13-ef5a-4d1c-98fc-3fa5b62e3d96';
const CONFIRMATION = 'HUKM_INITIAL_OWNER';

function requireOwnerEmail(value: string | undefined): string {
  const email = value?.trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('OWNER_EMAIL is missing or invalid. Set it to the verified Firebase Auth email.');
  }
  return email;
}

function assertProjectConfiguration(): void {
  const requestedProject = process.env.FIREBASE_PROJECT_ID || PROJECT_ID;
  const requestedDatabase = process.env.FIREBASE_DATABASE_ID || DATABASE_ID;
  if (requestedProject !== PROJECT_ID || requestedDatabase !== DATABASE_ID) {
    throw new Error('Firebase project/database mismatch. Refusing to run against a different environment.');
  }
  if (process.env.BOOTSTRAP_CONFIRMATION !== CONFIRMATION) {
    throw new Error('Explicit confirmation missing. Set BOOTSTRAP_CONFIRMATION=HUKM_INITIAL_OWNER to proceed.');
  }
}

function getAdminApp(): App {
  const existing = getApps()[0];
  if (existing) {
    if (existing.options.projectId !== PROJECT_ID) {
      throw new Error('An already-initialized Firebase Admin app targets a different project. Refusing to continue.');
    }
    return existing;
  }

  // Firebase Admin uses GOOGLE_APPLICATION_CREDENTIALS or Application Default Credentials.
  return initializeApp({ projectId: PROJECT_ID });
}

async function restoreClaims(
  auth: ReturnType<typeof getAuth>,
  uid: string,
  previousClaims: Record<string, unknown>
): Promise<void> {
  try {
    await auth.setCustomUserClaims(uid, previousClaims);
    await auth.revokeRefreshTokens(uid);
    console.warn('Previous custom claims were restored after the failed bootstrap step.');
  } catch (error) {
    console.error('CRITICAL: Automatic claim rollback failed. Do not retry blindly; inspect Firebase Auth and Firestore state first.');
    throw error;
  }
}

async function bootstrapOwner(): Promise<void> {
  assertProjectConfiguration();
  const ownerEmail = requireOwnerEmail(process.env.OWNER_EMAIL);
  const app = getAdminApp();
  const auth = getAuth(app);
  const db = getFirestore(app, DATABASE_ID);

  console.log('Starting guarded first-owner bootstrap.');
  console.log(`Firebase project: ${PROJECT_ID}`);
  console.log(`Firestore database: ${DATABASE_ID}`);

  let ownerUser;
  try {
    ownerUser = await auth.getUserByEmail(ownerEmail);
  } catch (error: any) {
    if (error?.code === 'auth/user-not-found') {
      throw new Error('The target account does not exist in Firebase Authentication. Sign in/register first, verify its email, then rerun.');
    }
    throw error;
  }

  if (!ownerUser.emailVerified) {
    throw new Error('The target Firebase Auth account email is not verified. Verify it before running this script.');
  }
  if (!ownerUser.email || ownerUser.email.trim().toLowerCase() !== ownerEmail) {
    throw new Error('Firebase Auth returned an unexpected email for the requested account. Refusing to continue.');
  }

  let existingClaims = (ownerUser.customClaims || {}) as Record<string, unknown>;
  const bootstrapRef = db.collection('_system').doc('bootstrap');
  const ownerAdminRef = db.collection('admins').doc(ownerUser.uid);
  let reservationDecision: 'reserve' | 'resume' = 'reserve';

  console.log('Checking bootstrap lock and owner registry in one Firestore transaction...');
  await db.runTransaction(async (transaction) => {
    // All reads are completed before any transaction write.
    const bootstrapSnap = await transaction.get(bootstrapRef);
    const ownerAdminSnap = await transaction.get(ownerAdminRef);
    const ownersSnap = await transaction.get(db.collection('admins').where('role', '==', 'owner'));
    const foundersSnap = await transaction.get(db.collection('admins').where('isFounder', '==', true));
    const registeredOwnerUids = [...new Set([
      ...ownersSnap.docs.map((doc) => String(doc.data().uid || doc.id)),
      ...foundersSnap.docs.map((doc) => String(doc.data().uid || doc.id)),
    ])];

    reservationDecision = decideOwnerBootstrap({
      bootstrapExists: bootstrapSnap.exists,
      bootstrapData: bootstrapSnap.exists ? (bootstrapSnap.data() || {}) : null,
      ownerUid: ownerUser.uid,
      ownerAdminExists: ownerAdminSnap.exists,
      registeredOwnerUids,
    });

    // An owner claim is accepted only when resuming this same UID's pending lock.
    assertOwnerClaimCanBeAssigned(existingClaims.role, reservationDecision === 'resume');

    if (reservationDecision === 'reserve') {
      transaction.create(bootstrapRef, {
        status: 'pending',
        completed: false,
        locked: false,
        reservedAt: new Date().toISOString(),
        ownerUid: ownerUser.uid,
        ownerEmail: ownerUser.email,
        managerUid: null,
        managerEmail: null,
        attempts: 1,
      });
    } else {
      const current = bootstrapSnap.data() || {};
      transaction.update(bootstrapRef, {
        lastAttemptAt: new Date().toISOString(),
        attempts: Number.isSafeInteger(current.attempts) ? Number(current.attempts) + 1 : 2,
      });
    }
  });

  console.log(`Reservation secured: ${reservationDecision} for the verified target UID.`);

  // Re-read Auth immediately before mutation to avoid acting on stale role claims.
  const latestOwnerUser = await auth.getUser(ownerUser.uid);
  if (!latestOwnerUser.emailVerified || latestOwnerUser.email?.trim().toLowerCase() !== ownerEmail) {
    throw new Error('The target account changed or is no longer verified after reservation. Stop and inspect the pending lock.');
  }
  existingClaims = (latestOwnerUser.customClaims || {}) as Record<string, unknown>;
  assertOwnerClaimCanBeAssigned(existingClaims.role, reservationDecision === 'resume');

  let ownerClaimAssignmentAttempted = false;
  try {
    ownerClaimAssignmentAttempted = true;
    await auth.setCustomUserClaims(ownerUser.uid, {
      ...existingClaims,
      role: 'owner',
    });
    await auth.revokeRefreshTokens(ownerUser.uid);
  } catch (error) {
    if (ownerClaimAssignmentAttempted) {
      await restoreClaims(auth, ownerUser.uid, existingClaims);
    }
    throw error;
  }

  try {
    await db.runTransaction(async (transaction) => {
      const bootstrapSnap = await transaction.get(bootstrapRef);
      const ownerAdminSnap = await transaction.get(ownerAdminRef);
      const ownersSnap = await transaction.get(db.collection('admins').where('role', '==', 'owner'));
      const foundersSnap = await transaction.get(db.collection('admins').where('isFounder', '==', true));
      const registeredOwnerUids = [...new Set([
        ...ownersSnap.docs.map((doc) => String(doc.data().uid || doc.id)),
        ...foundersSnap.docs.map((doc) => String(doc.data().uid || doc.id)),
      ])];

      const finalDecision = decideOwnerBootstrap({
        bootstrapExists: bootstrapSnap.exists,
        bootstrapData: bootstrapSnap.exists ? (bootstrapSnap.data() || {}) : null,
        ownerUid: ownerUser.uid,
        ownerAdminExists: ownerAdminSnap.exists,
        registeredOwnerUids,
      });
      if (finalDecision !== 'resume') {
        throw new Error('BOOTSTRAP_LOCK_CHANGED_BEFORE_FINALIZATION');
      }

      const now = new Date().toISOString();
      transaction.update(bootstrapRef, {
        status: 'completed',
        completed: true,
        locked: true,
        completedAt: now,
      });
      transaction.create(ownerAdminRef, {
        id: ownerUser.uid,
        uid: ownerUser.uid,
        email: ownerUser.email,
        name: ownerUser.displayName || 'مالك المنصة والمؤسس',
        title: 'المؤسس والمالك الأساسي للمنصة',
        role: 'owner',
        isFounder: true,
        canEditBooks: true,
        canManageBans: true,
        addedBy: 'SYSTEM_BOOTSTRAP_LOCAL',
        addedAt: now,
      });
    });
  } catch (error) {
    await restoreClaims(auth, ownerUser.uid, existingClaims);
    throw error;
  }

  console.log('SUCCESS: First-owner bootstrap completed.');
  console.log(`Owner UID: ${ownerUser.uid}`);
  console.log('Firestore bootstrap lock: completed and permanently locked.');
  console.log('Owner registry: /admins/{uid} created.');
  console.log('Custom claim: role=owner assigned; refresh tokens revoked.');
  console.log('Sign out and sign in again to obtain a fresh ID token before checking owner UI.');
}

bootstrapOwner().catch((error) => {
  console.error('OWNER BOOTSTRAP FAILED:', error?.message || error);
  process.exitCode = 1;
});
